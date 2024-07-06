import http.server
import socketserver
import os

PORT = 8000

# Define the directory to serve files from
web_dir = os.path.join(os.path.dirname(__file__), 'www')
os.chdir(web_dir)

# Handler to serve files from the specified directory
Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT}")
    httpd.serve_forever()
