# 趋势分析 API 使用指南

## 概述

这是一个最小可用的行情分析 API，提供股票/指数的趋势评分、技术指标计算等功能。

## 安装和启动

```bash
cd backend
npm install
npm start
```

服务将在 `http://localhost:3000` 启动。

## API 接口

### 1. 获取趋势评分

**接口**: `GET /api/trend/trend-score`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码 (600000, 000001, sh600000, sz000001) |
| short | number | 否 | 短期均线周期 (默认 5) |
| long | number | 否 | 长期均线周期 (默认 20) |

**示例**:
```bash
# 分析浦发银行
curl "http://localhost:3000/api/trend/trend-score?symbol=600000"

# 自定义均线周期
curl "http://localhost:3000/api/trend/trend-score?symbol=000001&short=10&long=30"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "symbol": "sh600000",
    "score": 68,
    "riskLevel": "medium",
    "trendDirection": {
      "score": 72,
      "signal": "bullish",
      "shortMA": 10.25,
      "longMA": 9.85,
      "maDifference": 4.06,
      "shortSlope": 1.25,
      "longSlope": 0.85
    },
    "momentum": {
      "score": 65,
      "signal": "bullish",
      "shortMomentum": 3.2,
      "longMomentum": 8.5,
      "rsi": 58.3,
      "analysis": "正向动能，趋势向好"
    },
    "volatility": {
      "score": 60,
      "volatility": {
        "daily": 1.85,
        "annualized": 29.35
      },
      "level": "medium",
      "avgReturn": 0.12,
      "analysis": "波动率适中(29.4%)，价格有一定波动，属正常范围"
    },
    "recommendation": "趋势偏强，可适量参与",
    "latestPrice": 10.45,
    "latestDate": "2024-01-15",
    "dataPoints": 95,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. 批量获取趋势评分

**接口**: `GET /api/trend/trend-score/batch`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbols | string | 是 | 股票代码列表，逗号分隔 |

**示例**:
```bash
curl "http://localhost:3000/api/trend/trend-score/batch?symbols=600000,000001,600519"
```

### 3. 获取K线数据

**接口**: `GET /api/trend/market/data`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码 |
| limit | number | 否 | 返回条数 (默认 100) |

**示例**:
```bash
curl "http://localhost:3000/api/trend/market/data?symbol=600000&limit=50"
```

### 4. 获取实时行情

**接口**: `GET /api/trend/market/quote`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码 |

**示例**:
```bash
curl "http://localhost:3000/api/trend/market/quote?symbol=600000"
```

### 5. 计算技术指标

**接口**: `GET /api/trend/indicators/:type`

**支持指标**: `sma`, `ema`, `rsi`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码 |
| period | number | 否 | 计算周期 (默认 20) |

**示例**:
```bash
# 计算RSI
curl "http://localhost:3000/api/trend/indicators/rsi?symbol=600000&period=14"

# 计算SMA
curl "http://localhost:3000/api/trend/indicators/sma?symbol=600000&period=20"
```

## 评分体系

### 综合评分 (0-100)

综合评分由三个维度加权计算得出：
- **趋势方向** (45%): 基于均线排列、斜率、价格位置
- **动能** (35%): 基于短期/长期动量、RSI
- **稳定性** (20%): 基于波动率分析

### 风险等级

| 评分范围 | 风险等级 |
|----------|----------|
| 70-100 | 低风险 |
| 40-69 | 中风险 |
| 0-39 | 高风险 |

### 投资建议

| 评分范围 | 建议 |
|----------|------|
| 70+ | 趋势向好，可考虑逢低买入 |
| 55-70 | 趋势偏强，可适量参与 |
| 45-55 | 方向不明，建议观望 |
| 30-45 | 趋势转弱，注意风险 |
| <30 | 趋势疲弱，建议回避 |

## 数据源

- **主数据源**: 新浪财经 API (免费、无需认证)
- **备用方案**: 当主数据源失败时，使用模拟数据（仅用于开发测试）

## 股票代码格式

支持以下格式：
- `600000` - 自动识别为上海市场 (sh600000)
- `000001` - 自动识别为深圳市场 (sz000001)
- `sh600000` - 明确指定上海市场
- `sz000001` - 明确指定深圳市场

## 缓存机制

K线数据缓存 5 分钟，避免频繁请求。

## 扩展性

代码结构清晰，易于扩展：
- `services/marketDataService.js` - 数据获取服务
- `services/indicators.js` - 技术指标计算
- `routes/trend.js` - API 路由

可以轻松添加：
- 新的技术指标
- 其他数据源
- 更复杂的评分模型

## 注意事项

1. 本 API 使用免费数据源，可能有延迟
2. 模拟数据仅用于开发测试
3. 生产环境建议使用专业数据源
4. 不构成投资建议，仅供参考

## 错误处理

所有接口返回统一格式：

**成功**:
```json
{ "success": true, "data": {...} }
```

**失败**:
```json
{ "success": false, "error": "错误信息" }
```
