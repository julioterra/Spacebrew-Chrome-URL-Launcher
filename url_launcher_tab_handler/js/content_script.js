/*!
 *  URL Launcher :: Content Script  *
 * 
 * 	A javascript file that is injected into all web pages by the URL Launcher.
 * 	It reads the query string options and passes this information to the background
 * 	process, which responds to confirm that the connection was established. This
 * 	code also sets up an idle timer, when the response from the background process
 * 	includes an "idle" attribute with an integer.
 * 	
 * @filename    content_script.js
 * @author      Julio Terra
 * @modified    10/04/2014
 * @version     3.0.4
 * 
 */

var options = {
	"state": {
		"start": false
		, "update": false
		, "stop": false
	}
	, "debug": undefined
	, "keep_tabs": undefined
	, "loose_focus": undefined
	, "fullscreen": undefined
	, "url_launcher": undefined
	, "tab_manager": undefined
	, "timeout": undefined
	, "name": undefined
	, "sbName": undefined
	, "sever": undefined
	, "port": undefined
	, "description": undefined
};
var connection = false;
var idle_timeout = 0;
var debug = true;

$(document).ready(function() {
	console.log("[urlLauncher:page loaded] ");
	readQueryStringOptions();
});

/**
 * readQueryStringOptions method that parses the query string and saves relevant data into the options variable.
 *  	It then connects to the chrome extension background app and sends it the query string data. It sets a timeout
 *   	that attempts to reconnect to the background app if the connection was not established successfuly.
 * @return {none} 
 */
function readQueryStringOptions() {
	options.href = window.location.href;

	options.state.start = getQueryKey("start"); 
	options.state.update = getQueryKey("update"); 
	options.state.stop = getQueryKey("stop"); 

	if (getQueryString("debug") == "true") options.debug = true;  
	else if (getQueryKey("debug")) options.debug = true;  
	else if (getQueryString("debug") == "false") options.debug = false;  

	options.active = getQueryKey("active"); 

	if (options.state.start || options.state.update) {

		if (getQueryString("tab_manager") == "true") options.tab_manager = true;  
		else if (getQueryKey("tab_manager")) options.tab_manager = true;  
		else if (getQueryString("tab_manager") == "false") options.tab_manager = false;  

		if (getQueryString("url_launcher") == "true") options.url_launcher = true;  
		else if (getQueryKey("url_launcher")) options.url_launcher = true;  
		else if (getQueryString("url_launcher") == "false") options.url_launcher = false;  

		if (getQueryString("fullscreen") == "true") options.fullscreen = true;  
		else if (getQueryKey("fullscreen")) options.fullscreen = true;  
		else if (getQueryString("fullscreen") == "false") options.fullscreen = false;  

		if (getQueryString("keep_tabs") == "true") options.keep_tabs = true;  
		else if (getQueryKey("keep_tabs")) options.keep_tabs = true;  
		else if (getQueryString("keep_tabs") == "false") options.keep_tabs = false;  

		options.name = getQueryString("name");
		options.sbName = getQueryString("sbName");
		options.server = getQueryString("server");
		options.port = getQueryString("port");

		// if (options.name.indexOf("%") > 0) options.name = unescape(options.name);
		// if (options.description.indexOf("%") > 0) options.description = unescape(options.description);

		if (getQueryString("timeout") && getQueryString("timeout") !== "") {
			options.timeout == undefined;	
			options.timeout = getQueryString("timeout");
		}	
	}

	if (options.debug) console.log("[urlLauncher:readQueryStringOptions] sending options: ", options);
	if (options.debug) addToStatus("sending request to connect to extension");
	chrome.extension.sendMessage(options, handleResponse);	

	// set timeout for when to check whether connection was established.
	setTimeout( function() {
		if (!connection) readQueryStringOptions();
	}, 4000);
}

/**
 * handleResponse callback method that is used to handle response from the background app to the connection request
 *  	made in readQueryStringOptions(). It checks if the connection was succesfully established by checking 
 *  	whether the "response" argument is defined. If it is undefined the the connection flag is set to false, 
 *  	otherwise the conection flag is set to true. If the response includes the attribute "idle" then it will
 *  	attempt to start-up and idle timer.
 * @param  {object} response Object that holds response from the background app to messages from this injected
 *                           script. If the background app was running properly then it will return an empty object
 *                           otherwise it returns an undefined object.
 * @return {none}          
 */
function handleResponse(response) {
 	if (options.debug) console.log("[urlLauncher:handleResponse] received response from from backend ");
 	if (options.debug) console.log(response);

 	if (response == undefined) {
 		connection = false;
		if (options.debug) console.log("[urlLauncher:handleResponse] connection attempt failed, try again in 4 second");
		if (options.debug) addToStatus("failure - connection to extension did not work ");
 	}
 	else {
 		connection = true;
		if (options.debug) console.log("[urlLauncher:handleResponse] connection made");
		if (options.debug) addToStatus("success - connection to extension established");

 		// set idle timer if the response included the attribute "idle"
		if (response.idle) {
			if (options.debug) console.log("[urlLauncher:handleResponse] setting idle timer: " + response.idle); 		
			startIdleTimer(response.idle);
		}
 	}
}

/**
 * startIdleTimer inserts an idle timer into the current tab
 * @param  {integer} timeout Timeout time for the idel timer in milliseconds.
 * @return {none}         
 */
function startIdleTimer(timeout){
	if (isNaN(timeout) || timeout <= 0) {
		if (options.debug) console.log("[urlLauncher:startIdleTimer] argument is not a number " + timeout);		
		return;
	}

	idle_timeout = timeout
	if (options.debug) console.log("[urlLauncher:startIdleTimer] loading idle timer");
	$.idleTimer(parseInt(timeout));
	$(document).bind("idle.idleTimer", pageIdle);
};

/**
 * callback method that is called when the idle timer times out. It sends a message to the
 *  	background app to let us know that the page is currently idle.
 * @return {none} 
 */
function pageIdle(){
	if (options.debug) console.log("[urlLauncher:pageIdle] page has been idle for " + idle_timeout);
	chrome.extension.sendMessage({idle: true, timeout: idle_timeout}, function(response) {});		
};

/**
 * method that handles the status messages that appear on the browser window while this content script
 * 		is attempting to connect to the background app. Every time it logs a new message it adds a timestamp. It 
 *   	then displays the message in the #extensionStatus div
 * 
 * @param {string} string Holds the latest message update to add to the status messages that appear on screen
 */
var addToStatus = function(string) {
	if (!document.querySelector("#extensionStatus")) return;
	var today=new Date();
	var now = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
	var curStatus = document.querySelector("#extensionStatus").innerText;
	document.querySelector("#extensionStatus").innerText = curStatus + now + " - " + string  + " \\\r ";	
};

/**
 * method that parses arguments from the query string
 * @param  {String} name 	The key of the query string key/value pair that will be parsed 
 * @return {String}      	The value associated to the key/value pair being parsed
 */
var getQueryString = function( name ) {
	if (!window.location) return;
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( window.location.href );
	if( results == null ) return false;
	else return results[1];
}

var getQueryKey = function( name ) {
	if (!window.location) return;

	var value = getQueryString(name);

	// if value is defined as false
	if (value == "false") {
		console.log("[getQueryKey] FALSE", name);
		return false;
	} else if (value == "true") {
		console.log("[getQueryKey] TRUE", name);
		return true;
	}

	// if only key exists then return true
	if (value == "") {
		name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		var regexS = "[\\?&]("+name+")[&=]"; 
		var regex = new RegExp( regexS );
		var res_1 = regex.exec( window.location.href );
		console.log(res_1);

		regexS = "[\\?&]("+name+")$"; 
		regex = new RegExp( regexS );
		var res_2 = regex.exec( window.location.href );

		console.log("[getQueryKey] Checking Results", name);
		console.log("res_1", res_1);
		console.log("res_2", res_2);

		if( res_1 || res_2 ) return true;
	}

	return false;
}
