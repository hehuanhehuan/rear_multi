var scriptLoaded;

chrome.extension.sendMessage({message:(typeof scriptLoaded == "undefined" ? "loadScript" : "execScript")});