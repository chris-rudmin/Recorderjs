"use strict";

var root = (typeof self === 'object' && self.self === self && self) || (typeof global === 'object' && global.global === global && global) || this;

(function( global ) {

  var encoder;
  global['onmessage'] = function( e ){
    switch( e['data']['command'] ){

      case 'encode':
        if (encoder){
          encoder.encode( e['data']['buffers'] );
        }
        break;

      case 'done':
        if (encoder) {
          encoder.encodeFinalFrame();
        }
        break;

      case 'init':
        encoder = new OggOpusEncoder( e['data'] );
        break;

      default:
        // Ignore any unknown commands and continue recieving commands
    }
  };

  var OggOpusEncoder = function( config ){
    this.numberOfChannels = config['numberOfChannels'] || 1;
    this.originalSampleRate = config['originalSampleRate'];
    this.originalSampleRateOverride = config['originalSampleRateOverride'];
    this.encoderSampleRate = config['encoderSampleRate'] || 48000;
    this.maxBuffersPerPage = config['maxBuffersPerPage'] || 40; // Limit latency for streaming
    this.encoderApplication = config['encoderApplication'] || 2049; // 2048 = Voice, 2049 = Full Band Audio, 2051 = Restricted Low Delay
    this.encoderFrameSize = config['encoderFrameSize'] || 20; // 20ms frame
    this.encoderComplexity = config['encoderComplexity']; // Value between 0 and 10 inclusive. 10 being highest quality.
    this.bufferLength = config['bufferLength'] || 4096;
    this.resampleQuality = config['resampleQuality'] || 3; // Value between 0 and 10 inclusive. 10 being highest quality.
    this.bitRate = config['bitRate'];
    this.rawPacket = config['rawPacket'] || false; // Bypass ogg multiplexer

    this.pageIndex = 0;
    this.granulePosition = 0;
    this.segmentData = new Uint8Array( 65025 ); // Maximum length of data
    this.segmentDataIndex = 0;
    this.segmentTable = new Uint8Array( 255 ); // Maximum data segments
    this.segmentTableIndex = 0;
    this.buffersInPage = 0;
    this.serial = Math.floor( Math.random() * Math.pow(2,32) );

    this.initChecksumTable();
    this.initCodec();
    this.initResampler();
    this.generateIdPage();
    this.generateCommentPage();

    if ( this.numberOfChannels === 1 ) {
      this.interleave = function( buffers ) { return buffers[0]; };
    }
    else {
      this.interleavedBuffers = new Float32Array( this.bufferLength * this.numberOfChannels );
    }
  };

  OggOpusEncoder._opus_encoder_create = _opus_encoder_create;
  OggOpusEncoder._opus_encoder_ctl = _opus_encoder_ctl;
  OggOpusEncoder._speex_resampler_process_interleaved_float = _speex_resampler_process_interleaved_float;
  OggOpusEncoder._speex_resampler_init = _speex_resampler_init;
  OggOpusEncoder._opus_encode_float = _opus_encode_float;
  OggOpusEncoder._free = _free;
  OggOpusEncoder._malloc = _malloc;

  OggOpusEncoder.prototype.encode = function( buffers ) {
    var samples = this.interleave( buffers );
    var sampleIndex = 0;

    while ( sampleIndex < samples.length ) {

      var lengthToCopy = Math.min( this.resampleBufferLength - this.resampleBufferIndex, samples.length - sampleIndex );
      this.resampleBuffer.set( samples.subarray( sampleIndex, sampleIndex+lengthToCopy ), this.resampleBufferIndex );
      sampleIndex += lengthToCopy;
      this.resampleBufferIndex += lengthToCopy;

      if ( this.resampleBufferIndex === this.resampleBufferLength ) {
        OggOpusEncoder._speex_resampler_process_interleaved_float( this.resampler, this.resampleBufferPointer, this.resampleSamplesPerChannelPointer, this.encoderBufferPointer, this.encoderSamplesPerChannelPointer );
        var packetLength = OggOpusEncoder._opus_encode_float( this.encoder, this.encoderBufferPointer, this.encoderSamplesPerChannel, this.encoderOutputPointer, this.encoderOutputMaxLength );
        this.segmentPacket( packetLength );
        this.resampleBufferIndex = 0;
      }
    }

    this.buffersInPage++;
    if ( this.buffersInPage >= this.maxBuffersPerPage ) {
      this.generatePage();
    }
  };

  OggOpusEncoder.prototype.encodeFinalFrame = function() {
    var finalFrameBuffers = [];
    for ( var i = 0; i < this.numberOfChannels; ++i ) {
      finalFrameBuffers.push( new Float32Array( this.bufferLength - (this.resampleBufferIndex / this.numberOfChannels) ));
    }
    this.encode( finalFrameBuffers );
    this.headerType += 4;
    this.generatePage();
    global['postMessage'](null);
    global['close']();
  };

  OggOpusEncoder.prototype.getChecksum = function( data ){
    var checksum = 0;
    for ( var i = 0; i < data.length; i++ ) {
      checksum = (checksum << 8) ^ this.checksumTable[ ((checksum>>>24) & 0xff) ^ data[i] ];
    }
    return checksum >>> 0;
  };

  OggOpusEncoder.prototype.generateCommentPage = function(){
    if ( this.rawPacket ) { return; }
    var segmentDataView = new DataView( this.segmentData.buffer );
    segmentDataView.setUint32( 0, 1937076303, true ) // Magic Signature 'Opus'
    segmentDataView.setUint32( 4, 1936154964, true ) // Magic Signature 'Tags'
    segmentDataView.setUint32( 8, 10, true ); // Vendor Length
    segmentDataView.setUint32( 12, 1868784978, true ); // Vendor name 'Reco'
    segmentDataView.setUint32( 16, 1919247474, true ); // Vendor name 'rder'
    segmentDataView.setUint16( 20, 21322, true ); // Vendor name 'JS'
    segmentDataView.setUint32( 22, 0, true ); // User Comment List Length
    this.segmentTableIndex = 1;
    this.segmentDataIndex = this.segmentTable[0] = 26;
    this.headerType = 0;
    this.generatePage();
  };

  OggOpusEncoder.prototype.generateIdPage = function(){
    if ( this.rawPacket ) { return; }
    var segmentDataView = new DataView( this.segmentData.buffer );
    segmentDataView.setUint32( 0, 1937076303, true ) // Magic Signature 'Opus'
    segmentDataView.setUint32( 4, 1684104520, true ) // Magic Signature 'Head'
    segmentDataView.setUint8( 8, 1, true ); // Version
    segmentDataView.setUint8( 9, this.numberOfChannels, true ); // Channel count
    segmentDataView.setUint16( 10, 3840, true ); // pre-skip (80ms)
    segmentDataView.setUint32( 12, this.originalSampleRateOverride || this.originalSampleRate, true ); // original sample rate
    segmentDataView.setUint16( 16, 0, true ); // output gain
    segmentDataView.setUint8( 18, 0, true ); // channel map 0 = mono or stereo
    this.segmentTableIndex = 1;
    this.segmentDataIndex = this.segmentTable[0] = 19;
    this.headerType = 2;
    this.generatePage();
  };

  OggOpusEncoder.prototype.generatePage = function(){
    if ( this.rawPacket ) { return; }
    var granulePosition = ( this.lastPositiveGranulePosition === this.granulePosition) ? -1 : this.granulePosition;
    var pageBuffer = new ArrayBuffer(  27 + this.segmentTableIndex + this.segmentDataIndex );
    var pageBufferView = new DataView( pageBuffer );
    var page = new Uint8Array( pageBuffer );

    pageBufferView.setUint32( 0, 1399285583, true); // Capture Pattern starts all page headers 'OggS'
    pageBufferView.setUint8( 4, 0, true ); // Version
    pageBufferView.setUint8( 5, this.headerType, true ); // 1 = continuation, 2 = beginning of stream, 4 = end of stream

    // Number of samples upto and including this page at 48000Hz, into 64 bits
    pageBufferView.setUint32( 6, granulePosition, true );
    if ( granulePosition > 4294967296 || granulePosition < 0 ) {
      pageBufferView.setUint32( 10, Math.floor( granulePosition/4294967296 ), true );
    }

    pageBufferView.setUint32( 14, this.serial, true ); // Bitstream serial number
    pageBufferView.setUint32( 18, this.pageIndex++, true ); // Page sequence number
    pageBufferView.setUint8( 26, this.segmentTableIndex, true ); // Number of segments in page.
    page.set( this.segmentTable.subarray(0, this.segmentTableIndex), 27 ); // Segment Table
    page.set( this.segmentData.subarray(0, this.segmentDataIndex), 27 + this.segmentTableIndex ); // Segment Data
    pageBufferView.setUint32( 22, this.getChecksum( page ), true ); // Checksum

    global['postMessage']( page, [page.buffer] );
    this.segmentTableIndex = 0;
    this.segmentDataIndex = 0;
    this.buffersInPage = 0;
    if ( granulePosition > 0 ) {
      this.lastPositiveGranulePosition = granulePosition;
    }
  };

  OggOpusEncoder.prototype.initChecksumTable = function(){
    this.checksumTable = [];
    for ( var i = 0; i < 256; i++ ) {
      var r = i << 24;
      for ( var j = 0; j < 8; j++ ) {
        r = ((r & 0x80000000) != 0) ? ((r << 1) ^ 0x04c11db7) : (r << 1);
      }
      this.checksumTable[i] = (r & 0xffffffff);
    }
  };

  OggOpusEncoder.prototype.initCodec = function() {
    var errLocation = OggOpusEncoder._malloc( 4 );
    this.encoder = OggOpusEncoder._opus_encoder_create( this.encoderSampleRate, this.numberOfChannels, this.encoderApplication, errLocation );
    OggOpusEncoder._free( errLocation );

    if ( this.bitRate ) {
      var bitRateLocation = OggOpusEncoder._malloc( 4 );
      HEAP32[ bitRateLocation >> 2 ] = this.bitRate;
      OggOpusEncoder._opus_encoder_ctl( this.encoder, 4002, bitRateLocation );
      OggOpusEncoder._free( bitRateLocation );
    }

    if ( this.encoderComplexity ) {
      var encoderComplexityLocation = OggOpusEncoder._malloc( 4 );
      HEAP32[ encoderComplexityLocation >> 2 ] = this.encoderComplexity;
      OggOpusEncoder._opus_encoder_ctl( this.encoder, 4010, encoderComplexityLocation );
      OggOpusEncoder._free( encoderComplexityLocation );
    }

    this.encoderSamplesPerChannel = this.encoderSampleRate * this.encoderFrameSize / 1000;
    this.encoderSamplesPerChannelPointer = OggOpusEncoder._malloc( 4 );
    HEAP32[ this.encoderSamplesPerChannelPointer >> 2 ] = this.encoderSamplesPerChannel;

    this.encoderBufferLength = this.encoderSamplesPerChannel * this.numberOfChannels;
    this.encoderBufferPointer = OggOpusEncoder._malloc( this.encoderBufferLength * 4 ); // 4 bytes per sample
    this.encoderBuffer = HEAPF32.subarray( this.encoderBufferPointer >> 2, (this.encoderBufferPointer >> 2) + this.encoderBufferLength );

    this.encoderOutputMaxLength = 4000;
    this.encoderOutputPointer = OggOpusEncoder._malloc( this.encoderOutputMaxLength );
    this.encoderOutputBuffer = HEAPU8.subarray( this.encoderOutputPointer, this.encoderOutputPointer + this.encoderOutputMaxLength );
  };

  OggOpusEncoder.prototype.initResampler = function() {
    var errLocation = OggOpusEncoder._malloc( 4 );
    this.resampler = OggOpusEncoder._speex_resampler_init( this.numberOfChannels, this.originalSampleRate, this.encoderSampleRate, this.resampleQuality, errLocation );
    OggOpusEncoder._free( errLocation );

    this.resampleBufferIndex = 0;
    this.resampleSamplesPerChannel = this.originalSampleRate * this.encoderFrameSize / 1000;
    this.resampleSamplesPerChannelPointer = OggOpusEncoder._malloc( 4 );
    HEAP32[ this.resampleSamplesPerChannelPointer >> 2 ] = this.resampleSamplesPerChannel;

    this.resampleBufferLength = this.resampleSamplesPerChannel * this.numberOfChannels;
    this.resampleBufferPointer = OggOpusEncoder._malloc( this.resampleBufferLength * 4 ); // 4 bytes per sample
    this.resampleBuffer = HEAPF32.subarray( this.resampleBufferPointer >> 2, (this.resampleBufferPointer >> 2) + this.resampleBufferLength );
  };

  OggOpusEncoder.prototype.interleave = function( buffers ) {
    for ( var i = 0; i < this.bufferLength; i++ ) {
      for ( var channel = 0; channel < this.numberOfChannels; channel++ ) {
        this.interleavedBuffers[ i * this.numberOfChannels + channel ] = buffers[ channel ][ i ];
      }
    }

    return this.interleavedBuffers;
  };

  OggOpusEncoder.prototype.segmentPacket = function( packetLength ) {
    var packetIndex = 0;

    if (this.rawPacket)
    {
      var page = new Uint8Array( HEAPU8.subarray(this.encoderOutputPointer, this.encoderOutputPointer + packetLength) );
      global['postMessage']( page, [page.buffer] );

      return;
    }

    while ( packetLength >= 0 ) {

      if ( this.segmentTableIndex === 255 ) {
        this.generatePage();
        this.headerType = 1;
      }

      var segmentLength = Math.min( packetLength, 255 );
      this.segmentTable[ this.segmentTableIndex++ ] = segmentLength;
      this.segmentData.set( this.encoderOutputBuffer.subarray( packetIndex, packetIndex + segmentLength ), this.segmentDataIndex );
      this.segmentDataIndex += segmentLength;
      packetIndex += segmentLength;
      packetLength -= 255;
    }

    this.granulePosition += ( 48 * this.encoderFrameSize );
    if ( this.segmentTableIndex === 255 ) {
      this.generatePage();
      this.headerType = 0;
    }
  };

  // Exports for unit testing
  global.OggOpusEncoder = OggOpusEncoder;

  if ( typeof module == 'object' && module.exports ) {
    module.exports = OggOpusEncoder;
  }

})(root);
