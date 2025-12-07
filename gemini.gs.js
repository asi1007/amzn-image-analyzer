class GeminiService {
  constructor() {
    this.apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
  }

  getTextFromImage(imageUrl, prompt) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEYが設定されていません');
    }

    const response = UrlFetchApp.fetch(imageUrl);
    const blob = response.getBlob();
    const base64Image = Utilities.base64Encode(blob.getBytes());
    
    const payload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: blob.getContentType(),
                data: base64Image
              }
            },
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const url = `${this.baseUrl}?key=${this.apiKey}`;
    const geminiResponse = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(geminiResponse.getContentText());
    
    if (!json.candidates || !json.candidates[0]) {
      throw new Error('Gemini APIからの応答が不正です');
    }
    
    const text = json.candidates[0].content.parts[0].text;
    return text;
  }
}

function test() {
  const geminiService = new GeminiService();
  const result = geminiService.getTextFromImage(
    "https://images-na.ssl-images-amazon.com/images/I/61NdMCYTCNL.jpg",
    "この画像に写っている文字をすべて抽出してください。"
  );
  Logger.log(result);
}
