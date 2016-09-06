"""Entry point for UVCesium Web App."""

import tornado.web
import tornado.ioloop
import os
import vcs
import cdms2
import numpy


def write_array(array, handler):
    """
    Writes numpy array to response with headers that CDMS.js expects.
    """
    shape = array.shape
    dtype = array.dtype

    handler.add_header("x-cdms-datatype", dtype.name)
    handler.add_header("x-cdms-shape", ",".join((str(s) for s in shape)))
    handler.write(array.flatten().tobytes())


class MainHandler(tornado.web.RequestHandler):
    """Handle general HTTP requests."""

    def get(self):
        """Handle GET requests."""
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates", "index.html")
        with open(path) as ind:
            self.write(ind.read())


class NCMetaHandler(tornado.web.RequestHandler):
    """Retrieves grid info for a nc file."""

    def get(self):
        filename = self.get_argument("file", default="clt.nc")
        # Ignore arbitrary paths, just check if the file exists
        filename = os.path.basename(filename)
        varname = self.get_argument("variable", default=None)
        if filename == "clt.nc" and varname is None:
            varname = "clt"
        try:
            f = cdms2.open(os.path.join(vcs.sample_data, filename))
            s = f(varname)
            g = s.getGrid()
            # number of cells, lat/lon, number of points per cel
            m = g.getMesh()
            num_points_per_cell = m.shape[2]
            # So we need to reshape it to have a flat array
            # We'll reshape to look like this:
            # [ [[lon, lat], [lon, lat], ...], [[lon, lat], [lon, lat], ...], ...]

            # First, flip lat and lon arrays
            flipped = numpy.fliplr(m)
            # Then transpose into lon/lat pairs
            transposed = numpy.transpose(flipped, [0, 2, 1])

            write_array(transposed, self)
        except:
            self.write("Failed to find file/variable.")


class NCDataHandler(tornado.web.RequestHandler):
    """Retrieves data for cells in a nc file."""

    def get(self):
        filename = self.get_argument("file", default="clt.nc")
        # Ignore arbitrary paths, just check if the file exists
        filename = os.path.basename(filename)
        varname = self.get_argument("variable", default=None)
        if filename == "clt.nc" and varname is None:
            varname = "clt"
        timeslice = self.get_argument("timeslice", default=0)

        try:
            f = cdms2.open(os.path.join(vcs.sample_data, filename))
            s = f(varname)
            write_array(s[int(timeslice)], self)
        except:
            self.write("Failed to find file/variable/time")


def make_app():
    """Generate WSGI app."""
    return tornado.web.Application([
            (r"/", MainHandler),
            (r"/data/meta", NCMetaHandler),
            (r"/data", NCDataHandler)
        ],
        static_path=os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "static"),
        static_url_prefix="/static/")

if __name__ == "__main__":
    app = make_app()
    app.listen(8080)
    tornado.ioloop.IOLoop.current().start()
