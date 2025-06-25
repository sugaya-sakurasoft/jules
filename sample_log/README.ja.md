# サンプル ログバックエンドサービス

このプロジェクトは、クライアントアプリケーション（例: ゲーム）からユーザーログを収集・処理するために設計されたバックエンドサービスです。TypeScript と Node.js で構築され、API レイヤーには Express を使用しています。

## 主な機能

-   POST API エンドポイント経由でログデータを受信します。
-   受信したログデータを検証します。
-   ログエントリを一時的にメモリ内にキャッシュします。
-   キャッシュされたログを定期的にデータベースに書き出します（現在はコンソールに出力するダミーサービス）。
-   フィルタリングのための設定可能なログレベル。
-   終了前にログが処理されることを保証するグレースフルシャットダウン機構。
-   基本的なヘルスチェックエンドポイント。

## プロジェクト構造

```
sample_log/
├── dist/                     # コンパイル後の JavaScript ファイル (ビルド後)
├── node_modules/             # プロジェクト依存関係 (npm install 後)
├── src/                      # TypeScript ソースファイル
│   ├── controllers/          # API ルートハンドラ
│   │   └── log.controller.ts
│   ├── interfaces/           # TypeScript インターフェースおよび enum
│   │   └── log.interface.ts
│   ├── services/             # ビジネスロジック (キャッシュ、DB 対話、ロギング)
│   │   ├── cache.service.ts
│   │   ├── database.service.ts
│   │   └── logger.service.ts
│   ├── utils/                # ユーティリティ関数および設定
│   │   └── config.ts
│   └── index.ts              # メインアプリケーションエントリーポイント
├── .gitignore
├── package.json
├── package-lock.json
└── tsconfig.json
```

## セットアップとインストール

1.  **リポジトリをクローンします** (該当する場合、または `sample_log` ディレクトリがあることを確認してください)。
2.  **プロジェクトディレクトリに移動します**:
    ```bash
    cd sample_log
    ```
3.  **依存関係をインストールします**:
    ```bash
    npm install
    ```
4.  **TypeScript をコンパイルします**:
    ```bash
    npm run build
    ```
    これにより、`src/` 内の TypeScript ファイルが `dist/` ディレクトリ内の JavaScript ファイルにコンパイルされます。

## サービスの実行

セットアップとビルドが成功した後:

-   **サービスを開始します**:
    ```bash
    npm start
    ```
    このコマンドは通常 `node dist/index.js` を実行します。サーバーが起動し、通常はポート 3000 でリッスンします (`PORT` 環境変数で別途設定されていない場合)。

-   **開発モード (ファイル変更時に自動再起動)**:
    ```bash
    npm run dev
    ```
    これは `tsc-watch` を使用してファイルの変更を監視し、再コンパイルしてサーバーを再起動します。

## 設定

アプリケーションは環境変数を使用して設定できます。主要な変数は以下の通りです:

-   `NODE_ENV`: アプリケーション環境 (例: `development`, `production`)。デフォルトは `development`。
-   `PORT`: サーバーがリッスンするポート番号。デフォルトは `3000`。
-   `LOG_LEVEL`: 処理する最小ログレベル。オプション: `debug`, `info`, `warn`, `error`。デフォルトは `info`。
-   `CACHE_TYPE`: 使用するキャッシュの種類。現在は `in-memory` のみが完全に実装されています。デフォルトは `in-memory`。
-   `IN_MEMORY_CACHE_MAX_SIZE`: インメモリキャッシュに保持するログエントリの最大数。デフォルトは `1000`。
-   `IN_MEMORY_CACHE_FLUSH_INTERVAL_MS`: キャッシュからDBにログを書き出す間隔 (ミリ秒)。`0` は時間ベースの書き出しを無効にします。デフォルトは `60000` (60秒)。
-   `DATABASE_URL`: PostgreSQL の接続文字列 (例: `postgresql://user:pass@host:port/dbname`)。
-   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: 個別の PostgreSQL 接続パラメータ (`DATABASE_URL` が設定されていない場合に使用)。
-   `DB_SSL`: DB への SSL 接続が必要な場合は `true` に設定します。デフォルトは `false`。
-   (`config.ts` には、将来使用するために `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` のような Redis 設定変数も存在します。)

ローカル開発用に `sample_log` ディレクトリに `.env` ファイルを作成します。例:
```env
PORT=3001
LOG_LEVEL=debug
IN_MEMORY_CACHE_MAX_SIZE=500
```

## API エンドポイント

すべてのエンドポイントには `/api` のプレフィックスが付きます。

### 1. ログの送信

-   **エンドポイント**: `POST /api/logs`
-   **説明**: 処理のためにログエントリを送信します。
-   **リクエストボディ**: `RawLogEntry` を表す JSON オブジェクト。
    ```json
    {
      "level": "info",               // 必須。Enum: "debug", "info", "warn", "error"
      "event": "user_login_success", // 必須。文字列。
      "userId": "user123",           // オプション。文字列。
      "data": { "source": "mobile" },// オプション。JSON オブジェクト。
      "clientIp": "192.168.1.10"     // オプション。文字列。
    }
    ```
-   **レスポンス**:
    -   `202 Accepted`: ログは受信され、処理のためにキューに入れられました。
        ```json
        { "message": "Log received and queued for processing." }
        ```
    -   `400 Bad Request`: 無効なリクエストボディ (例: 必須フィールドの欠落、不正な型)。
        ```json
        { "message": "Invalid or missing log level (level). Must be one of: debug, info, warn, error." }
        ```
    -   `500 Internal Server Error`: サーバーで予期しないエラーが発生した場合。

### 2. ヘルスチェック

-   **エンドポイント**: `GET /api/health`
-   **説明**: サービスのヘルスステータスを確認します。
-   **レスポンス**:
    -   `200 OK`: サービスは正常です。
        ```json
        {
          "status": "UP",
          "timestamp": "2023-10-27T10:00:00.000Z",
          "message": "Log service is healthy."
        }
        ```

## テスト (手動)

開発ツール環境内での直接的な自動テストは (`npm install` の制約により) 限定的なため、ローカル環境で手動テストを実行してください:

1.  **サービスが実行中であることを確認します** (セットアップおよび `npm start` または `npm run dev` の後)。
2.  **HTTP クライアントを使用します** (`curl`, Postman, Insomnia など) API エンドポイントにリクエストを送信します。

### `curl` コマンドの例:

-   **ヘルスチェック**:
    ```bash
    curl http://localhost:3000/api/health
    ```

-   **INFO ログの送信**:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
    -d '{
      "level": "info",
      "event": "test_event_from_curl",
      "userId": "curlUser001",
      "data": { "customData": "some_value", "isTest": true },
      "clientIp": "127.0.0.1"
    }' \
    http://localhost:3000/api/logs
    ```

-   **DEBUG ログの送信 (`LOG_LEVEL` が `info` の場合はフィルタリングされます)**:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
    -d '{
      "level": "debug",
      "event": "debug_info_for_dev",
      "data": { "detail": "more data" }
    }' \
    http://localhost:3000/api/logs
    ```

-   **`level` が欠落したログの送信 (バリデーションエラー)**:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
    -d '{
      "event": "event_with_missing_level"
    }' \
    http://localhost:3000/api/logs
    ```

### サーバーログの観察:

実行中のサーバー (`npm start`) のコンソール出力で以下を確認します:
-   サーバー起動メッセージ (ポート、環境、ログレベル)。
-   `LoggerService` からの `ApplicationStart` ログ。
-   `InMemoryCacheService`, `DummyDatabaseService` からの初期化メッセージ。
-   各 API 呼び出しのリクエストログ (メソッド、パス、ステータスコード、処理時間)。
-   キャッシュに追加された、またはフィルタリングされたログを示す `LoggerService` のメッセージ。
-   キャッシュが一杯になった時やインターバル時にログが書き出されるのをシミュレートする `DummyDatabaseService` のメッセージ。
-   サーバーを停止したとき (例: Ctrl+C) のグレースフルシャットダウンメッセージ。

## 将来の機能強化 (TODO)

-   実際の PostgreSQL データベースにログを保存するために `PostgresDatabaseService` を実装する。
-   代替のキャッシュ機構として `RedisCacheService` を実装する。
-   より堅牢な入力バリデーションを追加する (例: `joi` または `class-validator` を使用)。
-   包括的な自動テスト (ユニット、インテグレーション、E2E) を実装する。
-   サーバーログのためにより構造化されたロギング形式 (例: JSON) を導入する。
-   必要に応じてログ送信エンドポイントに認証/認可を追加する。
-   (フォールバックとして使用する場合) ファイルベースロギングのログローテーションを実装する。

この README は、ログバックエンドサービスを理解し、セットアップし、使用するための出発点となります。
```
