/**
 * ===================================
 * 行情数据服务
 * ===================================
 * 接入新浪财经公开 API（免费、无需认证、国内稳定）
 */

const axios = require('axios');

/**
 * 数据缓存（5分钟）
 */
const cache = new Map();
const CACHE_TIME = 5 * 60 * 1000;

/**
 * 获取K线数据
 * @param {string} symbol 股票代码，如 sh600000, sz000001
 * @returns {Promise<Array>} K线数据
 */
async function getKLineData(symbol) {
    // 检查缓存
    const cacheKey = `kline_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.time < CACHE_TIME) {
        console.log(`[缓存命中] ${symbol}`);
        return cached.data;
    }

    try {
        // 新浪财经K线接口
        const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=100`;

        console.log(`[请求] ${url}`);

        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // 解析数据
        let data;
        const str = response.data;

        // 新浪返回的格式：[{day:"2024-01-01",open:"10.5",...}]
        if (typeof str === 'string') {
            // 去掉可能的前缀（如函数调用格式）
            const cleanStr = str.replace(/^[\s\S]*?\(/, '').replace(/\);?$/, '');
            data = JSON.parse(cleanStr);
        } else {
            data = str;
        }

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('无数据');
        }

        // 转换为标准格式
        const result = data.map(item => ({
            date: item.day,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume)
        }));

        // 存入缓存
        cache.set(cacheKey, {
            data: result,
            time: Date.now()
        });

        console.log(`[成功] ${symbol}, 获取 ${result.length} 条数据`);
        return result;

    } catch (error) {
        console.error(`[失败] ${symbol}:`, error.message);
        // 返回模拟数据
        return getMockData(symbol);
    }
}

/**
 * 获取实时行情
 * @param {string} symbol 股票代码
 * @returns {Promise<Object>} 实时行情
 */
async function getRealtimeQuote(symbol) {
    try {
        // 新浪财经实时行情接口
        const url = `http://hq.sinajs.cn/list=${symbol}`;

        const response = await axios.get(url, {
            timeout: 5000,
            responseType: 'arraybuffer'
        });

        // 解析GBK编码（新浪使用GBK）
        const iconv = require('iconv-lite');
        const data = iconv.decode(response.data, 'GB18030');

        // 提取数据，格式：var hq_str_sh600000="浦发银行,7.89,7.88,..."
        const match = data.match(/="([^"]+)"/);
        if (!match) {
            throw new Error('数据解析失败');
        }

        const parts = match[1].split(',');

        // 计算涨跌
        const price = parseFloat(parts[3]);
        const prevClose = parseFloat(parts[2]);
        const change = price - prevClose;
        const changePercent = (change / prevClose) * 100;

        return {
            name: parts[0],
            code: symbol.replace(/^(sh|sz)/, ''),
            open: parseFloat(parts[1]),
            prevClose: prevClose,
            price: price,
            high: parseFloat(parts[4]),
            low: parseFloat(parts[5]),
            bid: parseFloat(parts[6]),
            ask: parseFloat(parts[7]),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            volume: parseInt(parts[8]),
            amount: parseFloat(parts[9]),
            date: parts[30],
            time: parts[31]
        };

    } catch (error) {
        console.error('[实时行情失败]:', error.message);
        return getMockQuote(symbol);
    }
}

/**
 * 标准化股票代码
 * @param {string} code 用户输入的代码
 * @returns {string} 标准化后的代码
 *
 * 示例：
 * 600000   -> sh600000 (上海)
 * 000001   -> sz000001 (深圳)
 * 300001   -> sz300001 (创业板)
 */
function normalizeSymbol(code) {
    code = code.toUpperCase().trim();

    // 已有前缀
    if (code.startsWith('SH') || code.startsWith('SZ')) {
        return code.toLowerCase();
    }

    // 规则：6开头=上海，0或3开头=深圳
    if (code.startsWith('6')) {
        return 'sh' + code;
    } else if (code.startsWith('0') || code.startsWith('3')) {
        return 'sz' + code;
    }

    // 默认深圳
    return 'sz' + code;
}

/**
 * 模拟K线数据（API失败时的备用方案）
 */
function getMockData(symbol) {
    console.log(`[模拟数据] ${symbol}`);
    const data = [];
    const now = new Date();
    let price = 10 + Math.random() * 20;

    for (let i = 100; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // 跳过周末
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        price = price * (1 + (Math.random() - 0.48) * 0.01);

        data.push({
            date: date.toISOString().split('T')[0],
            open: parseFloat((price * (1 + Math.random() * 0.005)).toFixed(2)),
            high: parseFloat((price * (1 + Math.random() * 0.01)).toFixed(2)),
            low: parseFloat((price * (1 - Math.random() * 0.01)).toFixed(2)),
            close: parseFloat(price.toFixed(2)),
            volume: Math.floor(1000000 + Math.random() * 5000000)
        });
    }

    return data;
}

/**
 * 模拟实时行情（API失败时的备用方案）
 */
function getMockQuote(symbol) {
    const price = 10 + Math.random() * 20;
    const change = (Math.random() - 0.5) * 2;
    const prevClose = price - change;

    return {
        name: '模拟数据',
        code: symbol.replace(/^(sh|sz)/, ''),
        open: prevClose,
        prevClose: prevClose,
        price: price,
        high: price * 1.01,
        low: price * 0.99,
        bid: price - 0.01,
        ask: price + 0.01,
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat((change / prevClose * 100).toFixed(2)),
        volume: Math.floor(Math.random() * 10000000),
        amount: Math.floor(Math.random() * 100000000),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0]
    };
}

/**
 * 清除缓存
 */
function clearCache() {
    cache.clear();
    console.log('[缓存已清除]');
}

// 导出模块
module.exports = {
    getKLineData,
    getRealtimeQuote,
    normalizeSymbol,
    clearCache
};
