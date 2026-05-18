#!/usr/bin/env python
"""Initialize Outflo system - create system owner and test user"""
import requests
import sys

BASE_URL = "http://localhost:8000"

def init_system_owner():
    print("Initializing System Owner...")
    try:
        resp = requests.post(f"{BASE_URL}/api/v1/system-owner-auth/init")
        if resp.status_code == 200:
            data = resp.json()
            print(f"  System Owner initialized: {data.get('email')}")
            return True
        else:
            print(f"  Error: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        print(f"  Failed to connect: {e}")
        return False

def test_system_owner_login():
    print("\nTesting System Owner login...")
    try:
        resp = requests.post(
            f"{BASE_URL}/api/v1/system-owner-auth/login",
            json={
                "email": "admin@outflo.com",
                "password": "Outflo@2024!",
                "device_info": {"device_id": "test", "device_type": "desktop"}
            }
        )
        if resp.status_code == 200:
            data = resp.json()
            print(f"  Login SUCCESS: {data['user']['email']}")
            return True
        else:
            print(f"  Login FAILED: {resp.status_code} - {resp.json().get('detail')}")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        return False

def test_user_registration():
    print("\nTesting User Registration...")
    try:
        resp = requests.post(
            f"{BASE_URL}/api/v1/auth/register",
            json={
                "email": "testorg@demo.com",
                "password": "Test@1234",
                "full_name": "Test Organization Owner",
                "organization_name": "Test Company"
            }
        )
        if resp.status_code == 201:
            data = resp.json()
            print(f"  Registration SUCCESS: {data['user']['email']}")
            return True
        else:
            print(f"  Registration FAILED: {resp.status_code} - {resp.json().get('detail')}")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        return False

def test_user_login():
    print("\nTesting User Login...")
    try:
        resp = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={
                "email": "testorg@demo.com",
                "password": "Test@1234"
            }
        )
        if resp.status_code == 200:
            data = resp.json()
            print(f"  Login SUCCESS: {data['user']['email']} ({data['user']['role']})")
            return True
        else:
            print(f"  Login FAILED: {resp.status_code} - {resp.json().get('detail')}")
            return False
    except Exception as e:
        print(f"  Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("OUTFLO SYSTEM INITIALIZATION")
    print("=" * 50)
    print(f"Backend: {BASE_URL}")

    init_system_owner()
    test_system_owner_login()
    test_user_registration()
    test_user_login()

    print("\n" + "=" * 50)
    print("Done! Check results above.")
    print("=" * 50)