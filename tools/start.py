#!/usr/bin/env python3
# === tools/start.py ===
# 本地预览服务器（仅用于开发预览；生产请部署 dist/web/ 或用一键转网页版）。
# 用法：python tools/start.py [port]
import os, sys, http.server, socketserver, webbrowser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)
    def log_message(self, *a):
        pass

if __name__ == '__main__':
    os.chdir(ROOT)
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        url = 'http://localhost:%d/' % PORT
        print('NEON VELOCITY 本地预览：', url)
        print('（按 Ctrl+C 停止。生产部署请用一键转网页版.bat 生成 dist/）')
        try:
            webbrowser.open(url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n已停止。')
