class ListingSheetService {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.sheetName = '出品登録';
    this.marketplaceId = 'A1VC38T7YXB528';
    this.labelCol = 1;
    this.valueCol = 2;
    this.promptCol = 3;
    this.extractedCol = 5;
    this.reservedLabels = {
      url: 'URL',
      productType: '商品タイプ',
      sku: 'SKU',
      status: '登録ステータス'
    };
    this.attributeMap = {
      '商品名': { key: 'item_name', type: 'text' },
      'ブランド名': { key: 'brand', type: 'text' },
      '商品説明': { key: 'product_description', type: 'text' },
      '箇条書き1': { key: 'bullet_point', type: 'bullet' },
      '箇条書き2': { key: 'bullet_point', type: 'bullet' },
      '箇条書き3': { key: 'bullet_point', type: 'bullet' },
      '箇条書き4': { key: 'bullet_point', type: 'bullet' },
      '箇条書き5': { key: 'bullet_point', type: 'bullet' },
      '検索キーワード': { key: 'generic_keyword', type: 'value' },
      '販売価格': { key: 'purchasable_offer', type: 'price' },
      'コンディション': { key: 'condition_type', type: 'value' },
      'EAN/JAN': { key: 'externally_assigned_product_identifier', type: 'ean' },
      'メーカー名': { key: 'manufacturer', type: 'text' },
      '原産国': { key: 'country_of_origin', type: 'value' },
'独占販売製品': { key: 'is_exclusive', type: 'value' },
      'ブラウズカテゴリ': { key: 'recommended_browse_nodes', type: 'value' },
      'パッケージ内に含まれる商品の数': { key: 'number_of_items', type: 'number' },
      'パッケージの重さ': { key: 'item_package_weight', type: 'unit' },
      '商品の状態': { key: 'item_condition', type: 'value' },
      'パッケージ寸法': { key: 'item_package_dimensions', type: 'dimensions' },
      '品目の寸法（L x W）': { key: 'item_dimensions', type: 'dimensions' },
      '電池本体、電池が必要な商品': { key: 'batteries_required', type: 'value' }
    };
  }

  getSheet() {
    const sheet = this.spreadsheet.getSheetByName(this.sheetName);
    if (!sheet) {
      throw new Error(`「${this.sheetName}」シートが見つかりません`);
    }
    return sheet;
  }

  getReferenceUrl(sheet) {
    return sheet.getRange(1, this.labelCol).getValue();
  }

  fetchPageContent(url) {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const html = response.getContentText();
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim()
               .substring(0, 5000);
  }

  getLabels(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return sheet.getRange(2, this.labelCol, lastRow - 1, 1).getValues();
  }

  writeExtracted(sheet, row, value) {
    sheet.getRange(row, this.extractedCol).setValue(value);
  }

  generateSku() {
    const now = new Date();
    const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyyMMddHHmmss');
    return `SKU-${timestamp}`;
  }

  findRow(sheet, labelName) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const labels = sheet.getRange(2, this.labelCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < labels.length; i++) {
      if (labels[i][0] === labelName) return i + 2;
    }
    return null;
  }

  getListingData(sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error('データがありません');

    const labels = sheet.getRange(2, this.labelCol, lastRow - 1, 1).getValues();
    const values = sheet.getRange(2, this.valueCol, lastRow - 1, 1).getValues();

    const data = {};
    for (let i = 0; i < labels.length; i++) {
      const label = String(labels[i][0]).trim();
      const value = values[i][0];
      if (label && value !== '') {
        data[label] = value;
      }
    }

    const productType = data[this.reservedLabels.productType];
    if (!productType) {
      throw new Error('商品タイプが未入力です');
    }

    const sku = data[this.reservedLabels.sku] || this.generateSku();

    return {
      sku: String(sku),
      productType: String(productType),
      labelValueMap: data
    };
  }

  buildAttributes(data) {
    const mp = this.marketplaceId;
    const attrs = {};
    const bulletPoints = [];

    for (const [label, value] of Object.entries(data.labelValueMap)) {
      const mapping = this.attributeMap[label];
      if (!mapping) continue;

      const strValue = String(value);

      switch (mapping.type) {
        case 'text':
          attrs[mapping.key] = [{ value: strValue, language_tag: 'ja_JP', marketplace_id: mp }];
          break;
        case 'bullet':
          bulletPoints.push({ value: strValue, language_tag: 'ja_JP', marketplace_id: mp });
          break;
        case 'value':
          attrs[mapping.key] = [{ value: strValue, marketplace_id: mp }];
          break;
        case 'number':
          attrs[mapping.key] = [{ value: Number(value), marketplace_id: mp }];
          break;
        case 'price':
          attrs[mapping.key] = [{
            currency: 'JPY',
            our_price: [{ schedule: [{ value_with_tax: Number(value) }] }],
            marketplace_id: mp
          }];
          break;
        case 'ean':
          attrs[mapping.key] = [{ type: 'ean', value: strValue, marketplace_id: mp }];
          break;
        case 'unit':
          attrs[mapping.key] = [{ value: strValue, marketplace_id: mp }];
          break;
        case 'dimensions':
          attrs[mapping.key] = [{ value: strValue, marketplace_id: mp }];
          break;
      }
    }

    if (bulletPoints.length > 0) {
      attrs.bullet_point = bulletPoints;
    }

    return attrs;
  }

  writeSku(sheet, sku) {
    const row = this.findRow(sheet, this.reservedLabels.sku);
    if (row) {
      sheet.getRange(row, this.valueCol).setValue(sku);
    }
  }

  writeStatus(sheet, status) {
    const row = this.findRow(sheet, this.reservedLabels.status);
    if (row) {
      sheet.getRange(row, this.valueCol).setValue(status);
    }
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
