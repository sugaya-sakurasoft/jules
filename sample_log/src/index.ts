import express, { Express, Request, Response, NextFunction } from 'express';
import http from 'http'; // グレースフルシャットダウンのためにhttpサーバーインスタンスが必要
import config from './utils/config';
import logController from './controllers/log.controller';
import { loggerService } from './services/logger.service'; // loggerService.shutdown() のためにインポート

const app: Express = express();

// ミドルウェア
app.use(express.json({ limit: '1mb' })); // JSONボディパーサー、リクエストサイズ制限
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // URLエンコードされたボディパーサー

// リクエストロギングミドルウェア (簡易版)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // このログはloggerServiceを使わず、直接コンソールに出すか、別の軽量ロガーを使う
    // loggerServiceを使うと循環依存やシャットダウン時の問題が起きる可能性がある
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - IP: ${req.ip}`);
  });
  next();
});

// ルーティング
app.use('/api', logController); // /api/logs, /api/health など

// ルートパス
app.get('/', (req: Request, res: Response) => {
  res.send(`Log service is running. Environment: ${config.env}. Current log level: ${config.logLevel}.`);
});

// 404 Not Found ハンドラ
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Not Found' });
});

// グローバルエラーハンドラ (Expressのデフォルトエラーハンドラの前に置く)
// このハンドラは同期的なエラーまたはnext(error)で渡されたエラーをキャッチする
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled application error:', err.stack || err.message);
  // アプリケーション固有のエラー型で分岐することも可能
  res.status(500).json({ message: 'Internal Server Error' });
});

const server = http.createServer(app); // Expressアプリからhttpサーバーを作成

function startServer() {
  server.listen(config.port, () => {
    console.log(`[Server] Log service listening on port ${config.port}`);
    console.log(`[Server] Environment: ${config.env}, Log Level: ${config.logLevel}`);
    loggerService.info('ApplicationStart', {
      port: config.port,
      environment: config.env,
      logLevel: config.logLevel,
      cacheType: config.cacheType,
      cacheFlushInterval: config.inMemoryCache.flushIntervalMs,
    });
  });
}

// グレースフルシャットダウン処理
let isShuttingDownServer = false;
const gracefulShutdown = async (signal: string) => {
  if (isShuttingDownServer) {
    console.log('Server shutdown already in progress...');
    return;
  }
  isShuttingDownServer = true;
  console.log(`[Server] Received ${signal}. Initiating graceful shutdown...`);

  // 1. HTTPサーバーの新しい接続受付を停止
  server.close(async (err) => {
    if (err) {
      console.error('[Server] Error during server.close():', err);
    }
    console.log('[Server] HTTP server closed. No longer accepting new connections.');

    // 2. LoggerServiceのシャットダウン (キャッシュのフラッシュなど)
    // loggerService.shutdown() はプロセス終了フックでも呼ばれるが、ここで明示的に呼ぶことで
    // サーバー停止 -> ログフラッシュ の順序をより確実に制御する
    try {
      await loggerService.shutdown();
      console.log('[Server] LoggerService shutdown completed.');
    } catch (loggerErr) {
      console.error('[Server] Error during LoggerService shutdown:', loggerErr);
    }

    // 3. その他のリソース解放処理 (例: DBコネクションプール切断など)
    // await otherResource.close();

    console.log('[Server] Graceful shutdown complete. Exiting process.');
    process.exit(0); // 正常終了
  });

  // 強制終了タイマー (一定時間内にグレースフルシャットダウンが完了しない場合)
  const forceShutdownTimeout = 15000; // 15秒
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out. Forcing exit.');
    process.exit(1); // エラー終了
  }, forceShutdownTimeout);
};

// プロセス終了シグナルに対するハンドラ登録 (LoggerService内のフックとは別にサーバー側の制御)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // kill コマンド
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C

// Unhandled Rejection / Uncaught Exception は LoggerService 側で既にハンドリングされているが、
// ここで追加のサーバー固有処理が必要なら記述も可能。
// ただし、LoggerServiceのフックと二重にprocess.exit()を呼ばないよう注意。

// サーバー起動
startServer();

// テスト用にエクスポートする場合 (通常は不要)
// export { app, server };
