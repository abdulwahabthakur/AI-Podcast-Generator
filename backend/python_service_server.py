"""
HTTP server wrapper for the podcast research service
Exposes the generate_podcast_script function as a REST API endpoint
"""
import os
import json
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add current directory to path so we can import the research service
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from Podcast_info_researcher import generate_podcast_script

class ResearchServiceHandler(BaseHTTPRequestHandler):
    """HTTP request handler for research service"""
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests to generate podcast script"""
        if self.path != '/generate':
            self.send_error(404, "Endpoint not found")
            return
        
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            request_data = json.loads(body.decode('utf-8'))
            
            # Validate request
            if 'topic' not in request_data or 'durationMinutes' not in request_data:
                error_response = {'error': 'Missing required fields: topic, durationMinutes'}
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(error_response).encode('utf-8'))
                return
            
            # Extract parameters
            topic = request_data['topic']
            duration_minutes = int(request_data['durationMinutes'])
            style = request_data.get('style', 'conversational')
            
            # Generate script using async function
            # Create new event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                script = loop.run_until_complete(generate_podcast_script({
                    'topic': topic,
                    'durationMinutes': duration_minutes,
                    'style': style
                }))
            finally:
                loop.close()
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(script).encode('utf-8'))
            
        except Exception as e:
            # Send error response
            print(f"Error generating script: {e}")
            error_response = {'error': str(e)}
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Override to customize logging"""
        print(f"[Python Service] {format % args}")

def run_server(port=8000):
    """Start the HTTP server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, ResearchServiceHandler)
    print(f"🐍 Python research service running on port {port}")
    print(f"   Endpoint: http://localhost:{port}/generate")
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_SERVICE_PORT', 8000))
    run_server(port)
