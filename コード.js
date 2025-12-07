const IMAGE_URL = "https://images-na.ssl-images-amazon.com/images/I/"

function getKeepaProduct(asin) {
  //return [[asin,...propn]] ２次元配列
  const apiKey = PropertiesService.getScriptProperties().getProperty('KEEPA_API_KEY');  
  const endpoint = 'https://api.keepa.com/product';
  
  const params = {
    method: 'get',
    muteHttpExceptions: true
  };
  const url = `${endpoint}?key=${apiKey}&domain=5&asin=${asin}`;
  const response = UrlFetchApp.fetch(url, params);
  const json = JSON.parse(response.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json.products[0];
}

function makeASINData(asin){
  const product = getKeepaProduct(asin)
  const imageUrls = product.imagesCSV.split(',');

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("画像データ")
  let prompt =  sheet.getRange("D1").getValue();
  let prompt2 = sheet.getRange("D2").getValue();
  let prompt3 = sheet.getRange("D3").getValue();

  const sheet2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("asin評価");
  const lastRow = sheet2.getLastRow()
  sheet2.getRange(lastRow+2, 1, 1, 2).setValues([[asin,product.title]])
  asinURL = imageUrls.map(url => 
  [asin, 
   product.title,
   IMAGE_URL + url,
    new Date(),
     getTextFromImage(IMAGE_URL+url, prompt),
     getTextFromImage(IMAGE_URL+url, prompt2),
          getTextFromImage(IMAGE_URL+url, prompt3)  ])
  return asinURL;
}

function concatAsinURL(acc, asin){
  return   acc.concat(makeASINData(asin))
}


function getASIN(sheet){
  const columnB = sheet.getRange("A2:A18").getValues(); 
  const nonEmptyRows = columnB.filter(row => row[0] !== ""); 
  const asins = nonEmptyRows.map(row => row[0])
  return asins
}

function writeImage(sheet,asinURL){
  let lastRow = sheet.getLastRow()
  sheet.getRange(lastRow+1, 1, asinURL.length, asinURL[0].length).setValues(asinURL)
}

function AddData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("画像データ");
  const asins = getASIN(sheet)
  const asinURL=  asins.reduce((acc,cur)=> concatAsinURL(acc, cur), [])
  writeImage(sheet, asinURL)
}

function test2(){
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("画像データ");
  asins = ["B08GYBT34F"]
  const asinURL=  asins.reduce((acc,cur)=> concatAsinURL(acc, cur), [])
  writeImage(sheet, asinURL)
}

