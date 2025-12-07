class SheetService {
  constructor() {
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }

  getASINs(sheet) {
    const columnA = sheet.getRange("A2:A18").getValues();
    const nonEmptyRows = columnA.filter(row => row[0] !== "");
    const asins = nonEmptyRows.map(row => row[0]);
    return asins;
  }

  getPrompts(sheet) {
    const prompt1 = sheet.getRange("D1").getValue();
    const prompt2 = sheet.getRange("D2").getValue();
    const prompt3 = sheet.getRange("D3").getValue();
    return [prompt1, prompt2, prompt3].filter(p => p !== "");
  }

  writeImageData(sheet, data) {
    if (!data || data.length === 0) {
      return;
    }
    
    const lastRow = sheet.getLastRow();
    const numRows = data.length;
    const numCols = data[0].length;
    sheet.getRange(lastRow + 1, 1, numRows, numCols).setValues(data);
  }

  writeASINEvaluation(asin, title) {
    const sheet = this.spreadsheet.getSheetByName("asin評価");
    if (!sheet) {
      throw new Error('「asin評価」シートが見つかりません');
    }
    
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow + 2, 1, 1, 2).setValues([[asin, title]]);
  }

  getImageDataSheet() {
    const sheet = this.spreadsheet.getSheetByName("画像データ");
    if (!sheet) {
      throw new Error('「画像データ」シートが見つかりません');
    }
    return sheet;
  }
}
