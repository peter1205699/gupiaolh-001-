/**
 * ===================================
 * 认证功能 - 登录/注册
 * ===================================
 */

// API 基础 URL
const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

/**
 * 显示提示消息
 */
function showMessage(message, type = 'success') {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `auth-message show ${type}`;

        // 3 秒后自动隐藏成功消息
        if (type === 'success') {
            setTimeout(() => {
                messageEl.classList.remove('show');
            }, 3000);
        }
    }
}

/**
 * 设置提交按钮状态
 */
function setSubmitButtonLoading(loading) {
    const btn = document.getElementById('submit-btn');
    if (btn) {
        btn.disabled = loading;
        btn.textContent = loading ? '处理中...' : btn.textContent.replace('处理中...', '登录').replace('处理中...', '注册');
    }
}

/**
 * 处理注册
 */
async function handleRegister(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // 验证密码匹配
    if (password !== confirmPassword) {
        document.getElementById('password-error').classList.add('show');
        showMessage('两次输入的密码不一致', 'error');
        return;
    } else {
        document.getElementById('password-error').classList.remove('show');
    }

    setSubmitButtonLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/user/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            // 保存 token
            localStorage.setItem('auth_token', data.data.token);
            localStorage.setItem('user_info', JSON.stringify(data.data.user));

            showMessage('注册成功！正在跳转...', 'success');

            // 延迟跳转到首页
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1500);
        } else {
            showMessage(data.error || '注册失败，请重试', 'error');
        }
    } catch (error) {
        console.error('注册失败:', error);
        showMessage('网络错误，请检查连接后重试', 'error');
    } finally {
        setSubmitButtonLoading(false);
    }
}

/**
 * 处理登录
 */
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    setSubmitButtonLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            // 保存 token
            localStorage.setItem('auth_token', data.data.token);
            localStorage.setItem('user_info', JSON.stringify(data.data.user));

            showMessage('登录成功！正在跳转...', 'success');

            // 延迟跳转到首页
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1000);
        } else {
            showMessage(data.error || '登录失败，请检查账号密码', 'error');
        }
    } catch (error) {
        console.error('登录失败:', error);
        showMessage('网络错误，请检查连接后重试', 'error');
    } finally {
        setSubmitButtonLoading(false);
    }
}

/**
 * 检查登录状态
 */
function checkAuthStatus() {
    const token = localStorage.getItem('auth_token');
    const userInfo = localStorage.getItem('user_info');

    if (token && userInfo) {
        // 已登录，可以跳转到首页
        const user = JSON.parse(userInfo);
        console.log('当前用户:', user);
        return true;
    }
    return false;
}

/**
 * 退出登录
 */
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    window.location.href = '/login.html';
}

/**
 * 获取当前用户信息
 */
function getCurrentUser() {
    const userInfo = localStorage.getItem('user_info');
    return userInfo ? JSON.parse(userInfo) : null;
}

/**
 * 获取认证 Token
 */
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

/**
 * 更新用户状态栏（用于首页）
 */
function updateUserStatusBar() {
    const token = localStorage.getItem('auth_token');
    const userInfo = localStorage.getItem('user_info');

    const loggedOutSection = document.getElementById('user-logged-out');
    const loggedInSection = document.getElementById('user-logged-in');
    const displayName = document.getElementById('user-display-name');
    const proBadge = document.getElementById('user-pro-badge');

    if (!loggedOutSection || !loggedInSection) {
        return; // 不在首页
    }

    if (token && userInfo) {
        const user = JSON.parse(userInfo);

        // 显示已登录状态
        loggedOutSection.style.display = 'none';
        loggedInSection.style.display = 'flex';

        // 设置用户名
        if (displayName) {
            displayName.textContent = user.username || user.email;
        }

        // 显示 Pro 徽章
        if (proBadge && user.isPro) {
            proBadge.style.display = 'inline-block';
        }

        // 更新全局 isProUser 状态
        if (typeof isProUser !== 'undefined') {
            isProUser = user.isPro || false;
            // 更新 Pro 模块状态
            if (typeof updateProModuleStates === 'function') {
                updateProModuleStates();
            }
        }
    } else {
        // 显示未登录状态
        loggedOutSection.style.display = 'flex';
        loggedInSection.style.display = 'none';
    }
}

// 页面加载时检查
if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('register.html')) {
    // 在登录/注册页面
    if (checkAuthStatus()) {
        // 已登录，跳转到首页
        window.location.href = '/index.html';
    }
}

// 在首页时更新用户状态栏
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    // 页面加载完成后更新用户状态
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateUserStatusBar);
    } else {
        updateUserStatusBar();
    }
}
