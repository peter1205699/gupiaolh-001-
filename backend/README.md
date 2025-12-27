# 量化分析后端服务

最小可运行的 Node.js 后端服务，适合编程小白。

## 目录结构

```
backend/
├── server.js           # 服务入口文件
├── package.json        # 项目配置
├── .env                # 环境变量
└── routes/             # API 路由
    ├── market.js       # 市场数据接口
    └── trend.js        # 趋势分析接口
```

## 快速启动（3步）

### 第1步：安装依赖

在 backend 目录下打开命令行，运行：

```bash
npm install
```

### 第2步：启动服务

```bash
npm start
```

### 第3步：测试接口

在浏览器打开：
- http://localhost:3000
- http://localhost:3000/api/health

或使用 curl 测试：
```bash
curl http://localhost:3000/api/health
```

## API 接口列表

| 接口 | 方法 | 说明 | 示例 |
|------|------|------|------|
| `/` | GET | 服务信息 | http://localhost:3000/ |
| `/api/health` | GET | 健康检查 | http://localhost:3000/api/health |
| `/api/market/data` | GET | 获取K线数据 | ?symbol=600000&days=50 |
| `/api/market/quote` | GET | 获取实时行情 | ?symbol=600000 |
| `/api/trend/score` | GET | 获取趋势评分 | ?symbol=600000 |

## 接口示例

### 1. 健康检查
```bash
curl http://localhost:3000/api/health
```

返回：
```json
{
  "status": "ok",
  "message": "量化分析后端服务运行正常",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. 获取K线数据
```bash
curl "http://localhost:3000/api/market/data?symbol=600000&days=30"
```

### 3. 获取趋势评分
```bash
curl "http://localhost:3000/api/trend/score?symbol=600000"
```

返回：
```json
{
  "success": true,
  "data": {
    "symbol": "600000",
    "score": 65,
    "riskLevel": "中风险",
    "recommendation": "趋势偏强，可适量参与",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## 常见问题

### Q: 端口 3000 被占用怎么办？
A: 修改 `.env` 文件中的 `PORT=3000` 为其他端口，如 `PORT=8080`

### Q: 如何停止服务？
A: 在命令行按 `Ctrl + C`

### Q: 数据是真实的吗？
A: 当前是模拟数据，用于测试。后续可接入真实数据源。

## 扩展开发

### 添加新接口

1. 在 `routes/` 目录创建新文件，如 `user.js`：

```javascript
const express = require('express');
const router = express.Router();

router.get('/info', (req, res) => {
    res.json({ name: '测试用户' });
});

module.exports = router;
```

2. 在 `server.js` 中注册：

```javascript
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);
```

3. 重启服务即可使用新接口。

## 技术栈

- Node.js - JavaScript 运行环境
- Express - Web 框架
- CORS - 跨域支持

## 下一步

- 接入真实行情数据源
- 添加用户认证
- 添加数据库支持
- 部署到云服务器
