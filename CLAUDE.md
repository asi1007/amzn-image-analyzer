# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Amazon商品画像をGemini APIで解析するGoogle Apps Script (GAS) プロジェクト。
スプレッドシートにASINを入力すると、Keepa APIで商品画像URLを取得し、Gemini APIで画像内テキストを抽出・解析してシートに書き戻す。

## デプロイ

clasp を使用してGASにデプロイする。`/deploy` コマンドで git commit → git push → clasp push を実行可能。

```bash
clasp push          # GASプロジェクトにプッシュ
clasp open          # GASエディタをブラウザで開く
clasp pull          # GAS側の変更をローカルに取得
```

## アーキテクチャ

クラスベースの責務分離構造。エントリーポイントは `コード.js` のグローバル関数 `AddData()`。

| ファイル | クラス | 役割 |
|---|---|---|
| `コード.js` | `AddDataUseCase` | ユースケース層。各サービスを組み立ててワークフローを実行 |
| `product.gs.js` | `ProductService` | ASIN単位の処理を統合（Keepa→画像URL→Gemini解析→行データ生成） |
| `gemini.gs.js` | `GeminiService` | Gemini API呼び出し。画像URLからbase64変換して画像内テキストを解析 |
| `keepa.gs.js` | `KeepaService` | Keepa API呼び出し。ASINから商品情報（画像URL含む）を取得 |
| `sheet.gs.js` | `SheetService` | スプレッドシートの読み書き（ASIN取得、プロンプト取得、結果書き込み） |

## スプレッドシート構成

- **「画像データ」シート**: A2:A18列にASIN、D1:D3にGeminiへのプロンプト。解析結果はこのシートに追記される
- **「asin評価」シート**: ASIN・商品タイトルの記録先

## 外部API

APIキーはGASのスクリプトプロパティに設定:
- `GEMINI_API_KEY` — Gemini API (モデル: `gemini-2.5-flash`)
- `KEEPA_API_KEY` — Keepa API (domain: 5 = Amazon.co.jp)

## 注意点

- ファイル拡張子は `.gs.js`（clasp設定の `scriptExtensions` で `.js` と `.gs` の両方をサポート）
- GAS環境で動作するため、`require`/`import` は使用不可。すべてのクラスはグローバルスコープで参照される
- ランタイムはV8（`appsscript.json` で指定）
