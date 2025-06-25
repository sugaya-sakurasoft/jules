import { Pool, ClientConfig as PgClientConfig } from 'pg';
import mysql, { ConnectionOptions as MySqlConnectionOptions } from 'mysql2/promise';

// PostgreSQL接続設定の型定義
interface PostgresConfig extends PgClientConfig {
  connectionString?: string; // pgライブラリはconnectionStringも受け付けるため追加
}

// MySQL接続設定の型定義
interface MySqlConfig extends MySqlConnectionOptions {
  uri?: string; // mysql2ライブラリはuri形式も受け付けるため追加
}

/**
 * PostgreSQLデータベースへの接続を確立します。
 * @param config PostgreSQL接続設定
 * @returns PoolオブジェクトのPromise
 */
export async function connectPostgres(config: PostgresConfig): Promise<Pool> {
  const pool = new Pool(config);
  try {
    await pool.connect();
    console.log('Connected to PostgreSQL successfully!');
    return pool;
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    throw error;
  }
}

/**
 * MySQLデータベースへの接続を確立します。
 * @param config MySQL接続設定
 * @returns ConnectionオブジェクトのPromise
 */
export async function connectMySql(config: MySqlConfig): Promise<mysql.Connection> {
  try {
    const connection = await mysql.createConnection(config);
    console.log('Connected to MySQL successfully!');
    return connection;
  } catch (error) {
    console.error('Error connecting to MySQL:', error);
    throw error;
  }
}

// 使用例 (実際の接続情報に置き換えてください)
/*
async function main() {
  // PostgreSQLへの接続例
  const pgConfig: PostgresConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'teisen-tomoyo-mobage',
    password: 'postgres',
    port: 10602,
  };
  let pgPool: Pool | null = null;

  try {
    pgPool = await connectPostgres(pgConfig);
    // ここでPostgreSQLに対するクエリなどを実行
    // const res = await pgPool.query('SELECT NOW()');
    // console.log('PostgreSQL time:', res.rows[0]);
  } catch (err) {
    console.error('PostgreSQL connection or query failed:', err);
  } finally {
    if (pgPool) {
      await pgPool.end();
      console.log('PostgreSQL connection closed.');
    }
  }

  // MySQLへの接続例
  const mySqlConfig: MySqlConfig = {
    host: '210.168.61.137',
    user: 'kpi_teisen',
    password: 'mobi0!kpiteisen@#$',
    database: 'teisen_kpidb',
    port: 3306,
  };
  let mySqlConnection: mysql.Connection | null = null;

  try {
    mySqlConnection = await connectMySql(mySqlConfig);
    // ここでMySQLに対するクエリなどを実行
    // const [rows, fields] = await mySqlConnection.execute('SELECT NOW()');
    // console.log('MySQL time:', rows);
  } catch (err) {
    console.error('MySQL connection or query failed:', err);
  } finally {
    if (mySqlConnection) {
      await mySqlConnection.end();
      console.log('MySQL connection closed.');
    }
  }
}

main().catch(console.error);
*/
