
var task = null;
var running = null;
var api = null;

console.log('chrome');
console.log('watchdog');
chrome.extension.sendMessage({cmd: 'watchdog'});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
  if(message.cmd == 'task_result'){//任务结果
    console.log(message.task);
	task = message.task;
	chrome.extension.sendMessage({cmd: 'task_login'});
  }
  else if(message.cmd == 'extensions_updated'){
    console.log('get_task');
    getTask();
  }
});

console.log('extensionsAutoUpdate');

extensionsAutoUpdate();

function extensionsAutoUpdate(){
  setTimeout(function(){
    chrome.extension.sendMessage({cmd: 'extensions_update'});
  }, 3000);
}

function getTask(){
  chrome.extension.sendMessage({cmd: 'get_task'});
  setTimeout(function(){
    if( !task ) {
      chrome.extension.sendMessage({cmd: 'watchdog'});
      getTask();
    }
  }, 30000);
}
