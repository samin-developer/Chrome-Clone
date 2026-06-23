from flask import Flask, request, redirect, render_template, jsonify
import urllib.parse, re, os
import logging

log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, 'flask_app.log')

logging.basicConfig(
    filename=log_file,
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
)
log = logging.getLogger('werkzeug')
log.setLevel(logging.DEBUG)
file_handler = logging.FileHandler(log_file)
file_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s'))
log.addHandler(file_handler)

app = Flask(__name__)

def is_url(text):
    if re.match(r'^https?://', text, re.I): return True
    if '.' in text and ' ' not in text and re.match(r'^[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}', text): return True
    return False

def normalize_url(text):
    if not re.match(r'^https?://', text, re.I):
        return 'https://' + text
    return text

def build_search_url(query):
    return 'https://www.google.com/search?q=' + urllib.parse.quote_plus(query)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/proxy')
def proxy():
    url = request.args.get('url')
    if not url: return "No URL", 400
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req) as resp:
            content = resp.read()
            headers = dict(resp.headers)
            # Remove framing headers
            for h in ['X-Frame-Options', 'x-frame-options', 'Content-Security-Policy', 'content-security-policy', 'Transfer-Encoding', 'transfer-encoding', 'Content-Encoding', 'content-encoding']:
                if h in headers:
                    del headers[h]
            
            # Inject base tag so relative links work
            if b'<head>' in content:
                content = content.replace(b'<head>', b'<head><base href="' + url.encode() + b'/">', 1)
            else:
                content = b'<base href="' + url.encode() + b'/">' + content

            from flask import Response
            return Response(content, headers=headers)
    except Exception as e:
        return str(e), 500

@app.route('/eduboard/<path:subpath>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def eduboard_proxy(subpath):
    import requests
    url = f"https://eduboard.uit.edu/{subpath}"
    if request.query_string:
        url += '?' + request.query_string.decode('utf-8')
    headers = {k:v for k,v in request.headers if k.lower() not in ['host', 'origin', 'referer', 'content-length']}
    headers['Origin'] = 'https://eduboard.uit.edu'
    headers['Referer'] = f"https://eduboard.uit.edu/{subpath}"
    
    resp = requests.request(
        method=request.method,
        url=url,
        headers=headers,
        data=request.get_data(),
        cookies=request.cookies,
        allow_redirects=False
    )
    
    excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'x-frame-options', 'content-security-policy']
    resp_headers = []
    for name, value in resp.raw.headers.items():
        if name.lower() not in excluded_headers:
            if name.lower() == 'set-cookie':
                import re
                value = re.sub(r'(?i);\s*domain=[^;]+', '', value)
                value = re.sub(r'(?i);\s*samesite=[^;]+', '', value)
                value = re.sub(r'(?i);\s*secure', '', value)
            if name.lower() == 'location':
                if value.startswith('/'):
                    value = '/eduboard' + value
                elif value.startswith('https://eduboard.uit.edu/'):
                    value = value.replace('https://eduboard.uit.edu/', '/eduboard/')
            resp_headers.append((name, value))
            
    from flask import Response
    return Response(resp.content, resp.status_code, resp_headers)

@app.route('/api/image-search')
def image_search():
    query = request.args.get('q')
    if not query:
        return jsonify([])
    try:
        import urllib.request
        import urllib.parse
        import json
        
        url = "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=File:" + urllib.parse.quote(query) + "&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url&format=json"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            
        results = []
        if 'query' in data and 'pages' in data['query']:
            for page_id, page in data['query']['pages'].items():
                if 'imageinfo' in page and len(page['imageinfo']) > 0:
                    title = page.get('title', '').replace('File:', '')
                    # Clean up file extension from title for display
                    if '.' in title:
                        title = title[:title.rindex('.')]
                    img_url = page['imageinfo'][0].get('url', '')
                    if img_url and (img_url.lower().endswith('.jpg') or img_url.lower().endswith('.png') or img_url.lower().endswith('.gif') or img_url.lower().endswith('.svg')):
                        results.append({'title': title, 'url': img_url})
                        
        return jsonify(results)
    except Exception as e:
        print("Image search error:", str(e))
        return jsonify([])

@app.route('/api/ai')
def ai_search():
    query = request.args.get('q')
    if not query:
        return jsonify({"text": ""})
    try:
        import urllib.request
        import urllib.parse
        
        # Use free keyless Pollinations AI API
        url = "https://text.pollinations.ai/prompt/" + urllib.parse.quote(query)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode('utf-8')
        return jsonify({"text": text})
    except Exception as e:
        print("AI error:", str(e))
        return jsonify({"text": "An error occurred while fetching AI response."})

@app.route('/api/news')
def news_search():
    query = request.args.get('q')
    if not query:
        return jsonify([])
    try:
        import urllib.request
        import urllib.parse
        import xml.etree.ElementTree as ET
        
        url = "https://news.google.com/rss/search?q=" + urllib.parse.quote(query) + "&hl=en-US&gl=US&ceid=US:en"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            xml_data = resp.read()
            
        root = ET.fromstring(xml_data)
        results = []
        for item in root.findall('./channel/item')[:15]:
            title = item.find('title').text if item.find('title') is not None else ""
            link = item.find('link').text if item.find('link') is not None else ""
            pubDate = item.find('pubDate').text if item.find('pubDate') is not None else ""
            source = item.find('source').text if item.find('source') is not None else ""
            results.append({
                "title": title,
                "link": link,
                "date": pubDate,
                "source": source
            })
        return jsonify(results)
    except Exception as e:
        print("News error:", str(e))
        return jsonify([])

@app.route('/api/video')
def video_search():
    query = request.args.get('q')
    if not query:
        return jsonify([])
    try:
        import urllib.request
        import urllib.parse
        import re
        import html as html_mod
        
        url = "https://lite.duckduckgo.com/lite/"
        # force video search by appending 'youtube' to query
        data = urllib.parse.urlencode({'q': query + ' youtube'}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/x-www-form-urlencoded'
        })
        with urllib.request.urlopen(req) as resp:
            html_content = resp.read().decode('utf-8', errors='ignore')
            
        results = []
        links = list(re.finditer(r'<a rel="nofollow" href="([^"]+)" class=\'result-link\'>(.*?)</a>', html_content))
        snippets = re.findall(r'<td class=\'result-snippet\'>([\s\S]*?)</td>', html_content)
        
        for i, match in enumerate(links):
            url_str = match.group(1)
            title = re.sub(r'<[^>]+>', '', match.group(2)).strip()
            title = html_mod.unescape(title)
            
            snippet = ""
            if i < len(snippets):
                snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
                snippet = html_mod.unescape(snippet)
            
            # only return video links (youtube mostly)
            if 'youtube.com' in url_str or 'youtu.be' in url_str:
                results.append({'title': title, 'url': url_str, 'snippet': snippet})
                
        return jsonify(results)
    except Exception as e:
        print("Video search error:", str(e))
        return jsonify([])


@app.route('/api/search')
def search_engine():
    query = request.args.get('q')
    if not query:
        return jsonify([])
    try:
        import urllib.request
        import urllib.parse
        import re
        import html as html_mod
        
        url = "https://lite.duckduckgo.com/lite/"
        data = urllib.parse.urlencode({'q': query}).encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
            'Content-Type': 'application/x-www-form-urlencoded'
        })
        with urllib.request.urlopen(req) as resp:
            html_content = resp.read().decode('utf-8', errors='ignore')
            
        results = []
        links = list(re.finditer(r'<a rel="nofollow" href="([^"]+)" class=\'result-link\'>(.*?)</a>', html_content))
        snippets = re.findall(r'<td class=\'result-snippet\'>([\s\S]*?)</td>', html_content)
        
        for i, match in enumerate(links):
            url_str = match.group(1)
            title = re.sub(r'<[^>]+>', '', match.group(2)).strip()
            title = html_mod.unescape(title)
            
            snippet = ""
            if i < len(snippets):
                snippet = re.sub(r'<[^>]+>', '', snippets[i]).strip()
                snippet = html_mod.unescape(snippet)
                
            if url_str.startswith('//duckduckgo.com/l/?uddg='):
                try:
                    url_str = urllib.parse.unquote(url_str.split('uddg=')[1].split('&')[0])
                except: pass
                
            results.append({
                'url': url_str,
                'title': title,
                'snippet': snippet
            })
            
            if len(results) >= 10:
                break
                
        return jsonify(results)
    except Exception as e:
        print("Search API Error:", e)
        return jsonify([])

@app.route('/<path:dummy>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def fallback_proxy(dummy):
    referer = request.headers.get('Referer')
    target_base = None
    import urllib.parse
    if referer and '/api/proxy?url=' in referer:
        try:
            original_url = urllib.parse.unquote(referer.split('url=')[1].split('&')[0])
            parsed = urllib.parse.urlparse(original_url)
            target_base = f"{parsed.scheme}://{parsed.netloc}"
        except: pass
    
    if target_base:
        target_url = target_base + '/' + dummy
        if request.query_string:
            target_url += '?' + request.query_string.decode('utf-8')
        return redirect('/api/proxy?url=' + urllib.parse.quote(target_url))
    return "Not Found", 404

@app.route('/<path:catchall>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def wildcard_proxy(catchall):
    if catchall.startswith(('static', 'api', 'eduboard')):
        return "Not found", 404
    return eduboard_proxy(catchall)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
