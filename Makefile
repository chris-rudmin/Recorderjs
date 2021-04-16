INPUT_DIR=./src
OUTPUT_DIR=./dist
OUTPUT_DIR_UNMINIFIED=./debug
EMCC_OPTS=-O3 -s NO_DYNAMIC_EXECUTION=1 -s NO_FILESYSTEM=1
DEFAULT_EXPORTS:='_malloc','_free'

LIBOPUS_ENCODER_MIN_FILENAME=encoderWorker.min.js
LIBOPUS_ENCODER_FILENAME=encoderWorker.js
LIBOPUS_DECODER_MIN_FILENAME=decoderWorker.min.js
LIBOPUS_DECODER_FILENAME=decoderWorker.js
RECORDER_MIN_FILENAME=recorder.min.js
RECORDER_FILENAME=recorder.js
WAVE_WORKER_MIN_FILENAME=waveWorker.min.js
WAVE_WORKER_FILENAME=waveWorker.js

LIBOPUS_ENCODER_SRC=$(INPUT_DIR)/encoderWorker.js
LIBOPUS_DECODER_SRC=$(INPUT_DIR)/decoderWorker.js
LIBOPUS_ENCODER_MIN=$(OUTPUT_DIR)/$(LIBOPUS_ENCODER_MIN_FILENAME)
LIBOPUS_ENCODER=$(OUTPUT_DIR_UNMINIFIED)/$(LIBOPUS_ENCODER_FILENAME)
LIBOPUS_DECODER_MIN=$(OUTPUT_DIR)/$(LIBOPUS_DECODER_MIN_FILENAME)
LIBOPUS_DECODER=$(OUTPUT_DIR_UNMINIFIED)/$(LIBOPUS_DECODER_FILENAME)
LIBOPUS_DIR=./opus
LIBOPUS_OBJ=$(LIBOPUS_DIR)/.libs/libopus.a
LIBOPUS_ENCODER_EXPORTS:='_opus_encoder_create','_opus_encode_float','_opus_encoder_ctl','_opus_encoder_destroy'
LIBOPUS_DECODER_EXPORTS:='_opus_decoder_create','_opus_decode_float','_opus_decoder_destroy'

LIBSPEEXDSP_DIR=./speexdsp
LIBSPEEXDSP_OBJ=$(LIBSPEEXDSP_DIR)/libspeexdsp/.libs/libspeexdsp.a
LIBSPEEXDSP_EXPORTS:='_speex_resampler_init','_speex_resampler_process_interleaved_float','_speex_resampler_destroy'

RECORDER_MIN=$(OUTPUT_DIR)/$(RECORDER_MIN_FILENAME)
RECORDER=$(OUTPUT_DIR_UNMINIFIED)/$(RECORDER_FILENAME)
RECORDER_SRC=$(INPUT_DIR)/recorder.js

WAVE_WORKER_MIN=$(OUTPUT_DIR)/$(WAVE_WORKER_MIN_FILENAME)
WAVE_WORKER=$(OUTPUT_DIR_UNMINIFIED)/$(WAVE_WORKER_FILENAME)
WAVE_WORKER_SRC=$(INPUT_DIR)/waveWorker.js

default: debug prod test

debug: $(LIBOPUS_ENCODER) $(LIBOPUS_DECODER) $(RECORDER) $(WAVE_WORKER)

prod: $(LIBOPUS_ENCODER_MIN) $(LIBOPUS_DECODER_MIN) $(RECORDER_MIN) $(WAVE_WORKER_MIN)

cleanDist:
	rm -rf $(OUTPUT_DIR) $(OUTPUT_DIR_UNMINIFIED)
	mkdir $(OUTPUT_DIR)
	mkdir $(OUTPUT_DIR_UNMINIFIED)

cleanAll: cleanDist
	rm -rf $(LIBOPUS_DIR) $(LIBSPEEXDSP_DIR)

test:
	# Tests need to run relative to `dist` folder for wasm file import
	cd $(OUTPUT_DIR); node --expose-wasm ../test.js

.PHONY: test


# Dependencies
# ----------------
$(LIBOPUS_DIR)/autogen.sh $(LIBSPEEXDSP_DIR)/autogen.sh:
	git submodule update --init

$(LIBOPUS_OBJ): $(LIBOPUS_DIR)/autogen.sh
	cd $(LIBOPUS_DIR); ./autogen.sh
	cd $(LIBOPUS_DIR); emconfigure ./configure --disable-extra-programs --disable-doc --disable-intrinsics --disable-rtcd --disable-stack-protector
	cd $(LIBOPUS_DIR); emmake make

$(LIBSPEEXDSP_OBJ): $(LIBSPEEXDSP_DIR)/autogen.sh
	cd $(LIBSPEEXDSP_DIR); ./autogen.sh
	cd $(LIBSPEEXDSP_DIR); emconfigure ./configure --disable-examples --disable-neon
	cd $(LIBSPEEXDSP_DIR); emmake make


# PRODUCTION Build
# ----------------
$(LIBOPUS_ENCODER_MIN): $(LIBOPUS_ENCODER_SRC) $(LIBOPUS_OBJ) $(LIBSPEEXDSP_OBJ)
	emcc -o $@ $(EMCC_OPTS) -s BINARYEN_ASYNC_COMPILATION=0 -s SINGLE_FILE=1 -s EXPORTED_FUNCTIONS=$(DEFAULT_EXPORTS),$(LIBOPUS_ENCODER_EXPORTS),$(LIBSPEEXDSP_EXPORTS) --post-js $(LIBOPUS_ENCODER_SRC) $(LIBOPUS_OBJ) $(LIBSPEEXDSP_OBJ)

$(LIBOPUS_DECODER_MIN): $(LIBOPUS_DECODER_SRC) $(LIBOPUS_OBJ) $(LIBSPEEXDSP_OBJ)
	npx webpack --config webpack.config.js --output-library DecoderWorker --entry $(LIBOPUS_DECODER_SRC) --output-filename $(LIBOPUS_DECODER_MIN_FILENAME)
	emcc -o $@ $(EMCC_OPTS) -s EXPORTED_FUNCTIONS=$(DEFAULT_EXPORTS),$(LIBOPUS_DECODER_EXPORTS),$(LIBSPEEXDSP_EXPORTS) --pre-js $@ $(LIBOPUS_OBJ) $(LIBSPEEXDSP_OBJ)

$(RECORDER_MIN): $(RECORDER_SRC)
	npx webpack --config webpack.config.js --output-library Recorder --entry $(RECORDER_SRC) --output-filename $(RECORDER_MIN_FILENAME)

$(WAVE_WORKER_MIN): $(WAVE_WORKER_SRC)
	npx webpack --mode production --entry $(WAVE_WORKER_SRC) --output-filename $(WAVE_WORKER_MIN_FILENAME)


# DEBUG Build
# ----------------
$(LIBOPUS_ENCODER): $(LIBOPUS_ENCODER_SRC) $(LIBOPUS_OBJ) $(LIBSPEEXDSP_OBJ)
	emcc -o $@ $(EMCC_OPTS) -s BINARYEN_ASYNC_COMPILATION=0 -s SINGLE_FILE=1 -g3 -s EXPORTED_FUNCTIONS=$(DEFAULT_EXPORTS),$(LIBOPUS_ENCODER_EXPORTS),$(LIBSPEEXDSP_EXPORTS) --post-js $(LIBOPUS_ENCODER_SRC) $(LIBOPUS_OBJ) $(LIBSPEEXDSP_OBJ)

$(LIBOPUS_DECODER): $(LIBOPUS_DECODER_SRC) $(LIBOPUS_OBJ) $(LIBSPEEXDSP_OBJ)
	npx webpack --config webpack.debug.js --output-library DecoderWorker --entry $(LIBOPUS_DECODER_SRC) --output-filename $(LIBOPUS_DECODER_FILENAME)
	emcc -o $@ $(EMCC_OPTS) -g3 -s EXPORTED_FUNCTIONS=$(DEFAULT_EXPORTS),$(LIBOPUS_DECODER_EXPORTS),$(LIBSPEEXDSP_EXPORTS) --pre-js $@ $(LIBOPUS_OBJ) $(LIBSPEEXDSP_OBJ)

$(RECORDER): $(RECORDER_SRC)
	npx webpack --config webpack.debug.js --output-library Recorder --entry $(RECORDER_SRC) --output-filename $(RECORDER_FILENAME)

$(WAVE_WORKER): $(WAVE_WORKER_SRC)
	npx webpack --config webpack.debug.js --entry $(WAVE_WORKER_SRC) --output-filename $(WAVE_WORKER_FILENAME)
