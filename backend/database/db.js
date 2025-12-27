/**
 * ===================================
 * 数据库连接模块
 * ===================================
 */

const mysql = require('mysql2/promise');

/**
 * 创建数据库连接池
 */
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quant_analysis',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

/**
 * 测试数据库连接
 */
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('[数据库] 连接成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('[数据库] 连接失败:', error.message);
        return false;
    }
}

/**
 * 执行查询（用于SELECT）
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<Array>} 查询结果
 */
async function query(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('[数据库] 查询失败:', error.message);
        throw error;
    }
}

/**
 * 执行插入/更新/删除
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数数组
 * @returns {Promise<object>} 结果对象
 */
async function execute(sql, params = []) {
    try {
        const [result] = await pool.execute(sql, params);
        return {
            insertId: result.insertId,
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };
    } catch (error) {
        console.error('[数据库] 执行失败:', error.message);
        throw error;
    }
}

/**
 * 关闭连接池
 */
async function closePool() {
    try {
        await pool.end();
        console.log('[数据库] 连接池已关闭');
    } catch (error) {
        console.error('[数据库] 关闭连接池失败:', error.message);
    }
}

// 导出
module.exports = {
    pool,
    query,
    execute,
    testConnection,
    closePool
};
