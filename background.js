
var last_watchdog_time = new Date().getTime();
var last_watchdog_timeout_time = null;
var watchdog_timeout_count = 0;
//var last_ip = null;
var running = false;
var api = null;
var task = null;

var task_start_time = null;

//var ip_get_count = 0;

var boot_page = {
  jd: 'http://order.jd.com/center/list.action',
  yhd: 'http://my.yhd.com/order/myOrder.do'
};

var settings = {

};

var retry = {};

setTimeout(watchdog, 1000);

reloadSettings();

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('onMessage：',message);
  //console.log(sender);
  if (message.cmd === 'task_done') {
    if (settings.auto_start) {
      //changeIpAndOpenWindow();
      if(task.business_slug == 'jd'){
        openHomePage();
      }else{
        closeAllWindows();
      }

    }
  }
  else if(message.cmd == 'share_fail'){
    reportShareFail();
  }
  else if(message.cmd == 'level'){
    var level = message.level;
    if(level){
      reportLevel(level);
    }else{
      window.location.reload(true);
    }
  }
  else if(message.cmd === 'start_page') {
    last_watchdog_time = new Date().getTime();
    openStartPage();
  }
  else if(message.cmd == 'get_task') {
    console.log('message cmd get_task');
    reloadSettings(function(){

      getTask(function(){
        setCookies(function(){
          chrome.tabs.sendMessage(sender.tab.id,{cmd: 'task_result',task:task});
          chrome.tabs.create({
            url: boot_page[task.business_slug],
            selected:true
          }, function (tab){
            console.log(tab);
            chrome.windows.update(tab.windowId, {state: "maximized"});
          });
        })
      });
    });

  }
  else if(message.cmd === 'account'){
    console.log('message cmd account');
    var account_id = task.account_id;
    getAccount(chrome.tabs.sendMessage(sender.tab.id,{cmd: 'account'}));

  }
  else if (message.cmd === 'start_task') {
    console.log("before start_task");
    //changeIpAndOpenWindow();
  }
  else if(message.cmd === 'task_login') {
	console.log("task_login");
  }
  else if (message.cmd === 'watchdog') {
    last_watchdog_time = new Date().getTime();
  }
  else if (message.cmd === 'reload_settings') {
    reloadSettings();
  }
  else if(message.cmd === 'disable'){
    last_watchdog_time = new Date().getTime();
    if(message.message){
      reportDisable(message.message);
    }else{
      window.location.reload(true);
    }

  }
  else if(message.cmd === 'verify_code'){
  //验证码
      console.log('verify_code');
      last_watchdog_time = new Date().getTime();
      setTimeout(function(){
          last_watchdog_time = new Date().getTime();
      },30000);//延时喂狗
      var dama = new DaMa();
      dama.submit(message.imgsrc,function(cid,text){
            chrome.tabs.sendMessage(sender.tab.id,{cmd: 'verify_code_result',cid: cid, text: text});
      },function(){
          chrome.tabs.reload(sender.tab.id);
      });

  }
  else if(message.cmd === 'verify_fail'){
      last_watchdog_time = new Date().getTime();
      console.log('verify_fail');
      var dama = new DaMa();
      dama.report(message.cid,function(){});

  }
  else if(message.cmd === 'get_cookies'){
    var domain = {jd:'jd.com', yhd:'yhd.com'};
    chrome.cookies.getAll({domain:domain[task.business_slug]},function(cookies){
      console.log(cookies);
      api.reportCookie(task.account_id,cookies,function(){
        chrome.tabs.sendMessage(sender.tab.id,{cmd:'cookies'});
      },function(){
        setTimeout(function(){
          window.location.reload(true);
        },1000);
      });
    });
  }else if(message.cmd === 'set_cookies'){

  }else if(message.cmd === 'reload'){
    last_watchdog_time = new Date().getTime();
    message.cmd = 'reloaded';
    console.log(retry);
    if(retry.retry){
      retry.retry ++;
      message.retry =  retry.retry;
    }else{
      message.retry = 1;
    }
    retry = message;
    console.log(retry);
    chrome.tabs.sendMessage(sender.tab.id,message);
  }else if(message.cmd === 'share'){
    //var show = new Show();
  }
  else if(message.cmd == 'capture'){
    //capturePage(0,0);
    captureTab();

  }
  else if(message.cmd == 'share_info'){
    var share_info = message.share_info;
    reportShareInfo();
  }
  else if(message.cmd == 'extensions_update'){
    last_watchdog_time = new Date().getTime();
    extensionVersion(function () {
      chrome.tabs.sendMessage(sender.tab.id,{cmd:'extensions_updated'});
    });

  }
  else if(message.cmd == 'zoom'){
    var zoom_setting = {mode:'manual',scope:'per-tab',defaultZoomFactor:1};
    chrome.tabs.setZoomSettings(sender.tab.id, zoom_setting, function(settings){
      console.log(settings);
      chrome.tabs.sendMessage(sender.tab.id,{cmd:'zoom',settings:settings});
    });
  }

  console.log(sender);

  sendResponse && sendResponse();
  
});

function captureTab(){
  chrome.tabs.query({active: true, highlighted: true}, function(tabs) {
    if(tabs.length > 0){
      var current_tab = tabs[0];
      console.log(current_tab);
      chrome.tabs.captureVisibleTab(current_tab.windowId,{format:"png"},function(img){
        console.log(img);
        reportCapturePicture(img);
      })
    }
  });
}

function extensionVersion(callback){
  api = new RemoteApi(settings);
  api.getVersion(function (data) {
    if(data.success == 1){
      var version = data.data;
      var current_version = chrome.runtime.getManifest().version;
      if(version && current_version && (version > current_version)){
        notify('需要更新版本');
        extensionsAutoUpdateCheck(callback);
      }else{
        notify('无更新版本');
        callback && callback();
      }

    }else{
      setTimeout(function () {
        extensionVersion(callback);
      },3000);
    }
  }, function () {
    notify('版本接口请求失败 10s后关闭');
    setTimeout(function(){
      last_watchdog_time = new Date().getTime();

      closeAllWindows();
    }, 10000);
  });
}

function extensionsAutoUpdateCheck(callback){
  chrome.runtime.requestUpdateCheck(function(status, details){
    //"throttled", "no_update", or "update_available"

    if(status == 'update_available'){
      notify('rear 自动升级版本' + details.version);
      setTimeout(function () {
        last_watchdog_time = new Date().getTime();
        closeAllWindows();
      },3000);
    }else{
      console.log('rear NO UPDATE');
      notify('rear NO UPDATE');
      callback && callback();
    }

  });
}

function watchdog() {

  if (last_watchdog_time && running) {
    console.log("watchdog");
    var time = new Date().getTime();
    var watch_dog_running = parseInt((time - last_watchdog_time)/1000);
    console.log("watchdog"+"运行"+watch_dog_running+"秒");

    if(task_start_time){
      if(!task.business_slug){
        closeAllWindows();
      }

      var task_running = parseInt((time - task_start_time)/1000);
      if(task_running > 540){
        closeAllWindows();
      }
    }

    if (time - last_watchdog_time > 60000) {
      if (last_watchdog_timeout_time == last_watchdog_time) {
        watchdog_timeout_count+=1;
        console.log("watchdog"+watchdog_timeout_count+"次60秒");
      }
      else {
        watchdog_timeout_count=0;
        console.log("watchdog重置60秒次数");
      }

      if (watchdog_timeout_count>=2) {
        console.log("watchdog 2次60秒");
        watchdog_timeout_count=0;
        setTimeout(closeAllWindows,3000);
      }
      // reload page
      chrome.tabs.query({active: true, highlighted: true}, function(tabs) {
        console.log("watchdog chrome.tabs.query");
        if (tabs.length > 0) {
          var current_url = tabs[0].url;
          console.log(current_url);
          if (current_url.indexOf('yhd.com/') >=0 || current_url.indexOf('jd.com/') >=0) {

            if(!task_start_time){
              closeAllWindows();
            }else{
              console.log("执行reload");
              chrome.tabs.reload(tabs[0].id, function() {
                //success
              });
            }

          }

        }
      });
      last_watchdog_time = time;
      last_watchdog_timeout_time = time;
    }
  }

  setTimeout(watchdog, 1000);
}

function openHomePage(){
  console.log('go to home.jd.com');
  chrome.tabs.create({
    url: 'http://home.jd.com/',
    selected:true
  }, function (tab){
    console.log(tab);
  });
}

function openStartPage() {
  chrome.tabs.query({url:'file:///C:/chrome.html'}, function(tabs) {
    if(tabs.length==1) {
      //刷新本页
      window.location.reload(true);
    }else if(tabs.length>1){
      closeAllWindows();
    }else{
      chrome.tabs.create({
        url:'file:///C:/chrome.html',
        selected:true
      }, function (){});
    }
  });

}

function reportCapturePicture(img){
  var share = task.share;
  api.reportCapturePicture(share.id,img,function(){
    closeAllWindows(function(){

    });
  }, function () {
    setTimeout(function () {
      last_watchdog_time = new Date().getTime();
      reportCapturePicture(img);
    },20000)
  });
}

function reportShareFail(){
  var share = task.share;
  api.reportShareFail(share.id, function (data) {
    if(data.success){
      openHomePage();
    }else{
      openHomePage();
    }
  }, function () {
    openHomePage();
  });
}

function reportShareInfo(info){
  var share = task.share;
  api.reportInfo(share.id,info,function(res){
    if(res.success){
      closeAllWindows();
    }else{
      setTimeout(function(){
        last_watchdog_time = new Date().getTime();
        closeAllWindows();
      },15000);
    }
  },function(){
    setTimeout(function(){
      last_watchdog_time = new Date().getTime();
      closeAllWindows();
    },15000);
  })
}

function reportShareSuccess(img){
  var share = task.share;
  api.reportShareSuccess(share.id,img,function(){
    closeAllWindows(function(){

    });
  },function(){
    setTimeout(function(){
      last_watchdog_time = new Date().getTime();
      window.location.reload(true);
    },3000);

  });
}

function reportDisable(message){
  chrome.storage.local.get(null, function(data) {
    task = data.task;
    api.reportDisable(task.username,task.business_slug,message,function(data){
      if(data.success){
        var type = "receipt_error";
        if(task.order_receipts_client_status == 3){
          if(task.order_comments_client_status == 3 ){
            closeAllWindows();
          }else{
            type = "comment_error";
            reportTask(type,0,message);
          }
        }else{
          reportTask(type,0,message);
        }
      }else{
        setTimeout(function(){
          last_watchdog_time = new Date().getTime();
          reportDisable(message);
        },3000);
      }
    },function(){
      setTimeout(function(){
        last_watchdog_time = new Date().getTime();
        window.location.reload(true);
      },3000);
    });
  });
}

function reportTask(type,delay,message){
  api.reportTask(type, task.order_id, delay, message, function(data){
    if(data.success){
      setTimeout(function(){
        closeAllWindows();
      },3000);
    }else{
      setTimeout(function(){
        chrome.extension.sendMessage({cmd: 'watchdog'});
        reportTask(type,delay,message);
      },3000);
    }
  }, function(){
    setTimeout(function(){
      chrome.extension.sendMessage({cmd: 'watchdog'});
      reportTask(type,delay,message);
    },3000);
  });
}

function reportLevel(level){
  api.reportLevel(task.account_id,level,function(data){
    if(data.success){
      closeAllWindows();
    }else{
      setTimeout(function () {
        last_watchdog_time = new Date().getTime();
        reportLevel(level);
      },10000);
    }
  }, function () {
    setTimeout(function () {
      last_watchdog_time = new Date().getTime();
      reportLevel(level);
    },20000);
  });
}

function openLoginPage() {
	
}

function getAccount(callback){
  api.getAccount(task.account_id,function(data){
    if(data.success == 1){
      task.username = data.username ? data.username : task.username ;
      task.password = data.password ? data.password : task.password ;
      task.pay_password = data.pay_password ? data.pay_password : task.pay_password ;
      chrome.storage.local.set({task: task}, function() {
        callback && callback();
      });
    }else{

    }
  },function(){

  });
}

function getTask(callback) {
  api = new RemoteApi(settings);
  api.getTask(function(data) {
    console.log(data);
    if (data.success == 1) {
      chrome.storage.local.set({task: data.data,running:true}, function() {
        task = data.data;
        task_start_time = new Date().getTime();
        console.log(task);
        console.log(callback);
        callback && callback();
      });
    }
    else {
      //setTimeout(function(){last_watchdog_time = new Date().getTime();getTask(callback);}, 20000);
      var notify_message = data.message ? data.message : '';
      notify('client_id:' + settings.computer_name );
      notify('client_user:' + settings.client_user );
      console.log(notify_message);
      notify(notify_message + ' 10s后关闭');
      setTimeout(function(){
        last_watchdog_time = new Date().getTime();
        closeAllWindows();
      }, 10000);
    }
  }, function() {
    //setTimeout(function(){getTask(callback)}, 30000);
    console.log('接口请求失败');
    notify('接口请求失败 10s后关闭');
    setTimeout(function(){
      last_watchdog_time = new Date().getTime();

      closeAllWindows();
    }, 10000);
  });
}


function setCookies(callback){
  var cookies = task.cookies;
  console.log(cookies);
  console.log("set cookies");
  if(cookies){
    var length = cookies.length;
    while(length--){
      var fullCookie = cookies[length];
      //seesion, hostOnly 值不支持设置,
      var newCookie = {};
      var host_only = fullCookie.hostOnly == "false" ? false : true;
      newCookie.url = "http" + ((fullCookie.secure) ? "s" : "") + "://" + fullCookie.domain + fullCookie.path;
      newCookie.name = fullCookie.name;
      newCookie.value = fullCookie.value;
      newCookie.path = fullCookie.path;
      newCookie.httpOnly = fullCookie.httpOnly == "false" ? false : true;
      newCookie.secure = fullCookie.secure == "false" ? false : true;
      if(!host_only){ newCookie.domain = fullCookie.domain; }
      if (fullCookie.session === "true" && newCookie.expirationDate) { newCookie.expirationDate = parseFloat(fullCookie.expirationDate); }
      console.log(newCookie);
      chrome.cookies.set(newCookie);
    }
  }
  console.log("set cookies success");
  callback && callback();
}

function removeRunningData(callback) {
  chrome.storage.local.remove(['task_order', 'shop_url'], function() {
    callback && callback();
  })
}

function reloadSettings(callback) {
	chrome.storage.local.get(null, function(data) {
		settings = data.settings;
		console.log(settings);
		running = data.running;
        callback && callback();
	});
}

function closeAllWindows(callback) {
  var millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  var oneWeekAgo = (new Date()).getTime() - millisecondsPerWeek;
  chrome.browsingData.remove({
    "since": oneWeekAgo
  }, {
    "appcache": true,
    "cache": true,
    "cookies": true,
    "downloads": true,
    "fileSystems": true,
    "formData": true,
    "history": true,
    "indexedDB": true,
    "pluginData": true,
    "passwords": true,
    "webSQL": true
  }, function(){
    console.log('run closeAllWindows');
    chrome.windows.getAll(function(windows) {
      console.log('chrome.windows.getAll');
      var length = windows.length;
      var i = 0, index = 0;
      for(; i < length; i++) {
        //if (windows[i].type === 'popup') {
        //  index++;
        //  if (index == length) {
        //    callback && callback();
        //  }
        //}
        //else {
        chrome.windows.remove(windows[i].id, function() {
          index++;
          if (index == length) {
            callback && callback();
          }
        });
        //}
      }
    });
  });
}

function isValidIpv4Addr(ip) {
  return /^(?=\d+\.\d+\.\d+\.\d+$)(?:(?:25[0-9]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])\.?){4}$/.test(ip);
}

function notify(message) {
  var opt = {
    type: 'basic',
    title: '',
    message: message,
    iconUrl: 'icon.png'
  };

  chrome.notifications.create('', opt, function (id) {
    setTimeout(function () {
      chrome.notifications.clear(id, function () {

      });
    }, 10000);
  });
}