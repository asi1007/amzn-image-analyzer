class GeminiService {
  constructor() {
    this.apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';
  }

  generateText(prompt) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEYが設定されていません');
    }

    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const url = `${this.baseUrl}?key=${this.apiKey}`;
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      throw new Error(`Gemini API HTTP Error: ${responseCode} - ${responseText}`);
    }

    const json = JSON.parse(responseText);

    if (json.error) {
      throw new Error(`Gemini API Error: ${JSON.stringify(json.error)}`);
    }

    if (!json.candidates || !json.candidates[0]) {
      throw new Error(`Gemini APIからの応答が不正です: ${responseText}`);
    }

    return json.candidates[0].content.parts[0].text;
  }

  getTextFromImage(imageUrl, prompt) {
    try {
      if (!this.apiKey) {
        const error = 'GEMINI_API_KEYが設定されていません';
        Logger.log(`[Gemini Error] ${error}`);
        throw new Error(error);
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
      const responseCode = geminiResponse.getResponseCode();
      const responseText = geminiResponse.getContentText();
      
      if (responseCode !== 200) {
        const error = `Gemini API HTTP Error: ${responseCode} - ${responseText}`;
        Logger.log(`[Gemini Error] ${error}`);
        throw new Error(error);
      }

      const json = JSON.parse(responseText);
      
      if (json.error) {
        const error = `Gemini API Error: ${JSON.stringify(json.error)}`;
        Logger.log(`[Gemini Error] ${error}`);
        throw new Error(error);
      }
      
      if (!json.candidates || !json.candidates[0]) {
        const error = `Gemini APIからの応答が不正です: ${responseText}`;
        Logger.log(`[Gemini Error] ${error}`);
        throw new Error(error);
      }
      
      const text = json.candidates[0].content.parts[0].text;
      return text;
    } catch (error) {
      Logger.log(`[Gemini Error] getTextFromImage failed - URL: ${imageUrl}, Prompt: ${prompt}, Error: ${error.message}`);
      throw error;
    }
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
