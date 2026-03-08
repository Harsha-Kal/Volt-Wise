import requests

BASE_URL = "http://localhost:8000"

def test_register():
    print("Testing Registration...")
    response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "email": "testuser_auth@example.com",
            "password": "password123",
            "full_name": "Test User"
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

def test_login():
    print("\nTesting Login...")
    # OAuth2 Password Request Form requires x-www-form-urlencoded
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        data={
            "username": "testuser_auth@example.com",
            "password": "password123"
        }
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    try:
        test_register()
    except Exception as e:
        print(f"Register failed: {e}")
    try:
        test_login()
    except Exception as e:
        print(f"Login failed: {e}")
