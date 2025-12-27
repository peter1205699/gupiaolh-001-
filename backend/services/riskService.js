/**
 * ===================================
 * 风险评估服务模块
 * ===================================
 * 功能：基于K线数据计算股票风险指标
 * 指标：
 *   1. 价格波动率风险 (0-100)
 *   2. 最大回撤风险 (0-100)
 *   3. 短期异常波动风险 (0-100)
 *   4. 综合风险评分 (0-100)
 */

const { calculateStdDev } = require('./indicators');

/**
 * 1. 价格波动率风险评分 (0-100)
 *
 * 计算逻辑：
 * - 使用最近20天的收盘价计算日收益率标准差
 * - 年化波动率 = 日波动率 * sqrt(252)
 * - 年化波动率越高，风险分数越高
 *
 * 评分映射：
 * - 年化波动率 < 15% → 0分 (低风险)
 * - 年化波动率 = 30% → 50分 (中风险)
 * - 年化波动率 >= 50% → 100分 (高风险)
 */
function calculateVolatilityRisk(closes, period = 20) {
    if (closes.length < period) {
        return {
            score: 50,
            dailyVolatility: null,
            annualizedVolatility: null,
            level: 'unknown',
            reason: '数据不足'
        };
    }

    // 获取最近N天数据
    const recentPrices = closes.slice(-period);

    // 计算日收益率
    const returns = [];
    for (let i = 1; i < recentPrices.length; i++) {
        const ret = (recentPrices[i] - recentPrices[i - 1]) / recentPrices[i - 1];
        returns.push(ret);
    }

    // 计算日波动率（标准差）
    const dailyVolatility = calculateStdDev(returns);

    // 年化波动率
    const annualizedVolatility = dailyVolatility * Math.sqrt(252);

    // 评分映射：15%以下0分，50%以上100分
    let score = ((annualizedVolatility - 0.15) / 0.35) * 100;
    score = Math.max(0, Math.min(100, score));

    // 风险等级
    let level = 'low';
    if (score >= 70) level = 'high';
    else if (score >= 40) level = 'medium';

    return {
        score: Math.round(score),
        dailyVolatility: parseFloat((dailyVolatility * 100).toFixed(2)),      // 百分比
        annualizedVolatility: parseFloat((annualizedVolatility * 100).toFixed(2)), // 百分比
        level: level,
        reason: getVolatilityRiskReason(level, annualizedVolatility)
    };
}

/**
 * 2. 最大回撤风险评分 (0-100)
 *
 * 计算逻辑：
 * - 从历史最高点到最低点的最大跌幅
 * - 最大回撤 = (峰值 - 谷值) / 峰值
 * - 回撤越大，风险分数越高
 *
 * 评分映射：
 * - 最大回撤 < 5% → 0分 (低风险)
 * - 最大回撤 = 15% → 50分 (中风险)
 * - 最大回撤 >= 30% → 100分 (高风险)
 */
function calculateMaxDrawdownRisk(closes) {
    if (closes.length < 5) {
        return {
            score: 50,
            maxDrawdown: null,
            peakIndex: null,
            troughIndex: null,
            level: 'unknown',
            reason: '数据不足'
        };
    }

    let maxDrawdown = 0;
    let peakPrice = closes[0];
    let peakIndex = 0;
    let troughIndex = 0;

    for (let i = 1; i < closes.length; i++) {
        const currentPrice = closes[i];

        // 更新峰值
        if (currentPrice > peakPrice) {
            peakPrice = currentPrice;
            peakIndex = i;
        }

        // 计算当前回撤
        const drawdown = (peakPrice - currentPrice) / peakPrice;

        // 更新最大回撤
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
            troughIndex = i;
        }
    }

    // 评分映射：5%以下0分，30%以上100分
    let score = ((maxDrawdown - 0.05) / 0.25) * 100;
    score = Math.max(0, Math.min(100, score));

    // 风险等级
    let level = 'low';
    if (score >= 70) level = 'high';
    else if (score >= 40) level = 'medium';

    return {
        score: Math.round(score),
        maxDrawdown: parseFloat((maxDrawdown * 100).toFixed(2)), // 百分比
        peakIndex: peakIndex,
        troughIndex: troughIndex,
        level: level,
        reason: getDrawdownRiskReason(level, maxDrawdown)
    };
}

/**
 * 3. 短期异常波动风险评分 (0-100)
 *
 * 计算逻辑：
 * - 检测最近3-5天的价格变化是否超出正常范围
 * - 使用最近20天的波动率作为基准
 * - 计算最近N天的累计涨跌幅，与基准波动率比较
 *
 * 评分映射：
 * - 累计变化在 ±1倍标准差内 → 0-30分
 * - 累计变化在 ±2倍标准差内 → 30-60分
 * - 累计变化超过 ±2倍标准差 → 60-100分
 */
function calculateAnomalyRisk(closes, shortPeriod = 3, basePeriod = 20) {
    if (closes.length < basePeriod) {
        return {
            score: 50,
            recentChange: null,
            expectedRange: null,
            anomalyLevel: 'unknown',
            reason: '数据不足'
        };
    }

    // 获取基准期数据计算正常波动范围
    const basePrices = closes.slice(-basePeriod - shortPeriod, -shortPeriod);

    // 计算基准日收益率
    const baseReturns = [];
    for (let i = 1; i < basePrices.length; i++) {
        const ret = (basePrices[i] - basePrices[i - 1]) / basePrices[i - 1];
        baseReturns.push(ret);
    }

    const baseStdDev = calculateStdDev(baseReturns);

    // 计算最近N天的累计变化
    const recentPrices = closes.slice(-shortPeriod - 1);
    const recentChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];

    // 计算N天的预期波动范围（使用标准差倍数）
    // 对于N天，预期标准差约为 baseStdDev * sqrt(N)
    const expectedStdDev = baseStdDev * Math.sqrt(shortPeriod);

    // 计算Z-score：实际变化是预期标准差的多少倍
    const zScore = Math.abs(recentChange) / expectedStdDev;

    // 评分映射
    // z-score < 1 → 低分 (正常波动)
    // z-score = 1-2 → 中等分数
    // z-score > 2 → 高分 (异常波动)
    let score;
    if (zScore <= 1) {
        score = zScore * 30; // 0-30分
    } else if (zScore <= 2) {
        score = 30 + (zScore - 1) * 30; // 30-60分
    } else {
        score = Math.min(100, 60 + (zScore - 2) * 20); // 60-100分
    }

    // 异常等级
    let anomalyLevel = 'normal';
    if (zScore > 2.5) anomalyLevel = 'extreme';
    else if (zScore > 1.5) anomalyLevel = 'elevated';
    else if (zScore > 0.8) anomalyLevel = 'moderate';

    return {
        score: Math.round(score),
        recentChange: parseFloat((recentChange * 100).toFixed(2)), // 百分比
        expectedStdDev: parseFloat((expectedStdDev * 100).toFixed(2)), // 百分比
        zScore: parseFloat(zScore.toFixed(2)),
        anomalyLevel: anomalyLevel,
        reason: getAnomalyRiskReason(anomalyLevel, recentChange, zScore)
    };
}

/**
 * 计算综合风险评分 (0-100)
 *
 * 权重分配：
 * - 波动率风险：35%
 * - 最大回撤风险：40%
 * - 异常波动风险：25%
 *
 * 风险等级：
 * - 0-34 分：低风险
 * - 35-59 分：中风险
 * - 60-100 分：高风险
 */
function calculateRiskScore(closes, options = {}) {
    const {
        volatilityPeriod = 20,
        shortPeriod = 3
    } = options;

    // 计算各风险指标
    const volatilityRisk = calculateVolatilityRisk(closes, volatilityPeriod);
    const drawdownRisk = calculateMaxDrawdownRisk(closes);
    const anomalyRisk = calculateAnomalyRisk(closes, shortPeriod, volatilityPeriod);

    // 加权汇总
    const overallScore = Math.round(
        volatilityRisk.score * 0.35 +
        drawdownRisk.score * 0.40 +
        anomalyRisk.score * 0.25
    );

    // 风险等级
    let riskLevel = 'low';
    if (overallScore >= 60) riskLevel = 'high';
    else if (overallScore >= 35) riskLevel = 'medium';

    return {
        symbol: options.symbol || null,
        overall: {
            score: overallScore,
            level: riskLevel,
            levelText: getRiskLevelText(riskLevel)
        },
        indicators: {
            volatility: volatilityRisk,
            maxDrawdown: drawdownRisk,
            anomaly: anomalyRisk
        },
        advice: getRiskAdvice(overallScore, riskLevel),
        timestamp: new Date().toISOString()
    };
}

/**
 * 获取波动率风险说明
 */
function getVolatilityRiskReason(level, annualizedVolatility) {
    const vol = (annualizedVolatility * 100).toFixed(1);
    switch (level) {
        case 'high':
            return `年化波动率 ${vol}%，价格波动剧烈，风险较高`;
        case 'medium':
            return `年化波动率 ${vol}%，价格波动适中`;
        case 'low':
            return `年化波动率 ${vol}%，价格相对稳定`;
        default:
            return `波动率数据不足`;
    }
}

/**
 * 获取回撤风险说明
 */
function getDrawdownRiskReason(level, maxDrawdown) {
    const dd = (maxDrawdown * 100).toFixed(1);
    switch (level) {
        case 'high':
            return `历史最大回撤 ${dd}%，曾出现深幅调整，风险较高`;
        case 'medium':
            return `历史最大回撤 ${dd}%，存在一定调整压力`;
        case 'low':
            return `历史最大回撤 ${dd}%，回调幅度相对可控`;
        default:
            return `回撤数据不足`;
    }
}

/**
 * 获取异常波动说明
 */
function getAnomalyRiskReason(level, recentChange, zScore) {
    const change = (recentChange * 100).toFixed(1);
    const z = zScore.toFixed(1);
    switch (level) {
        case 'extreme':
            return `近期${change}%，偏离正常范围${z}倍标准差，波动异常极端`;
        case 'elevated':
            return `近期${change}%，偏离正常范围${z}倍标准差，波动较为异常`;
        case 'moderate':
            return `近期${change}%，波动处于正常范围内`;
        case 'normal':
            return `近期${change}%，波动正常`;
        default:
            return `异常波动数据不足`;
    }
}

/**
 * 获取风险等级文本
 */
function getRiskLevelText(level) {
    const map = {
        'low': '低风险',
        'medium': '中风险',
        'high': '高风险'
    };
    return map[level] || '未知';
}

/**
 * 获取风险建议
 */
function getRiskAdvice(score, level) {
    switch (level) {
        case 'low':
            return '风险较低，适合稳健型投资者参与';
        case 'medium':
            return '风险适中，建议控制仓位，做好止损';
        case 'high':
            return '风险较高，建议谨慎参与或规避';
        default:
            return '数据不足，无法给出建议';
    }
}

module.exports = {
    calculateVolatilityRisk,
    calculateMaxDrawdownRisk,
    calculateAnomalyRisk,
    calculateRiskScore
};
