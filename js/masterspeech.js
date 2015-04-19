var recognition = new webkitSpeechRecognition();
var start_time = null;
var confidence = 0;

var two_line = /\n\n/g;
var one_line = /\n/g;
function linebreak(s) {
  return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
}

var first_char = /\S/;
function capitalize(s) {
  return s.replace(first_char, function(m) { return m.toUpperCase(); });
}

function start_recording(interim_callback, end_callback) {
    var start_time = new Date();
    var recorder;
    navigator.webkitGetUserMedia({"audio": true}, function(stream) {
	var audioContext = new webkitAudioContext();
	var mediaStreamSource = audioContext.createMediaStreamSource(stream);
	var prefix = window.location.href.match('https*://.*?\..*?(/.*/)');
	prefix = prefix === null ? '/' : prefix[1];
	recorder = new Recorder(mediaStreamSource, {
	    workerPath: prefix + "js/lib/recorderjs/recorderWorker.js"
	});
	recorder.clear();
	recorder.record();
    }, function (error) {});
    
    recognition.continuous = true;
    recognition.interimResults = true;
    var final_transcript = '';
    var last_time = new Date();
    var last_words = '';
    var word_timings = [];
    recognition.onresult = function(event) {
	var interim_transcript = '';
	confidence = 0;
	var pause_time = new Date() - last_time;
	last_time = new Date();
	if (pause_time > 500) {
	    console.log("paused for " + pause_time);
	}
	for (var i = event.resultIndex; i < event.results.length; i++) {
	    if (event.results[i].isFinal) {
		final_transcript += event.results[i][0].transcript;
	    } else {
		interim_transcript += event.results[i][0].transcript;
	    }
	    confidence += event.results[i][0].confidence;
	}
	final_transcript = capitalize(final_transcript);
	if (interim_callback != undefined) interim_callback(linebreak(final_transcript), linebreak(interim_transcript), confidence / event.results.length);
//	document.getElementById("final_span").innerHTML = linebreak(final_transcript);
//	document.getElementById("interim_span").innerHTML = linebreak(interim_transcript);

	var diff = JsDiff.diffWords(last_words, final_transcript + interim_transcript);
	var word_index = 0;
	for (var i = 0; i < diff.length; i++) {
	    if (diff[i].added) {
		if (diff[i + 1] && diff[i + 1].removed) {
		    diff.pop(i+1);
		    if (diff[i + 1] && diff[i + 1].removed) {
			console.log('bad')
		    }		    
		} else {
		    diff[i].value.split(" ").filter(function (s) {return s.length > 0;}).forEach(function(val, index) {word_timings.push([val, new Date() - start_time])});
		}
	    }

	    if (!diff[i].removed) {
		word_index += diff[i].value.split(" ").filter(function (s) {return s.length > 0;}).length;
	    } else {
		diff[i].value.split(" ").filter(function (s) {return s.length > 0;}).forEach(function(val, index) {word_timings.pop(word_index)});	
	    }

	}
	
	last_words = final_transcript + interim_transcript;
    }
	recognition.onstart = function(event) {
		start_time = new Date()
	}

    recognition.onend = function(event) {
	if (end_callback != undefined) end_callback(linebreak(final_transcript), new Date() - start_time, confidence);
	recorder.stop();
	recorder.exportWAV(function(wav) {
	    var url = window.webkitURL.createObjectURL(wav);
	    document.getElementsByTagName("audio")[0].setAttribute("src", url);
	});
		     
    };
    
    recognition.start();
}

function stop_recording() {
    recognition.stop();
}
