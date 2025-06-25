import { LogLevel, LogEntry, RawLogEntry } from '../interfaces/log.interface';
import { cacheService, ICacheService } from './cache.service';
import { databaseService, IDatabaseService } from './database.service';
import config from '../utils/config';

class LoggerService {
  private cache: ICacheService;
  private dbService: IDatabaseService;
  private flushIntervalId?: NodeJS.Timeout;
  private isShuttingDown = false; // シャットダウン処理中のフラグ

  constructor(cacheImpl: ICacheService, dbServiceImpl: IDatabaseService) {
    this.cache = cacheImpl;
    this.dbService = dbServiceImpl;

    if (config.inMemoryCache.flushIntervalMs > 0) {
      this.flushIntervalId = setInterval(
        () => this.flushLogsToDb('interval'),
        config.inMemoryCache.flushIntervalMs
      );
      console.log(`LoggerService: Auto-flush to DB scheduled every ${config.inMemoryCache.flushIntervalMs}ms.`);
    }
    this.registerShutdownHooks();
  }

  // ログレベルの順序を定義 (低いものが先)
  private static readonly logLevelOrder: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
  };

  // 設定されたログレベルに基づいてログを記録すべきか判断
  private shouldLog(level: LogLevel): boolean {
    const configuredLevelValue = LoggerService.logLevelOrder[config.logLevel];
    const messageLevelValue = LoggerService.logLevelOrder[level];
    return messageLevelValue >= configuredLevelValue;
  }

  public async log(rawLog: RawLogEntry): Promise<void> {
    if (this.isShuttingDown) {
      console.warn('LoggerService is shutting down. Log ignored:', rawLog.event);
      return;
    }

    if (!this.shouldLog(rawLog.level)) {
      // console.log(`Log event '${rawLog.event}' with level '${rawLog.level}' filtered out.`);
      return;
    }

    const logEntry: LogEntry = {
      ...rawLog,
      timestamp: new Date(), // サーバー側で正確なタイムスタンプを付与
      // clientIp: rawLog.clientIp || 'unknown', // IPはAPIコントローラー層で取得・付与する方が良い場合もある
    };

    try {
      await this.cache.add(logEntry);
      // console.log(`Log added to cache: ${logEntry.event}, Level: ${logEntry.level}`);

      if (await this.cache.isFull()) {
        // console.log('Cache is full, triggering flush to DB.');
        await this.flushLogsToDb('cache_full');
      }
    } catch (error) {
      console.error('Error adding log to cache:', error, logEntry);
      // フォールバックとして直接DBに書き込む試みも可能だが、今回はエラーログのみ
    }
  }

  public async flushLogsToDb(trigger: 'manual' | 'cache_full' | 'interval' | 'shutdown'): Promise<void> {
    if (this.isShuttingDown && trigger !== 'shutdown') {
      console.warn(`Flush triggered by '${trigger}' during shutdown, but only 'shutdown' trigger is allowed.`);
      return;
    }

    const logsToSave = await this.cache.getAllAndClear(); // 取得とクリアをアトミックに

    if (logsToSave.length === 0) {
      // console.log(`Flush triggered by '${trigger}', but no logs in cache to save.`);
      return;
    }

    console.log(`Flushing ${logsToSave.length} log(s) to DB, triggered by: ${trigger}.`);
    try {
      await this.dbService.saveLogs(logsToSave);
      console.log(`${logsToSave.length} logs successfully flushed to DB.`);
    } catch (error) {
      console.error(`Error flushing ${logsToSave.length} logs to DB:`, error);
      // TODO: エラー発生時のリトライ戦略やファイルへのフォールバックなどを検討
      // 例えば、失敗したログを再度キャッシュに戻すか（ただし無限ループに注意）
      // logsToSave.forEach(log => this.cache.add(log)); // 再度キャッシュに戻す場合 (慎重に)
    }
  }

  // アプリケーション終了時の処理
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    console.log('LoggerService shutting down...');

    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      console.log('Auto-flush interval cleared.');
    }

    await this.flushLogsToDb('shutdown');
    console.log('LoggerService shutdown complete.');
    // ここで loggerService インスタンスの参照を解放したりはしない
  }

  private registerShutdownHooks(): void {
    const handler = async (signal: string) => {
      console.log(`Received ${signal}. Initiating graceful shutdown of LoggerService.`);
      await this.shutdown();
      process.exit(signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1); // uncaughtExceptionなどはエラー終了
    };

    // SIGINT (Ctrl+C) と SIGTERM (kill)
    process.on('SIGINT', () => handler('SIGINT'));
    process.on('SIGTERM', () => handler('SIGTERM'));

    // 通常終了時 (process.exit() が呼ばれた場合など)
    // process.on('exit', async (code) => {
    //   console.log(`Process exiting with code: ${code}. Performing final log flush.`);
    //   await this.shutdown(); // exitイベントは非同期処理を保証しないため、ここでのshutdownはベストエフォート
    // });

    // キャッチされなかった例外 - 先にログをフラッシュしてから終了
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      await handler('uncaughtException');
    });

    // unhandledRejection - 先にログをフラッシュしてから終了
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      await handler('unhandledRejection');
    });
  }

  // 便利なログメソッド
  public debug(event: string, data?: Record<string, any>, userId?: string, clientIp?: string): void {
    this.log({ level: LogLevel.DEBUG, event, data, userId, clientIp });
  }
  public info(event: string, data?: Record<string, any>, userId?: string, clientIp?: string): void {
    this.log({ level: LogLevel.INFO, event, data, userId, clientIp });
  }
  public warn(event: string, data?: Record<string, any>, userId?: string, clientIp?: string): void {
    this.log({ level: LogLevel.WARN, event, data, userId, clientIp });
  }
  public error(event: string, data?: Record<string, any>, userId?: string, clientIp?: string): void {
    this.log({ level: LogLevel.ERROR, event, data, userId, clientIp });
  }
}

// LoggerServiceのシングルトンインスタンス
export const loggerService = new LoggerService(cacheService, databaseService);
