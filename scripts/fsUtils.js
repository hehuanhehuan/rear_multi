const cActionEdit 			= 0;
const cActionSave 			= 1;
const cActionClipboard 		= 2;
const cActionEMail 			= 3;
const cActionPaint 			= 4;
const cActionUpload 		= 5;
const cActionPrint 	 		= 7;
const cBASE64Content 		= 8;
const cActionSavePDF		= 10;
const cActionSendOneNote	= 11;
const cActionUpgrade		= 100;

const cModeVisible 	= 0;
const cModeEntire  	= 1;
const cModeSelected = 2;
const cModeBrowser 	= 3;

const cLastActionPref 				= "lastAction";
const cLastModePref 				= "lastMode";
const cShortcutPref					= "hotkey";
const cShortcutPrefVisible			= "hotkeyVisible";
const cShortcutPrefSelection		= "hotkeySelection";
const cShortcutPrefEntire			= "hotkeyEntire";
const cShortcutPrefBrowser			= "hotkeyBrowser";
const cDebugPref					= "fsDebug"

const cShortcutPrefVisibleAction	= "hotkeyVisibleAction";
const cShortcutPrefSelectionAction	= "hotkeySelectionAction";
const cShortcutPrefEntireAction		= "hotkeyEntireAction";
const cShortcutPrefBrowserAction	= "hotkeyBrowserAction";

const cPluginProModePref			= "pluginProMode";
const cRegisteredPref				= "registeredMode";
const cFirstTimeRun 				= "firstTimeRunFlag";
const cCurrentVersion 				= "curVersion";
const cTemplatePref					= "filenameTemplate";
const cTemplateNumberPref			= "filenameNumber";
const cTemplateNumberPadCheckPref	= "filenameNumberPadCheck";
const cTemplateNumberPadValuePref	= "filenameNumberPadValue";
const cTemplateFilenameMaxLen		= "filenameMaxLen";
const cDefaultImageFormatPref		= "png";
const cQueuedBadgeURLPref			= "queuedBadgeURL";

const cDefaultShortcut 			= getOSFriendlyShortcut("Ctrl+Alt+Shift+Z");
const cDefaultShortcutVisible 	= getOSFriendlyShortcut("Ctrl+Alt+Shift+X");
const cDefaultShortcutSelection = getOSFriendlyShortcut("Ctrl+Alt+Shift+C");
const cDefaultShortcutEntire 	= getOSFriendlyShortcut("Ctrl+Alt+Shift+V");
const cDefaultShortcutBrowser 	= getOSFriendlyShortcut("Ctrl+Alt+Shift+B");

const cDefaultShortcutVisibleAction		= 0;
const cDefaultShortcutSelectionAction	= 0;
const cDefaultShortcutEntireAction		= 0;
const cDefaultShortcutBrowserAction		= 0;

const cDefaultTemplate			 = "FireShot Capture - %t - %u";


var isDebug = localStorage[cDebugPref] !== undefined;
var extensionId = chrome.i18n.getMessage('@@extension_id');
//isDebug = extensionId == "ljhbgpplnapkahgkchjfeednacjockbi";
logToConsole("Extension ID: " + extensionId);

var fPluginInited = false;


function isNativeSupported()
{ return fsNativePlugin.ready; }

function getPlugin()
{
	var plugin = isNativeSupported() ? fsNativePlugin : getJSPlugin();
	return plugin;
}

function pluginCommand(cmd, param1)
{
	try
	{
		var obj = param1 ? param1 : {},
			plugin = getPlugin();
		obj.JSONCommand = cmd;
		
		logToConsole("plugin command: " + cmd + " : " + JSON.stringify(obj));
		
		//return getPlugin().launchFunction(cmd, obj);
		return isNativeSupported() ? plugin.launchJSON(obj) : plugin.launchFunction(cmd, obj);
	}
	catch (e) 
	{
		logError(e.message);
		return false;
	}
}

function openURL(url) 
{
	chrome.tabs.create({
		url: url
	});
}

function getOption(optionName, defaultValue)
{
	var val = localStorage[optionName];
	if (val == undefined) return defaultValue;
	else return val;
}

function logToConsole(data)
{
	if (isDebug)
		console.log(data);
}

function logError(data)
{
	console.error("FireShot: " + data);
}

function getSBHeight(window)
{
	if (window.scrollbars.visible)
	{
		var spacer = window.document.createElement("div");
		spacer.setAttribute("style", "position: fixed; margin: 0px; padding: 0px; border: none; visibility: hidden;  top: 0px; left: 0px; width: 1px; height: 100%; z-index: -1;");
		window.document.body.appendChild(spacer);
		var sbHeight = window.innerHeight - spacer.offsetHeight;
		window.document.body.removeChild(spacer);
		return sbHeight > 0 && sbHeight < 40 ? sbHeight : 0;
	}
	else return 0;
}

function getExtension()
{
	return chrome.extension.getBackgroundPage();
}

function getShortcut(event) 
{
	var modifiers = [], key;		
	if (event.ctrlKey) modifiers.push("control");
	if (event.altKey) modifiers.push("alt");
	if (event.metaKey) modifiers.push("meta");
	if (event.shiftKey) modifiers.push("shift");
	modifiers = modifiers.join("+");
	
	if (modifiers == "" || event.which < 32) return "";

	var val = getOSFriendlyShortcut(modifiers.replace("alt", "Alt").replace("shift", "Shift").replace("control", "Ctrl").replace("meta", "Meta").replace("accel", "Ctrl")) + "+";
	
	if (event.which == 32) 
		key = "Space"; 
	else 
		key = String.fromCharCode(event.which).toUpperCase();
	
	val += key;
	
	return val;
}

function getOSFriendlyShortcut(string)
{
	if (isMac())
		return string.replace("Ctrl", "Cmd").replace("Meta", "Control");
	else 
		return string;
}

function isWindows()
{
	return navigator.appVersion.indexOf("Win") !=-1;
}

function isMac()
{
	return navigator.platform.match(/^mac/i) != null;
}

function isOpera()
{
	return navigator.vendor.match(/opera/i) != null;
}

function i18nPrepare()
{
	var itr = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_ELEMENT, 
	function(node) {
        return (node.getAttribute('data-i18n') === null ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT);
    }, false);
	
	var currentNode;  
	while (currentNode = itr.nextNode()) {
		var data = chrome.i18n.getMessage(currentNode.getAttribute('data-i18n'));
		if (data !== "") 
			currentNode.innerText = data;
		else 
			currentNode.innerText = "#" + currentNode.innerText; //currentNode.innerText;//currentNode.getAttribute('data-i18n');
	}
}


function getFilenameLite()
{
	function padString(str, padString, length) 
	{
		str = str.toString();
		while (str.length < length)
			str = padString + str;
		return str;
	}
	
	var maxLen = getOption(cTemplateFilenameMaxLen, 100), fullLength = 0, i = 0;

	do
	{
		var template = getOption(cTemplatePref, cDefaultTemplate),	
			d = new Date(),
			n = getOption(cTemplateNumberPref, 1);
			
		var url = getExtension().tabURL,
			title = getExtension().tabTitle;
			
		/*if (i == 1)
			title = title.substr(0, maxLen - (fullLength - title.length));		
		
		if (i == 2)*/
			//url = url.replace(/(.*)\?.*/gi, "$1");
			
		template = template.replace("%n", getOption(cTemplateNumberPadCheckPref, true) === "true" ? padString(n, 0, getOption(cTemplateNumberPadValuePref, 3)) : n);
		template = template.replace("%y", d.getFullYear());
		template = template.replace("%m", padString(d.getMonth() + 1, 0, 2));
		template = template.replace("%d", padString(d.getDate(), 0, 2));
		
		template = template.replace("%H", padString(d.getHours(), 0, 2));
		template = template.replace("%M", padString(d.getMinutes(), 0, 2));
		template = template.replace("%S", padString(d.getSeconds(), 0, 2));
			
		if (i == 1)
			url = url.substr(0, Math.max(14, maxLen - template.length + 1));
		else if (i == 2)
		{
			url = url.replace(/(.*)\?.*/gi, "$1");
			template = template.replace("%u", url);
			title = title.substr(0, Math.max(14, maxLen - template.length + 1)) + "_";
		}
		else if  (i == 3)
		{
		  url = url.substr(0, (maxLen - template.length) / 2 - 1);
		  template = template.replace("%u", url);
		  title = title.substr(0, (maxLen - template.length) - 1) + "_";
		}
		
		template = template.replace("%u", url);
		template = template.replace("%t", title);
		
		template = template.replace(/[:\/\\\*\?"]/g, "_");
		template = template.replace("<", "{");
		template = template.replace(">", "}");
		template = template.replace("|", "I");
		
	} while (++i < 4 && template.length > maxLen);
	
	//template = template.substr(0, maxLen - 4);
	if (template == "") template = "Untitled";
	
	localStorage[cTemplateNumberPref] = parseInt(n) + 1;
	
	
	
	return template;
}

function tabSupportedForCapturing(tabId)
{
	try
	{
		chrome.tabs.executeScript(tabId, {code:"{}"}, function (res)
		{
			return chrome.runtime.lastError === undefined;
		});
		//logToconsole(chrome.runtime.lastError);
		return true;
	}
	catch (e)
	{
		return false;
	}
}

function showBadge(url)
{
	localStorage[cQueuedBadgeURLPref] = url;
	chrome.browserAction.setBadgeText({text: url && url != "undefined" ? "New" : ""});
	if (url)
		logToConsole("Setting badge for url: " + url);
}