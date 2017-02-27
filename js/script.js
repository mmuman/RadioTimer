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
	"eject":"⏏",
	"session_prev":"⏮",
	"item_prev":"⏪",
	"item_stop":"⏹",
	"item_play":"⏵",
	"item_pause":"⏸",
	"item_pauseplay":"⏯",
	"item_next":"⏩",
	"session_next":"⏭",
	"show_titles":"🗏",
	"do_print": "🖶"
};

var buttonCharsMac = {
	"eject":"⏏",
	"session_prev":"⏮",
	"item_prev":"⏪",
	"item_stop":"⏹",
	"item_play":"\u25B6\uFE00",
	"item_pause":"⏸",
	"item_pauseplay":"⏯",
	"item_next":"⏩",
	"session_next":"⏭",
	"show_titles":"🗏",
	"do_print": "🖶"
};

// work around empty buttons on Android
var buttonCharsASCII = {
	"eject":"^",
	"session_prev":"|<<",
	"item_prev":"<<",
	"item_stop":"[]",
	"item_play":">",
	"item_pause":"||",
	"item_pauseplay":">||",
	"item_next":">>",
	"session_next":">>|",
	"show_titles":"T",
	"do_print": "P"
};

if(navigator.onLine){
    // browser is online so I can load the list from the server
    //server.list(init);
    // set the connection status to true
    setConnected(true);
} else {
    // Not online, set the connection status to false
    setConnected(false);
}


function setConnected(isConnected){
    var buttons = 'input[type="submit"], button';
    if( isConnected ){
		console.log('online');
        $(buttons).removeAttr('disabled', 'disabled');
    } else {
		console.log('offline');
        $(buttons).attr('disabled', 'disabled');
    }
}


$(window).bind('online', function(){
    // If the list was never loaded
    if( ! loaded ){
        // we load the list from the server
        //server.list(init);
    }
    // set the connection status to true
    setConnected(true);
});
$(window).bind('offline', function(){
    // set the connection status to false
    setConnected(false);
});

// structure of the sessions:
//	[
//		{
//			h1:			index of the H1 tag in the section#contents
//			expected:	expected total runtime in seconds
//			estimated:	estimated total runtime in seconds (from reading speed)
//			words:		total word count for the session
//			items: [
//				{
//					h1:			index of the H2 tag in the section#contents
//					expected:	expected runtime in seconds
//					estimated:	estimated runtime in seconds (from reading speed)
//					words:		total word count for the item
//					music:		true if item is played audio, takes expected time
//					plus:		true if item is played audio, but we want to add speech time
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

function formatMS(secs){
	var m = "0" + Math.floor(secs / 60);
	m = m.substr(m.length-2);
	var s = "0" + Math.floor(secs % 60);
	s = s.substr(s.length-2);
	return m + ":" + s;
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

function update(){
	var t = (new Date()).getTime();
	//t = Math.round(t / 1000) * 1000;
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
		d /= 1000;
		if (sessions.length && sessions[session].items.length)
			sessions[session].items[item].recorded = d;
	}
	p = d * 100 / i;
	if (d >= i) {
		late = true;
		p = 100;
		if (!paused && item < sessions[session].items.length - 1) {
			if (timerHandle) {
				itemStartTime = t;
				if (sessions.length && sessions[session].items.length)
					sessions[session].items[item].start = (itemStartTime - startTime) / 1000;
			}
			item++;
			p = 0;
			late = false;
		}
		highlightCurrent(!paused);
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
	var state = buttonChars.eject;
	if (sessions.length)
		state = buttonChars.item_stop;
	if (paused)
		state = buttonChars.item_pause;
	if (timerHandle) {
		state = buttonChars.item_play;
		if (paused)
			state = buttonChars.item_pauseplay;
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

$("#eject").click(function (e) {
	//console.log(e.target)
	sessions = Array();
	session = -1;
	item = 0;
	$("#padform>#url").show();
	$("#padform>#progress").hide();
	$("#padform>#load").show();
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

			re = /.*\[([0-9]+):([0-9]+)\].*/;
			var m = this.textContent.match(re);
			//XXX: add item anyway even without time tag?
			if (m) {
				item++;
				var t = parseInt(m[1]) * 60 + parseInt(m[2]);
				//console.log(t);
				sessions[session].expected += t;
				sessions[session].items.push({
					h2: index,
					expected: t,
					estimated: 0,
					start: 0,
					recorded: 0,
					words: 0,
					music: music,
					plus: plus
				});
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
			t = " 🗩[" + formatMS(this.items[i].estimated) + "]";
			$('section#contents').children().eq(this.items[i].h2).find('span').append(t);
		}
		var t = '<span class="right-align">';
		t += " ⏱[" + formatMS(this.expected) + "]";
		t += " 🗩[" + formatMS(this.estimated) + "]";
		t += '</span>';
		$('section#contents').children().eq(this.h1).append(t);
		//console.log(this);
	});

	$("#padform>#url").hide();
	$("#padform>#load").hide();
	$("#padform>#progress").children().children().unwrap();
	$("#padform>#progress").hide();

	// make sure top is visible
	$('div#top')[0].scrollIntoView( true );
	session = 0;
	highlightCurrent();
	$('section#contents').children()[sessions[session].h1].scrollIntoView( true );
	update();
}

function loadEtherpad(url){
	url += '/export/html';
	console.log('loadEtherpad: ' + url);

	$.get(url, function(response){
		$("section#contents").append(response);
		// this.remove() doesn't work in Android it seems
		// it's not a good idea to alter a list while iterating over it anyway
		/*
		$('section#contents').children().each(function(index){
			console.log("[%d]: %o %s", index, this, this.tagName);
			if (/TITLE|META|STYLE|SCRIPT/.test(this.tagName)) {
				console.log("removing " + this.tagName);
				//this.remove();
			}
			return true;
		});
		*/
		var c = $('section#contents').contents()
			.not(function(){
				//console.log("%o %s", this, this.tagName);
				return /TITLE|META|STYLE|SCRIPT/.test(this.tagName);
			});
		$("section#contents").empty();
		$("section#contents").append(c);

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

		padLoaded();
	})
}

function loadGoogleDocs(url){
	console.log('loadGoogleDocs: ' + url);
	//$.support.cors = true;
	//console.log($.support.cors);


	window.alert("sadly google's CORS policy won't let it work... try copy-pasting from the page.");
	$("#eject").click();
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

	$.get(url, function(response){
		$("section#contents").append(response);
		padLoaded();
	});
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
	var title = c.eq(sessions[s].h1).contents().eq(0).text().trim();
	lines.push("# "+title);
	for (i in sessions[s].items) {
		lines.push("00:"+formatMS(t)+" "+c.eq(sessions[s].items[i].h2).contents().eq(0).text().trim());
		if (from in sessions[s].items[i])
			t += sessions[s].items[i][from];
	}
	var marks = {
		type: 'text/plain;charset=UTF-8',
		title: title,
		contents: lines.join('\n')
	}
	return marks;
}

function exportBookmarks() {
	if (sessions.length < 1)
		return;
	var format = $('#settings_export_format').val();
	var from = $('#settings_export_which').val();
	var bookmarks = null;

	console.log("Exporting "+from+" times to "+format+"...");
	if (format == 'chaptermarks') {
		bookmarks = generateChapterMarks(session, from);
	}

	if (bookmarks) {
		var win = window.open('data:'+bookmarks.type+','+encodeURIComponent(bookmarks.contents), "Bookmarks Export: " + bookmarks.title);
		//win.blur();
	}
}

$("#live_timer").click(function (e) {
	$("#live_timer #main #running").toggle();
	$("#live_timer #main #remaining").toggle();
});

$("#padform").submit(function (e) {
	var url=$('input[id="url"]').attr("value");
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
	} else if (/^https:\/\/docs\.google\.com\/document\//.test(url)) {
		loadGoogleDocs(url);
	} else {
		window.alert("unknown platform; try pasting enriched content");
		$("#eject").click();
	}

	return false;
});

$("#controls").submit(function (e) {
	//console.log(e.target)
	return false;
});


$("#session_prev").click(function (e) {
	//console.log(e.target)
	if (session > 0) {
		session--;
	}
	item = 0;
	highlightCurrent();
	update();
	$('section#contents').children()[sessions[session].h1].scrollIntoView( true );
	return false;
});

$("#session_next").click(function (e) {
	//console.log(e.target)
	if (session < sessions.length - 1) {
		session++;
	}
	item = 0;
	highlightCurrent();
	update();
	$('section#contents').children()[sessions[session].h1].scrollIntoView( true );
	return false;
});

$("#item_prev").click(function (e) {
	//console.log(e.target)
	var t = (new Date()).getTime();
	t = Math.round(t / 1000) * 1000;
	var s = sessions[session];
	if (timerHandle) {
		if (sessions.length && sessions[session].items.length)
			sessions[session].items[item].recorded = (t - itemStartTime) / 1000;
	}
	if (item > 0) {
		item--;
	}
	if (timerHandle) {
		itemStartTime = t;
		if (sessions.length && sessions[session].items.length)
			sessions[session].items[item].start = (itemStartTime - startTime) / 1000;
	}
	highlightCurrent();
	update();
	return false;
});

$("#item_next").click(function (e) {
	//console.log(e.target)
	var t = (new Date()).getTime();
	t = Math.round(t / 1000) * 1000;
	var s = sessions[session];
	if (timerHandle) {
		if (sessions.length && sessions[session].items.length)
			sessions[session].items[item].recorded = (t - itemStartTime) / 1000;
	}
	if (item < s.items.length - 1) {
		item++;
	}
	if (timerHandle) {
		itemStartTime = t;
		if (sessions.length && sessions[session].items.length)
			sessions[session].items[item].start = (itemStartTime - startTime) / 1000;
	}
	highlightCurrent();
	update();
	return false;
});

$("#item_stop").click(function (e) {
	//console.log(e)
	highlightCurrent();
	$('#extra_btns').show();
	$("#padform>#eject").removeAttr('disabled', 'disabled');
	$("#controls>#session_prev").removeAttr('disabled', 'disabled');
	$("#controls>#session_next").removeAttr('disabled', 'disabled');
	var stopping = false;
	if (timerHandle) {
		clearInterval(timerHandle);
		timerHandle = null;
		stopping = true;
	}
	update();
	itemStartTime = startTime = null;
	//paused = false;
	//$("#controls>#item_pause").attr('value', buttonChars.item_pause);
	if (stopping && $('#settings_export_auto').prop('checked'))
		exportBookmarks();
	return false;
});

$("#item_play").click(function (e) {
	//console.log(e)
	highlightCurrent();
	update();
	$('#extra_btns').hide();
	$("#padform>#eject").attr('disabled', 'disabled');
	$("#controls>#session_prev").attr('disabled', 'disabled');
	$("#controls>#session_next").attr('disabled', 'disabled');
	//paused = false;
	//$("#controls>#item_pause").attr('value', buttonChars.item_pause);
	if (timerHandle)
		return false;
	timerHandle = setInterval(timerFunc, 500);
	itemStartTime = startTime = Math.round((new Date()).getTime() / 1000) * 1000;
	if (sessions.length && sessions[session].items.length) {
		sessions[session].items[item].start = 0;
		sessions[session].items[item].recorded = 0;
	}
	update();
	return false;
});

$("#item_pause").click(function (e) {
	//console.log(e)
	highlightCurrent();
	paused = !paused;
	if (paused)
		$("#controls>#item_pause").attr('value', buttonChars.item_pauseplay);
	else
		$("#controls>#item_pause").attr('value', buttonChars.item_pause);
	update();
	return false;
});

$("#show_titles").click(function (e) {
	if (sessions.length == 0 || timerHandle != null)
		return false;
	$('section#contents').children().filter(function(){
		return !(/H1|H2|H3|H4/.test(this.tagName));
	}).toggle();
	return false;
});

$("#do_print").click(function (e) {
	if (sessions.length == 0 || timerHandle != null)
		return false;
	window.print();
	return false;
});

$('#export_bookmarks').click(function (e) {
	if (sessions.length == 0 || timerHandle != null)
		return false;
	exportBookmarks();
	return false;
});

$('#show_settings').click(function (e) {
	if (timerHandle != null)
		return false;
	$('section#settings').toggle();
	$('section#settings').get(0).scrollIntoView(true);
	return false;
});


$("#progress_h1").click(function (e) {
	//console.log(e)
	highlightCurrent();
	var s = sessions[session].h1;
	$('section#contents').children()[s].scrollIntoView( true );
	return false;
});

$("#progress_h2").click(function (e) {
	//console.log(e)
	highlightCurrent();
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

	// make sure we don't add script elements
	text = text.replace(/<[Ss][Cc][Rr][Ii][Pp][Tt].*\/[^>]*>/, "<!noscript />")
	text = text.replace(/<[Ss][Cc][Rr][Ii][Pp][Tt].*\/[Ss][Cc][Rr][Ii][Pp][Tt][^>]*>/, "<!noscript />")
	text = text.replace(/<[Ss][Cc][Rr][Ii][Pp][Tt]/, "<!-- ")
	text = text.replace(/<\/[Ss][Cc][Rr][Ii][Pp][Tt].*>/, " -->")
	// discard other links
	text = text.replace(/<[Ll][Ii][Nn][Kk]/, "<!link")

	//console.log(text);
	$("section#contents").empty();
	$("section#contents").append(text);
	// unwrap h1 h2 ...
	$('section#contents').contents().children()
		.filter(function(){return /H1|H2|H3|H4/.test(this.tagName)})
			.unwrap();

	padLoaded();
});


function fixupButtons()
{
	//window.alert(buttonChars.item_prev);
	$("#padform>#eject").attr('value', buttonChars.eject);
	$("#controls>#session_prev").attr('value', buttonChars.session_prev);
	$("#controls>#session_next").attr('value', buttonChars.session_next);
	$("#controls>#item_prev").attr('value', buttonChars.item_prev);
	$("#controls>#item_next").attr('value', buttonChars.item_next);
	$("#controls>#item_play").attr('value', buttonChars.item_play);
	$("#controls>#item_stop").attr('value', buttonChars.item_stop);
	$("#controls>#item_pause").attr('value', buttonChars.item_pause);
	$("#controls #show_titles").attr('value', buttonChars.show_titles);
	$("#controls #do_print").attr('value', buttonChars.do_print);
	// TODO: fix help text too?
}

// attempt to work around boggus Unicode chars in fonts (Safari)
if (/Safari/.test(navigator.userAgent)) {
	buttonChars = buttonCharsMac;
	fixupButtons();
}
// attempt to work around boggus Unicode chars in fonts (Android)
// XXX: /Android/.test(navigator.userAgent) ?
if ($("#session_prev")[0].clientWidth != $("#item_prev")[0].clientWidth) {
	//window.alert("sz:" + $("#session_prev")[0].clientWidth + ":"+ $("#item_prev")[0].clientWidth);
	buttonChars = buttonCharsASCII;
	fixupButtons();
}


// localise
function getLang()
{
	if (navigator.languages != undefined)
		return navigator.languages[0];
	else
		return navigator.language;
}

function localizeUI() {
	var lang = getLang();
	var hideEn = true;

	if (/^fr$|^fr-/.test(lang) == true) {
		$("#padform>#eject").attr('title', 'Ejecter');
		$("#padform>#load").attr('value', 'Charger');
		$("#padform>#load").attr('title', 'Charger');
		$("#controls>#session_prev").attr('title', 'Session précédente');
		$("#controls>#session_next").attr('title', 'Session suivante');
		$("#controls>#item_prev").attr('title', 'Item précédent');
		$("#controls>#item_next").attr('title', 'Item suivant');
		$("#controls>#item_play").attr('title', 'Lecture');
		$("#controls>#item_stop").attr('title', 'Arrêt');
		$("#controls>#item_pause").attr('title', 'Pause');
		$("#controls #show_titles").attr('title', 'Montrer seulement les titres');
		$("#controls #do_print").attr('title', 'Imprimer le contenu actuel');
		$("#controls #export_bookmarks").attr('title', 'Exporter les signets pour la session');
		$("#controls #show_settings").attr('title', 'Montrer les paramètres');
		$("#pastetarget").attr('placeholder', 'collez ici…');
		$('#settings_export_which option[value="recorded"]').text('Enregistré');
		$('#settings_export_which option[value="expected"]').text('Assigné');
		$('#settings_export_which option[value="estimated"]').text('Estimé');

		$(".fr").show();
	} else
		hideEn = false;

	if (hideEn)
		$(".en").hide();

}

localizeUI();

// autoload pad passed as parameter
if (document.location.search) {
	var args = document.location.search.slice(1).split('&');
	for (i in args) {
		if (/^pad=/.test(args[i])) {
			var url = args[i].replace(/^pad=/, "");
			$('input[id="url"]').attr("value", url);
			$("#padform").submit();
		}
	}
}
