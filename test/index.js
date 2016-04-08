var test = require('tst')
var glslify = require('glslify-sync');
var almost = require('almost-equal');
var assert = require('assert');
var Shader = require('gl-shader');
var createGlContext = require('webgl-context');
var createNoglContext = require('nogl');
var createGl = require('gl-shader-output')
var createNogl = require('../')
var isBrowser = require('is-browser');
var ndarray = require('ndarray');
var savePixels = require('save-pixels');


/**
 * Add almost method
 */
assert.almost = function (x, y) {
	if (x && x.length != null && y && y.length != null) return x.every(function (xi, i) {
		try {
			assert.almost(xi, y[i]);
		} catch (e) {
			assert.fail(x, y, `${(x+'').slice(0,50)}...\n≈\n${(y+'').slice(0,50)}...\n\nspecifically x[${i}] == ${xi} ≈ ${y[i]}`, '≈')
			return false;
		}
		return true;
	});

	var EPSILON = 10e-5;
	if (!almost(x, y, EPSILON)) assert.fail(x, y,
		`${x} ≈ ${y}`, '≈');
	return true;
};


test('should process single point', function() {
	var vShader = glslify('./shaders/test.vert')
	var fShader = glslify('./shaders/blue.frag')

	var max = 10e2;

	var draw = createNogl(fShader);
	assert.deepEqual(draw(), [0, 0, 1, 1]);
});


test('gl vs nogl performance', function() {

	var vShader = glslify('./shaders/test.vert');
	var fShader = glslify('./shaders/blue.frag');

	var max = 7;

	var drawNogl = createNogl(fShader, {
		width: 1024,
		height: 1024
	});

	//nogl is times faster to set up
	//but 2-3 times slower for processing big images
	test('nogl', function () {
		for (var i = 0; i < max; i++) {
			drawNogl();
		}
	});

	if (!isBrowser) return;
	var drawGl = createGl(fShader, {
		width: 1024,
		height: 1024
	});
	test('webgl', function () {
		for (var i = 0; i < max; i++) {
			drawGl();
		}
	});
});


test('should process more-than-one dimension input', function() {
	if (isBrowser) {
		var shader = Shader(createGlContext(),
			glslify('./shaders/test.vert'),
			glslify('./shaders/blue.frag')
		);
	} else {
		var shader = glslify('./shaders/blue.frag');
	}

	var draw = createNogl(shader, {
		width: 2,
		height: 2
	});
	assert.deepEqual(draw(), [0,0,1,1, 0,0,1,1, 0,0,1,1, 0,0,1,1]);
	assert.deepEqual(draw(), [0,0,1,1, 0,0,1,1, 0,0,1,1, 0,0,1,1]);
});

test('should be able to handle alpha', function() {
	 if (isBrowser) {
		var shader = Shader(createGlContext(),
			glslify('./shaders/test.vert'),
			glslify('./shaders/alpha.frag')
		);
	} else {
		var shader = glslify('./shaders/alpha.frag');
	}

	var draw = createNogl(shader);
	assert.deepEqual(draw(), [0, 0, 1, 0])
});


test('should accept uniforms', function() {
	if (isBrowser) {
		var shader = Shader(createGlContext(),
			glslify('./shaders/test.vert'),
			glslify('./shaders/uniforms.frag')
		);
	} else {
		var shader = glslify('./shaders/uniforms.frag');
	}

	var input = [0, 0.25, 0.5, 1.0]
	var reversed = input.slice().reverse();

	var draw = createNogl(shader)

	assert.almost(draw({ u_value: input, multiplier: 1.0 }), reversed, 0.01)
	assert.almost(draw({ u_value: input, multiplier: 3.0 }), [ 3, 1.5, 0.75, 0 ], 0.01)
});


test('gl_FragCoord', function () {
	if (!isBrowser) return;
	var src = `
		precision highp float;

		void main () {
			gl_FragColor = vec4(gl_FragCoord) / 40.0;
		}
	`

	var drawGl = createGl(src, {
		width: 40,
		height: 40
	})

	var drawNogl = createNogl(src, {
		width: 40,
		height: 40
	})

	assert.almost(drawGl(), drawNogl());
});

test('Varyings', function () {
	var vSrc = `
		attribute vec2 position;
		varying float offset;
		varying vec2 pos;

		void main() {
			offset = position.x;
			gl_Position = vec4(position, 1, 1);
			pos = position;
		}
	`;

	var fSrc = `
		precision highp float;

		varying vec2 pos;
		varying float offset;
		uniform float mult;

		void main () {
			gl_FragColor = vec4(pos, offset * mult, 1.0);
		}
	`;


	var noglShader = Shader(createNoglContext(), vSrc, fSrc);

	if (!isBrowser) {
		var drawNogl = createNogl(noglShader, {
			width: 2,
			height: 2
		});

		assert.almost(drawNogl({mult: 1}), [-0.5, -0.5, -0.5, 1, 0.5, -0.5, 0.5, 1, -0.5, 0.5, -0.5, 1, 0.5, 0.5, 0.5, 1]);
		return;
	}

	test('nogl', function () {
		var drawNogl = createNogl(noglShader, {
			width: 170,
			height: 170
		});
		var arr = drawNogl({
			mult: 0.9
		});
		document.body.appendChild(savePixels(ndarray(arr.map(function (x,i) {
			if (i%4 === 0) return x*100;
			return x*255;
		}), [170, 170, 4]), 'canvas'));
	});


	var glShader = Shader(createGlContext(), vSrc, fSrc);
	test('gl', function () {
		var drawGl = createGl(glShader, {
		    width: 170,
		    height: 170
		});
		var arr = drawGl({
			mult: 0.9
		});

		document.body.appendChild(savePixels(ndarray(arr.map(function (x,i) {
			if (i%4 === 0) return x*100;
			return x*255;
		}), [170, 170, 4]), 'canvas'));
	});


	var drawNogl = createNogl(noglShader, {width: 2, height: 2});
	var drawGl = createGl(glShader, {width: 2, height: 2});

	assert.almost(drawGl({
		mult: 0.9
	}), drawNogl( {
		mult: 0.9
	}));
});


test('Vertex uniforms', function () {
	if (!isBrowser) return;

	var vSrc = `
		attribute vec2 position;
		varying vec2 offset;
		uniform float shift;

		void main() {
			gl_Position = vec4(position, 1, 1);
			offset = position + shift;
		}
	`;

	var fSrc = `
		precision highp float;

		varying vec2 offset;
		uniform float scale;

		void main () {
			gl_FragColor = vec4(offset * scale, 1.0, 1.0);
		}
	`;

	var noglShader = Shader(createNoglContext(), vSrc, fSrc);
	test('nogl', function () {
		var drawNogl = createNogl(noglShader, {
			width: 300,
			height: 300
		});
		var arr = drawNogl({
			scale: 2,
			shift: 1
		});
		document.body.appendChild(savePixels(ndarray(arr.map(function (x,i) {
			if (i%4 === 0) return x*100;
			return x*255;
		}), [300, 300, 4]), 'canvas'));
	});


	var glShader = Shader(createGlContext(), vSrc, fSrc);
	test('gl', function () {
		var drawGl = createGl(glShader, {
		    width: 300,
		    height: 300
		});
		var arr = drawGl({
			scale: 2,
			shift: 1
		});

		document.body.appendChild(savePixels(ndarray(arr.map(function (x,i) {
			if (i%4 === 0) return x*100;
			return x*255;
		}), [300, 300, 4]), 'canvas'));
	});


	var drawNogl = createNogl(noglShader, {
		width: 20,
		height: 20
	});
	var drawGl = createGl(glShader, {
	    width: 20,
	    height: 20
	});

	assert.almost(drawGl({
	   scale: 0.9,
	   shift: 0.5
	}), drawNogl( {
	    scale: 0.9,
	   shift: 0.5
	}));
});


test.skip('Textures', function () {


	shader = Shader(gl, '\
		precision mediump float;\
		attribute vec2 position;\
		varying vec2 uv;\
		void main (void) {\
			gl_Position = vec4(position, 0, 1);\
			uv = vec2(position.x * 0.5 + 0.5, - position.y * 0.5 + 0.5);\
		}\
	', '\
		precision mediump float;\
		uniform sampler2D image;\
		varying vec2 uv;\
		void main (void) {\
			gl_FragColor = texture2D(image, uv);\
		}\
	');

	shader.bind();
});


test('Nogl performance of heavy shaders', function () {
	var vSrc = `
		attribute vec2 position;
		varying vec2 offset;
		uniform float shift;

		void main() {
			gl_Position = vec4(position, 1, 1);
			offset = position + shift;
		}
	`;

	var fSrc = `
		#define MOD2 vec2(.16632,.17369)

		precision highp float;

		varying vec2 offset;
		uniform float scale;

		float hash11(float p)
		{
			vec2 p2 = fract(vec2(p) * MOD2);
			p2 += dot(p2.yx, p2.xy+19.19);
			return fract(p2.x * p2.y);
		}

		float noise (float x)
		{
			float p = floor(x);
			float f = fract(x);
			f = f*f*(3.0-2.0*f);
			return mix( hash11(p), hash11(p + 1.0), f)-.5;
		}

		void main () {
			gl_FragColor = vec4(offset * scale, noise(offset.x), 1.0);
		}
	`;

	max = 5;

	var noglShader = Shader(createNoglContext(), vSrc, fSrc);
	var drawNogl = createNogl(noglShader, {
		width: 300,
		height: 300,
		threads: 1
	});

	test('nogl', function () {
		for (var i = 0; i < max; i++) {
			drawNogl({
				scale: 2,
				shift: 1
			});
		}
		var arr = drawNogl({
			scale: 2,
			shift: 1
		});
		if (!isBrowser) return;
		document.body.appendChild(savePixels(ndarray(arr.map(function (x,i) {
			if (i%4 === 0) return x*100;
			return x*255;
		}), [300, 300, 4]), 'canvas'));
	});

	if (!isBrowser) return;


	var glShader = Shader(createGlContext(), vSrc, fSrc);
	test('gl', function () {
		var drawGl = createGl(glShader, {
		    width: 300,
		    height: 300
		});
		for (var i = 0; i < max; i++) {
			drawGl({
				scale: 2,
				shift: 1
			});
		}
		var arr = drawGl({
			scale: 2,
			shift: 1
		});

		document.body.appendChild(savePixels(ndarray(arr.map(function (x,i) {
			if (i%4 === 0) return x*100;
			return x*255;
		}), [300, 300, 4]), 'canvas'));
	});
});