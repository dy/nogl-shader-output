var test = require('tst')
var glslify = require('glslify');
var almost = require('array-almost-equal');
var assert = require('assert');
var Shader = require('gl-shader');
var createGlContext = require('webgl-context');
var createGl = require('gl-shader-output')
var createNogl = require('../')


test('should process single point', function() {
    var vShader = glslify('./shaders/test.vert');
    var fShader = glslify('./shaders/blue.frag');

    var max = 10e2;

    test.skip('webgl', function () {
        var draw = createGl(fShader);
        assert.deepEqual(draw(), [0, 0, 1, 1]);
    });

    test('nogl', function () {
        var draw = createNogl(fShader);
        assert.deepEqual(draw(), [0, 0, 1, 1]);
    });
});


test('gl vs nogl performance', function() {
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

    test.skip('webgl', function () {
        var draw = createGl({
            shader: shader,
            width: 2,
            height: 2
        });
        assert.deepEqual(draw(), [0,0,1,1, 0,0,1,1, 0,0,1,1, 0,0,1,1])
    });

    test('nogl', function () {
        var draw = createNogl({
            shader: shader,
            width: 2,
            height: 2
        });
        assert.deepEqual(draw(), [0,0,1,1, 0,0,1,1, 0,0,1,1, 0,0,1,1])
    });
});

test.skip('should be able to handle alpha', function() {
    var shader = Shader(createGlContext(),
        glslify('./shaders/test.vert'),
        glslify('./shaders/alpha.frag')
    );

    test('webgl', function () {
        var draw = createGl({
            shader: shader
        });
        assert.deepEqual(draw(), [0, 0, 1, 0])
    });

    test('nogl', function () {
        var draw = createNogl({
            shader: shader
        });
        assert.deepEqual(draw(), [0, 0, 1, 0])
    });
});


test('should accept uniforms', function() {
    var shader = Shader(createGlContext(),
        glslify('./shaders/test.vert'),
        glslify('./shaders/uniforms.frag')
    );

    var input = [0, 0.25, 0.5, 1.0]
    var reversed = input.slice().reverse();

    test('webgl', function () {
        var draw = createGl({
            shader: shader
        })

        almost(draw({ u_value: input, multiplier: 1.0 }), reversed, 0.01)
        almost(draw({ u_value: input, multiplier: 3.0 }), [ 1, 1, 0.75, 0 ], 0.01)
    });

    test('nogl', function () {
        var draw = createNogl({
            shader: shader
        })

        almost(draw({ u_value: input, multiplier: 1.0 }), reversed, 0.01)
        almost(draw({ u_value: input, multiplier: 3.0 }), [ 1, 1, 0.75, 0 ], 0.01)
    });

});
