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

	//reset gl-shader object
	if (shader.fragShader) {
		shader = shader._fref.src;
	};

	var width = options.width, height = options.height;


	//create compiler each time anew, as old compiler keeps secrets of old code
	var compile = new GLSL({
		replaceUniform: shaderVar,
		replaceAttribute: shaderVar,
		replaceVarying: shaderVar
	});

	function shaderVar (name) {
		return `__data.${name}`;
	};

	var source = compile(shader);

	var process = new Function('__data', `
		${source}

		var result = new Float32Array(${width} * ${height} * 4), gl_FragColor = [0, 0, 0, 0], gl_FragCoord = [0, 0, 1, 1];

		for (var j = 0; j < ${height}; j++) {
			var row = j * ${width} * 4;
			for (var i = 0; i < ${width}; i++) {
				var col = i * 4;

				gl_FragCoord[0] = i + 0.5;
				gl_FragCoord[1] = j + 0.5;

				main();

				result[row + col] = gl_FragColor[0];
				result[row + col + 1] = gl_FragColor[1];
				result[row + col + 2] = gl_FragColor[2];
				result[row + col + 3] = gl_FragColor[3];
			}
		}

		return result;
	`);


	function draw (uniforms) {
		return process(uniforms);
	}

	return draw;
};