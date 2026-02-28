class ChatGptService {
  constructor() {
    this.apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-4o';
  }

  generateText(prompt) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEYが設定されていません');
    }

    const payload = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }]
    };

    const response = this.callApi(payload);
    return response.choices[0].message.content;
  }

  getTextFromImage(imageUrl, prompt) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEYが設定されていません');
    }

    const imageResponse = UrlFetchApp.fetch(imageUrl);
    const blob = imageResponse.getBlob();
    const base64Image = Utilities.base64Encode(blob.getBytes());
    const mimeType = blob.getContentType();

    const payload = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` }
            },
            { type: 'text', text: prompt }
          ]
        }
      ]
    };

    const response = this.callApi(payload);
    return response.choices[0].message.content;
  }

  callApi(payload) {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(this.baseUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      const error = `OpenAI API Error: ${responseCode} - ${responseText}`;
      Logger.log(`[ChatGpt Error] ${error}`);
      throw new Error(error);
    }

    const json = JSON.parse(responseText);

    if (!json.choices || !json.choices[0]) {
      const error = `OpenAI APIからの応答が不正です: ${responseText}`;
      Logger.log(`[ChatGpt Error] ${error}`);
      throw new Error(error);
    }

    return json;
  }
}

function test() {
  const aiService = new ChatGptService();
  const result = aiService.getTextFromImage(
    "https://images-na.ssl-images-amazon.com/images/I/61NdMCYTCNL.jpg",
    "この画像に写っている文字をすべて抽出してください。"
  );
  Logger.log(result);
}
