/* RadioTimer, Copyright 2016 François Revol */

var buttonChars = {
	"eject":"⏏",
	"session_prev":"⏮",
	"item_prev":"⏪",
	"item_stop":"⏹",
	"item_play":"⏵",
	"item_pause":"⏸",
	"item_pauseplay":"⏯",
	"item_next":"⏩",
	"session_next":"⏭"
};

// work around empty buttons on Android
var buttonCharsASCII = {
	"eject":"^",
	"session_prev":"|<<",
	"item_prev":"<<",
	"item_stop":"#",
	"item_play":">",
	"item_pause":"||",
	"item_pauseplay":">||",
	"item_next":">>",
	"session_next":">>|"
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

var sessions = Array();
var session = -1;
var item = 0;
var startTime = null;
var itemStartTime = null;
var timerHandle = null;
var paused = false;

function formatMS(secs){
	var m = "0" + Math.floor(secs / 60);
	m = m.substr(m.length-2);
	var s = "0" + Math.floor(secs % 60);
	s = s.substr(s.length-2);
	return m + ":" + s;
}

function highlightCurrent(){
	$('.current').removeClass("current");
	var s = null;
	if (sessions.length)
		s = sessions[session][0];
	//console.log(s);
	var i = null;
	if (sessions.length)
		i = sessions[session][2][item];
	//console.log(i);
	var h1 = $('section#contents').children()[s];
	var h2 = $('section#contents').children()[i];
	//console.log(h1);
	//console.log(h2);
	$(h1).toggleClass("current");
	$(h2).toggleClass("current");
	$('#current_h1').empty();
	$('#current_h1').append(h1.textContent);
	$('#current_h2').empty();
	$('#current_h2').append(h2.textContent);
	$('section#contents').children()[i].scrollIntoView( true );
}

function update(){
	var t = (new Date()).getTime();
	var s;
	if (sessions.length)
		s = sessions[session][1];
	var i;
	if (sessions.length && sessions[session][3].length)
		i = sessions[session][3][item];
	var d;
	var p;
	var late = false;

	d = 0;
	if (itemStartTime) {
		d = t - itemStartTime;
		d /= 1000;
	}
	p = d * 100 / i;
	if (d >= i) {
		late = true;
		p = 100;
		if (!paused && item < sessions[session][3].length - 1) {
			item++;
			if (timerHandle)
				itemStartTime = (new Date()).getTime();
			p = 0;
			late = false;
		}
		highlightCurrent();
	}
	$("#progress_h2>#bar").each(function(index){this.style.width = "" + p + "%";});

	d = 0;
	if (startTime) {
		d = t - startTime;
		d /= 1000;
	}
	p = d * 100 / s;
	if (d >= s) {
		late = true;
		p = 100;
	}
	$("#progress_h1>#bar").each(function(index){this.style.width = "" + p + "%";});

	if (late)
		$("#live_timer").each(function(index){this.style['background-color'] = "darkred";});
	else
		$("#live_timer").each(function(index){this.style['background-color'] = "LightSlateGrey";});


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
	$("#live_timer").empty();
	$("#live_timer").append(state + "&nbsp;");
	$("#live_timer").append(formatMS(d) + "&nbsp;");
	//}
}

function timerFunc(){
	update();
}

$("#eject").click(function (e) {
	console.log(e.target)
	$("#padform>#url").each(function(index){this.style.display = "initial";});
	$("#padform>#load").each(function(index){this.style.display = "initial";});
	$('#current_h1').empty();
	$('#current_h1').append("(Session)");
	$('#current_h2').empty();
	$('#current_h2').append("(Item)");
	$("section#contents").empty();
	$("section#manual_text").each(function(index){this.style.display = "initial";});
	$('section#manual_text')[0].scrollIntoView( true );
	return false;
});

function padLoaded(){
	$("section#manual_text").each(function(index){this.style.display = "none";});

	sessions = Array();
	session = -1;
	item = 0;

	// index H1 and sum up times from H2
	$('section#contents').children().each(function(index){
		if (this.tagName == "H1") {
			console.log("[%d]: %o %s", index, this, this.tagName);
			session++;
			sessions[session] = [ index, 0, Array(), Array() ];
		}
		if (this.tagName == "H2") {
			//console.log("[%d]: %o %s; %s", index, this, this.tagName, this.innerHTML);
			var re = /.*\[([0-9]+):([0-9]+)\].*/;
			var m = this.textContent.match(re);
			if (m) {
				var t = parseInt(m[1]) * 60 + parseInt(m[2]);
				console.log(t);
				sessions[session][1] += t;
				sessions[session][2].push(index);
				sessions[session][3].push(t);
			}
		}
		return true;
	});
	$(sessions).each(function(index){
		var secs = this[1];
		var t = " [" + formatMS(secs) + "]";
		$('section#contents').children()[this[0]].innerHTML += t;
		console.log(this);
	});

	$("#padform>#url").each(function(index){this.style.display = "none";});
	$("#padform>#load").each(function(index){this.style.display = "none";});

	// make sure top is visible
	$('div#top')[0].scrollIntoView( true );
	session = 0;
	highlightCurrent();
	$('section#contents').children()[sessions[session][0]].scrollIntoView( true );
	update();
}

$("#padform").submit(function (e) {
	var url=$('input[id="url"]').attr("value");
	url += '/export/html';
	console.log('loadPad: ' + url);
	$("section#contents").empty();
	$.get(url, function(response){
		$("section#contents").append(response);
		$('section#contents').children().each(function(index){
			//console.log("[%d]: %o %s", index, this, this.tagName);
			if (/TITLE|META|STYLE|SCRIPT/.test(this.tagName)) {
				this.remove();
			}
			return true;
		})

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
	return false;
});

$("#controls").submit(function (e) {
	console.log(e.target)
	return false;
});


$("#session_prev").click(function (e) {
	console.log(e.target)
	if (session > 0) {
		session--;
	}
	item = 0;
	highlightCurrent();
	update();
	$('section#contents').children()[sessions[session][0]].scrollIntoView( true );
	return false;
});

$("#session_next").click(function (e) {
	console.log(e.target)
	if (session < sessions.length - 1) {
		session++;
	}
	item = 0;
	highlightCurrent();
	update();
	$('section#contents').children()[sessions[session][0]].scrollIntoView( true );
	return false;
});

$("#item_prev").click(function (e) {
	console.log(e.target)
	var s = sessions[session];
	if (item > 0) {
		item--;
	}
	if (timerHandle)
		itemStartTime = (new Date()).getTime();
	highlightCurrent();
	update();
	return false;
});

$("#item_next").click(function (e) {
	console.log(e.target)
	var s = sessions[session];
	if (item < s[2].length - 1) {
		item++;
	}
	if (timerHandle)
		itemStartTime = (new Date()).getTime();
	highlightCurrent();
	update();
	return false;
});

$("#item_stop").click(function (e) {
	console.log(e)
	highlightCurrent();
	$("#padform>#eject").removeAttr('disabled', 'disabled');
	$("#controls>#session_prev").removeAttr('disabled', 'disabled');
	$("#controls>#session_next").removeAttr('disabled', 'disabled');
	if (timerHandle) {
		clearInterval(timerHandle);
		timerHandle = null;
	}
	update();
	itemStartTime = startTime = null;
	paused = false;
	$("#controls>#item_pause").attr('value', '⏸');
	return false;
});

$("#item_play").click(function (e) {
	console.log(e)
	highlightCurrent();
	update();
	$("#padform>#eject").attr('disabled', 'disabled');
	$("#controls>#session_prev").attr('disabled', 'disabled');
	$("#controls>#session_next").attr('disabled', 'disabled');
	paused = false;
	$("#controls>#item_pause").attr('value', '⏸');
	if (timerHandle)
		return false;
	timerHandle = setInterval(timerFunc, 500);
	itemStartTime = startTime = (new Date()).getTime();
	update();
	return false;
});

$("#item_pause").click(function (e) {
	console.log(e)
	highlightCurrent();
	paused = !paused;
	if (paused)
		$("#controls>#item_pause").attr('value', buttonChars.item_pauseplay);
	else
		$("#controls>#item_pause").attr('value', buttonChars.item_pause);
	update();
	return false;
});


$("#progress_h1").click(function (e) {
	console.log(e)
	highlightCurrent();
	var s = sessions[session][0];
	$('section#contents').children()[s].scrollIntoView( true );
	return false;
});

$("#progress_h2").click(function (e) {
	console.log(e)
	highlightCurrent();
	var i = sessions[session][2][item];
	$('section#contents').children()[i].scrollIntoView( true );
	return false;
});


update();

$("#pastetarget").on("paste", function(e){
	console.log("e: %o", e);
	console.log("c: %o", e.clipboardData);
	console.log("s: %o", e.clipboardData.types);
	console.log("f: %o", e.clipboardData.files);
	e.preventDefault();
	var text = e.clipboardData.getData("text/html");
	if (!text)
		text = e.clipboardData.getData("text/plain");
	//console.log(text);
	$("section#contents").empty();
	$("section#contents").append(text);
	// unwrap h1 h2 ...
	$('section#contents').contents().children()
		.filter(function(){return /H1|H2|H3|H4/.test(this.tagName)})
			.unwrap();

	padLoaded();
});


// attempt to work around boggus Unicode chars in fonts (Android)
if ($("#session_prev")[0].clientWidth != $("#item_prev")[0].clientWidth) {
	//window.alert("sz:" + $("#session_prev")[0].clientWidth + ":"+ $("#item_prev")[0].clientWidth);
	buttonChars = buttonCharsASCII;
	//window.alert(buttonChars.item_prev);
	$("#padform>#eject").attr('value', buttonChars.eject);
	$("#controls>#session_prev").attr('value', buttonChars.session_prev);
	$("#controls>#session_next").attr('value', buttonChars.session_next);
	$("#controls>#item_prev").attr('value', buttonChars.item_prev);
	$("#controls>#item_next").attr('value', buttonChars.item_next);
	$("#controls>#item_play").attr('value', buttonChars.item_play);
	$("#controls>#item_stop").attr('value', buttonChars.item_stop);
	$("#controls>#item_pause").attr('value', buttonChars.item_pause);
	// TODO: fix help text too?
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
		$("#pastetarget").attr('placeholder', 'collez ici…');

		$(".fr").each(function(index){this.style.display = "initial";});
	} else
		hideEn = false;

	if (hideEn)
		$(".en").each(function(index){this.style.display = "none";});

}

localizeUI();

