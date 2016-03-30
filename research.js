var test = require('tst');


test('The best way to provide environment', function () {
	/*
	setup:
	what is better - passing fns in environment
	or evaling fn each call, like shaders does

	results:
	- evaling fns each time in each shader call is slower as it seems shader creates inner function contexts each fn call, and the complexity of fn code affects the run of a function.
	- the best result is wrapping the most optimized short code by a cycle, the rest is unimportant. That implies that we should provide all the context variables before the cycle call and remove any technical lib access or prop reading code out of the cycle.
	- that means we cannot run eval function outside each call, we should provide the number of steps for it to run. eval(code, times)
	*/;


	var max = 10e5;


	//✘
	test('Inner definition', function () {
		function main () {
			fn1(fn2(1.2));

			function fn1(a){
				return a*a*a/2 + 1;
			}
			function fn2(a){
				return a*a*a*a*a* 2;
			}
		}

		for (var i = 0; i < max; i++) {
			main();
		}
	});

	//~
	test('Stdlib', function () {
		function main (_) {
			_.fn1(_.fn2(1.2));
		}

		var _ = {
			fn1: function fn1 (a){
				return a*a*a/2 + 1;
			},
			fn2: function fn2 (a){
				return a*a*a*a*a* 2;
			}
		}

		for (var i = 0; i < max; i++) {
			main(_)
		}
	});

	//~
	test('main.call', function () {
		function main () {
			this.fn1(this.fn2(1.2));
		}

		var _ = {
			fn1: function fn1 (a){
				return a*a*a/2 + 1;
			},
			fn2: function fn2 (a){
				return a*a*a*a*a* 2;
			}
		}

		for (var i = 0; i < max; i++) {
			main.call(_)
		}
	});

	//~
	test('Lib call', function () {
		var _ = {
			fn1: function fn1 (a){
				return a*a*a/2 + 1;
			},
			fn2: function fn2 (a){
				return a*a*a*a*a* 2;
			},
			main: function main () {
				this.fn1(this.fn2(1.2));
			}
		}


		for (var i = 0; i < max; i++) {
			_.main();
		}
	});

	//✔ - this is possible only in case where the cycle is on the same scope as main
	test('Outer scope', function () {
		function main () {
			fn1(fn2(1.2));
		}
		function fn1 (a){
			return a*a*a/2 + 1;
		}
		function fn2 (a){
			return a*a*a*a*a* 2;
		}

		for (var i = 0; i < max; i++) {
			main()
		}
	});

	//✔ - inner cycle requires fn body being wrapped directly to it
	test('Inner cycle', function () {
		function main () {
			for (var i = 0; i < max; i++) {
				fn1(fn2(1.2));
			}
		}
		function fn1 (a){
			return a*a*a/2 + 1;
		}
		function fn2 (a){
			return a*a*a*a*a* 2;
		}

		main();
	});

	//✔ - the best function call - with no external access
	//though troublesome to pass the long list of args
	test('Arguments', function () {
		function main (fn1, fn2) {
			fn1(fn2(1.2));
		}
		function fn1 (a){
			return a*a*a/2 + 1;
		}
		function fn2 (a){
			return a*a*a*a*a* 2;
		}
		function fn3 (a){
			return a*a*a/2 + 1;
		}
		function fn4 (a){
			return a*a*a*a*a* 2;
		}
		function fn5 (a){
			return a*a*a/2 + 1;
		}
		function fn6 (a){
			return a*a*a*a*a* 2;
		}

		for (var i = 0; i < max; i++) {
			main(fn1, fn2, fn3, fn4, fn5, fn6);
		}
	});

	//✔
	test('Wrapped all included', function () {
		var f = new Function('max',
			`
			function main (fn1, fn2) {
				fn1(fn2(1.2));
			}
			function fn1 (a){
				return a*a*a/2 + 1;
			}
			function fn2 (a){
				return a*a*a*a*a* 2;
			}

			for (var i = 0; i < max; i++) {
				main(fn1, fn2)
			}
			`
		);
		f(max);
	});

	//✔
	test('Wrapped called outside', function () {
		var f = new Function('fn1', 'fn2',
			`
				fn1(fn2(1.2));

			`
		);

		var _ = {
			fn1: function fn1 (a){
				return a*a*a/2 + 1;
			},
			fn2: function fn2 (a){
				return a*a*a*a*a* 2;
			}
		}

		for (var i = 0; i < max; i++) {
			f(_.fn1, _.fn2)
		}
	});

	//✔
	test('Wrapped called with lib', function () {
		var f = new Function('_', 'max',
			`
			var fn1 = _.fn1, fn2 = _.fn2;

			for (var i = 0; i < max; i++) {
					fn1(fn2(1.2));
			}

			`
		);

		var _ = {
			fn1: function fn1 (a){
				return a*a*a/2 + 1;
			},
			fn2: function fn2 (a){
				return a*a*a*a*a* 2;
			}
		}

		f(_, max);
	});
});



test('Varying attributes', function () {
	/*
	What is the most efficient way to provide varying/attributes - a values changing for each function call? The fn callback seems to be awesome, but is it really fast? Or webgl-way is better?
	*/;

	test.skip('Callback', function () {
		/*
		✘ callbacks are not a good idea, as each cycle it will call additional fn, which is redundant thing
		*/;
	});

	test('Buffer access', function () {
		/*
		✔ obviously pure math is better than fn call each cycle step.
		it should interpolate between side values. What is the good format for it?
		*/;

		test('Array range', function () {
			/*
			Provide varying as array of left and right range values.
			Seems easy and pretty. And performant.
			*/;

			eval(shader, {
				varying: {
					a: [[1, 2], [100, 200]]
				}
			});
		});

	});
});


test('✔ How do we interpolate varying?', function () {
	/**
	In basic webgl rendering varying values are interpolated between 3 verteces, which are walked by a rendered triangle -1..1 (clipped); so basically fragment shaders are interpolated by 3 verteces, linearly.
	 */

	test.skip('✘ Pass 3 points', function () {
		eval(shaderCode, {
			attributes: [p1, p2, p3],
			varying: [v1, v2, v3],

		});

		/**
		 * - In this case we need viewport size.
		 * ? Also a question how to grab export - gl_FragColors set.
		 */
	});

	test.skip('✘ Eval gl-shader', function () {
		var shader = Shader(vertex, fragment);

		eval(shader, {
			attributes: [a, b, c]
		});

		/**
		 * + we don’t need to pass varying - it is calculates automatically
		 * - we still need viewport size
		 * + we process verteces
		 * - we attach to gl-shader
		 *   + we could’ve recognized simple strings at the same time
		 *     - we ignore shader’s own data bindings
		 *       + we could’ve eval shader only, without passing separate data,
		 *         or passing it right to the shader.
		 *         - shader binds to a gl context, we don’t have one.
		 *         - shader also ignores framebuffer (output)
		 *         - shader also requires using webgl buffer to bind data
		 *           it can’t use custom arrays
		 *           + anyways it’s nice idea to manage webbuffer
		 *         + shader reflects pointers to access to buffers for us.
		 *           - we can use that manually
		 * + gl-shader-output compatible
		 * ✘ too complicated all in all, too many questions
		 */
	});

	test('✔ Eval quad shader', function () {
		/**
		 * Like gl-shader-output, but eval textural shader instead.
		 *
		 * + passing size 1:1 becomes a gl-shader-output.
		 * + avoids the problem of keeping sizes - it is one of the properties
		 * + avoids the problem of inputs/outputs - they are quad buffers/ndarrays
		 * + avoids problem of verteces - it is one huge renderer
		 * + we don’t need to pass functions separately, shader eval will read them once and provide along with environment, bultins etc.
		 * + it is perfect for 2d effects and for audio processing.
		 */
		var draw = ShaderEval({
			shader: shader,
			gl: gl,
			//...webgl-context options
		});

		var result = draw({
			a: texture,
			b: vecArray,
			c: float
		});

		test('✘ Should we stick to gl-shader-output?', function () {
			/*
			 + it makes easy and compatible API
			 - it is redundant: we create unnecessary shader and unused options
			 - ideally we provide only API we ever need and nothing else, as everything else confuses things
			 	+ but what is useful, not theoretically pure?
			 		- ✔ we can just recognize the shader, if passed one. That is going to be easy.
			 - using gl-shader-output we also stick to gl-shader. That makes things difficultier with no reason.
			 */
		});

		test('How do we pass attributes to a vertex shader?', function () {
			/*
			 ? what are the use-cases for that? Something other than coords?
			 	- color, material, ...
			 		+ all that can be passed through uniforms data, as we paint a single shader.
			 */
		});

		//Resulting API:

		var draw = Eval({
			width: 200,
			height: 120,
			gl: gl?,
			// ...context opts
		});

		draw({
			u1: [],
			u2: []
		});
	});
});

test('What should be the name of the package', function () {
	test.skip('gl-eval', function () {
		var ShaderEval = require('gl-eval');

		/*
		 - This is not a real gl-eval
		 - The class name does not make any sense
		 */
	});

	test('gl-shader-eval', function () {
		var ShaderEval = require('shader-eval')({

		});

		/*

		 */
	});

	test('gl-draw', function () {
		var Draw = require('shader-draw')

		/*
		 - It shouldn’t be called gl-shader-*, because shader supposes using real gl-shader.
		 	+ Though we can use that shader really.
		 */
	});

	test('gl-run', function () {

	});
});