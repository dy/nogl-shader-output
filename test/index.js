var test = require('tst')
var glslify = require('glslify-sync');
var almost = require('almost-equal');
var assert = require('assert');
var Shader = require('gl-shader');
var createGlContext = require('webgl-context');
var createGl = require('gl-shader-output')
var createNogl = require('../')
var isBrowser = require('is-browser');


/**
 * Add almost method
 */
assert.almost = function (x, y) {
    if (x && x.length != null && y && y.length != null) return x.every(function (xi, i) {
        try {
            assert.almost(xi, y[i]);
        } catch (e) {
            assert.fail(x, y, `${(x+'').slice(0,10)} ≈ ${(y+'').slice(0,10)}, specifically x[${i}] == ${xi} ≈ ${y[i]}`, '≈')
        }
    });

    var EPSILON = 10e-10;
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
    if (!isBrowser) return;

    var vShader = glslify('./shaders/test.vert');
    var fShader = glslify('./shaders/blue.frag');

    var max = 7;

    var drawGl = createGl(fShader, {
        width: 1024,
        height: 1024
    });
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
    assert.deepEqual(draw(), [0,0,1,1, 0,0,1,1, 0,0,1,1, 0,0,1,1])
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
