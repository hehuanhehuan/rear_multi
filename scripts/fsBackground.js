var tabId, tabURL, tabTitle, imgData = [];
var extVersion = "0.0";
var updateURL = "";
var capAction, capMode;
var lastAction, lastMode;
var executeScriptTO;
var capId = 0, processedId = 0;
var guiItemsLocked = false;
var resumeMenuEnabled = false;
var shortcutProcessing = false;
var ignoreShortcuts = false;
var commPortName = "FireShot Comm Port #" + Math.ceil(Math.random() * 45309714203);
var capResult, capResultDataURL, capResultFileNameLite;
var fUpdating = false;


function enableHotkey(fEnable)
{
	if (fEnable) 
		setTimeout(function() {
			shortcutProcessing = false;
		}, 500);
	else
		shortcutProcessing = true;
}

function getVersionInfo() 
{
	var request = new XMLHttpRequest();
	request.open("GET", chrome.extension.getURL("manifest.json"), true);
	request.onreadystatechange = function() 
	{
		if (this.readyState == XMLHttpRequest.DONE) 
		{
			extVersion = JSON.parse(this.responseText).version;
			updateURL = JSON.parse(this.responseText).update_url;

			if (isWindows())
				fsNativePlugin.init(function() {
					logToConsole("Callback from fsNative");
					displayAnnouncements();
					switchToProIfRequired();
				}.bind(this));
			else 
				displayAnnouncements();
		}
	};
	request.send();
}

function displayAnnouncements()
{
	
	//chrome.browserAction.setBadgeText({text: "New!"});
	
	
	var addonString = "&app=ch";
	var show = getOption(cFirstTimeRun, "true") == "true";
	
	if (show)
	{
		localStorage[cFirstTimeRun] = false;
		localStorage[cCurrentVersion] = extVersion;
		
		//if (!isDebug) 
		//showBadge(getInstalledPageURL());
		openURL(getInstalledPageURL());
	}
	else 
	{
		var prevVer = getOption(cCurrentVersion, "0.0");
		
		if (extVersion != prevVer)
		{
			if (!isNativeSupported()) 
			{
				showBadge("http://getfireshot.com/updated-lite.php?app=" + (isOpera() ? "op" : "ch") + "&ver=" + extVersion);
			}
				//extensionUpdated(true);
			//localStorage[cCurrentVersion] = extVersion;
		}
	}
}

function getInstalledPageURL()
{
	var addonString = "&app=" + (isOpera() ? "op" : "ch");
	
	if (isNativeSupported()) return "http://getfireshot.com/installed.php?ver=" + extVersion + addonString + "&native=1";
	else return "http://getfireshot.com/installed-lite.php?ver=" + extVersion + addonString;
}

function nativeHostUpdated(newVersion)
{
	logToConsole("Native module has updated to the " + newVersion + " version.");
	

	
	if (newVersion == extVersion)
	{
		showBadge("http://getfireshot.com/updated.php?app=" + (isOpera() ? "op" : "ch") + "&ver=" + newVersion);
	}
}

function switchToProIfRequired()
{
	/*var pro = getOption(cPluginProModePref, "false") == "true";
	if (!pro && updateURL == "http://screenshot-program.com/fireshot/chrome.xml")
		doUpgrade();*/
}

function pluginEvent(obj)
{
	var topic = obj.topic,
		data = obj.data;
		
	if (topic == "status")
	{
		if (obj.code == statusHostReady)
			pluginCommand("setAddonVersion", {version:extVersion, browser: isOpera() ? "Opera" : "Chromium"});
		else
		{

			alert("FireShot failed to update. The updater reported the following error: \r\n-----------------------------------------------\r\n" + obj.data + "\r\n-----------------------------------------------\r\n\r\nFireShot will have to work in Lite mode.");
			logToConsole("Error from native module: " + obj.data);
		}
	}
	else if (topic == "openURL")
    {
		openURL(data);
	}
	else if (topic == "enableResumeMenu")
	{
		logToConsole("enableResumeMenu " + data);
		resumeMenuEnabled = data == "enable";
		
		setTimeout(function () {updateContextMenu();}, 10);
	}
	else if (topic == "setupMode")
	{
		localStorage[cPluginProModePref] = data != "false";
		
		updateContextMenu();
	}
	else if (topic == "setRegistered")
	{
		localStorage[cRegisteredPref] = data != "false";
		updateContextMenu();
	}
	else if (topic == "getInfo")
	{
		var request = new XMLHttpRequest();
		request.open("GET", data, true);
		request.onreadystatechange = function() 
		{
			if (this.readyState == XMLHttpRequest.DONE) 
			{
				pluginCommand("processInfo", {data:this.responseText});
			}
		};
		request.send();
	} 
	else if (topic == "saveCrashData")
	{

	}
}

function lockItems()
{
	guiItemsLocked = true;
	chrome.contextMenus.removeAll();
	
	chrome.browserAction.setTitle({title: "FireShot Editor is currently displayed.\r\nPlease close it to take the next capture.\r\n\r\n(switching to FireShot Pro also helps!)"});
	chrome.browserAction.setPopup({popup: ""});
}

function unlockItems()
{
	guiItemsLocked = false;
	
	setTimeout(function () {updateContextMenu();}, 10);
	
	chrome.browserAction.setTitle({title: "Capture page"});
	chrome.browserAction.setPopup({popup: "fsPopup.html"});
}


try {
	chrome.extension.onMessage.addListener(
	  function(request, sender, sendResponse) {
		  
		switch (request.message)
		{
			case "getPortName": sendResponse({portName: commPortName}); break;
			case "loadScript": 
				clearTimeout(executeScriptTO);
				chrome.tabs.executeScript(tabId, {file:"scripts/fsUtils.js"},
					function()
					{
						chrome.tabs.executeScript(tabId, {file:"scripts/fsSelection.js"},
							function()
							{
								chrome.tabs.executeScript(tabId, {file:"scripts/fsContent.js"},
									function()
									{
										doCapturing(capAction, capMode);
									}
								);
							}
						);
					}
				);
			break;
			
			case "execScript": 
				clearTimeout(executeScriptTO);
				doCapturing(capAction, capMode); 
			break;
			
			case "checkHotkey": 
				function checkKey(prefName, defaultShortcut, callback)
				{
					var prefShortcut = getOption(prefName, defaultShortcut);
					if (prefShortcut == request.data && !shortcutProcessing && !ignoreShortcuts)
					{
						ignoreShortcuts = true;
						callback();
						setTimeout(function() {ignoreShortcuts = false;}, 1000);
						return true;
					}
					return false;
				}
				
				function getShortcutAction(prefName, defaultValue)
				{
					if (!isNativeSupported()) return cActionEdit;
					switch (parseInt(getOption(prefName, defaultValue)))
					{
						case 1: return cActionSave; 
						case 2: return cActionSavePDF; 
						case 3: return cActionSendOneNote; 
						case 4: return cActionUpload; 
						case 5: return cActionPrint; 
						case 6: return cActionClipboard; 
						case 7: return cActionEMail; 
						case 8: return cActionPaint; 
						default: return cActionEdit; 
					}
				}
			

				var checked = checkKey(cShortcutPref, cDefaultShortcut, function() {captureLastUsedMode();}) ||
					checkKey(cShortcutPrefVisible, cDefaultShortcutVisible, function() {
						capturePage(getShortcutAction(cShortcutPrefVisibleAction, cDefaultShortcutVisibleAction), cModeVisible);
					}) ||
					checkKey(cShortcutPrefEntire, cDefaultShortcutEntire, function() {
						capturePage(getShortcutAction(cShortcutPrefEntireAction, cDefaultShortcutEntireAction), cModeEntire);
					}) ||
					checkKey(cShortcutPrefSelection, cDefaultShortcutSelection, function() {
						capturePage(getShortcutAction(cShortcutPrefSelectionAction, cDefaultShortcutSelectionAction), cModeSelected);
					}) ||
					(isNativeSupported() &&	checkKey(cShortcutPrefBrowser, cDefaultShortcutBrowser, function() {
						capturePage(getShortcutAction(cShortcutPrefBrowserAction, cDefaultShortcutBrowserAction), cModeBrowser);
					})); 
				
			break;
			
			case "checkFSAvailabilityEvt":
			{
				sendResponse({FSAvailable: true, FSUpgraded:localStorage[cPluginProModePref] === "true"});
				break;
			} 
			
			case "capturePageEvt":
			{
				var action = parseInt(request.Action);
				if (action == cActionUpgrade)	
					doUpgrade();
				else
					capturePage(action, request.Entire == "true" ? cModeEntire : cModeVisible);
				break;
			}
			
			case "switchToNativeEvt":
			{
				installNative();
				break;
			}
			
		}
	  });
} catch(e) {}

/*
chrome.extension.onRequest.addListener(
	function(request, sender)
	{
		
	}
)*/

function checkBadgeAction()
{
	if (localStorage[cQueuedBadgeURLPref] && localStorage[cQueuedBadgeURLPref] != "undefined")
	{
		openURL(localStorage[cQueuedBadgeURLPref]);
		showBadge(undefined);
		localStorage[cFirstTimeRun] = false;
		localStorage[cCurrentVersion] = extVersion;
		return true;
	}
	return false;
}

function getMenuSettings(callback)
{
	chrome.windows.getLastFocused(function(window) {
		chrome.tabs.getSelected(window.id, function(tab) {
			chrome.tabs.executeScript(tab.id, {code:"{}"}, function () {
				
				var unsupported = (chrome.runtime.lastError !== undefined);
				var fPro = localStorage[cPluginProModePref] == "true";
				var fRegistered = localStorage[cRegisteredPref] == "true";
				var fLite = !isNativeSupported();
				
				callback({
					"mnuQuickLaunch"		: unsupported && (lastMode == cModeEntire || lastMode == cModeSelected || lastMode == cModeVisible) ? "disabled" : "enabled",
					
					"mnuCaptureVisible"		: unsupported ? "disabled" : "visible",
					"mnuCaptureEntire"		: unsupported ? "disabled" : "visible",
					"mnuCaptureSelection"	: unsupported ? "disabled" : "visible",
					
					"mnuCaptureVisibleLite"		: unsupported ? "disabled" : "visible",
					"mnuCaptureEntireLite"		: unsupported ? "disabled" : "visible",
					"mnuCaptureSelectionLite"	: unsupported ? "disabled" : "visible",
					"mnuPreferencesLite"		: fLite ? "visible" : "hidden",
					
					"mnuViewDemo"			: fLite ? "hidden" : "visible",
					"mnuSupport"			: fLite ? "hidden" : "visible",
					"mnuAPI"				: fLite ? "hidden" : "visible",
					"mnuAbout"				: fLite ? "hidden" : "visible",
					"sepEditor"				: fLite ? "hidden" : "visible",
					"sepSupport"			: fLite ? "hidden" : "visible",
					"sepAdvanced"			: !isWindows() ? "hidden" : "visible",
					//"sepOptions"			: fLite ? "hidden" : "visible",
					"mnuMiscellaneousFolder": fLite ? "hidden" : "visible",
					"mnuResume"				: fLite ? "hidden" : resumeMenuEnabled ? "enabled" : "disabled",
					"mnuUpgrade"			: fLite ? "hidden" :  fPro ? "hidden" : "visible",
					"mnuRegister"			: fLite ? "hidden" :  fPro && !fRegistered ? "visible" : "hidden",
					"mnuEnterLicense"		: fLite ? "hidden" :  fPro && !fRegistered ? "visible" : "hidden",
					"mnuOpenFile"			: fLite ? "hidden" :  fPro ? "enabled" : "disabled",
					"mnuOpenClipboard"		: fLite ? "hidden" :  fPro ? "enabled" : "disabled",
					"mnuLicenseInfo"		: fLite ? "hidden" :  fPro && fRegistered ? "visible" : "hidden",
					"divCaptureToolsLite"	: fLite ? "visible" : "hidden",
					"divCaptureTools"		: fLite ? "hidden" : "visible",
					"mnuFireShotNative"		: isWindows() && fLite ? "visible" : "hidden"
				});
			});
		});
	});
}


function captureImage()
{
	console.log(capResultDataURL);
	reportCapturePicture(capResultDataURL);
}

function capturePage(Action, Mode)
{
	if (guiItemsLocked) return;

	capAction = Action;
	capMode = Mode;

	lastAction 	= capAction;
	lastMode 	= capMode;
	localStorage[cLastActionPref] 	= lastAction;
	localStorage[cLastModePref] 	= lastMode;

	updateLastAction();
	
	capId ++;

	chrome.windows.getLastFocused(function(window) {

		chrome.tabs.getSelected(null, function(tab)	{
			tabId = tab.id;
			chrome.tabs.executeScript(tab.id, {code:"{}"}, function () {
				var noExecScript = chrome.runtime.lastError !== undefined;
				
				// Окно захватываем напрямую в случае, если инжект скриптов невозможен, либо нам уже известны заголовок и url страницы
				if (Mode == cModeBrowser && (noExecScript || (tab.url !== undefined && tab.title !== undefined)))
					setTimeout(
						function()
						{
							logToConsole("Calling captureBrowser directly...");
							enableHotkey(false);
							lockItems();
							pluginCommand("captureBrowser", {action:Action + ":-", url:tab.url, title:tab.title});
							unlockItems();
							enableHotkey(true);
						},
						100
					);
				
				else
				{
					executeScriptTO = setTimeout(
						function()
						{
							doCapturing(Action, Mode);
						},
						1000
					);
												
					chrome.tabs.executeScript(tabId, {file:"scripts/fsScriptChecker.js"});
				}
			});
		});
	});
}

function getActionLocaleId(action)
{
	switch (action)
	{
		case cActionSave		: return "action_save"; 
		case cActionSavePDF		: return "action_save_pdf"; 
		case cActionClipboard	: return "action_copy";
		case cActionEMail		: return "action_email";
		case cActionPaint		: return "action_external";
		case cActionSendOneNote	: return "action_onenote";
		case cActionUpload		: return "action_upload";
		case cActionPrint		: return "action_print";
		default					: return "action_edit"; 
	}
}

function getLADescription()
{
	var action1, action2 = getActionLocaleId(lastAction);
	var fLite = !isNativeSupported();
	switch (lastMode)
	{
		case cModeVisible	: action1 = fLite ? "action_capture_visible_lite" : "action_capture_visible"; break;
		case cModeSelected	: action1 = fLite ? "action_capture_selection_lite" : "action_capture_selection"; break;
		case cModeBrowser	: action1 = "action_capture_browser"; break;
		default				: action1 = fLite ? "action_capture_entire_lite" : "action_capture_entire"; 
	}
	
	if (fLite)
		return chrome.i18n.getMessage(action1);
	else
		return chrome.i18n.getMessage(action1) + " " + chrome.i18n.getMessage(action2);
}

function doCapturing(Action, Mode)
{
	if (capId <= processedId++) 
	{
		capId = processedId;
		return;
	}
	
	var imgData = [];
	chrome.windows.getLastFocused(function(window) {
		chrome.tabs.getSelected(window.id,
			function(tab)
			{
				tabId            = tab.id;
				
				var port = chrome.tabs.connect(tabId, {name: commPortName});
				var markerDetected = false;
				
				port.postMessage({topic: "init", mode: Mode});
				port.onMessage.addListener(function(msg) {
					
					logToConsole(JSON.stringify(msg));
					
					switch(msg.topic)
					{
						case "initDone": 
						
							tabURL		= msg.url;
							tabTitle    = msg.title;
							enableHotkey(false);
							
							switch (Mode)
							{
								case cModeVisible	:
								case cModeEntire	: pluginCommand("captureInit"); port.postMessage({topic: "scrollNext"}); break;
								case cModeSelected	: pluginCommand("captureInit"); port.postMessage({topic: "selectArea"}); break;
								case cModeBrowser	: 
									enableHotkey(false);
									lockItems();
									pluginCommand("captureBrowser", {action:Action + ":-", url:tabURL, title:tabTitle});
									unlockItems();
									enableHotkey(true);
								break;
							}
						break;
						
						case "areaSelected": 
							port.postMessage({topic: "scrollNext"}); 
						break;
						
						case "areaSelectionCanceled": 
							enableHotkey(true); 
							port.onMessage.removeListener(arguments.callee);
						break;
						
						case "scrollDone": 
								chrome.tabs.captureVisibleTab(null, {format : "png"},
									function(data)
									{
										pluginCommand("captureTabPNG", {dataurl: data, datasize: data.length, x: msg.x, y: msg.y});
										port.postMessage({topic: "scrollNext"}); 
									});
						break;
						
						case "scrollFinished": 
							logToConsole("FINISHED (" + msg.rows + " x " + msg.cols + ")");
							
							msg.url = tabURL;
							msg.title = tabTitle;
							
							msg.key = "-";
							msg.action = Action;
							msg.browserVersion = parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2]);
							
							lockItems();
							pluginCommand("captureDone", msg);
							enableHotkey(true);
							unlockItems();
							
							port.onMessage.removeListener(arguments.callee);
						break;
					}
					
					
				});
			}
		);
	});
}

function genericOnClick(info, tab) 
{
	switch (info.menuItemId)
	{
        case mnuVisibleEdit			: capturePage(cActionEdit, cModeVisible); break;
        case mnuVisibleSave			: capturePage(cActionSave, cModeVisible); break;
		case mnuVisibleSavePDF		: capturePage(cActionSavePDF, cModeVisible); break;
		case mnuVisibleSendOneNote	: capturePage(cActionSendOneNote, cModeVisible); break;
		case mnuVisibleUpload		: capturePage(cActionUpload, cModeVisible); break;
		case mnuVisiblePrint		: capturePage(cActionPrint, cModeVisible); break;
		case mnuVisibleCopy			: capturePage(cActionClipboard, cModeVisible); break;
		case mnuVisibleEMail		: capturePage(cActionEMail, cModeVisible); break;
		case mnuVisibleExtEditor	: capturePage(cActionPaint, cModeVisible); break;
		
		case mnuEntireEdit			: capturePage(cActionEdit, cModeEntire); break;
        case mnuEntireSave			: capturePage(cActionSave, cModeEntire); break;
		case mnuEntireSavePDF		: capturePage(cActionSavePDF, cModeEntire); break;
		case mnuEntireSendOneNote	: capturePage(cActionSendOneNote, cModeEntire); break;
		case mnuEntireUpload		: capturePage(cActionUpload, cModeEntire); break;
		case mnuEntirePrint			: capturePage(cActionPrint, cModeEntire); break;
		case mnuEntireCopy			: capturePage(cActionClipboard, cModeEntire); break;
		case mnuEntireEMail			: capturePage(cActionEMail, cModeEntire); break;
		case mnuEntireExtEditor		: capturePage(cActionPaint, cModeEntire); break;

		case mnuSelectedEdit		: capturePage(cActionEdit, cModeSelected); break;
        case mnuSelectedSave		: capturePage(cActionSave, cModeSelected); break;
		case mnuSelectedSavePDF		: capturePage(cActionSavePDF, cModeSelected); break;
		case mnuSelectedSendOneNote	: capturePage(cActionSendOneNote, cModeSelected); break;
		case mnuSelectedUpload		: capturePage(cActionUpload, cModeSelected); break;
		case mnuSelectedPrint		: capturePage(cActionPrint, cModeSelected); break;
		case mnuSelectedCopy		: capturePage(cActionClipboard, cModeSelected); break;
		case mnuSelectedEMail		: capturePage(cActionEMail, cModeSelected); break;
		case mnuSelectedExtEditor	: capturePage(cActionPaint, cModeSelected); break;

		case mnuBrowserEdit			: capturePage(cActionEdit, cModeBrowser); break;
        case mnuBrowserSave			: capturePage(cActionSave, cModeBrowser); break;
		case mnuBrowserSavePDF		: capturePage(cActionSavePDF, cModeBrowser); break;
		case mnuBrowserSendOneNote	: capturePage(cActionSendOneNote, cModeBrowser); break;
		case mnuBrowserUpload		: capturePage(cActionUpload, cModeBrowser); break;
		case mnuBrowserPrint		: capturePage(cActionPrint, cModeBrowser); break;
		case mnuBrowserCopy			: capturePage(cActionClipboard, cModeBrowser); break;
		case mnuBrowserEMail		: capturePage(cActionEMail, cModeBrowser); break;
		case mnuBrowserExtEditor	: capturePage(cActionPaint, cModeBrowser); break;

		
		case mnuLastAction		: captureLastUsedMode(); break;
		case mnuPreferences		: openExtensionPreferences(); break;
	//	case mnuCapPreferences 	: openCaptureSettings(); break; 
		case mnuViewDemo		: openDemoPage(); break;
		case mnuSupport			: openSupportPage(); break;
		case mnuAPI				: openAPIPage(); break;
		case mnuUpgrade			: doUpgrade(); break;
		case mnuUniblue			: openUnibluePromo(); break;
		case mnuRegister		: doRegister(); break;
		case mnuEnterLicense	: enterLicense(); break;
		case mnuOpenFile		: openFile(); break;
		case mnuOpenClipboard	: openClipboard(); break;
		case mnuResume			: resumeEditing(); break;
		case mnuFireShotNative 	: installNative(); break;
		
		
		case mnuLicensingInfo	: showLicenseInfo(); break;
		case mnuAbout			: showAbout(); break;
	}
}

function updateLastAction()
{
	chrome.contextMenus.update(mnuLastAction, {title: getLADescription() + "    " + getOption(cShortcutPref, cDefaultShortcut)});
	chrome.contextMenus.update(mnuEntireEdit, {title: chrome.i18n.getMessage("action_capture_entire_lite") + "...    " + getOption(cShortcutPrefEntire, cDefaultShortcutEntire)});
	chrome.contextMenus.update(mnuVisibleEdit, {title: chrome.i18n.getMessage("action_capture_visible_lite") + "...    " + getOption(cShortcutPrefVisible, cDefaultShortcutVisible)});
	chrome.contextMenus.update(mnuSelectedEdit, {title: chrome.i18n.getMessage("action_capture_selection_lite") + "...    " + getOption(cShortcutPrefSelection, cDefaultShortcutSelection)});
}

var fEntered = false;
var mnuVisibleEdit, mnuVisibleSave, mnuVisibleSavePDF, mnuVisibleSendOneNote, mnuVisibleUpload, mnuVisiblePrint, mnuVisibleCopy, mnuVisibleEMail, mnuVisibleExtEditor, 
	mnuEntireEdit, mnuEntireSave, mnuEntireSavePDF, mnuEntireSendOneNote, mnuEntireUpload, mnuEntirePrint, mnuEntireCopy, mnuEntireEMail, mnuEntireExtEditor, 
	mnuSelectedEdit, mnuSelectedSave, mnuSelectedSavePDF, mnuSelectedSendOneNote, mnuSelectedUpload, mnuSelectedPrint, mnuSelectedCopy, mnuSelectedEMail, mnuSelectedExtEditor, 
	mnuBrowserEdit, mnuBrowserSave, mnuBrowserSavePDF, mnuBrowserSendOneNote, mnuBrowserUpload, mnuBrowserPrint, mnuBrowserCopy, mnuBrowserEMail, mnuBrowserExtEditor, 
	mnuResume, mnuOpenFile, mnuOpenClipboard, mnuPreferences, mnuRegister, mnuEnterLicense, mnuUpgrade, mnuViewDemo, mnuSupport, mnuAPI, mnuUniblue, mnuLicensingInfo, mnuAbout, mnuFireShotNative;



function updateContextMenu()
{
	//if (fEntered) return;
	//fEntered = true;
	//logToConsole("updateContextMenu");
	
	chrome.contextMenus.removeAll(
		function()
		{
			var mnuRoot, mnuSeparator;
			var fPro = localStorage[cPluginProModePref] == "true";
			var fRegistered = localStorage[cRegisteredPref] == "true";
			var fLite = !isNativeSupported();
			
			if (!guiItemsLocked)
			{
				//logToConsole("items removed");
				mnuLastAction = chrome.contextMenus.create({"title": "Last action", "onclick": genericOnClick});

				mnuSeparator = chrome.contextMenus.create({type: "separator"});		
				
				if (fLite)
				{
					mnuEntireEdit = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_capture_entire_lite") + "...", "onclick": genericOnClick});
					mnuVisibleEdit = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_capture_visible_lite") + "...", "onclick": genericOnClick});
					mnuSelectedEdit = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_capture_selection_lite") + "...", "onclick": genericOnClick});
					
					mnuSeparator = chrome.contextMenus.create({type: "separator"});		
				}
				else
				{
					mnuRoot = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_capture_visible") + "..."});
					mnuVisibleEdit = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_edit") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuVisibleSave = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_save") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuVisibleSavePDF = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_save_pdf") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuVisibleSendOneNote = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_onenote") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuVisibleUpload = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_upload") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuVisiblePrint = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_print") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuVisibleCopy = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_copy") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuVisibleEMail = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_email") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuVisibleExtEditor = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_external") + "...", "parentId": mnuRoot, "onclick": genericOnClick});

					mnuRoot = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_capture_entire") + "..."});
					mnuEntireEdit = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_edit") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuEntireSave = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_save") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuEntireSavePDF = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_save_pdf") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuEntireSendOneNote = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_onenote") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuEntireUpload = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_upload") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuEntirePrint = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_print") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuEntireCopy = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_copy") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuEntireEMail = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_email") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuEntireExtEditor = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_external") + "...", "parentId": mnuRoot, "onclick": genericOnClick});

					mnuRoot = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_capture_selection") + "..."});
					mnuSelectedEdit = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_edit") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuSelectedSave = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_save") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuSelectedSavePDF = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_save_pdf") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuSelectedSendOneNote = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_onenote") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuSelectedUpload = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_upload") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuSelectedPrint = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_print") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuSelectedCopy = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_copy") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuSelectedEMail = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_email") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuSelectedExtEditor = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_external") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					
					mnuRoot = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_capture_browser") + "..."});
					mnuBrowserEdit = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_edit") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuBrowserSave = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_save") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuBrowserSavePDF = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_save_pdf") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuBrowserSendOneNote = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_onenote") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuBrowserUpload = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_upload") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuBrowserPrint = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_print") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuBrowserCopy = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_copy") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuBrowserEMail = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_email") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
					mnuBrowserExtEditor = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_external") + "...", "parentId": mnuRoot, "onclick": genericOnClick});

					mnuSeparator = chrome.contextMenus.create({type: "separator"});		
					
					if (!fLite && fPro)
					{
						if (resumeMenuEnabled)
							mnuResume = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_resume") + "...", "onclick": genericOnClick});		
					
						mnuOpenFile = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_open_file") + "...", "onclick": genericOnClick});		
						mnuOpenClipboard = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_open_clipboard") + "...", "onclick": genericOnClick});		
							
						mnuSeparator = chrome.contextMenus.create({type: "separator"});		
					}
				}
				
				
				
				mnuPreferences = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_options") + "...", "onclick": genericOnClick});		
				mnuFireShotNative = !fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_install_native") + "...", "parentId": mnuRoot, "onclick": genericOnClick});
				//mnuCapPreferences = chrome.contextMenus.create({"title": "Capture preferences...", "onclick": genericOnClick});		
				
				if (!fLite)
					mnuSeparator = chrome.contextMenus.create({type: "separator"});		
			}
			
			
			if (!fLite && fPro && !fRegistered)
			{
				mnuRegister = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_register") + "...", "onclick": genericOnClick});		
				mnuEnterLicense = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_enter_license") + "...", "onclick": genericOnClick});		
			}
			
			if (!fLite && !fPro)
				mnuUpgrade = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_switch_pro") + "!", "onclick": genericOnClick});		
				
			mnuViewDemo = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_view_demo"), "onclick": genericOnClick});		
			mnuSupport = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_support"), "onclick": genericOnClick});		
			//mnuAPI = chrome.contextMenus.create({"title": "FireShot API...", "onclick": genericOnClick});		
			//mnuUniblue = chrome.contextMenus.create({"title": "Boot PC Performance...", "onclick": genericOnClick});		
			
			mnuSeparator = fLite || chrome.contextMenus.create({type: "separator"});
			
			if (!fLite && fPro && fRegistered)
				mnuLicensingInfo = chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_license_info"), "onclick": genericOnClick});		
				
			mnuAbout = fLite || chrome.contextMenus.create({"title": chrome.i18n.getMessage("action_about"), "onclick": genericOnClick});		
			
			//logToConsole("items added");
				
			updateLastAction();
			
			fEntered = false;
		}
	);
			
}

function notificationBoxEvent(event) {
	alert(event);
}

function restoreBadge() {
	if (localStorage[cQueuedBadgeURLPref] && localStorage[cQueuedBadgeURLPref] != "undefined")
		showBadge(localStorage[cQueuedBadgeURLPref]);
}

function initAnalytics() {
	var _gaq = _gaq || [];
	_gaq.push(['_setAccount', 'UA-1025658-9']);
	_gaq.push(['_setDomainName', 'fireshot.com']);
	_gaq.push(['_trackPageview']);
	 
	(function() {
	  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	  ga.src = 'https://ssl.google-analytics.com/ga.js';
	  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
	})();
}

lastAction 	= parseInt(getOption(cLastActionPref, cActionEdit));
lastMode 	= parseInt(getOption(cLastModePref, cModeEntire));

document.addEventListener('DOMContentLoaded', function () {
	restoreBadge();
	getVersionInfo();
	updateContextMenu();
});

