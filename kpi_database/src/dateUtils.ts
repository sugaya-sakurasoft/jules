/**
 * Dateオブジェクトを指定されたフォーマットの文字列に変換します。
 * yyyy: 年 (4桁)
 * MM: 月 (2桁, 01-12)
 * dd: 日 (2桁, 01-31)
 * HH: 時 (2桁, 00-23)
 * mm: 分 (2桁, 00-59)
 * ss: 秒 (2桁, 00-59)
 * @param date Dateオブジェクト
 * @param format フォーマット文字列
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date, format: string): string {
  let formattedString = format;

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() は 0-11 を返すため +1
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  formattedString = formattedString.replace(/yyyy/g, String(year));
  formattedString = formattedString.replace(/MM/g, String(month).padStart(2, '0'));
  formattedString = formattedString.replace(/dd/g, String(day).padStart(2, '0'));
  formattedString = formattedString.replace(/HH/g, String(hours).padStart(2, '0'));
  formattedString = formattedString.replace(/mm/g, String(minutes).padStart(2, '0'));
  formattedString = formattedString.replace(/ss/g, String(seconds).padStart(2, '0'));

  return formattedString;
}

/**
 * 日付文字列を指定されたフォーマットでDateオブジェクトにパースします。
 * JavaのSimpleDateFormatとは異なり、厳密なフォーマット解析は行いません。
 * 基本的な 'yyyy-MM-dd HH' や 'yyyy-MM-dd HH:mm:ss', 'yyyy-MM-dd' の形式を想定しています。
 * より複雑なパースや厳密なバリデーションが必要な場合は、date-fnsなどのライブラリの使用を検討してください。
 * @param dateStringOrDate 日付文字列またはDateオブジェクト
 * @param format フォーマット文字列 (主にパースのヒントとして)
 * @returns Dateオブジェクト
 * @throws Error パースに失敗した場合
 */
export function parseDate(dateStringOrDate: string | Date, format: string): Date {
  console.log('--- PARSEDATE CALLED ---');
  console.log('--- Input value:', dateStringOrDate, 'Type:', typeof dateStringOrDate, 'Format:', format);

  if (dateStringOrDate instanceof Date) {
    console.log('--- PARSEDATE: Input is a Date object. Returning it directly.');
    return dateStringOrDate; // Dateオブジェクトならそのまま返す
  }

  // ここに来るということは、dateStringOrDate は Dateオブジェクトではなかった。
  // 文字列であることを期待するが、念のためチェック。
  if (typeof dateStringOrDate !== 'string') {
    console.error('--- PARSEDATE ERROR: Input is not a string and not a Date object. Value:', dateStringOrDate);
    throw new Error(`parseDate expects a string or Date, but got ${typeof dateStringOrDate}`);
  }

  // これ以降、dateStringOrDate は string 型として扱える。変数名を dateString に変更。
  const dateString = dateStringOrDate;
  console.log('--- PARSEDATE: Processing as string:', dateString);

  let year = 0, month = 0, day = 1, hours = 0, minutes = 0, seconds = 0;

  if (format.includes('yyyy-MM-dd')) {
    if (!dateString) { // nullや空文字チェック
        console.error('--- PARSEDATE ERROR: dateString is null or empty for yyyy-MM-dd format.');
        throw new Error(`Invalid date string for yyyy-MM-dd: received null, undefined or empty`);
    }
    // dateStringが確実に文字列なので .split が使える
    const datePart = dateString.split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length >= 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      console.error('--- PARSEDATE ERROR: Invalid date string format for yyyy-MM-dd:', dateString);
      throw new Error(`Invalid date string format for yyyy-MM-dd: ${dateString}`);
    }
  }

  // HH (時刻部分のパース)
  if (format.includes('HH')) {
    if (!dateString) {
        console.error('--- PARSEDATE ERROR: dateString is null or empty when HH format is expected.');
        throw new Error(`Invalid date string for HH format: received null, undefined or empty`);
    }
    // NOTE: 元のコードの timePartMatch を利用したロジックは dateString が前提
    const timePartMatch = dateString.match(/(\d{1,2})(:\d{1,2})?(:\d{1,2})?/);
    if (timePartMatch) {
        if (format === 'yyyy-MM-dd HH' && dateString.includes(' ')) {
            const parts = dateString.split(' ');
            if (parts.length === 2) {
                hours = parseInt(parts[1], 10);
            } else {
                 console.error('--- PARSEDATE ERROR: Invalid date string format for HH (expected 2 parts after split by space):', dateString);
                 throw new Error(`Invalid date string format for HH: ${dateString}`);
            }
        } else if (format.includes('HH:mm:ss') && dateString.includes(' ')) {
            const timePart = dateString.split(' ')[1];
            if (timePart) {
                const timeParts = timePart.split(':');
                if (timeParts.length >= 1) hours = parseInt(timeParts[0], 10);
                if (timeParts.length >= 2) minutes = parseInt(timeParts[1], 10);
                if (timeParts.length >= 3) seconds = parseInt(timeParts[2], 10);
            } else {
                console.error('--- PARSEDATE ERROR: Invalid date string format for HH:mm:ss (no time part after space):', dateString);
                throw new Error(`Invalid date string format for HH:mm:ss: ${dateString}`);
            }
        } else if (format === 'HH' && !dateString.includes('-') && !dateString.includes(' ')) {
            hours = parseInt(dateString, 10);
        }
        // Consider if other 'HH' containing formats need specific handling if not yyyy-MM-dd HH or HH:mm:ss
    } else if (format.includes('HH') && (format.includes('yyyy-MM-dd') || format.length === 2) ) {
        // Only throw if we expect a time part based on format but regex fails
        console.error('--- PARSEDATE ERROR: Invalid date string format for time part (regex failed):', dateString);
        throw new Error(`Invalid date string format for time part: ${dateString}`);
    }
  }

  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    console.error('--- PARSEDATE ERROR: Resulted in NaN. Input:', dateString, 'Parsed:', {year, month, day, hours, minutes, seconds});
    throw new Error(`Failed to parse date string: ${dateString} with format ${format}`);
  }

  const parsed = new Date(year, month, day, hours, minutes, seconds);
  console.log('--- PARSEDATE: Successfully parsed to Date object:', parsed);

  // 簡単なバリデーション: パース後の値が元の数値と一致するか
  // (例: "2023-13-01" のような不正な月はDateオブジェクトが自動調整してしまうため、それを検知するのは難しい)
  if (parsed.getFullYear() !== year && year !== 0) {
      if (!(format === "HH" && year === 0 && month === 0 && day ===1)) {
            console.error(`--- PARSEDATE VALIDATION ERROR: Year mismatch. Original: ${year}, Parsed: ${parsed.getFullYear()}, DateString: ${dateString}`);
            throw new Error(`Date parsing resulted in year mismatch: ${dateString} (parsed: ${parsed.getFullYear()}, expected: ${year})`);
      }
  }
  if (parsed.getMonth() !== month && month !== 0) { // month は 0-indexed
      if (!(format === "HH" && year === 0 && month === 0 && day ===1)) {
          console.error(`--- PARSEDATE VALIDATION ERROR: Month mismatch. Original (0-indexed): ${month}, Parsed (0-indexed): ${parsed.getMonth()}, DateString: ${dateString}`);

          throw new Error(`Date parsing resulted in month mismatch: ${dateString} (parsed: ${parsed.getMonth()}, expected: ${month})`);
      }
  }

  return parsed;
}


/**
 * Dateオブジェクトの特定の部分（年、月、日など）を設定します。
 * Calendar.set(field, value) の簡易版。
 * @param date 元のDateオブジェクト
 * @param field 'year' | 'month' | 'day' | 'hours' | 'minutes' | 'seconds'
 * @param value 設定する値 (monthの場合、1-12で指定し、内部で0-11に調整)
 * @returns 新しいDateオブジェクト
 */
export function setDatePart(date: Date, field: 'year' | 'month' | 'day' | 'hours' | 'minutes' | 'seconds', value: number): Date {
  const newDate = new Date(date.getTime());
  switch (field) {
    case 'year':
      newDate.setFullYear(value);
      break;
    case 'month':
      newDate.setMonth(value - 1); // 内部的には0-11で月を扱う
      break;
    case 'day':
      newDate.setDate(value);
      break;
    case 'hours':
      newDate.setHours(value);
      break;
    case 'minutes':
      newDate.setMinutes(value);
      break;
    case 'seconds':
      newDate.setSeconds(value);
      break;
  }
  return newDate;
}

/**
 * Dateオブジェクトに指定された単位の時間を加算します。
 * Calendar.add(field, amount) の簡易版。
 * @param date 元のDateオブジェクト
 * @param field 'year' | 'month' | 'day' | 'hours' | 'minutes' | 'seconds'
 * @param amount 加算する量 (負の値を指定すると減算)
 * @returns 新しいDateオブジェクト
 */
export function addDate(date: Date, field: 'year' | 'month' | 'day' | 'hours' | 'minutes' | 'seconds', amount: number): Date {
  const newDate = new Date(date.getTime());
  switch (field) {
    case 'year':
      newDate.setFullYear(newDate.getFullYear() + amount);
      break;
    case 'month':
      newDate.setMonth(newDate.getMonth() + amount);
      break;
    case 'day':
      newDate.setDate(newDate.getDate() + amount);
      break;
    case 'hours':
      newDate.setHours(newDate.getHours() + amount);
      break;
    case 'minutes':
      newDate.setMinutes(newDate.getMinutes() + amount);
      break;
    case 'seconds':
      newDate.setSeconds(newDate.getSeconds() + amount);
      break;
  }
  return newDate;
}

// --- 使用例 ---
/*
const now = new Date();
console.log("Current Date:", now);

// formatDate
console.log("yyyy-MM-dd HH:mm:ss:", formatDate(now, "yyyy-MM-dd HH:mm:ss"));
console.log("yyyy-MM-dd:", formatDate(now, "yyyy-MM-dd"));
console.log("HH:", formatDate(now, "HH"));

// parseDate
try {
  const dateStr1 = "2023-05-19 10";
  const parsedDate1 = parseDate(dateStr1, "yyyy-MM-dd HH");
  console.log(`Parsed "${dateStr1}" (yyyy-MM-dd HH):`, parsedDate1, formatDate(parsedDate1, "yyyy-MM-dd HH:mm:ss"));

  const dateStr2 = "2023-12-25 14:30:15";
  const parsedDate2 = parseDate(dateStr2, "yyyy-MM-dd HH:mm:ss");
  console.log(`Parsed "${dateStr2}" (yyyy-MM-dd HH:mm:ss):`, parsedDate2, formatDate(parsedDate2, "yyyy-MM-dd HH:mm:ss"));

  const dateStr3 = "2024-01-01";
  const parsedDate3 = parseDate(dateStr3, "yyyy-MM-dd");
  console.log(`Parsed "${dateStr3}" (yyyy-MM-dd):`, parsedDate3, formatDate(parsedDate3, "yyyy-MM-dd HH:mm:ss"));

  const dateStr4 = "15";
  const parsedDate4 = parseDate(dateStr4, "HH");
  console.log(`Parsed "${dateStr4}" (HH):`, parsedDate4, formatDate(parsedDate4, "yyyy-MM-dd HH:mm:ss"));


} catch (e: any) {
  console.error("Error parsing date:", e.message);
}

// setDatePart
let dateToModify = new Date(2023, 0, 15, 10, 30, 0); // 2023-01-15 10:30:00
console.log("Original for setDatePart:", formatDate(dateToModify, "yyyy-MM-dd HH:mm:ss"));
dateToModify = setDatePart(dateToModify, 'year', 2024);
console.log("Set year to 2024:", formatDate(dateToModify, "yyyy-MM-dd HH:mm:ss"));
dateToModify = setDatePart(dateToModify, 'month', 5); // May
console.log("Set month to May (5):", formatDate(dateToModify, "yyyy-MM-dd HH:mm:ss"));
dateToModify = setDatePart(dateToModify, 'day', 20);
console.log("Set day to 20:", formatDate(dateToModify, "yyyy-MM-dd HH:mm:ss"));
dateToModify = setDatePart(dateToModify, 'hours', 0);
console.log("Set hours to 00:", formatDate(dateToModify, "yyyy-MM-dd HH:mm:ss"));


// addDate
let dateToAdd = new Date(2023, 4, 19, 12, 0, 0); // 2023-05-19 12:00:00 (Java Calendar month is 0-indexed, so 4 is May)
console.log("Original for addDate:", formatDate(dateToAdd, "yyyy-MM-dd HH:mm:ss"));
dateToAdd = addDate(dateToAdd, 'day', 1);
console.log("Add 1 day:", formatDate(dateToAdd, "yyyy-MM-dd HH:mm:ss"));
dateToAdd = addDate(dateToAdd, 'month', -1);
console.log("Subtract 1 month:", formatDate(dateToAdd, "yyyy-MM-dd HH:mm:ss"));
dateToAdd = addDate(dateToAdd, 'year', 2);
console.log("Add 2 years:", formatDate(dateToAdd, "yyyy-MM-dd HH:mm:ss"));

// Calendar.set(2023, 4, 19) -> month is 0-indexed in Java Calendar, so 4 means May.
// In JavaScript Date, month is also 0-indexed.
// Our setDatePart('month', 5) means May.
let beginDate = new Date();
beginDate = setDatePart(beginDate, 'year', 2023);
beginDate = setDatePart(beginDate, 'month', 5); // May
beginDate = setDatePart(beginDate, 'day', 19);
beginDate = setDatePart(beginDate, 'hours', 0);
beginDate = setDatePart(beginDate, 'minutes', 0);
beginDate = setDatePart(beginDate, 'seconds', 0);
beginDate.setMilliseconds(0);
console.log("beginDate (2023, May, 19):", formatDate(beginDate, "yyyy-MM-dd HH:mm:ss"));

let newBeginDate = new Date(2023, 4, 19); // Month is 0-indexed (4 = May)
console.log("newBeginDate (2023, May, 19) direct init:", formatDate(newBeginDate, "yyyy-MM-dd HH:mm:ss"));

const testDate = new Date(2023, 4 - 1, 19); // Javaの月は-1して入れる仕様の再現
console.log("Test Java-like month init (2023, April, 19):", formatDate(testDate, "yyyy-MM-dd HH:mm:ss"));

*/
