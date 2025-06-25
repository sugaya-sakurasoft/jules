import { LogEntry } from '../interfaces/log.interface';
import config from '../utils/config';

export interface IDatabaseService {
  saveLogs(logs: LogEntry[]): Promise<void>;
  // connect?(): Promise<void>; // 必要なら接続/切断メソッドをインターフェースに追加
  // disconnect?(): Promise<void>;
}

class DummyDatabaseService implements IDatabaseService {
  constructor() {
    console.log(
      `DummyDatabaseService initialized. Logs will be printed to console.
      Target DB (not used by dummy): ${config.database.host}:${config.database.port}/${config.database.databaseName}`
    );
  }

  async saveLogs(logs: LogEntry[]): Promise<void> {
    if (!logs || logs.length === 0) {
      // console.log('[DummyDB] No logs to save.'); // ログがない場合は静かに何もしない方が良い場合もある
      return;
    }
    console.log(`[DummyDB] Simulating save of ${logs.length} log(s):`);
    logs.forEach((log, index) => {
      // 実際のDB保存を模倣して、少し情報を整形して表示
      console.log(
        `[DummyDB] Log ${index + 1}: Time=${log.timestamp.toISOString()}, Level=${log.level}, Event=${log.event}, UserID=${log.userId || 'N/A'}, Data=${JSON.stringify(log.data || {})}`
      );
    });
    // 実際のDB実装では、ここでDBへの書き込み処理を行う
    // 例: await pgClient.query('INSERT INTO logs ...', [values]);
    return Promise.resolve();
  }
}

// PostgreSQL Database Service のスケルトン (将来の実装用)
/*
import { Client, ClientConfig } from 'pg';

class PostgresDatabaseService implements IDatabaseService {
  private clientConfig: ClientConfig;

  constructor() {
    this.clientConfig = {
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.databaseName,
      ssl: config.database.ssl,
    };
    // URLが設定されていればそちらを優先
    if (config.database.url) {
        this.clientConfig = { connectionString: config.database.url, ssl: config.database.ssl };
    }
    console.log('PostgresDatabaseService initialized (implementation pending).');
    // this.connectAndInitializeTable(); // 必要に応じて初期接続やテーブル作成
  }

  private async getClient(): Promise<Client> {
    const client = new Client(this.clientConfig);
    await client.connect();
    return client;
  }

  // アプリケーション起動時や必要に応じてテーブルを初期化する例
  async connectAndInitializeTable(): Promise<void> {
    const client = await this.getClient();
    try {
      // ここに CREATE TABLE IF NOT EXISTS 文などを記述
      // 例: await client.query(`
      //   CREATE TABLE IF NOT EXISTS game_logs (
      //     id SERIAL PRIMARY KEY,
      //     timestamp TIMESTAMPTZ NOT NULL,
      //     level VARCHAR(10) NOT NULL,
      //     user_id VARCHAR(255),
      //     event VARCHAR(255) NOT NULL,
      //     data JSONB,
      //     client_ip VARCHAR(45)
      //   );
      // `);
      console.log('PostgreSQL connected and table initialized (if not exists).');
    } catch (error) {
      console.error('Error initializing PostgreSQL table:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async saveLogs(logs: LogEntry[]): Promise<void> {
    if (!logs || logs.length === 0) {
      return;
    }

    const client = await this.getClient();
    try {
      // バルクインサートの例 (pgライブラリは直接的なバルクインサート構文がないため、ループかUNNESTを使う)
      // BEGIN/COMMITでトランザクション管理
      await client.query('BEGIN');
      for (const log of logs) {
        const queryText = `
          INSERT INTO game_logs (timestamp, level, user_id, event, data, client_ip)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        const values = [
          log.timestamp,
          log.level,
          log.userId,
          log.event,
          log.data ? JSON.stringify(log.data) : null, // JSONBに保存
          log.clientIp,
        ];
        await client.query(queryText, values);
      }
      await client.query('COMMIT');
      console.log(`[PostgresDB] Successfully saved ${logs.length} log(s).`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PostgresDB] Error saving logs, transaction rolled back:', error);
      throw error; // エラーを呼び出し元に伝える
    } finally {
      await client.end(); // 各操作後に接続を閉じる (コネクションプール利用時は異なる)
    }
  }
}
*/

// ファクトリ関数で適切なDBサービスを返す (将来的にconfigでDBタイプを指定できるようにする)
function createDatabaseService(): IDatabaseService {
  // const dbType = config.database.type; // configに 'type' (e.g., 'postgres', 'dummy') を追加想定
  // if (dbType === 'postgres') {
  //   return new PostgresDatabaseService();
  // }
  // 現状はDummyDatabaseServiceを常に使用
  return new DummyDatabaseService();
}

export const databaseService: IDatabaseService = createDatabaseService();
