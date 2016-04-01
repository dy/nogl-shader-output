var test = require('tst')
var glslify = require('glslify');
var almost = require('almost-equal');
var assert = require('assert');
var Shader = require('gl-shader');
var createGlContext = require('webgl-context');
var createGl = require('gl-shader-output')
var createNogl = require('../')



/**
 * Add almost method
 */
assert.almost = function (x, y) {
    if (Array.isArray(x) && Array.isArray(y)) return x.every(function (xi, i) {
        try {
            assert.almost(xi, y[i]);
        } catch (e) {
            assert.fail(x, y, `${x} ≈ ${y}`, '≈')
        }
    });

    var EPSILON = 10e-10;
    if (!almost(x, y, EPSILON)) assert.fail(x, y,
        `${x} ≈ ${y}`, '≈');
    return true;
};



test('should process single point', function() {
    var vShader = glslify('./shaders/test.vert');
    var fShader = glslify('./shaders/blue.frag');

    var max = 10e2;

    var draw = createNogl(fShader);
    assert.deepEqual(draw(), [0, 0, 1, 1]);
});


test.skip('gl vs nogl performance', function() {
    var vShader = glslify('./shaders/test.vert');
    var fShader = glslify('./shaders/blue.frag');

    var max = 10e2;

    // var drawGl = createGl(fShader);
    var drawNogl = createNogl(fShader);

    test.skip('webgl', function () {
        for (var i = 0; i < max; i++) {
            drawGl();
        }
    });
    test('nogl', function () {
        for (var i = 0; i < max; i++) {
            drawNogl();
        }
    });
});


test('should process more-than-one dimension input', function() {
    var shader = Shader(createGlContext(),
        glslify('./shaders/test.vert'),
        glslify('./shaders/blue.frag')
    );

    var draw = createNogl({
        shader: shader,
        width: 2,
        height: 2
    });
    assert.deepEqual(draw(), [0,0,1,1, 0,0,1,1, 0,0,1,1, 0,0,1,1])
});

test('should be able to handle alpha', function() {
    var shader = Shader(createGlContext(),
        glslify('./shaders/test.vert'),
        glslify('./shaders/alpha.frag')
    );
    var draw = createNogl({
        shader: shader
    });
    assert.deepEqual(draw(), [0, 0, 1, 0])
});


test('should accept uniforms', function() {
    var shader = Shader(createGlContext(),
        glslify('./shaders/test.vert'),
        glslify('./shaders/uniforms.frag')
    );

    var input = [0, 0.25, 0.5, 1.0]
    var reversed = input.slice().reverse();

    var draw = createNogl({
        shader: shader
    })

    assert.almost(draw({ u_value: input, multiplier: 1.0 }), reversed, 0.01)
    assert.almost(draw({ u_value: input, multiplier: 3.0 }), [ 3, 1.5, 0.75, 0 ], 0.01)

});
