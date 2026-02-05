import json
import urllib.request

try:
    login = {"username": "student1", "password": "student123"}
    data = json.dumps(login).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/api/auth/login/', data=data, headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        lj = json.load(resp)
    token = lj.get('token')
    print('TOKEN:', token[:30] if token else 'NO_TOKEN')

    req2 = urllib.request.Request('http://localhost:8000/api/tracks/', headers={'Authorization': f'Bearer {token}', 'Accept': 'application/json'})
    with urllib.request.urlopen(req2, timeout=10) as resp2:
        td = json.load(resp2)
    print(json.dumps(td, ensure_ascii=False, indent=2))
except Exception as e:
    print('ERROR:', e)
