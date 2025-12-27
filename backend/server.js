/**
 * ===================================
 * 量化分析网站 - 后端服务
 * ===================================
 * 最小可运行版本
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// 创建应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());           // 允许跨域
app.use(express.json());   // 解析 JSON

// 静态文件服务（支持前端部署）
const path = require('path');
app.use(express.static(path.join(__dirname, '..'), {
    index: ['index.html'],
    setHeaders: (res, filepath) => {
        // 静态资源缓存
        if (filepath.endsWith('.css') || filepath.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// 导入路由
const marketRoutes = require('./routes/market');
const trendRoutes = require('./routes/trend');
const userRoutes = require('./routes/user');
const eventRoutes = require('./routes/event');
const riskRoutes = require('./routes/risk');

// 注册路由
app.use('/api/market', marketRoutes);
app.use('/api/trend', trendRoutes);
app.use('/api/user', userRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/risk', riskRoutes);

// 新浪财经行情接口（直接路由，兼容旧版）
app.get('/api/market-data', async (req, res) => {
    const marketHandler = require('./routes/market');
    req.url = '/market-data?' + new URLSearchParams(req.query);
    marketHandler.stack[0].handle(req, res);
});

// 趋势评分接口（直接路由，兼容旧版）
app.get('/api/trend-score', async (req, res) => {
    const trendHandler = require('./routes/trend');
    req.url = '/trend-score?' + new URLSearchParams(req.query);
    trendHandler.stack[0].handle(req, res);
});

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: '量化分析后端服务运行正常',
        timestamp: new Date().toISOString()
    });
});

// 根路径
app.get('/', (req, res) => {
    res.json({
        name: '量化分析 API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            market: '/api/market/*',
            trend: '/api/trend/*',
            risk: '/api/risk/*',
            user: '/api/user/*',
            event: '/api/event/*'
        }
    });
});

// SPA 路由 fallback（非API请求返回 index.html）
app.get(/^\/(login|register)$/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', `${req.path}.html`));
});

// 所有其他非API请求返回 index.html（支持前端路由）
app.get((req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   量化分析后端服务已启动                ║
║                                        ║
║   地址: http://localhost:${PORT}        ║
║   环境: ${process.env.NODE_ENV || 'development'}                      ║
║                                        ║
║   可用接口:                            ║
║   - GET  /                             ║
║   - GET  /api/health                   ║
║   - GET  /api/market-data?symbol=XXX   ║
║   - GET  /api/market/quote?symbol=XXX  ║
║   - GET  /api/trend/trend-score?s=XXX  ║
║   - GET  /api/trend/trend-score/batch  ║
║   - GET  /api/risk/score?symbol=XXX    ║
║   - GET  /api/risk/score/batch?s=...   ║
║   - POST /api/user/register            ║
║   - POST /api/user/login               ║
║   - GET  /api/user/pro-status          ║
║   - POST /api/event/track              ║
║                                        ║
║   按 Ctrl+C 停止服务                   ║
╚════════════════════════════════════════╝
    `);
});
