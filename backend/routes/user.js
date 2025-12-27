/**
 * ===================================
 * 用户管理路由 - MySQL版本
 * ===================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, execute } = require('../database/db');

// JWT 密钥（从环境变量读取）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * POST /api/user/register
 * 用户注册
 */
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证必填字段
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // 检查邮箱是否已存在
        const existingUsers = await query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // 加密密码
        const passwordHash = await bcrypt.hash(password, 10);

        // 生成用户ID
        const userId = Date.now().toString();

        // 创建用户
        await execute(
            'INSERT INTO users (id, username, email, password_hash, subscription_status) VALUES (?, ?, ?, ?, ?)',
            [userId, username, email, passwordHash, 'free']
        );

        // 生成 JWT token
        const token = jwt.sign(
            { userId: userId, email: email },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: userId,
                    username: username,
                    email: email,
                    subscription_status: 'free'
                },
                token: token
            }
        });

    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed: ' + error.message
        });
    }
});

/**
 * POST /api/user/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 验证必填字段
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing email or password'
            });
        }

        // 查找用户
        const users = await query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const user = users[0];

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        // 检查订阅状态
        const now = new Date();
        let isPro = user.subscription_status === 'pro';
        let subscriptionStatus = user.subscription_status;

        // 如果有到期时间且已过期，更新状态
        if (user.subscription_expires_at) {
            const expiresAt = new Date(user.subscription_expires_at);
            if (expiresAt < now) {
                isPro = false;
                subscriptionStatus = 'free';
                // 更新数据库中的状态
                await execute(
                    'UPDATE users SET subscription_status = ? WHERE id = ?',
                    ['free', user.id]
                );
            }
        }

        // 生成 JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email, isPro: isPro },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    subscription_status: subscriptionStatus,
                    subscription_expires_at: user.subscription_expires_at,
                    isPro: isPro
                },
                token: token
            }
        });

    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed: ' + error.message
        });
    }
});

/**
 * GET /api/user/pro-status
 * 检查用户 Pro 状态
 */
router.get('/pro-status', async (req, res) => {
    try {
        // 获取 token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({ isPro: false });
        }

        const token = authHeader.substring(7);

        try {
            // 验证 token
            const decoded = jwt.verify(token, JWT_SECRET);

            // 从数据库查询用户
            const users = await query(
                'SELECT * FROM users WHERE id = ?',
                [decoded.userId]
            );

            if (users.length === 0) {
                return res.json({ isPro: false });
            }

            const user = users[0];

            // 检查订阅是否过期
            let isPro = user.subscription_status === 'pro';
            if (user.subscription_expires_at) {
                const expiresAt = new Date(user.subscription_expires_at);
                if (expiresAt < new Date()) {
                    isPro = false;
                    // 更新数据库状态
                    await execute(
                        'UPDATE users SET subscription_status = ? WHERE id = ?',
                        ['free', user.id]
                    );
                }
            }

            res.json({ isPro: isPro });

        } catch (jwtError) {
            // Token 无效
            res.json({ isPro: false });
        }

    } catch (error) {
        console.error('检查 Pro 状态失败:', error);
        res.json({ isPro: false });
    }
});

module.exports = router;
