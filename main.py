from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel
import aiohttp
import asyncio
from bs4 import BeautifulSoup
import os
import time
import re
from duckduckgo_search import DDGS

app = FastAPI()

class NoCacheStaticMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/static/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
        return response

app.add_middleware(NoCacheStaticMiddleware)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    import time
    with open("static/index.html", "r", encoding="utf-8") as f:
        content = f.read()
    # Replace the static version string with a timestamp to bust cache
    content = content.replace("?v=2.0", f"?v={int(time.time())}")
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content)

class ScanRequest(BaseModel):
    file_path: str

class SearchRequest(BaseModel):
    query: str

class EditRequest(BaseModel):
    file_path: str
    old_url: str
    new_url: str

async def check_url(session, url, bookmark_name, folder_path):
    try:
        # Give a robust real-browser headers set to avoid 403s on news sites
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        # Timeout of 15 seconds (some Israeli sites scale slow)
        timeout = aiohttp.ClientTimeout(total=15)
        async with session.get(url, headers=headers, timeout=timeout, allow_redirects=True, ssl=False) as response:
            status = response.status
            # Check if redirected
            final_url = str(response.url)
            is_redirect = url != final_url
            
            return {
                "name": bookmark_name,
                "url": url,
                "folder": folder_path,
                "status": status,
                "is_redirect": is_redirect,
                "final_url": final_url if is_redirect else None,
                "error": None
            }
    except asyncio.TimeoutError:
        return {
            "name": bookmark_name,
            "url": url,
            "folder": folder_path,
            "status": 0,
            "is_redirect": False,
            "final_url": None,
            "error": "Timeout (לא נגיש)"
        }
    except (aiohttp.client_exceptions.ClientConnectorError, 
            aiohttp.client_exceptions.ServerDisconnectedError, 
            aiohttp.client_exceptions.ClientOSError,
            aiohttp.client_exceptions.ClientPayloadError) as e:
        # Many Israeli sites (like Hadassah) just drop the connection if they suspect a bot.
        # Treat this as 403 (Protected) rather than 0 (Broken).
        return {
            "name": bookmark_name,
            "url": url,
            "folder": folder_path,
            "status": 403,
            "is_redirect": False,
            "final_url": None,
            "error": "חיבור נדחה (הגנת בוטים)"
        }
    except Exception as e:
        err_str = str(e).lower()
        err_type = type(e).__name__.lower()
        if "disconnect" in err_str or "connection" in err_str or "reset" in err_str or "oserror" in err_str or "ssl" in err_str or "certificate" in err_str or "ssl" in err_type or "certificate" in err_type:
             return {
                "name": bookmark_name,
                "url": url,
                "folder": folder_path,
                "status": 403,
                "is_redirect": False,
                "final_url": None,
                "error": "חיבור נדחה / שגיאת תקשורת (הגנה/SSL)"
            }
        
        return {
            "name": bookmark_name,
            "url": url,
            "folder": folder_path,
            "status": 0,
            "is_redirect": False,
            "final_url": None,
            "error": type(e).__name__ + " - " + str(e)
        }

@app.post("/api/scan")
async def scan_bookmarks(request: ScanRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="קובץ לא נמצא")
        
    try:
        with open(request.file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(request.file_path, 'r', encoding='windows-1255') as f:
            content = f.read()
            
    links = []
    folder_stack = []
    pending_folder = None
    current_a_url = None
    current_a_folder = None
    in_h3 = False

    for part in re.split(r'(<[^>]*>)', content):
        part = part.strip()
        if not part:
            continue
        if part.startswith('<'):
            tag = part.lower()
            if re.match(r'<dl[\s>]', tag):
                if pending_folder is not None:
                    folder_stack.append(pending_folder)
                    pending_folder = None
            elif re.match(r'</dl', tag):
                if folder_stack:
                    folder_stack.pop()
            elif re.match(r'<h3[\s>]', tag):
                in_h3 = True
            elif re.match(r'</h3', tag):
                in_h3 = False
            elif re.match(r'<a[\s>]', tag):
                href_match = re.search(r'href=["\']([^"\']+)["\']', tag)
                if href_match:
                    url = href_match.group(1)
                    if url.startswith('http'):
                        current_a_url = url
                        display_parts = folder_stack[1:]
                        current_a_folder = '/' + (' / '.join(display_parts) if display_parts else '')
            elif re.match(r'</a', tag):
                current_a_url = None
                current_a_folder = None
        else:
            if in_h3:
                pending_folder = part
            elif current_a_url:
                links.append((current_a_url, part, current_a_folder))
                current_a_url = None
                current_a_folder = None

    results = []
    # Disable SSL verification globally on the connector level as well
    connector = aiohttp.TCPConnector(limit=50, ssl=False)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = []
        for url, name, folder in links:
            tasks.append(check_url(session, url, name, folder))
            
        results = await asyncio.gather(*tasks)

    return {"total": len(results), "results": results}

@app.post("/api/search")
def search_web(request: SearchRequest):
    try:
        # Search DuckDuckGo text results matching the query
        results = DDGS().text(request.query, max_results=3, backend="html")
        return {"results": list(results)}
    except Exception as e:
        return {"results": [], "error": str(e)}

@app.post("/api/edit")
def edit_bookmark(request: EditRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="קובץ לא נמצא")
        
    try:
        with open(request.file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        with open(request.file_path, 'r', encoding='windows-1255') as f:
            content = f.read()
            
    # Use regex to safely replace just the exact URL while preserving the HTML formatting
    pattern = rf'href=["\']{re.escape(request.old_url)}["\']'
    if not re.search(pattern, content, flags=re.IGNORECASE):
        raise HTTPException(status_code=404, detail="לא נמצאה סימניה עם הכתובת הישנה")
        
    new_content = re.sub(pattern, f'HREF="{request.new_url}"', content, flags=re.IGNORECASE)
    
    with open(request.file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    return {"status": "success"}

@app.post("/api/restart")
def restart_server():
    import threading
    import os
    import time
    
    def trigger_reload():
        time.sleep(0.5)
        # Touch main.py to trigger uvicorn to reload the process
        try:
            os.utime("main.py", None)
        except Exception:
            pass
            
    threading.Thread(target=trigger_reload).start()
    return {"status": "restarting"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
