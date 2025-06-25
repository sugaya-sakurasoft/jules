
// kpi_database/src/main.ts (デバッグログ・timeout設定追加版)
import { Pool as PgPool, PoolClient as PgPoolClient } from 'pg';
import { Connection as MySqlConnection } from 'mysql2/promise';
import { connectPostgres, connectMySql } from './db';
import { formatDate, parseDate, setDatePart, addDate } from './dateUtils';

const mySqlConfig = {
  host: '210.168.61.137',
  user: 'kpi_teisen',
  password: 'mobi0!kpiteisen@#$',
  database: 'teisen_kpidb',
  port: 3306,
};

const postgresConfigs = [
  { name: 'YAHOO', config: { user: 'postgres', host: 'localhost', database: 'teisen-tomoyo-mobage', password: 'postgres', port: 10602, connectionTimeoutMillis: 10000 } },
  { name: 'GREE', config: { user: 'postgres', host: 'localhost', database: 'teisen-tomoyo-gree', password: 'postgres', port: 10602, connectionTimeoutMillis: 10000 } },
  { name: 'DGAME', config: { user: 'postgres', host: 'localhost', database: 'teisen-tomoyo-dgame', password: 'postgres', port: 10602, connectionTimeoutMillis: 10000 } },
  { name: 'YAMADA', config: { user: 'postgres', host: 'localhost', database: 'teisen_release_yamada_user_1', password: 'postgres', port: 10504, connectionTimeoutMillis: 10000 } },
  { name: 'TSUTAYA', config: { user: 'postgres', host: 'localhost', database: 'teisen_release_tsutaya_user_1', password: 'postgres', port: 10504, connectionTimeoutMillis: 10000 } },
  { name: 'GESOTEN', config: { user: 'postgres', host: 'localhost', database: 'teisen_release_tsutaya_user_1', password: 'postgres', port: 10504, connectionTimeoutMillis: 10000 } },
];

interface PaymentData {
  start_date: string;

  coin: number;
  free_coin: number;
}

async function moveData(): Promise<void> {
  let conMySql: MySqlConnection | null = null;
  let conPos: PgPool | null = null;

  console.log('DEBUG: moveData function started.'); // 関数開始ログ

  try {
    console.log('DEBUG: Attempting to connect to MySQL...');
    conMySql = await connectMySql(mySqlConfig);
    console.log('DEBUG: MySQL connection successful.');

    let beginDate = new Date(2023, 4 - 1, 19);

    beginDate = setDatePart(beginDate, 'hours', 0);
    beginDate = setDatePart(beginDate, 'minutes', 0);
    beginDate = setDatePart(beginDate, 'seconds', 0);
    beginDate.setMilliseconds(0);
    console.log('DEBUG: Default beginDate initialized to:', formatDate(beginDate, 'yyyy-MM-dd'));

    const getMaxInsertDateSql = "SELECT MAX(insert_date) AS start_date FROM stat_product_success";
    console.log('DEBUG: Executing SQL to get max insert_date from MySQL:', getMaxInsertDateSql);
    const [rows]: any = await conMySql.execute(getMaxInsertDateSql);
    console.log('DEBUG: Result from getMaxInsertDateSql:', rows);

    if (rows && rows.length > 0 && rows[0] && rows[0].start_date !== null && rows[0].start_date !== undefined) {
      const startDateVal = rows[0].start_date;
      console.log('DEBUG: [MySQL MAX(insert_date)] Raw start_date value:', startDateVal, 'Type:', typeof startDateVal);

      const parsedStartDate = parseDate(startDateVal, 'yyyy-MM-dd');
      beginDate = addDate(parsedStartDate, 'day', 1);
      console.log('DEBUG: beginDate updated from MySQL MAX(insert_date) to:', formatDate(beginDate, 'yyyy-MM-dd'));
    } else {
      console.log('DEBUG: No valid start_date found from stat_product_success or table is empty. Using default beginDate.');
    }
    console.log("Processing from date:", formatDate(beginDate, 'yyyy-MM-dd'));

    let endDate = new Date();
    endDate = setDatePart(endDate, 'hours', 0);
    endDate = setDatePart(endDate, 'minutes', 0);
    endDate = setDatePart(endDate, 'seconds', 0);
    endDate.setMilliseconds(0);
    console.log("Processing until date (exclusive):", formatDate(endDate, 'yyyy-MM-dd'));

    const beginDateStr = formatDate(beginDate, 'yyyy-MM-dd');
    const endDateStr = formatDate(endDate, 'yyyy-MM-dd');

    for (const pgSource of postgresConfigs) {
      let userChannel = pgSource.name;
      console.log(`\nDEBUG: === LOOP START: Processing channel: ${userChannel} ===`); // ループ開始
      conPos = null;
      let pgClient: PgPoolClient | null = null;
      let count = 0;

      try {
        console.log(`DEBUG: [${userChannel}] PostgreSQL config to be used:`, JSON.stringify(pgSource.config)); // 使用する設定
        conPos = await connectPostgres(pgSource.config);
        console.log(`DEBUG: [${userChannel}] connectPostgres call completed. Pool should be established.`);

        console.log(`DEBUG: [${userChannel}] Attempting to get a client from the pool...`);
        pgClient = await conPos.connect();
        console.log(`DEBUG: [${userChannel}] Successfully got a client from the pool.`);

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

        console.log(`DEBUG: [${userChannel}] Executing query:\n${sql}`); // SQL実行前
        const { rows: resultRows } = await pgClient.query<PaymentData>(sql);
        console.log(`DEBUG: [${userChannel}] Rows received from PostgreSQL: ${resultRows ? resultRows.length : 'null or undefined'}`); // 結果行数

        if (resultRows && resultRows.length > 0) {
          for (const row of resultRows) {
            const pgRowStartDateVal = row.start_date;
            console.log(`DEBUG: [${userChannel}] Raw row.start_date from PG:`, pgRowStartDateVal, `Type:`, typeof pgRowStartDateVal); // PGからの生データ

            const startDateFromRow = parseDate(pgRowStartDateVal, 'yyyy-MM-dd HH');

            const insertDate = formatDate(startDateFromRow, 'yyyy-MM-dd');
            const insertTime = formatDate(startDateFromRow, 'HH');
            const realCash = Number(row.coin) || 0;
            const freeCoin = Number(row.free_coin) || 0;
            const updateDt = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss');

            const insertSql = `
              INSERT INTO stat_product_success
              (insert_date, insert_time, user_channel, gamecode, server, product, real_cash, event_cash, count, update_dt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const values = [
              insertDate, parseInt(insertTime, 10), userChannel, 3, 1, 1,
              realCash, freeCoin, 1, updateDt
            ];

            await conMySql.execute(insertSql, values);
            count++;
          }
        }
        console.log(`${userChannel}: ${count} records inserted.`);

      } catch (e: any) {
        console.error(`ERROR: Error processing channel ${userChannel}:`, e.message); // チャネルごとのエラー
        if (e.stack) console.error(`Stack trace for ${userChannel}:`, e.stack);
      } finally {
        console.log(`DEBUG: [${userChannel}] Entering finally block for PostgreSQL client and pool.`); // finally開始
        if (pgClient) {
          console.log(`DEBUG: [${userChannel}] Releasing PostgreSQL client...`);
          pgClient.release();
          console.log(`DEBUG: [${userChannel}] PostgreSQL client released.`);
        } else {
          console.log(`DEBUG: [${userChannel}] pgClient was null, no client to release.`);
        }
        if (conPos) {
          console.log(`DEBUG: [${userChannel}] Attempting to close PostgreSQL connection pool...`);
          await conPos.end();
          console.log(`DEBUG: [${userChannel}] PostgreSQL connection pool for ${userChannel} closed.`);
        } else {
          console.log(`DEBUG: [${userChannel}] conPos was null, no pool to close.`);
        }
        conPos = null;
        console.log(`DEBUG: [${userChannel}] Exiting finally block for PostgreSQL.`); // finally終了
      }
      console.log(`DEBUG: === LOOP END: Finished processing for channel: ${userChannel} ===`); // ループ終了
    }

  } catch (error: any) {
    console.error("A critical error occurred in moveData:", error.message); // 全体エラー
    if (error.stack) {
      console.error("Full error object and stack trace:", error);
    } else {
      console.error("Full error object (no stack):", error);
    }
    process.exitCode = 1;
  } finally {
    console.log("DEBUG: Entering final finally block for MySQL connection."); // 最終finally開始
    if (conMySql) {
      console.log("DEBUG: Attempting to close MySQL connection...");
      await conMySql.end();
      console.log("MySQL connection closed.");
    } else {
      console.log("DEBUG: conMySql was null, no MySQL connection to close.");
    }
    console.log("Data migration process finished.");
    console.log("DEBUG: moveData function ended."); // 関数終了ログ
  }
}

console.log('DEBUG: Script execution starting...'); // スクリプト開始ログ
moveData().catch(err => {
  console.error("Unhandled error at the top level of moveData execution:", err);
  process.exit(1);
});
```
