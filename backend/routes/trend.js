/**
 * ===================================
 * 趋势分析 API 路由
 * ===================================
 */

const express = require('express');
const router = express.Router();
const dataService = require('../services/dataService');
const indicators = require('../services/indicators');

/**
 * GET /api/trend/trend-score
 * 获取股票趋势强度评分
 *
 * 参数:
 * - symbol: 股票代码 (如 600000, 000001)
 * - short: 短期周期 (可选，默认5)
 * - long: 长期周期 (可选，默认20)
 *
 * 示例: /api/trend/trend-score?symbol=600000
 */
router.get('/trend-score', async (req, res) => {
    try {
        const { symbol, short, long } = req.query;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: '请提供股票代码 symbol'
            });
        }

        // 标准化股票代码
        const normalizedSymbol = dataService.normalizeSymbol(symbol);

        console.log(`\n[趋势分析] ${symbol} -> ${normalizedSymbol}`);

        // 获取K线数据
        const klineData = await dataService.getKLineData(normalizedSymbol);

        if (!klineData || klineData.length < 20) {
            return res.status(400).json({
                success: false,
                error: '数据不足，至少需要20个交易日数据'
            });
        }

        // 提取收盘价
        const closes = klineData.map(k => k.close);

        // 计算趋势评分
        const result = indicators.calculateTrendScore(closes, {
            symbol: normalizedSymbol,
            shortPeriod: parseInt(short) || 5,
            longPeriod: parseInt(long) || 20
        });

        // 添加股票信息
        result.symbol = normalizedSymbol;
        result.dataPoints = klineData.length;
        result.latestPrice = closes[closes.length - 1];
        result.latestDate = klineData[klineData.length - 1].date;

        console.log(`[趋势分析] 完成: 评分 ${result.overall.score}, ${result.overall.trendText}`);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[趋势分析错误]', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/trend/trend-score/batch
 * 批量获取多只股票的趋势评分
 *
 * 参数:
 * - symbols: 股票代码列表，逗号分隔 (如 "600000,000001,600519")
 * - short: 短期周期 (可选，默认5)
 * - long: 长期周期 (可选，默认20)
 *
 * 示例: /api/trend/trend-score/batch?symbols=600000,000001,600519
 */
router.get('/trend-score/batch', async (req, res) => {
    try {
        const { symbols, short, long } = req.query;

        if (!symbols) {
            return res.status(400).json({
                success: false,
                error: '请提供股票代码 symbols 参数，用逗号分隔'
            });
        }

        // 解析股票代码列表
        const symbolList = symbols.split(',').map(s => s.trim()).filter(s => s);

        if (symbolList.length === 0) {
            return res.status(400).json({
                success: false,
                error: '股票代码列表为空'
            });
        }

        if (symbolList.length > 20) {
            return res.status(400).json({
                success: false,
                error: '单次最多查询20只股票'
            });
        }

        console.log(`\n[批量趋势分析] 股票数量: ${symbolList.length}`);

        const shortPeriod = parseInt(short) || 5;
        const longPeriod = parseInt(long) || 20;

        // 并行获取所有股票的趋势评分
        const results = await Promise.allSettled(
            symbolList.map(async (symbol) => {
                try {
                    const normalizedSymbol = dataService.normalizeSymbol(symbol);

                    // 获取K线数据
                    const klineData = await dataService.getKLineData(normalizedSymbol);

                    if (!klineData || klineData.length < 20) {
                        return {
                            symbol: normalizedSymbol,
                            success: false,
                            error: '数据不足'
                        };
                    }

                    // 提取收盘价
                    const closes = klineData.map(k => k.close);

                    // 计算趋势评分
                    const result = indicators.calculateTrendScore(closes, {
                        symbol: normalizedSymbol,
                        shortPeriod: shortPeriod,
                        longPeriod: longPeriod
                    });

                    // 添加股票信息
                    result.symbol = normalizedSymbol;
                    result.dataPoints = klineData.length;
                    result.latestPrice = closes[closes.length - 1];
                    result.latestDate = klineData[klineData.length - 1].date;

                    return {
                        success: true,
                        data: result
                    };

                } catch (error) {
                    return {
                        symbol: symbol,
                        success: false,
                        error: error.message
                    };
                }
            })
        );

        // 统计结果
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failCount = results.filter(r => r.status === 'rejected' || !r.value.success).length;

        console.log(`[批量趋势分析] 完成: 成功 ${successCount}, 失败 ${failCount}`);

        res.json({
            success: true,
            data: {
                total: symbolList.length,
                success: successCount,
                failed: failCount,
                results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: '请求失败' })
            }
        });

    } catch (error) {
        console.error('[批量趋势分析错误]', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
