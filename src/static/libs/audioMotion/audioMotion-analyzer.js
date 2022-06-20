/**!
 * audioMotion-analyzer
 * High-resolution real-time graphic audio spectrum analyzer JS module
 *
 * @version 4.0.0-beta.0
 * @author  Henrique Avila Vianna <hvianna@gmail.com> <https://henriquevianna.com>
 * @license AGPL-3.0-or-later
 */

const VERSION = '4.0.0-beta.0';

// internal constants
const TAU     = 2 * Math.PI,
	  HALF_PI = Math.PI / 2,
	  RPM     = TAU / 3600,  // angle increment per frame for one revolution per minute @60fps
	  C_1     = 8.17579892;  // frequency for C -1

const CANVAS_BACKGROUND_COLOR  = '#000',
 	  GRADIENT_DEFAULT_BGCOLOR = '#111',
	  FONT_FAMILY              = 'sans-serif',
	  FPS_COLOR                = '#0f0',
	  LEDS_UNLIT_COLOR         = '#7f7f7f22',
	  SCALEX_BACKGROUND_COLOR  = '#000c',
	  SCALEX_LABEL_COLOR       = '#fff',
	  SCALEX_HIGHLIGHT_COLOR   = '#4f4',
	  SCALEY_LABEL_COLOR       = '#888',
	  SCALEY_MIDLINE_COLOR     = '#555';

// custom error messages
const ERR_AUDIO_CONTEXT_FAIL     = [ 'ERR_AUDIO_CONTEXT_FAIL', 'Could not create audio context. Web Audio API not supported?' ],
	  ERR_INVALID_AUDIO_CONTEXT  = [ 'ERR_INVALID_AUDIO_CONTEXT', 'Provided audio context is not valid' ],
	  ERR_UNKNOWN_GRADIENT       = [ 'ERR_UNKNOWN_GRADIENT', 'Unknown gradient' ],
	  ERR_FREQUENCY_TOO_LOW      = [ 'ERR_FREQUENCY_TOO_LOW', 'Frequency values must be >= 1' ],
	  ERR_INVALID_MODE           = [ 'ERR_INVALID_MODE', 'Invalid mode' ],
	  ERR_REFLEX_OUT_OF_RANGE    = [ 'ERR_REFLEX_OUT_OF_RANGE', 'Reflex ratio must be >= 0 and < 1' ],
	  ERR_INVALID_AUDIO_SOURCE   = [ 'ERR_INVALID_AUDIO_SOURCE', 'Audio source must be an instance of HTMLMediaElement or AudioNode' ],
	  ERR_GRADIENT_INVALID_NAME  = [ 'ERR_GRADIENT_INVALID_NAME', 'Gradient name must be a non-empty string' ],
	  ERR_GRADIENT_NOT_AN_OBJECT = [ 'ERR_GRADIENT_NOT_AN_OBJECT', 'Gradient options must be an object' ],
	  ERR_GRADIENT_MISSING_COLOR = [ 'ERR_GRADIENT_MISSING_COLOR', 'Gradient must define at least two colors' ];

class AudioMotionError extends Error {
	constructor( error, value ) {
		const [ code, message ] = error;
		super( message + ( value !== undefined ? `: ${value}` : '' ) );
		this.name = 'AudioMotionError';
		this.code = code;
	}
}

// AudioMotionAnalyzer class

export default class AudioMotionAnalyzer {

/**
 * CONSTRUCTOR
 *
 * @param {object} [container] DOM element where to insert the analyzer; if undefined, uses the document body
 * @param {object} [options]
 * @returns {object} AudioMotionAnalyzer object
 */
	constructor( container, options = {} ) {

		this._ready = false;

		// Gradient definitions

		this._gradients = {
			classic: {
				bgColor: GRADIENT_DEFAULT_BGCOLOR,
				colorStops: [
					'hsl( 0, 100%, 50% )',
					{ pos: .6, color: 'hsl( 60, 100%, 50% )' },
					'hsl( 120, 100%, 50% )'
				]
			},
			prism:   {
				bgColor: GRADIENT_DEFAULT_BGCOLOR,
				colorStops: [
					'hsl( 0, 100%, 50% )',
					'hsl( 60, 100%, 50% )',
					'hsl( 120, 100%, 50% )',
					'hsl( 180, 100%, 50% )',
					'hsl( 240, 100%, 50% )'
				]
			},
			rainbow: {
				bgColor: GRADIENT_DEFAULT_BGCOLOR,
				dir: 'h',
				colorStops: [
					'hsl( 0, 100%, 50% )',
					'hsl( 60, 100%, 50% )',
					'hsl( 120, 100%, 50% )',
					'hsl( 180, 100%, 47% )',
					'hsl( 240, 100%, 58% )',
					'hsl( 300, 100%, 50% )',
					'hsl( 360, 100%, 50% )'
				]
			},
		};

		// Set container
		this._container = container || document.body;

		// Make sure we have minimal width and height dimensions in case of an inline container
		this._defaultWidth  = this._container.clientWidth  || 640;
		this._defaultHeight = this._container.clientHeight || 270;

		// Use audio context provided by user, or create a new one

		let audioCtx;

		if ( options.source && ( audioCtx = options.source.context ) ) {
			// get audioContext from provided source audioNode
		}
		else if ( audioCtx === options.audioCtx ) {
			// use audioContext provided by user
		}
		else {
			try {
				audioCtx = new ( window.AudioContext || window.webkitAudioContext )();
			}
			catch( err ) {
				throw new AudioMotionError( ERR_AUDIO_CONTEXT_FAIL );
			}
		}

		// make sure audioContext is valid
		if ( ! audioCtx.createGain )
			throw new AudioMotionError( ERR_INVALID_AUDIO_CONTEXT );

		/*
			Connection routing:
			===================

			for STEREO:                              +--->  analyzer[0]  ---+
		    	                                     |                      |
			(source) --->  input  --->  splitter  ---+                      +--->  merger  --->  output  ---> (destination)
		    	                                     |                      |
		        	                                 +--->  analyzer[1]  ---+

			for MONO:

			(source) --->  input  ----------------------->  analyzer[0]  --------------------->  output  ---> (destination)

		*/

		// create the analyzer nodes, channel splitter and merger, and gain nodes for input/output connections
		const analyzer = this._analyzer = [ audioCtx.createAnalyser(), audioCtx.createAnalyser() ];
		const splitter = this._splitter = audioCtx.createChannelSplitter(2);
 		const merger   = this._merger   = audioCtx.createChannelMerger(2);
 		this._input    = audioCtx.createGain();
 		this._output   = audioCtx.createGain();

 		// initialize sources array and connect audio source if provided in the options
		this._sources = [];
		if ( options.source )
			this.connectInput( options.source );

 		// connect splitter -> analyzers
 		for ( const i of [0,1] )
			splitter.connect( analyzer[ i ], i );

		// connect merger -> output
		merger.connect( this._output );

		// connect output -> destination (speakers)
		this._outNodes = [];
		if ( options.connectSpeakers !== false )
			this.connectOutput();

		// initialize object to save energy
		this._energy = { val: 0, peak: 0, hold: 0 };

		// create analyzer canvas
		const canvas = document.createElement('canvas');
		canvas.style = 'max-width: 100%;';
		this._canvasCtx = canvas.getContext('2d');

		// create auxiliary canvases for the X-axis and radial scale labels
		for ( const ctx of [ '_scaleX', '_scaleR' ] )
			this[ ctx ] = document.createElement('canvas').getContext('2d');

		// set fullscreen element (defaults to canvas)
		this._fsEl = options.fsElement || canvas;

		// Update canvas size on container / window resize and fullscreen events

		// Fullscreen changes are handled quite differently across browsers:
		// 1. Chromium browsers will trigger a `resize` event followed by a `fullscreenchange`
		// 2. Firefox triggers the `fullscreenchange` first and then the `resize`
		// 3. Chrome on Android (TV) won't trigger a `resize` event, only `fullscreenchange`
		// 4. Safari won't trigger `fullscreenchange` events at all, and on iPadOS the `resize`
		//    event is triggered **on the window** only (last tested on iPadOS 14)

		// helper function for resize events
		const onResize = () => {
			if ( ! this._fsTimeout ) {
				// delay the resize to prioritize a possible following `fullscreenchange` event
				this._fsTimeout = window.setTimeout( () => {
					if ( ! this._fsChanging ) {
						this._setCanvas('resize');
						this._fsTimeout = 0;
					}
				}, 60 );
			}
		}

		// if browser supports ResizeObserver, listen for resize on the container
		if ( window.ResizeObserver ) {
			const resizeObserver = new ResizeObserver( onResize );
			resizeObserver.observe( this._container );
		}

		// listen for resize events on the window - required for fullscreen on iPadOS
		window.addEventListener( 'resize', onResize );

		// listen for fullscreenchange events on the canvas - not available on Safari
		canvas.addEventListener( 'fullscreenchange', () => {
			// set flag to indicate a fullscreen change in progress
			this._fsChanging = true;

			// if there is a scheduled resize event, clear it
			if ( this._fsTimeout )
				window.clearTimeout( this._fsTimeout );

			// update the canvas
			this._setCanvas('fschange');

			// delay clearing the flag to prevent any shortly following resize event
			this._fsTimeout = window.setTimeout( () => {
				this._fsChanging = false;
				this._fsTimeout = 0;
			}, 60 );
		});

		// Resume audio context if in suspended state (browsers' autoplay policy)
		const unlockContext = () => {
			if ( audioCtx.state === 'suspended' )
				audioCtx.resume();
			window.removeEventListener( 'click', unlockContext );
		}
		window.addEventListener( 'click', unlockContext );

		// initialize internal variables
		this._calcAux();

		// Set configuration options and use defaults for any missing properties
		this._setProps( options, true );

		// add canvas to the container
		if ( this.useCanvas )
			this._container.appendChild( canvas );

		// Finish canvas setup
		this._ready = true;
		this._setCanvas('create');
	}

	/**
	 * ==========================================================================
	 *
	 * PUBLIC PROPERTIES GETTERS AND SETTERS
	 *
	 * ==========================================================================
	 */

	get alphaBars() {
		return this._alphaBars;
	}
	set alphaBars( value ) {
		this._alphaBars = !! value;
		this._calcAux();
	}

	get ansiBands() {
		return this._ansiBands;
	}
	set ansiBands( value ) {
		this._ansiBands = !! value;
		this._calcBars();
	}

	get barSpace() {
		return this._barSpace;
	}
	set barSpace( value ) {
		this._barSpace = +value || 0;
		this._calcAux();
	}

	get fftSize() {
		return this._analyzer[0].fftSize;
	}
	set fftSize( value ) {
		for ( const i of [0,1] )
			this._analyzer[ i ].fftSize = value;
		const binCount = this._analyzer[0].frequencyBinCount;
		this._fftData = [ new Uint8Array( binCount ), new Uint8Array( binCount ) ];
		this._calcBars();
	}

	get gradient() {
		return this._gradient;
	}
	set gradient( value ) {
		if ( ! this._gradients.hasOwnProperty( value ) )
			throw new AudioMotionError( ERR_UNKNOWN_GRADIENT, value );

		this._gradient = value;
		this._makeGrad();
	}

	get height() {
		return this._height;
	}
	set height( h ) {
		this._height = h;
		this._setCanvas('user');
	}

	get ledBars() {
		return this._showLeds;
	}
	set ledBars( value ) {
		this._showLeds = !! value;
		this._calcAux();
	}

	get loRes() {
		return this._loRes;
	}
	set loRes( value ) {
		this._loRes = !! value;
		this._setCanvas('lores');
	}

	get lumiBars() {
		return this._lumiBars;
	}
	set lumiBars( value ) {
		this._lumiBars = !! value;
		this._calcAux();
		this._calcLeds();
		this._makeGrad();
	}

	get maxDecibels() {
		return this._analyzer[0].maxDecibels;
	}
	set maxDecibels( value ) {
		for ( const i of [0,1] )
			this._analyzer[ i ].maxDecibels = value;
	}

	get maxFreq() {
		return this._maxFreq;
	}
	set maxFreq( value ) {
		if ( value < 1 )
			throw new AudioMotionError( ERR_FREQUENCY_TOO_LOW );
		else {
			this._maxFreq = Math.min( value, this.audioCtx.sampleRate / 2 );
			this._calcBars();
		}
	}

	get minDecibels() {
		return this._analyzer[0].minDecibels;
	}
	set minDecibels( value ) {
		for ( const i of [0,1] )
			this._analyzer[ i ].minDecibels = value;
	}

	get minFreq() {
		return this._minFreq;
	}
	set minFreq( value ) {
		if ( value < 1 )
			throw new AudioMotionError( ERR_FREQUENCY_TOO_LOW );
		else {
			this._minFreq = +value;
			this._calcBars();
		}
	}

	get mirror() {
		return this._mirror;
	}
	set mirror( value ) {
		this._mirror = Math.sign( value ) | 0; // ensure only -1, 0 or 1
		this._calcAux();
		this._calcBars();
		this._makeGrad();
	}

	get mode() {
		return this._mode;
	}
	set mode( value ) {
		const mode = value | 0;
		if ( mode >= 0 && mode <= 10 && mode !== 9 ) {
			this._mode = mode;
			this._calcAux();
			this._calcBars();
			this._makeGrad();
		}
		else
			throw new AudioMotionError( ERR_INVALID_MODE, value );
	}

	get noteLabels() {
		return this._noteLabels;
	}
	set noteLabels( value ) {
		this._noteLabels = !! value;
		this._createScales();
	}

	get outlineBars() {
		return this._outlineBars;
	}
	set outlineBars( value ) {
		this._outlineBars = !! value;
		this._calcAux();
	}

	get radial() {
		return this._radial;
	}
	set radial( value ) {
		this._radial = !! value;
		this._calcAux();
		this._calcBars();
		this._makeGrad();
	}

	get reflexRatio() {
		return this._reflexRatio;
	}
	set reflexRatio( value ) {
		value = +value || 0;
		if ( value < 0 || value >= 1 )
			throw new AudioMotionError( ERR_REFLEX_OUT_OF_RANGE );
		else {
			this._reflexRatio = value;
			this._calcAux();
			this._makeGrad();
			this._calcLeds();
		}
	}

	get smoothing() {
		return this._analyzer[0].smoothingTimeConstant;
	}
	set smoothing( value ) {
		for ( const i of [0,1] )
			this._analyzer[ i ].smoothingTimeConstant = value;
	}

	get spinSpeed() {
		return this._spinSpeed;
	}
	set spinSpeed( value ) {
		value = +value || 0;
		if ( this._spinSpeed === undefined || value === 0 )
			this._spinAngle = -HALF_PI; // initialize or reset the rotation angle
		this._spinSpeed = value;
	}

	get splitGradient() {
		return this._splitGradient;
	}
	set splitGradient( value ) {
		this._splitGradient = !! value;
		this._makeGrad();
	}

	get stereo() {
		return this._stereo;
	}
	set stereo( value ) {
		this._stereo = !! value;

		// update node connections
		this._input.disconnect();
		this._input.connect( this._stereo ? this._splitter : this._analyzer[0] );
		this._analyzer[0].disconnect();
		if ( this._outNodes.length ) // connect analyzer only if the output is connected to other nodes
			this._analyzer[0].connect( this._stereo ? this._merger : this._output );

		// update properties affected by stereo
		this._calcAux();
		this._createScales();
		this._calcLeds();
		this._makeGrad();
	}

	get volume() {
		return this._output.gain.value;
	}
	set volume( value ) {
		this._output.gain.value = value;
	}

	get width() {
		return this._width;
	}
	set width( w ) {
		this._width = w;
		this._setCanvas('user');
	}

	// Read only properties

	get audioCtx() {
		return this._input.context;
	}
	get canvas() {
		return this._canvasCtx.canvas;
	}
	get canvasCtx() {
		return this._canvasCtx;
	}
	get connectedSources() {
		return this._sources;
	}
	get connectedTo() {
		return this._outNodes;
	}
	get fps() {
		return this._fps;
	}
	get fsHeight() {
		return this._fsHeight;
	}
	get fsWidth() {
		return this._fsWidth;
	}
	get isAlphaBars() {
		return this._isAlphaBars;
	}
	get isFullscreen() {
		return ( document.fullscreenElement || document.webkitFullscreenElement ) === this._fsEl;
	}
	get isLedBars() {
		return this._isLedDisplay;
	}
	get isLumiBars() {
		return this._isLumiBars;
	}
	get isOctaveBands() {
		return this._isOctaveBands;
	}
	get isOn() {
		return this._runId !== undefined;
	}
	get isOutlineBars() {
		return this._isOutline;
	}
	get pixelRatio() {
		return this._pixelRatio;
	}
	static get version() {
		return VERSION;
	}

	/**
	 * ==========================================================================
     *
	 * PUBLIC METHODS
	 *
	 * ==========================================================================
	 */

	/**
	 * Connects an HTML media element or audio node to the analyzer
	 *
	 * @param {object} an instance of HTMLMediaElement or AudioNode
	 * @returns {object} a MediaElementAudioSourceNode object if created from HTML element, or the same input object otherwise
	 */
	connectInput( source ) {
		const isHTML = source instanceof HTMLMediaElement;

		if ( ! ( isHTML || source.connect ) )
			throw new AudioMotionError( ERR_INVALID_AUDIO_SOURCE );

		// if source is an HTML element, create an audio node for it; otherwise, use the provided audio node
		const node = isHTML ? this.audioCtx.createMediaElementSource( source ) : source;

		if ( ! this._sources.includes( node ) ) {
			node.connect( this._input );
			this._sources.push( node );
		}

		return node;
	}

	/**
	 * Connects the analyzer output to another audio node
	 *
	 * @param [{object}] an AudioNode; if undefined, the output is connected to the audio context destination (speakers)
	 */
	connectOutput( node = this.audioCtx.destination ) {
		if ( this._outNodes.includes( node ) )
			return;

		this._output.connect( node );
		this._outNodes.push( node );

		// when connecting the first node, also connect the analyzer nodes to the merger / output nodes
		if ( this._outNodes.length === 1 ) {
			for ( const i of [0,1] )
				this._analyzer[ i ].connect( ( ! this._stereo && ! i ? this._output : this._merger ), 0, i );
		}
	}

	/**
	 * Disconnects audio sources from the analyzer
	 *
	 * @param [{object|array}] a connected AudioNode object or an array of such objects; if undefined, all connected nodes are disconnected
	 */
	disconnectInput( sources ) {
		if ( ! sources )
			sources = Array.from( this._sources );
		else if ( ! Array.isArray( sources ) )
			sources = [ sources ];

		for ( const node of sources ) {
			const idx = this._sources.indexOf( node );
			if ( idx >= 0 ) {
				node.disconnect( this._input );
				this._sources.splice( idx, 1 );
			}
		}
	}

	/**
	 * Disconnects the analyzer output from other audio nodes
	 *
	 * @param [{object}] a connected AudioNode object; if undefined, all connected nodes are disconnected
	 */
	disconnectOutput( node ) {
		if ( node && ! this._outNodes.includes( node ) )
			return;

		this._output.disconnect( node );
		this._outNodes = node ? this._outNodes.filter( e => e !== node ) : [];

		// if disconnected from all nodes, also disconnect the analyzer nodes so they keep working on Chromium
		// see https://github.com/hvianna/audioMotion-analyzer/issues/13#issuecomment-808764848
		if ( this._outNodes.length === 0 ) {
			for ( const i of [0,1] )
				this._analyzer[ i ].disconnect();
		}
	}

	/**
	 * Returns analyzer bars data
     *
	 * @returns {array}
	 */
	getBars() {
		return Array.from( this._bars, ( { posX, freq, freqLo, freqHi, hold, peak, value } ) => ( { posX, freq, freqLo, freqHi, hold, peak, value } ) );
	}

	/**
	 * Returns the energy of a frequency, or average energy of a range of frequencies
	 *
	 * @param [{number|string}] single or initial frequency (Hz), or preset name; if undefined, returns the overall energy
	 * @param [{number}] ending frequency (Hz)
	 * @returns {number|null} energy value (0 to 1) or null, if the specified preset is unknown
	 */
	getEnergy( startFreq, endFreq ) {
		if ( startFreq === undefined )
			return this._energy.val;

		// if startFreq is a string, check for presets
		if ( startFreq !== +startFreq ) {
			if ( startFreq === 'peak' )
				return this._energy.peak;

			const presets = {
				bass:    [ 20, 250 ],
				lowMid:  [ 250, 500 ],
				mid:     [ 500, 2e3 ],
				highMid: [ 2e3, 4e3 ],
				treble:  [ 4e3, 16e3 ]
			}

			if ( ! presets[ startFreq ] )
				return null;

			[ startFreq, endFreq ] = presets[ startFreq ];
		}

		const startBin = this._freqToBin( startFreq ),
		      endBin   = endFreq ? this._freqToBin( endFreq ) : startBin,
		      chnCount = this._stereo + 1;

		let energy = 0;
		for ( let channel = 0; channel < chnCount; channel++ ) {
			for ( let i = startBin; i <= endBin; i++ )
				energy += this._fftData[ channel ][ i ];
		}

		return energy / ( endBin - startBin + 1 ) / chnCount / 255;
	}

	/**
	 * Registers a custom gradient
	 *
	 * @param {string} name
	 * @param {object} options
	 */
	registerGradient( name, options ) {
		if ( typeof name !== 'string' || name.trim().length === 0 )
			throw new AudioMotionError( ERR_GRADIENT_INVALID_NAME );

		if ( typeof options !== 'object' )
			throw new AudioMotionError( ERR_GRADIENT_NOT_AN_OBJECT );

		if ( options.colorStops === undefined || options.colorStops.length < 2 )
			throw new AudioMotionError( ERR_GRADIENT_MISSING_COLOR );

		this._gradients[ name ] = {
			bgColor:    options.bgColor || GRADIENT_DEFAULT_BGCOLOR,
			dir:        options.dir,
			colorStops: options.colorStops
		};

		// if the registered gradient is the current one, regenerate it
		if ( name === this._gradient )
			this._makeGrad();
	}

	/**
	 * Set dimensions of analyzer's canvas
	 *
	 * @param {number} w width in pixels
	 * @param {number} h height in pixels
	 */
	setCanvasSize( w, h ) {
		this._width = w;
		this._height = h;
		this._setCanvas('user');
	}

	/**
	 * Set desired frequency range
	 *
	 * @param {number} min lowest frequency represented in the x-axis
	 * @param {number} max highest frequency represented in the x-axis
	 */
	setFreqRange( min, max ) {
		if ( min < 1 || max < 1 )
			throw new AudioMotionError( ERR_FREQUENCY_TOO_LOW );
		else {
			this._minFreq = Math.min( min, max );
			this.maxFreq  = Math.max( min, max ); // use the setter for maxFreq
		}
	}

	/**
	 * Set custom parameters for LED effect
	 * If called with no arguments or if any property is invalid, clears any previous custom parameters
	 *
	 * @param {object} [params]
	 */
	setLedParams( params ) {
		let maxLeds, spaceV, spaceH;

		// coerce parameters to Number; `NaN` results are rejected in the condition below
		if ( params ) {
			maxLeds = params.maxLeds | 0; // ensure integer
			spaceV  = +params.spaceV;
			spaceH  = +params.spaceH;
		}

		this._ledParams = maxLeds > 0 && spaceV > 0 && spaceH >= 0 ? [ maxLeds, spaceV, spaceH ] : undefined;
		this._calcLeds();
	}

	/**
	 * Shorthand function for setting several options at once
	 *
	 * @param {object} options
	 */
	setOptions( options ) {
		this._setProps( options );
	}

	/**
	 * Adjust the analyzer's sensitivity
	 *
	 * @param {number} min minimum decibels value
	 * @param {number} max maximum decibels value
	 */
	setSensitivity( min, max ) {
		for ( const i of [0,1] ) {
			this._analyzer[ i ].minDecibels = Math.min( min, max );
			this._analyzer[ i ].maxDecibels = Math.max( min, max );
		}
	}

	/**
	 * Start / stop canvas animation
	 *
	 * @param {boolean} [value] if undefined, inverts the current status
	 * @returns {boolean} resulting status after the change
	 */
	toggleAnalyzer( value ) {
		const started = this.isOn;

		if ( value === undefined )
			value = ! started;

		if ( started && ! value ) {
			cancelAnimationFrame( this._runId );
			this._runId = undefined;
		}
		else if ( ! started && value ) {
			this._frame = this._fps = 0;
			this._time = performance.now();
			this._runId = requestAnimationFrame( timestamp => this._draw( timestamp ) );
		}

		return this.isOn;
	}

	/**
	 * Toggles canvas full-screen mode
	 */
	toggleFullscreen() {
		if ( this.isFullscreen ) {
			if ( document.exitFullscreen )
				document.exitFullscreen();
			else if ( document.webkitExitFullscreen )
				document.webkitExitFullscreen();
		}
		else {
			const fsEl = this._fsEl;
			if ( fsEl.requestFullscreen )
				fsEl.requestFullscreen();
			else if ( fsEl.webkitRequestFullscreen )
				fsEl.webkitRequestFullscreen();
		}
	}

	/**
	 * ==========================================================================
	 *
	 * PRIVATE METHODS
	 *
	 * ==========================================================================
	 */

	/**
	 * Calculate auxiliary values and flags
	 */
	_calcAux() {
		const canvas   = this.canvas,
			  isRadial = this._radial,
			  isDual   = this._stereo && ! isRadial,
			  centerX  = canvas.width >> 1;

		this._radius         = Math.min( canvas.width, canvas.height ) * ( this._stereo ? .375 : .125 ) | 0;
		this._barSpacePx     = Math.min( this._barWidth - 1, ( this._barSpace > 0 && this._barSpace < 1 ) ? this._barWidth * this._barSpace : this._barSpace );
		this._isOctaveBands  = this._mode % 10 !== 0;
		this._isLedDisplay   = this._showLeds && this._isOctaveBands && ! isRadial;
		this._isLumiBars     = this._lumiBars && this._isOctaveBands && ! isRadial;
		this._isAlphaBars    = this._alphaBars && ! this._isLumiBars && this._mode !== 10;
		this._isOutline      = this._outlineBars && this._isOctaveBands && ! this._isLumiBars && ! this._isLedDisplay;
		this._maximizeLeds   = ! this._stereo || (this._reflexRatio > 0 && ! this._isLumiBars);

		this._channelHeight  = canvas.height - ( isDual && ! this._isLedDisplay ? .5 : 0 ) >> isDual;
		this._analyzerHeight = this._channelHeight * ( this._isLumiBars || isRadial ? 1 : 1 - this._reflexRatio ) | 0;

		// channelGap is **0** if isLedDisplay === true (LEDs already have spacing); **1** if canvas height is odd (windowed); **2** if it's even
		// TODO: improve this, make it configurable?
		this._channelGap     = isDual ? canvas.height - this._channelHeight * 2 : 0;

		this._analyzerWidth  = canvas.width - centerX * ( this._mirror !== 0 );
		this._initialX       = centerX * ( this._mirror === -1 && ! isRadial );
	}

	/**
	 * Precalculate the actual X-coordinate on screen for each analyzer bar
	 */
	_calcBars() {
		/*
	 	   Since the frequency scale is logarithmic, each position in the X-axis actually represents a power of 10.
	 	   To improve performace, the position of each frequency is calculated in advance and stored in an array.
	 	   Canvas space usage is optimized to accommodate exactly the frequency range the user needs.
	 	   Positions need to be recalculated whenever the frequency range, FFT size or canvas size change.

	 	                                +-------------------------- canvas --------------------------+
	 	                                |                                                            |
	 	      |-------------------|-----|-------------|-------------------|-------------------|------|------------|
	 	      1                  10     |            100                  1K                 10K     |           100K (Hz)
	 	   (10^0)              (10^1)   |          (10^2)               (10^3)              (10^4)   |          (10^5)
	 	                                |-------------|<--- logWidth ---->|--------------------------|
	 	                    minFreq--> 20                   (pixels)                                22K <--maxFreq
	 	                            (10^1.3)                                                     (10^4.34)
	 	                                 ^
	 	                               minLog
	 	*/

		const bars = this._bars = []; // initialize object property

		if ( ! this._ready )
			return;

		// helper functions
		const binToFreq = bin => bin * this.audioCtx.sampleRate / this.fftSize || 1; // returns 1 for bin 0
		const barsPush  = args => bars.push( { ...args, peak: [0,0], hold: [0], value: [0] } );
		// bar object: { posX, freq, freqLo, freqHi, binLo, binHi, ratioLo, ratioHi, peak, hold, value }

		const analyzerWidth = this._analyzerWidth,
			  initialX      = this._initialX,
			  isAnsiBands   = this._ansiBands,
			  maxFreq       = this._maxFreq,
			  minFreq       = this._minFreq;

		let minLog,	logWidth;

		if ( this._isOctaveBands ) {
			/*
				A simple interpolation is used to obtain an approximate amplitude value for any given frequency,
				from the available FFT data. We find the FFT bin which closer matches the desired frequency	and
				interpolate its value with that of the next adjacent bin, like so:

					v = v0 + ( v1 - v0 ) * ( log2( f / f0 ) / log2( f1 / f0 ) )
					                       \__________________________________/
					                                        |
					                                      ratio
					where:

					f  - desired frequency
					v  - amplitude (volume) of desired frequency
					f0 - frequency represented by the lower FFT bin
					f1 - frequency represented by the upper FFT bin
					v0 - amplitude of f0
					v1 - amplitude of f1

				ratio is calculated in advance here, to reduce computational complexity during real-time rendering.
			*/

			// helper function to calculate FFT bin and interpolation ratio for a given frequency
			const calcRatio = freq => {
				const bin   = this._freqToBin( freq, 'floor' ), // find closest FFT bin
					  lower = binToFreq( bin ),
					  upper = binToFreq( bin + 1 ),
					  ratio = Math.log2( freq / lower ) / Math.log2( upper / lower );

				return [ bin, ratio ];
			}

			// helper function to round a value to a given number of significant digits
			// `atLeast` set to true prevents reducing the number of integer significant digits
			const roundSD = ( value, digits, atLeast ) => +value.toPrecision( atLeast ? Math.max( digits, 1 + Math.log10( value ) | 0 ) : digits );

			// helper function to find the nearest preferred number (Renard series) for a given value
			const nearestPreferred = value => {
				// R20 series is used here, as it provides closer approximations for 1/2 octave bands (non-standard)
				const preferred = [ 1, 1.12, 1.25, 1.4, 1.6, 1.8, 2, 2.24, 2.5, 2.8, 3.15, 3.55, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9, 10 ],
					  power = Math.log10( value ) | 0,
					  normalized = value / 10 ** power;

				let i = 1;
				while ( i < preferred.length && normalized > preferred[ i ] )
					i++;

				if ( normalized - preferred[ i - 1 ] < preferred[ i ] - normalized )
					i--;

				return ( preferred[ i ] * 10 ** ( power + 5 ) | 0 ) / 1e5; // keep 5 significant digits
			}

			// ANSI standard octave bands use the base-10 frequency ratio, as preferred by [ANSI S1.11-2004, p.2]
			// The equal-tempered scale uses the base-2 ratio
			const bands = [0,24,12,8,6,4,3,2,1][ this._mode ],
				  bandWidth = isAnsiBands ? 10 ** ( 3 / ( bands * 10 ) ) : 2 ** ( 1 / bands ), // 10^(3/10N) or 2^(1/N)
				  halfBand  = bandWidth ** .5;

			let analyzerBars = [],
				currFreq = isAnsiBands ? 7.94328235 / ( bands % 2 ? 1 : halfBand ) : C_1;
				// For ANSI bands with even denominators (all except 1/1 and 1/3), the reference frequency (1 kHz)
				// must fall on the edges of a pair of adjacent bands, instead of midband [ANSI S1.11-2004, p.2]
				// In the equal-tempered scale, all midband frequencies represent a musical note or quarter-tone.

			do {
				let freq = currFreq; // midband frequency

				const freqLo = roundSD( freq / halfBand, 4, true ), // lower edge frequency
					  freqHi = roundSD( freq * halfBand, 4, true ), // upper edge frequency
					  [ binLo, ratioLo ] = calcRatio( freqLo ),
					  [ binHi, ratioHi ] = calcRatio( freqHi );

				// for 1/1, 1/2 and 1/3 ANSI bands, use the preferred numbers to find the nominal midband frequency
				// for 1/4 to 1/24, round to 2 or 3 significant digits, according to the MSD [ANSI S1.11-2004, p.12]
				if ( isAnsiBands )
					freq = bands < 4 ? nearestPreferred( freq ) : roundSD( freq, freq.toString()[0] < 5 ? 3 : 2 );
				else
					freq = roundSD( freq, 4, true );

				if ( freq >= minFreq )
					barsPush( { posX: 0, freq, freqLo, freqHi, binLo, binHi, ratioLo, ratioHi } );

				currFreq *= bandWidth;
			} while ( currFreq <= maxFreq );

			this._barWidth = analyzerWidth / bars.length;

			bars.forEach( ( bar, index ) => bar.posX = initialX + index * this._barWidth );

			const firstBar = bars[0],
				  lastBar  = bars[ bars.length - 1 ];

			minLog = Math.log10( firstBar.freqLo );
			logWidth = analyzerWidth / ( Math.log10( lastBar.freqHi ) - minLog );

			// clamp edge frequencies to minFreq / maxFreq, if necessary
			// this is done after computing minLog and logWidth, for the proper positioning of labels on the X-axis
			if ( firstBar.freqLo < minFreq ) {
				firstBar.freqLo = minFreq;
				[ firstBar.binLo, firstBar.ratioLo ] = calcRatio( minFreq );
			}

			if ( lastBar.freqHi > maxFreq ) {
				lastBar.freqHi = maxFreq;
				[ lastBar.binHi, lastBar.ratioHi ] = calcRatio( maxFreq );
			}
		}
		else {

			// Discrete frequencies modes

			this._barWidth = 1;

			minLog = Math.log10( minFreq );
			logWidth = analyzerWidth / ( Math.log10( maxFreq ) - minLog );

			const minIndex = this._freqToBin( minFreq, 'floor' ),
				  maxIndex = this._freqToBin( maxFreq );

	 		let lastPos = -999;

			for ( let i = minIndex; i <= maxIndex; i++ ) {
				const freq = binToFreq( i ), // frequency represented by this index
					  posX = initialX + Math.round( logWidth * ( Math.log10( freq ) - minLog ) ); // avoid fractionary pixel values

				// if it's on a different X-coordinate, create a new bar for this frequency
				if ( posX > lastPos ) {
					barsPush( { posX, freq, freqLo: freq, freqHi: freq, binLo: i, binHi: i, ratioLo: 0, ratioHi: 0 } );
					lastPos = posX;
				} // otherwise, add this frequency to the last bar's range
				else if ( bars.length ) {
					const lastBar = bars[ bars.length - 1 ];
					lastBar.binHi = i;
					lastBar.freqHi = freq;
					lastBar.freq = ( lastBar.freqLo * freq ) ** .5; // compute center frequency (geometric mean)
				}
			}
		}

		// save these for scale generation
		this._minLog = minLog;
		this._logWidth = logWidth;

		// update internal variables
		this._calcAux();

		// generate the X-axis and radial scales
		this._createScales();

		// update LED properties
		this._calcLeds();
	}

	/**
	 * Calculate attributes for the vintage LEDs effect, based on visualization mode and canvas resolution
	 */
	_calcLeds() {
		if ( ! this._isOctaveBands || ! this._ready )
			return;

		// adjustment for high pixel-ratio values on low-resolution screens (Android TV)
		const dPR = this._pixelRatio / ( window.devicePixelRatio > 1 && window.screen.height <= 540 ? 2 : 1 );

		const params = [ [],
			[ 128,  3, .45  ], // mode 1
			[ 128,  4, .225 ], // mode 2
			[  96,  6, .225 ], // mode 3
			[  80,  6, .225 ], // mode 4
			[  80,  6, .125 ], // mode 5
			[  64,  6, .125 ], // mode 6
			[  48,  8, .125 ], // mode 7
			[  24, 16, .125 ], // mode 8
		];

		// use custom LED parameters if set, or the default parameters for the current mode
		const customParams = this._ledParams,
			  [ maxLeds, spaceVRatio, spaceHRatio ] = customParams || params[ this._mode ];

		let ledCount, spaceV,
			analyzerHeight = this._analyzerHeight;

		if ( customParams ) {
			const minHeight = 2 * dPR;
			let blockHeight;
			ledCount = maxLeds + 1;
			do {
				ledCount--;
				blockHeight = analyzerHeight / ledCount / ( 1 + spaceVRatio );
				spaceV = blockHeight * spaceVRatio;
			} while ( ( blockHeight < minHeight || spaceV < minHeight ) && ledCount > 1 );
		}
		else {
			// calculate vertical spacing - aim for the reference ratio, but make sure it's at least 2px
			const refRatio = 540 / spaceVRatio;
			spaceV = Math.min( spaceVRatio * dPR, Math.max( 2, analyzerHeight / refRatio + .1 | 0 ) );
		}

		// remove the extra spacing below the last line of LEDs
		if ( this._maximizeLeds )
			analyzerHeight += spaceV;

		// recalculate the number of leds, considering the effective spaceV
		if ( ! customParams )
			ledCount = Math.min( maxLeds, analyzerHeight / ( spaceV * 2 ) | 0 );

		this._leds = [
			ledCount,
			spaceHRatio >= 1 ? spaceHRatio : this._barWidth * spaceHRatio, // spaceH
			spaceV,
			analyzerHeight / ledCount - spaceV // ledHeight
		];
	}

	/**
	 * Generate the X-axis and radial scales in auxiliary canvases
	 */
	_createScales() {
		if ( ! this._ready )
			return;

		const analyzerWidth = this._analyzerWidth,
			  canvas        = this._canvasCtx.canvas,
			  scaleX        = this._scaleX,
			  scaleR        = this._scaleR,
			  canvasX       = scaleX.canvas,
			  canvasR       = scaleR.canvas,
			  freqLabels    = [],
			  initialX      = this._initialX,
			  isStereo      = this._stereo,
			  isMirror      = this._mirror,
			  isNoteLabels  = this._noteLabels,
			  scale         = [ 'C',, 'D',, 'E', 'F',, 'G',, 'A',, 'B' ], // for note labels (no sharp notes)
			  scaleHeight   = Math.min( canvas.width, canvas.height ) * .03 | 0, // circular scale height (radial mode)
		  	  root12        = 2 ** ( 1 / 12 );

		if ( this._ansiBands && ! isNoteLabels )
			freqLabels.push(16,31.5,63,125,250,500,1e3,2e3,4e3,8e3,16e3);
		else {
			let freq = C_1;
			for ( let octave = -1; octave < 11; octave++ ) {
				for ( let note = 0; note < 12; note++ ) {
					if ( freq >= this._minFreq && freq <= this._maxFreq ) {
						const pitch = scale[ note ],
							  isC   = pitch === 'C';
						if ( ( pitch && isNoteLabels && ! isMirror ) || isC )
							freqLabels.push( isNoteLabels ? [ freq, pitch + ( isC ? octave : '' ) ] : freq );
					}
					freq *= root12;
				}
			}
		}

		// in radial stereo mode, the scale is positioned exactly between both channels, by making the canvas a bit larger than the inner diameter
		canvasR.width = canvasR.height = ( this._radius << 1 ) + ( isStereo * scaleHeight );

		const radius  = canvasR.width >> 1, // this is also used as the center X and Y coordinates of the circular scale canvas
			  radialY = radius - scaleHeight * .7;	// vertical position of text labels in the circular scale

		// helper function
		const radialLabel = ( x, label ) => {
			if ( isNoteLabels && ! isStereo && ! ['C','E','G'].includes( label[0] ) )
				return;

			const angle  = TAU * ( x / canvas.width ),
				  adjAng = angle - HALF_PI, // rotate angles so 0 is at the top
				  posX   = radialY * Math.cos( adjAng ),
				  posY   = radialY * Math.sin( adjAng );

			scaleR.save();
			scaleR.translate( radius + posX, radius + posY );
			scaleR.rotate( angle );
			scaleR.fillText( label, 0, 0 );
			scaleR.restore();
		}

		// clear scale canvas
		canvasX.width |= 0;

		scaleX.fillStyle = scaleR.strokeStyle = SCALEX_BACKGROUND_COLOR;
		scaleX.fillRect( 0, 0, canvasX.width, canvasX.height );

		scaleR.arc( radius, radius, radius - scaleHeight / 2, 0, TAU );
		scaleR.lineWidth = scaleHeight;
		scaleR.stroke();

		scaleX.fillStyle = scaleR.fillStyle = SCALEX_LABEL_COLOR;
		scaleX.font = `${ canvasX.height >> 1 }px ${FONT_FAMILY}`;
		scaleR.font = `${ scaleHeight >> 1 }px ${FONT_FAMILY}`;
		scaleX.textAlign = scaleR.textAlign = 'center';

		for ( const item of freqLabels ) {
			const [ freq, label ] = Array.isArray( item ) ? item : [ item, item < 1e3 ? item | 0 : `${ ( item / 100 | 0 ) / 10 }k` ],
				  x    = this._logWidth * ( Math.log10( freq ) - this._minLog ),
				  y    = canvasX.height * .75,
				  isC  = label[0] === 'C',
	  			  maxW = isNoteLabels && ! isMirror ? this._logWidth * ( isC ? .03 : .015 ) : 99;

			if ( x >= 0 && x <= analyzerWidth ) {
				scaleX.fillStyle = scaleR.fillStyle = isC && ! isMirror ? SCALEX_HIGHLIGHT_COLOR : SCALEX_LABEL_COLOR;

				scaleX.fillText( label, initialX + x, y, maxW );
				if ( x < analyzerWidth ) // avoid wrapping-around the last label and overlapping the first one
					radialLabel( x, label );

				if ( isMirror ) {
					scaleX.fillText( label, ( initialX || canvas.width ) - x, y, maxW );
					if ( x > 10 ) // avoid overlapping of first labels on mirror mode
						radialLabel( -x, label );
				}
			}
		}
	}

	/**
	 * Redraw the canvas
	 * this is called 60 times per second by requestAnimationFrame()
	 */
	_draw( timestamp ) {
		const ctx            = this._canvasCtx,
			  canvas         = ctx.canvas,
			  canvasX        = this._scaleX.canvas,
			  canvasR        = this._scaleR.canvas,
			  energy         = this._energy,
			  mode           = this._mode,
			  isAlphaBars    = this._isAlphaBars,
			  isLedDisplay   = this._isLedDisplay,
			  isLinearAmplitude = this.linearAmplitude,
			  isLumiBars     = this._isLumiBars,
			  isOctaveBands  = this._isOctaveBands,
			  isOutline      = this._isOutline,
			  isRadial       = this._radial,
			  isStereo       = this._stereo,
			  lineWidth      = +this.lineWidth, // make sure the damn thing is a number!
			  mirrorMode     = this._mirror,
			  channelHeight  = this._channelHeight,
			  channelGap     = this._channelGap,
			  analyzerHeight = this._analyzerHeight,
			  analyzerWidth  = isRadial ? canvas.width : this._analyzerWidth,
			  initialX       = this._initialX,
			  finalX         = initialX + analyzerWidth,
			  centerX        = canvas.width >> 1,
			  centerY        = canvas.height >> 1,
			  radius         = this._radius,
			  maxBarHeight   = isRadial ? Math.min( centerX, centerY ) - radius : analyzerHeight,
			  maxdB			 = this.maxDecibels,
			  mindB			 = this.minDecibels,
			  deltadB 		 = ( maxdB - mindB ) / -20,
			  useCanvas      = this.useCanvas;

		if ( energy.val > 0 )
			this._spinAngle += this._spinSpeed * RPM;

		const strokeIf = flag => {
			if ( flag && lineWidth ) {
				const alpha = ctx.globalAlpha;
				ctx.globalAlpha = 1;
				ctx.stroke();
				ctx.globalAlpha = alpha;
			}
		}

		// helper function - convert planar X,Y coordinates to radial coordinates
		const radialXY = ( x, y, dir ) => {
			const height = radius + y,
				  angle  = dir * TAU * ( x / canvas.width ) + this._spinAngle;

			return [ centerX + height * Math.cos( angle ), centerY + height * Math.sin( angle ) ];
		}

		// helper function - draw a polygon of width `w` and height `h` at (x,y) in radial mode
		const radialPoly = ( x, y, w, h, stroke ) => {
			ctx.beginPath();
			for ( const dir of ( mirrorMode ? [1,-1] : [1] ) ) {
				ctx.moveTo( ...radialXY( x, y, dir ) );
				ctx.lineTo( ...radialXY( x, y + h, dir ) );
				ctx.lineTo( ...radialXY( x + w, y + h, dir ) );
				ctx.lineTo( ...radialXY( x + w, y, dir ) );
			}

			strokeIf( stroke );
			ctx.fill();
		}

		// LED attributes and helper function for bar height calculation
		const [ ledCount, ledSpaceH, ledSpaceV, ledHeight ] = this._leds || [];
		const ledPosY = height => ( height * ledCount | 0 ) * ( ledHeight + ledSpaceV ) - ledSpaceV;

		// select background color
		const bgColor = ( ! this.showBgColor || (isLedDisplay && ! this.overlay) ) ? '#000' : this._gradients[ this._gradient ].bgColor;

		// compute the effective bar width, considering the selected bar spacing
		// if led effect is active, ensure at least the spacing from led definitions
		let width = this._barWidth - ( ! isOctaveBands ? 0 : Math.max( isLedDisplay ? ledSpaceH : 0, this._barSpacePx ) );

		// make sure width is integer for pixel accurate calculation, when no bar spacing is required
		if ( this._barSpace === 0 && ! isLedDisplay )
			width |= 0;

		let currentEnergy = 0;

		const nBars = this._bars.length;

		for ( let channel = 0; channel < isStereo + 1; channel++ ) {

			const channelTop     = channelHeight * channel + channelGap * channel,
				  channelBottom  = channelTop + channelHeight,
				  analyzerBottom = channelTop + analyzerHeight - ( isLedDisplay && ! this._maximizeLeds ? ledSpaceV : 0 );

			if ( useCanvas ) {
				// clear the channel area, if in overlay mode
				// this is done per channel to clear any residue below 0 off the top channel (especially in line graph mode with lineWidth > 1)
				if ( this.overlay )
					ctx.clearRect( 0, channelTop - channelGap, canvas.width, channelHeight + channelGap );

				// fill the analyzer background if needed (not overlay or overlay + showBgColor)
				if ( ! this.overlay || this.showBgColor ) {
					if ( this.overlay )
						ctx.globalAlpha = this.bgAlpha;

					ctx.fillStyle = bgColor;

					// exclude the reflection area when overlay is true and reflexAlpha === 1 (avoids alpha over alpha difference, in case bgAlpha < 1)
					if ( ! isRadial || channel === 0 )
						ctx.fillRect( initialX, channelTop - channelGap, analyzerWidth, ( this.overlay && this.reflexAlpha === 1 ? analyzerHeight : channelHeight ) + channelGap );

					ctx.globalAlpha = 1;
				}

				// draw dB scale (Y-axis)
				if ( this.showScaleY && ! isLumiBars && ! isRadial ) {
					const scaleWidth = canvasX.height,
						  fontSize   = scaleWidth >> 1,
						  max        = isLinearAmplitude ? 100 : maxdB,
						  min        = isLinearAmplitude ? 0 : mindB,
						  incr       = isLinearAmplitude ? 20 : 5,
						  interval   = analyzerHeight / ( max - min );

					ctx.fillStyle = SCALEY_LABEL_COLOR;
					ctx.font = `${fontSize}px ${FONT_FAMILY}`;
					ctx.textAlign = 'right';
					ctx.lineWidth = 1;

					for ( let val = max; val > min; val -= incr ) {
						const posY = channelTop + ( max - val ) * interval,
							  even = ( val % 2 === 0 ) | 0;

						if ( even ) {
							const labelY = posY + fontSize * ( posY === channelTop ? .8 : .35 );
							if ( mirrorMode !== -1 )
								ctx.fillText( val, scaleWidth * .85, labelY );
							if ( mirrorMode !== 1 )
								ctx.fillText( val, canvas.width - scaleWidth * .1, labelY );
							ctx.strokeStyle = SCALEY_LABEL_COLOR;
							ctx.setLineDash([2,4]);
							ctx.lineDashOffset = 0;
						}
						else {
							ctx.strokeStyle = SCALEY_MIDLINE_COLOR;
							ctx.setLineDash([2,8]);
							ctx.lineDashOffset = 1;
						}

						ctx.beginPath();
						ctx.moveTo( initialX + scaleWidth * even * ( mirrorMode !== -1 ), ~~posY + .5 ); // for sharp 1px line (https://stackoverflow.com/a/13879402/2370385)
						ctx.lineTo( finalX - scaleWidth * even * ( mirrorMode !== 1 ), ~~posY + .5 );
						ctx.stroke();
					}
					// restore line properties
					ctx.setLineDash([]);
					ctx.lineDashOffset = 0;
				}

				// set line width and dash for LEDs effect
				if ( isLedDisplay ) {
					ctx.setLineDash( [ ledHeight, ledSpaceV ] );
					ctx.lineWidth = width;
				}
				else // for outline effect ensure linewidth is not greater than half the bar width
					ctx.lineWidth = isOutline ? Math.min( lineWidth, width / 2 ) : lineWidth;

				// set selected gradient for fill and stroke
				ctx.fillStyle = ctx.strokeStyle = this._canvasGradient;
			} // if ( useCanvas )

			// get a new array of data from the FFT
			const fftData = this._fftData[ channel ],
				  lastBin = fftData.length - 1;
			this._analyzer[ channel ].getByteFrequencyData( fftData );

			// helper function for FFT data interpolation
			const interpolate = ( bin, ratio ) => fftData[ bin ] + ( bin < lastBin ? ( fftData[ bin + 1 ] - fftData[ bin ] ) * ratio : 0 );

			// start drawing path (for mode 10)
			ctx.beginPath();

			// store line graph points to create mirror effect in radial mode
			let points = [];

			// draw bars / lines

			for ( let i = 0; i < nBars; i++ ) {

				const bar = this._bars[ i ],
					  { binLo, binHi, ratioLo, ratioHi } = bar;

				let barHeight = Math.max( interpolate( binLo, ratioLo ), interpolate( binHi, ratioHi ) );

				// check additional bins (if any) for this bar and keep the highest value
				for ( let j = binLo + 1; j < binHi; j++ ) {
					if ( fftData[ j ] > barHeight )
						barHeight = fftData[ j ];
				}

				barHeight /= 255;
				if ( isLinearAmplitude && barHeight ) // avoid residual amplitude if bar value is 0
					barHeight = 10 ** ( ( 1 - barHeight ) * deltadB );
				bar.value[ channel ] = barHeight;
				currentEnergy += barHeight;

				// update bar peak
				if ( bar.peak[ channel ] > 0 ) {
					bar.hold[ channel ]--;
					// if hold is negative, it becomes the "acceleration" for peak drop
					if ( bar.hold[ channel ] < 0 )
						bar.peak[ channel ] += bar.hold[ channel ] / maxBarHeight;
				}

				// check if it's a new peak for this bar
				if ( barHeight >= bar.peak[ channel ] ) {
					bar.peak[ channel ] = barHeight;
					bar.hold[ channel ] = 30; // set peak hold time to 30 frames (0.5s)
				}

				// if not using the canvas, move earlier to the next bar
				if ( ! useCanvas )
					continue;

				// set opacity for bar effects
				if ( isLumiBars || isAlphaBars )
					ctx.globalAlpha = barHeight;
				else if ( isOutline )
					ctx.globalAlpha = this.fillAlpha;

				// normalize barHeight
				if ( isLedDisplay ) {
					barHeight = ledPosY( barHeight );
					if ( barHeight < 0 )
						barHeight = 0; // prevent showing leds below 0 when overlay and reflex are active
				}
				else
					barHeight = barHeight * maxBarHeight | 0;

				// invert bar for radial channel 1
				if ( isRadial && channel === 1 )
					barHeight *= -1;

				// bar width may need small adjustments for some bars, when barSpace === 0
				let adjWidth = width,
					posX     = bar.posX;

				// Draw current bar or line segment

				if ( mode === 10 ) {
					// compute the average between the initial bar (i==0) and the next one
					// used to smooth the curve when the initial posX is off the screen, in mirror and radial modes
					const nextBarAvg = i ? 0 : ( fftData[ this._bars[1].binLo ] / 255 * maxBarHeight * ( ! isRadial || ! channel || - 1 ) + barHeight ) / 2;

					if ( isRadial ) {
						if ( i === 0 )
							ctx.lineTo( ...radialXY( 0, ( posX < 0 ? nextBarAvg : barHeight ), 1 ) );
						// draw line to the current point, avoiding overlapping wrap-around frequencies
						if ( posX >= 0 ) {
							const point = [ posX, barHeight ];
							ctx.lineTo( ...radialXY( ...point, 1 ) );
							points.push( point );
						}
					}
					else { // Linear
						if ( i === 0 ) {
							// start the line off-screen using the previous FFT bin value as the initial amplitude
							if ( mirrorMode !== -1 ) {
								const prevFFTData = binLo ? fftData[ binLo - 1 ] / 255 * maxBarHeight : barHeight; // use previous FFT bin value, when available
								ctx.moveTo( initialX - lineWidth, analyzerBottom - prevFFTData );
							}
							else
								ctx.moveTo( initialX, analyzerBottom - ( posX < initialX ? nextBarAvg : barHeight ) );
						}
						// draw line to the current point
						// avoid X values lower than the origin when mirroring left, otherwise draw them for best graph accuracy
						if ( mirrorMode !== -1 || posX >= initialX )
							ctx.lineTo( posX, analyzerBottom - barHeight );
					}
				}
				else {
					if ( mode > 0 ) {
						if ( isLedDisplay )
							posX += Math.max( ledSpaceH / 2, this._barSpacePx / 2 );
						else {
							if ( this._barSpace === 0 ) {
								posX |= 0;
								if ( i > 0 && posX > this._bars[ i - 1 ].posX + width ) {
									posX--;
									adjWidth++;
								}
							}
							else
								posX += this._barSpacePx / 2;
						}
					}

					if ( isLedDisplay ) {
						const x = posX + width / 2;
						// draw "unlit" leds
						if ( this.showBgColor && ! this.overlay ) {
							const alpha = ctx.globalAlpha;
							ctx.beginPath();
							ctx.moveTo( x, channelTop );
							ctx.lineTo( x, analyzerBottom );
							ctx.strokeStyle = LEDS_UNLIT_COLOR;
							ctx.globalAlpha = 1;
							ctx.stroke();
							// restore properties
							ctx.strokeStyle = ctx.fillStyle;
							ctx.globalAlpha = alpha;
						}
						ctx.beginPath();
						ctx.moveTo( x, isLumiBars ? channelTop : analyzerBottom );
						ctx.lineTo( x, isLumiBars ? channelBottom : analyzerBottom - barHeight );
						ctx.stroke();
					}
					else if ( posX >= initialX ) {
						if ( isRadial )
							radialPoly( posX, 0, adjWidth, barHeight, isOutline );
						else {
							const x = posX,
								  y = isLumiBars ? channelTop : analyzerBottom,
								  w = adjWidth,
								  h = isLumiBars ? channelBottom : -barHeight;

							ctx.beginPath();
							ctx.moveTo( x, y );
							ctx.lineTo( x, y + h );
							ctx.lineTo( x + w, y + h );
							ctx.lineTo( x + w, y );

							strokeIf( isOutline );
							ctx.fill();
						}
					}
				}

				// Draw peak
				const peak = bar.peak[ channel ];
				if ( peak > 0 && this.showPeaks && ! isLumiBars && posX >= initialX && posX < finalX ) {
					// choose the best opacity for the peaks
					if ( isOutline && lineWidth > 0 )
						ctx.globalAlpha = 1;
					else if ( isAlphaBars )
						ctx.globalAlpha = peak;

					// render peak according to current mode / effect
					if ( isLedDisplay )
						ctx.fillRect( posX,	analyzerBottom - ledPosY( peak ), width, ledHeight );
					else if ( ! isRadial )
						ctx.fillRect( posX, analyzerBottom - peak * maxBarHeight, adjWidth, 2 );
					else if ( mode !== 10 ) // radial - no peaks for mode 10
						radialPoly( posX, peak * maxBarHeight * ( ! channel || -1 ), adjWidth, -2 );
				}

			} // for ( let i = 0; i < nBars; i++ )

			// if not using the canvas, move earlier to the next channel
			if ( ! useCanvas )
				continue;

			// restore global alpha
			ctx.globalAlpha = 1;

			// Fill/stroke drawing path for mode 10
			if ( mode === 10 ) {
				if ( isRadial ) {
					if ( mirrorMode ) {
						let p;
						while ( p === points.pop() )
							ctx.lineTo( ...radialXY( ...p, -1 ) );
					}
					ctx.closePath();
				}

				if ( lineWidth > 0 )
					ctx.stroke();

				if ( this.fillAlpha > 0 ) {
					if ( isRadial ) {
						// exclude the center circle from the fill area
						ctx.moveTo( centerX + radius, centerY );
						ctx.arc( centerX, centerY, radius, 0, TAU, true );
					}
					else { // close the fill area
						ctx.lineTo( finalX, analyzerBottom );
						ctx.lineTo( initialX, analyzerBottom );
					}

					ctx.globalAlpha = this.fillAlpha;
					ctx.fill();
					ctx.globalAlpha = 1;
				}
			}

			// Reflex effect
			if ( this._reflexRatio > 0 && ! isLumiBars ) {
				let posY, height;
				if ( this.reflexFit || isStereo ) { // always fit reflex in stereo mode
					posY   = isStereo && channel === 0 ? channelHeight + channelGap : 0;
					height = channelHeight - analyzerHeight;
				}
				else {
					posY   = canvas.height - analyzerHeight * 2;
					height = analyzerHeight;
				}

				// set alpha and brightness for the reflection
				ctx.globalAlpha = this.reflexAlpha;
				if ( this.reflexBright !== 1 )
					ctx.filter = `brightness(${this.reflexBright})`;

				// create the reflection
				ctx.setTransform( 1, 0, 0, -1, 0, canvas.height );
				ctx.drawImage( canvas, 0, channelTop, canvas.width, analyzerHeight, 0, posY, canvas.width, height );

				// reset changed properties
				ctx.setTransform( 1, 0, 0, 1, 0, 0 );
				ctx.filter = 'none';
				ctx.globalAlpha = 1;
			}

		} // for ( let channel = 0; channel < isStereo + 1; channel++ ) {

		// Update energy
		energy.val = currentEnergy / ( nBars << isStereo );
		if ( energy.val >= energy.peak ) {
			energy.peak = energy.val;
			energy.hold = 30;
		}
		else {
			if ( energy.hold > 0 )
				energy.hold--;
			else if ( energy.peak > 0 )
				energy.peak *= ( 30 + energy.hold-- ) / 30; // decay (drops to zero in 30 frames)
		}

		if ( useCanvas ) {
			// Mirror effect
			if ( mirrorMode && ! isRadial ) {
				ctx.setTransform( -1, 0, 0, 1, canvas.width - initialX, 0 );
				ctx.drawImage( canvas, initialX, 0, centerX, canvas.height, 0, 0, centerX, canvas.height );
				ctx.setTransform( 1, 0, 0, 1, 0, 0 );
			}

			// restore solid lines
			ctx.setLineDash([]);

			// draw frequency scale (X-axis)
			if ( this.showScaleX ) {
				if ( isRadial ) {
					ctx.save();
					ctx.translate( centerX, centerY );
					if ( this._spinSpeed )
						ctx.rotate( this._spinAngle + HALF_PI );
					ctx.drawImage( canvasR, -canvasR.width >> 1, -canvasR.width >> 1 );
					ctx.restore();
				}
				else
					ctx.drawImage( canvasX, 0, canvas.height - canvasX.height );
			}
		}

		// calculate and update current frame rate

		this._frame++;
		const elapsed = timestamp - this._time;

		if ( elapsed >= 1000 ) {
			this._fps = this._frame / ( elapsed / 1000 );
			this._frame = 0;
			this._time = timestamp;
		}
		if ( this.showFPS ) {
			const size = canvasX.height;
			ctx.font = `bold ${size}px ${FONT_FAMILY}`;
			ctx.fillStyle = FPS_COLOR;
			ctx.textAlign = 'right';
			ctx.fillText( Math.round( this._fps ), canvas.width - size, size * 2 );
		}

		// call callback function, if defined
		if ( this.onCanvasDraw ) {
			ctx.save();
			ctx.fillStyle = ctx.strokeStyle = this._canvasGradient;
			this.onCanvasDraw( this );
			ctx.restore();
		}

		// schedule next canvas update
		this._runId = requestAnimationFrame( timestamp => this._draw( timestamp ) );
	}

	/**
	 * Return the FFT data bin (array index) which represents a given frequency
	 */
	_freqToBin( freq, method = 'round' ) {
		const max = this._analyzer[0].frequencyBinCount - 1,
			  bin = Math[ method ]( freq * this.fftSize / this.audioCtx.sampleRate );

		return bin < max ? bin : max;
	}

	/**
	 * Generate currently selected gradient
	 */
	_makeGrad() {

		if ( ! this._ready )
			return;

		const ctx            = this._canvasCtx,
			  canvas         = ctx.canvas,
			  isLumiBars     = this._isLumiBars,
			  gradientHeight = isLumiBars ? canvas.height : canvas.height * ( 1 - this._reflexRatio * ! this._stereo ) | 0,
			  					// for stereo we keep the full canvas height and handle the reflex areas while generating the color stops
			  analyzerRatio  = 1 - this._reflexRatio,
			  initialX       = this._initialX;

		// for radial mode
		const centerX   = canvas.width >> 1,
			  centerY   = canvas.height >> 1,
			  maxRadius = Math.min( centerX, centerY ),
			  radius    = this._radius;

		const currGradient = this._gradients[ this._gradient ],
			  colorStops   = currGradient.colorStops,
			  isHorizontal = currGradient.dir === 'h';

		let grad;

		if ( this._radial )
			grad = ctx.createRadialGradient( centerX, centerY, maxRadius, centerX, centerY, radius - ( maxRadius - radius ) * this._stereo );
		else
			grad = ctx.createLinearGradient( ...( isHorizontal ? [ initialX, 0, initialX + this._analyzerWidth, 0 ] : [ 0, 0, 0, gradientHeight ] ) );

		if ( colorStops ) {
			const dual = this._stereo && ! this._splitGradient && ! isHorizontal;

			// helper function
			const addColorStop = ( offset, colorInfo ) => grad.addColorStop( offset, colorInfo.color || colorInfo );

			for ( let channel = 0; channel < 1 + dual; channel++ ) {
				colorStops.forEach( ( colorInfo, index ) => {

					const maxIndex = colorStops.length - 1;

					let offset = colorInfo.pos !== undefined ? colorInfo.pos : index / maxIndex;

					// in dual mode (not split), use half the original offset for each channel
					if ( dual )
						offset /= 2;

					// constrain the offset within the useful analyzer areas (avoid reflex areas)
					if ( this._stereo && ! isLumiBars && ! this._radial && ! isHorizontal ) {
						offset *= analyzerRatio;
						// skip the first reflex area in split mode
						if ( ! dual && offset > .5 * analyzerRatio )
							offset += .5 * this._reflexRatio;
					}

					// only for split mode
					if ( channel === 1 ) {
						// add colors in reverse order if radial or lumi are active
						if ( this._radial || isLumiBars ) {
							const revIndex = maxIndex - index;
							colorInfo = colorStops[ revIndex ];
							offset = 1 - ( colorInfo.pos !== undefined ? colorInfo.pos : revIndex / maxIndex ) / 2;
						}
						else {
							// if the first offset is not 0, create an additional color stop to prevent bleeding from the first channel
							if ( index === 0 && offset > 0 )
								addColorStop( .5, colorInfo );
							// bump the offset to the second half of the gradient
							offset += .5;
						}
					}

					// add gradient color stop
					addColorStop( offset, colorInfo );

					// create additional color stop at the end of first channel to prevent bleeding
					if ( this._stereo && index === maxIndex && offset < .5 )
						addColorStop( .5, colorInfo );
				});
			}
		}

		this._canvasGradient = grad;
	}

	/**
	 * Internal function to change canvas dimensions on demand
	 */
	_setCanvas( reason ) {
		// if initialization is not finished, quit
		if ( ! this._ready )
			return;

		const ctx        = this._canvasCtx,
			  canvas     = ctx.canvas,
			  canvasX    = this._scaleX.canvas,
			  pixelRatio = window.devicePixelRatio / ( this._loRes + 1 );

		let screenWidth  = window.screen.width  * pixelRatio,
			screenHeight = window.screen.height * pixelRatio;

		// Fix for iOS Safari - swap width and height when in landscape
		if ( Math.abs( window.orientation ) === 90 && screenWidth < screenHeight )
			[ screenWidth, screenHeight ] = [ screenHeight, screenWidth ];

		const isFullscreen = this.isFullscreen,
			  isCanvasFs   = isFullscreen && this._fsEl === canvas,
			  newWidth     = isCanvasFs ? screenWidth  : ( this._width  || this._container.clientWidth  || this._defaultWidth  ) * pixelRatio | 0,
			  newHeight    = isCanvasFs ? screenHeight : ( this._height || this._container.clientHeight || this._defaultHeight ) * pixelRatio | 0;

		// set/update object properties
		this._pixelRatio = pixelRatio;
		this._fsWidth    = screenWidth;
		this._fsHeight   = screenHeight;

		// if canvas dimensions haven't changed, quit
		if ( canvas.width === newWidth && canvas.height === newHeight )
			return;

		// apply new dimensions
		canvas.width  = newWidth;
		canvas.height = newHeight;

		// update internal variables
		this._calcAux();

		// if not in overlay mode, paint the canvas black
		if ( ! this.overlay ) {
			ctx.fillStyle = '#000';
			ctx.fillRect( 0, 0, newWidth, newHeight );
		}

		// set lineJoin property for area fill mode (this is reset whenever the canvas size changes)
		ctx.lineJoin = 'bevel';

		// update dimensions of the scale canvas
		canvasX.width = newWidth;
		canvasX.height = Math.max( 20 * pixelRatio, Math.min( newWidth, newHeight ) / 27 | 0 );

		// (re)generate gradient
		this._makeGrad();

		// calculate bar positions and led options
		this._calcBars();

		// detect fullscreen changes (for Safari)
		if ( this._fsStatus !== undefined && this._fsStatus !== isFullscreen )
			reason = 'fschange';
		this._fsStatus = isFullscreen;

		// call the callback function, if defined
		if ( this.onCanvasResize )
			this.onCanvasResize( reason, this );
	}

	/**
	 * Set object properties
	 */
	_setProps( options, useDefaults ) {

		// settings defaults
		const defaults = {
			alphaBars    : false,
			ansiBands    : false,
			barSpace     : 0.1,
			bgAlpha      : 0.7,
			fftSize      : 8192,
			fillAlpha    : 1,
			gradient     : 'classic',
			ledBars      : false,
			linearAmplitude: false,
			lineWidth    : 0,
			loRes        : false,
			lumiBars     : false,
			maxDecibels  : -25,
			maxFreq      : 22000,
			minDecibels  : -85,
			minFreq      : 20,
			mirror       : 0,
			mode         : 0,
			noteLabels   : false,
			outlineBars  : false,
			overlay      : false,
			radial		 : false,
			reflexAlpha  : 0.15,
			reflexBright : 1,
			reflexFit    : true,
			reflexRatio  : 0,
			showBgColor  : true,
			showFPS      : false,
			showPeaks    : true,
			showScaleX   : true,
			showScaleY   : false,
			smoothing    : 0.5,
			spinSpeed    : 0,
			splitGradient: false,
			start        : true,
			stereo       : false,
			useCanvas    : true,
			volume       : 1,
		};

		// callback functions properties
		const callbacks = [ 'onCanvasDraw', 'onCanvasResize' ];

		// build an array of valid properties; `start` is not an actual property and is handled after setting everything else
		const validProps = Object.keys( defaults ).filter( e => e !== 'start' ).concat( callbacks, ['height', 'width'] );

		if ( useDefaults || options === undefined )
			options = { ...defaults, ...options }; // merge options with defaults

		for ( const prop of Object.keys( options ) ) {
			if ( callbacks.includes( prop ) && typeof options[ prop ] !== 'function' ) // check invalid callback
				this[ prop ] = undefined;
			else if ( validProps.includes( prop ) ) // set only valid properties
				this[ prop ] = options[ prop ];
		}

		if ( options.start !== undefined )
			this.toggleAnalyzer( options.start );
	}

}
