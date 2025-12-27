/**
 * ===================================
 * 事件跟踪路由
 * ===================================
 */

const express = require('express');
const router = express.Router();

// 模拟事件数据库
const events = [];

/**
 * POST /api/event/track
 * 记录用户事件
 */
router.post('/track', (req, res) => {
    try {
        const eventData = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ...req.body,
            received_at: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress
        };

        events.push(eventData);

        // 记录日志
        console.log('[事件跟踪]', eventData.action, eventData);

        res.json({
            success: true,
            event_id: eventData.id
        });

    } catch (error) {
        console.error('事件记录失败:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to track event'
        });
    }
});

/**
 * GET /api/event/stats
 * 获取事件统计（仅用于调试）
 */
router.get('/stats', (req, res) => {
    try {
        const stats = {
            total_events: events.length,
            by_action: {},
            recent_events: events.slice(-10)
        };

        // 统计各动作类型数量
        events.forEach(event => {
            const action = event.action || 'unknown';
            stats.by_action[action] = (stats.by_action[action] || 0) + 1;
        });

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('获取事件统计失败:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get event stats'
        });
    }
});

module.exports = router;
