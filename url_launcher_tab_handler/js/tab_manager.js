/*!
 *  URL Launcher :: URL Launcher & TAB Managers Class *
 * 
 * 	brief An javascript class for chrome extension that does two things: 
 * 	(a) manages tabs to ensure that the appropriate tab is always the active tab, 
 * 		and that it remains in fullscreen.
 * 	(b) has the ability to set the active tab to a specific URL.
 * 	
 * @namespace 	CX
 * @filename    tab_manager.js
 * @author      Julio Terra
 * @modified    10/04/2014
 * @version     3.0.4
 * 
 */

var CX = {};

/**
 * UrlLauncherAndTabHandler Constructor that initializes key attributes of a new instance of the
 * 		UrlLauncherAndTabHandler class.  
 * @return {object} Newly created instance of UrlLauncherAndTabHandler
 */
CX.UrlLauncherAndTabHandler = function () {
	if (debug) console.log("[CX.UrlLauncherAndTabHandler] calling constructor ");
	this.tab_id = -1;
	this.window_id = -1;
	this.url = undefined;
	this.url_launcher = false;
	this.tab_manager = false;
	this.listener_focus = false;
	this.listener_close = false;
	this.listener_update = false;
}

CX.UrlLauncherAndTabHandler.prototype = {

	constructor: CX.UrlLauncherAndTabHandler,

	/***************************
	 ** INTERFACE METHODS
	 ***************************/

	/**
	 * updateOptions is called to load all of the listeners that are responsible for ensuring
	 * 		that the appropriate Chrome window and/or tab remains in focus. It is important to note that
	 *   	these listeners only start to function once the document that is loading the controller  
	 *    	has fully loaded.
	 * @param  {object} params New options that will determine which tab and window listeners are  
	 *                         added and/or removed from Chrome
	 * @return {none}        
	 */
	updateOptions: function (params) {
		if (debug) console.log("[CX.updateOptions] updated options: ");
	 	if (debug) console.log(params);

		this.go_fullscreen = (params.go_fullscreen == undefined) ? false : params.go_fullscreen;
		this.keep_tabs = (params.keep_tabs == undefined) ? true : params.keep_tabs;
		// this.active = (params.active == undefined) ? false : params.active;

		if (params.tab.id) {
			this.setActiveTab(params.tab);			
		}

		this.manageListeners();
	},

	activateURLLauncher: function (status) {
		console.log("[CX.activateURLLauncher] set to: ", status);
		this.url_launcher = status;
		if (!this.tab_manager && !this.url_launcher) this.removeAllListeners();
	},

	activateTabManager: function (status) {
		console.log("[CX.activateTabManager] set to: ", status);
		this.tab_manager = status;
		if (!this.tab_manager && !this.url_launcher) this.removeAllListeners();
	},

	/***************************
	 ** LISTENER SET-UP AND TAKE-DOWN METHODS
	 ***************************/

	/**
	 * manageListeners method used to add and remove tab and window listeners based on a set
	 * 		of options set via the update options method. It controls whether the app goes 
	 * 		fullscreen on startup, whether it allows non-active tabs to stay open, and 
	 * 		also if the tab running the chrome extension can loose focus
	 * @return {none}
	 */
	manageListeners: function() {
		var self = this;

		if (!this.listener_update && this.go_fullscreen) {
			if (debug) console.log("[CX.manageListeners] setting up update listeners ");
			chrome.tabs.onUpdated.addListener(self.onTabUpdate);
			this.listener_update = true;
		}

		if (!this.listener_close && !this.keep_tabs) {
			if (debug) console.log("[CX.manageListeners] setting up tab close listeners ");
			chrome.tabs.onRemoved.addListener(self.onTabClose);
			chrome.windows.onRemoved.addListener(self.onWindowClose);
			chrome.windows.onFocusChanged.addListener(self.onWindowFocusLost);
			chrome.tabs.onActivated.addListener(self.onTabActiveChange);	
			this.listener_close = true;
		} 

		if (this.listener_update && !this.go_fullscreen) {
			if (debug) console.log("[CX.manageListeners] removing update listeners ");
			chrome.tabs.onUpdated.removeListener(self.onTabUpdate);
			this.listener_focus = false;
		}

		if (this.listener_close && this.keep_tabs) {
			if (debug) console.log("[CX.manageListeners] removing tab close listeners ");
			chrome.windows.onFocusChanged.removeListener(self.onWindowFocusLost);
			chrome.tabs.onActivated.removeListener(self.onTabActiveChange);	
			chrome.tabs.onRemoved.removeListener(self.onTabClose);
			chrome.windows.onRemoved.removeListener(self.onWindowClose);
			this.listener_close = false;
		} 
	},


	removeAllListeners: function() {
		if (debug) console.log("[CX.removeAllListeners] removing all listeners ");
		var self = this;
		if (chrome.tabs.onUpdated.hasListener(self.onTabUpdate)) chrome.tabs.onUpdated.removeListener(self.onTabUpdate);
		if (chrome.windows.onFocusChanged.hasListener(self.onWindowFocusLost)) chrome.windows.onFocusChanged.removeListener(self.onWindowFocusLost);
		if (chrome.tabs.onActivated.hasListener(self.onTabActiveChange)) chrome.tabs.onActivated.removeListener(self.onTabActiveChange);	
		if (chrome.tabs.onRemoved.hasListener(self.onTabClose)) chrome.tabs.onRemoved.removeListener(self.onTabClose);
		if (chrome.windows.onRemoved.hasListener(self.onWindowClose)) chrome.windows.onRemoved.removeListener(self.onWindowClose);
	},

	/***************************
	 ** CALLBACK METHODS
	 ***************************/

	/**
	 * onTabUpdate callback method that handles updates tabs and makes sure that they stay in full
	 * 		screen as appropriate
	 * @param  {int} tabId      	Id of the current tab
	 * @param  {object} changeInfo 	Overview of the changes to the tab's status that triggered callback
	 * @param  {object} tab        	Details about the tab that was just updated
	 * @return {none}            
	 */
	onTabUpdate: function(tabId, changeInfo, tab) {
		if (debug) console.log("[CX.onTabUpdate] update updated, tab info: ");
	 	if (debug) console.log(tab);
		if (this.go_fullscreen) chrome.windows.get(this.window_id, this.ensureFullscreen.bind(this));
	},

	/**
	 * onWindowClose callback method that handles window is close events. It checks the id of  
	 * 		the closed window to determine whether it needs to reopen a new window to get the 
	 *   	user back to the appropriate page.
	 * @param  {Object} windowId	objects that contains information the window that was closed 
	 * @return {none}       
	 */
	onWindowClose: function (windowId) {
	 	if (debug) console.log("[CX.onWindowClose] tab closed at: " + windowId);
	 	if (debug) console.log("[CX.onWindowClose] active tab is at: " + this.window_id);
	 	var self = this;
	 	var activeUrl = this.url;
	 	if (debug) console.log("[CX.onWindowClose] current url: " + self.url);
		if (windowId == this.window_id) {
			chrome.windows.create({focused:true, url:activeUrl}, this.setActiveTab.bind(this));
		}
	},

	/**
	 * onTabClose Callback method that handles tab close events. It checks the id of  
	 * 		the closed tab to determine whether it needs to open a new tab to get the 
	 *   	user back to the appropriate page.
	 * @param  {integer} 	tabId      Number of the tab that was closed
	 * @param  {object} 	removeInfo Additional information about the tab closing event
	 * @return {none}
	 */
	onTabClose: function (tabId, removeInfo) {
	 	if (debug) console.log("[CX.onTabClose] tab closed at: " + tabId);
	 	if (debug) console.log("[CX.onTabClose] active tab is at: " + this.tab_id);
	 	var self = this;
	 	var activeUrl = this.url;
	 	if (debug) console.log("[CX.onTabClose] current url: " + activeUrl);
	 	if ((!removeInfo.isWindowClosing) && (this.tab_id >= 0)) {
			if (tabId == this.tab_id) {
				chrome.tabs.create({active:true, url:activeUrl}, this.setActiveTab.bind(this));
			}
	 	}
	},

	/**
	 * onWindowFocusLost Callback method that handles window focus lost events. This method then checks 
	 * 		to see what is the currently focused window. If it is not the appropriate window then it 
	 *   	brings back the right window into focus by changing its state to "normal" and then back 
	 *    	to "fullscreen".
	 * @param  {object} windowId objects that contains information about currently active window
	 * @return {none}          
	 */
	onWindowFocusLost: function (windowId){
	 	if (debug) console.log("[CX.onWindowFocusLost] window changed to " + windowId);			
	 	if (debug) console.log("[CX.onWindowFocusLost] keep tabs " + this.keep_tabs);			
		if (this.keep_tabs) return;
		var updateInfo = {focused: true, state: "normal"};
		if (windowId != this.window_id && this.window_id != null) {
			chrome.windows.update(this.window_id, updateInfo, this.returnToFocus.bind(this));
		}
	},		
	
	/**
	 * onTabActiveChange Callback method that handles tab focus change events. This method then
	 * 		brings the focus back to the active tab.
	 * @param  {object} activeInfo Objects that contains information about currently active tab
	 * @return {none}           
	 */
	onTabActiveChange: function (activeInfo) {
	 	if (debug) console.log("[CX.onTabActiveChange] tab changed to " + activeInfo.tabId);			
	 	if (debug) console.log("[CX.onTabActiveChange] keep tabs " + this.keep_tabs);			
		if (this.keep_tabs) return;
		if (activeInfo.tabId != this.tab_id) {
			chrome.tabs.update(this.tab_id, {active:true}, this.setActiveTab.bind(this));
		}
	},

	/***************************
	 ** ACTION METHODS
	 ***************************/

	/**
	 * setActiveTab method used to set the active tab for the url launcher
	 * @param {object} tab Object that features a id attribte that holds the tab id, and 
	 *                     a windowId attribute that holds the windows id
	 */
	setActiveTab: function (tab) {
		if (debug) console.log("[CX.setActiveTab] setting active, info received ");
		if (debug) console.log(tab);
		this.tab_id = tab.id;
		this.window_id = tab.windowId;
		this.ensureInactiveTabsClosed();
		chrome.windows.get(this.window_id, this.ensureFullscreen.bind(this));
	},

	/**
	 * Returns the number of the currently active tab
	 * @return {integer} [the id of the tab that is currently active]
	 */
	getActiveTab: function() {
		return this.tab_id;
	},

	/**
	* method that updates the active URL and then loads it in the browser.
	* @param {string} url Holds the URL that is being set as the active URL
	*/
	setActiveUrl: function (url) {
		this.url = url;
		this.loadActiveUrl();
		if (debug) console.log("[CX.setActiveUrl] setting tab " + this.tab_id + " to active url to " + this.url);
	},

	/**
	* Method that loads the current active URL.
	*/
	loadActiveUrl: function () {
		if (!this.url) return;
		if (debug) console.log("[CX.loadActiveUrl] setting tab " + this.tab_id + " to active url to " + this.url);
		var self = this;
		chrome.tabs.query({}, function(tabArray) { 
			var active_tab = 0;
			for (var i = 0; i < tabArray.length; i++ ) {
				// target tab found, stop loop
				if (tabArray[i].id == self.tab_id) break;
				// currently active tab registered
				else if (tabArray[i].active == true) active_tab = i;
				// setting active tab to new destination since target tab not found
				if (i == (tabArray.length - 1)) self.setActiveTab(tabArray[active_tab]);
			}
			chrome.tabs.update(self.tab_id, {url: self.url, active: true});
		});
	},
	/**
	 * returnToFocus this method returns a window to focus and ensures that the screen is set to fullscreen
	 * @param  {object} window Object that holds information about a window, most impotantly the window's id
	 * @return {none}      
	 */
	returnToFocus: function (window){
		if (window.id == this.window_id) {
		 	if (debug) console.log("[CX.returnToFocus] returning to focus ");
		 	chrome.windows.update(this.window_id, {focused: true, state: "normal"}, this.ensureFullscreen.bind(this));
	 	} 
	},

	/**
	 * removeTabs Closes down all of the tabs that are in the tabs array that is passed to it as
	 * 		an argument.
	 * @param  {array} tabArray Array that holds tab object, each one with an id attribute that holds
	 *                          the id of an open tab.
	 * @return {none}
	 */
	removeTabs: function(tabArray){
		for(tabIndex in tabArray){
			if (debug) console.log("[CX.removeTabs] removing tab with id " + tabArray[tabIndex].id);
			chrome.tabs.remove(tabArray[tabIndex].id);
		}
	},

	/**
	 * ensureFullscreen makes sure that a window is openned in fullscreen mode. 
	 * 		Function will recursively call itself until it confirms that the window
	 *   	has openned in fullscreen.
	 * @param  {object} window objects that contains information about the Chrome window that is being
	 *                          set to fullscreen.
	 * @return {none}
	 */
	ensureFullscreen: function (window){
		if (this.window_id < 0 || !this.go_fullscreen) return;
		if ((window.id == this.window_id) && (window.state != "fullscreen")) {
		 	if (debug) console.log("[CX.ensureFullscreen] going to fullscrenn ");
		 	chrome.windows.update(this.window_id, {focused: true, state: "fullscreen"}, this.ensureFullscreen.bind(this));
	 	} 
	 	else if (debug) console.log("[CX.ensureFullscreen] already in fullscrenn "); 		
	},

	/**
	 * ensureInactiveTabsClosed closes all tabs that are not the active tab. This function only works
	 * 		when the this.keep_tabs variable is set to false.
	 * @return {none}
	 */
	ensureInactiveTabsClosed: function () {
			if (debug) console.log("[CX.ensureInactiveTabsClosed]" );
		if (!this.keep_tabs) {
			if (debug) console.log("[CX.ensureInactiveTabsClosed] closing background tabs");
			chrome.tabs.query({active:false, currentWindow:true}, this.removeTabs.bind(this));
			chrome.tabs.query({currentWindow:false}, this.removeTabs.bind(this));
		}
	},

}


