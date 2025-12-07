class AddDataUseCase {
  constructor() {
    this.keepaService = new KeepaService();
    this.geminiService = new GeminiService();
    this.sheetService = new SheetService();
    this.productService = new ProductService(
      this.keepaService,
      this.geminiService,
      this.sheetService
    );
  }

  execute() {
    const imageDataSheet = this.sheetService.getImageDataSheet();
    const asins = this.sheetService.getASINs(imageDataSheet);
    
    if (asins.length === 0) {
      Logger.log('ASINが見つかりませんでした');
      return;
    }

    const asinData = asins.reduce(
      (acc, asin) => this.productService.concatASINData(acc, asin),
      []
    );

    this.sheetService.writeImageData(imageDataSheet, asinData);
    Logger.log(`${asinData.length}件のデータを書き込みました`);
  }
}

function AddData() {
  const useCase = new AddDataUseCase();
  useCase.execute();
}

function test2() {
  const keepaService = new KeepaService();
  const geminiService = new GeminiService();
  const sheetService = new SheetService();
  const productService = new ProductService(
    keepaService,
    geminiService,
    sheetService
  );

  const imageDataSheet = sheetService.getImageDataSheet();
  const asins = ["B08GYBT34F"];
  const asinData = asins.reduce(
    (acc, asin) => productService.concatASINData(acc, asin),
    []
  );
  
  sheetService.writeImageData(imageDataSheet, asinData);
  Logger.log('テスト完了');
}
