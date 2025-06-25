import { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import { Connection as MySqlConnection } from 'mysql2/promise';
import { connectPostgres, connectMySql } from './db';
import { formatDate, parseDate, setDatePart, addDate } from './dateUtils';

// --- データベース接続設定 ---
// TODO: 実際の環境に合わせて設定値を修正してください
const mySqlConfig = {
  host: '210.168.61.137',
  user: 'kpi_teisen',
  password: 'mobi0!kpiteisen@#$', // セキュリティのため環境変数などから読み込むことを推奨
  database: 'teisen_kpidb',
  port: 3306,
};

const postgresConfigs = [
  { name: 'YAHOO', config: { user: 'postgres', host: 'localhost', database: 'teisen-tomoyo-mobage', password: 'postgres', port: 10602 } },
  { name: 'GREE', config: { user: 'postgres', host: 'localhost', database: 'teisen-tomoyo-gree', password: 'postgres', port: 10602 } },
  { name: 'DGAME', config: { user: 'postgres', host: 'localhost', database: 'teisen-tomoyo-dgame', password: 'postgres', port: 10602 } },
  { name: 'YAMADA', config: { user: 'postgres', host: 'localhost', database: 'teisen_release_yamada_user_1', password: 'postgres', port: 10504 } },
  { name: 'TSUTAYA', config: { user: 'postgres', host: 'localhost', database: 'teisen_release_tsutaya_user_1', password: 'postgres', port: 10504 } },
  { name: 'GESOTEN', config: { user: 'postgres', host: 'localhost', database: 'teisen_release_tsutaya_user_1', password: 'postgres', port: 10504 } }, // TSUTAYAと同じDBだがクエリが異なる
];

interface PaymentData {
  start_date: string; // "YYYY-MM-DD HH"
  coin: number;
  free_coin: number;
}

async function moveData(): Promise<void> {
  let conMySql: MySqlConnection | null = null;
  let conPos: PgPool | null = null; // PostgreSQLはPoolを使用

  try {
    // MySQLデータベース接続
    conMySql = await connectMySql(mySqlConfig);

    // --- 開始日の決定 ---
    let beginDate = new Date(2023, 4 - 1, 19); // Javaの月は-1 (2023, May, 19) / Calendarの月は0-indexedなので4はMay。JSのDateも0-indexed
    beginDate = setDatePart(beginDate, 'hours', 0);
    beginDate = setDatePart(beginDate, 'minutes', 0);
    beginDate = setDatePart(beginDate, 'seconds', 0);
    beginDate.setMilliseconds(0);


    const getMaxInsertDateSql = "SELECT MAX(insert_date) AS start_date FROM stat_product_success";
    const [rows]: any = await conMySql.execute(getMaxInsertDateSql);

    if (rows && rows.length > 0 && rows[0].start_date) {
      const startDateStr = rows[0].start_date; // YYYY-MM-DD 形式のはず
      // MySQLのDATE型は 'YYYY-MM-DD' で返るので、parseDateは 'yyyy-MM-dd' を期待
      const parsedStartDate = parseDate(startDateStr, 'yyyy-MM-dd');
      beginDate = addDate(parsedStartDate, 'day', 1);
    }
    console.log("Processing from date:", formatDate(beginDate, 'yyyy-MM-dd'));

    // --- 終了日の設定 ---
    let endDate = new Date(); // 現在日時
    endDate = setDatePart(endDate, 'hours', 0);
    endDate = setDatePart(endDate, 'minutes', 0);
    endDate = setDatePart(endDate, 'seconds', 0);
    endDate.setMilliseconds(0); // この日の前日までを処理対象とするので、この日の0時まで
    console.log("Processing until date (exclusive):", formatDate(endDate, 'yyyy-MM-dd'));


    const beginDateStr = formatDate(beginDate, 'yyyy-MM-dd');
    const endDateStr = formatDate(endDate, 'yyyy-MM-dd'); // SQLのBETWEENでは endDateStr の日付も含まれるように調整が必要な場合がある

    for (const pgSource of postgresConfigs) {
      let userChannel = pgSource.name;
      console.log(`\n--- Processing channel: ${userChannel} ---`);

      try {
        conPos = await connectPostgres(pgSource.config);
        let pgClient: PgPoolClient | null = null; // PoolからClientを取得して使用

        try {
            pgClient = await conPos.connect();

            let sql = `SELECT TO_CHAR(start_date, 'YYYY-MM-DD HH24') AS start_date, SUM(coin) AS coin, 0 AS free_coin FROM tomoyo_payment WHERE start_date >= '${beginDateStr}' AND start_date < '${endDateStr}' GROUP BY 1 ORDER BY 1`;

            switch (userChannel) {
              case 'YAMADA':
                sql = `SELECT TO_CHAR(start_date, 'YYYY-MM-DD HH24') AS start_date, SUM(coin) AS coin, SUM(free_coin) AS free_coin FROM payment WHERE is_finished = TRUE AND start_date >= '${beginDateStr}' AND start_date < '${endDateStr}' GROUP BY 1 ORDER BY 1`;
                break;
              case 'TSUTAYA':
                sql = `SELECT TO_CHAR(p.start_date, 'YYYY-MM-DD HH24') AS start_date, SUM(p.coin) AS coin, SUM(p.free_coin) AS free_coin FROM payment p INNER JOIN user_t u ON p.user_id = u.id AND u.ooid NOT LIKE 'gs%' WHERE p.is_finished = TRUE AND p.start_date >= '${beginDateStr}' AND p.start_date < '${endDateStr}' GROUP BY 1 ORDER BY 1`;
                break;
              case 'GESOTEN':
                sql = `SELECT TO_CHAR(p.start_date, 'YYYY-MM-DD HH24') AS start_date, SUM(p.coin) AS coin, SUM(p.free_coin) AS free_coin FROM payment p INNER JOIN user_t u ON p.user_id = u.id AND u.ooid LIKE 'gs%' WHERE p.is_finished = TRUE AND p.start_date >= '${beginDateStr}' AND p.start_date < '${endDateStr}' GROUP BY 1 ORDER BY 1`;
                break;
            }

            console.log(`Executing query on ${userChannel}:\n${sql}`);
            const { rows: resultRows } = await pgClient.query<PaymentData>(sql);

            let count = 0;
            if (resultRows && resultRows.length > 0) {
              for (const row of resultRows) {
                const startDateFromRow = parseDate(row.start_date, 'yyyy-MM-dd HH'); // "YYYY-MM-DD HH"

                const insertDate = formatDate(startDateFromRow, 'yyyy-MM-dd');
                const insertTime = formatDate(startDateFromRow, 'HH'); // 時間のみ
                const realCash = Number(row.coin) || 0;
                const freeCoin = Number(row.free_coin) || 0;
                const updateDt = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss');

                const insertSql = `
                  INSERT INTO stat_product_success
                  (insert_date, insert_time, user_channel, gamecode, server, product, real_cash, event_cash, count, update_dt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                const values = [
                  insertDate,       // insert_date
                  parseInt(insertTime, 10), // insert_time (hour as number)
                  userChannel,      // user_channel
                  3,                // gamecode
                  1,                // server
                  1,                // product
                  realCash,         // real_cash
                  freeCoin,         // event_cash (original had rs.getInt("free_coin"))
                  1,                // count
                  updateDt          // update_dt
                ];

                // console.log("Inserting to MySQL:", insertSql, values);
                await conMySql.execute(insertSql, values);
                count++;
              }
            }
            console.log(`${userChannel}: ${count} records inserted.`);

        } finally {
            if (pgClient) {
                pgClient.release(); // ClientをPoolに返却
            }
        }
      } catch (e: any) {
        console.error(`Error processing channel ${userChannel}:`, e.message);
        // エラーが発生しても次のチャネルの処理を続ける
      } finally {
        if (conPos) {
          await conPos.end(); // Poolを閉じる
          console.log(`PostgreSQL connection for ${userChannel} closed.`);
          conPos = null;
        }
      }
    }

  } catch (error: any) {
    console.error("A critical error occurred in moveData:", error.message);
    // Java版ではここでスタックトレースを出力して終了していた
    // Node.jsでは通常プロセスが終了するが、明示的に process.exit(1) も可能
    process.exitCode = 1; // エラーコードを設定して終了
  } finally {
    if (conMySql) {
      await conMySql.end();
      console.log("MySQL connection closed.");
    }
    console.log("Data migration process finished.");
  }
}

// --- メイン処理の実行 ---
moveData().catch(err => {
  // moveData内でキャッチされなかった予期せぬエラー
  console.error("Unhandled error in moveData execution:", err);
  process.exit(1); // 強制終了
});
