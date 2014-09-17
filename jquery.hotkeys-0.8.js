/* m-141~js/crossword.js */
var jQ = jQuery.noConflict();

jQ('ready', crossword_init);
jQ('ready', load_from_cookie);

var focus_event_fired_during_click = false;
var active_words = [];

function crossword_init() {
	var inputs = jQ('#grid').find('input');
	var all_words = jQ('#grid div');

	inputs.bind('focus', function(e) {
		var current_letter = jQ(this);
		focus_event_fired_during_click = true;
		if (!in_active_word(current_letter)) {
			var intersecting_letter = getIntersectingLetter(current_letter);
			if (intersecting_letter && !is_first_letter(current_letter) && is_first_letter(intersecting_letter)) {
				intersecting_letter.select();
				activate_word(intersecting_letter);
			} else {
				this.select();
				activate_word(current_letter);
			}
		}
	});

	function in_active_word(letter) {
		var in_active = false;
		var this_word = letter.closest('div');
		jQ.each(active_words, function() {
			if (this_word.attr('id') === this.attr('id')) {
				in_active = true;
			}
		});
		return in_active;
	}

	function is_first_letter(letter) {
		return letter.closest('div').find('input:first').attr('id') === letter.attr('id');
	}

	inputs.bind('mousedown', function(e) {
		focus_event_fired_during_click = false;
	});

	inputs.bind('mouseup', function(e) {
		var current_letter = jQ(this);
		var word = current_letter.closest('div');
		var intersecting_letter = getIntersectingLetter(current_letter);
		if (intersecting_letter && !focus_event_fired_during_click) {
			intersecting_letter.focus();
		}
	});

	inputs.bind('keyup', function(e) {
		var key = e.keyCode || e.charCode;
		if (is_letter(key)) {
			jQ(e.target).val(String.fromCharCode(key).toLowerCase());
			copyChangeToIntersectingLetter(jQ(e.target));
			focusOnNextInput(jQ(e.target));
		}
		check_complete_for_letter(jQ(e.target));
	});
	function is_letter(key) {
		return (64 < key && key < 91) || (96 < key && key < 123) || key == 32;
	}

	inputs.bind('keydown', 'tab', function(e) {
		if (jQ(e.target).closest('div').nextAll('div:first')) {
			jQ(e.target).closest('div').nextAll('div:first').find('input:first').focus();
		}
		return false;
	});
	inputs.bind('keydown', 'Shift+tab', function(e) {
		if (jQ(e.target).closest('div').prevAll('div:first')) {
			jQ(e.target).closest('div').prevAll('div:first').find('input:first').focus();
		}
		return false;
	});
	inputs.bind('keyup', 'left', function(e) {
		move_back(e, 'across');
		return false;
	});
	inputs.bind('keyup', 'up', function(e) {
		move_back(e, 'down');
		return false;
	});
	inputs.bind('keyup', 'right', function(e) {
		move_forward(e, 'across');
		return false;
	});
	inputs.bind('keyup', 'down', function(e) {
		move_forward(e, 'down');
		return false;
	});
	inputs.bind('keyup', 'backspace', function(e) {
		copyChangeToIntersectingLetter(jQ(e.target));
		focusOnPreviousInput(jQ(e.target));
		check_complete_for_letter(jQ(e.target));
	});
	inputs.bind('keyup', 'del', function(e) {
		copyChangeToIntersectingLetter(jQ(e.target));
		check_complete_for_letter(jQ(e.target));
		// Capture action to stop moving cursor
		return false;
	});
	inputs.bind('keydown', 'esc', function(e) {
		copyChangeToIntersectingLetter(jQ(e.target));
		// Capture action to IE clearing the entire crossword
		return false;
	});

	function move_back(e, direction) {
		var letter = jQ(e.target);
		if (letter.attr('id').indexOf(direction) !== -1) {
			focusOnPreviousInput(letter);
		} else {
			if (getIntersectingLetter(letter)) {
				focusOnPreviousInput(getIntersectingLetter(letter));
			}
		}
	}
	function move_forward(e, direction) {
		var letter = jQ(e.target);
		if (letter.attr('id').indexOf(direction) !== -1) {
			focusOnNextInput(letter);
		} else {
			if (getIntersectingLetter(letter)) {
				focusOnNextInput(getIntersectingLetter(letter));
			}
		}
	}

	jQ('label').bind('click', function(e) {
		if (has_numbers && !text_is_highlighted()) {
			word = jQ('#' + jQ(e.target).closest('label').attr('for'));
			activate_word(word);
			word.find('input:first').focus();
			return false;
		}
	});

	function text_is_highlighted() {
		return (selection() && selection().toString() != '') || (range() && range().text != '')
	}

	jQ('#check').bind('click', function(e) {
		jQuery.each(active_words, function () {
			check(this.find('input'));
		});
		check_complete(all_words);
	});

	jQ('#check-all').bind('click', function(e) {
		check(inputs);
		check_complete(all_words);
	});

	jQ('#cheat').bind('click', function(e) {
		jQuery.each(active_words, function () {
			populate_solution_for(this.find('input'));
		});
		check_complete(all_words);
	});

	jQ('#solution').bind('click', function(e) {
		if (confirm('Are you sure you want to see the full solution for this crossword?')) {
			populate_solution_for(inputs);
			check_complete(all_words);
		}
	});

	jQ('#clear').bind('click', function(e) {
		jQuery.each(active_words, function () {
			clear(this.find('input'));
		});
		check_complete(all_words);
	});

	jQ('#save').bind('click', function(e) {
		var form_values = jQ(this).closest('form').serialize();
		var saved_state = 'id=' + crossword_identifier + ';' + form_values.replace(/(\d+)-across-(\d+)=/g, '$1a$2').replace(/(\d+)-down-(\d+)=/g, '$1d$2');
		if (jQ.browser.msie) {
			jQ.cookie('crossword', saved_state, { expires: 365 });
		} else {
			cookie_path = path.replace(/http:\/\/.*?\//, '');
			jQ.cookie('crossword', saved_state, { path: '/' + cookie_path, expires: 365 });
		}
	});

	jQ('#revert-to-saved').bind('click', function(e) {
		load_from_cookie();
		check_complete(all_words);
	});
}

function load_from_cookie() {
	var saved_state = jQ.cookie('crossword');
	if (!saved_state) {
		saved_state = jQ.cookie(crossword_identifier);
	}
	if (saved_state) {
        var valid_cookie = true;
        var match = saved_state.match(/id=(.*);/);
        if (match) {
            valid_cookie = (match[1] === crossword_identifier);
            saved_state = saved_state.replace(/id=.*;/, '');
        }
        if (valid_cookie) {
            var form_values = saved_state.replace(/(\d+)a(\d+)/g, '$1-across-$2=').replace(/(\d+)d(\d+)/g, '$1-down-$2=');
            jQ(form_values.split('&')).each(function(index, pair) {
                var name_value = pair.split('=');
                jQ('#' + name_value[0]).val(name_value[1]);
            });
        }
	}
}

jQ('ready', bind_activate);
function bind_activate() {
	jQ('#anagrams').bind('click', function(e) {
		if (active_words.length > 0) {
			var the_range = selection() ? selection().toString() != '' ? selection().getRangeAt(0) : null : range();
			var possible_letters = '';
			if (the_range && the_range.startContainer === undefined) {
				possible_letters = the_range.text;
			} else if (the_range && jQ(the_range.startContainer).closest('label').attr('id') === clue_for(active_words[0]).attr('id')) {
				possible_letters = selection().toString();
			}
			possible_letters = possible_letters.replace(/\W/g, '').toLowerCase();
			var existing_letters = "";
			jQuery.each(active_words, function() { this.find('input').each(function() {
				var letter = jQ(this);
				if (letter.val()) {
					existing_letters += letter.val();
					possible_letters = possible_letters.replace(letter.val(), '');
				} else {
					existing_letters += '_';
				}
			})});
			var width = existing_letters.length * 27;
			var height = width * 0.8 + 100;
			if (width < 280) { width = 280; }
			if (height < 250) { height = 250; }
			window.open('http://www.theguardian.com/crosswords/anagram?existing_letters=' + existing_letters + '&amp;possible_letters=' + possible_letters, 'anagrams', 'toolbar=false,menubar=false,status=false,height=' + height + ',width=' + width);
		}
	});
}

function selection() {
	if (window.getSelection) {
		return window.getSelection();
	}
}

function range() {
	if (document.selection) {
		return document.selection.createRange();
	}
}

function focusOnNextInput(element) {
	var nextClue = element.parent().next();
	if(nextClue && nextClue.length > 0) {
		nextClue.find('input').focus();
	} else {
		var word = element.closest('div');
		var this_word_was_last_word = false;
		jQuery.each(active_words, function() {
			if (this_word_was_last_word) {
				this.find('input:first').focus();
			}
			if (this.attr('id') === word.attr('id')) {
				this_word_was_last_word = true;
			} else {
				this_word_was_last_word = false;
			}
		});
	}
}

function focusOnPreviousInput(element) {
	var previousClue = element.parent().prev();
	if(previousClue) {
		previousClue.find('input').focus();
	}
}

function getIntersectingLetter(letter) {
	if(intersections[letter.attr('id')]) {
		return jQ('#' + intersections[letter.attr('id')]);
	}
	return null;
}


function copyChangeToIntersectingLetter(letter) {
	var intersect = getIntersectingLetter(letter);
	if (intersect) {
		intersect.val(letter.val());
	}
}

function clue_for(word) {
	return jQ('#' + word.attr('id') + '-clue');
}

function activate_word(letter) {
	jQuery.each(active_words, deactivate_word);
	active_words = words_for_letter(letter);
	jQuery.each(active_words, function() {
		this.css("z-index","999");
		this.addClass('active');
		if (has_numbers) {
			clue_for(this).addClass('active');
		}
	});
	jQ('#active-clue:not(.no-number)').append(clue_for(active_words[0]).contents().clone());
}

function words_for_letter(letter) {
	var word = letter.closest('div');
	words = words_for_clue[word.attr('id')]
    if (words) {
        the_words = jQuery.map(words, function(id) { return jQ('#' + id); });
    } else {
        the_words = [word]
    }
	return the_words
}

function deactivate_word() {
	this.removeClass('active');
	var clueNum = this.find('span').text();
	this.css("z-index", clueNum);
	jQ('#' + this.attr('id') + '-clue').removeClass('active');
	jQ('#active-clue').empty();
}

function check_complete_for_letter(letter) {
	check_complete(words_for_letter(letter));
	var intersect = getIntersectingLetter(letter);
    if (intersect) {
		check_complete(words_for_letter(intersect));
	}
}

function check_complete(words) {
	if (all_complete(words)) {
		jQuery.each(words, function() {
//			clue_for(jQ(this)).addClass('complete');
		});
	} else {
		jQuery.each(words, function() {
//           clue_for(jQ(this)).removeClass('complete');
        });
	}
}


function all_complete(words) {
	var all_are_complete = true;
	jQuery.each(words, function() {
		if (!is_complete(jQ(this))) {
			all_are_complete = false;
		}
	});
	return all_are_complete;
}

function is_complete(word) {
	var complete = true;
	word.find('input').each(function() {
		if (jQ(this).val() == '' || jQ(this).val() == ' ') {
			complete = false;
		}
	});
	return complete;
}

function insert_from_anagram(letter_array) {
	var i = 0;
	jQuery.each(active_words, function() { this.find('input').each(function() {
		jQ(this).val(letter_array[i++]);
		copyChangeToIntersectingLetter(jQ(this));
	})});
	check_complete(all_words);
}

function clear(inputs) {
	inputs.each(function() {
		var square = jQ(this);
		square.val('');
		copyChangeToIntersectingLetter(square);
	});
}

function populate_solution_for(inputs) {
	inputs.each(function() {
		var square = jQ(this);
		square.val(solutions[square.attr('id')].toLowerCase());
		copyChangeToIntersectingLetter(square);
	});
}

function check(inputs) {
    var wordCorrect = true;
	inputs.each(function() {
		var square = jQ(this);
		if (square.val().toLowerCase() != solutions[square.attr('id')].toLowerCase()) {
		    square.val('');
		    wordCorrect = false;
			copyChangeToIntersectingLetter(square);
		}
	});
	if (wordCorrect) {
	    clue_for(inputs.prevObject).addClass('complete');
	}
}

//use "http://www.datatables.org/data/htmlstring.xml" as html.tostring; select * from html.tostring where url = "http://www.theguardian.com/crosswords/quick/13840" and xpath="//div[@class='crossword']"

function getCrossword(id) {
    var data = ""
    var quickUrl = "http://www.theguardian.com/crosswords/quick/";
    jQ.get("https://query.yahooapis.com/v1/public/yql?q=use%20%22http%3A%2F%2Fwww.datatables.org%2Fdata%2Fhtmlstring.xml%22%20as%20html.tostring%3B%20select%20*%20from%20html.tostring%20where%20url%20%3D%20%22http%3A%2F%2Fwww.theguardian.com%2Fcrosswords%2Fquick%2F13840%22%20and%20xpath%3D%22%2F%2Fdiv%5B%40class%3D'crossword'%5D%22&format=json&diagnostics=true&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=",
        function (response, status, xhr) {
            data = response.query.results.result;
            console.log(status);
            console.log(response);
            jQ("#box").children().replaceWith(data);
        });
}


jQ(function () {
    getCrossword(13840)
});

/* m-141~js/jquery.cookie.js */
/**
 * Cookie plugin
 *
 * Copyright (c) 2006 Klaus Hartl (stilbuero.de)
 * Dual licensed under the MIT and GPL licenses:
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.gnu.org/licenses/gpl.html
 *
 */

/**
 * Create a cookie with the given name and value and other optional parameters.
 *
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Set the value of a cookie.
 * @example $.cookie('the_cookie', 'the_value', { expires: 7, path: '/', domain: 'jquery.com', secure: true });
 * @desc Create a cookie with all available options.
 * @example $.cookie('the_cookie', 'the_value');
 * @desc Create a session cookie.
 * @example $.cookie('the_cookie', null);
 * @desc Delete a cookie by passing null as value. Keep in mind that you have to use the same path and domain
 *       used when the cookie was set.
 *
 * @param String name The name of the cookie.
 * @param String value The value of the cookie.
 * @param Object options An object literal containing key/value pairs to provide optional cookie attributes.
 * @option Number|Date expires Either an integer specifying the expiration date from now on in days or a Date object.
 *                             If a negative value is specified (e.g. a date in the past), the cookie will be deleted.
 *                             If set to null or omitted, the cookie will be a session cookie and will not be retained
 *                             when the the browser exits.
 * @option String path The value of the path atribute of the cookie (default: path of page that created the cookie).
 * @option String domain The value of the domain attribute of the cookie (default: domain of page that created the cookie).
 * @option Boolean secure If true, the secure attribute of the cookie will be set and the cookie transmission will
 *                        require a secure protocol (like HTTPS).
 * @type undefined
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */

/**
 * Get the value of a cookie with the given name.
 *
 * @example $.cookie('the_cookie');
 * @desc Get the value of a cookie.
 *
 * @param String name The name of the cookie.
 * @return The value of the cookie.
 * @type String
 *
 * @name $.cookie
 * @cat Plugins/Cookie
 * @author Klaus Hartl/klaus.hartl@stilbuero.de
 */
jQuery.cookie = function(name, value, options) {
    if (typeof value != 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        // CAUTION: Needed to parenthesize options.path and options.domain
        // in the following expressions, otherwise they evaluate to undefined
        // in the packed version for some reason...
        var path = options.path ? '; path=' + (options.path) : '';
        var domain = options.domain ? '; domain=' + (options.domain) : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};
/* m-141~js/jquery.hotkeys-0.8.js */
/*
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/

(function(jQuery){
	
	jQuery.hotkeys = {
		version: "0.8",

		specialKeys: {
			8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
			20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
			37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 
			96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
			104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/", 
			112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8", 
			120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
		},
	
		shiftNums: {
			"`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&", 
			"8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<", 
			".": ">",  "/": "?",  "\\": "|"
		}
	};

	function keyHandler( handleObj ) {
		// Only care when a possible input has been specified
		if ( typeof handleObj.data !== "string" ) {
			return;
		}
		
		var origHandler = handleObj.handler,
			keys = handleObj.data.toLowerCase().split(" ");
	
		handleObj.handler = function( event ) {
			// Don't fire in text-accepting inputs that we didn't directly bind to
			if ( this !== event.target && (/textarea|select/i.test( event.target.nodeName ) ||
				 event.target.type === "text") ) {
				return;
			}
			
			// Keypress represents characters, not special keys
			var special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[ event.which ],
				character = String.fromCharCode( event.which ).toLowerCase(),
				key, modif = "", possible = {};

			// check combinations (alt|ctrl|shift+anything)
			if ( event.altKey && special !== "alt" ) {
				modif += "alt+";
			}

			if ( event.ctrlKey && special !== "ctrl" ) {
				modif += "ctrl+";
			}
			
			// TODO: Need to make sure this works consistently across platforms
			if ( event.metaKey && !event.ctrlKey && special !== "meta" ) {
				modif += "meta+";
			}

			if ( event.shiftKey && special !== "shift" ) {
				modif += "shift+";
			}

			if ( special ) {
				possible[ modif + special ] = true;

			} else {
				possible[ modif + character ] = true;
				possible[ modif + jQuery.hotkeys.shiftNums[ character ] ] = true;

				// "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
				if ( modif === "shift+" ) {
					possible[ jQuery.hotkeys.shiftNums[ character ] ] = true;
				}
			}

			for ( var i = 0, l = keys.length; i < l; i++ ) {
				if ( possible[ keys[i] ] ) {
					return origHandler.apply( this, arguments );
				}
			}
		};
	}

	jQuery.each([ "keydown", "keyup", "keypress" ], function() {
		jQuery.event.special[ this ] = { add: keyHandler };
	});

})( jQuery );

