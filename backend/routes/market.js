/**
 * ===================================
 * 市场数据 API 路由
 * ===================================
 * 接入新浪财经公开数据源
 */

const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');

/**
 * GET /api/market-data
 * 获取股票K线数据（日线）
 *
 * 参数:
 * - symbol: 股票代码 (如 600000, 000001, sh600000, sz000001)
 * - limit: 返回条数 (可选，默认全部)
 *
 * 示例: /api/market-data?symbol=600000&limit=30
 */
router.get('/market-data', async (req, res) => {
    try {
        const { symbol, limit } = req.query;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: '请提供股票代码 symbol'
            });
        }

        // 标准化股票代码
        const normalizedSymbol = dataService.normalizeSymbol(symbol);

        console.log(`\n[K线请求] ${symbol} -> ${normalizedSymbol}`);

        // 获取K线数据
        const klineData = await dataService.getKLineData(normalizedSymbol);

        // 限制返回条数
        let result = klineData;
        if (limit) {
            result = klineData.slice(-parseInt(limit));
        }

        res.json({
            success: true,
            data: {
                symbol: normalizedSymbol,
                count: result.length,
                kline: result
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[K线错误]', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/market/quote
 * 获取实时行情
 *
 * 参数:
 * - symbol: 股票代码
 *
 * 示例: /api/market/quote?symbol=600000
 */
router.get('/market/quote', async (req, res) => {
    try {
        const { symbol } = req.query;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: '请提供股票代码 symbol'
            });
        }

        const normalizedSymbol = dataService.normalizeSymbol(symbol);
        console.log(`\n[行情请求] ${symbol} -> ${normalizedSymbol}`);

        // 获取实时行情
        const quote = await dataService.getRealtimeQuote(normalizedSymbol);

        res.json({
            success: true,
            data: quote,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[行情错误]', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/market/data
 * 兼容旧接口，转发到 market-data
 */
router.get('/data', async (req, res) => {
    req.url = '/market-data?' + new URLSearchParams(req.query);
    router.handle(req, res);
});

module.exports = router;
