from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from pymongo import MongoClient
from bson import ObjectId
import httpx
import os

app = FastAPI(title="Options Analyzer API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "options_analyzer")
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY")
JWT_SECRET = os.environ.get("JWT_SECRET", "secret")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", 24))

# MongoDB
client = MongoClient(MONGO_URL)
db = client[DB_NAME]
users_collection = db["users"]
strategies_collection = db["strategies"]
watchlist_collection = db["watchlist"]
trade_logs_collection = db["trade_logs"]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Pydantic Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class OptionLeg(BaseModel):
    type: str  # call or put
    action: str  # buy or sell
    strike: float
    premium: float
    quantity: int
    expiration: Optional[str] = None
    volatility: Optional[float] = 0.2

class StrategyCreate(BaseModel):
    name: str
    ticker: str
    options: List[OptionLeg]
    notes: Optional[str] = ""
    entry_price: Optional[float] = None
    target_profit: Optional[float] = None
    stop_loss: Optional[float] = None

class StrategyUpdate(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    target_profit: Optional[float] = None
    stop_loss: Optional[float] = None
    strategy_status: Optional[str] = None

class AdjustmentScenario(BaseModel):
    ticker: str
    current_price: float
    options: List[OptionLeg]
    scenario_type: str  # price_up, price_down, volatility_increase, time_decay
    scenario_value: Optional[float] = None

class WatchlistItem(BaseModel):
    symbol: str

# Helper Functions
def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"id": str(user["_id"]), "email": user["email"], "name": user["name"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth Endpoints
@app.post("/api/auth/register")
async def register(user: UserCreate):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = users_collection.insert_one(user_doc)
    token = create_token({"sub": str(result.inserted_id)})
    return {"token": token, "user": {"id": str(result.inserted_id), "email": user.email, "name": user.name}}

@app.post("/api/auth/login")
async def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token({"sub": str(db_user["_id"])})
    return {"token": token, "user": {"id": str(db_user["_id"]), "email": db_user["email"], "name": db_user["name"]}}

@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# Mock stock data (fallback when Alpha Vantage limit reached)
MOCK_STOCKS = {
    "AAPL": {"price": 185.50, "change": 2.35, "volume": 45000000},
    "MSFT": {"price": 378.90, "change": -1.20, "volume": 25000000},
    "GOOGL": {"price": 141.80, "change": 1.50, "volume": 20000000},
    "NVDA": {"price": 495.20, "change": 12.80, "volume": 35000000},
    "TSLA": {"price": 248.50, "change": -5.40, "volume": 55000000},
    "SPY": {"price": 475.30, "change": 3.20, "volume": 80000000},
    "META": {"price": 385.60, "change": 4.20, "volume": 18000000},
    "AMZN": {"price": 178.25, "change": 2.10, "volume": 30000000},
}

# Alpha Vantage Integration
@app.get("/api/stocks/{symbol}/quote")
async def get_stock_quote(symbol: str):
    symbol = symbol.upper()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://www.alphavantage.co/query",
                params={"function": "GLOBAL_QUOTE", "symbol": symbol, "apikey": ALPHA_VANTAGE_KEY}
            )
            data = response.json()
            
            if "Global Quote" in data and data["Global Quote"]:
                quote = data["Global Quote"]
                return {
                    "symbol": quote.get("01. symbol", symbol),
                    "price": float(quote.get("05. price", 0)),
                    "change": float(quote.get("09. change", 0)),
                    "change_percent": quote.get("10. change percent", "0%").replace("%", ""),
                    "volume": int(quote.get("06. volume", 0)),
                    "previous_close": float(quote.get("08. previous close", 0))
                }
    except Exception as e:
        print(f"Alpha Vantage error: {e}")
    
    # Fallback to mock data
    if symbol in MOCK_STOCKS:
        mock = MOCK_STOCKS[symbol]
        change_pct = (mock["change"] / mock["price"]) * 100
        return {
            "symbol": symbol,
            "price": mock["price"],
            "change": mock["change"],
            "change_percent": f"{change_pct:.2f}",
            "volume": mock["volume"],
            "previous_close": mock["price"] - mock["change"]
        }
    
    # Generate random-ish data for unknown symbols
    import random
    base_price = random.uniform(50, 500)
    change = random.uniform(-10, 10)
    return {
        "symbol": symbol,
        "price": round(base_price, 2),
        "change": round(change, 2),
        "change_percent": f"{(change/base_price)*100:.2f}",
        "volume": random.randint(1000000, 50000000),
        "previous_close": round(base_price - change, 2)
    }

@app.get("/api/stocks/{symbol}/history")
async def get_stock_history(symbol: str, interval: str = "daily"):
    function_map = {"daily": "TIME_SERIES_DAILY", "weekly": "TIME_SERIES_WEEKLY", "monthly": "TIME_SERIES_MONTHLY"}
    function = function_map.get(interval, "TIME_SERIES_DAILY")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.alphavantage.co/query",
            params={"function": function, "symbol": symbol, "apikey": ALPHA_VANTAGE_KEY, "outputsize": "compact"}
        )
        data = response.json()
        
        time_series_key = [k for k in data.keys() if "Time Series" in k]
        if not time_series_key:
            raise HTTPException(status_code=404, detail="Data not available")
        
        series = data[time_series_key[0]]
        history = []
        for date, values in list(series.items())[:30]:
            history.append({
                "date": date,
                "open": float(values["1. open"]),
                "high": float(values["2. high"]),
                "low": float(values["3. low"]),
                "close": float(values["4. close"]),
                "volume": int(values["5. volume"])
            })
        return {"symbol": symbol, "history": history}

# Generate mock option chain (Alpha Vantage free tier doesn't have options)
@app.get("/api/options/{symbol}/chain")
async def get_option_chain(symbol: str, expiration: Optional[str] = None):
    # Get current stock price
    try:
        quote = await get_stock_quote(symbol)
        current_price = quote["price"]
    except Exception:
        current_price = 150.0  # Fallback
    
    # Generate realistic option chain around current price
    strikes = []
    base_strike = round(current_price / 5) * 5
    for i in range(-10, 11):
        strike = base_strike + (i * 5)
        if strike > 0:
            distance = abs(strike - current_price) / current_price
            base_iv = 0.25 + (distance * 0.1)  # IV smile
            
            # Black-Scholes approximation for premiums
            time_to_expiry = 30 / 365
            call_premium = max(0.01, (current_price - strike) * 0.5 + current_price * base_iv * (time_to_expiry ** 0.5) * 0.4) if strike <= current_price else current_price * base_iv * (time_to_expiry ** 0.5) * 0.4 * (1 - distance)
            put_premium = max(0.01, (strike - current_price) * 0.5 + current_price * base_iv * (time_to_expiry ** 0.5) * 0.4) if strike >= current_price else current_price * base_iv * (time_to_expiry ** 0.5) * 0.4 * (1 - distance)
            
            strikes.append({
                "strike": strike,
                "callBid": round(call_premium * 0.95, 2),
                "callAsk": round(call_premium * 1.05, 2),
                "callVolume": int(10000 * (1 - distance)),
                "putBid": round(put_premium * 0.95, 2),
                "putAsk": round(put_premium * 1.05, 2),
                "putVolume": int(8000 * (1 - distance)),
                "iv": round(base_iv, 4),
                "isAtTheMoney": abs(strike - current_price) < 2.5
            })
    
    return {
        "symbol": symbol,
        "currentPrice": current_price,
        "expirations": ["2025-01-17", "2025-01-24", "2025-01-31", "2025-02-21", "2025-03-21"],
        "options": strikes
    }

# Strategy Management
@app.post("/api/strategies")
async def create_strategy(strategy: StrategyCreate, user: dict = Depends(get_current_user)):
    strategy_doc = {
        "user_id": user["id"],
        "name": strategy.name,
        "ticker": strategy.ticker,
        "options": [opt.dict() for opt in strategy.options],
        "notes": strategy.notes,
        "entry_price": strategy.entry_price,
        "target_profit": strategy.target_profit,
        "stop_loss": strategy.stop_loss,
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = strategies_collection.insert_one(strategy_doc)
    strategy_doc["id"] = str(result.inserted_id)
    if "_id" in strategy_doc:
        del strategy_doc["_id"]
    return strategy_doc

@app.get("/api/strategies")
async def get_strategies(user: dict = Depends(get_current_user), filter_status: Optional[str] = None):
    query = {"user_id": user["id"]}
    if filter_status:
        query["status"] = filter_status
    
    strategies = []
    for s in strategies_collection.find(query).sort("created_at", -1):
        s["id"] = str(s["_id"])
        del s["_id"]
        strategies.append(s)
    return strategies

@app.get("/api/strategies/{strategy_id}")
async def get_strategy(strategy_id: str, user: dict = Depends(get_current_user)):
    strategy = strategies_collection.find_one({"_id": ObjectId(strategy_id), "user_id": user["id"]})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    strategy["id"] = str(strategy["_id"])
    del strategy["_id"]
    return strategy

@app.put("/api/strategies/{strategy_id}")
async def update_strategy(strategy_id: str, update: StrategyUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = strategies_collection.update_one(
        {"_id": ObjectId(strategy_id), "user_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"message": "Strategy updated"}

@app.delete("/api/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str, user: dict = Depends(get_current_user)):
    result = strategies_collection.delete_one({"_id": ObjectId(strategy_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"message": "Strategy deleted"}

# Trade Management & Adjustments
@app.post("/api/analysis/adjustment-scenarios")
async def analyze_adjustment_scenarios(scenario: AdjustmentScenario):
    """Analyze what-if scenarios and provide adjustment recommendations"""
    options = scenario.options
    current_price = scenario.current_price
    
    # Calculate current P&L
    def calculate_payoff(price, opts):
        total = 0
        for opt in opts:
            if opt.type == "call":
                intrinsic = max(0, price - opt.strike)
            else:
                intrinsic = max(0, opt.strike - price)
            
            if opt.action == "buy":
                total += (intrinsic - opt.premium) * opt.quantity * 100
            else:
                total += (opt.premium - intrinsic) * opt.quantity * 100
        return total
    
    current_pnl = calculate_payoff(current_price, options)
    
    # Calculate scenario P&L
    scenario_price = current_price
    if scenario.scenario_type == "price_up":
        scenario_price = current_price * (1 + (scenario.scenario_value or 0.1))
    elif scenario.scenario_type == "price_down":
        scenario_price = current_price * (1 - (scenario.scenario_value or 0.1))
    
    scenario_pnl = calculate_payoff(scenario_price, options)
    
    # Calculate max profit/loss
    max_profit = max(calculate_payoff(p, options) for p in range(int(current_price * 0.5), int(current_price * 1.5)))
    max_loss = min(calculate_payoff(p, options) for p in range(int(current_price * 0.5), int(current_price * 1.5)))
    
    # Generate adjustment recommendations
    recommendations = []
    
    # Check if losing trade needs adjustment
    if current_pnl < 0:
        loss_percent = abs(current_pnl) / (abs(max_loss) if max_loss != 0 else 1) * 100
        
        if loss_percent > 50:
            recommendations.append({
                "type": "close",
                "urgency": "high",
                "reason": f"Position is at {loss_percent:.1f}% of max loss. Consider closing to limit further losses.",
                "action": "Close entire position"
            })
        elif loss_percent > 25:
            recommendations.append({
                "type": "roll",
                "urgency": "medium",
                "reason": f"Position is at {loss_percent:.1f}% of max loss. Rolling can reduce risk.",
                "action": "Roll to further expiration or different strikes"
            })
        
        # Suggest specific adjustments based on strategy type
        calls = [o for o in options if o.type == "call"]
        puts = [o for o in options if o.type == "put"]
        
        if len(calls) == 2 and len(puts) == 0:  # Call spread
            if current_price > max(o.strike for o in calls):
                recommendations.append({
                    "type": "adjust",
                    "urgency": "medium",
                    "reason": "Price moved above spread. Consider rolling up.",
                    "action": f"Roll to higher strikes: {int(current_price)}/{int(current_price) + 5}"
                })
        
        if len(puts) == 2 and len(calls) == 0:  # Put spread
            if current_price < min(o.strike for o in puts):
                recommendations.append({
                    "type": "adjust",
                    "urgency": "medium",
                    "reason": "Price moved below spread. Consider rolling down.",
                    "action": f"Roll to lower strikes: {int(current_price) - 5}/{int(current_price)}"
                })
        
        if len(calls) == 2 and len(puts) == 2:  # Iron Condor
            recommendations.append({
                "type": "adjust",
                "urgency": "medium",
                "reason": "Consider adjusting the tested side of the iron condor.",
                "action": "Roll the threatened side further OTM or close that side"
            })
    
    # Profit taking recommendations
    if current_pnl > 0:
        profit_percent = current_pnl / max_profit * 100 if max_profit > 0 else 0
        if profit_percent > 75:
            recommendations.append({
                "type": "take_profit",
                "urgency": "low",
                "reason": f"Position is at {profit_percent:.1f}% of max profit.",
                "action": "Consider closing to lock in profits"
            })
        elif profit_percent > 50:
            recommendations.append({
                "type": "partial_close",
                "urgency": "low",
                "reason": f"Position is at {profit_percent:.1f}% of max profit.",
                "action": "Consider closing half the position"
            })
    
    # Time decay warning
    recommendations.append({
        "type": "info",
        "urgency": "low",
        "reason": "Time decay accelerates in final 2 weeks before expiration.",
        "action": "Monitor theta and consider rolling if holding through expiration"
    })
    
    return {
        "current_price": current_price,
        "scenario_price": scenario_price,
        "current_pnl": round(current_pnl, 2),
        "scenario_pnl": round(scenario_pnl, 2),
        "pnl_change": round(scenario_pnl - current_pnl, 2),
        "max_profit": round(max_profit, 2),
        "max_loss": round(max_loss, 2),
        "recommendations": recommendations
    }

@app.post("/api/analysis/roll-options")
async def get_roll_suggestions(strategy_id: str, user: dict = Depends(get_current_user)):
    """Get suggestions for rolling a strategy"""
    strategy = strategies_collection.find_one({"_id": ObjectId(strategy_id), "user_id": user["id"]})
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    
    # Get current price
    try:
        quote = await get_stock_quote(strategy["ticker"])
        current_price = quote["price"]
    except Exception:
        current_price = 150.0
    
    options = strategy["options"]
    suggestions = []
    
    # Suggest rolling based on current position
    for opt in options:
        new_strike = opt["strike"]
        if opt["type"] == "call" and current_price > opt["strike"]:
            new_strike = round(current_price / 5) * 5 + 5
        elif opt["type"] == "put" and current_price < opt["strike"]:
            new_strike = round(current_price / 5) * 5 - 5
        
        if new_strike != opt["strike"]:
            suggestions.append({
                "original": f"{opt['action'].upper()} {opt['type'].upper()} ${opt['strike']}",
                "suggested": f"{opt['action'].upper()} {opt['type'].upper()} ${new_strike}",
                "reason": "Strike adjustment based on current price movement",
                "estimated_credit_debit": round((new_strike - opt["strike"]) * 0.1, 2)
            })
    
    return {
        "strategy_id": strategy_id,
        "ticker": strategy["ticker"],
        "current_price": current_price,
        "roll_suggestions": suggestions,
        "next_expirations": ["2025-02-21", "2025-03-21", "2025-04-18"]
    }

# Watchlist
@app.get("/api/watchlist")
async def get_watchlist(user: dict = Depends(get_current_user)):
    items = watchlist_collection.find({"user_id": user["id"]})
    watchlist = []
    for item in items:
        try:
            quote = await get_stock_quote(item["symbol"])
            watchlist.append(quote)
        except:
            watchlist.append({"symbol": item["symbol"], "price": 0, "change": 0})
    return watchlist

@app.post("/api/watchlist")
async def add_to_watchlist(item: WatchlistItem, user: dict = Depends(get_current_user)):
    existing = watchlist_collection.find_one({"user_id": user["id"], "symbol": item.symbol.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Symbol already in watchlist")
    
    watchlist_collection.insert_one({"user_id": user["id"], "symbol": item.symbol.upper()})
    return {"message": "Added to watchlist"}

@app.delete("/api/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str, user: dict = Depends(get_current_user)):
    result = watchlist_collection.delete_one({"user_id": user["id"], "symbol": symbol.upper()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Symbol not in watchlist")
    return {"message": "Removed from watchlist"}

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
