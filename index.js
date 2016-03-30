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
	//resolve incomplete args
	if (!options) {
		//just options
		if (typeof shader === 'object' && !shader.fragShader) {
			options = shader;
		}
		//just a shader object
		else {
			options = {
				shader: shader
			};
		}
	}
	else {
		options.shader = shader;
	}

	options = extend({
		width: 1,
		height: 1
	}, options);

	//reset gl-shader object
	if (options.shader.fragShader) {
		options.shader = options.shader._fref.src;
	};

	var width = options.width, height = options.height;


	//create compiler each time anew, as old compiler keeps secrets of old code
	var compiler = new GLSL({
		replaceUniform: shaderVar,
		replaceAttribute: shaderVar,
		replaceVarying: shaderVar
	});

	function shaderVar (name) {
		return `__data.${name}`;
	};

	create.compile = compiler;

	var source = create.compile(options.shader);

	var process = new Function('__data', `
		${source}

		var result = [], gl_FragColor = [0, 0, 0, 0], gl_FragCoord = [0, 0, 0, 0];

		for (var j = 0; j < ${height}; j++) {
			for (var i = 0; i < ${width}; i++) {
				main();
				result.push(gl_FragColor[0]);
				result.push(gl_FragColor[1]);
				result.push(gl_FragColor[2]);
				result.push(gl_FragColor[3]);
			}
		}

		return result;
	`);


	function draw (uniforms) {
		return process(uniforms);
	}

	return draw;
};