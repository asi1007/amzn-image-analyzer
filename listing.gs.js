class CreateListingUseCase {
  constructor() {
    this.authService = new SpApiAuthService();
    this.listingService = new SpApiListingService(this.authService);
    this.listingSheetService = new ListingSheetService();
  }

  execute() {
    const sheet = this.listingSheetService.getSheet();

    const data = this.listingSheetService.getListingData(sheet);

    this.listingSheetService.writeSku(sheet, data.sku);

    try {
      const attributes = this.listingSheetService.buildAttributes(data);
      const result = this.listingService.createListing(data.sku, data.productType, attributes);
      const status = `${result.status} (${new Date().toLocaleString('ja-JP')})`;
      this.listingSheetService.writeStatus(sheet, status);
      Logger.log(`SKU: ${data.sku} の登録が完了しました - Status: ${result.status}`);
    } catch (error) {
      const errorStatus = `エラー: ${error.message} (${new Date().toLocaleString('ja-JP')})`;
      this.listingSheetService.writeStatus(sheet, errorStatus);
      Logger.log(`SKU: ${data.sku} の登録に失敗しました - ${error.message}`);
    }
  }
}

class SearchProductTypesUseCase {
  constructor() {
    this.authService = new SpApiAuthService();
    this.productTypeService = new SpApiProductTypeService(this.authService);
    this.listingSheetService = new ListingSheetService();
  }

  execute(keyword) {
    if (!keyword) {
      const sheet = this.listingSheetService.getSheet();
      const row = this.listingSheetService.findRow(sheet, '商品タイプ');
      if (row) {
        keyword = sheet.getRange(row, this.listingSheetService.valueCol).getValue();
      }
      if (!keyword) {
        throw new Error('「商品タイプ」行のB列に検索キーワードを入力してください');
      }
    }

    const results = this.productTypeService.searchProductTypes(keyword);
    this.listingSheetService.writeProductTypes(results);
    Logger.log(`${results.length}件の商品タイプが見つかりました`);
    return results;
  }
}

class GenerateListingDataUseCase {
  constructor() {
    this.aiService = new ChatGptService();
    this.listingSheetService = new ListingSheetService();
    this.promptCol = 3;
  }

  execute() {
    const sheet = this.listingSheetService.getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const prompts = sheet.getRange(2, this.promptCol, lastRow - 1, 1).getValues();
    let count = 0;

    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i][0];
      if (!prompt) continue;

      const row = i + 2;
      try {
        const resolvedPrompt = this.resolveUrls(prompt);
        const result = this.aiService.generateText(resolvedPrompt);
        sheet.getRange(row, this.listingSheetService.valueCol).setValue(result.trim());
        count++;
      } catch (error) {
        Logger.log(`行${row}のAI生成に失敗: ${error.message}`);
        sheet.getRange(row, this.listingSheetService.valueCol).setValue(`エラー: ${error.message}`);
      }
    }

    Logger.log(`${count}件のデータを生成しました`);
  }

  resolveUrls(prompt) {
    const urlPattern = /https?:\/\/[^\s,)}\]]+/g;
    const urls = prompt.match(urlPattern);
    if (!urls) return prompt;

    let resolved = prompt;
    urls.forEach(url => {
      try {
        const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        const html = response.getContentText();
        const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                         .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .trim();
        const truncated = text.substring(0, 5000);
        resolved = resolved.replace(url, `\n---以下は ${url} の内容---\n${truncated}\n---ここまで---\n`);
      } catch (error) {
        Logger.log(`URL取得失敗: ${url} - ${error.message}`);
      }
    });

    return resolved;
  }
}

class ExtractPageDataUseCase {
  constructor() {
    this.aiService = new ChatGptService();
    this.listingSheetService = new ListingSheetService();
  }

  execute() {
    const sheet = this.listingSheetService.getSheet();
    const url = this.listingSheetService.getReferenceUrl(sheet);
    if (!url) {
      throw new Error('A1にURLが入力されていません');
    }

    const pageContent = this.listingSheetService.fetchPageContent(url);
    const labels = this.listingSheetService.getLabels(sheet);
    let count = 0;

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i][0];
      if (!label) continue;

      const row = i + 2;
      try {
        const prompt = `これはamazonの商品ページです。下記データから「${label}」を抽出してください。該当する情報のみを簡潔に返してください。見つからない場合は空文字を返してください。\n\n${pageContent}`;
        const result = this.aiService.generateText(prompt);
        this.listingSheetService.writeExtracted(sheet, row, result.trim());
        count++;
      } catch (error) {
        Logger.log(`行${row}の抽出に失敗: ${error.message}`);
        this.listingSheetService.writeExtracted(sheet, row, `エラー: ${error.message}`);
      }
    }

    Logger.log(`${count}件のデータを抽出しました`);
  }
}

function ExtractPageData() {
  const useCase = new ExtractPageDataUseCase();
  useCase.execute();
}

function GenerateListingData() {
  const useCase = new GenerateListingDataUseCase();
  useCase.execute();
}

function CreateListing() {
  const useCase = new CreateListingUseCase();
  useCase.execute();
}

function SearchProductTypes() {
  const useCase = new SearchProductTypesUseCase();
  useCase.execute();
}

function ShowProductTypeAttributes() {
  const authService = new SpApiAuthService();
  const productTypeService = new SpApiProductTypeService(authService);
  const listingSheetService = new ListingSheetService();

  const sheet = listingSheetService.getSheet();
  const row = listingSheetService.findRow(sheet, '商品タイプ');
  if (!row) throw new Error('商品タイプが見つかりません');
  const productType = sheet.getRange(row, listingSheetService.valueCol).getValue();
  if (!productType) throw new Error('商品タイプが未入力です');

  const definition = productTypeService.getProductTypeDefinition(productType);
  const schema = definition.schema;
  const schemaObj = JSON.parse(JSON.stringify(schema));
  const properties = schemaObj.properties || {};

  const rows = [];
  for (const [key, prop] of Object.entries(properties)) {
    const title = prop.title || '';
    const required = (schemaObj.required || []).includes(key);
    rows.push([key, title, required ? '必須' : '任意']);
  }

  rows.sort((a, b) => {
    if (a[2] === '必須' && b[2] !== '必須') return -1;
    if (a[2] !== '必須' && b[2] === '必須') return 1;
    return 0;
  });

  const sheetName = '商品タイプ属性一覧';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let attrSheet = ss.getSheetByName(sheetName);
  if (!attrSheet) attrSheet = ss.insertSheet(sheetName);
  attrSheet.clear();
  attrSheet.getRange(1, 1, 1, 3).setValues([['属性キー', '表示名', '必須/任意']]);
  if (rows.length > 0) {
    attrSheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
  Logger.log(`${rows.length}件の属性を書き出しました`);
}
