$(function() {
  restoreSettings();

  //保存
  $('#save').on('click', function() {
    saveSettings(function() {
      chrome.runtime.sendMessage({cmd: 'reload_settings'}, function() {
        alert('保存成功');
      })
    })
  });

  //保存并开始任务
  $('#saveAndStart').on('click', function() {
    saveSettings(function() {
      chrome.storage.local.set({running: true}, function() {
        chrome.runtime.sendMessage({cmd: 'reload_settings'}, function() {
          //chrome.runtime.sendMessage({cmd: 'start_task'});
          chrome.runtime.sendMessage({cmd: 'start_page'});
        })
      })
    })
  })
});


function restoreSettings() {
  chrome.storage.local.get('settings', function(data) {
    if (data.settings) {
            //机器号
        $('#computer_name').val(data.settings.computer_name);
            // 显示是否自动领单
        if(data.settings.auto_start){
            document.getElementById("auto_task").checked = true;
        }else{
          document.getElementById("auto_task").checked = false;
        }
      if(data.settings.item_only){
        document.getElementById("item_only").checked = true;
      }else{
        document.getElementById("item_only").checked = false;
      }
            //显示当前窗口的用户
        $('#client_user').val(data.settings.client_user);
    }
  });
}

function saveSettings(callback) {
  var computer_name = $('#computer_name').val();
  var client_user = $('#client_user').val();
  client_user = $.trim(client_user);
  var auto_start = document.getElementById("auto_task").checked ? true : false;
  var item_only = document.getElementById("item_only").checked ? true : false;
  var settings = {
    computer_name: computer_name,
    auto_start: auto_start,
    item_only: item_only,
    client_user: client_user
  };
  chrome.storage.local.set({settings: settings}, function() {
    callback && callback();
  })
}