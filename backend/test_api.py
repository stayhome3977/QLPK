import requests

# Test login API again after .env update
try:
    response = requests.post('http://127.0.0.1:8000/api/v1/auth/login', 
                             json={'email': 'patient@qlpk.vn', 'password': 'Patient@123'})
    print(f'Status Code: {response.status_code}')
    if response.status_code == 200:
        data = response.json()
        print('Login SUCCESSFUL!')
        print(f'User: {data["user"]}')
        print(f'Token Type: {data["token_type"]}')
    else:
        print(f'Login failed: {response.text}')
except Exception as e:
    print(f'Error: {e}')
