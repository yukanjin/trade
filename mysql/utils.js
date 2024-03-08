const axios = require('axios')
const { get_price } = require('../utils/Ashare')
const dbConnection = require('./index')

const juheKey = 'b16e800142c3bd16a17bac98b5e48d12'
// 查询并存储股票数据
async function fetchAndStoreStockData(stockCode, step, count) {
    try {
        // 查询接口获取股票数据
        //   const response = await axios.get(`http://web.juhe.cn/finance/stock/hs?key=${juheKey}&gid=${stockCode}`);
          const response = await axios.get(`http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${stockCode}&scale=${step}&ma=15&datalen=${count}`);
        //   const response = await axios.get(`https://api.biyingapi.com/hszbl/fsjy/${stockCode}/1d/biyinglicence`);
        
        // const response = await get_price(stockCode)
        const stockData = response.data;

        // 创建股票数据表
        console.log('开始创建数据库表')
        await createStockTableIfNotExists(stockCode);
        console.log('数据库表创建成功')

        // 将股票数据插入数据库表中
        await insertStockData(stockCode, stockData);

        console.log(`Stock data for ${stockCode} stored successfully.`);
    } catch (error) {
        console.error('Error fetching and storing stock data:', error);
    }
}

// 创建股票数据表（如果不存在）
async function createStockTableIfNotExists(stockCode) {
    const tableName = `stock_${stockCode}`;
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (
      id INT AUTO_INCREMENT PRIMARY KEY,
      day VARCHAR(20),
      high DECIMAL(10,3),
      low DECIMAL(10,3),
      open DECIMAL(10,3),
      close DECIMAL(10,3),
      ma55 DECIMAL(10, 2)
    )`;

    // 创建触发器
    const createTriggerQuery = `
    CREATE TRIGGER calculate_ma55_trigger BEFORE INSERT ON ${tableName}
    FOR EACH ROW
    BEGIN
        DECLARE avg_close DECIMAL(10, 2);
    
        -- 计算最近 55 行 close 列的平均值
        SELECT AVG(close) INTO avg_close
        FROM (
            SELECT close
            FROM ${tableName}
            ORDER BY id DESC
            LIMIT 55
        ) AS recent_data;
    
        -- 将平均值赋值给 ma55 列
        SET NEW.ma55 = avg_close;
    END`;

    await executeQuery(createTableQuery);
    try {
        await executeQuery(createTriggerQuery);
    } catch(e) {
        
    }
}

// 执行 SQL 查询
function executeQuery(query, params = null) {
    return new Promise((resolve, reject) => {
        dbConnection.query(query, params,(error, results, fields) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

// 将股票数据插入数据库表中
async function insertStockData(stockCode, data) {
    const tableName = `stock_${stockCode}`;
    const insertQuery = `INSERT INTO ${tableName} (day, open, close, high, low) VALUES (?,?,?,?,?)`;

    // 将数据插入数据库表中
    // 替换 column1、column2、... 为实际的列名，将 data 中的数据作为参数传递给 insertQuery
    console.log(data)
    for (let i=0;i<data.length;i++) {
        const ele = data[i]
        await executeQuery(insertQuery, [ele.day, ele.open, ele.close, ele.high, ele.low]);
    }

}

// 调用函数获取并存储股票数据
// fetchAndStoreStockData('sh000001', '240', '1000');
module.exports = {
    fetchAndStoreStockData
}
