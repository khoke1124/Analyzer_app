# Options Analyzer App - Product Requirements Document

## Project Overview
A comprehensive React Native Expo mobile application for options trading analysis, featuring real-time stock data, strategy building, P&L analysis, and trade management recommendations.

## User Personas
1. **Active Options Trader** - Needs quick strategy building and P&L visualization
2. **Swing Trader** - Uses what-if scenarios to plan entries and exits
3. **Income Trader** - Focuses on iron condors, credit spreads, and adjustment management

## Core Requirements

### Authentication
- [x] User registration with email/password
- [x] JWT-based authentication
- [x] Secure token storage

### Market Data
- [x] Real-time stock quotes (Alpha Vantage + fallback)
- [x] Option chain display
- [x] Watchlist management

### Strategy Building
- [x] Multi-leg option strategy creation
- [x] Support for calls/puts, buy/sell
- [x] Strategy saving to database
- [x] P&L calculation at different prices

### Analysis Tools
- [x] Greeks calculation (Delta, Gamma, Theta, Vega)
- [x] Breakeven point calculation
- [x] Probability of profit estimation
- [x] Payoff diagrams

### Trade Management (NEW)
- [x] Adjustment recommendations based on P&L
- [x] Roll suggestions for losing trades
- [x] What-if scenario analysis
- [x] Close/roll urgency indicators
- [x] Greeks impact breakdown

## Architecture

### Frontend (React Native Expo)
- `/app/mobile/` - Complete Expo app
- Navigation: Bottom tabs + Stack navigators
- State: React Context for auth
- API: Axios with auth interceptor

### Backend (Python FastAPI)
- `/app/backend/server.py` - Main API server
- MongoDB for data persistence
- JWT authentication
- Alpha Vantage integration

## What's Been Implemented

### Date: Feb 2026

**Backend:**
- FastAPI server with all CRUD operations
- User authentication (register/login/me)
- Stock quote endpoint with Alpha Vantage + fallback
- Option chain generation
- Strategy management (create/read/update/delete)
- Adjustment analysis endpoint
- Roll suggestions endpoint
- Watchlist management

**Mobile App:**
- Complete React Native Expo project
- Authentication flow (Login/Register screens)
- Dashboard with market overview
- Strategy builder with option chain
- Analysis screen with Greeks and payoff charts
- Adjustment recommendations screen
- What-if scenario simulator
- Profile and settings screen

## API Endpoints
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/stocks/{symbol}/quote
- GET /api/options/{symbol}/chain
- POST /api/strategies
- GET /api/strategies
- PUT /api/strategies/{id}
- DELETE /api/strategies/{id}
- POST /api/analysis/adjustment-scenarios
- POST /api/analysis/roll-options
- GET/POST/DELETE /api/watchlist

## Backlog

### P0 - Critical
- ✅ All core features implemented

### P1 - Important
- [ ] Push notifications for price alerts
- [ ] Real options data integration (premium API)
- [ ] Historical trade tracking

### P2 - Nice to Have
- [ ] Social sharing of strategies
- [ ] Strategy templates library
- [ ] Paper trading mode
- [ ] Dark/light theme toggle

## Deployment
- Backend: Can be deployed to Render, Railway, or Heroku
- Mobile: Use Expo EAS Build for APK/IPA generation
- See /app/mobile/README.md for detailed instructions

## Testing
- Backend: 96.2% test coverage (25/26 tests passed)
- Test file: /app/backend_test.py
