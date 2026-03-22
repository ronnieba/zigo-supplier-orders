import urllib.request
try:
    resp = urllib.request.urlopen("http://127.0.0.1:8000/")
    html = resp.read().decode("utf-8")
    print("Found v=" + [line for line in html.split('\n') if 'app.js?v=' in line][0])
except Exception as e:
    print("Failed:", e)
