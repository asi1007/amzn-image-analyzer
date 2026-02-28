# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Amazon商品画像の解析と商品出品登録を行うGoogle Apps Script (GAS) プロジェクト。
- **画像解析機能**: スプレッドシートにASINを入力 → Keepa APIで商品画像URL取得 → Gemini APIで画像内テキスト解析
- **出品登録機能**: スプレッドシートに商品情報を入力 → SP-API経由でAmazon Seller Centralに新規カタログ登録

## デプロイ

clasp を使用してGASにデプロイする。`/deploy` コマンドで git commit → git push → clasp push を実行可能。

```bash
clasp push          # GASプロジェクトにプッシュ
clasp open          # GASエディタをブラウザで開く
clasp pull          # GAS側の変更をローカルに取得
```

## アーキテクチャ

クラスベースの責務分離構造。2つの機能系統がある。

### 画像解析機能
エントリーポイント: `コード.js` の `AddData()`

| ファイル | クラス | 役割 |
|---|---|---|
| `コード.js` | `AddDataUseCase` | ユースケース層。各サービスを組み立ててワークフローを実行 |
| `product.gs.js` | `ProductService` | ASIN単位の処理を統合（Keepa→画像URL→Gemini解析→行データ生成） |
| `gemini.gs.js` | `GeminiService` | Gemini API呼び出し。画像URLからbase64変換して画像内テキストを解析 |
| `keepa.gs.js` | `KeepaService` | Keepa API呼び出し。ASINから商品情報（画像URL含む）を取得 |
| `sheet.gs.js` | `SheetService` | スプレッドシートの読み書き（ASIN取得、プロンプト取得、結果書き込み） |

### 出品登録機能
エントリーポイント: `listing.gs.js` の `CreateListing()` / `SearchProductTypes()`

| ファイル | クラス | 役割 |
|---|---|---|
| `listing.gs.js` | `CreateListingUseCase`, `SearchProductTypesUseCase` | ユースケース層 |
| `spapi-auth.gs.js` | `SpApiAuthService` | LWA認証。`API_KEY`, `API_SECRET`, `REFRESH_TOKEN` でアクセストークン取得 |
| `spapi-listing.gs.js` | `SpApiListingService` | Listings API (PUT) で新規カタログ作成 |
| `spapi-product-type.gs.js` | `SpApiProductTypeService` | 商品タイプ検索・定義取得 |
| `listing-sheet.gs.js` | `ListingSheetService` | 「出品登録」シートの読み書き |

## スプレッドシート構成

### 画像解析
- **「画像データ」シート**: A2:A18列にASIN、D1:D3にGeminiへのプロンプト。解析結果はこのシートに追記される
- **「asin評価」シート**: ASIN・商品タイトルの記録先

### 出品登録
- **「出品登録」シート**: A列SKU、B列商品タイプ、C~O列に商品情報、最終列に登録ステータス
- **「商品タイプ検索結果」シート**: `SearchProductTypes()` の結果表示先

## 外部API

スクリプトプロパティに設定:
- `GEMINI_API_KEY` — Gemini API (モデル: `gemini-2.5-flash`)
- `KEEPA_API_KEY` — Keepa API (domain: 5 = Amazon.co.jp)
- `API_KEY` — SP-API Client ID (LWA)
- `API_SECRET` — SP-API Client Secret (LWA)
- `REFRESH_TOKEN` — SP-API Refresh Token (LWA)
- `SELLER_ID` — Amazon出品者ID

SP-API設定: エンドポイント `sellingpartnerapi-fe.amazon.com`、マーケットプレイスID `A1VC38T7YXB528` (Amazon.co.jp)。認証は download-amazon-data プロジェクトと同じパターン。

## 注意点

- ファイル拡張子は `.gs.js`（clasp設定の `scriptExtensions` で `.js` と `.gs` の両方をサポート）
- GAS環境で動作するため、`require`/`import` は使用不可。すべてのクラスはグローバルスコープで参照される
- ランタイムはV8（`appsscript.json` で指定）
