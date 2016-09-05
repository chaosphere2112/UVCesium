"""Entry point for UVCesium Web App."""

import tornado.web
import tornado.ioloop
import os


class MainHandler(tornado.web.RequestHandler):
    """Handle general HTTP requests."""

    def get(self):
        """Handle GET requests."""
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates", "index.html")
        with open(path) as ind:
            self.write(ind.read())


def make_app():
    """Generate WSGI app."""
    return tornado.web.Application([
        (r"/", MainHandler),
    ], static_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "static"), static_url_prefix="/static/")

if __name__ == "__main__":
    app = make_app()
    app.listen(8080)
    tornado.ioloop.IOLoop.current().start()
