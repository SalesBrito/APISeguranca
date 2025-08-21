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

    def test_change_password(self):
        """Test password change functionality"""
        password_data = {
            "senha_atual": "sales761",
            "nova_senha": "newsales761",
            "confirmar_senha": "newsales761"
        }
        
        success, response = self.run_test(
            "Change Password",
            "PUT",
            "auth/change-password",
            200,
            data=password_data
        )
        
        # Change it back to original
        if success:
            password_data_back = {
                "senha_atual": "newsales761",
                "nova_senha": "sales761",
                "confirmar_senha": "sales761"
            }
            self.run_test(
                "Change Password Back",
                "PUT",
                "auth/change-password",
                200,
                data=password_data_back
            )
        
        return success

    def test_start_shift(self):
        """Test starting a shift (vigilante functionality)"""
        shift_data = {
            "local_responsavel": "Portaria Principal - Teste",
            "observacoes": "Plantão de teste via API"
        }
        
        success, response = self.run_test(
            "Start Shift",
            "POST",
            "shifts",
            200,
            data=shift_data
        )
        
        if success and 'id' in response:
            return response['id']
        return None

    def test_get_shifts(self):
        """Test getting shifts list"""
        success, response = self.run_test(
            "Get Shifts",
            "GET",
            "shifts",
            200
        )
        return success

    def test_get_active_shifts(self):
        """Test getting active shifts (supervisor/admin only)"""
        expected_status = 200 if self.user_data.get('role') in ['administrador', 'supervisor'] else 403
        success, response = self.run_test(
            "Get Active Shifts",
            "GET",
            "shifts/active",
            expected_status
        )
        return success

    def test_finish_shift(self, shift_id):
        """Test finishing a shift"""
        if not shift_id:
            print("❌ No shift ID provided for finish test")
            return False
            
        success, response = self.run_test(
            "Finish Shift",
            "PUT",
            f"shifts/{shift_id}/finish",
            200
        )
        return success

    def test_get_locations(self):
        """Test getting locations with CFTV integration"""
        success, response = self.run_test(
            "Get Locations",
            "GET",
            "locations",
            200
        )
        return success

    def test_create_occurrence_with_priority(self):
        """Test creating occurrence with different priorities"""
        priorities = ['baixa', 'media', 'alta', 'critica']
        occurrence_ids = []
        
        for priority in priorities:
            occurrence_data = {
                "local": f"Teste - {priority.upper()}",
                "tipo": "suspeito",
                "prioridade": priority,
                "descricao": f"Teste de ocorrência com prioridade {priority}"
            }
            
            success, response = self.run_test(
                f"Create Occurrence - Priority {priority.upper()}",
                "POST",
                "occurrences",
                200,
                data=occurrence_data
            )
            
            if success and 'id' in response:
                occurrence_ids.append(response['id'])
        
        return occurrence_ids

    def test_resolve_occurrence(self, occurrence_id):
        """Test resolving an occurrence"""
        if not occurrence_id:
            print("❌ No occurrence ID provided for resolve test")
            return False
            
        resolve_data = {
            "observacoes_resolucao": "Ocorrência resolvida via teste API - situação normalizada"
        }
        
        success, response = self.run_test(
            "Resolve Occurrence",
            "PUT",
            f"occurrences/{occurrence_id}/resolve",
            200,
            data=resolve_data
        )
        return success

    def test_get_occurrences_by_priority(self):
        """Test getting occurrences by priority (supervisor/admin only)"""
        if self.user_data.get('role') not in ['administrador', 'supervisor']:
            print("⏭️  Skipping priority filter test - insufficient permissions")
            return True
            
        priorities = ['baixa', 'media', 'alta', 'critica']
        all_success = True
        
        for priority in priorities:
            success, response = self.run_test(
                f"Get Occurrences - Priority {priority.upper()}",
                "GET",
                f"occurrences/priority/{priority}",
                200
            )
            if not success:
                all_success = False
        
        return all_success

    def test_system_info(self):
        """Test system information endpoint"""
        success, response = self.run_test(
            "Get System Info",
            "GET",
            "system/info",
            200
        )
        return success

    def test_create_user(self):
        """Test creating a new user (admin only)"""
        if self.user_data.get('role') != 'administrador':
            print("⏭️  Skipping user creation test - insufficient permissions")
            return True
            
        timestamp = datetime.now().strftime("%H%M%S")
        user_data = {
            "nome": f"Usuário Teste {timestamp}",
            "email": f"teste{timestamp}@sistema.com",
            "senha": "teste123",
            "role": "vigilante",
            "telefone": "(11) 99999-9999",
            "setor": "Teste"
        }
        
        success, response = self.run_test(
            "Create User",
            "POST",
            "auth/register",
            200,
            data=user_data
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