rhyth = rhyth || {};

rhyth.hihatBuilder = function(outputConnection){

	var hihat = hihat || {};

	// index
	// *1* params & main output
	// *2* resoHead
	// *3* beaterHead
	// *4* master trigger function
	
	// ************************
	// *1* params & main output
	// ************************

	// set up output node w/ lowpass filtering, and merger node to join the three sections together
	hihat.output = ctx.filterBuilder(outputConnection, 8000.0, "highpass", 0.75);

	// set up paramaters interface
	hihat.params = {}
	hihat.params.oscillators = {
		tuning: ctx.paramBuilder(80.0, 160.0),
		shimmer: ctx.paramBuilder(0.25, 4.0),
		ring: ctx.paramBuilder(-0.75, 0.75)
	}
	hihat.params.strike = {
		decay: ctx.paramBuilder(100.0, 500.0),
		tone: ctx.paramBuilder(2000.0, 16000.0),
		loudness: ctx.paramBuilder(0.00001, 1.0)
	};
	hihat.params.sizzle = {
		decay: ctx.paramBuilder(250.0, 5000.0),
		tone: ctx.paramBuilder(4000.0, 12000.0),
		loudness: ctx.paramBuilder(0.00001, 1.0)
	}

	// ******************************
	// *2* filter, output & envelopes
	// ******************************


	hihat.filters = {};

	hihat.filters.sizzle = {};
	hihat.filters.sizzle.output = ctx.gainBuilder(hihat.output);
	hihat.filters.sizzle.highpass = ctx.filterBuilder(hihat.filters.sizzle.output, 6000.0, "highpass", 0.75, 1.0);
	hihat.filters.sizzle.filter = ctx.filterBuilder(hihat.filters.sizzle.output, 10000.0, "notch", 0.5, 1.0);

	hihat.filters.strike = {}
	hihat.filters.strike.output = ctx.gainBuilder(hihat.output)
	hihat.filters.strike.filter1 = ctx.filterBuilder(hihat.filters.strike.output, 8000.0, "bandpass", 0.95, 1.0);
	hihat.filters.strike.filter2 = ctx.filterBuilder(hihat.filters.strike.filter1, 8000.0, "bandpass", 0.95, 1.0);


	//trig method
	hihat.filters.trig = function(velocity, time){
		
		// get scaled variables
		var strikeParams = hihat.params.strike;
		var sizzleParams = hihat.params.sizzle;

		// get the gainNodes and filterNodes we need to apply envelopes to
		var strikeVCA = hihat.filters.strike.output.gain;
		var sizzleVCA = hihat.filters.sizzle.output.gain;

		var strikeFilter1 = hihat.filters.strike.filter1.frequency;
		var strikeFilter2 = hihat.filters.strike.filter2.frequency;
		var sizzleFilter = hihat.filters.sizzle.filter.frequency;


		// clear any still running envelopes
		strikeVCA.cancelScheduledValues(time);
		sizzleVCA.cancelScheduledValues(time);
		
		// attack
		strikeVCA.setValueAtTime(strikeParams.loudness.calc(velocity), time);
		strikeFilter1.setValueAtTime(strikeParams.tone.calc(velocity), time);
		strikeFilter2.setValueAtTime(strikeParams.tone.calc(velocity), time);

		sizzleVCA.setValueAtTime(sizzleParams.loudness.calc(velocity), time);
		sizzleFilter.setValueAtTime(sizzleParams.tone.calc(velocity), time);
		
		// decay
		ctx.envelopeBuilder(time, (sizzleParams.decay.calc(velocity)/1000), 0.0000001, sizzleVCA);
		ctx.envelopeBuilder(time, (strikeParams.decay.calc(velocity)/1000), 0.0000001, strikeVCA);
		
	}

	// ***************
	// *3* oscillators 
	// ***************

	hihat.oscillators = {};
	hihat.oscillators.output = ctx.gainBuilder(hihat.filters.sizzle.filter, 1.0);
	hihat.oscillators.output.connect(hihat.filters.strike.filter2);

	hihat.oscillators.osc1 = ctx.oscillatorBuilder(hihat.oscillators.output, 40, 'square');
	hihat.oscillators.osc2 = ctx.oscillatorBuilder(hihat.oscillators.output, 40, 'square');
	hihat.oscillators.osc3 = ctx.oscillatorBuilder(hihat.oscillators.output, 40, 'square');
	hihat.oscillators.osc4 = ctx.oscillatorBuilder(hihat.oscillators.output, 40, 'square');
	hihat.oscillators.osc5 = ctx.oscillatorBuilder(hihat.oscillators.output, 40, 'square');
	hihat.oscillators.osc6 = ctx.oscillatorBuilder(hihat.oscillators.output, 40, 'square');


	//trig method
	hihat.oscillators.trig = function(velocity, time){

		// get scaled variables
		var basePitch = hihat.params.oscillators.tuning.calc(velocity);
		var scale = hihat.params.oscillators.shimmer.calc(velocity);
		var offset = hihat.params.oscillators.ring.calc(velocity);
		
		for (var i = 1; i <= 6; i++){
			var frequency = ( basePitch * ( (scale*i) + (offset * (6-i) ) ) );
			hihat.oscillators["osc"+i].frequency.setValueAtTime(frequency, time)
		}

	}

	// *************************
	// *4* master trig function 
	// *************************

	hihat.trig = function(velocity, time){
		hihat.oscillators.trig(velocity, time);
		hihat.filters.trig(velocity, time);
	}

	//  *5* build gui, sequencer and load/save

	hihat.sequencer = rhyth.sequencerBuilder(hihat);
	rhyth.GUIBuilder(hihat);
	rhyth.loadAndSaveBuilder(hihat);

 return hihat;

};