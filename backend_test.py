#!/usr/bin/env python3
"""
Comprehensive backend testing for Options Analyzer API
Tests all endpoints specified in the review request
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class OptionsAnalyzerAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_strategy_id = None

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        if response_data and not success:
            result["response_data"] = response_data
        
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}: {details}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            if success:
                self.log_test(name, True, f"Status: {response.status_code}")
            else:
                self.log_test(name, False, 
                            f"Expected {expected_status}, got {response.status_code}", 
                            response_data)

            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        print("\n🔍 Testing Health Endpoint...")
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        print("\n🔍 Testing User Registration...")
        test_user_data = {
            "email": "test@example.com",
            "password": "password123",
            "name": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            if 'user' in response and 'id' in response['user']:
                self.user_id = response['user']['id']
                self.log_test("Token Extraction", True, "Successfully extracted auth token")
            else:
                self.log_test("User ID Extraction", False, "No user ID in response")
        
        return success

    def test_user_login(self):
        """Test user login"""
        print("\n🔍 Testing User Login...")
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.log_test("Login Token Update", True, "Token updated from login")
        
        return success

    def test_get_me(self):
        """Test get current user endpoint"""
        print("\n🔍 Testing Get Current User...")
        if not self.token:
            self.log_test("Get Me - No Token", False, "No auth token available")
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "api/auth/me",
            200
        )
        return success

    def test_stock_quote(self, symbol="AAPL"):
        """Test stock quote endpoint"""
        print(f"\n🔍 Testing Stock Quote for {symbol}...")
        success, response = self.run_test(
            f"Stock Quote - {symbol}",
            "GET",
            f"api/stocks/{symbol}/quote",
            200
        )
        
        if success and response:
            required_fields = ['symbol', 'price', 'change', 'volume']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test(f"Stock Quote Fields - {symbol}", False, 
                            f"Missing fields: {missing_fields}")
            else:
                self.log_test(f"Stock Quote Fields - {symbol}", True, 
                            f"All required fields present: {required_fields}")
        
        return success

    def test_option_chain(self, symbol="AAPL"):
        """Test option chain endpoint"""
        print(f"\n🔍 Testing Option Chain for {symbol}...")
        success, response = self.run_test(
            f"Option Chain - {symbol}",
            "GET",
            f"api/options/{symbol}/chain",
            200
        )
        
        if success and response:
            required_fields = ['symbol', 'currentPrice', 'options']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test(f"Option Chain Fields - {symbol}", False, 
                            f"Missing fields: {missing_fields}")
            else:
                self.log_test(f"Option Chain Fields - {symbol}", True, 
                            f"All required fields present")
                
                # Check if options array has data
                if isinstance(response.get('options'), list) and len(response['options']) > 0:
                    self.log_test(f"Option Chain Data - {symbol}", True, 
                                f"Found {len(response['options'])} option strikes")
                else:
                    self.log_test(f"Option Chain Data - {symbol}", False, 
                                "No option data in response")
        
        return success

    def test_create_strategy(self):
        """Test strategy creation"""
        print("\n🔍 Testing Strategy Creation...")
        if not self.token:
            self.log_test("Create Strategy - No Token", False, "No auth token available")
            return False
        
        strategy_data = {
            "name": "Test Iron Condor",
            "ticker": "AAPL",
            "options": [
                {
                    "type": "call",
                    "action": "sell",
                    "strike": 180.0,
                    "premium": 2.50,
                    "quantity": 1,
                    "volatility": 0.25
                },
                {
                    "type": "call",
                    "action": "buy",
                    "strike": 185.0,
                    "premium": 1.20,
                    "quantity": 1,
                    "volatility": 0.25
                },
                {
                    "type": "put",
                    "action": "sell",
                    "strike": 175.0,
                    "premium": 2.30,
                    "quantity": 1,
                    "volatility": 0.25
                },
                {
                    "type": "put",
                    "action": "buy",
                    "strike": 170.0,
                    "premium": 1.10,
                    "quantity": 1,
                    "volatility": 0.25
                }
            ],
            "notes": "Test strategy for API testing",
            "entry_price": 185.50,
            "target_profit": 200.0,
            "stop_loss": -400.0
        }
        
        success, response = self.run_test(
            "Create Strategy",
            "POST",
            "api/strategies",
            200,
            data=strategy_data
        )
        
        if success and response and 'id' in response:
            self.created_strategy_id = response['id']
            self.log_test("Strategy ID Extraction", True, f"Strategy ID: {self.created_strategy_id}")
        
        return success

    def test_get_strategies(self):
        """Test get strategies endpoint"""
        print("\n🔍 Testing Get Strategies...")
        if not self.token:
            self.log_test("Get Strategies - No Token", False, "No auth token available")
            return False
            
        success, response = self.run_test(
            "Get Strategies",
            "GET",
            "api/strategies",
            200
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Strategies Response", True, f"Found {len(response)} strategies")
        elif success:
            self.log_test("Get Strategies Response", False, "Response is not a list")
        
        return success

    def test_adjustment_analysis(self):
        """Test adjustment scenarios analysis"""
        print("\n🔍 Testing Adjustment Analysis...")
        
        scenario_data = {
            "ticker": "AAPL",
            "current_price": 185.50,
            "options": [
                {
                    "type": "call",
                    "action": "sell",
                    "strike": 180.0,
                    "premium": 2.50,
                    "quantity": 1,
                    "volatility": 0.25
                },
                {
                    "type": "call",
                    "action": "buy",
                    "strike": 185.0,
                    "premium": 1.20,
                    "quantity": 1,
                    "volatility": 0.25
                }
            ],
            "scenario_type": "price_up",
            "scenario_value": 0.1
        }
        
        success, response = self.run_test(
            "Adjustment Analysis",
            "POST",
            "api/analysis/adjustment-scenarios",
            200,
            data=scenario_data
        )
        
        if success and response:
            required_fields = ['current_pnl', 'scenario_pnl', 'recommendations']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Adjustment Analysis Fields", False, 
                            f"Missing fields: {missing_fields}")
            else:
                self.log_test("Adjustment Analysis Fields", True, 
                            "All required fields present")
        
        return success

    def test_watchlist_endpoints(self):
        """Test watchlist endpoints"""
        print("\n🔍 Testing Watchlist Endpoints...")
        if not self.token:
            self.log_test("Watchlist - No Token", False, "No auth token available")
            return False
        
        # Test get empty watchlist
        success1, _ = self.run_test(
            "Get Watchlist (Empty)",
            "GET",
            "api/watchlist",
            200
        )
        
        # Test add to watchlist
        success2, _ = self.run_test(
            "Add to Watchlist",
            "POST",
            "api/watchlist",
            200,
            data={"symbol": "AAPL"}
        )
        
        # Test get watchlist with item
        success3, response = self.run_test(
            "Get Watchlist (With Items)",
            "GET",
            "api/watchlist",
            200
        )
        
        # Test remove from watchlist
        success4, _ = self.run_test(
            "Remove from Watchlist",
            "DELETE",
            "api/watchlist/AAPL",
            200
        )
        
        return all([success1, success2, success3, success4])

    def test_roll_suggestions(self):
        """Test roll suggestions endpoint"""
        print("\n🔍 Testing Roll Suggestions...")
        if not self.token or not self.created_strategy_id:
            self.log_test("Roll Suggestions - Prerequisites", False, 
                        "No auth token or strategy ID available")
            return False
        
        success, response = self.run_test(
            "Roll Suggestions",
            "POST",
            f"api/analysis/roll-options?strategy_id={self.created_strategy_id}",
            200
        )
        
        return success

    def test_invalid_endpoints(self):
        """Test error handling for invalid endpoints"""
        print("\n🔍 Testing Error Handling...")
        
        # Test invalid stock symbol
        success1, _ = self.run_test(
            "Invalid Stock Symbol",
            "GET",
            "api/stocks/INVALID123/quote",
            200  # Should still return 200 with generated data
        )
        
        # Test unauthorized access
        old_token = self.token
        self.token = "invalid_token"
        success2, _ = self.run_test(
            "Invalid Token",
            "GET",
            "api/auth/me",
            401
        )
        self.token = old_token
        
        # Test non-existent strategy
        success3, _ = self.run_test(
            "Non-existent Strategy",
            "GET",
            "api/strategies/507f1f77bcf86cd799439011",  # Valid ObjectId format
            404
        )
        
        return success2 and success3  # success1 might pass due to fallback data

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Options Analyzer API Test Suite")
        print("=" * 60)
        
        # Core functionality tests
        tests = [
            ("Health Check", self.test_health_endpoint),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Get Current User", self.test_get_me),
            ("Stock Quote (AAPL)", lambda: self.test_stock_quote("AAPL")),
            ("Stock Quote (Fallback)", lambda: self.test_stock_quote("MSFT")),
            ("Option Chain", lambda: self.test_option_chain("AAPL")),
            ("Create Strategy", self.test_create_strategy),
            ("Get Strategies", self.test_get_strategies),
            ("Adjustment Analysis", self.test_adjustment_analysis),
            ("Watchlist Operations", self.test_watchlist_endpoints),
            ("Roll Suggestions", self.test_roll_suggestions),
            ("Error Handling", self.test_invalid_endpoints),
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.log_test(test_name, False, f"Test exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Print failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test_name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = OptionsAnalyzerAPITester()
    
    try:
        success = tester.run_all_tests()
        
        # Save detailed results
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
            "test_details": tester.test_results
        }
        
        with open('/app/test_reports/backend_test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: /app/test_reports/backend_test_results.json")
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test suite failed with exception: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())