var vcs = {
	init: function(el) {
		return new vcs.Canvas(el);
	},
	Canvas: function(el) {
		var conf = {
			"animation": false,
			"baseLayerPicker": false,
			"fullscreenButton": false,
			"geocoder": false,
			"homeButton": false,
			"infoBox": false,
			"sceneModePicker": true,
			"selectionIndicator": false,
			"timeline": false,
			"navigationHelpButton": false,
			"navigationInstructionsInitiallyVisible": false,
			"useDefaultRenderLoop": true,
			"showRenderLoopErrors": false,
			"automaticallyTrackDataSourceClocks": false,
			"orderIndependentTranslucency": false
		};
		this.viewer = new Cesium.Viewer(el, conf);
		this.boxfill = function(file, variable) {
			var viewer = this.viewer;
			var cell_bounds = vcs.getArray("/data/meta?file=" + file + "&variable=" + variable)
			var cell_data = vcs.getArray("/data?file=" + file + "&variable=" + variable + "&timeslice=0")
			return Promise.all([cell_bounds, cell_data]).then(function(results){
				var bounds = results[0];
				var data = results[1];

				if (bounds.shape[0] != data.buffer.length) {
					console.log("Sizes don't match :(");
					return;
				}

				var max = Math.max.apply(null, data.buffer);
				var min = Math.min.apply(null, data.buffer);

				function color_for_val(val) {
					var spread = max - min;
					var color_range = 100;
					var red = 1.0;
					var blue = .25;
					var green = .25;
					var pct = (val - min) / spread;
					return new Cesium.Color(pct * red, pct * green, pct * blue);
				}

				var entities = data.map(function(val, ind){
					var points = [];
					for (var i = 0; i < bounds.shape[1]; i++) {
						// Push lon then lat
						points.push(bounds.getVal(ind, i, 0));
						points.push(bounds.getVal(ind, i, 1));
					}
					return viewer.entities.add({
						name: "cell_" + ind,
						polygon: {
							hierarchy: Cesium.Cartesian3.fromDegreesArray(points),
							material: color_for_val(val).withAlpha(.5),
							outline: true,
							outlineColor: Cesium.Color.BLACK
						}
					});
				});

				return entities;
			});
		};
	},
	NDBuffer: function(buff, shape){
		this.buffer = buff;
		this.shape = shape;
		this.getVal = function() {
			value_ind = this.shapedIndicesToIndex.apply(this, arguments);
			return this.buffer[value_ind];
		};
		this.indexToShapedIndices = function(i) {
				var ind = 0;
				var shape_indices = [];
				for (ind = 0; ind < this.shape.length; ind++) {
					shape_indices.push(i / this.shape[ind]);
					i = i % this.shape[ind];
				}
				return shape_indices;
		};
		this.shapedIndicesToIndex = function() {
			var axis_ind = 0;
			if (arguments.length < this.shape.length) {
				return null;
			}
			var value_ind = 0;
			var iterind = 0;
			var multi_val;
			for (axis_ind = 0; axis_ind < this.shape.length; axis_ind++) {
				multi_val = 1;
				for (iterind = axis_ind + 1; iterind < this.shape.length; iterind++) {
					multi_val *= this.shape[iterind];
				}
				value_ind += multi_val * arguments[axis_ind];
			}
			return value_ind;
		}
		this.map = function(f) {
			var result_arr = [];
			for (var i = 0; i < this.buffer.length; i++) {
				result_arr.push(f(this.buffer[i], i, this));
			}
			return result_arr;
		};
	},
	getArray: function(url) {
		var promise = new Promise(function(resolve, reject) {
			var xhr = new XMLHttpRequest();
			xhr.responseType = "arraybuffer"
			xhr.open("GET", url);
			xhr.onload = function(ev) {
				var buffer = xhr.response;
				var headers = xhr.getAllResponseHeaders().split("\r\n").reduce(function(prev, cur) {
					var key, value;
					var parts = cur.split(": ");
					key = parts[0];
					value = parts[1];
					prev[key] = value;
					return prev;
				}, {});
				var dtype = headers["X-Cdms-Datatype"];
				switch (dtype) {
					case "float32":
						buffer = new Float32Array(buffer);
						break;
					case "float64":
						buffer = new Float64Array(buffer);
						break;
					case "int32":
						buffer = new Int32Array(buffer);
						break;
					case "int64":
						buffer = new Int64Array(buffer);
						break
					default:
						buffer = new Int32Array(buffer);
				}
				if (headers["X-Cdms-Shape"] !== undefined) {
					var shape = headers["X-Cdms-Shape"].split(",");
					shape = shape.map(function(d) { return parseInt(d); });
					buffer = new vcs.NDBuffer(buffer, shape);
				}
				resolve(buffer);
			}

			xhr.onerror = function(ev) {
				reject(Error("Unable to retrieve array from " + url));
			}
			xhr.send(null);
		});
		return promise;
	},
}