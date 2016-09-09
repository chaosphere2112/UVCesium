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
		this.boxfill = function(variable) {
			var viewer = this.viewer;
			return Promise.all([variable.bounds, variable.data]).then(function(results){
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
	}
}