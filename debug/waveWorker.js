(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["test"] = factory();
	else
		root["test"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
/*!***************************!*\
  !*** ./src/waveWorker.js ***!
  \***************************/


function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

var WavePCM = function WavePCM(config) {
  var config = Object.assign({
    wavBitDepth: 16,
    numberOfChannels: 1
  }, config);

  if (!config['wavSampleRate']) {
    throw new Error("wavSampleRate value is required to record. NOTE: Audio is not resampled!");
  }

  if ([8, 16, 24, 32].indexOf(config['wavBitDepth']) === -1) {
    throw new Error("Only 8, 16, 24 and 32 bits per sample are supported");
  }

  this.numberOfChannels = config['numberOfChannels'];
  this.bitDepth = config['wavBitDepth'];
  this.sampleRate = config['wavSampleRate'];
  this.recordedBuffers = [];
  this.bytesPerSample = this.bitDepth / 8;
};

WavePCM.prototype.record = function (buffers) {
  var bufferLength = buffers[0].length;
  var reducedData = new Uint8Array(bufferLength * this.numberOfChannels * this.bytesPerSample); // Interleave

  for (var i = 0; i < bufferLength; i++) {
    for (var channel = 0; channel < this.numberOfChannels; channel++) {
      var outputIndex = (i * this.numberOfChannels + channel) * this.bytesPerSample; // clip the signal if it exceeds [-1, 1]

      var sample = Math.max(-1, Math.min(1, buffers[channel][i])); // bit reduce and convert to integer

      switch (this.bytesPerSample) {
        case 4:
          // 32 bits signed
          sample = sample * 2147483647.5 - 0.5;
          reducedData[outputIndex] = sample;
          reducedData[outputIndex + 1] = sample >> 8;
          reducedData[outputIndex + 2] = sample >> 16;
          reducedData[outputIndex + 3] = sample >> 24;
          break;

        case 3:
          // 24 bits signed
          sample = sample * 8388607.5 - 0.5;
          reducedData[outputIndex] = sample;
          reducedData[outputIndex + 1] = sample >> 8;
          reducedData[outputIndex + 2] = sample >> 16;
          break;

        case 2:
          // 16 bits signed
          sample = sample * 32767.5 - 0.5;
          reducedData[outputIndex] = sample;
          reducedData[outputIndex + 1] = sample >> 8;
          break;

        case 1:
          // 8 bits unsigned
          reducedData[outputIndex] = (sample + 1) * 127.5;
          break;

        default:
          throw new Error("Only 8, 16, 24 and 32 bits per sample are supported");
      }
    }
  }

  this.recordedBuffers.push(reducedData);
};

WavePCM.prototype.requestData = function () {
  var bufferLength = this.recordedBuffers[0].length;
  var dataLength = this.recordedBuffers.length * bufferLength;
  var headerLength = 44;
  var wav = new Uint8Array(headerLength + dataLength);
  var view = new DataView(wav.buffer);
  view.setUint32(0, 1380533830, false); // RIFF identifier 'RIFF'

  view.setUint32(4, 36 + dataLength, true); // file length minus RIFF identifier length and file description length

  view.setUint32(8, 1463899717, false); // RIFF type 'WAVE'

  view.setUint32(12, 1718449184, false); // format chunk identifier 'fmt '

  view.setUint32(16, 16, true); // format chunk length

  view.setUint16(20, 1, true); // sample format (raw)

  view.setUint16(22, this.numberOfChannels, true); // channel count

  view.setUint32(24, this.sampleRate, true); // sample rate

  view.setUint32(28, this.sampleRate * this.bytesPerSample * this.numberOfChannels, true); // byte rate (sample rate * block align)

  view.setUint16(32, this.bytesPerSample * this.numberOfChannels, true); // block align (channel count * bytes per sample)

  view.setUint16(34, this.bitDepth, true); // bits per sample

  view.setUint32(36, 1684108385, false); // data chunk identifier 'data'

  view.setUint32(40, dataLength, true); // data chunk length

  for (var i = 0; i < this.recordedBuffers.length; i++) {
    wav.set(this.recordedBuffers[i], i * bufferLength + headerLength);
  }

  return {
    message: 'page',
    page: wav
  };
}; // Run in AudioWorkletGlobal scope


if (typeof registerProcessor === 'function') {
  var EncoderWorklet = /*#__PURE__*/function (_AudioWorkletProcesso) {
    _inherits(EncoderWorklet, _AudioWorkletProcesso);

    var _super = _createSuper(EncoderWorklet);

    function EncoderWorklet() {
      var _this;

      _classCallCheck(this, EncoderWorklet);

      _this = _super.call(this);
      _this.continueProcess = true;

      _this.port.onmessage = function (_ref) {
        var data = _ref.data;

        switch (data['command']) {
          case 'done':
            if (_this.recorder) {
              _this.postPage(_this.recorder.requestData());

              _this.port.postMessage({
                message: 'done'
              });

              delete _this.recorder;
            }

            break;

          case 'close':
            _this.continueProcess = false;
            break;

          case 'init':
            _this.recorder = new WavePCM(data);

            _this.port.postMessage({
              message: 'ready'
            });

            break;

          default: // Ignore any unknown commands and continue recieving commands

        }
      };

      return _this;
    }

    _createClass(EncoderWorklet, [{
      key: "process",
      value: function process(inputs) {
        if (this.recorder && inputs[0] && inputs[0].length && inputs[0][0] && inputs[0][0].length) {
          this.recorder.record(inputs[0]);
        }

        return this.continueProcess;
      }
    }, {
      key: "postPage",
      value: function postPage(pageData) {
        if (pageData) {
          this.port.postMessage(pageData, [pageData.page.buffer]);
        }
      }
    }]);

    return EncoderWorklet;
  }( /*#__PURE__*/_wrapNativeSuper(AudioWorkletProcessor));

  registerProcessor('encoder-worklet', EncoderWorklet);
} // run in scriptProcessor worker scope
else {
    var recorder;

    var postPageGlobal = function postPageGlobal(pageData) {
      if (pageData) {
        postMessage(pageData, [pageData.page.buffer]);
      }
    };

    onmessage = function onmessage(_ref2) {
      var data = _ref2.data;

      switch (data['command']) {
        case 'encode':
          if (recorder) {
            recorder.record(data['buffers']);
          }

          break;

        case 'done':
          if (recorder) {
            postPageGlobal(recorder.requestData());
            postMessage({
              message: 'done'
            });
            recorder = null;
          }

          break;

        case 'close':
          close();
          break;

        case 'init':
          recorder = new WavePCM(data);
          postMessage({
            message: 'ready'
          });
          break;

        default: // Ignore any unknown commands and continue recieving commands

      }
    };
  } // Exports for unit testing.


var module = module || {};
module.exports = WavePCM;
/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=waveWorker.js.map