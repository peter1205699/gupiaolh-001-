/**
 * ===================================
 * 技术指标计算模块
 * ===================================
 * 简单经典的量化分析方法（适合新手理解）
 */

/**
 * 计算移动平均线 (MA)
 * @param {Array} prices 价格数组
 * @param {number} period 周期
 * @returns {Array} MA数组
 */
function calculateMA(prices, period) {
    const result = [];

    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += prices[i - j];
            }
            result.push(sum / period);
        }
    }

    return result;
}

/**
 * 计算标准差
 * @param {Array} data 数据数组
 * @returns {number} 标准差
 */
function calculateStdDev(data) {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
}

/**
 * 1. 趋势方向评分 (0-100)
 * 基于短期均线 vs 长期均线的关系
 *
 * 逻辑：
 * - 短期均线在长期均线之上 → 看多
 * - 短期均线在长期均线之下 → 看空
 * - 均线间距越大，分数越极端
 */
function calculateTrendDirectionScore(closes, shortPeriod = 5, longPeriod = 20) {
    if (closes.length < longPeriod) {
        return { score: 50, signal: 'neutral', reason: '数据不足' };
    }

    // 计算均线
    const shortMA = calculateMA(closes, shortPeriod);
    const longMA = calculateMA(closes, longPeriod);

    // 获取最新值
    const currentShortMA = shortMA[shortMA.length - 1];
    const currentLongMA = longMA[longMA.length - 1];

    // 计算均线差异百分比
    const maDiffPercent = ((currentShortMA - currentLongMA) / currentLongMA) * 100;

    // 映射为 0-100 分
    // maDiff > 3% → 满分看多 (100分)
    // maDiff < -3% → 满分看空 (0分)
    // 中间线性映射
    let score = 50 + (maDiffPercent / 3) * 50;
    score = Math.max(0, Math.min(100, score));

    // 判断信号
    let signal = 'neutral';
    if (score > 60) signal = 'bullish';
    else if (score < 40) signal = 'bearish';

    return {
        score: Math.round(score),
        signal: signal,
        shortMA: parseFloat(currentShortMA.toFixed(2)),
        longMA: parseFloat(currentLongMA.toFixed(2)),
        maDifference: parseFloat(maDiffPercent.toFixed(2)),
        reason: getTrendReason(score, maDiffPercent)
    };
}

/**
 * 2. 动能评分 (0-100)
 * 基于近期价格涨跌幅
 *
 * 逻辑：
 * - 近期涨幅大 → 动能强
 * - 近期跌幅大 → 动能弱
 */
function calculateMomentumScore(closes, shortPeriod = 5, longPeriod = 20) {
    if (closes.length < longPeriod) {
        return { score: 50, signal: 'neutral', reason: '数据不足' };
    }

    const currentPrice = closes[closes.length - 1];

    // 短期动量 (最近N天涨跌幅)
    const shortMomentumPrice = closes[closes.length - shortPeriod];
    const shortMomentum = ((currentPrice - shortMomentumPrice) / shortMomentumPrice) * 100;

    // 长期动量
    const longMomentumPrice = closes[closes.length - longPeriod];
    const longMomentum = ((currentPrice - longMomentumPrice) / longMomentumPrice) * 100;

    // 综合评分 (短期权重60%，长期权重40%)
    // 短期涨5% → 100分，跌5% → 0分
    const shortScore = 50 + (shortMomentum / 5) * 50;
    // 长期涨10% → 100分，跌10% → 0分
    const longScore = 50 + (longMomentum / 10) * 50;

    let score = shortScore * 0.6 + longScore * 0.4;
    score = Math.max(0, Math.min(100, score));

    // 判断信号
    let signal = 'neutral';
    if (score > 60) signal = 'bullish';
    else if (score < 40) signal = 'bearish';

    return {
        score: Math.round(score),
        signal: signal,
        shortMomentum: parseFloat(shortMomentum.toFixed(2)),
        longMomentum: parseFloat(longMomentum.toFixed(2)),
        reason: getMomentumReason(score, shortMomentum)
    };
}

/**
 * 3. 稳定性评分 (0-100)
 * 基于价格波动率
 *
 * 逻辑：
 * - 波动率低 → 稳定性高
 * - 波动率高 → 稳定性低
 */
function calculateStabilityScore(closes, period = 20) {
    if (closes.length < period) {
        return { score: 50, volatility: 'N/A', reason: '数据不足' };
    }

    // 获取最近N天数据
    const recentPrices = closes.slice(-period);

    // 计算日收益率
    const returns = [];
    for (let i = 1; i < recentPrices.length; i++) {
        const ret = (recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1];
        returns.push(ret);
    }

    // 计算标准差（日波动率）
    const dailyVolatility = calculateStdDev(returns);

    // 年化波动率
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);

    // 映射为稳定性评分
    // 年化波动率 15% 以下 → 100分
    // 年化波动率 50% 以上 → 0分
    let score = 100 - ((annualizedVolatility - 0.15) / 0.35) * 100;
    score = Math.max(0, Math.min(100, score));

    // 波动率等级
    let level = 'low';
    if (annualizedVolatility > 0.40) level = 'very-high';
    else if (annualizedVolatility > 0.30) level = 'high';
    else if (annualizedVolatility > 0.20) level = 'medium';

    return {
        score: Math.round(score),
        volatility: {
            daily: parseFloat((dailyVolatility * 100).toFixed(2)),
            annualized: parseFloat((annualizedVolatility * 100).toFixed(2))
        },
        level: level,
        reason: getStabilityReason(score, level)
    };
}

/**
 * 计算综合趋势评分 (0-100)
 *
 * 权重分配：
 * - 趋势方向：40%
 * - 动能：35%
 * - 稳定性：25%
 */
function calculateTrendScore(closes, options = {}) {
    const {
        shortPeriod = 5,
        longPeriod = 20,
        volatilityPeriod = 20
    } = options;

    // 计算各维度评分
    const trendDirection = calculateTrendDirectionScore(closes, shortPeriod, longPeriod);
    const momentum = calculateMomentumScore(closes, shortPeriod, longPeriod);
    const stability = calculateStabilityScore(closes, volatilityPeriod);

    // 加权汇总
    const finalScore = Math.round(
        trendDirection.score * 0.40 +
        momentum.score * 0.35 +
        stability.score * 0.25
    );

    // 判断趋势方向
    let trend = 'neutral';
    if (finalScore >= 60) trend = 'bullish';
    else if (finalScore <= 40) trend = 'bearish';

    // 风险等级
    let riskLevel = 'medium';
    if (finalScore >= 65) riskLevel = 'low';
    else if (finalScore <= 35) riskLevel = 'high';

    return {
        overall: {
            score: finalScore,
            trend: trend,           // bullish / neutral / bearish
            trendText: getTrendText(trend),
            riskLevel: riskLevel,   // low / medium / high
            riskText: getRiskText(riskLevel)
        },
        components: {
            trendDirection: trendDirection,
            momentum: momentum,
            stability: stability
        },
        recommendation: getRecommendation(finalScore, trend),
        timestamp: new Date().toISOString()
    };
}

/**
 * 趋势原因说明
 */
function getTrendReason(score, maDiff) {
    if (score > 70) return `短期均线显著高于长期均线 (+${maDiff.toFixed(1)}%)，强势看多`;
    if (score > 55) return `短期均线高于长期均线 (+${maDiff.toFixed(1)}%)，偏多`;
    if (score > 45) return `短期均线接近长期均线，方向不明`;
    if (score > 30) return `短期均线低于长期均线 (${maDiff.toFixed(1)}%)，偏空`;
    return `短期均线显著低于长期均线 (${maDiff.toFixed(1)}%)，强势看空`;
}

/**
 * 动能原因说明
 */
function getMomentumReason(score, momentum) {
    if (score > 70) return `近期涨势强劲 (+${momentum.toFixed(1)}%)，动能充沛`;
    if (score > 55) return `近期上涨 (+${momentum.toFixed(1)}%)，动能良好`;
    if (score > 45) return `近期波动平稳，动能一般`;
    if (score > 30) return `近期下跌 (${momentum.toFixed(1)}%)，动能偏弱`;
    return `近期跌势明显 (${momentum.toFixed(1)}%)，动能疲软`;
}

/**
 * 稳定性原因说明
 */
function getStabilityReason(score, level) {
    switch (level) {
        case 'very-high': return `波动率极高，价格剧烈波动，稳定性差`;
        case 'high': return `波动率较高，价格波动较大，稳定性一般`;
        case 'medium': return `波动率适中，价格相对稳定`;
        case 'low': return `波动率较低，价格表现稳定`;
        default: return `稳定性数据不足`;
    }
}

/**
 * 趋势文本
 */
function getTrendText(trend) {
    const map = {
        'bullish': '看多',
        'neutral': '中性',
        'bearish': '看空'
    };
    return map[trend] || '中性';
}

/**
 * 风险文本
 */
function getRiskText(level) {
    const map = {
        'low': '低风险',
        'medium': '中风险',
        'high': '高风险'
    };
    return map[level] || '中风险';
}

/**
 * 投资建议
 */
function getRecommendation(score, trend) {
    if (score >= 70) {
        return '趋势强劲，可考虑逢低买入';
    } else if (score >= 60) {
        return '趋势向好，可适量参与';
    } else if (score >= 50) {
        return '趋势偏强，谨慎参与';
    } else if (score >= 45) {
        return '方向不明，建议观望';
    } else if (score >= 35) {
        return '趋势转弱，注意风险';
    } else {
        return '趋势疲弱，建议回避';
    }
}

// 导出模块
module.exports = {
    calculateMA,
    calculateStdDev,
    calculateTrendDirectionScore,
    calculateMomentumScore,
    calculateStabilityScore,
    calculateTrendScore
};
