Spacebrew URL Launcher
----------------------

This chrome extension is the spacebrew Url Launcher app. This app accepts a string message from spacebrew, checks if that message is a URL, and if so, loads the URL in Chrome. This app can also function as a tab manager that always keeps a chrome tab in focus, and deletes all inactive tabs. Please read the instructions below to learn how to use it.

**App:** 	spacrebrew_url_launcher  
**Component:** 	url_launcher chrome extension  
**Team:** 	Julio Terra  
**Date:** 	March 15, 2013    
  
**System Requirements:** 
* Tested on Chrome version 22 
* Debugged on Mac OSX only (may work on other platforms but has not been tested)  

  
How to Use 
----------------------------  

Setting Up the URL Launcher:
============================  

1. Install the Chrome Extension on the Chrome browser that will be running this app by following these steps:
	1. launch the instance of Chrome where this app will run
	2. navigate to chrome://extensions
	3. check "Developer" (top right)
	4. click on the load unpackaged extension button and navigate the root directory of the url launcher
	5. click "Accept"
  
2. Navigate to any URL in Chrome and include all of the appropriate query string options in your URL. Please refer to the section query string option descriptions below.
  
3. Go to the admin page for the Spacebrew server that your app is linked to and confirm that the app is showing up. Then link your app to an app that send urls.
  
Query String Options:
---------------------  
  
The following option flags (true/false) can be set via the query string to change behavior of this chrome extension:

* `active`: when set to "true" it identifies the current tab as the active tab, and proceeds to read all query string options. the url launcher ads the query string "active=true" to all urls that it launches. 
* `url_launcher`: if url_launcher is set to "true" then chrome extension will function as a url launcher and will connect to interactive spaces. Defaults to "false".
* `fullscreen`: when set to "true" the url_launcher automatically goes to fullscreen and attempt to stay in fullscreen at all times. Defaults to "false".
* `keep_tabs`: when "keep_tabs" is set to "false" the url_launcher deletes all tabs other than the active tab. It also attempts to make sure that the Chrome app is always in focus. Defaults to "true".
* `timeout`: time in milliseconds used to set time limit for an idle timer. When a web page is idle the url_launcher reloads the active page and sends a true boolean message to Spacebrew via the "im_bored" outlet. Defaults to 0.
* `debug`: when set to "true" turns on js console messages. Defauls to "false".

The following options configure the connection to Spacebrew. You don't need to specify these items if you want to connect to the server using the default name, and if you are connecting to the cloud server at 'sandbox.spacebrew.cc':
* `name`: holds the name for this application that will show up on the spacebrew admin interface. Defaults to "sbUrlLauncher".
* `server`: holds the hostname of the spacebrew server to which this application should connect. Defaults to "localhost".
* `port`: holds the port number that is being used by the spacebrew server. This is an optional param. Defaults to 9000. 

Query String Samples:
---------------------  
  
Here is are a few query string samples, along with what they mean:
  
1. Query string that starts up the URL launcher by settings url_launcher=true, sets the current tab to active by setting active=true. This only works if you are using a spacebrew server that is running on your localhost, as this is the default behavior when a server is not specified in the query string. 
```
[ANY URL]?url_launcher=true&active=true&
```
	
2. Query string that starts up the URL launcher by settings url_launcher=true, sets the current tab to active by setting active=true, sets the hostname of the Spacebrew servers by setting server=serverName, tells the app NOT to go to fullscreen with go_fullscreen=false, and sets keep_tabs=true so that the app will keep inactive tabs open and let users navigate away from the active tab.
```
[ANY URL]?url_launcher=true&active=true&server=serverName&go_fullscreen=false&keep_tabs=true&
```

**Important Note:** It is good to add the trailing "&" to the query string because if you are loading a site at a directory level (there is no file extension at the end of the url) a forward slash is sometimes appended to the last query element.
