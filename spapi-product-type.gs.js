class SpApiProductTypeService {
  constructor(authService) {
    this.authService = authService;
    this.baseUrl = 'https://sellingpartnerapi-fe.amazon.com';
    this.marketplaceId = 'A1VC38T7YXB528';
  }

  searchProductTypes(keyword) {
    const accessToken = this.authService.getAccessToken();
    const sellerId = this.authService.getSellerId();

    const params = [
      `marketplaceIds=${this.marketplaceId}`,
      `sellerId=${sellerId}`,
      `keywords=${encodeURIComponent(keyword)}`
    ].join('&');

    const url = `${this.baseUrl}/definitions/2020-09-01/productTypes?${params}`;

    const options = {
      method: 'get',
      headers: {
        'x-amz-access-token': accessToken,
        'user-agent': 'AmznImgAnalyzer/1.0 (Google Apps Script)'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      const error = `Product Type Search Error: ${responseCode} - ${responseText}`;
      Logger.log(`[SpApiProductType Error] ${error}`);
      throw new Error(error);
    }

    const json = JSON.parse(responseText);
    return json.productTypes || [];
  }

  getProductTypeDefinition(productType) {
    const accessToken = this.authService.getAccessToken();
    const sellerId = this.authService.getSellerId();

    const params = [
      `marketplaceIds=${this.marketplaceId}`,
      `sellerId=${sellerId}`,
      'requirements=LISTING',
      'locale=ja_JP'
    ].join('&');

    const url = `${this.baseUrl}/definitions/2020-09-01/productTypes/${encodeURIComponent(productType)}?${params}`;

    const options = {
      method: 'get',
      headers: {
        'x-amz-access-token': accessToken,
        'user-agent': 'AmznImgAnalyzer/1.0 (Google Apps Script)'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      const error = `Product Type Definition Error: ${responseCode} - ${responseText}`;
      Logger.log(`[SpApiProductType Error] ${error}`);
      throw new Error(error);
    }

    return JSON.parse(responseText);
  }
}
