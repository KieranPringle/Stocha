rhyth = rhyth || {};

rhyth.snareBuilder = function(outputConnection){

	var snare = snare || {};

	// index
	// *1* params & main output
	// *2* resoHead
	// *3* beaterHead
	// *4* master trigger function
	// *5* gui drawer and listeners
	// *6* save & load functions

	// ************************
	// *1* params & main output
	// ************************

	// set up output node w/ lowpass filtering, and merger node to join the three sections together
	snare.output = ctx.filterBuilder(outputConnection, 8000.0, "lowpass", 0.3);

	// set up paramaters interface
	snare.params = {}
	snare.params.osc1 = {
		tuning: ctx.paramBuilder(200.0, 800.0),
		decay: ctx.paramBuilder(250.0, 5000.0),
		loudness: ctx.paramBuilder(0.00001, 1.0)
	}
	snare.params.osc2 = {
		offset: ctx.paramBuilder(1.15, 2.5),
		decay: ctx.paramBuilder(0.0, 1.0),
		loudness: ctx.paramBuilder(0.00001, 1.0)
	};
	snare.params.noise = {
		decay: ctx.paramBuilder(100.0, 2000.0),
		body: ctx.paramBuilder(500.0, 2000.0),
		hicut: ctx.paramBuilder(500.0, 4000.0),
		loudness: ctx.paramBuilder(0.00001, 1.0)
	}

	// *************
	// *2* osc1 & 2
	// *************

	snare.oscillators = {};
	snare.oscillators.osc1 = {};
	snare.oscillators.osc2 = {};
	// create vcas and connect to output
	snare.oscillators.osc1.vca = ctx.gainBuilder(snare.output);
	snare.oscillators.osc2.vca = ctx.gainBuilder(snare.output);
	//oscillators
	snare.oscillators.osc1.vco = ctx.oscillatorBuilder(snare.oscillators.osc1.vca, 50, 'sine');
	snare.oscillators.osc2.vco = ctx.oscillatorBuilder(snare.oscillators.osc2.vca, 50, 'sine');


	//trig method
	snare.oscillators.trig = function(velocity, time){
		// get scaled variables
		var osc1Params = snare.params.osc1;
		var osc2Params = snare.params.osc2;

		var osc1Tuning = osc1Params.tuning.calc(velocity);
		var osc2Tuning = osc1Tuning * osc2Params.offset.calc(velocity);

		var osc1Decay = osc1Params.decay.calc(velocity)/1000;
		var osc2Decay = osc1Decay * osc2Params.decay.calc(velocity);

		var osc1loudness = osc1Params.loudness.calc(velocity);
		var osc2loudness = osc2Params.loudness.calc(velocity);

		
		// get the gainNode and oscillatorNode we need to apply envelopes to
		var osc1vca = snare.oscillators.osc1.vca.gain;
		var osc2vca = snare.oscillators.osc2.vca.gain;

		var osc1vco = snare.oscillators.osc1.vco.frequency;
		var osc2vco = snare.oscillators.osc2.vco.frequency;

		// clear any still running envelopes
		osc1vca.cancelScheduledValues(time);
		osc1vco.cancelScheduledValues(time);

		osc2vca.cancelScheduledValues(time);
		osc2vco.cancelScheduledValues(time);
		
		// attack
		osc1vca.setValueAtTime(osc1loudness, time);
		osc1vco.setValueAtTime(osc1Tuning, time);

		osc2vca.setValueAtTime(osc2loudness, time);
		osc2vco.setValueAtTime(osc2Tuning, time);

		// decay
		ctx.envelopeBuilder(time, osc1Decay, 0.0000001, osc1vca);
		ctx.envelopeBuilder(time, osc2Decay, 0.0000001, osc2vca);

	}

	// ***************
	// *2* noise 
	// ***************

	snare.noise = {};

	// create vca and connect filters
	snare.noise.vca = ctx.gainBuilder(snare.output);

	snare.noise.hicut = ctx.filterBuilder(snare.noise.vca, 2000.0, "lowpass", 0.8, 1);
	snare.noise.body = ctx.filterBuilder(snare.noise.hicut, 250.0, "notch", 0.5, 1);


	// create noise wavetable
	snare.noise.osc = (function(){
			var bufferSize = 2 * ctx.context.sampleRate,
			    noiseBuffer = ctx.context.createBuffer(1, bufferSize, ctx.context.sampleRate),
			    output = noiseBuffer.getChannelData(0);
			for (var i = 0; i < bufferSize; i++) {
			    output[i] = Math.random() * 2 - 1;
			}

			Math.random
	
			var whiteNoise = ctx.context.createBufferSource();
			whiteNoise.buffer = noiseBuffer;
			whiteNoise.loop = true;
			whiteNoise.start(0);

			return whiteNoise;
		})();

	snare.noise.osc.connect(snare.noise.body);

	//trig method
	snare.noise.trig = function(velocity, time){
		// get scaled variables
		var loudness = snare.params.noise.loudness.calc(velocity);
		var decay = snare.params.noise.decay.calc(velocity)/1000;
		var bodyFreq = snare.params.noise.body.calc(velocity);
		var hicutFreq = snare.params.noise.hicut.calc(velocity);

		// shortcut to vca and filters
		var vca = snare.noise.vca.gain;
		var body = snare.noise.body.frequency;
		var hicut = snare.noise.hicut.frequency;

		// clear any still running envelopes
		vca.cancelScheduledValues(time);

		// attack
		vca.setValueAtTime(loudness, time);
		hicut.setValueAtTime(hicutFreq, time);
		body.setValueAtTime(bodyFreq, time);

		// decay
		ctx.envelopeBuilder(time, decay, 0.0000001, vca);
	}

	// *************************
	// *4* master trig function 
	// *************************

	snare.trig = function(velocity, time){
		snare.oscillators.trig(velocity, time);
		snare.noise.trig(velocity, time);
	}

 	// *************************
 	// *6* builder functions
 	// *************************

 	snare.sequencer = rhyth.sequencerBuilder(snare);
 	rhyth.GUIBuilder(snare);
 	rhyth.loadAndSaveBuilder(snare);


 return snare;

};