class SpApiListingService {
  constructor(authService) {
    this.authService = authService;
    this.baseUrl = 'https://sellingpartnerapi-fe.amazon.com';
    this.marketplaceId = 'A1VC38T7YXB528';
  }

  createListing(sku, productType, attributes) {
    const accessToken = this.authService.getAccessToken();
    const sellerId = this.authService.getSellerId();

    const url = `${this.baseUrl}/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}?marketplaceIds=${this.marketplaceId}`;

    const body = {
      productType: productType,
      requirements: 'LISTING',
      attributes: attributes
    };

    Logger.log('[SpApiListing] 送信属性キー: ' + Object.keys(attributes).join(', '));
    Logger.log('[SpApiListing] fulfillment_availability: ' + JSON.stringify(attributes.fulfillment_availability));
    Logger.log('[SpApiListing] 送信JSON: ' + JSON.stringify(body).substring(0, 3000));

    const options = {
      method: 'put',
      contentType: 'application/json',
      headers: {
        'x-amz-access-token': accessToken,
        'user-agent': 'AmznImgAnalyzer/1.0 (Google Apps Script)'
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
      const error = `Listing API Error: ${responseCode} - ${responseText}`;
      Logger.log(`[SpApiListing Error] ${error}`);
      throw new Error(error);
    }

    const json = JSON.parse(responseText);

    if (json.status === 'INVALID') {
      const issues = json.issues ? json.issues.map(i => i.message).join('; ') : '不明なエラー';
      Logger.log(`[SpApiListing Error] Listing INVALID: ${issues}`);
      throw new Error(`リスティング登録失敗: ${issues}`);
    }

    Logger.log(`[SpApiListing] SKU: ${sku} - Status: ${json.status}`);
    return json;
  }

  switchToFba(sku, productType) {
    const accessToken = this.authService.getAccessToken();
    const sellerId = this.authService.getSellerId();

    const url = `${this.baseUrl}/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}?marketplaceIds=${this.marketplaceId}`;

    const body = {
      productType: productType,
      patches: [
        {
          op: 'add',
          path: '/attributes/fulfillment_availability',
          value: [{ fulfillment_channel_code: 'AMAZON_JP' }]
        },
        {
          op: 'delete',
          path: '/attributes/fulfillment_availability',
          value: [{ fulfillment_channel_code: 'DEFAULT' }]
        }
      ]
    };

    Logger.log('[SpApiListing] FBA切替PATCH: ' + JSON.stringify(body));

    const options = {
      method: 'patch',
      contentType: 'application/json',
      headers: {
        'x-amz-access-token': accessToken,
        'user-agent': 'AmznImgAnalyzer/1.0 (Google Apps Script)'
      },
      payload: JSON.stringify(body),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log(`[SpApiListing] FBA切替レスポンス: ${responseCode} - ${responseText}`);

    if (responseCode !== 200) {
      throw new Error(`FBA切替エラー: ${responseCode} - ${responseText}`);
    }

    const json = JSON.parse(responseText);
    Logger.log(`[SpApiListing] FBA切替完了 SKU: ${sku} - Status: ${json.status}`);
    return json;
  }
}
