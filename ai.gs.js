const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  
  // APIキーが設定されていない場合はエラー;
function test(){
  getTextFromImage("https://images-na.ssl-images-amazon.com/images/I/61NdMCYTCNL.jpg","この画像に写っている文字をすべて抽出してください。")
}


function getTextFromImage(imageUrl, prompt) {
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

    const geminiResponse = UrlFetchApp.fetch(GEMINI_URL, options);
    const json = JSON.parse(geminiResponse.getContentText());
    const text = json.candidates[0].content.parts[0].text;
    return text
}
