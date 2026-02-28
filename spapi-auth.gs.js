class SpApiAuthService {
  constructor() {
    const props = PropertiesService.getScriptProperties();
    this.clientId = props.getProperty('API_KEY');
    this.clientSecret = props.getProperty('API_SECRET');
    this.refreshToken = props.getProperty('REFRESH_TOKEN');
    this.sellerId = props.getProperty('SELLER_ID');
    this.tokenUrl = 'https://api.amazon.com/auth/o2/token';
  }

  getAccessToken() {
    this.validateCredentials();

    const payload = {
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret
    };

    const options = {
      method: 'post',
      payload: payload
    };

    const response = UrlFetchApp.fetch(this.tokenUrl, options);
    const json = JSON.parse(response.getContentText());
    return json.access_token;
  }

  getSellerId() {
    if (!this.sellerId) {
      throw new Error('SELLER_IDが設定されていません');
    }
    return this.sellerId;
  }

  validateCredentials() {
    const missing = [];
    if (!this.clientId) missing.push('API_KEY');
    if (!this.clientSecret) missing.push('API_SECRET');
    if (!this.refreshToken) missing.push('REFRESH_TOKEN');

    if (missing.length > 0) {
      throw new Error(`スクリプトプロパティが未設定: ${missing.join(', ')}`);
    }
  }
}
