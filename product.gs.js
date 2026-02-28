class ProductService {
  constructor(keepaService, aiService, sheetService) {
    this.keepaService = keepaService;
    this.aiService = aiService;
    this.sheetService = sheetService;
    this.imageBaseUrl = "https://images-na.ssl-images-amazon.com/images/I/";
  }

  makeASINData(asin) {
    const product = this.keepaService.getProduct(asin);
    const imageUrls = product.imagesCSV.split(',');

    const imageDataSheet = this.sheetService.getImageDataSheet();
    const prompts = this.sheetService.getPrompts(imageDataSheet);

    this.sheetService.writeASINEvaluation(asin, product.title);

    const asinData = imageUrls.map(url => {
      const imageUrl = this.imageBaseUrl + url;
      const rowData = [
        asin,
        product.title,
        imageUrl,
        new Date()
      ];

      prompts.forEach(prompt => {
        try {
          const analysisResult = this.aiService.getTextFromImage(imageUrl, prompt);
          rowData.push(analysisResult);
        } catch (error) {
          Logger.log(`エラー: ${error.message} (ASIN: ${asin}, URL: ${imageUrl})`);
          rowData.push(`エラー: ${error.message}`);
        }
      });

      return rowData;
    });

    return asinData;
  }

  concatASINData(accumulator, asin) {
    try {
      const asinData = this.makeASINData(asin);
      return accumulator.concat(asinData);
    } catch (error) {
      Logger.log(`エラー: ${error.message} (ASIN: ${asin})`);
      return accumulator;
    }
  }
}
