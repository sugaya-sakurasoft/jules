import { LogEntry } from '../interfaces/log.interface';
import config from '../utils/config';

export interface ICacheService {
  add(logEntry: LogEntry): Promise<void>;
  getAllAndClear(): Promise<LogEntry[]>; // 取得とクリアをアトミックに行うメソッドに変更
  getSize(): Promise<number>;
  isFull(): Promise<boolean>;
}

class InMemoryCacheService implements ICacheService {
  private cache: LogEntry[] = [];
  private readonly maxSize: number = config.inMemoryCache.maxSize;

  constructor() {
    console.log(`InMemoryCacheService initialized with maxSize: ${this.maxSize}`);
  }

  async add(logEntry: LogEntry): Promise<void> {
    if (this.cache.length >= this.maxSize && this.maxSize > 0) {
      // maxSizeが0以下の場合は無制限とみなし、古いエントリの削除は行わない。
      // (ただし、メモリ溢れのリスクがあるので maxSize > 0 を推奨)
      const removed = this.cache.shift(); // 最も古いエントリを削除
      console.warn(
        `InMemoryCache is full (size: ${this.cache.length + 1}). Discarded oldest log entry: ${removed?.event}`
      );
    }
    this.cache.push(logEntry);
  }

  async getAllAndClear(): Promise<LogEntry[]> {
    const logs = [...this.cache]; // イミュータブルなコピーを作成
    this.cache = []; // キャッシュをクリア
    return logs;
  }

  async getSize(): Promise<number> {
    return this.cache.length;
  }

  async isFull(): Promise<boolean> {
    if (this.maxSize <= 0) return false; // maxSizeが0以下なら「満杯」にはならない
    return this.cache.length >= this.maxSize;
  }
}

// RedisCacheService のスケルトン (将来の実装用)
/*
import { createClient, RedisClientType } from 'redis'; // redisライブラリの型をインポート

class RedisCacheService implements ICacheService {
  private client: RedisClientType;
  private readonly listKey = 'log_cache_list'; // Redisのリストキー

  constructor() {
    const redisUrl = config.redis.url;
    if (redisUrl) {
      this.client = createClient({ url: redisUrl });
    } else {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
        },
        password: config.redis.password,
        database: config.redis.db,
      });
    }
    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.client.connect().then(() => console.log('RedisCacheService connected to Redis.'));
    // TODO: maxSize の扱いをRedisでどうするか検討 (例: LTRIM と組み合わせるなど)
    console.log(`RedisCacheService initialized (maxSize from config: ${config.inMemoryCache.maxSize} - needs Redis-specific handling)`);
  }

  async add(logEntry: LogEntry): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
    await this.client.lPush(this.listKey, JSON.stringify(logEntry));
    // Redis側でリストの長さを制限するなら LTRIM を使う
    // await this.client.lTrim(this.listKey, 0, config.inMemoryCache.maxSize - 1);
  }

  async getAllAndClear(): Promise<LogEntry[]> {
    if (!this.client.isOpen) await this.client.connect();
    const rawLogs = await this.client.lRange(this.listKey, 0, -1);
    await this.client.del(this.listKey); // または LTRIM で全削除
    return rawLogs.map(log => JSON.parse(log) as LogEntry).reverse(); // lPushなので逆順にする
  }

  async getSize(): Promise<number> {
    if (!this.client.isOpen) await this.client.connect();
    return this.client.lLen(this.listKey);
  }

  async isFull(): Promise<boolean> {
    // Redisの場合、isFullの概念はmaxSizeの扱いに依存する。
    // 固定長リストとしてLTRIMで制御する場合、厳密な「満杯」は発生しにくい。
    // ここではinMemoryCacheのmaxSizeを流用するが、Redisの戦略に合わせて要調整。
    if (config.inMemoryCache.maxSize <= 0) return false;
    const currentSize = await this.getSize();
    return currentSize >= config.inMemoryCache.maxSize;
  }
}
*/

// ファクトリ関数で適切なキャッシュサービスを返す
function createCacheService(): ICacheService {
  if (config.cacheType === 'redis') {
    // return new RedisCacheService(); // Redisを有効にする場合はコメントアウトを外す
    console.warn("Redis cache type configured but RedisCacheService is not enabled in code. Falling back to InMemoryCacheService.");
    return new InMemoryCacheService();
  }
  return new InMemoryCacheService();
}

export const cacheService: ICacheService = createCacheService();
