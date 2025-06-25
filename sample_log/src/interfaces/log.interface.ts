export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  userId?: string; // ユーザーIDはオプショナル
  event: string; // イベント名 (例: 'login', 'item_purchase', 'level_up')
  data?: Record<string, any>; // イベントに関する詳細データ (JSON形式を想定)
  clientIp?: string; // クライアントのIPアドレス (オプショナル)
}

// APIリクエストとして受け取るログの型
export interface RawLogEntry {
  level: LogLevel;
  userId?: string;
  event: string;
  data?: Record<string, any>;
  clientIp?: string; // API経由で送信される場合もあるため追加
}
