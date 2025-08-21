import requests
import sys
import json
from datetime import datetime

class SecuritySystemAPITester:
    def __init__(self, base_url="https://incidenthub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                except:
                    pass
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response text: {response.text[:200]}")

            return success, response.json() if response.content else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, email, senha):
        """Test login and get token"""
        print(f"\n🔐 Testing login with {email}")
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "senha": senha}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            print(f"   User role: {self.user_data.get('role', 'unknown')}")
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.run_test(
            "Invalid Login",
            "POST", 
            "auth/login",
            401,
            data={"email": "invalid@test.com", "senha": "wrongpassword"}
        )
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        return success

    def test_create_occurrence(self):
        """Test creating an occurrence"""
        occurrence_data = {
            "local": "Portaria Principal - Teste",
            "tipo": "suspeito",
            "descricao": "Teste de ocorrência criada via API - pessoa suspeita observada na área"
        }
        
        success, response = self.run_test(
            "Create Occurrence",
            "POST",
            "occurrences",
            200,
            data=occurrence_data
        )
        
        if success and 'id' in response:
            return response['id']
        return None

    def test_get_occurrences(self):
        """Test getting occurrences list"""
        success, response = self.run_test(
            "Get Occurrences",
            "GET",
            "occurrences",
            200
        )
        return success

    def test_start_round(self):
        """Test starting a round"""
        round_data = {
            "locais_visitados": ["Portaria Principal", "Estacionamento", "Área Externa"],
            "observacoes": "Ronda de teste via API"
        }
        
        success, response = self.run_test(
            "Start Round",
            "POST",
            "rounds",
            200,
            data=round_data
        )
        
        if success and 'id' in response:
            return response['id']
        return None

    def test_get_rounds(self):
        """Test getting rounds list"""
        success, response = self.run_test(
            "Get Rounds",
            "GET",
            "rounds",
            200
        )
        return success

    def test_finish_round(self, round_id):
        """Test finishing a round"""
        if not round_id:
            print("❌ No round ID provided for finish test")
            return False
            
        success, response = self.run_test(
            "Finish Round",
            "PUT",
            f"rounds/{round_id}/finish",
            200
        )
        return success

    def test_get_users(self):
        """Test getting users list (admin/supervisor only)"""
        success, response = self.run_test(
            "Get Users",
            "GET",
            "users",
            200 if self.user_data.get('role') in ['administrador', 'supervisor'] else 403
        )
        return success

    def test_audit_logs(self):
        """Test getting audit logs (admin only)"""
        expected_status = 200 if self.user_data.get('role') == 'administrador' else 403
        success, response = self.run_test(
            "Get Audit Logs",
            "GET",
            "audit-logs",
            expected_status
        )
        return success

def main():
    print("🚀 Starting Security System API Tests")
    print("=" * 50)
    
    # Setup
    tester = SecuritySystemAPITester()
    
    # Test invalid login first
    print("\n📋 AUTHENTICATION TESTS")
    tester.test_invalid_login()
    
    # Test valid login with updated password
    if not tester.test_login("admin@sistema.com", "sales761"):
        print("❌ Admin login failed, trying other credentials...")
        # Try supervisor login as fallback
        if not tester.test_login("supervisor@sistema.com", "supervisor123"):
            print("❌ All logins failed, stopping tests")
            return 1

    # Test authentication endpoints
    tester.test_get_current_user()
    
    # Test dashboard
    print("\n📋 DASHBOARD TESTS")
    tester.test_dashboard_stats()
    
    # Test occurrences
    print("\n📋 OCCURRENCES TESTS")
    occurrence_id = tester.test_create_occurrence()
    tester.test_get_occurrences()
    
    # Test rounds
    print("\n📋 ROUNDS TESTS")
    round_id = tester.test_start_round()
    tester.test_get_rounds()
    
    # Test finishing round (if we created one)
    if round_id:
        tester.test_finish_round(round_id)
    
    # Test user management
    print("\n📋 USER MANAGEMENT TESTS")
    tester.test_get_users()
    
    # Test audit logs
    print("\n📋 AUDIT LOGS TESTS")
    tester.test_audit_logs()
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())