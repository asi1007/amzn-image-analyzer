class KeepaService {
  constructor() {
    this.apiKey = PropertiesService.getScriptProperties().getProperty('KEEPA_API_KEY');
    this.endpoint = 'https://api.keepa.com/product';
    this.domain = 5;
  }

  getProduct(asin) {
    if (!this.apiKey) {
      throw new Error('KEEPA_API_KEYが設定されていません');
    }

    const params = {
      method: 'get',
      muteHttpExceptions: true
    };
    
    const url = `${this.endpoint}?key=${this.apiKey}&domain=${this.domain}&asin=${asin}`;
    const response = UrlFetchApp.fetch(url, params);
    const json = JSON.parse(response.getContentText());
    
    if (json.error) {
      throw new Error(json.error.message);
    }
    
    if (!json.products || json.products.length === 0) {
      throw new Error(`ASIN ${asin} の商品が見つかりませんでした`);
    }
    
    return json.products[0];
  }
}
