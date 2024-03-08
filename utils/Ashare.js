const axios = require('axios');
const moment = require('moment');
const { DataFrame } = require('dataframe-js'); // DataFrame 库可以从 npm 安装

// 腾讯日线
async function get_price_day_tx(code, end_date = '', count = 10, frequency = '1d') {
    const unit = frequency === '1w' ? 'week' : frequency === '1M' ? 'month' : 'day';
    end_date = end_date ? moment(end_date).format('YYYY-MM-DD') : '';
    const URL = `http://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},${unit},,${end_date},${count},qfq`;
    try {
        const response = await axios.get(URL);
        const data = response.data;
        const ms = `qfq${unit}`;
        const stk = data.data[code];
        const buf = stk[ms] ? stk[ms] : stk[unit];
        const df = new DataFrame(buf, [
            'time', 'open', 'close', 'high', 'low', 'volume'
        ]);
        df.map((row) => {
            row.set('time', moment(row.get('time')).toDate());
        });
        return df;
    } catch (error) {
        console.error('Error fetching price data:', error);
        return null;
    }
}

// 腾讯分钟线
async function get_price_min_tx(code, end_date = null, count = 10, frequency = '1d') {
    const ts = parseInt(frequency.slice(0, -1)) || 1;
    end_date = end_date ? moment(end_date).format('YYYY-MM-DD') : '';
    const URL = `http://ifzq.gtimg.cn/appstock/app/kline/mkline?param=${code},m${ts},,${count}`;
    try {
        const response = await axios.get(URL);
        const data = response.data;
        const buf = data.data[code]['m' + ts];
        const df = new DataFrame(buf, [
            'time', 'open', 'close', 'high', 'low', 'volume', 'n1', 'n2'
        ]).select('time', 'open', 'close', 'high', 'low', 'volume');
        df.map((row) => {
            row.set('time', moment(row.get('time')).toDate());
        });
        df.last('close', parseFloat(data.data[code].qt[code][3]));
        return df;
    } catch (error) {
        console.error('Error fetching price data:', error);
        return null;
    }
}

// sina新浪全周期获取函数
async function get_price_sina(code, end_date = '', count = 10, frequency = '60m') {
    frequency = frequency.replace('1d', '240m').replace('1w', '1200m').replace('1M', '7200m');
    try {
        const response = await axios.get(`http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${code}&scale=${frequency}&ma=5&datalen=${count}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching price data:', error);
        return null;
    }
}

// 对外暴露唯一函数
async function get_price(code, end_date = '', count = 10, frequency = '1d') {
    let xcode = code.replace('.XSHG', '').replace('.XSHE', '');
    xcode = ('sh' + xcode) || ('sz' + xcode) || code;

    if (['1d', '1w', '1M'].includes(frequency)) {
        try {
            return await get_price_sina(xcode, end_date, count, frequency);
        } catch {
            return await get_price_day_tx(xcode, end_date, count, frequency);
        }
    }

    if (['1m', '5m', '15m', '30m', '60m'].includes(frequency)) {
        if (frequency === '1m') {
            return await get_price_min_tx(xcode, end_date, count, frequency);
        }
        try {
            return await get_price_sina(xcode, end_date, count, frequency);
        } catch {
            return await get_price_min_tx(xcode, end_date, count, frequency);
        }
    }
}

// 示例用法
async function main() {
    const df_day = await get_price('sh000001', undefined, 10, '1d');
    console.log('上证指数日线行情\n', df_day);

    const df_min = await get_price('000001.XSHG', undefined, 1000, '15m');
    console.log('上证指数分钟线\n', df_min);
}

main();

module.exports = {
    get_price
}

