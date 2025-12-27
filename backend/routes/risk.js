/**
 * ===================================
 * 风险评估路由
 * ===================================
 * 提供风险评分相关的 API 接口
 */

const express = require('express');
const router = express.Router();
const marketDataService = require('../services/marketDataService');
const { calculateRiskScore } = require('../services/riskService');

/**
 * GET /api/risk/score
 *
 * 获取单只股票的风险评分
 *
 * 参数：
 * - symbol: 股票代码 (如 600000, sh600000, sz000001)
 *
 * 返回：
 * {
 *   symbol: "sh600000",
 *   overall: { score: 45, level: "medium", levelText: "中风险" },
 *   indicators: {
 *     volatility: { score: 30, ... },
 *     maxDrawdown: { score: 55, ... },
 *     anomaly: { score: 40, ... }
 *   },
 *   advice: "...",
 *   timestamp: "..."
 * }
 */
router.get('/score', async (req, res) => {
    try {
        const { symbol } = req.query;

        // 参数校验
        if (!symbol) {
            return res.status(400).json({
                error: '缺少必要参数 symbol',
                example: '/api/risk/score?symbol=600000'
            });
        }

        // 标准化股票代码
        const normalizedSymbol = marketDataService.normalizeSymbol(symbol);

        // 获取K线数据
        const klineData = await marketDataService.getKLineData(normalizedSymbol);

        if (!klineData || klineData.length < 5) {
            return res.status(400).json({
                error: '数据不足，无法计算风险评分',
                symbol: normalizedSymbol,
                dataPoints: klineData ? klineData.length : 0
            });
        }

        // 提取收盘价
        const closes = klineData.map(k => k.close);

        // 计算风险评分
        const riskResult = calculateRiskScore(closes, {
            symbol: normalizedSymbol,
            volatilityPeriod: 20,
            shortPeriod: 3
        });

        res.json({
            success: true,
            data: riskResult
        });

    } catch (error) {
        console.error('计算风险评分失败:', error.message);
        res.status(500).json({
            error: '计算风险评分失败',
            message: error.message
        });
    }
});

/**
 * GET /api/risk/score/batch
 *
 * 批量获取多只股票的风险评分
 *
 * 参数：
 * - symbols: 股票代码列表，逗号分隔 (如 600000,000001,600519)
 *
 * 返回：
 * {
 *   success: true,
 *   data: [
 *     { symbol: "sh600000", overall: {...}, ... },
 *     { symbol: "sz000001", overall: {...}, ... }
 *   ]
 * }
 */
router.get('/score/batch', async (req, res) => {
    try {
        const { symbols } = req.query;

        if (!symbols) {
            return res.status(400).json({
                error: '缺少必要参数 symbols',
                example: '/api/risk/score/batch?symbols=600000,000001'
            });
        }

        // 解析股票列表
        const symbolList = symbols.split(',').map(s => s.trim()).filter(s => s);

        if (symbolList.length === 0) {
            return res.status(400).json({
                error: '股票代码列表为空'
            });
        }

        // 限制批量数量
        if (symbolList.length > 20) {
            return res.status(400).json({
                error: '批量查询最多支持20只股票',
                provided: symbolList.length
            });
        }

        // 并行计算风险评分
        const results = await Promise.all(
            symbolList.map(async (symbol) => {
                try {
                    const normalizedSymbol = marketDataService.normalizeSymbol(symbol);
                    const klineData = await marketDataService.getKLineData(normalizedSymbol);

                    if (!klineData || klineData.length < 5) {
                        return {
                            symbol: normalizedSymbol,
                            error: '数据不足'
                        };
                    }

                    const closes = klineData.map(k => k.close);
                    const riskResult = calculateRiskScore(closes, {
                        symbol: normalizedSymbol
                    });

                    return riskResult;

                } catch (error) {
                    return {
                        symbol: symbol,
                        error: error.message
                    };
                }
            })
        );

        res.json({
            success: true,
            data: results,
            count: results.length
        });

    } catch (error) {
        console.error('批量计算风险评分失败:', error.message);
        res.status(500).json({
            error: '批量计算风险评分失败',
            message: error.message
        });
    }
});

/**
 * GET /api/risk/indicators/volatility
 *
 * 单独获取波动率风险指标
 */
router.get('/indicators/volatility', async (req, res) => {
    try {
        const { symbol, period = 20 } = req.query;

        if (!symbol) {
            return res.status(400).json({
                error: '缺少必要参数 symbol'
            });
        }

        const normalizedSymbol = marketDataService.normalizeSymbol(symbol);
        const klineData = await marketDataService.getKLineData(normalizedSymbol);
        const closes = klineData.map(k => k.close);

        const { calculateVolatilityRisk } = require('../services/riskService');
        const result = calculateVolatilityRisk(closes, parseInt(period));

        res.json({
            success: true,
            symbol: normalizedSymbol,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            error: '计算波动率风险失败',
            message: error.message
        });
    }
});

/**
 * GET /api/risk/indicators/drawdown
 *
 * 单独获取最大回撤风险指标
 */
router.get('/indicators/drawdown', async (req, res) => {
    try {
        const { symbol } = req.query;

        if (!symbol) {
            return res.status(400).json({
                error: '缺少必要参数 symbol'
            });
        }

        const normalizedSymbol = marketDataService.normalizeSymbol(symbol);
        const klineData = await marketDataService.getKLineData(normalizedSymbol);
        const closes = klineData.map(k => k.close);

        const { calculateMaxDrawdownRisk } = require('../services/riskService');
        const result = calculateMaxDrawdownRisk(closes);

        res.json({
            success: true,
            symbol: normalizedSymbol,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            error: '计算最大回撤失败',
            message: error.message
        });
    }
});

/**
 * GET /api/risk/indicators/anomaly
 *
 * 单独获取异常波动风险指标
 */
router.get('/indicators/anomaly', async (req, res) => {
    try {
        const { symbol, shortPeriod = 3 } = req.query;

        if (!symbol) {
            return res.status(400).json({
                error: '缺少必要参数 symbol'
            });
        }

        const normalizedSymbol = marketDataService.normalizeSymbol(symbol);
        const klineData = await marketDataService.getKLineData(normalizedSymbol);
        const closes = klineData.map(k => k.close);

        const { calculateAnomalyRisk } = require('../services/riskService');
        const result = calculateAnomalyRisk(closes, parseInt(shortPeriod));

        res.json({
            success: true,
            symbol: normalizedSymbol,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            error: '计算异常波动失败',
            message: error.message
        });
    }
});

module.exports = router;
