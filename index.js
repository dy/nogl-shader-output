/**
 * Nogl gl-shader-output implementation
 *
 * @module nogl-shader-output
 */
var GLSL = require('glsl-transpiler');
var extend = require('xtend/mutable');

module.exports = create;


/**
 * Shader constructor
 */
function create (shader, options) {
	options = extend({
		width: 1,
		height: 1
	}, options);


	//obtain vert and frag shaders
	var vShader, fShader;

	if (typeof shader === 'string') {
		vShader = [
			'attribute vec2 position;',
			'void main() {',
			'  gl_Position = vec4(position, 1.0, 1.0);',
			'}'
		].join('\n');

		fShader = shader;
	}
	else if (shader.vertShader != null) {
		vShader = shader._vref.src;
	}

	if (shader.fragShader != null) {
		fShader = shader._fref.src;
	};


	var width = options.width, height = options.height;


	//create compiler each time anew, as old compiler keeps secrets of old code
	var compile = new GLSL({
		uniform: function (name) {
			return `__uniform.${name}`
		},
		attribute: function (name) {
			//supposed to be fn arg, so just ignore safely
			return '';
		}
	});

	//get varying attributes from vertex shader
	//luckily we can run vertex shader for 4 point coords to get simple rect interpolation afterwards
	var vSource = compile(vShader);

	var varyings = compile.compiler.varyings;
	var varyingsStr = Object.keys(varyings).map(function (name) {
		return `__varying.${name} = ${name};`
	}).join('\n');

	var processVaryings = new Function('position', '__varying', `
		${vSource};

		var gl_Position = [0, 0, 0, 0];
		var gl_PointSize = 1;

		main();

		${varyingsStr}

		return gl_Position;
	`);

	var positions = [[-1, -1], [-1, 3], [3, -1]];
	var varyingVerteces = [{}, {}, {}, {}];
	var gl_Positions = positions.map(function (position, i) {
		return processVaryings(position, varyingVerteces[i]);
	});

	//calculate interpolations for each varying beforehead
	var varyingValues = {};
	for (var name in varyings) {
		//FIXME: handle applied scaling to gl_Position
		//map val in 1x1 square to from→to transformation square
		// var scale = [(to[2][0] - to[0][0])/(from[2][0] - from[0][0])||0, (to[1][1] - to[0][1])/(from[1][1] - from[0][1])||0];
		// var shift = [to[0][0] - from[0][0], to[0][1] - from[0][1]];

		var v = [
			varyingVerteces[0][name],
			varyingVerteces[1][name],
			varyingVerteces[2][name]
		];

		//interp values for each fragment
		var arr = [];
		for (var j = 0; j < height; j++) {
			for (var i = 0; i < width; i++) {
				//FIXME: some rotation happens here (mixed widht/height order)
				//it works alright but I dont understand why, thats specifics of WebGL
				arr[j*width + i] = interpolate(v, (j+0.5)/(height), (i+0.5)/(width));
			}
		}

		varyingValues[name] = arr;
	}

	//interpolate value on the range
	function interpolate (v, x, y) {
		if (v[0].length) {
			var result = Array(v[0].length);
			for (var i = 0; i < result.length; i++) {
				result[i] = interpolate([v[0][i], v[1][i], v[2][i]], x, y);
			}
			return result;
		}

		//calc weights
		var a = v[0];
		var b = (v[0] + v[1])*0.5;
		var d = (v[0] + v[2])*0.5;
		var c = (v[1] + v[2])*0.5;

		var val = a*(1-x)*(1-y) + c*x*y + b*(1-y)*x + d*(1-x)*y || 0;

		return val;
	}


	//create shader draw fn
	var getVaryingsStr = Object.keys(varyings).map(function (name) {
		return `${name} = __varying.${name}[__offset];`
	}).join('\n');

	compile.compiler.reset();
	var source = compile(fShader);

	var process = new Function('__uniform', '__varying', `
		${source}

		var __result = new Float32Array(${width * height * 4}),
			gl_FragColor = [0, 0, 0, 0],
			gl_FragCoord = [0, 0, 1.0, 1.0],
			__offset, __chOffset, __lineOffset;

		for (var __j = 0; __j < ${height}; __j++) {
			__lineOffset = __j * ${width};
			for (var __i = 0; __i < ${width}; __i++) {
				__offset = __lineOffset + __i;
				__chOffset = __offset * 4;

				${getVaryingsStr}

				gl_FragCoord[0] = __i + 0.5;
				gl_FragCoord[1] = __j + 0.5;

				main();

				__result[__chOffset] = gl_FragColor[0];
				__result[__chOffset + 1] = gl_FragColor[1];
				__result[__chOffset + 2] = gl_FragColor[2];
				__result[__chOffset + 3] = gl_FragColor[3];
			}
		}

		return __result;
	`);


	function draw (uniforms) {
		return process(uniforms, varyingValues);
	}

	return draw;
};