# 量化分析辅助决策平台

一个数据驱动的股票量化分析平台，提供趋势强度评分、风险评估、策略适配分析等功能。

## 项目特点

- **前后端一体**: 单一服务同时提供前端页面和后端API
- **开箱即用**: 无需额外配置即可本地开发
- **可扩展架构**: 支持MySQL持久化存储
- **云平台就绪**: 支持主流云平台一键部署

## 功能特性

- 📊 **市场状态概览**: 实时显示三大指数行情
- 📈 **趋势强度评分**: 多因子量化评分（方向、动能、稳定性）
- ⚡ **风险评估**: 最大回撤、波动率、趋势衰减分析
- 🎯 **策略适配分析**: 趋势跟随、波段交易、抄底反弹策略推荐
- 🔮 **情景推演**: What-if 模拟不同市场情景的应对方案
- 👤 **用户系统**: 注册登录、Pro 功能订阅

## 快速开始

### 本地开发

```bash
# 1. 安装依赖
cd backend
npm install

# 2. 启动服务
npm start

# 3. 访问应用
# 前端: http://localhost:3000
# API: http://localhost:3000/api/health
```

### Docker 部署

```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh && ./deploy.sh
```

### 云平台部署

#### Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/your-repo)

#### Render
[![Deploy on Render](https://render.com/images/deploy-on-render-button.svg)](https://render.com/deploy)

#### Heroku
```bash
# 安装 Heroku CLI
heroku create your-app-name
heroku buildpacks:set heroku/nodejs
git push heroku main
```

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| DB_HOST | 数据库地址 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| DB_USER | 数据库用户 | root |
| DB_PASSWORD | 数据库密码 | - |
| DB_NAME | 数据库名称 | quant_analysis |
| JWT_SECRET | JWT密钥 | - |

## 技术栈

**前端**:
- 原生 HTML/CSS/JavaScript
- 响应式设计

**后端**:
- Node.js + Express
- MySQL 8.0
- JWT 认证
- bcryptjs 密码加密

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/health | GET | 健康检查 |
| /api/market-data | GET | 获取K线数据 |
| /api/trend/trend-score | GET | 趋势评分 |
| /api/risk/score | GET | 风险评分 |
| /api/user/register | POST | 用户注册 |
| /api/user/login | POST | 用户登录 |
| /api/user/pro-status | GET | Pro状态 |

## 部署指南

详细部署文档请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## License

MIT
