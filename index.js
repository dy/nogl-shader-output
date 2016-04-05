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
		attribute: function (name) {
			//supposed to be fn arg, so just ignore safely
			return '';
		}
	});

	//get varying attributes from vertex shader
	//luckily we can run vertex shader for 4 point coords to get simple rect interpolation afterwards
	var vSource = compile(vShader);
	var fSource = compile(fShader);


	//save parsed uniforms and varyings
	var varyings = compile.compiler.varyings;
	var uniforms = compile.compiler.uniforms;


	//create varying range calculator
	if (Object.keys(varyings).length) {
		var createProcessVaryings = new Function (`
			var gl_Position, gl_PointSize, position;

			${vSource}

			var __pos = [[-1, -1], [-1, 3], [3, -1]];

			return function (__u) {
				${Object.keys(uniforms).map(function (name) {
					return `${name} = __u.${name}`;
				}).join(';\n')}

				var __varying = {${Object.keys(varyings).map(function (name) {
						return `${name}: []`
					}).join(',\n')}};

				__pos.forEach(function (__position, __i) {
					gl_Position = [0, 0, 0, 0];
					gl_PointSize = 1;
					position = __position;

					main();

					${Object.keys(varyings).map(function (name) {
						return `__varying.${name}[__i] = ${name};`
					}).join('\n')}
				});

				return __varying;
			}
		`);
	} else {
		var createProcessVaryings = function () {return function () { return {}; }}
	}



	//interpolate value on the range bilinearly
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


	//process function is created in closure
	//so to avoid recreation of shader’s stuff on each call
	var createDraw = new Function('__processVaryings', `
		var gl_FragColor, gl_FragCoord;

		${fSource}

		${interpolate.toString()}

		return function __process (__u) {
			${Object.keys(uniforms).map(function (name) {
					return `${name} = __u.${name}`;
				}).join(';\n')}
			gl_FragColor = [0, 0, 0, 0];
			gl_FragCoord = [0, 0, 1.0, 1.0];

			var __varying = __processVaryings(__u);

			var __result = new Float32Array(${width * height * 4}),
				__offset, __chOffset, __lineOffset, __x, __y;

			for (var __j = 0; __j < ${height}; __j++) {
				__lineOffset = __j * ${width};
				__y = (__j + 0.5) / ${height};
				for (var __i = 0; __i < ${width}; __i++) {
					__offset = __lineOffset + __i;
					__chOffset = __offset * 4;
					__x = (__i + 0.5) / ${width};

					${Object.keys(varyings).map(function (name) {
						return `${name} = interpolate(__varying.${name}, __y, __x)`;
					}).join(';\n')}

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
		}
	`);

	return createDraw(createProcessVaryings());
};