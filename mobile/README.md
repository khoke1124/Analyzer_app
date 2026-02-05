# Options Analyzer - React Native Expo Mobile App

A comprehensive options trading analysis mobile app built with React Native Expo, featuring real-time stock data from Alpha Vantage, strategy building, P&L analysis, Greeks calculations, and trade adjustment recommendations.

## Features

### Core Features
- **Dashboard**: Market overview, watchlist, and active strategies
- **Strategy Builder**: Build multi-leg options strategies with option chain
- **Analysis Tools**: P&L calculations, Greeks, breakeven points, probability of profit
- **Trade Adjustments**: Get recommendations when trades go against you
- **What-If Scenarios**: Simulate price, volatility, and time decay impacts

### Trade Management Features
- **Adjustment Recommendations**: Automatic suggestions for when to:
  - Close positions (high urgency when approaching max loss)
  - Roll options to different strikes/expirations
  - Take profits at target levels
  - Partially close positions
  
- **What-If Analysis**:
  - Price change scenarios (-30% to +30%)
  - Volatility impact analysis
  - Time decay simulation
  - Greeks breakdown (Delta, Vega, Theta impact)

## Tech Stack

- **Frontend**: React Native Expo
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Market Data**: Alpha Vantage API

## Project Structure

```
/app/
├── mobile/                 # React Native Expo app
│   ├── App.js             # Main entry point
│   ├── app.json           # Expo configuration
│   ├── package.json       # Dependencies
│   └── src/
│       ├── navigation/    # Navigation setup
│       ├── screens/       # App screens
│       ├── services/      # API & Auth services
│       └── components/    # Reusable components
│
└── backend/               # FastAPI backend
    ├── server.py          # Main server
    ├── requirements.txt   # Python dependencies
    └── .env               # Environment variables
```

## Running the App

### Prerequisites
- Node.js 18+ 
- Python 3.9+
- MongoDB running locally or connection string
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device

### Backend Setup

1. Navigate to backend directory:
```bash
cd /app/backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables in `.env`:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=options_analyzer
ALPHA_VANTAGE_KEY=your_api_key
JWT_SECRET=your_secret_key
```

4. Start the server:
```bash
python server.py
# or
uvicorn server:app --host 0.0.0.0 --port 8001
```

### Mobile App Setup

1. Navigate to mobile directory:
```bash
cd /app/mobile
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Update API URL in `src/services/api.js`:
```javascript
// For local development with Expo
const API_URL = 'http://YOUR_COMPUTER_IP:8001';
// Replace YOUR_COMPUTER_IP with your actual IP (e.g., 192.168.1.100)
```

4. Start Expo:
```bash
npx expo start
```

5. Scan the QR code with Expo Go app on your phone

## Deployment Options

### Option 1: Expo EAS Build (Recommended)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure your project:
```bash
eas build:configure
```

4. Build for platforms:
```bash
# For Android APK
eas build --platform android --profile preview

# For iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```

5. Download and install the built APK/IPA

### Option 2: Expo Go (Development)

1. Start the dev server:
```bash
npx expo start
```

2. Scan QR code with Expo Go app
3. The app will run on your device

### Option 3: Local Development Build

```bash
# For Android
npx expo run:android

# For iOS (Mac only)
npx expo run:ios
```

### Backend Deployment

Deploy the FastAPI backend to any cloud provider:

**Render.com:**
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect to your repo
4. Set environment variables
5. Deploy

**Railway:**
```bash
railway login
railway init
railway up
```

**Heroku:**
```bash
heroku create options-analyzer-api
heroku config:set MONGO_URL=your_mongo_url
git push heroku main
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Stocks
- `GET /api/stocks/{symbol}/quote` - Get stock quote
- `GET /api/stocks/{symbol}/history` - Get price history
- `GET /api/options/{symbol}/chain` - Get option chain

### Strategies
- `POST /api/strategies` - Create strategy
- `GET /api/strategies` - List strategies
- `GET /api/strategies/{id}` - Get strategy
- `PUT /api/strategies/{id}` - Update strategy
- `DELETE /api/strategies/{id}` - Delete strategy

### Analysis
- `POST /api/analysis/adjustment-scenarios` - Analyze what-if scenarios
- `POST /api/analysis/roll-options` - Get roll suggestions

### Watchlist
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist` - Add to watchlist
- `DELETE /api/watchlist/{symbol}` - Remove from watchlist

## Alpha Vantage API Note

The free tier of Alpha Vantage allows 25 API requests per day. The app includes fallback mock data for common symbols (AAPL, MSFT, GOOGL, NVDA, TSLA, SPY, META, AMZN) when the API limit is reached.

For production use, consider:
- Upgrading to Alpha Vantage premium ($49.99/month for 120 requests/min)
- Using alternative data providers (Polygon.io, Tradier, Yahoo Finance)

## License

MIT License - See LICENSE file for details.
