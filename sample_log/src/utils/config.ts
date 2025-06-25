import { LogLevel } from '../interfaces/log.interface';

interface AppConfig {
  env: string;
  port: number;
  logLevel: LogLevel;
  cacheType: 'in-memory' | 'redis';
  inMemoryCache: {
    maxSize: number;
    flushIntervalMs: number; // 0の場合は時間ベースのフラッシュを無効化
  };
  redis: {
    url?: string; // redis://user:pass@host:port
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  database: { // PostgreSQLを想定
    url?: string; // postgresql://user:pass@host:port/dbname
    host: string;
    port: number;
    user: string;
    password?: string;
    databaseName: string;
    ssl: boolean | { rejectUnauthorized: boolean }; // SSL接続オプション
  };
}

const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  cacheType: (process.env.CACHE_TYPE as 'in-memory' | 'redis') || 'in-memory',
  inMemoryCache: {
    maxSize: parseInt(process.env.IN_MEMORY_CACHE_MAX_SIZE || '1000', 10),
    flushIntervalMs: parseInt(process.env.IN_MEMORY_CACHE_FLUSH_INTERVAL_MS || '60000', 10), // 60秒
  },
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'loguser',
    password: process.env.DB_PASSWORD || 'logpassword',
    databaseName: process.env.DB_NAME || 'logdb',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false, // 例: Heroku Postgresなど外部DBで必要に応じてtrueに
  },
};

// LOG_LEVELのバリデーション (不正な値が設定された場合はデフォルトにフォールバック)
if (!Object.values(LogLevel).includes(config.logLevel)) {
  console.warn(`Invalid LOG_LEVEL: ${config.logLevel}. Defaulting to ${LogLevel.INFO}.`);
  config.logLevel = LogLevel.INFO;
}

if (!['in-memory', 'redis'].includes(config.cacheType)) {
  console.warn(`Invalid CACHE_TYPE: ${config.cacheType}. Defaulting to in-memory.`);
  config.cacheType = 'in-memory';
}


export default config;
