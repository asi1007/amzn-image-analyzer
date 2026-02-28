# Amazon SP-API 新規カタログ出品登録機能の実装計画

## Context

現在の amzn-img-analyzer プロジェクト（GAS）は競合商品の画像解析のみ。
ユーザーは Amazon Seller Central への新規カタログ作成を SP-API 経由で自動化したい。
SP-APIアプリは登録済み（認証情報あり）。1件ずつ登録するワークフロー。

## 入力データ（スプレッドシートから）

- **基本情報**: 商品名、ブランド名、商品説明、箇条書き（bullet points）、検索キーワード
- **価格・在庫**: 販売価格、在庫数、SKU、コンディション（新品/中古）
- **カテゴリ・属性**: 商品タイプ、カテゴリ、サイズ、色、素材など

## アーキテクチャ

既存のクラス構造に合わせて以下のサービスを追加:

```
既存:
  コード.js        → AddDataUseCase（画像解析のエントリーポイント）
  gemini.gs.js    → GeminiService
  keepa.gs.js     → KeepaService
  product.gs.js   → ProductService
  sheet.gs.js     → SheetService

追加:
  spapi-auth.gs.js    → SpApiAuthService（LWA認証・トークン管理）
  spapi-listing.gs.js → SpApiListingService（Listings API呼び出し）
  spapi-product-type.gs.js → SpApiProductTypeService（商品タイプ定義取得）
  listing-sheet.gs.js → ListingSheetService（出品用シートの読み書き）
  listing.gs.js       → CreateListingUseCase（出品登録のエントリーポイント）
```

## SP-API 処理フロー

### 1. 認証（SpApiAuthService）
- LWA (Login with Amazon) でアクセストークンを取得
- `POST https://api.amazon.com/auth/o2/token` に refresh_token を送信
- AWS Signature V4 は 2023年10月以降不要
- スクリプトプロパティに格納: `SP_API_CLIENT_ID`, `SP_API_CLIENT_SECRET`, `SP_API_REFRESH_TOKEN`, `SP_API_SELLER_ID`

### 2. 商品タイプ検索（SpApiProductTypeService）
- `GET /definitions/2020-09-01/productTypes` でキーワードから商品タイプを検索
- `GET /definitions/2020-09-01/productTypes/{productType}` で必須属性のJSONスキーマを取得
- エンドポイント: `sellingpartnerapi-fe.amazon.com`（日本）
- マーケットプレイスID: `A1VC38T61288AM`（Amazon.co.jp）

### 3. リスティング作成（SpApiListingService）
- `PUT /listings/2021-08-01/items/{sellerId}/{sku}` で新規カタログ作成
- リクエストボディに productType と attributes を含める

## スプレッドシート設計（「出品登録」シート）

| 列 | 項目 | 備考 |
|---|---|---|
| A | SKU | 必須。一意の出品者SKU |
| B | 商品タイプ | 必須。SP-APIの productType 名 |
| C | 商品名 | item_name |
| D | ブランド名 | brand |
| E | 商品説明 | product_description |
| F | 箇条書き1 | bullet_point |
| G | 箇条書き2 | bullet_point |
| H | 箇条書き3 | bullet_point |
| I | 箇条書き4 | bullet_point |
| J | 箇条書き5 | bullet_point |
| K | 検索キーワード | generic_keyword |
| L | 販売価格 | purchasable_offer / list_price |
| M | 在庫数 | fulfillment_availability |
| N | コンディション | condition_type (new_new等) |
| O | EAN/JAN | external_product_id |
| P~  | カテゴリ固有属性 | 商品タイプに応じて可変 |
| 最終列 | 登録ステータス | 成功/失敗/エラー内容 |

## 実装ステップ

### Step 1: SpApiAuthService
- LWA認証でアクセストークンを取得する `getAccessToken()` メソッド
- トークンのキャッシュ（CacheService、有効期限1時間）

### Step 2: SpApiProductTypeService
- `searchProductTypes(keyword)` — 商品タイプをキーワード検索
- `getProductTypeDefinition(productType)` — 必須属性のスキーマ取得

### Step 3: SpApiListingService
- `createListing(sellerId, sku, productType, attributes)` — 新規リスティング作成
- レスポンスのステータス（ACCEPTED/INVALID）をハンドリング

### Step 4: ListingSheetService
- 「出品登録」シートからの商品データ読み取り
- 登録結果（ステータス）の書き戻し

### Step 5: CreateListingUseCase
- エントリーポイント関数 `CreateListing()`
- シートから1行分のデータを読み取り → SP-API で登録 → 結果をシートに書き戻し

### Step 6: 商品タイプ検索ユーティリティ
- エントリーポイント関数 `SearchProductTypes()`
- スプレッドシートにキーワードを入力 → 商品タイプ候補一覧を表示

## 検証方法

1. `SearchProductTypes()` を実行し、商品タイプ検索結果がシートに表示されることを確認
2. `CreateListing()` をテスト用SKUで実行し、SP-APIからACCEPTEDレスポンスが返ることを確認
3. Seller Centralで該当SKUのリスティングが作成されていることを目視確認
