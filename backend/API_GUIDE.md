# 行情数据 API 使用说明

## 数据源

使用**新浪财经公开API**（免费、无需认证、国内访问稳定）

## 快速开始

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 启动服务
```bash
npm start
```

### 3. 测试接口
```bash
# 测试K线数据
curl "http://localhost:3000/api/market-data?symbol=600000"

# 测试实时行情
curl "http://localhost:3000/api/market/quote?symbol=600000"
```

## API 接口

### 1. 获取K线数据

**接口**: `GET /api/market-data`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码 |
| limit | number | 否 | 返回条数 |

**股票代码格式**:
- `600000` → 自动识别为上海市场 (sh600000)
- `000001` → 自动识别为深圳市场 (sz000001)
- `300001` → 创业板 (sz300001)

**示例**:
```bash
# 获取浦发银行最近100天K线
curl "http://localhost:3000/api/market-data?symbol=600000"

# 获取平安银行最近30天K线
curl "http://localhost:3000/api/market-data?symbol=000001&limit=30"
```

**返回格式**:
```json
{
  "success": true,
  "data": {
    "symbol": "sh600000",
    "count": 95,
    "kline": [
      {
        "date": "2024-01-01",
        "open": 10.25,
        "high": 10.40,
        "low": 10.15,
        "close": 10.35,
        "volume": 5234120
      },
      ...
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 2. 获取实时行情

**接口**: `GET /api/market/quote`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| symbol | string | 是 | 股票代码 |

**示例**:
```bash
curl "http://localhost:3000/api/market/quote?symbol=600000"
```

**返回格式**:
```json
{
  "success": true,
  "data": {
    "name": "浦发银行",
    "code": "600000",
    "open": 10.25,
    "prevClose": 10.20,
    "price": 10.35,
    "high": 10.40,
    "low": 10.18,
    "bid": 10.34,
    "ask": 10.36,
    "change": 0.15,
    "changePercent": 1.47,
    "volume": 5234120,
    "amount": 54234120.00,
    "date": "2024-01-15",
    "time": "10:30:00"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## K线数据字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| date | string | 日期 (YYYY-MM-DD) |
| open | number | 开盘价 |
| high | number | 最高价 |
| low | number | 最低价 |
| close | number | 收盘价 |
| volume | number | 成交量 |

## 实时行情字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 股票名称 |
| code | string | 股票代码 |
| price | number | 当前价 |
| prevClose | number | 昨收价 |
| change | number | 涨跌额 |
| changePercent | number | 涨跌幅(%) |
| volume | number | 成交量(手) |
| amount | number | 成交额(元) |

## 数据缓存

- K线数据缓存 **5分钟**
- 避免频繁请求同一股票
- 可通过重启服务清除缓存

## 错误处理

### API 失败时

当新浪财经 API 请求失败时，系统会自动返回**模拟数据**，确保接口始终可用。

控制台会显示：
```
[失败] sh600000: timeout
[模拟数据] sh600000
```

## 常用股票代码参考

| 代码 | 名称 | 市场 |
|------|------|------|
| 600000 | 浦发银行 | 上海 |
| 600519 | 贵州茅台 | 上海 |
| 600036 | 招商银行 | 上海 |
| 000001 | 平安银行 | 深圳 |
| 000002 | 万科A | 深圳 |
| 300001 | 特锐德 | 创业板 |
| sh000001 | 上证指数 | 上海 |
| sz399001 | 深证成指 | 深圳 |

## 注意事项

1. **交易时间外**: 非交易时段返回最后收盘数据
2. **数据延迟**: 免费API可能有几秒延迟
3. **请求频率**: 建议控制请求频率，避免被限制
4. **数据仅供参考**: 不构成投资建议

## 扩展开发

### 添加其他技术指标

在 `routes/market.js` 中添加新接口：

```javascript
router.get('/ma', async (req, res) => {
    const { symbol, period = 20 } = req.query;
    const klineData = await dataService.getKLineData(symbol);
    // 计算均线...
    res.json({ success: true, data: maData });
});
```

## 技术栈

- **Node.js** - JavaScript 运行环境
- **Express** - Web 框架
- **Axios** - HTTP 请求
- **新浪财经 API** - 数据源
