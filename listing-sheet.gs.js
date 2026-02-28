class ListingSheetService {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.sheetName = '出品登録';
    this.marketplaceId = 'A1VC38T7YXB528';
    this.rows = {
      productType: 2,
      itemName: 3,
      brand: 4,
      description: 5,
      bullet1: 6,
      bullet2: 7,
      bullet3: 8,
      bullet4: 9,
      bullet5: 10,
      keyword: 11,
      price: 12,
      condition: 13,
      externalId: 14,
      sku: 15,
      status: 16
    };
    this.labelCol = 1;
    this.valueCol = 2;
  }

  getSheet() {
    const sheet = this.spreadsheet.getSheetByName(this.sheetName);
    if (!sheet) {
      throw new Error(`「${this.sheetName}」シートが見つかりません`);
    }
    return sheet;
  }

  generateSku() {
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyyMMddHHmmss');
    return `SKU-${timestamp}`;
  }

  getListingData(sheet) {
    const lastRow = Math.max(this.rows.externalId, sheet.getLastRow());
    const values = sheet.getRange(1, this.valueCol, lastRow, 1).getValues();

    const getValue = (row) => values[row - 1][0];

    const productType = getValue(this.rows.productType);
    if (!productType) {
      throw new Error('商品タイプが未入力です');
    }

    const sku = getValue(this.rows.sku) || this.generateSku();

    const bulletPoints = [
      getValue(this.rows.bullet1),
      getValue(this.rows.bullet2),
      getValue(this.rows.bullet3),
      getValue(this.rows.bullet4),
      getValue(this.rows.bullet5)
    ].filter(b => b !== '');

    return {
      sku: String(sku),
      productType: String(productType),
      itemName: getValue(this.rows.itemName),
      brand: getValue(this.rows.brand),
      description: getValue(this.rows.description),
      bulletPoints: bulletPoints,
      keyword: getValue(this.rows.keyword),
      price: getValue(this.rows.price),
      condition: getValue(this.rows.condition) || 'new_new',
      externalId: getValue(this.rows.externalId)
    };
  }

  buildAttributes(data) {
    const mp = this.marketplaceId;
    const attrs = {};

    if (data.itemName) {
      attrs.item_name = [{ value: data.itemName, language_tag: 'ja_JP', marketplace_id: mp }];
    }

    if (data.brand) {
      attrs.brand = [{ value: data.brand, language_tag: 'ja_JP', marketplace_id: mp }];
    }

    if (data.description) {
      attrs.product_description = [{ value: data.description, language_tag: 'ja_JP', marketplace_id: mp }];
    }

    if (data.bulletPoints.length > 0) {
      attrs.bullet_point = data.bulletPoints.map(bp => ({
        value: bp, language_tag: 'ja_JP', marketplace_id: mp
      }));
    }

    if (data.keyword) {
      attrs.generic_keyword = [{ value: data.keyword, marketplace_id: mp }];
    }

    if (data.price) {
      attrs.purchasable_offer = [{
        currency: 'JPY',
        our_price: [{ schedule: [{ value_with_tax: data.price }] }],
        marketplace_id: mp
      }];
    }

    if (data.condition) {
      attrs.condition_type = [{ value: data.condition, marketplace_id: mp }];
    }

    if (data.externalId) {
      attrs.externally_assigned_product_identifier = [{
        type: 'ean', value: String(data.externalId), marketplace_id: mp
      }];
    }

    return attrs;
  }

  writeSku(sheet, sku) {
    sheet.getRange(this.rows.sku, this.valueCol).setValue(sku);
  }

  writeStatus(sheet, status) {
    sheet.getRange(this.rows.status, this.valueCol).setValue(status);
  }

  writeProductTypes(results) {
    const sheetName = '商品タイプ検索結果';
    let sheet = this.spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = this.spreadsheet.insertSheet(sheetName);
    }

    sheet.clear();
    sheet.getRange(1, 1, 1, 2).setValues([['商品タイプ名', 'マーケットプレイスID']]);

    if (results.length === 0) {
      sheet.getRange(2, 1).setValue('該当する商品タイプが見つかりませんでした');
      return;
    }

    const data = results.map(pt => [pt.name, pt.marketplaceIds ? pt.marketplaceIds.join(', ') : '']);
    sheet.getRange(2, 1, data.length, 2).setValues(data);
  }
}
