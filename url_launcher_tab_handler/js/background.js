/*!
 *  URL Launcher :: Background  *
 * 
 * 	A javascript file that sets up a connection between the URL launcher 
 * 	and Spacebrew, and then to create also creates instance of the 
 * 	UrlLauncherAndTabHandler class to manage tab state.
 * 	
 *
 * @filename    background.js
 * @author      Julio Terra
 * @modified    3/15/2013
 * @version     3.0.1
 * 
 */

var debug = debug || true;

var content = {};
	content.keys = ["sever", "port", "keep_tabs", "loose_focus", "fullscreen", 
					"url_launcher", "tab_manager", "timeout",  
					"name", "description"];
	content.new = {};
	content.active = {};
	content.str = "";
	content.url_active = "";
	content.idle_timeout = 0;
	content.tab_handler;

var state = {};
	state.active = {
		"start": false
		, "update": false
		, "stop": false	
		, "debug" : debug || false
	};

var	sb = {};
	sb.connected = false;
	// sb.default_name = "sbUrlLauncher";
    sb.connection = {};     // spacebrew connection
	sb.config = {
		"active": {
			"name": "chrome remote control"
			, "server": "sandbox.spacebrew.cc"
			, "port": 9000		
			, "description": "app that controls URL of tab via spacebrew"	
			, "keep_tabs": true
			, "loose_focus": true
			, "fullscreen": undefined
			, "url_launcher": undefined
			, "tab_manager": true
			, "timeout": 0
			, "tab": {}
	}
		, default: {
			"name": "chrome remote control"
			, "server": "sandbox.spacebrew.cc"
			, "port": 9000		
			, "description": "app that controls URL of tab via spacebrew"	
		}
	};


$(document).ready(function() {
	setup();
});


/**
 * setup Register listener for messages from content script
 * @return {none} 
 */
setup = function() {
 	if (state.active.debug) console.log("[setup] added content script request listener listener ");
	chrome.extension.onMessage.addListener(readRequest);
}

/**
 * readRequest Callback method that handles all messages from content scripts that are inserted into webpages.
 * 		if the message contains a "href" attribute then the message is as a new page query string registration. 
 * 		In response and as appropriate, this method starts up the spacebrew connection, and creates the 
 * 		UrlLauncherAndTabHandler object that manages the tab focus and fullscreen modes, and sends a response back to 
 * 		content script that confirms if the connection has been established. If the message contains an "idle" 
 * 		attribute then it handles this message as an update regarding the active/idle state of a webpage.
 * @param  {object} _request     Data that is passed from the content script to the background app.
 * @param  {object} sender       Information about the source of the message that was just received.
 * @param  {function} sendResponse Callback method that should be called when we have finished processing the
 *                                  request.
 * @return {none}
 */
readRequest = function(_request, sender, sendResponse) {
 	if (state.active.debug) console.log("[readRequest] new request from content script in tab " + sender.tab.id + " request: ");
 	if (state.active.debug) console.log(_request);
	var response = {live_status: true};
	content.new = _request;

 	if (content.new.href) {
 		state.active = content.new.state; 
 		console.log("state activated to ", state.active);
 		// update the debug status
		// if(content.new.tab_manager != undefined || content.new.url_launcher != undefined) {

		if (content.new.debug != undefined) state.active.debug = content.new.debug;
		debug = state.active.debug;

		if (state.active.debug) console.log("debugging turned ON");
		else console.log("debugging turned OFF");
		console.log(content);

		// }

		// create tab_handler object
		content.tab_handler = content.tab_handler || new CX.UrlLauncherAndTabHandler();

		if (state.active.start || state.active.update) {
			// update status of URL Launcher

			if (!sb.connected) {
				sbConnect();
			}

			for (i in content.keys) {
				console.log("[readRequest] pre-update sb.config", sb.config)
				if (content.new[name] != undefined) {					
					sb.config[content.keys[i]] == content.new[name]; 
				}
				console.log("[readRequest] update sb.config", sb.config)
			}

			content.tab_handler.activateTabManager(sb.config.tab_manager);

			if ((sb.config.timeout && sb.config.timeout > 0) || (content.new.timeout && content.new.timeout >= 0) ){
					if (content.new.timeout != sb.config.timeout) sb.config.timeout = content.new.timeout;
				 	response.idle = sb.config.timeout;
				 	if (state.active.debug) console.log("[readRequest] adding idle timer set-up request to response ", response);
			}

			if ((sb.config.active.name != content.new.name) 
				|| (sb.config.active.server != content.new.server)
				|| (sb.config.active.port != content.new.port)
				|| (sb.config.active.description != content.new.description)) {
			 	if (state.active.debug) console.log("[readRequest] names will be updated to  ", content.new.name);
				sb.connection.close();			
				sbConnect();
			}

			console.log("sender, ", sender);

			sb.config.tab = sender.tab;
			console.log("sb.config.tab, ", sender);
			content.tab_handler.updateOptions(sb.config);
			content.tab_handler.activateURLLauncher(true);
		}
		else if (state.active.stop) {
			sb.connection.close();
			sb.connected = false;
			content.tab_handler.activateURLLauncher(false);
		}

	} 

	if (content.new.idle) {
	 	if (state.active.debug) console.log("[readRequest] sending idle message via sb ", content.new);
		sb.connection.send("im_bored", "boolean", true);
		content.tab_handler.loadActiveUrl();
	}

	sendResponse(response);
}

updateValue = function(name) {
	if (content.new[name] != undefined) sb.config.active[name] = content.new[name];
}

/**
 * sbConnect method that registers the websockets callback methods once the websockets
 * 		connection request has been made. It first sets up the spacebrew configuration message,
 * 		which is then used, along with the name variable to register this app with the
 * 		Spacebrew server. Then it registers the onopen, onmessage and onclose methods.
 * @param  {string} name Name of the app for the spacebrew server
 * @return {none}      
 */
sbConnect = function () {

	// check if config needs to be updated with date from query string
	if (content.new.name) sb.config.active.name = content.new.name;
	if (content.new.server) sb.config.active.server = content.new.server;
	if (content.new.port) sb.config.active.port = content.new.port;

	// prepare name, server and description values to configure Spacebrew connection
	var	name = sb.config.active.name = sb.config.active.name ? sb.config.active.name : sb.config.default.name;
	var server = sb.config.active.server = sb.config.active.server ? sb.config.active.server : sb.config.default.server;
	var port = sb.config.active.port = sb.config.active.port ? sb.config.active.port : sb.config.default.port;
	var description = sb.config.active.description = sb.config.active.description ? sb.config.active.description : sb.config.default.description;

	// create Spacebrew client object
	sb.connection = new Spacebrew.Client(server, name, description, port);

	// configure subscriptions and publishing channels, and register callback methods
    sb.connection.addSubscribe( "url_please", "string" );
    sb.connection.addPublish( "im_bored", "boolean" );
	sb.connection.onStringMessage = onString.bind(this);
	sb.connection.onOpen = onOpen.bind(this);
	sb.connection.onClose = onClose.bind(this);

	// connect to Spacebrew
	sb.connection.connect();
}

/**
 * onOpen sets the sb.connected flag to true
 * @return {none} 
 */
onOpen = function() {
	if (state.active.debug) console.log("[sb.onopen] websockets connection opened, device name is: " + name);
	sb.connected = true;
}

/**
 * onClose Sets the sb.connected flat to false
 * @return {none} 
 */
onClose = function() {
    if (state.active.debug) console.log("[sb.onclose] websockets connection closed");
	sb.connected = false;
}

/**
 * onString method that is used to process string messages received through spacebrew. It first checks whether 
 * 		the message received is a valid URL, if not then it stops processing the message; otherwise, it 
 * 		attempts to load that URL into the url launcher.
 * @param  {string} source name of the inlet where the message was received
 * @param  {string} string payload of the message that was received
 * @return {return}        nothing
 */
onString = function (source, string) {
	if (state.active.debug) console.log("[onString] sb message received from: " + source + " data: " + string);
	var expression = /[-a-zA-Z0-9@:%_\+.~#?&\/\/=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)?/gi;
	if ( !string.match(expression)) {
		if (state.active.debug) console.log("[onString] not a URL: ", string.match(expression));
		return;
	}

	if ( !(string.indexOf("http:\/\/") == 0) && !(string.indexOf("https:\/\/") == 0) ) {
		string = "http:\/\/" + string;
	}

	if (state.active.debug) {
		var query_start = "?";
		if (string.indexOf("?") >= 0) query_start = "&";
		
		console.log("[prepQueryString]  sb.config", sb.config.active);
		
		for (i in content.keys) {
			if (sb.config.active[content.keys[i]] != undefined) {
				string += query_start + content.keys[i] + "=" + sb.config.active[content.keys[i]];			
				query_start = "&";
			}
		}

		if (state.active.debug) console.log("[prepQueryString] query string set " + string);
	}

	content.url_active = string;
	content.tab_handler.setActiveUrl(content.url_active);			
}

/**
 * prepQueryString method that builds the query string options based on the settings provided when the application
 * 		was launched, or re-activated.
 * @param {array} options Array of the different options that need to be propagate each time the page reloads.
 */
prepQueryString = function () {
	if (state.active.debug) console.log("[prepQueryString]  sb.config", sb.config.active);
	content.str = "";
	for (i in content.keys) {
		if (sb.config.active[content.keys[i]] != undefined) {
			content.str += "&" + content.keys[i] + "=" + sb.config.active[content.keys[i]];			
		}
	}
	if (state.active.debug) console.log("[prepQueryString] query string set " + content.str);
	return content.str;

}




