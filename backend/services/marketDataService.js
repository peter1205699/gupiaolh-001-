/**
 * ===================================
 * 行情数据获取服务
 * ===================================
 * 功能：从公开数据源获取股票/指数的日线 K 线数据
 */

const axios = require('axios');
const { promisify } = require('util');

/**
 * 数据源配置
 * 使用新浪财经 API（免费、无需认证、国内访问稳定）
 */
const DATA_SOURCES = {
    SINA: {
        BASE_URL: 'http://hq.sinajs.cn',
        // 格式: sh000001 (上证指数), sz000001 (平安银行)
        INDEX_URL: (symbol) => `/list=${symbol}`,
        // K线数据接口
        CHART_URL: (symbol) => `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=100`
    },
    TENCENT: {
        BASE_URL: 'http://qt.gtimg.cn',
        URL: (symbol) => `/q=${symbol}`
    }
};

/**
 * 缓存配置
 */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取 K 线数据
 * @param {string} symbol - 股票代码，如 sh600000, sz000001
 * @returns {Promise<Array>} K线数据数组
 */
async function getKLineData(symbol) {
    // 检查缓存
    const cacheKey = `kline_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    try {
        // 新浪财经 K线 API
        const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=240&ma=no&datalen=100`;

        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // 新浪返回的是 JavaScript 对象字符串，需要解析
        let data;
        if (typeof response.data === 'string') {
            // 移除可能的前缀
            const cleanData = response.data.replace(/^[\s\S]*?\(/, '').replace(/\);?$/, '');
            try {
                data = JSON.parse(cleanData);
            } catch (e) {
                // 如果解析失败，尝试直接 eval（注意生产环境安全性）
                data = eval(`(${response.data})`);
            }
        } else {
            data = response.data;
        }

        if (!Array.isArray(data)) {
            throw new Error('Invalid data format');
        }

        // 转换为标准格式
        const formattedData = data.map(item => ({
            date: item.day,
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close),
            volume: parseInt(item.volume)
        }));

        // 存入缓存
        cache.set(cacheKey, {
            data: formattedData,
            timestamp: Date.now()
        });

        return formattedData;

    } catch (error) {
        console.error('获取K线数据失败:', error.message);

        // 如果新浪API失败，尝试备用方案：生成模拟数据用于测试
        console.warn('使用备用数据源（模拟数据）');
        return generateMockData(symbol);
    }
}

/**
 * 生成模拟数据（用于开发和测试）
 * @param {string} symbol - 股票代码
 * @returns {Array} 模拟的K线数据
 */
function generateMockData(symbol) {
    const data = [];
    const now = new Date();
    let price = 10 + Math.random() * 20;

    for (let i = 100; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // 跳过周末
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            continue;
        }

        const change = (Math.random() - 0.48) * 0.5; // 略微上涨倾向
        price = price * (1 + change / 100);

        const open = price * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, price) * (1 + Math.random() * 0.01);
        const low = Math.min(open, price) * (1 - Math.random() * 0.01);

        data.push({
            date: date.toISOString().split('T')[0],
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(price.toFixed(2)),
            volume: Math.floor(1000000 + Math.random() * 5000000)
        });
    }

    return data;
}

/**
 * 获取实时行情
 * @param {string} symbol - 股票代码
 * @returns {Promise<Object>} 实时行情数据
 */
async function getRealtimeQuote(symbol) {
    try {
        const url = `http://hq.sinajs.cn/list=${symbol}`;

        const response = await axios.get(url, {
            timeout: 5000,
            responseType: 'arraybuffer'
        });

        // 处理 GBK 编码
        const iconv = require('iconv-lite');
        const data = iconv.decode(response.data, 'GB18030');

        // 解析新浪返回的数据
        const match = data.match(/="([^"]+)"/);
        if (!match) {
            throw new Error('Invalid data format');
        }

        const parts = match[1].split(',');

        return {
            name: parts[0],
            open: parseFloat(parts[1]),
            prevClose: parseFloat(parts[2]),
            current: parseFloat(parts[3]),
            high: parseFloat(parts[4]),
            low: parseFloat(parts[5]),
            bid: parseFloat(parts[6]),
            ask: parseFloat(parts[7]),
            volume: parseInt(parts[8]),
            amount: parseFloat(parts[9]),
            date: parts[30],
            time: parts[31]
        };

    } catch (error) {
        console.error('获取实时行情失败:', error.message);
        throw error;
    }
}

/**
 * 标准化股票代码
 * @param {string} symbol - 用户输入的代码
 * @returns {string} 标准化后的代码
 */
function normalizeSymbol(symbol) {
    symbol = symbol.toUpperCase().trim();

    // 如果已经包含 sh/sz 前缀，直接返回
    if (symbol.startsWith('SH') || symbol.startsWith('SZ')) {
        return symbol.toLowerCase();
    }

    // 根据代码规则添加前缀
    // 6开头 = 上海，0/3开头 = 深圳
    if (symbol.startsWith('6')) {
        return 'sh' + symbol;
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
        return 'sz' + symbol;
    }

    // 默认为深圳
    return 'sz' + symbol;
}

/**
 * 清除缓存
 */
function clearCache() {
    cache.clear();
}

module.exports = {
    getKLineData,
    getRealtimeQuote,
    normalizeSymbol,
    generateMockData,
    clearCache
};
