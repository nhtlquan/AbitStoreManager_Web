from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from pathlib import Path
import json

HOST = "127.0.0.1"
PORT = 8000
ROOT = Path(__file__).resolve().parent

UPSTREAM = {
    "login": "https://new.abit.vn/api/v1/auth/login",
    "listOrderEcommerce": "https://new.abitstore.vn/invoices/listOrderEcommerce",
    "system/getAllResource": "https://new.abitstore.vn/system/getAllResource",
    "invoices/invoicestatus": "https://new.abitstore.vn/invoices/invoicestatus",
}

ALLOWED_METHODS = {
    "login": {"POST"},
    "listOrderEcommerce": {"POST"},
    "system/getAllResource": {"GET"},
    "invoices/invoicestatus": {"GET"},
}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "*"))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        self._handle_request("GET")

    def do_POST(self):
        self._handle_request("POST")

    def _handle_request(self, method):
        path = urlsplit(self.path).path

        prefix = "/api/abit/"
        if path.startswith(prefix):
            route = path[len(prefix):]
            self._proxy(route, method)
            return

        if method == "GET":
            super().do_GET()
        else:
            self.send_error(404)

    def _proxy(self, route, method):
        # Exact route allow-list: no wildcard forwarding and no guessed paths.
        if route not in UPSTREAM or method not in ALLOWED_METHODS[route]:
            self._json(404, {"error": "Unsupported API route", "route": route, "method": method})
            return

        query = urlsplit(self.path).query
        upstream_url = UPSTREAM[route]
        if query and route != "login":
            upstream_url += "?" + query

        body = None
        if method == "POST":
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            body = self.rfile.read(length)

        headers = {
            "accept": "application/json, text/plain, */*",
            "content-type": "application/json",
            "origin": "https://abitstore.vn",
            "referer": "https://abitstore.vn/",
            "user-agent": "Mozilla/5.0",
        }

        req = Request(
            upstream_url,
            data=body,
            headers=headers,
            method=method,
        )

        try:
            with urlopen(req, timeout=45) as resp:
                payload = resp.read()
                self.send_response(resp.status)
                self.send_header(
                    "content-type",
                    resp.headers.get("content-type", "application/json"),
                )
                self.send_header(
                    "Access-Control-Allow-Origin",
                    self.headers.get("Origin", "*"),
                )
                self.end_headers()
                self.wfile.write(payload)

        except HTTPError as exc:
            payload = exc.read()
            self.send_response(exc.code)
            self.send_header(
                "content-type",
                exc.headers.get("content-type", "application/json"),
            )
            self.send_header(
                "Access-Control-Allow-Origin",
                self.headers.get("Origin", "*"),
            )
            self.end_headers()
            self.wfile.write(payload)

        except URLError as exc:
            self._json(
                502,
                {
                    "error": "Abit API connection failed",
                    "message": str(exc.reason),
                    "route": route,
                },
            )

    def _json(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header(
            "Access-Control-Allow-Origin",
            self.headers.get("Origin", "*"),
        )
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == "__main__":
    print("Abit Store Manager Web")
    print(f"http://{HOST}:{PORT}/")
    print()
    print("API routes:")
    print("  POST /api/abit/login")
    print("  POST /api/abit/listOrderEcommerce")
    print("  GET  /api/abit/system/getAllResource")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
