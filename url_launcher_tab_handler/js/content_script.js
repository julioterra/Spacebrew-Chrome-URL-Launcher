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
 * @modified    3/15/2013
 * @version     3.0.1
 * 
 */

var options = {};
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


	options.url_launcher = undefined;
	if (getQueryString("url_launcher") == "true") options.url_launcher = true;  
	else if (getQueryString("url_launcher") == "false") options.url_launcher = false;  

	options.tab_manager = undefined;
	if (getQueryString("tab_manager") == "true") options.tab_manager = true;  
	else if (getQueryString("tab_manager") == "false") options.tab_manager = false;  

	options.active = getQueryString("active") == "true" ? true : false; 
	options.debug = debug = getQueryString("debug")  == "true" ? true : false; 
	options.go_fullscreen = getQueryString("fullscreen") == "true" ? true : false;
	options.keep_tabs = getQueryString("keep_tabs") != "false" ? true : false;

	options.name = getQueryString("name") || false;
	options.server = getQueryString("server") || false;
	options.port = getQueryString("port") || 9000;

	options.timeout = getQueryString("timeout") || 0;

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
		if (debug) console.log("[urlLauncher:startIdleTimer] argument is not a number " + timeout);		
		return;
	}

	idle_timeout = timeout
	if (debug) console.log("[urlLauncher:startIdleTimer] loading idle timer");
	$.idleTimer(parseInt(timeout));
	$(document).bind("idle.idleTimer", pageIdle);
};

/**
 * callback method that is called when the idle timer times out. It sends a message to the
 *  	background app to let us know that the page is currently idle.
 * @return {none} 
 */
function pageIdle(){
	if (debug) console.log("[urlLauncher:pageIdle] page has been idle for " + idle_timeout);
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
	if( results == null ) return "";
	else return results[1];
}

