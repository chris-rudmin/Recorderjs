(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["test"] = factory();
	else
		root["test"] = root["test"] || {}, root["test"]["Recorder"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/recorder.js":
/*!*************************!*\
  !*** ./src/recorder.js ***!
  \*************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var AudioContext = __webpack_require__.g.AudioContext || __webpack_require__.g.webkitAudioContext; // Constructor

var Recorder = function Recorder() {
  var _this = this;

  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (!Recorder.isRecordingSupported()) {
    throw new Error("Recording is not supported in this browser");
  }

  this.state = "inactive";
  this.config = Object.assign({
    bufferLength: 4096,
    encoderApplication: 2049,
    encoderFrameSize: 10,
    encoderPath: 'encoderWorker.min.js',
    encoderSampleRate: 48000,
    maxFramesPerPage: 40,
    mediaTrackConstraints: true,
    monitorGain: 0,
    numberOfChannels: 1,
    recordingGain: 1,
    resampleQuality: 3,
    streamPages: false,
    wavBitDepth: 16,
    sourceNode: {
      context: null
    }
  }, config);
  this.encodedSamplePosition = 0;
  this.initAudioContext();
  this.initialize = this.initWorklet().then(function () {
    return _this.initEncoder();
  });
}; // Static Methods


Recorder.isRecordingSupported = function () {
  var getUserMediaSupported = __webpack_require__.g.navigator && __webpack_require__.g.navigator.mediaDevices && __webpack_require__.g.navigator.mediaDevices.getUserMedia;
  return AudioContext && getUserMediaSupported && __webpack_require__.g.WebAssembly;
};

Recorder.version = '8.1.0'; // Instance Methods

Recorder.prototype.clearStream = function () {
  if (this.stream) {
    if (this.stream.getTracks) {
      this.stream.getTracks().forEach(function (track) {
        return track.stop();
      });
    } else {
      this.stream.stop();
    }
  }
};

Recorder.prototype.close = function () {
  this.monitorGainNode.disconnect();
  this.recordingGainNode.disconnect();

  if (this.sourceNode) {
    this.sourceNode.disconnect();
  }

  this.clearStream();

  if (this.encoder) {
    this.encoderNode.disconnect();
    this.encoder.postMessage({
      command: "close"
    });
  }

  if (!this.config.sourceNode.context) {
    return this.audioContext.close();
  }

  return Promise.resolve();
};

Recorder.prototype.encodeBuffers = function (inputBuffer) {
  if (this.state === "recording") {
    var buffers = [];

    for (var i = 0; i < inputBuffer.numberOfChannels; i++) {
      buffers[i] = inputBuffer.getChannelData(i);
    }

    this.encoder.postMessage({
      command: "encode",
      buffers: buffers
    });
  }
};

Recorder.prototype.initAudioContext = function () {
  this.audioContext = this.config.sourceNode.context ? this.config.sourceNode.context : new AudioContext();
  this.monitorGainNode = this.audioContext.createGain();
  this.setMonitorGain(this.config.monitorGain);
  this.recordingGainNode = this.audioContext.createGain();
  this.setRecordingGain(this.config.recordingGain);
};

Recorder.prototype.initEncoder = function () {
  var _this2 = this;

  if (this.audioContext.audioWorklet) {
    this.encoderNode = new AudioWorkletNode(this.audioContext, 'encoder-worklet', {
      numberOfOutputs: 0
    });
    this.encoder = this.encoderNode.port;
  } else {
    console.log('audioWorklet support not detected. Falling back to scriptProcessor'); // Skip the first buffer

    this.encodeBuffers = function () {
      return delete _this2.encodeBuffers;
    };

    this.encoderNode = this.audioContext.createScriptProcessor(this.config.bufferLength, this.config.numberOfChannels, this.config.numberOfChannels);

    this.encoderNode.onaudioprocess = function (_ref) {
      var inputBuffer = _ref.inputBuffer;
      return _this2.encodeBuffers(inputBuffer);
    };

    this.encoderNode.connect(this.audioContext.destination); // Requires connection to destination to process audio

    this.encoder = new __webpack_require__.g.Worker(this.config.encoderPath);
  }
};

Recorder.prototype.initSourceNode = function () {
  var _this3 = this;

  if (this.config.sourceNode.context) {
    this.sourceNode = this.config.sourceNode;
    return Promise.resolve();
  }

  return __webpack_require__.g.navigator.mediaDevices.getUserMedia({
    audio: this.config.mediaTrackConstraints
  }).then(function (stream) {
    _this3.stream = stream;
    _this3.sourceNode = _this3.audioContext.createMediaStreamSource(stream);
  });
};

Recorder.prototype.initWorker = function () {
  var _this4 = this;

  var onPage = (this.config.streamPages ? this.streamPage : this.storePage).bind(this);
  this.recordedPages = [];
  this.totalLength = 0;
  return new Promise(function (resolve) {
    var callback = function callback(_ref2) {
      var data = _ref2.data;

      switch (data['message']) {
        case 'ready':
          resolve();
          break;

        case 'page':
          _this4.encodedSamplePosition = data['samplePosition'];
          onPage(data['page']);
          break;

        case 'done':
          _this4.encoder.removeEventListener("message", callback);

          _this4.finish();

          break;
      }
    };

    _this4.encoder.addEventListener("message", callback); // must call start for messagePort messages


    if (_this4.encoder.start) {
      _this4.encoder.start();
    } // exclude sourceNode


    var _this4$config = _this4.config,
        sourceNode = _this4$config.sourceNode,
        config = _objectWithoutProperties(_this4$config, ["sourceNode"]);

    _this4.encoder.postMessage(Object.assign({
      command: 'init',
      originalSampleRate: _this4.audioContext.sampleRate,
      wavSampleRate: _this4.audioContext.sampleRate
    }, config));
  });
};

Recorder.prototype.initWorklet = function () {
  if (this.audioContext.audioWorklet) {
    return this.audioContext.audioWorklet.addModule(this.config.encoderPath);
  }

  return Promise.resolve();
};

Recorder.prototype.pause = function (flush) {
  var _this5 = this;

  if (this.state === "recording") {
    this.state = "paused";
    this.recordingGainNode.disconnect();

    if (flush && this.config.streamPages) {
      return new Promise(function (resolve) {
        var callback = function callback(_ref3) {
          var data = _ref3.data;

          if (data["message"] === 'flushed') {
            _this5.encoder.removeEventListener("message", callback);

            _this5.onpause();

            resolve();
          }
        };

        _this5.encoder.addEventListener("message", callback); // must call start for messagePort messages


        if (_this5.encoder.start) {
          _this5.encoder.start();
        }

        _this5.encoder.postMessage({
          command: "flush"
        });
      });
    }

    this.onpause();
    return Promise.resolve();
  }
};

Recorder.prototype.resume = function () {
  if (this.state === "paused") {
    this.state = "recording";
    this.recordingGainNode.connect(this.encoderNode);
    this.onresume();
  }
};

Recorder.prototype.setRecordingGain = function (gain) {
  this.config.recordingGain = gain;

  if (this.recordingGainNode && this.audioContext) {
    this.recordingGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01);
  }
};

Recorder.prototype.setMonitorGain = function (gain) {
  this.config.monitorGain = gain;

  if (this.monitorGainNode && this.audioContext) {
    this.monitorGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.01);
  }
};

Recorder.prototype.start = function () {
  var _this6 = this;

  if (this.state === "inactive") {
    this.state = 'loading';
    this.encodedSamplePosition = 0;
    return this.audioContext.resume().then(function () {
      return _this6.initialize;
    }).then(function () {
      return Promise.all([_this6.initSourceNode(), _this6.initWorker()]);
    }).then(function () {
      _this6.state = "recording";

      _this6.encoder.postMessage({
        command: 'getHeaderPages'
      });

      _this6.sourceNode.connect(_this6.monitorGainNode);

      _this6.sourceNode.connect(_this6.recordingGainNode);

      _this6.monitorGainNode.connect(_this6.audioContext.destination);

      _this6.recordingGainNode.connect(_this6.encoderNode);

      _this6.onstart();
    })["catch"](function (error) {
      _this6.state = 'inactive';
      throw error;
    });
  }

  return Promise.resolve();
};

Recorder.prototype.stop = function () {
  var _this7 = this;

  if (this.state === "paused" || this.state === "recording") {
    this.state = "inactive"; // macOS and iOS requires the source to remain connected (in case stopped while paused)

    this.recordingGainNode.connect(this.encoderNode);
    this.monitorGainNode.disconnect();
    this.clearStream();
    return new Promise(function (resolve) {
      var callback = function callback(_ref4) {
        var data = _ref4.data;

        if (data["message"] === 'done') {
          _this7.encoder.removeEventListener("message", callback);

          resolve();
        }
      };

      _this7.encoder.addEventListener("message", callback); // must call start for messagePort messages


      if (_this7.encoder.start) {
        _this7.encoder.start();
      }

      _this7.encoder.postMessage({
        command: "done"
      });
    });
  }

  return Promise.resolve();
};

Recorder.prototype.storePage = function (page) {
  this.recordedPages.push(page);
  this.totalLength += page.length;
};

Recorder.prototype.streamPage = function (page) {
  this.ondataavailable(page);
};

Recorder.prototype.finish = function () {
  if (!this.config.streamPages) {
    var outputData = new Uint8Array(this.totalLength);
    this.recordedPages.reduce(function (offset, page) {
      outputData.set(page, offset);
      return offset + page.length;
    }, 0);
    this.ondataavailable(outputData);
  }

  this.onstop();
}; // Callback Handlers


Recorder.prototype.ondataavailable = function () {};

Recorder.prototype.onpause = function () {};

Recorder.prototype.onresume = function () {};

Recorder.prototype.onstart = function () {};

Recorder.prototype.onstop = function () {};

module.exports = Recorder;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/recorder.js");
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=recorder.js.map