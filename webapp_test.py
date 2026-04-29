import urllib.request
import json

try:
    response = urllib.request.urlopen('http://localhost:3000/')
    html = response.read().decode('utf-8')
    print("HTML loaded OK, size:", len(html))
except Exception as e:
    print("Error:", e)
