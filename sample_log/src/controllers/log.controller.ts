import { Router, Request, Response, NextFunction } from 'express';
import { loggerService } from '../services/logger.service';
import { RawLogEntry, LogLevel } from '../interfaces/log.interface';

const router = Router();

// Joiやclass-validatorなどのバリデーションライブラリを使うのが望ましいが、ここでは簡易的な実装
const validateLogRequest = (req: Request, res: Response, next: NextFunction) => {
  const body = req.body as Partial<RawLogEntry>; // Partialで受け取り必須チェック

  if (!body.level || !Object.values(LogLevel).includes(body.level)) {
    return res.status(400).json({ message: 'Invalid or missing log level (level). Must be one of: debug, info, warn, error.' });
  }
  if (!body.event || typeof body.event !== 'string' || body.event.trim() === '') {
    return res.status(400).json({ message: 'Invalid or missing event name (event).' });
  }
  if (body.userId !== undefined && (typeof body.userId !== 'string' || body.userId.trim() === '')) {
    // userIdはオプショナルだが、存在する場合は空でない文字列であるべき
    return res.status(400).json({ message: 'Invalid userId format. If provided, must be a non-empty string.' });
  }
  if (body.clientIp !== undefined && (typeof body.clientIp !== 'string' || body.clientIp.trim() === '')) {
    // clientIpもオプショナルだが、形式バリデーションを強化可能 (例: IPアドレス正規表現)
    return res.status(400).json({ message: 'Invalid clientIp format. If provided, must be a non-empty string.' });
  }
  if (body.data !== undefined && typeof body.data !== 'object') {
    // dataはオプショナルだが、存在する場合はオブジェクトであるべき
    return res.status(400).json({ message: 'Invalid data format. If provided, must be an object.' });
  }

  // バリデーション成功、RawLogEntry型にキャストして次に渡す
  req.body = body as RawLogEntry;
  next();
};

router.post('/logs', validateLogRequest, (req: Request, res: Response) => {
  // validateLogRequestミドルウェアで型アサーション済みなので、ここではRawLogEntryとして扱える
  const rawLog: RawLogEntry = req.body;

  // loggerService.log は非同期だが、クライアントへのレスポンスは待たずにすぐに返す (Fire and Forget)
  // これにより、ログ処理の遅延がクライアントのレスポンスタイムに影響するのを防ぐ
  loggerService.log(rawLog).catch(error => {
    // loggerService.log 内でエラーがキャッチされるはずだが、万が一のトップレベルエラー
    console.error('[CRITICAL] Uncaught error from loggerService.log in controller:', error);
  });

  // 202 Accepted: リクエストは受け付けられたが、処理は完了していない（非同期処理のため）
  res.status(202).json({ message: 'Log received and queued for processing.' });
});

router.get('/health', (req: Request, res: Response) => {
  // TODO: より詳細なヘルスチェック (DB接続状況、キャッシュ状況など) を追加可能
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'Log service is healthy.'
  });
});

export default router;
