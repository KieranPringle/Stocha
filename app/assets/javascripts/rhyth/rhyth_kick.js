rhyth = rhyth || {};

rhyth.kickBuilder = function(outputConnection){

	var kick = kick || {};

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
	kick.output = ctx.filterBuilder(outputConnection, 500.0, "lowpass", 0.5);

	// set up paramaters interface
	kick.params = {}
	kick.params.resoHead = {
		tuning: ctx.paramBuilder(20.0, 100.0),
		pitchDecay: ctx.paramBuilder(0.0, 1.0),
		volDecay: ctx.paramBuilder(50.0, 2000.0),
		loudness: ctx.paramBuilder(0.00001, 1.0)
	}
	kick.params.beaterHead = {
		tuning: ctx.paramBuilder(1.0, 4.0),
		beaterPitch: ctx.paramBuilder(40, 200),
		beaterTimbre: ctx.paramBuilder(0.75, 1.25),
		loudness: ctx.paramBuilder(0.00001, 1.0)
	};

	// *************
	// *2* resoHead
	// *************

	kick.resoHead = {};
	// create vca and connect to output
	kick.resoHead.vca = ctx.gainBuilder(kick.output);
	//oscillator
	kick.resoHead.vco = ctx.oscillatorBuilder(kick.resoHead.vca, 20, 'sine');

	//trig method
	kick.resoHead.trig = function(velocity, time){
		// get scaled variables
		var params = kick.params.resoHead
		var tuning = params.tuning.calc(velocity);
		var decay = params.volDecay.calc(velocity)/1000;
		var loudness = params.loudness.calc(velocity);
		var pitchDecay = params.pitchDecay.calc(velocity) *decay ;
		var pitchEnvStart = tuning * kick.params.beaterHead.tuning.calc(velocity);
		// get the gainNode and oscillatorNode we need to apply envelopes to
		var vca = kick.resoHead.vca.gain;
		var vco = kick.resoHead.vco.frequency;

		// clear any still running envelopes
		vca.cancelScheduledValues(time);
		vco.cancelScheduledValues(time);
		
		// attack
		vca.setValueAtTime(loudness, time);
		vco.setValueAtTime(pitchEnvStart, time);

		// decay
		vca.exponentialRampToValueAtTime(0.0000001, time + decay);
		vco.exponentialRampToValueAtTime(tuning, time + pitchDecay);
	}

	// ***************
	// *2* beaterHead 
	// ***************

	kick.beaterHead = {};
	// create vca and connect to output
	kick.beaterHead.vca = ctx.gainBuilder(kick.output);
	kick.beaterHead.beater = {}
	// shortcut for readability
	var output = kick.beaterHead.vca

	// create the six oscillators
	kick.beaterHead.beater.osc1 = ctx.oscillatorBuilder(output, 20, 'sine');
	kick.beaterHead.beater.osc2 = ctx.oscillatorBuilder(output, 20, 'sine');
	kick.beaterHead.beater.osc3 = ctx.oscillatorBuilder(output, 20, 'sine');
	kick.beaterHead.beater.osc4 = ctx.oscillatorBuilder(output, 20, 'sine');
	kick.beaterHead.beater.osc5 = ctx.oscillatorBuilder(output, 20, 'sine');
	kick.beaterHead.beater.osc6 = ctx.oscillatorBuilder(output, 20, 'sine');

	//trig method
	kick.beaterHead.trig = function(velocity, time){
		// get scaled variables
		var beaterTimbre = kick.params.beaterHead.beaterTimbre.calc(velocity);
		var loudness = kick.params.beaterHead.loudness.calc(velocity);
		var basePitch = kick.params.beaterHead.beaterPitch.calc(velocity);
		// shortcut to vca
		var vca = kick.beaterHead.vca.gain;
		// schedule pitch changes for beater emulator
		for (var i = 1; i <= 6; i++){
			this.beater["osc"+i].frequency.setValueAtTime(basePitch*((i*beaterTimbre)+1), time)
		}
		// attack
		vca.setValueAtTime(loudness, time);
		// decay (always 50ms for beater)
		vca.exponentialRampToValueAtTime(0.0000001, time + 0.03);

	}

	// *************************
	// *4* master trig function 
	// *************************

	kick.trig = function(velocity, time){
		kick.resoHead.trig(velocity, time);
		kick.beaterHead.trig(velocity, time);
	}

 	// *************************
 	// *6* builder functions
 	// *************************


 	kick.sequencer = rhyth.sequencerBuilder(kick);
 	rhyth.GUIBuilder(kick);
 	rhyth.loadAndSaveBuilder(kick);

 return kick;

};