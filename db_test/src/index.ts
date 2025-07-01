import { Client } from 'pg';
import dotenv from 'dotenv';

// .envファイルから環境変数を読み込む
dotenv.config();

async function main() {
  // データベース接続情報
  // 環境変数から取得することを推奨します
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'your_db_user', // ご自身のユーザー名に置き換えてください
    password: process.env.DB_PASSWORD || 'your_db_password', // ご自身のパスワードに置き換えてください
    database: process.env.DB_NAME || 'your_db_name', // ご自身のデータベース名に置き換えてください
  });

  try {
    // データベースに接続
    await client.connect();
    console.log('Connected to PostgreSQL database!');

    // テーブル作成 (存在しない場合のみ)
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableQuery);
    console.log('Table "users" created or already exists.');

    // データ挿入
    const insertUserQuery = `
      INSERT INTO users (name, email)
      VALUES ($1, $2)
      ON CONFLICT (email) DO NOTHING
      RETURNING *;
    `;
    const newUser = ['Alice Wonderland', 'alice@example.com'];
    let res = await client.query(insertUserQuery, newUser);
    if (res.rows.length > 0) {
      console.log('Inserted new user:', res.rows[0]);
    } else {
      console.log(`User with email ${newUser[1]} already exists or another conflict occurred.`);
    }

    const newUser2 = ['Bob The Builder', 'bob@example.com'];
    res = await client.query(insertUserQuery, newUser2);
    if (res.rows.length > 0) {
      console.log('Inserted new user:', res.rows[0]);
    } else {
      console.log(`User with email ${newUser2[1]} already exists or another conflict occurred.`);
    }


    // データ取得
    const getUsersQuery = 'SELECT * FROM users ORDER BY created_at DESC;';
    res = await client.query(getUsersQuery);
    console.log('All users:');
    res.rows.forEach(user => {
      console.log(`- ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Created At: ${user.created_at}`);
    });

  } catch (err) {
    if (err instanceof Error) {
      console.error('Database Error:', err.message);
    } else {
      console.error('An unknown database error occurred');
    }
  } finally {
    // データベース接続を閉じる
    await client.end();
    console.log('Disconnected from PostgreSQL database.');
  }
}

main().catch(err => {
  if (err instanceof Error) {
    console.error('Unhandled Error in main function:', err.message);
  } else {
    console.error('An unknown error occurred in main function');
  }
});
