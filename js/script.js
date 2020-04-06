/* RadioTimer, Copyright 2016 François Revol */

/* Android doesn't really have a console...
cf. http://stackoverflow.com/questions/6604192/showing-console-errors-and-alerts-in-a-div-inside-the-page
*/
/*
if (/Android/.test(navigator.userAgent)) {
	if (typeof console  != "undefined")
		if (typeof console.log != 'undefined')
			console.olog = console.log;
		else
			console.olog = function() {};

	console.log = function(message) {
		console.olog(message);
		$('#debugDiv').append('<p>' + message + '</p>');
	};
	console.error = console.debug = console.info =  console.log
}
*/

var buttonChars = {
	btn_eject:"⏏\uFE0E",
	btn_session_prev:"⏮\uFE0E",
	btn_item_prev:"⏪\uFE0E",
	btn_item_stop:"⏹\uFE0E",
	btn_item_play:"▶\uFE0E",
	btn_item_pause:"⏸\uFE0E",
	btn_item_pauseplay:"⏯\uFE0E",
	btn_item_next:"⏩\uFE0E",
	btn_session_next:"⏭\uFE0E",
	btn_show_titles:"☰\uFE0E",
	btn_do_print: "⎙\uFE0E",
	btn_export_bookmarks: "☆\uFE0E",
	btn_show_exports: "💾\uFE0E",
	btn_show_settings: "🔧\uFE0E",
	glyph_chrono: "⏱\uFE0E",
	glyph_speech_bubble: "🗩\uFE0E"
};

var buttonCharsMac = {
	btn_eject:"⏏",
	btn_session_prev:"⏮",
	btn_item_prev:"⏪",
	btn_item_stop:"⏹",
	btn_item_play:"\u25B6\uFE00",
	btn_item_pause:"⏸",
	btn_item_pauseplay:"⏯",
	btn_item_next:"⏩",
	btn_session_next:"⏭",
	btn_show_titles:"🗏",
	btn_do_print: "🖶",
	btn_export_bookmarks: "🔖",
	btn_show_exports: "💾",
	btn_show_settings: "🔧",
	glyph_chrono: "⏱",
	glyph_speech_bubble: "🗩"
};

var buttonCharsWin = {
	btn_eject:"⏏",
	btn_session_prev:"⏮",
	btn_item_prev:"⏪",
	btn_item_stop:"■",
	btn_item_play:"▶",
	btn_item_pause:"‖",
	btn_item_pauseplay:"⏯",
	btn_item_next:"⏩",
	btn_session_next:"⏭",
	btn_show_titles:"▤",
	btn_do_print: "P",
	btn_export_bookmarks: "🔖",
	btn_show_exports: "💾",
	btn_show_settings: "🔧",
	glyph_chrono: "⏱",
	glyph_speech_bubble: "💬"
};

var buttonCharsAndroid = {
	btn_eject:"▲",
	btn_session_prev:"|⏪",
	btn_item_prev:"⏪",
	btn_item_stop:"■",
	btn_item_play:"▶",
	btn_item_pause:"‖",
	btn_item_pauseplay:"▶‖",
	btn_item_next:"⏩",
	btn_session_next:"⏩|",
	btn_show_titles:"▤\uFE0E",
	btn_do_print: "P",
	btn_export_bookmarks: "☆\uFE0E",
	btn_show_exports: "💾\uFE0E",
	btn_show_settings: "🔧\uFE0E",
	glyph_chrono: "⏱",
	glyph_speech_bubble: "🗩"
};

// work around empty buttons on Android
var buttonCharsASCII = {
	btn_eject:"^",
	btn_session_prev:"|<<",
	btn_item_prev:"<<",
	btn_item_stop:"[]",
	btn_item_play:">",
	btn_item_pause:"||",
	btn_item_pauseplay:">||",
	btn_item_next:">>",
	btn_session_next:">>|",
	btn_show_titles:"T",
	btn_do_print: "P",
	btn_export_bookmarks: "E",
	btn_show_exports: "D",
	btn_show_settings: "S",
	glyph_chrono: "(t)",
	glyph_speech_bubble: "(e)"
};

var padImportErrorMessage = "Sorry, failed to import pad. Maybe your browser refused the request to CORS policy.";

// structure of the sessions:
//	[
//		{
//			h1:			index of the H1 tag in the section#contents
//			expected:	expected total runtime in seconds
//			estimated:	estimated total runtime in seconds (from reading speed)
//			words:		total word count for the session
//			items: [
//				{
//					h2:			index of the H2 tag in the section#contents
//					expected:	expected runtime in seconds
//					estimated:	estimated runtime in seconds (from reading speed)
//					words:		total word count for the item
//					music:		true if item is played audio, takes expected time
//					plus:		true if item is played audio, but we want to add speech time
//					lsp:		if present, the index of the cue to execute in Linux-Show-Player.
//					paused:		if present, force the paused state
//				}, ...
//			]
//		}, ...

var sessions = Array();
var session = -1;
var item = 0;
var startTime = null;
var itemStartTime = null;
var timerHandle = null;
var paused = false;

// scroll to top of next item?
var doNextItemScrollArgs = true;
if (/Firefox/.test(navigator.userAgent)) {
	doNextItemScrollArgs = {block: "start", behavior: "smooth"};
}

function formatMS(secs,forceh,showms){
	var h = "0" + Math.floor(secs / 3600);
	h = h.substr(h.length-2);
	secs %= 3600;
	var m = "0" + Math.floor(secs / 60);
	m = m.substr(m.length-2);
	var s = "0" + Math.floor(secs % 60);
	s = s.substr(s.length-2);
	var ret = "";
	if (forceh || (h != "00"))
		ret = h+":";
	ret += m + ":" + s;
	if (showms)
		ret += "."+(secs%1).toFixed(3).split(".")[1];
	return ret;
}

function maybeRoundTime(t) {
	// TODO: add setting?
	return Math.floor(t / 1000) * 1000;
}

function isPlaying() {
	return (timerHandle != null)
}

function encodeXMLEntities(s){
	return s.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
}

function updateTitle(padName){
	var title = "RadioTimer";
	if (padName)
		title = padName.replace('_', ' ') + " | " + title;
	$("title").text(title);
}

function highlightCurrent(doScroll){
	if (doScroll == null)
		doScroll = true;
	$('.current').removeClass("current");
	$('#current_h1').empty();
	$('#current_h2').empty();
	var i = null;
	if (sessions.length)
		i = sessions[session].h1;
	var h1 = $('section#contents').children()[i];
	if (h1) {
		$(h1).toggleClass("current");
		$('#current_h1').append(h1.textContent);
	}

	if (sessions.length && item < sessions[session].items.length) {
		i = sessions[session].items[item].h2;
		var h2 = $('section#contents').children()[i];
		if (h2) {
			$(h2).toggleClass("current");
			$('#current_h2').append(h2.textContent);
		}
	}
	if (doScroll && sessions.length) {
		$('section#contents').children().get(i).scrollIntoView( doNextItemScrollArgs );
	}
}

function update(toItem, force){
	var t = (new Date()).getTime();
	if (toItem != null) {
		if (!(sessions.length && sessions[session].items.length))
			toItem = null;
		else
			toItem = Math.max(0, Math.min(sessions[session].items.length - 1, toItem))
	}
	var s;
	if (sessions.length)
		s = sessions[session].expected;
	var i;
	if (sessions.length && sessions[session].items.length)
		i = sessions[session].items[item].expected;
	var d;
	var p;
	var late = false;

	d = 0;
	if (itemStartTime) {
		d = t - itemStartTime;
		if (sessions.length && sessions[session].items.length)
			sessions[session].items[item].recorded = maybeRoundTime(d) / 1000;
		d /= 1000;
	}
	p = d * 100 / i;
	if (d >= i && !(toItem != null)) {
		late = true;
		p = 100;
		if (!paused && item < sessions[session].items.length - 1)
			toItem = item + 1;
	}
	if (toItem != null && (toItem != item || force)) {
		console.log("Switching to item " + toItem);
		item = toItem;
		if (timerHandle) {
			itemStartTime = t;
			if (sessions.length && sessions[session].items.length) {
				sessions[session].items[item].start = maybeRoundTime(itemStartTime - startTime) / 1000;
				if ("paused" in sessions[session].items[item]) {
					var p = sessions[session].items[item].paused;
					console.log(p);
					setPaused(p == 1 || p == "+");
				}
			}
		}
		late = false;
		p = 0;
		highlightCurrent(!paused);
		notifyState({item:item});
	}
	$("#progress_h2>#bar").each(function(index){this.style.width = "" + p + "%";});
	$("#live_timer #item #running").text(formatMS(d));
	if (i) {
		var txt = ((i - d < 0) ? "+" : "-") + formatMS(Math.abs(i - d));
		$("#progress_h2").prop('title', txt);
		$("#live_timer #item #remaining").text(txt);
	}

	d = 0;
	if (startTime) {
		d = t - startTime;
		d /= 1000;
		if (sessions.length)
			sessions[session].recorded = d;
	}
	p = d * 100 / s;
	if (d >= s) {
		late = true;
		p = 100;
	}
	$("#progress_h1>#bar").each(function(index){this.style.width = "" + p + "%";});

	$("#live_timer").toggleClass("late", late);

	//if (startTime) {
	var state = buttonChars.btn_eject;
	if (sessions.length)
		state = buttonChars.btn_item_stop;
	if (paused)
		state = buttonChars.btn_item_pause;
	if (timerHandle) {
		state = buttonChars.btn_item_play;
		if (paused)
			state = buttonChars.btn_item_pauseplay;
	}
	$("#live_timer #status").text(state);
	$("#live_timer #main #running").text(formatMS(d));
	if (s) {
		var txt = ((s - d < 0) ? "+" : "-") + formatMS(Math.abs(s - d));
		$("#progress_h1").prop('title', txt);
		$("#live_timer #main #remaining").text(txt);
	}
}

function timerFunc(){
	update();
}

$("#btn_eject").click(function (e) {
	//console.log(e.target)
	sessions = Array();
	session = -1;
	item = 0;
	$("#padform>#url").show();
	$("#padform>#progress").hide();
	$("#btn_load").show();
	$('#current_h1').empty();
	$('#current_h1').append("(Session)");
	$('#current_h2').empty();
	$('#current_h2').append("(Item)");
	$("section#contents").empty();
	$("section#manual_text").show();
	$("section#settings").show();
	$('#extra_btns').show();
	$('section#manual_text')[0].scrollIntoView( true );
	return false;
});

function countWords(s) {
	// cf. http://www.mediacollege.com/internet/javascript/text/count-words.html
	// (but it's a bit broken)
	// URLs should count as a single word so it's ok
	s = s.replace(/(^\s*)|(\s*$)/gi,"");
	s = s.replace(/\n/," ");
	s = s.replace(/\s{1,}/gi," ");
	s = s.split(' ');
	if (s.length == 1 && s[0].length == 0)
		return 0;
	return s.length;
}

function padLoaded(){
	$("section#manual_text").hide();
	$("section#settings").hide();
	$("section#exports").hide();

	// make sure links do not replace the document, can be annoying when recording
	// cf. http://html.com/attributes/a-target/#a_target_blank_Open_in_New_Browser_Tab_or_Window
	// document.links didn't seem to work...
	// see also https://mathiasbynens.github.io/rel-noopener/
	$('section#contents').find('a[href]').filter(function() {
		return this.hostname != window.location.hostname;
	}).attr('target', '_blank').attr('rel', 'noopener');

	var wpm = $('#settings_wpm').val();

	sessions = Array();
	session = -1;
	item = -1;

	// index H1 and sum up times from H2
	$('section#contents').children().each(function(index){
		if (this.tagName == "H1") {
			//console.log("[%d]: %o %s", index, this, this.tagName);
			// strip line breaks
			this.textContent = this.textContent.replace('\n', ' ');

			session++;
			item = -1;
			sessions[session] = {
				h1: index,
				expected: 0,
				estimated: 0,
				recorded: 0,
				words: 0,
				items: Array()
			};
		} else if (this.tagName == "H2") {
			//console.log("[%d]: %o %s; %s", index, this, this.tagName, this.innerHTML);
			// strip line breaks
			this.textContent = this.textContent.replace('\n', ' ');

			// reformat hints to be right-aligned
			var re = /^(.*)\s+(\[([0-9]+):([0-9]+)\].*)$/;
			this.innerHTML = this.textContent.replace(re, '$1 <span class="right-align">$2</span>');

			var music = false; // item has audio
			var plus = false; // add text speech to audio play time
			var re = /.* (ZIK|MUSIC|AUDIO)(\+)?.*/;
			var m = this.textContent.match(re);
			//console.log(m);
			if (m) {
				music = m[1] != null;
				plus = m[2] != null;
			}

			var lsp = null; // item has LSP cue ID
			re = /.*\[LSP:([0-9]+)\].*/;
			m = this.textContent.match(re);
			//console.log(m);
			if (m) {
				lsp = parseInt(m[1]);
			}

			var paused = null; // force paused state
			re = /.*\[P:([01+-]+)\].*/;
			m = this.textContent.match(re);
			//console.log(m);
			if (m) {
				paused = parseInt(m[1]);
			}

			re = /.*\[([0-9]+):([0-9]+)\].*/;
			var m = this.textContent.match(re);
			//XXX: add item anyway even without time tag?
			if (m && sessions[session]) {
				item++;
				var t = parseInt(m[1]) * 60 + parseInt(m[2]);
				//console.log(t);
				sessions[session].expected += t;
				var it = {
					h2: index,
					expected: t,
					estimated: 0,
					start: 0,
					recorded: 0,
					words: 0,
					music: music,
					plus: plus
				};
				if (lsp != null)
					it.lsp = lsp;
				if (paused != null)
					it.paused = paused;
				sessions[session].items.push(it);
			}
		} else {
			// skip text before first H1
			if (session < 0)
				return true;
			if (item < 0)
				return true;
			// estimate the item runtime based on word count
			var words = sessions[session].items[item].words;
			var text = this.textContent;
			//var text = $(this).text();
			//XXX:somehow text from bullet lists don't have any whitespace between items
			// but this should be enough for us
			words += countWords(text);
			sessions[session].items[item].words = words;
			sessions[session].items[item].estimated = words * 60 / wpm;
			//console.log('w: '+words+' t: '+sessions[session].items[item].estimated+' : '+text)
		}
		return true;
	});
	// reset to first item
	item = 0;
	$(sessions).each(function(index){
		// update total estimated time
		for (i in this.items) {
			var t = this.items[i].estimated;
			if (this.items[i].music)
				t = this.items[i].expected;
			if (this.items[i].plus)
				t += this.items[i].estimated;
			this.items[i].estimated = t;
			this.estimated += t;
			this.words += this.items[i].words;
			t = " "+buttonChars.glyph_speech_bubble;
			t += "[" + formatMS(this.items[i].estimated) + "]";
			$('section#contents').children().eq(this.items[i].h2).find('span').append(t);
		}
		var t = '<span class="right-align">';
		t += " "+buttonChars.glyph_chrono;
		t += "[" + formatMS(this.expected) + "]";
		t += " "+buttonChars.glyph_speech_bubble;
		t += "[" + formatMS(this.estimated) + "]";
		t += '</span>';
		$('section#contents').children().eq(this.h1).append(t);
		//console.log(this);
	});

	$("#padform>#url").hide();
	$("#btn_load").hide();
	$("#padform>#progress").children().children().unwrap();
	$("#padform>#progress").hide();

	// make sure top is visible
	$('div#top')[0].scrollIntoView( true );
	session = 0;
	highlightCurrent();
	if (session in sessions)
		$('section#contents').children()[sessions[session].h1].scrollIntoView( true );
	update();
}

function sanitizeHTML(text) {
	// make sure we don't add script elements
	text = text.replace(/<[Ss][Cc][Rr][Ii][Pp][Tt].*\/[^>]*>/, "<!noscript />")
	text = text.replace(/<[Ss][Cc][Rr][Ii][Pp][Tt].*\/[Ss][Cc][Rr][Ii][Pp][Tt][^>]*>/, "<!noscript />")
	text = text.replace(/<[Ss][Cc][Rr][Ii][Pp][Tt]/, "<!-- SCRIPT")
	text = text.replace(/<\/[Ss][Cc][Rr][Ii][Pp][Tt].*>/, "/SCRIPT -->")
	// discard other links
	text = text.replace(/<[Ll][Ii][Nn][Kk](.*)>/, "<!link$1>")
	return text;
}

function loadEtherpad(url){
	var title = url.split('/').pop();
	updateTitle(null);

	if (/^https?:\/\/.*pad.*\/p\//.test(url))
		url += '/export/html';
	else
		url = url.replace(/^(https?:\/\/.*pad.*)\/(.*)/,'$1/ep/pad/export/$2/latest?format=html');
		// old etherpad
	console.log('loadEtherpad: ' + url);

	var r = $.get(url, function(response, status, xhr){
		response = sanitizeHTML(response);
		$("section#contents").append(response);
		$('section#contents').find('title,meta,style,script').remove();

		// doesn't work
		//var contents = $("section#contents").filter("h1,h2,h3");
		//$("section#contents").empty();
		//$("section#contents").append(contents);
		//$("section#contents").replaceWith($("section#contents").filter("h1"));
		//NS_ERROR_DOM_BAD_URI:
		//$("section#contents").load(response/* + " h1,h2"*/);
		//$("section#contents").not("style");

		// rewrap text blocks into spans.
		$('section#contents').contents()
			.filter(function(){return this.nodeType === 3})
				.wrap('<span />');

		updateTitle(title);
		padLoaded();
	});
	r.onerror = function(e) {
		console.log(e)
		console.log(r.getAllResponseHeaders())
		alert(padImportErrorMessage);
		$("#padform>#progress").children().children().unwrap();
		$("#padform>#progress").hide();
	};
	console.log(r);
}

function loadGoogleDocs(url){
	url = url.replace(/\/edit$/,'');
	url += '/mobilebasic';
	console.log('loadGoogleDocs: ' + url);
	//$.support.cors = true;
	//console.log($.support.cors);


	window.alert("sadly google's CORS policy won't let it work... try copy-pasting from the page.");
	$("#btn_eject").click();
	return;

	// XXX: maybe putting it in an iframe and let people log-in first?
	// it's not actually forbidden, it's just that it's not recognized as the
	// same origin, so google wants us to log-in.
	/* This doesn't work either due to cross-origin...
	$("section#contents").append('<iframe id="gdoc" src="'+url+'">');
	var iframe = document.getElementById('gdoc');
	var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
	window.alert(iframeDocument.length);
	*/
/*
	var r = $.get(url, function(response, status, xhr){
		response = sanitizeHTML(response);
		console.log(response);
		$("section#contents").append('<code>'+response+'</code>');
		$('section#contents').find('title,meta,style,script').remove();

		// rewrap text blocks into spans.
		$('section#contents').contents()
			.filter(function(){return this.nodeType === 3})
				.wrap('<span />');

		padLoaded();
	});
	r.onerror = function(e) {
		console.log(e)
		alert(padImportErrorMessage);
		$("#padform>#progress").children().children().unwrap();
		$("#padform>#progress").hide();
	};
	console.log(r);
*/
}

// generate chapter marks for session 's',
// for 'from' times (expected, estimated, real),
// omitting items less than 'ignore' seconds
function generateChapterMarks(s, from, ignore) {
	//00:00:00[.000] Intro
	if (s == null)
		s = 0;
	if (from == null)
		from = 'expected';
	if (ignore == null)
		ignore = 0;
	var t = 0;
	var lines = [];
	var c = $("section#contents").children();
	var stitle = c.eq(sessions[s].h1).contents().eq(0).text().trim();
	lines.push("# "+stitle);
	for (i in sessions[s].items) {
		lines.push(formatMS(t,true,true)+" "+c.eq(sessions[s].items[i].h2).contents().eq(0).text().trim());
		if (from in sessions[s].items[i])
			t += sessions[s].items[i][from];
	}
	var marks = {
		type: 'text/plain;charset=UTF-8',
		title: stitle,
		contents: lines.join('\n')
	}
	return marks;
}

// cf. https://podlove.org/simple-chapters/
function generatePSC(s, from, ignore) {
	if (s == null)
		s = 0;
	if (from == null)
		from = 'expected';
	if (ignore == null)
		ignore = 0;
	var t = 0;
	var lines = ['<psc:chapters version="1.2" xmlns:psc="http://podlove.org/simple-chapters">'];
	var c = $("section#contents").children();
	var stitle = c.eq(sessions[s].h1).contents().eq(0).text().trim();
	for (i in sessions[s].items) {
		var title = c.eq(sessions[s].items[i].h2).contents().eq(0).text().trim();
		title = encodeXMLEntities(title);
		lines.push('\t<psc:chapter title="'+title+'" start="'+formatMS(t,true,true)+'"/>');
		if (from in sessions[s].items[i])
			t += sessions[s].items[i][from];
	}
	lines.push('</psc:chapters>');
	var marks = {
		type: 'text/xml;charset=UTF-8',//'text/psc+xml;charset=UTF-8'
		title: stitle,
		contents: lines.join('\n')
	}
	return marks;
}

// cf. https://www.ffmpeg.org/ffmpeg-all.html#Metadata-1
function generateFFMeta(s, from, ignore) {
	if (s == null)
		s = 0;
	if (from == null)
		from = 'expected';
	if (ignore == null)
		ignore = 0;
	var t = 0;
	var c = $("section#contents").children();
	var stitle = c.eq(sessions[s].h1).contents().eq(0).text().trim();
	var lines = [
		";FFMETADATA1",
		"TITLE="+stitle.replace(/\\/g,'\\\\').replace(/#/g,'\\#'),
		"DATE_RECORDED="+(new Date()).toISOString().replace(/T.*/,"")
	];
	for (i in sessions[s].items) {
		// no timebase = times in ms
		lines.push("[CHAPTER]");
		// we can't use item.start in all cases...
		lines.push("START="+Math.floor(t*1000));
		if (from in sessions[s].items[i])
			t += sessions[s].items[i][from];
		lines.push("END="+Math.floor(t*1000));
		lines.push("title="+c.eq(sessions[s].items[i].h2).contents().eq(0).text().trim());
	}
	var marks = {
		type: 'text/plain;charset=UTF-8',
		title: stitle,
		contents: lines.join('\n')
	}
	return marks;
}

// cf. https://wiki.xiph.org/Chapter_Extension#Examples
function generateMKVChapters(s, from, ignore) {
	if (s == null)
		s = 0;
	if (from == null)
		from = 'expected';
	if (ignore == null)
		ignore = 0;
	var t = 0;
	var c = $("section#contents").children();
	var stitle = c.eq(sessions[s].h1).contents().eq(0).text().trim();
	var lines = [];
	for (i in sessions[s].items) {
		var ch = (1*i+1).toString().padStart(3,'0');
		lines.push("CHAPTER"+ch+"="+formatMS(t,true,true));
		var title = c.eq(sessions[s].items[i].h2).contents().eq(0).text().trim();
		lines.push("CHAPTER"+ch+"NAME="+title);
		if (from in sessions[s].items[i])
			t += sessions[s].items[i][from];
	}
	var marks = {
		type: 'text/plain;charset=UTF-8',
		title: stitle,
		contents: lines.join('\n')
	}
	return marks;
}

// cf. https://www.w3.org/TR/webvtt1/
// https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API
function generateVTT(s, from, ignore) {
	if (s == null)
		s = 0;
	if (from == null)
		from = 'expected';
	if (ignore == null)
		ignore = 0;
	var t = 0;
	var c = $("section#contents").children();
	var stitle = c.eq(sessions[s].h1).contents().eq(0).text().trim();
	var lines = [
		"WEBVTT - " + stitle,
		""
	];
	for (i in sessions[s].items) {
		var ch = (1*i+1).toString().padStart(3,'0');
		lines.push("chapter-"+ch);
		var start = t;
		if (from in sessions[s].items[i])
			t += sessions[s].items[i][from];
		var end = t;
		lines.push(""+formatMS(start,true,true)+" --> "+formatMS(end,true,true));
		var title = c.eq(sessions[s].items[i].h2).contents().eq(0).text().trim();
		lines.push(""+title);
		lines.push("");
	}
	var marks = {
		type: 'text/plain;charset=UTF-8',
		title: stitle,
		contents: lines.join('\n')
	}
	return marks;
}

var bookmarkExportFormats = {
	chaptermarks: { exporter: generateChapterMarks, ext: ".mp4c.txt", name: "MP4 Chapter Marks (.txt)" },
	psc:  { exporter: generatePSC, ext: ".psc", name: "Podlove Simple Chapters (.psc)" },
	ffmetadata: { exporter: generateFFMeta, ext: ".ffmeta", name: "FFmpeg Chapter Metadata" },
	mkvchapters: { exporter: generateMKVChapters, ext: ".mkvc.txt", name: "MKV/OGG/Vorbis Chapters" },
	vtt: { exporter: generateVTT, ext: ".vtt", name: "VTT Chapters" },
};

function exportBookmarks(opentab) {
console.log("exportBookmarks("+opentab+")");
	if (sessions.length < 1)
		return;
	var format = $('#settings_export_format').val();
	var from = $('#settings_export_which').val();
	var bookmarks = null;

	if (format in bookmarkExportFormats) {
		console.log("Exporting "+from+" times to "+format+"...");
		bookmarks = bookmarkExportFormats[format].exporter(session, from);
	} else
		console.log("Unknown export format "+format+"!");

	if (bookmarks) {
		$('#export_chapters_text').val(bookmarks.contents);
		// get decomposed UTF-8,
		// remove non-ascii7 chars,
		// and change non alpha-num to "-"
		// trim the dashes at start of title
		var filename = bookmarks.title.normalize('NFD').replace(/[^\x20-\x7E]/g,"").replace(/[^a-zA-Z0-9]/g,"-").replace(/^-*/,"") + bookmarkExportFormats[format].ext;
		$('#export_chapters_download').prop("download", filename);
		var datauri = 'data:'+bookmarks.type+','+encodeURIComponent(bookmarks.contents);
		$('#export_chapters_download').prop("href", datauri);
		if (opentab) {
			var win = window.open(datauri, "Bookmarks Export: " + bookmarks.title);
			//win.blur();
		}
	}
}

// adapted from https://git.legeox.net/capslock/web-slideshow-sync
wsAPI = {
	ws: null,
	code: null,
	isServer: false,

	connectWS: function() {
		wsAPI.code = $('#settings_sync_ws_code').val();
		wsAPI.isServer = wsAPI.code != "";
		var ip = $('#settings_sync_ws_ip').val();
		if (ip.length < 1)
			return;
		if (!ip.includes(":"))
			ip = ip + ":8102";
		const wsuri = "ws://" + ip + "/";
		wsAPI.ws = new WebSocket(wsuri);

		wsAPI.ws.onopen = function(event) {
			console.log("ws: connected");
		};

		wsAPI.ws.onclose = function(event) {
			console.log("ws: disconnected; reconnecting");
			setTimeout(wsAPI.connectWS, 2000);
		};

		wsAPI.ws.onmessage = function(str) {
			var ob = JSON.parse(str.data);
			if (ob.type == "change-location" && !wsAPI.isServer) {
				wsAPI.onChangeLocation(ob.url);
			} else if (ob.type == "ping") {
				wsAPI.serializeAndSend({type: "pong"}, true);
			} else if (ob.type == "client-count-updated") {
				console.log("WS clients: " + ob.count);
			} else {
				/* ignore the rest */
				console.log("unknown ws message type:" + ob.type)
			}
		};
	},

	onChangeLocation: function(ob) {
		console.log(ob);
		if ("session" in ob) {
			if (session > -1 && session < sessions.length)
				session = ob.session;
			update();
			highlightCurrent();
		}
		if ("item" in ob) {
			update(ob.item);
			highlightCurrent();
		}
		if ("paused" in ob) {
			setPaused(ob.paused);
		}
		if ("play" in ob) {
			if (ob.play) {
				$("#btn_item_play").click();
			} else {
				$("#btn_item_stop").click();
			}
		}
	},

	serializeAndSend: function(obj, clientsAllowed) {
		if (wsAPI.isServer || clientsAllowed) {
			wsAPI.ws.send(JSON.stringify(obj), function(error) {console.log(error);});
		}
	},

	refreshLocation: function(loc) {
		wsAPI.serializeAndSend({
			type: "location-refresh",
			code: wsAPI.code,
			location: loc || null
		});
	},

	notifyWS: function(state) {
		if (!wsAPI.ws || !wsAPI.isServer)
			return;
		wsAPI.serializeAndSend({
			type: "location-changed",
			url: state,
			code: wsAPI.code
		});
	}

};

function notifyLSP(item) {
	if (!isPlaying())
		return;
	if (!(sessions.length && sessions[session].items.length))
		return;
	if (!("lsp" in sessions[session].items[item]))
		return;
	var cue = sessions[session].items[item].lsp;
	var ip = $('#settings_sync_lsp_ip').val();
	if (ip.length < 1)
		return;
	if (!ip.includes(":"))
		ip = ip + ":8070";
	var client = new XMLHttpRequest();
	client.open("POST", "http://" + ip + "/", true); // third parameter indicates sync xhr. :(
	client.onload = function(e) {
		if (client.readyState == 4) {
			if (client.status != 200)
				console.error(client.statusText);
		}
	};
	client.onerror = function(e) {
		if (client.statusText)
			console.error(client.statusText);
	};
	// XXX: setting headers triggers CORS error
	//client.setRequestHeader("Content-Type", "text/xml");
	//client.setRequestHeader("User-Agent", "RadioTimer/0.1");
	// XXX: we get a CORS error and miss the reply but the request is really sent. Whatever.
	client.send("<?xml version='1.0'?><methodCall><methodName>execute</methodName><params><param><value><int>"+cue+"</int></value></param></params></methodCall>");
}

function notifyState(state) {
	console.log(state);
	wsAPI.notifyWS(state);
	if (state.hasOwnProperty('item')) {
		notifyLSP(state.item);
	}
}

function loadSettings() {
	cookie = "";
	settings = {};
	cookie = document.cookie.split("; ").filter(p => p.startsWith("settings=")).join("").replace("settings=","");
	cookie.split("&").forEach(p => {v = p.split(":"); settings[v[0]] = decodeURIComponent(v[1]);});
	Object.keys(settings).forEach(s => {
		if (s == "export_auto")
			$('#settings_'+s).prop("checked", settings[s] == "true");
		else
			$('#settings_'+s).val(settings[s]);
	});
	settings_css_onChange();
}

function saveSettings() {
	var cookie = {
		wpm: $('#settings_wpm').val(),
		css: $('#settings_css').val(),
		export_format: $('#settings_export_format').val(),
		export_which: $('#settings_export_which').val(),
		export_auto: $('#settings_export_auto').prop("checked"),
		sync_lsp_ip: $('#settings_sync_lsp_ip').val(),
		sync_ws_ip: $('#settings_sync_ws_ip').val(),
		sync_ws_code: $('#settings_sync_ws_code').val()
	};
	document.cookie = "settings=" + Object.keys(cookie).map(i => i + ":" + encodeURIComponent(cookie[i])).join("&");
}

$("#live_timer").click(function (e) {
	$("#live_timer #main #running").toggle();
	$("#live_timer #main #remaining").toggle();
});

$("#padform").submit(function (e) {
	var url=$('input[id="url"]').val();
	console.log('loadPad: ' + url);
	$("#padform>#url").hide();
	$("#padform>#progress").show();
	$("#padform>#progress").wrapInner("<progress>");
	$("section#contents").empty();

	// Etherpad instances
	// TODO: add other paterns
	//if (/framapad.org\/p\//.test(url)) {
	if (/^https?:\/\/.*pad.*\/p\//.test(url)) {
		loadEtherpad(url);
	} else if (/^https?:\/\/.*pad.*\//.test(url)) {
		loadEtherpad(url);
	} else if (/^https:\/\/docs\.google\.com\/document\//.test(url)) {
		loadGoogleDocs(url);
	} else {
		window.alert("unknown platform; try pasting enriched content");
		$("#btn_eject").click();
	}

	return false;
});

$("#controls").submit(function (e) {
	//console.log(e.target)
	return false;
});


$("#btn_session_prev").click(function (e) {
	//console.log(e.target)
	if (session > 0) {
		session--;
	}
	item = 0;
	highlightCurrent();
	update();
	if (sessions.length)
		$('section#contents').children()[sessions[session].h1].scrollIntoView( true );
	notifyState({session:session, item:item});
	return false;
});

$("#btn_session_next").click(function (e) {
	//console.log(e.target)
	if (session < sessions.length - 1) {
		session++;
	}
	item = 0;
	highlightCurrent();
	update();
	if (sessions.length)
		$('section#contents').children()[sessions[session].h1].scrollIntoView( true );
	notifyState({session:session, item:item});
	return false;
});

$("#btn_item_prev").click(function (e) {
	//console.log(e.target)
	update(item - 1);
	highlightCurrent();
	return false;
});

$("#btn_item_next").click(function (e) {
	//console.log(e.target)
	update(item + 1);
	highlightCurrent();
	return false;
});

$("#btn_item_stop").click(function (e) {
	//console.log(e)
	highlightCurrent();
	$('#extra_btns').show();
	$("#btn_eject").removeAttr('disabled', 'disabled');
	$("#btn_session_prev").removeAttr('disabled', 'disabled');
	$("#btn_session_next").removeAttr('disabled', 'disabled');
	var stopping = false;
	if (timerHandle) {
		clearInterval(timerHandle);
		timerHandle = null;
		stopping = true;
	}
	update();
	itemStartTime = startTime = null;
	//paused = false;
	//$("#btn_item_pause").prop('value', buttonChars.btn_item_pause);
	notifyState({play:false});
	if (stopping)
		exportBookmarks($('#settings_export_auto').prop('checked'));
	return false;
});

$("#btn_item_play").click(function (e) {
	//console.log(e)
	highlightCurrent();
	update();
	$('#extra_btns').hide();
	$("#btn_eject").attr('disabled', 'disabled');
	$("#btn_session_prev").attr('disabled', 'disabled');
	$("#btn_session_next").attr('disabled', 'disabled');
	//paused = false;
	//$("#btn_item_pause").prop('value', buttonChars.btn_item_pause);
	if (timerHandle)
		return false;
	timerHandle = setInterval(timerFunc, 500);
	itemStartTime = startTime = (new Date()).getTime();
	if (sessions.length && sessions[session].items.length) {
		sessions[session].items[item].start = 0;
		sessions[session].items[item].recorded = 0;
	}
	update(item, true);
	// send all the state to make sure we start at the same place.
	notifyState({play:true, session:session, item:item, paused:paused});
	return false;
});

function setPaused(p) {
	paused = p;
	if (paused)
		$("#btn_item_pause").prop('value', buttonChars.btn_item_pauseplay);
	else
		$("#btn_item_pause").prop('value', buttonChars.btn_item_pause);
	notifyState({paused:paused});
}

$("#btn_item_pause").click(function (e) {
	//console.log(e)
	highlightCurrent();
	setPaused(!paused);
	update();
	return false;
});

$("#btn_show_titles").click(function (e) {
	if (sessions.length == 0 || timerHandle != null)
		return false;
	$('section#contents').children().filter(function(){
		return !(/H1|H2|H3|H4/.test(this.tagName));
	}).toggle();
	highlightCurrent(true);
	return false;
});

$("#btn_do_print").click(function (e) {
	if (sessions.length == 0 || timerHandle != null)
		return false;
	window.print();
	return false;
});

$('#btn_export_bookmarks').click(function (e) {
	if (sessions.length == 0 || timerHandle != null)
		return false;
	exportBookmarks(true);
	return false;
});

$('#btn_show_settings').click(function (e) {
	if (timerHandle != null)
		return false;
	$('section#settings').toggle();
	$('section#settings').get(0).scrollIntoView(true);
	return false;
});

$('#btn_show_exports').click(function (e) {
	if (timerHandle != null)
		return false;
	$('section#exports').toggle();
	var shown = $('section#exports').css('display') != 'none'
	$('section#settings').toggle(shown);
	$('section#exports').get(0).scrollIntoView(true);
	if (shown)
		$("#export_chapters_text").get(0).select();
	return false;
});


$("#progress_h1").click(function (e) {
	//console.log(e)
	highlightCurrent();
	if (!(session in sessions))
		return false;
	var s = sessions[session].h1;
	$('section#contents').children()[s].scrollIntoView( true );
	return false;
});

$("#progress_h2").click(function (e) {
	//console.log(e)
	highlightCurrent();
	if (!(session in sessions) || !(item in sessions[session].items))
		return false;
	var i = sessions[session].items[item].h2;
	$('section#contents').children()[i].scrollIntoView( true );
	return false;
});


update();

$("#pastetarget").on("paste", function(e){
	//console.log("e: %o", e);
	//console.log("c: %o", e.clipboardData);
	console.log("s: %o", e.clipboardData.types);
	console.log("f: %o", e.clipboardData.files);
	e.preventDefault();
	var text = e.clipboardData.getData("text/html");
	if (!text)
		text = e.clipboardData.getData("text/plain");

	text = sanitizeHTML(text);

	//console.log(text);
	$("section#contents").empty();
	$("section#contents").append(text);

	// get a title
	var title = $('section#contents').find('title').text();

	// strip custom styling
	$('section#contents').find('title,meta,style,script').remove();

	// unwrap h1 h2 ...
	$('section#contents').contents().children()
		.filter(function(){return /H1|H2|H3|H4/.test(this.tagName)})
			.unwrap();

	updateTitle(title);
	padLoaded();
});

$("#settings_export_format, #settings_export_which").on("input", function(e){
	exportBookmarks(false);
});

function settings_css_onChange(e) {
	var i, a;
	// list available alternative CSS
	var css = document.getElementById("settings_css").value;
	console.log(css);
	// first disable all, else Firefox doesn't change on page load
	for (i = 0; (a = document.getElementsByTagName("link")[i]); i++) {
		if (a.getAttribute("rel").indexOf("style") != -1 && a.getAttribute("title")) {
			a.disabled = true;
		}
	}
	for (i = 0; (a = document.getElementsByTagName("link")[i]); i++) {
		if (a.getAttribute("rel").indexOf("style") != -1 && a.getAttribute("title")) {
			if (a.getAttribute("href") == css)
				a.disabled = false;
		}
	}
}
$("#settings_css").on("input", settings_css_onChange);

// fixup bookmarklet
// note it doesn't work with file: as Firefox disallows access from script.
$("#bookmarklet").prop("href", "javascript:window.location='" + window.location.toString().replace(window.location.search,'') + "?pad='+encodeURIComponent(location.href);");


function fixupButtons()
{
	//window.alert(buttonChars.btn_item_prev);
	for (id in buttonChars) {
		$('#' + id).prop('value', buttonChars[id]);
		$('.glyph_' + id).text(buttonChars[id]);
	}
	// TODO: fix help text too?
}

// attempt to work around boggus Unicode chars in fonts (Safari), too old fonts (Win)
if (/Safari/.test(navigator.userAgent)) {
//	buttonChars = buttonCharsMac;
}
if (/Windows NT/.test(navigator.userAgent)) {
	buttonChars = buttonCharsWin;
}
if (/Android 4\.1/.test(navigator.userAgent)) {
	buttonChars = buttonCharsAndroid;
}

fixupButtons();

// attempt to work around boggus Unicode chars in fonts (Android)
// We now have a set of glyphs for Android 4.1, so it shouldn't be necessary
if ($("#btn_session_prev")[0].clientWidth < $("#btn_item_prev")[0].clientWidth) {
	//window.alert("sz:" + $("#btn_session_prev")[0].clientWidth + ":"+ $("#btn_item_prev")[0].clientWidth);
	buttonChars = buttonCharsASCII;
	fixupButtons();
}

// localise
function getLang()
{
	if (navigator.languages)
		return navigator.languages[0];
	else if (navigator.language)
		return navigator.language;
	else if (navigator.userLanguage)
		return navigator.userLanguage;
	else if (navigator.browserLanguage)
		return navigator.browserLanguage;
}

function localizeUI() {
	var lang = getLang();
	var hideEn = true;

	if (/^fr$|^fr-/.test(lang) == true) {
		$("#btn_eject").attr('title', 'Ejecter');
		$("#btn_load").prop('value', 'Charger');
		$("#btn_load").attr('title', 'Charger');
		$("#btn_session_prev").attr('title', 'Session précédente');
		$("#btn_session_next").attr('title', 'Session suivante');
		$("#btn_item_prev").attr('title', 'Item précédent');
		$("#btn_item_next").attr('title', 'Item suivant');
		$("#btn_item_play").attr('title', 'Lecture');
		$("#btn_item_stop").attr('title', 'Arrêt');
		$("#btn_item_pause").attr('title', 'Pause');
		$("#btn_show_titles").attr('title', 'Montrer seulement les titres');
		$("#btn_do_print").attr('title', 'Imprimer le contenu actuel');
		//$("#btn_export_bookmarks").attr('title', 'Exporter les signets pour la session');
		$("#btn_show_exports").attr('title', 'Montrer les exports');
		$("#btn_show_settings").attr('title', 'Montrer les paramètres');
		$("#pastetarget").attr('placeholder', 'collez ici…');
		$('#settings_export_which option[value="recorded"]').text('Enregistré');
		$('#settings_export_which option[value="expected"]').text('Assigné');
		$('#settings_export_which option[value="estimated"]').text('Estimé');

		padImportErrorMessage = "Désolé, le chargement du pad a échoué. Il est probable que la configuration CORS de votre navigateur l'interdise.";

		$(":lang(fr)").show();
	} else
		hideEn = false;

	if (hideEn)
		$(":lang(en)").hide();

}

function buildUI() {
	var i, a;
	// list available alternative CSS
	var sel = document.getElementById("settings_css");
	for (i = 0; (a = document.getElementsByTagName("link")[i]); i++) {
		if (a.getAttribute("rel").indexOf("style") != -1 && a.getAttribute("title")) {
			var opt = document.createElement('option');
			opt.appendChild(document.createTextNode(a.getAttribute("title")));
			opt.value = a.getAttribute("href");
			sel.appendChild(opt);
		}
	}

	sel = document.getElementById("settings_export_format");
	for (i in bookmarkExportFormats) {
		var opt = document.createElement('option');
		opt.appendChild(document.createTextNode(bookmarkExportFormats[i].name));
		opt.value = i;
		sel.appendChild(opt);
	}
}

buildUI();
localizeUI();

loadSettings();

// autoload pad passed as parameter
if (document.location.search) {
	var args = document.location.search.slice(1).split('&');
	for (i in args) {
		var param = args[i].split("=");
		console.log(param);
		var k = param[0];
		var v = param[1];
		if (k == "pad") {
			var url = v;
			if (!url.includes('/')) // we allow unencoded URLs as well
				url = decodeURIComponent(url);
			$('input[id="url"]').val(url);
			$("#padform").submit();
		}
		var skeys = ["wpm", "sync_lsp_ip", "sync_ws_ip", "sync_ws_code"];
		for (sk in skeys) {
			if (k == skeys[sk]) {
				$('input[id="settings_'+k+'"]').val(decodeURIComponent(v));
			}
		}
	}
}

saveSettings();

wsAPI.connectWS();
