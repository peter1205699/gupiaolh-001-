/**
 * ===================================
 * 股票量化分析网站 - 应用逻辑
 * ===================================
 */

// ===================================
// Pro 版本控制
// ===================================

/**
 * Pro 用户状态
 * 用于控制高级功能模块的访问权限
 */
let isProUser = false;

/**
 * Pro 模块标识符
 */
const ProModules = {
    STRATEGY_FIT: 'strategy-fit',
    SIMULATION: 'simulation',
    FACTOR_DETAILS: 'factor-details'
};

/**
 * 事件跟踪存储键名
 */
const STORAGE_KEYS = {
    PRO_USER: 'isProUser',
    TEMP_UNLOCK_START: 'tempUnlockStart',
    CLICK_COUNT: 'proUnlockClickCount',
    FIRST_CLICK_TIME: 'firstProClickTime',
    LAST_CLICK_TIME: 'lastProClickTime'
};

/**
 * 记录 Pro 解锁事件（用于统计付费意愿）
 * @param {string} action - 事件类型：'temp_unlock', 'click', 'view'
 * @param {object} data - 附加数据
 */
function trackProEvent(action, data = {}) {
    const now = Date.now();
    let clickCount = parseInt(localStorage.getItem(STORAGE_KEYS.CLICK_COUNT) || '0');
    let firstClickTime = parseInt(localStorage.getItem(STORAGE_KEYS.FIRST_CLICK_TIME) || '0');

    // 记录首次点击时间
    if (action === 'temp_unlock' && firstClickTime === 0) {
        firstClickTime = now;
        localStorage.setItem(STORAGE_KEYS.FIRST_CLICK_TIME, firstClickTime.toString());
    }

    // 更新点击次数
    if (action === 'temp_unlock') {
        clickCount++;
        localStorage.setItem(STORAGE_KEYS.CLICK_COUNT, clickCount.toString());
    }

    // 更新最后点击时间
    localStorage.setItem(STORAGE_KEYS.LAST_CLICK_TIME, now.toString());

    // 组合事件数据
    const eventData = {
        action: action,
        timestamp: now,
        clickCount: clickCount,
        firstClickTime: firstClickTime,
        lastClickTime: now,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        ...data
    };

    // 输出到控制台（开发调试用）
    console.log('[Pro事件跟踪]', eventData);

    // 尝试发送到后端 API（非阻塞）
    ApiService.trackEvent(eventData).catch(() => {
        // 静默失败，不影响用户体验
    });

    return eventData;
}

/**
 * 检查临时解锁是否过期
 * @returns {boolean} 是否过期
 */
function isTempUnlockExpired() {
    const unlockStart = localStorage.getItem(STORAGE_KEYS.TEMP_UNLOCK_START);
    if (!unlockStart) return true;

    const startTime = parseInt(unlockStart);
    const now = Date.now();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    return (now - startTime) > ONE_DAY_MS;
}

/**
 * 清除过期的临时解锁状态
 */
function clearExpiredTempUnlock() {
    if (isTempUnlockExpired()) {
        localStorage.removeItem(STORAGE_KEYS.TEMP_UNLOCK_START);
        localStorage.removeItem(STORAGE_KEYS.PRO_USER);
        isProUser = false;
    }
}

/**
 * 请求临时解锁 Pro 功能
 * 用户点击"临时解锁体验"按钮时调用
 */
function requestTemporaryUnlock() {
    // 记录点击事件
    trackProEvent('temp_unlock', {
        source: 'lock_overlay',
        currentPage: window.location.pathname
    });

    // 检查是否已经有有效的临时解锁
    if (isProUser && !isTempUnlockExpired()) {
        // 已解锁，无需重复处理
        return;
    }

    // 设置临时解锁状态（1天有效）
    const unlockStart = Date.now();
    localStorage.setItem(STORAGE_KEYS.TEMP_UNLOCK_START, unlockStart.toString());
    localStorage.setItem(STORAGE_KEYS.PRO_USER, 'true');
    isProUser = true;

    // 更新 UI
    updateProModuleStates();

    // 显示临时解锁提示（可选）
    console.log('[Pro提示] 已临时解锁 Pro 功能，有效期 24 小时');
}

/**
 * 更新 Pro 模块的显示状态
 * 根据 isProUser 状态控制模块的锁定/解锁
 */
function updateProModuleStates() {
    // 清除过期的临时解锁
    clearExpiredTempUnlock();

    // 获取所有 Pro 模块卡片
    const proCards = document.querySelectorAll('.pro-card');

    proCards.forEach(card => {
        const cardInner = card.querySelector('.pro-card-inner');
        const lockOverlay = card.querySelector('.pro-lock-overlay');

        if (isProUser) {
            // Pro 用户：移除锁定状态
            card.classList.remove('locked');
            card.classList.add('unlocked');
        } else {
            // 免费用户：显示锁定状态
            card.classList.add('locked');
            card.classList.remove('unlocked');
        }
    });

    // 更新 Pro 子因子区域状态
    const proFactorSections = document.querySelectorAll('.pro-factor-section');
    proFactorSections.forEach(section => {
        if (isProUser) {
            section.classList.remove('locked');
            section.classList.add('unlocked');
        } else {
            section.classList.add('locked');
            section.classList.remove('unlocked');
        }
    });

    // 更新升级按钮的显示状态
    updateUpgradeButtonState();
}

/**
 * 升级为 Pro（演示用）
 * 点击后临时解锁所有 Pro 功能
 */
function upgradeToPro() {
    // 记录点击事件
    trackProEvent('manual_unlock', {
        source: 'header_button',
        currentPage: window.location.pathname
    });

    isProUser = true;

    // 保存状态到 localStorage 以便刷新后保持
    localStorage.setItem(STORAGE_KEYS.PRO_USER, 'true');

    // 更新 UI
    updateProModuleStates();

    // 重新渲染内容（确保数据显示正常）
    initApp();
}

/**
 * 退出 Pro 模式（演示用）
 * 用于测试锁定状态
 */
function exitProMode() {
    isProUser = false;
    localStorage.removeItem(STORAGE_KEYS.PRO_USER);
    localStorage.removeItem(STORAGE_KEYS.TEMP_UNLOCK_START);
    updateProModuleStates();
    initApp();
}

/**
 * 更新升级按钮的显示状态
 */
function updateUpgradeButtonState() {
    let upgradeBtn = document.getElementById('upgrade-pro-btn');

    if (isProUser) {
        // Pro 用户：显示退出按钮
        if (!upgradeBtn) {
            createUpgradeButton();
        }
        upgradeBtn = document.getElementById('upgrade-pro-btn');
        if (upgradeBtn) {
            upgradeBtn.textContent = '退出 Pro 演示';
            upgradeBtn.onclick = exitProMode;
        }
    } else {
        // 免费用户：显示升级按钮
        if (!upgradeBtn) {
            createUpgradeButton();
        }
        upgradeBtn = document.getElementById('upgrade-pro-btn');
        if (upgradeBtn) {
            upgradeBtn.textContent = '升级为 Pro';
            upgradeBtn.onclick = upgradeToPro;
        }
    }
}

/**
 * 创建升级按钮
 * 添加到页面右上角
 */
function createUpgradeButton() {
    const header = document.querySelector('.header .container');
    if (!header) return;

    // 检查是否已存在按钮
    if (document.getElementById('upgrade-pro-btn')) return;

    const button = document.createElement('button');
    button.id = 'upgrade-pro-btn';
    button.className = 'upgrade-pro-btn';
    button.textContent = '升级为 Pro';

    // 创建按钮容器
    const btnContainer = document.createElement('div');
    btnContainer.className = 'upgrade-btn-container';
    btnContainer.appendChild(button);

    header.appendChild(btnContainer);
}

/**
 * 初始化 Pro 状态
 * 从 localStorage 读取 Pro 状态，并同步检查后端
 */
async function initProState() {
    // 清除过期的临时解锁
    clearExpiredTempUnlock();

    // 读取本地 Pro 状态
    const savedProState = localStorage.getItem(STORAGE_KEYS.PRO_USER);
    isProUser = savedProState === 'true';

    // 尝试从后端同步 Pro 状态（如果有登录 token）
    const backendProStatus = await ApiService.checkProStatus();
    if (backendProStatus !== null) {
        // 后端返回有效状态，以服务器为准
        isProUser = backendProStatus;
        localStorage.setItem(STORAGE_KEYS.PRO_USER, isProUser ? 'true' : 'false');
    }

    // 创建升级按钮
    createUpgradeButton();

    // 记录页面访问事件
    trackProEvent('page_view', {
        isProUser: isProUser,
        referrer: document.referrer
    });
}

/**
 * 获取 Pro 事件统计信息（用于调试和分析）
 * @returns {object} 事件统计数据
 */
function getProEventStats() {
    return {
        clickCount: parseInt(localStorage.getItem(STORAGE_KEYS.CLICK_COUNT) || '0'),
        firstClickTime: localStorage.getItem(STORAGE_KEYS.FIRST_CLICK_TIME),
        lastClickTime: localStorage.getItem(STORAGE_KEYS.LAST_CLICK_TIME),
        isProUser: isProUser,
        isTempUnlock: !!localStorage.getItem(STORAGE_KEYS.TEMP_UNLOCK_START),
        tempUnlockExpired: isTempUnlockExpired()
    };
}

// ===================================
// Pro 内测申请弹窗
// ===================================

/**
 * 打开 Pro 内测申请弹窗
 */
function openBetaModal() {
    const modal = document.getElementById('beta-modal');
    if (modal) {
        modal.classList.add('active');
        // 重置表单状态
        document.getElementById('beta-form').style.display = 'block';
        document.getElementById('beta-success').style.display = 'none';
        document.getElementById('beta-form').reset();
    }
}

/**
 * 关闭 Pro 内测申请弹窗
 */
function closeBetaModal() {
    const modal = document.getElementById('beta-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * 提交内测申请表单
 */
function submitBetaForm(event) {
    event.preventDefault();

    const email = document.getElementById('beta-email').value;
    const wechat = document.getElementById('beta-wechat').value;
    const reason = document.getElementById('beta-reason').value;

    // 记录内测申请事件
    trackProEvent('beta_application', {
        email: email,
        hasWechat: !!wechat,
        hasReason: !!reason
    });

    // 模拟提交（实际项目中需要发送到后端）
    console.log('Pro 内测申请提交:', { email, wechat, reason });

    // 隐藏表单，显示成功提示
    document.getElementById('beta-form').style.display = 'none';
    document.getElementById('beta-success').style.display = 'block';

    // 可以在这里添加实际的后端 API 调用
    // 例如：fetch('/api/beta-apply', { method: 'POST', body: JSON.stringify({ email, wechat, reason }) })
}

// ===================================
// 数据服务模块（真实市场数据）
// ===================================

/**
 * 数据服务配置
 */
const DataServiceConfig = {
    // 使用新浪财经免费 API
    indexApiUrl: 'https://hq.sinajs.cn/list=',
    // 缓存时间：60 秒
    cacheTimeout: 60000,
    // 数据更新间隔：60 秒
    updateInterval: 60000
};

/**
 * 数据服务
 * 负责从真实 API 获取市场数据
 */
const DataService = {
    // 数据缓存
    cache: new Map(),
    cacheTimestamps: new Map(),

    /**
     * 获取实时指数数据
     * @returns {Promise<object>} 三大指数数据
     */
    async fetchIndexData() {
        const cacheKey = 'index_data';
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // 新浪财经 API: sh000001(上证), sz399001(深证), sz399006(创业板)
            const symbols = 'sh000001,sz399001,sz399006';
            const response = await fetch(`${DataServiceConfig.indexApiUrl}${symbols}`, {
                method: 'GET',
                mode: 'no-cors' // 新浪 API 不支持 CORS，需要后端代理
            });

            // 由于 no-cors 模式，这里使用备用方案
            // 实际项目中应该通过后端代理获取
            return await this.getFallbackIndexData();

        } catch (error) {
            console.error('获取指数数据失败:', error);
            return await this.getFallbackIndexData();
        }
    },

    /**
     * 备用方案：返回模拟数据
     * TODO: 后端 API 完成后移除此方法
     */
    async getFallbackIndexData() {
        const data = {
            shanghai: {
                name: '上证指数',
                code: '000001',
                value: 3245.67 + (Math.random() - 0.5) * 20,
                change: (Math.random() - 0.5) * 50,
                changePercent: (Math.random() - 0.5) * 2
            },
            shenzhen: {
                name: '深证成指',
                code: '399001',
                value: 10234.15 + (Math.random() - 0.5) * 100,
                change: (Math.random() - 0.5) * 80,
                changePercent: (Math.random() - 0.5) * 2
            },
            chiNext: {
                name: '创业板指',
                code: '399006',
                value: 2156.89 + (Math.random() - 0.5) * 50,
                change: (Math.random() - 0.5) * 30,
                changePercent: (Math.random() - 0.5) * 2
            },
            volume: Math.floor(7000 + Math.random() * 3000) + ' 亿'
        };

        // 重新计算涨跌幅百分比
        data.shanghai.changePercent = (data.shanghai.change / data.shanghai.value) * 100;
        data.shenzhen.changePercent = (data.shenzhen.change / data.shenzhen.value) * 100;
        data.chiNext.changePercent = (data.chiNext.change / data.chiNext.value) * 100;

        return data;
    },

    /**
     * 获取历史价格数据
     * @param {string} symbol - 股票代码
     * @param {number} days - 天数
     * @returns {Promise<number[]>} 价格数组
     */
    async fetchHistoryData(symbol, days = 20) {
        const cacheKey = `history_${symbol}_${days}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // TODO: 调用后端 API 获取历史数据
            // const response = await fetch(`/api/market/history?symbol=${symbol}&days=${days}`);
            // const data = await response.json();
            // return data.prices;

            // 临时方案：生成模拟历史数据
            return await this.generateHistoryData(days);

        } catch (error) {
            console.error('获取历史数据失败:', error);
            return await this.generateHistoryData(days);
        }
    },

    /**
     * 生成模拟历史数据（临时方案）
     * TODO: 后端 API 完成后移除此方法
     */
    async generateHistoryData(days) {
        const basePrice = 3150;
        const prices = [];
        let price = basePrice;

        for (let i = 0; i < days; i++) {
            price = price + (Math.random() - 0.5) * 30;
            price = Math.max(3000, Math.min(3400, price)); // 限制范围
            prices.push(Math.round(price * 100) / 100);
        }

        return prices;
    },

    /**
     * 从缓存获取数据
     */
    getFromCache(key) {
        const timestamp = this.cacheTimestamps.get(key);
        if (timestamp && Date.now() - timestamp < DataServiceConfig.cacheTimeout) {
            return this.cache.get(key);
        }
        return null;
    },

    /**
     * 保存数据到缓存
     */
    saveToCache(key, data) {
        this.cache.set(key, data);
        this.cacheTimestamps.set(key, Date.now());
    },

    /**
     * 清除所有缓存
     */
    clearCache() {
        this.cache.clear();
        this.cacheTimestamps.clear();
    }
};

// ===================================
// 后端 API 服务（待实现）
// ===================================

/**
 * API 服务
 * 与后端服务通信
 */
const ApiService = {
    // API 基础 URL（开发环境）
    baseUrl: window.location.hostname === 'localhost'
        ? 'http://localhost:3000/api'
        : '/api',

    /**
     * 检查用户 Pro 状态
     */
    async checkProStatus() {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return false;

            const response = await fetch(`${this.baseUrl}/user/pro-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.isPro;
            }
            return false;
        } catch (error) {
            console.error('检查 Pro 状态失败:', error);
            return false;
        }
    },

    /**
     * 提交事件跟踪数据
     */
    async trackEvent(eventData) {
        try {
            await fetch(`${this.baseUrl}/event/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
        } catch (error) {
            console.error('事件跟踪失败:', error);
        }
    },

    /**
     * 获取趋势评分
     * @param {string} symbol - 股票代码（可选，默认分析上证指数）
     */
    async getTrendScore(symbol = 'sh000001') {
        try {
            const response = await fetch(`${this.baseUrl}/trend-score?symbol=${symbol}`);
            const data = await response.json();
            if (data.success) {
                return data.data;
            } else {
                throw new Error(data.error || '获取趋势评分失败');
            }
        } catch (error) {
            console.error('获取趋势评分失败:', error);
            throw error;
        }
    },

    /**
     * 获取风险评分
     * @param {string} symbol - 股票代码（可选，默认分析上证指数）
     */
    async getRiskScore(symbol = 'sh000001') {
        try {
            const response = await fetch(`${this.baseUrl}/risk/score?symbol=${symbol}`);
            const data = await response.json();
            if (data.success) {
                return data.data;
            } else {
                throw new Error(data.error || '获取风险评分失败');
            }
        } catch (error) {
            console.error('获取风险评分失败:', error);
            throw error;
        }
    }
};

// ===================================
// 趋势强度量化评分模块
// ===================================

/**
 * 模拟价格数据（最近 20 天收盘价）
 * TODO: 替换为从 DataService.fetchHistoryData() 获取
 */
const priceData = [
    3080, 3105, 3092, 3120, 3145,
    3132, 3158, 3180, 3165, 3192,
    3178, 3205, 3220, 3210, 3235,
    3248, 3230, 3255, 3268, 3245
];

/**
 * 计算简单移动平均线
 * @param {number[]} data - 价格数组
 * @param {number} period - 周期
 * @returns {number} SMA值
 */
function calculateSMA(data, period) {
    if (data.length < period) return 0;
    const slice = data.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
}

/**
 * 计算标准差
 * @param {number[]} data - 价格数组
 * @returns {number} 标准差
 */
function calculateStdDev(data) {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
}

/**
 * 计算趋势方向得分（短期均线 vs 长期均线）
 * 权重：40%
 * @param {number[]} prices - 价格数组
 * @returns {number} 0-100 分数
 */
function calculateTrendDirection(prices) {
    const shortMA = calculateSMA(prices, 5);   // 短期均线（5日）
    const longMA = calculateSMA(prices, 20);   // 长期均线（20日）

    // 计算均线偏离度
    const deviation = (shortMA - longMA) / longMA * 100;

    // 偏离度范围约 -3% 到 +3%，映射到 0-100
    // 0% 偏离 = 50分，+3% 偏离 = 100分，-3% 偏离 = 0分
    let score = 50 + (deviation / 3) * 50;

    return Math.max(0, Math.min(100, score));
}

/**
 * 计算趋势动能得分（近5日涨跌幅）
 * 权重：30%
 * @param {number[]} prices - 价格数组
 * @returns {number} 0-100 分数
 */
function calculateMomentum(prices) {
    const recent5 = prices.slice(-5);
    const startPrice = recent5[0];
    const endPrice = recent5[recent5.length - 1];

    // 计算5日涨跌幅
    const changePercent = (endPrice - startPrice) / startPrice * 100;

    // 5日涨跌幅范围约 -5% 到 +5%，映射到 0-100
    // 0% 涨跌 = 50分，+5% 涨 = 100分，-5% 跌 = 0分
    let score = 50 + (changePercent / 5) * 50;

    return Math.max(0, Math.min(100, score));
}

/**
 * 计算稳定性得分（价格波动率）
 * 权重：30%
 * @param {number[]} prices - 价格数组
 * @returns {number} 0-100 分数
 */
function calculateStability(prices) {
    const stdDev = calculateStdDev(prices);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

    // 计算变异系数（标准差/均值）
    const cv = (stdDev / mean) * 100;

    // 变异系数越小越稳定，得分越高
    // 正常范围约 0.5% 到 3%，反向映射到 0-100
    // 0.5% = 100分，3% = 0分
    let score = 100 - ((cv - 0.5) / 2.5) * 100;

    return Math.max(0, Math.min(100, score));
}

/**
 * 计算综合趋势强度评分
 * @param {number[]} prices - 价格数组
 * @returns {object} 包含总分和各子因子得分的对象
 */
function calculateTrendScore(prices) {
    // 计算各子因子得分
    const directionScore = calculateTrendDirection(prices);
    const momentumScore = calculateMomentum(prices);
    const stabilityScore = calculateStability(prices);

    // 按权重计算总分：方向40% + 动能30% + 稳定性30%
    const overallScore = directionScore * 0.4 + momentumScore * 0.3 + stabilityScore * 0.3;

    return {
        overall: Math.round(overallScore),
        direction: Math.round(directionScore),
        momentum: Math.round(momentumScore),
        stability: Math.round(stabilityScore)
    };
}

/**
 * 生成评分解释说明
 * @param {object} scores - 得分对象
 * @returns {string} 中文解释说明
 */
function generateScoreExplanation(scores) {
    let explanation = '';

    // 总体评价
    if (scores.overall >= 70) {
        explanation += '当前趋势强度较强。';
    } else if (scores.overall >= 50) {
        explanation += '当前趋势强度中等。';
    } else {
        explanation += '当前趋势强度偏弱。';
    }

    // 方向评价
    if (scores.direction >= 60) {
        explanation += '短期均线位于长期均线上方，呈多头排列；';
    } else if (scores.direction <= 40) {
        explanation += '短期均线位于长期均线下方，呈空头排列；';
    } else {
        explanation += '短期均线与长期均线交织，方向不明确；';
    }

    // 动能评价
    if (scores.momentum >= 60) {
        explanation += '近5日呈现上涨动能；';
    } else if (scores.momentum <= 40) {
        explanation += '近5日呈现下跌动能；';
    } else {
        explanation += '近5日动能平稳；';
    }

    // 稳定性评价
    if (scores.stability >= 60) {
        explanation += '价格波动较小，趋势相对稳定。';
    } else {
        explanation += '价格波动较大，需注意风险。';
    }

    return explanation;
}

// 模拟市场数据
const marketData = {
    shanghai: {
        name: '上证指数',
        code: '000001',
        value: 3245.67,
        change: 18.32,
        changePercent: 0.57
    },
    shenzhen: {
        name: '深证成指',
        code: '399001',
        value: 10234.15,
        change: -45.23,
        changePercent: -0.44
    },
    chiNext: {
        name: '创业板指',
        code: '399006',
        value: 2156.89,
        change: 12.45,
        changePercent: 0.58
    },
    volume: '8,526 亿'
};

// ===================================
// 风险评估模块
// ===================================

/**
 * 计算最大回撤
 * 最大回撤 = (峰值 - 谷值) / 峰值
 * @param {number[]} prices - 价格数组
 * @returns {number} 0-100 风险得分（回撤越大，分数越高）
 */
function calculateMaxDrawdown(prices) {
    let maxDrawdown = 0;
    let peak = prices[0];

    for (let i = 1; i < prices.length; i++) {
        // 更新峰值
        if (prices[i] > peak) {
            peak = prices[i];
        }
        // 计算当前回撤
        const drawdown = (peak - prices[i]) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    // 将回撤百分比转换为 0-100 分数
    // 正常回撤范围 0% - 15%，映射到 0-100
    // 0% 回撤 = 0分，15% 回撤 = 100分
    const riskScore = (maxDrawdown * 100 / 15) * 100;

    return Math.max(0, Math.min(100, Math.round(riskScore)));
}

/**
 * 计算波动率风险（基于标准差）
 * @param {number[]} prices - 价格数组
 * @returns {number} 0-100 风险得分（波动越大，分数越高）
 */
function calculateVolatilityRisk(prices) {
    const stdDev = calculateStdDev(prices);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

    // 计算变异系数（标准差/均值的百分比）
    const cv = (stdDev / mean) * 100;

    // 变异系数范围约 0.5% - 4%，映射到 0-100
    // 0.5% = 0分，4% = 100分
    const riskScore = ((cv - 0.5) / 3.5) * 100;

    return Math.max(0, Math.min(100, Math.round(riskScore)));
}

/**
 * 计算趋势衰减风险（短期均线斜率变化）
 * @param {number[]} prices - 价格数组
 * @returns {number} 0-100 风险得分（斜率下降越多，分数越高）
 */
function calculateTrendDecayRisk(prices) {
    // 计算最近5日的短期均线斜率
    const recent5 = prices.slice(-5);
    const firstHalf = recent5.slice(0, 2);
    const secondHalf = recent5.slice(-2);

    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // 计算斜率变化百分比
    const slopeChange = ((avg2 - avg1) / avg1) * 100;

    // 斜率变化范围约 -3% 到 +2%，映射到 0-100
    // +2% = 0分（无衰减），-3% = 100分（严重衰减）
    let riskScore = ((2 - slopeChange) / 5) * 100;

    return Math.max(0, Math.min(100, Math.round(riskScore)));
}

/**
 * 计算综合风险等级
 * @param {object} riskScores - 各风险指标得分
 * @returns {object} 包含总体风险等级和综合得分
 */
function calculateOverallRisk(riskScores) {
    // 计算平均风险得分
    const avgRisk = (riskScores.maxDrawdown + riskScores.volatility + riskScores.trendDecay) / 3;

    // 根据平均得分确定风险等级
    let level, levelText;
    if (avgRisk >= 60) {
        level = 'high';
        levelText = '高风险';
    } else if (avgRisk >= 35) {
        level = 'medium';
        levelText = '中等风险';
    } else {
        level = 'low';
        levelText = '低风险';
    }

    return {
        level: level,
        levelText: levelText,
        overallScore: Math.round(avgRisk)
    };
}

/**
 * 生成风险提示说明
 * @param {object} riskScores - 各风险指标得分
 * @param {object} overallRisk - 总体风险等级
 * @returns {string} 中文风险提示说明
 */
function generateRiskExplanation(riskScores, overallRisk) {
    let explanation = '';

    // 总体风险评价
    if (overallRisk.level === 'high') {
        explanation += '当前市场风险较高，建议谨慎操作。';
    } else if (overallRisk.level === 'medium') {
        explanation += '当前市场风险适中，可适度参与。';
    } else {
        explanation += '当前市场风险较低，环境相对稳定。';
    }

    // 最大回撤评价
    if (riskScores.maxDrawdown >= 60) {
        explanation += '近期最大回撤较大，说明市场出现过明显调整；';
    } else if (riskScores.maxDrawdown >= 35) {
        explanation += '近期最大回撤适中，市场有一定波动；';
    } else {
        explanation += '近期最大回撤较小，下跌幅度有限；';
    }

    // 波动率评价
    if (riskScores.volatility >= 60) {
        explanation += '价格波动剧烈，建议控制仓位或等待趋势明朗；';
    } else if (riskScores.volatility >= 35) {
        explanation += '价格波动正常，需关注后续变化；';
    } else {
        explanation += '价格波动平缓，市场运行相对稳定；';
    }

    // 趋势衰减评价
    if (riskScores.trendDecay >= 60) {
        explanation += '短期趋势出现明显衰减，多头力量减弱，注意回调风险。';
    } else if (riskScores.trendDecay >= 35) {
        explanation += '短期趋势略有放缓，观察后续走势确认方向。';
    } else {
        explanation += '短期趋势保持良好，多头结构完整。';
    }

    return explanation;
}

/**
 * 计算完整的风险评估
 * @param {number[]} prices - 价格数组
 * @returns {object} 完整的风险评估结果
 */
function calculateRiskAssessment(prices) {
    const maxDrawdown = calculateMaxDrawdown(prices);
    const volatility = calculateVolatilityRisk(prices);
    const trendDecay = calculateTrendDecayRisk(prices);

    const riskScores = {
        maxDrawdown: maxDrawdown,
        volatility: volatility,
        trendDecay: trendDecay
    };

    const overallRisk = calculateOverallRisk(riskScores);

    return {
        ...riskScores,
        overallRisk: overallRisk
    };
}

// 模拟风险提示数据（已移除，使用量化计算代替）
const riskData = {
    level: 'medium',
    levelText: '中等风险',
    alerts: [
        {
            type: 'warning',
            icon: '⚠',
            title: '市场波动加剧',
            desc: '近期市场波动率上升，建议控制仓位'
        },
        {
            type: 'danger',
            icon: '🔴',
            title: '成交量萎缩',
            desc: '两市成交量较昨日减少15%，观望情绪浓厚'
        },
        {
            type: 'warning',
            icon: '⚠',
            title: '外资流出',
            desc: '北向资金净流出约30亿元'
        }
    ]
};

// ===================================
// 策略适配分析模块
// ===================================

/**
 * 策略适配度等级
 */
const StrategyFitLevel = {
    SUITABLE: 'suitable',      // 适合
    CAUTIOUS: 'cautious',      // 谨慎
    UNSUITABLE: 'unsuitable'   // 不适合
};

/**
 * 计算趋势跟随策略适配度
 * 依赖：趋势强度（方向、动能）+ 风险水平
 * @param {object} trendScore - 趋势强度评分
 * @param {object} riskAssessment - 风险评估结果
 * @returns {object} 适配度结果
 */
function calculateTrendFollowingFit(trendScore, riskAssessment) {
    let fitLevel, score, reason;

    // 趋势跟随策略核心：强趋势 + 低风险
    const trendStrength = trendScore.overall;
    const riskLevel = riskAssessment.overallRisk.level;

    // 计算适配得分
    let fitScore = 0;
    if (trendScore.direction >= 60) fitScore += 40;      // 多头方向
    else if (trendScore.direction <= 40) fitScore += 20; // 空头方向也可跟随
    else fitScore += 10;

    if (trendScore.momentum >= 60) fitScore += 35;       // 强动能
    else if (trendScore.momentum >= 45) fitScore += 20;
    else fitScore += 5;

    if (trendScore.stability >= 50) fitScore += 25;       // 稳定性好

    // 风险调整
    if (riskLevel === 'low') fitScore += 10;
    else if (riskLevel === 'high') fitScore -= 20;

    fitScore = Math.max(0, Math.min(100, fitScore));

    // 确定适配等级
    if (fitScore >= 60) {
        fitLevel = StrategyFitLevel.SUITABLE;
        reason = '当前趋势明确且动能充足，适合趋势跟随策略。';
    } else if (fitScore >= 35) {
        fitLevel = StrategyFitLevel.CAUTIOUS;
        reason = '趋势强度一般或风险偏高，建议谨慎使用趋势跟随策略。';
    } else {
        fitLevel = StrategyFitLevel.UNSUITABLE;
        reason = '当前缺乏明确趋势，不建议使用趋势跟随策略。';
    }

    return {
        level: fitLevel,
        score: Math.round(fitScore),
        reason: reason
    };
}

/**
 * 计算波段交易策略适配度
 * 依赖：波动率 + 趋势稳定性
 * @param {object} trendScore - 趋势强度评分
 * @param {object} riskAssessment - 风险评估结果
 * @returns {object} 适配度结果
 */
function calculateSwingTradingFit(trendScore, riskAssessment) {
    let fitLevel, score, reason;

    // 波段交易核心：适度波动 + 震荡或温和趋势
    let fitScore = 0;

    // 波动率适中最佳（50-70分）
    const volatility = riskAssessment.volatility;
    if (volatility >= 45 && volatility <= 70) fitScore += 40;
    else if (volatility >= 30 && volatility < 45) fitScore += 25;
    else if (volatility > 70) fitScore += 20;  // 波动过大也可做波段，但需谨慎
    else fitScore += 10;

    // 趋势不要过强（波段需要回调空间）
    if (trendScore.momentum >= 45 && trendScore.momentum <= 65) fitScore += 30;
    else if (trendScore.momentum < 45) fitScore += 20;  // 弱势震荡也可
    else fitScore += 10;  // 过强趋势不适合波段

    // 最大回撤适中
    if (riskAssessment.maxDrawdown >= 30 && riskAssessment.maxDrawdown <= 60) fitScore += 30;
    else if (riskAssessment.maxDrawdown < 30) fitScore += 15;
    else fitScore += 20;

    fitScore = Math.max(0, Math.min(100, fitScore));

    // 确定适配等级
    if (fitScore >= 60) {
        fitLevel = StrategyFitLevel.SUITABLE;
        reason = '当前市场波动适中且有震荡空间，适合波段交易策略。';
    } else if (fitScore >= 35) {
        fitLevel = StrategyFitLevel.CAUTIOUS;
        reason = '市场波动或趋势强度一般，波段交易需谨慎。';
    } else {
        fitLevel = StrategyFitLevel.UNSUITABLE;
        reason = '当前市场条件不适合波段交易策略。';
    }

    return {
        level: fitLevel,
        score: Math.round(fitScore),
        reason: reason
    };
}

/**
 * 计算抄底反弹策略适配度
 * 依赖：最大回撤 + 趋势衰减 + 风险等级
 * @param {object} trendScore - 趋势强度评分
 * @param {object} riskAssessment - 风险评估结果
 * @returns {object} 适配度结果
 */
function calculateDipBuyingFit(trendScore, riskAssessment) {
    let fitLevel, score, reason;

    // 抄底反弹核心：经历明显回撤 + 趋势衰减 + 低位企稳
    let fitScore = 0;

    // 有明显回撤
    const maxDrawdown = riskAssessment.maxDrawdown;
    if (maxDrawdown >= 50) fitScore += 40;
    else if (maxDrawdown >= 35) fitScore += 25;
    else fitScore += 10;

    // 趋势衰减（空头力量衰竭）
    const trendDecay = riskAssessment.trendDecay;
    if (trendDecay >= 50) fitScore += 30;  // 衰减明显
    else if (trendDecay >= 35) fitScore += 20;
    else fitScore += 5;

    // 动能偏弱但非暴跌
    if (trendScore.momentum <= 45 && trendScore.momentum >= 25) fitScore += 30;
    else if (trendScore.momentum < 25) fitScore += 15;  // 过弱可能是持续下跌
    else fitScore += 10;

    fitScore = Math.max(0, Math.min(100, fitScore));

    // 确定适配等级
    if (fitScore >= 60) {
        fitLevel = StrategyFitLevel.SUITABLE;
        reason = '经历明显回撤后趋势衰减，适合关注反弹机会。';
    } else if (fitScore >= 35) {
        fitLevel = StrategyFitLevel.CAUTIOUS;
        reason = '存在一定回调，但抄底需谨慎，建议等待企稳信号。';
    } else {
        fitLevel = StrategyFitLevel.UNSUITABLE;
        reason = '当前市场处于强势或缺乏明显回调，不建议抄底。';
    }

    return {
        level: fitLevel,
        score: Math.round(fitScore),
        reason: reason
    };
}

/**
 * 计算所有策略适配度
 * @param {object} trendScore - 趋势强度评分
 * @param {object} riskAssessment - 风险评估结果
 * @returns {object} 所有策略适配度结果
 */
function calculateStrategyFit(trendScore, riskAssessment) {
    const trendFollowing = calculateTrendFollowingFit(trendScore, riskAssessment);
    const swingTrading = calculateSwingTradingFit(trendScore, riskAssessment);
    const dipBuying = calculateDipBuyingFit(trendScore, riskAssessment);

    return {
        trendFollowing: trendFollowing,
        swingTrading: swingTrading,
        dipBuying: dipBuying
    };
}

/**
 * 生成操作风格建议
 * @param {object} strategyFit - 策略适配度结果
 * @param {object} riskAssessment - 风险评估结果
 * @returns {string} 操作风格建议
 */
function generateOperationAdvice(strategyFit, riskAssessment) {
    let advice = '';

    // 根据最适合的策略给出建议
    const strategies = [
        { ...strategyFit.trendFollowing, name: '趋势跟随' },
        { ...strategyFit.swingTrading, name: '波段交易' },
        { ...strategyFit.dipBuying, name: '抄底反弹' }
    ].sort((a, b) => b.score - a.score);

    const bestStrategy = strategies[0];

    // 仓位建议
    if (riskAssessment.overallRisk.level === 'low') {
        advice += '【仓位建议】当前风险较低，可适当提高仓位至60-70%。';
    } else if (riskAssessment.overallRisk.level === 'medium') {
        advice += '【仓位建议】当前风险适中，建议控制仓位在40-50%。';
    } else {
        advice += '【仓位建议】当前风险较高，建议降低仓位至20-30%或观望。';
    }

    // 操作频率建议
    if (bestStrategy.level === StrategyFitLevel.SUITABLE) {
        if (bestStrategy.name === '趋势跟随') {
            advice += '【操作频率】趋势确立后可减少操作频率，以持仓为主，避免频繁进出。';
        } else if (bestStrategy.name === '波段交易') {
            advice += '【操作频率】适合中等频率操作，关注支撑阻力位，快进快出。';
        } else {
            advice += '【操作频率】抄底需耐心等待，分批建仓，不可急于一次性重仓。';
        }
    } else {
        advice += '【操作频率】当前策略适配度一般，建议降低操作频率，多看少动。';
    }

    // 心态建议
    const riskLevel = riskAssessment.overallRisk.level;
    if (riskLevel === 'high') {
        advice += '【心态建议】市场波动较大，保持冷静，严格执行止损，不逆势抗单。';
    } else if (riskLevel === 'medium') {
        advice += '【心态建议】市场方向尚不明朗，保持谨慎乐观，不追高不杀跌。';
    } else {
        advice += '【心态建议】市场相对稳定，可把握机会，但仍需保持敬畏之心。';
    }

    return advice;
}

/**
 * 获取策略适配度等级的中文文本
 * @param {string} level - 适配度等级
 * @returns {string} 中文文本
 */
function getFitLevelText(level) {
    switch (level) {
        case StrategyFitLevel.SUITABLE:
            return '适合';
        case StrategyFitLevel.CAUTIOUS:
            return '谨慎';
        case StrategyFitLevel.UNSUITABLE:
            return '不适合';
        default:
            return '未知';
    }
}

// ===================================
// 情景推演模块（What-if Simulation）
// ===================================

/**
 * 风险变化等级
 */
const RiskChangeLevel = {
    CONTROLLED: 'controlled',      // 可控
    ATTENTION: 'attention',        // 注意
    HIGH_RISK: 'high_risk'         // 高风险
};

/**
 * 仓位应对建议
 */
const PositionAction = {
    REDUCE: 'reduce',              // 减少
    MAINTAIN: 'maintain',          // 保持
    CAUTIOUS_INCREASE: 'cautious_increase'  // 谨慎增加
};

/**
 * 计算情景推演 - 价格下跌后的状态
 * @param {number} dropPercent - 下跌百分比（5或10）
 * @param {object} trendScore - 趋势强度评分
 * @param {object} riskAssessment - 风险评估
 * @param {object} strategyFit - 策略适配分析
 * @returns {object} 情景推演结果
 */
function simulatePriceDrop(dropPercent, trendScore, riskAssessment, strategyFit) {
    // 1. 计算风险变化
    // 原始风险得分
    const baseRiskScore = riskAssessment.overallRisk.overallScore;

    // 下跌5%：风险得分增加约15-25分
    // 下跌10%：风险得分增加约30-40分
    const riskIncrease = dropPercent === 5 ? 20 : 35;
    const newRiskScore = Math.min(100, baseRiskScore + riskIncrease);

    // 确定风险变化等级
    let riskChangeLevel;
    if (newRiskScore >= 70) {
        riskChangeLevel = RiskChangeLevel.HIGH_RISK;
    } else if (newRiskScore >= 45) {
        riskChangeLevel = RiskChangeLevel.ATTENTION;
    } else {
        riskChangeLevel = RiskChangeLevel.CONTROLLED;
    }

    // 2. 判断策略是否需要调整
    // 下跌时，趋势跟随和波段交易策略适配度会下降
    // 抄底反弹策略适配度可能上升（如果下跌足够）
    let needAdjust = false;
    let adjustReason = '';

    if (strategyFit.trendFollowing.level === StrategyFitLevel.SUITABLE) {
        needAdjust = true;
        adjustReason = '趋势跟随策略需要重新评估，趋势可能已破坏';
    }

    if (dropPercent >= 10) {
        needAdjust = true;
        adjustReason += adjustReason ? '；' : '';
        adjustReason += '大幅下跌可能改变市场结构，建议全面审视策略';
    }

    // 3. 仓位应对建议
    let positionAction;
    if (dropPercent >= 10) {
        positionAction = PositionAction.REDUCE;
    } else if (dropPercent >= 5 && baseRiskScore >= 50) {
        positionAction = PositionAction.REDUCE;
    } else if (dropPercent >= 5 && strategyFit.dipBuying.level === StrategyFitLevel.SUITABLE) {
        positionAction = PositionAction.MAINTAIN;  // 抄底机会，保持仓位
    } else {
        positionAction = PositionAction.MAINTAIN;
    }

    return {
        scenario: `下跌${dropPercent}%`,
        dropPercent: dropPercent,
        riskChangeLevel: riskChangeLevel,
        newRiskScore: newRiskScore,
        riskIncrease: riskIncrease,
        needAdjust: needAdjust,
        adjustReason: adjustReason || '当前策略仍可继续观察',
        positionAction: positionAction
    };
}

/**
 * 计算情景推演 - 价格上涨后的状态
 * @param {number} risePercent - 上涨百分比（5）
 * @param {object} trendScore - 趋势强度评分
 * @param {object} riskAssessment - 风险评估
 * @param {object} strategyFit - 策略适配分析
 * @returns {object} 情景推演结果
 */
function simulatePriceRise(risePercent, trendScore, riskAssessment, strategyFit) {
    // 1. 计算风险变化
    // 上涨5%：风险得分可能略降或保持（趋势明确）
    // 但如果已经处于高位，风险可能增加
    const baseRiskScore = riskAssessment.overallRisk.overallScore;
    const trendStrength = trendScore.overall;

    let newRiskScore;
    let riskIncrease = 0;

    if (trendStrength >= 60) {
        // 强势上涨，风险可能略降
        newRiskScore = Math.max(0, baseRiskScore - 10);
        riskIncrease = -10;
    } else {
        // 弱势上涨，风险保持
        newRiskScore = baseRiskScore;
        riskIncrease = 0;
    }

    // 确定风险变化等级
    let riskChangeLevel;
    if (newRiskScore >= 70) {
        riskChangeLevel = RiskChangeLevel.HIGH_RISK;
    } else if (newRiskScore >= 45) {
        riskChangeLevel = RiskChangeLevel.ATTENTION;
    } else {
        riskChangeLevel = RiskChangeLevel.CONTROLLED;
    }

    // 2. 判断策略是否需要调整
    let needAdjust = false;
    let adjustReason = '';

    // 上涨时，趋势跟随策略适配度上升
    // 抄底反弹策略适配度下降
    if (strategyFit.dipBuying.level === StrategyFitLevel.SUITABLE) {
        needAdjust = true;
        adjustReason = '抄底策略窗口已关闭，建议切换至趋势跟随策略';
    }

    // 3. 仓位应对建议
    let positionAction;
    if (trendStrength >= 65 && baseRiskScore < 50) {
        positionAction = PositionAction.CAUTIOUS_INCREASE;  // 强势可适当加仓
    } else if (trendStrength >= 55) {
        positionAction = PositionAction.MAINTAIN;
    } else {
        positionAction = PositionAction.MAINTAIN;
    }

    return {
        scenario: `上涨${risePercent}%`,
        risePercent: risePercent,
        riskChangeLevel: riskChangeLevel,
        newRiskScore: newRiskScore,
        riskIncrease: riskIncrease,
        needAdjust: needAdjust,
        adjustReason: adjustReason || '当前策略继续适用',
        positionAction: positionAction
    };
}

/**
 * 执行所有情景推演
 * @param {object} trendScore - 趋势强度评分
 * @param {object} riskAssessment - 风险评估
 * @param {object} strategyFit - 策略适配分析
 * @returns {object} 所有情景推演结果
 */
function runAllSimulations(trendScore, riskAssessment, strategyFit) {
    const drop5 = simulatePriceDrop(5, trendScore, riskAssessment, strategyFit);
    const drop10 = simulatePriceDrop(10, trendScore, riskAssessment, strategyFit);
    const rise5 = simulatePriceRise(5, trendScore, riskAssessment, strategyFit);

    return {
        drop5: drop5,
        drop10: drop10,
        rise5: rise5
    };
}

/**
 * 生成情景应对原则说明
 * @param {object} simulation - 单个情景推演结果
 * @param {object} currentRisk - 当前风险评估
 * @returns {string} 应对原则说明
 */
function generateScenarioPrinciple(simulation, currentRisk) {
    let principle = '';

    // 根据情景类型生成说明
    if (simulation.dropPercent) {
        // 下跌情景
        if (simulation.dropPercent >= 10) {
            principle += '【大跌应对】' + simulation.dropPercent + '%的下跌属于较大幅度调整，';
            if (simulation.positionAction === PositionAction.REDUCE) {
                principle += '建议及时降低仓位控制风险，';
                if (currentRisk.overallRisk.level === 'high') {
                    principle += '当前风险已高，应优先保本，等待市场企稳信号。';
                } else {
                    principle += '观察后续走势，不盲目抄底。';
                }
            } else {
                principle += '当前策略适配度尚可，可保持观察，但需设置好止损。';
            }
        } else {
            principle += '【小幅下跌应对】' + simulation.dropPercent + '%的下跌属于正常波动，';
            if (simulation.riskChangeLevel === RiskChangeLevel.CONTROLLED) {
                principle += '风险仍在可控范围，';
                if (simulation.positionAction === PositionAction.MAINTAIN) {
                    principle += '建议保持当前仓位，冷静观察，避免情绪化操作。';
                } else {
                    principle += '可根据策略适配度适当调整。';
                }
            } else {
                principle += '需关注风险是否进一步累积，建议做好风险预案。';
            }
        }
    } else {
        // 上涨情景
        principle += '【上涨应对】价格上涨' + simulation.risePercent + '%，';
        if (simulation.positionAction === PositionAction.CAUTIOUS_INCREASE) {
            principle += '趋势强度确认，可在风险可控前提下适当加仓跟随趋势。';
        } else if (simulation.positionAction === PositionAction.MAINTAIN) {
            principle += '建议保持现有仓位，注意不要因上涨而盲目追高。';
        } else {
            principle += '建议保持谨慎，关注持续性。';
        }
    }

    return principle;
}

/**
 * 获取风险变化等级的中文文本
 * @param {string} level - 风险变化等级
 * @returns {string} 中文文本
 */
function getRiskChangeLevelText(level) {
    switch (level) {
        case RiskChangeLevel.CONTROLLED:
            return '可控';
        case RiskChangeLevel.ATTENTION:
            return '注意';
        case RiskChangeLevel.HIGH_RISK:
            return '高风险';
        default:
            return '未知';
    }
}

/**
 * 获取仓位应对建议的中文文本
 * @param {string} action - 仓位应对建议
 * @returns {string} 中文文本
 */
function getPositionActionText(action) {
    switch (action) {
        case PositionAction.REDUCE:
            return '减少';
        case PositionAction.MAINTAIN:
            return '保持';
        case PositionAction.CAUTIOUS_INCREASE:
            return '谨慎增加';
        default:
            return '未知';
    }
}

/**
 * 渲染市场状态概览
 */
function renderMarketOverview() {
    const indices = [
        { ...marketData.shanghai, elementId: 'shanghai-index' },
        { ...marketData.shenzhen, elementId: 'shenzhen-index' },
        { ...marketData.chiNext, elementId: 'chinext-index' }
    ];

    indices.forEach(index => {
        const element = document.getElementById(index.elementId);
        if (!element) return;

        const changeClass = index.change > 0 ? 'up' : index.change < 0 ? 'down' : 'flat';
        const changeSign = index.change > 0 ? '+' : '';

        element.innerHTML = `
            <div class="index-info">
                <span class="index-name">${index.name}</span>
                <span class="index-value">${index.value.toFixed(2)}</span>
            </div>
            <div class="index-change">
                <div class="change-value ${changeClass}">${changeSign}${index.change.toFixed(2)}</div>
                <div class="change-percent ${changeClass}">${changeSign}${index.changePercent.toFixed(2)}%</div>
            </div>
        `;
    });

    // 渲染成交量
    const volumeElement = document.getElementById('total-volume');
    if (volumeElement) {
        volumeElement.textContent = marketData.volume;
    }
}

/**
 * 渲染趋势强度评分（从后端 API 获取真实数据）
 */
async function renderTrendScore() {
    // 显示加载状态
    setTrendScoreLoading(true);

    try {
        // 从 API 获取趋势评分数据
        const apiData = await ApiService.getTrendScore('sh000001');

        // 渲染综合评分
        const overallElement = document.getElementById('overall-score');
        if (overallElement) {
            const score = apiData.overall.score;
            const scoreClass = score >= 60 ? 'up' : score <= 40 ? 'down' : '';
            overallElement.textContent = score;
            overallElement.className = 'score-value ' + scoreClass;
        }

        // 渲染各子因子得分（使用后端返回的数据）
        renderFactorScore('direction', apiData.components.trendDirection.score, '趋势方向');
        renderFactorScore('momentum', apiData.components.momentum.score, '趋势动能');
        renderFactorScore('stability', apiData.components.stability.score, '稳定性');

        // 渲染解释说明
        const explanationElement = document.getElementById('score-explanation');
        if (explanationElement) {
            explanationElement.textContent = apiData.recommendation || generateScoreExplanationFromAPI(apiData);
        }

        console.log('[趋势评分] 数据加载成功:', apiData);

    } catch (error) {
        console.error('[趋势评分] 加载失败:', error);
        // 降级到本地计算
        renderTrendScoreFallback();
    } finally {
        // 移除加载状态
        setTrendScoreLoading(false);
    }
}

/**
 * 设置趋势评分加载状态
 */
function setTrendScoreLoading(isLoading) {
    const overallElement = document.getElementById('overall-score');
    if (overallElement) {
        if (isLoading) {
            overallElement.textContent = '...';
            overallElement.classList.add('loading');
        } else {
            overallElement.classList.remove('loading');
        }
    }
}

/**
 * 降级方案：使用本地计算的评分
 */
function renderTrendScoreFallback() {
    console.warn('[趋势评分] 使用本地计算作为降级方案');
    const scores = calculateTrendScore(priceData);

    const overallElement = document.getElementById('overall-score');
    if (overallElement) {
        const scoreClass = scores.overall >= 60 ? 'up' : scores.overall <= 40 ? 'down' : '';
        overallElement.textContent = scores.overall;
        overallElement.className = 'score-value ' + scoreClass;
    }

    renderFactorScore('direction', scores.direction, '趋势方向');
    renderFactorScore('momentum', scores.momentum, '趋势动能');
    renderFactorScore('stability', scores.stability, '稳定性');

    const explanationElement = document.getElementById('score-explanation');
    if (explanationElement) {
        explanationElement.textContent = generateScoreExplanation(scores) + ' (使用本地计算)';
    }
}

/**
 * 从 API 数据生成评分说明
 */
function generateScoreExplanationFromAPI(apiData) {
    let explanation = '';

    const { overall, components } = apiData;

    // 总体评价
    if (overall.score >= 70) {
        explanation += '当前趋势强度较强。';
    } else if (overall.score >= 50) {
        explanation += '当前趋势强度中等。';
    } else {
        explanation += '当前趋势强度偏弱。';
    }

    // 使用后端返回的原因说明
    explanation += components.trendDirection.reason + '；';
    explanation += components.momentum.reason + '；';
    explanation += components.stability.reason + '。';

    return explanation;
}

/**
 * 渲染单个因子得分
 * @param {string} factorId - 因子ID
 * @param {number} score - 得分
 * @param {string} label - 标签
 */
function renderFactorScore(factorId, score, label) {
    // 渲染因子得分条
    const barElement = document.getElementById(`factor-${factorId}-bar`);
    if (barElement) {
        barElement.style.width = score + '%';
        // 根据得分设置颜色类型
        const type = score >= 60 ? 'bullish' : score <= 40 ? 'bearish' : 'neutral';
        barElement.className = 'progress-fill ' + type;
    }

    // 渲染因子得分值
    const valueElement = document.getElementById(`factor-${factorId}-value`);
    if (valueElement) {
        valueElement.textContent = score;
    }
}

/**
 * 渲染风险提示（从后端 API 获取真实数据）
 */
async function renderRiskAlert() {
    // 显示加载状态
    setRiskLoading(true);

    try {
        // 从 API 获取风险评分数据
        const apiData = await ApiService.getRiskScore('sh000001');

        // 渲染总体风险等级
        const riskBadge = document.getElementById('risk-badge');
        if (riskBadge) {
            riskBadge.textContent = apiData.overall.levelText;
            riskBadge.className = 'risk-badge ' + apiData.overall.level;
        }

        // 渲染各风险指标得分（使用后端返回的数据）
        renderRiskIndicator('maxDrawdown', apiData.indicators.maxDrawdown.score);
        renderRiskIndicator('volatility', apiData.indicators.volatility.score);
        renderRiskIndicator('trendDecay', apiData.indicators.anomaly.score);

        // 渲染风险说明（使用后端返回的建议）
        const explanationElement = document.getElementById('risk-explanation');
        if (explanationElement) {
            explanationElement.textContent = generateRiskExplanationFromAPI(apiData);
        }

        console.log('[风险评分] 数据加载成功:', apiData);

    } catch (error) {
        console.error('[风险评分] 加载失败:', error);
        // 降级到本地计算
        renderRiskAlertFallback();
    } finally {
        // 移除加载状态
        setRiskLoading(false);
    }
}

/**
 * 设置风险评分加载状态
 */
function setRiskLoading(isLoading) {
    const riskBadge = document.getElementById('risk-badge');
    if (riskBadge) {
        if (isLoading) {
            riskBadge.textContent = '...';
            riskBadge.classList.add('loading');
        } else {
            riskBadge.classList.remove('loading');
        }
    }
}

/**
 * 降级方案：使用本地计算的评分
 */
function renderRiskAlertFallback() {
    console.warn('[风险评分] 使用本地计算作为降级方案');
    const riskAssessment = calculateRiskAssessment(priceData);

    // 渲染总体风险等级
    const riskBadge = document.getElementById('risk-badge');
    if (riskBadge) {
        riskBadge.textContent = riskAssessment.overallRisk.levelText;
        riskBadge.className = 'risk-badge ' + riskAssessment.overallRisk.level;
    }

    // 渲染各风险指标得分
    renderRiskIndicator('maxDrawdown', riskAssessment.maxDrawdown);
    renderRiskIndicator('volatility', riskAssessment.volatility);
    renderRiskIndicator('trendDecay', riskAssessment.trendDecay);

    // 渲染风险说明
    const explanationElement = document.getElementById('risk-explanation');
    if (explanationElement) {
        const riskScores = {
            maxDrawdown: riskAssessment.maxDrawdown,
            volatility: riskAssessment.volatility,
            trendDecay: riskAssessment.trendDecay
        };
        explanationElement.textContent = generateRiskExplanation(riskScores, riskAssessment.overallRisk) + ' (使用本地计算)';
    }
}

/**
 * 从 API 数据生成风险说明
 */
function generateRiskExplanationFromAPI(apiData) {
    let explanation = '';

    const { overall, indicators } = apiData;

    // 总体风险评价
    if (overall.level === 'high') {
        explanation += '当前市场风险较高，建议谨慎操作。';
    } else if (overall.level === 'medium') {
        explanation += '当前市场风险适中，可适度参与。';
    } else {
        explanation += '当前市场风险较低，环境相对稳定。';
    }

    // 使用后端返回的原因说明
    explanation += indicators.volatility.reason + '；';
    explanation += indicators.maxDrawdown.reason + '；';
    explanation += indicators.anomaly.reason + '。';

    // 添加后端的综合建议
    if (apiData.advice) {
        explanation += ' ' + apiData.advice;
    }

    return explanation;
}

/**
 * 渲染单个风险指标
 * @param {string} indicatorId - 指标ID
 * @param {number} score - 风险得分
 */
function renderRiskIndicator(indicatorId, score) {
    // 渲染风险进度条
    const barElement = document.getElementById(`risk-${indicatorId}-bar`);
    if (barElement) {
        barElement.style.width = score + '%';
        // 根据风险得分设置颜色类型（分数越高风险越大，用红色表示）
        const type = score >= 60 ? 'high-risk' : score >= 35 ? 'medium-risk' : 'low-risk';
        barElement.className = 'risk-bar-fill ' + type;
    }

    // 渲染风险得分值
    const valueElement = document.getElementById(`risk-${indicatorId}-value`);
    if (valueElement) {
        valueElement.textContent = score;
    }
}

/**
 * 渲染策略适配分析
 */
function renderStrategyFit() {
    // 获取趋势强度和风险评估
    const trendScore = calculateTrendScore(priceData);
    const riskAssessment = calculateRiskAssessment(priceData);

    // 计算策略适配度
    const strategyFit = calculateStrategyFit(trendScore, riskAssessment);

    // 渲染各策略适配度
    renderSingleStrategy('trend-following', strategyFit.trendFollowing);
    renderSingleStrategy('swing-trading', strategyFit.swingTrading);
    renderSingleStrategy('dip-buying', strategyFit.dipBuying);

    // 渲染操作风格建议
    const adviceElement = document.getElementById('operation-advice');
    if (adviceElement) {
        adviceElement.textContent = generateOperationAdvice(strategyFit, riskAssessment);
    }
}

/**
 * 渲染单个策略适配度
 * @param {string} strategyId - 策略ID
 * @param {object} fitResult - 适配度结果
 */
function renderSingleStrategy(strategyId, fitResult) {
    // 渲染适配度等级标签
    const badgeElement = document.getElementById(`strategy-${strategyId}-badge`);
    if (badgeElement) {
        badgeElement.textContent = getFitLevelText(fitResult.level);
        badgeElement.className = 'strategy-fit-badge ' + fitResult.level;
    }

    // 渲染适配度得分条
    const barElement = document.getElementById(`strategy-${strategyId}-bar`);
    if (barElement) {
        barElement.style.width = fitResult.score + '%';
        barElement.className = 'strategy-fit-bar ' + fitResult.level;
    }

    // 渲染适配度得分值
    const scoreElement = document.getElementById(`strategy-${strategyId}-score`);
    if (scoreElement) {
        scoreElement.textContent = fitResult.score;
    }

    // 渲染原因说明
    const reasonElement = document.getElementById(`strategy-${strategyId}-reason`);
    if (reasonElement) {
        reasonElement.textContent = fitResult.reason;
    }
}

/**
 * 渲染情景推演
 */
function renderSimulation() {
    // 获取趋势强度、风险评估和策略适配
    const trendScore = calculateTrendScore(priceData);
    const riskAssessment = calculateRiskAssessment(priceData);
    const strategyFit = calculateStrategyFit(trendScore, riskAssessment);

    // 执行情景推演
    const simulations = runAllSimulations(trendScore, riskAssessment, strategyFit);

    // 渲染各情景
    renderSingleScenario('drop5', simulations.drop5, riskAssessment);
    renderSingleScenario('drop10', simulations.drop10, riskAssessment);
    renderSingleScenario('rise5', simulations.rise5, riskAssessment);
}

/**
 * 渲染单个情景推演
 * @param {string} scenarioId - 情景ID
 * @param {object} simulation - 情景推演结果
 * @param {object} currentRisk - 当前风险评估
 */
function renderSingleScenario(scenarioId, simulation, currentRisk) {
    // 渲染情景标题
    const titleElement = document.getElementById(`scenario-${scenarioId}-title`);
    if (titleElement) {
        titleElement.textContent = simulation.scenario;
    }

    // 渲染风险变化等级
    const riskLevelElement = document.getElementById(`scenario-${scenarioId}-risk-level`);
    if (riskLevelElement) {
        riskLevelElement.textContent = getRiskChangeLevelText(simulation.riskChangeLevel);
        riskLevelElement.className = 'scenario-risk-level ' + simulation.riskChangeLevel;
    }

    // 渲染风险得分变化
    const riskChangeElement = document.getElementById(`scenario-${scenarioId}-risk-change`);
    if (riskChangeElement) {
        const sign = simulation.riskIncrease >= 0 ? '+' : '';
        riskChangeElement.textContent = `${sign}${simulation.riskIncrease}`;
        riskChangeElement.className = simulation.riskIncrease > 0 ? 'risk-increase' :
                                      simulation.riskIncrease < 0 ? 'risk-decrease' : 'risk-unchanged';
    }

    // 渲染策略调整提示
    const adjustElement = document.getElementById(`scenario-${scenarioId}-adjust`);
    if (adjustElement) {
        adjustElement.textContent = simulation.needAdjust ? '需要调整' : '无需调整';
        adjustElement.className = 'scenario-adjust ' + (simulation.needAdjust ? 'need-adjust' : 'no-adjust');
    }

    // 渲染仓位应对建议
    const positionElement = document.getElementById(`scenario-${scenarioId}-position`);
    if (positionElement) {
        positionElement.textContent = getPositionActionText(simulation.positionAction);
        positionElement.className = 'scenario-position ' + simulation.positionAction;
    }

    // 渲染应对原则说明
    const principleElement = document.getElementById(`scenario-${scenarioId}-principle`);
    if (principleElement) {
        principleElement.textContent = generateScenarioPrinciple(simulation, currentRisk);
    }

    // 渲染策略调整原因
    const reasonElement = document.getElementById(`scenario-${scenarioId}-reason`);
    if (reasonElement) {
        reasonElement.textContent = simulation.adjustReason;
    }
}

/**
 * 初始化应用
 */
async function initApp() {
    // 初始化 Pro 状态（异步，从后端同步）
    await initProState();

    renderMarketOverview();

    // 异步加载趋势评分数据
    await renderTrendScore();

    // 异步加载风险评分数据
    await renderRiskAlert();

    renderStrategyFit();
    renderSimulation();

    // 更新 Pro 模块显示状态
    updateProModuleStates();
}

// ===================================
// 搜索功能
// ===================================

/**
 * 搜索处理函数
 * @param {string} query - 搜索关键词
 */
function handleSearch(query) {
    const clearBtn = document.getElementById('search-clear-btn');
    const cards = document.querySelectorAll('.card');
    const trimmedQuery = query.trim().toLowerCase();

    // 显示/隐藏清除按钮
    if (clearBtn) {
        clearBtn.style.display = trimmedQuery ? 'flex' : 'none';
    }

    // 清空搜索时恢复所有卡片
    if (!trimmedQuery) {
        cards.forEach(card => {
            card.classList.remove('search-hidden', 'search-highlight-card');
        });
        clearSearchHighlight();
        return;
    }

    // 清除之前的高亮
    clearSearchHighlight();

    // 搜索匹配的卡片
    let matchCount = 0;

    cards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        const isMatch = cardText.includes(trimmedQuery);

        if (isMatch) {
            card.classList.remove('search-hidden');
            card.classList.add('search-highlight-card');
            // 高亮匹配文字
            highlightText(card, trimmedQuery);
            matchCount++;
        } else {
            card.classList.add('search-hidden');
            card.classList.remove('search-highlight-card');
        }
    });

    // 记录搜索事件
    if (trimmedQuery) {
        trackProEvent('search', {
            query: trimmedQuery,
            matchCount: matchCount
        });
    }
}

/**
 * 高亮匹配的文字
 * @param {HTMLElement} element - 要搜索的元素
 * @param {string} query - 搜索关键词
 */
function highlightText(element, query) {
    const textNodes = getTextNodes(element);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');

    textNodes.forEach(node => {
        const fragment = document.createDocumentFragment();
        let lastIdx = 0;
        let match;

        const text = node.textContent;
        while ((match = regex.exec(text)) !== null) {
            // 添加匹配前的文本
            fragment.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));

            // 添加高亮的文本
            const highlight = document.createElement('span');
            highlight.className = 'search-highlight';
            highlight.textContent = match[0];
            fragment.appendChild(highlight);

            lastIdx = match.index + match[0].length;
        }

        // 添加剩余的文本
        fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
        node.parentNode.replaceChild(fragment, node);
    });
}

/**
 * 获取所有文本节点
 * @param {HTMLElement} element - 父元素
 * @returns {Array<Text>} 文本节点数组
 */
function getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while (node = walker.nextNode()) {
        if (node.textContent.trim() && node.parentElement.tagName !== 'SCRIPT' && node.parentElement.tagName !== 'STYLE') {
            textNodes.push(node);
        }
    }

    return textNodes;
}

/**
 * 清除搜索高亮
 */
function clearSearchHighlight() {
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        // 合并相邻的文本节点
        parent.normalize();
    });

    // 清除卡片高亮样式
    document.querySelectorAll('.search-highlight-card').forEach(card => {
        card.classList.remove('search-highlight-card');
    });
}

/**
 * 清除搜索
 */
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        handleSearch('');
        searchInput.focus();
    }
}

/**
 * 转义正则特殊字符
 * @param {string} string - 要转义的字符串
 * @returns {string} 转义后的字符串
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 可搜索的内容索引（用于搜索提示）
 */
const searchIndex = {
    strategies: ['趋势跟随', '波段交易', '抄底反弹', '趋势跟随策略', '波段交易策略', '抄底反弹策略'],
    indicators: ['趋势强度', '风险评估', '最大回撤', '波动率', '趋势衰减', '趋势方向', '趋势动能', '稳定性'],
    riskLevels: ['高风险', '中等风险', '低风险'],
    scenarios: ['下跌5%', '下跌10%', '上涨5%', '情景推演', '应对方案'],
    factors: ['均线', 'MACD', 'KDJ', '成交量', '换手率', '市盈率', '市净率']
};

// ===================================
// 搜索功能（输入防抖）
// ===================================

let searchTimer = null;
const SEARCH_DEBOUNCE_MS = 300;

function handleSearchDebounced(query) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        handleSearch(query);
    }, SEARCH_DEBOUNCE_MS);
}

// 重写 HTML 中的 oninput 事件处理
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.removeEventListener('oninput', handleSearch);
        searchInput.addEventListener('input', (e) => {
            handleSearchDebounced(e.target.value);
        });
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);
