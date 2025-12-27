# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **quantitative stock analysis platform** (量化分析网站) designed to provide structured, data-driven decision support for regular investors. The platform uses technical indicators and quantitative models to analyze market trends, assess risk levels, and recommend strategy fit - without providing direct buy/sell signals.

**Key Philosophy**: Replace emotional judgment with structured indicators. The platform targets future paid users and focuses on trend strength scoring, risk exposure assessment, and strategy adaptation recommendations.

## Technology Stack

### Frontend
- **Native HTML/CSS/JavaScript** - No frontend frameworks (React/Vue/etc.) per project constraints
- All code must be directly runnable and suitable for gradual expansion into a professional platform
- Chinese comments throughout the codebase

### Backend
- **Node.js + Express** - Minimal viable backend service
- **Data Source**: Sina Finance API (free, no authentication required, stable in China)
- Fallback to mock data when API fails (for development/testing)

## Development Commands

### Backend
```bash
cd backend
npm install        # Install dependencies
npm start          # Start server on http://localhost:3000
```

### Testing APIs
```bash
# Health check
curl http://localhost:3000/api/health

# Get K-line data
curl "http://localhost:3000/api/market-data?symbol=600000"

# Get trend score
curl "http://localhost:3000/api/trend-score?symbol=600000"
```

## Architecture

### Directory Structure
```
gupiaolh-001/
├── index.html              # Main application page
├── login.html              # Login page
├── register.html           # Registration page
├── css/
│   └── style.css          # Application styles
├── js/
│   ├── app.js             # Main application logic (quantitative calculations)
│   └── auth.js            # Authentication (login/register/logout)
└── backend/
    ├── server.js          # Express server entry point
    ├── package.json       # Dependencies
    ├── .env               # Environment variables (PORT)
    ├── routes/
    │   ├── market.js      # Market data endpoints
    │   ├── trend.js       # Trend analysis endpoints
    │   ├── user.js        # User authentication endpoints
    │   └── event.js       # Event tracking endpoints
    └── services/
        ├── marketDataService.js  # Data fetching from Sina Finance API
        ├── dataService.js        # Data aggregation service
        └── indicators.js         # Technical indicator calculations
```

### Key Architectural Patterns

#### 1. Quantitative Scoring System (js/app.js)

The core quantitative model calculates trend strength from three weighted components:

- **Trend Direction (40%)**: Short MA vs Long MA relationship
- **Momentum (35%)**: Recent price change (5-day)
- **Stability (25%)**: Price volatility (standard deviation)

Final score (0-100) = `direction * 0.4 + momentum * 0.3 + stability * 0.3`

#### 2. Risk Assessment Module

Risk is calculated from three indicators:
- **Max Drawdown**: Peak-to-trough decline
- **Volatility Risk**: Price standard deviation
- **Trend Decay**: Short-term slope change

Overall risk levels: low (0-34), medium (35-59), high (60-100)

#### 3. Strategy Fit Analysis

Analyzes suitability of three strategies based on current market conditions:
- **Trend Following**: Best for strong trends + low risk
- **Swing Trading**: Best for moderate volatility + consolidation
- **Dip Buying**: Best for significant drawdown + trend decay

#### 4. What-If Simulation (Pro Feature)

Projects how risk/strategy fit changes under different scenarios:
- Price drops 5% or 10%
- Price rises 5%

Provides position sizing advice for each scenario.

#### 5. Pro Feature System

Pro features are locked behind a freemium model:
- **Free users**: See basic trend score and risk level
- **Pro users**: Unlock strategy fit analysis, scenario simulations, and detailed factor breakdown
- **Temporary unlock**: 24-hour trial available

Pro state is managed via localStorage and synced with backend for authenticated users.

### Backend Data Flow

```
Frontend Request → Express Routes → Data Service → Sina Finance API
                                      ↓
                                 (on failure)
                                      ↓
                              Mock Data Fallback
```

**Key Files**:
- `backend/services/marketDataService.js` - Fetches K-line data, normalizes stock symbols
- `backend/services/indicators.js` - Calculates MA, momentum, volatility, trend scores
- `backend/routes/trend.js` - `/api/trend-score` endpoint combines data + indicators

### Stock Symbol Format

Supported formats:
- `600000` → Auto-detected as Shanghai (sh600000)
- `000001` → Auto-detected as Shenzhen (sz000001)
- `sh600000` / `sz000001` - Explicit prefix

## Important Development Rules

### From system.md
1. Build page structure first, then data logic
2. Use fake data first, then real API
3. Each module must be independently maintainable
4. **Chinese comments, clear code**
5. Output runnable code directly; don't explain principles

### Code Style
- Use native JS only (no frameworks)
- All comments in Chinese
- Code must be self-documenting with clear variable names
- Avoid over-engineering - simple solutions preferred

## API Endpoints Reference

| Endpoint | Method | Description | Example |
|----------|--------|-------------|---------|
| `/api/health` | GET | Health check | - |
| `/api/market-data` | GET | K-line data | `?symbol=600000&limit=50` |
| `/api/market/quote` | GET | Real-time quote | `?symbol=600000` |
| `/api/trend/trend-score` | GET | Trend score (detailed) | `?symbol=600000&short=5&long=20` |
| `/api/trend/trend-score/batch` | GET | Batch trend scores | `?symbols=600000,000001` |
| `/api/user/register` | POST | User registration | `{username, email, password}` |
| `/api/user/login` | POST | User login | `{email, password}` |
| `/api/user/pro-status` | GET | Check Pro status | (requires auth) |
| `/api/event/track` | POST | Event tracking | `{action, timestamp, ...}` |

## Data Caching

- K-line data cached for **5 minutes** to avoid excessive API calls
- Cache key format: `kline_{symbol}`
- Clear cache by restarting backend server

## Mock Data Fallback

When Sina Finance API fails, the system automatically generates mock data:
- `generateMockData()` in `marketDataService.js` creates realistic K-line patterns
- `getFallbackIndexData()` in frontend `js/app.js` generates index data
- All mock data is logged to console for debugging

## Authentication Flow

1. User registers/logs in via `/api/user/register` or `/api/user/login`
2. Backend returns JWT token stored in `localStorage.auth_token`
3. User info stored in `localStorage.user_info`
4. Token sent in `Authorization: Bearer {token}` header for protected routes
5. Pro status synced via `/api/user/pro-status` on page load

## Pro Event Tracking

To analyze user conversion intent, the platform tracks:
- `temp_unlock` - User clicks "temporary unlock"
- `page_view` - Page visits
- `search` - Search queries
- `beta_application` - Pro beta applications

Events stored in localStorage for analytics and sent to backend asynchronously.
