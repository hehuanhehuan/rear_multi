
/**
 * 晒单
 * @return void
 */

function Show(share,pictures){
    //var sendUrl = 'http://club.jd.com/index.php?mod=OrderBbs&action=ajaxImageUpload';
    var sendUrl = 'http://club.jd.com/myJdcomments/ajaxUploadImage.action';
    var front_host = 'http://www.popsd.com';
    var manage_host = 'https://disi.se';

    var jd_img_host = '//img30.360buyimg.com/shaidan/';

    this.pictures = pictures;

    function reportPictureSuccess(id,url){
        var post_data = {
          id:id,
          url:url
        };
        $.post('',post_data,function(){

        });
    }

    function reportPictureFail(id){
        var post_data = {id:id};
        $.post('',post_data,function(){

        });
    }

    this.getImg = function(i,success,error){
        var pic = pictures[i];
        console.log(pic);
        var imgsrc = '';
        if(pic.admin){
            imgsrc = manage_host  + pic.picture;
        }else{
            imgsrc = front_host + pic.picture;
        }

        console.log('get img');

        //BlobBuilder= window.MozBlobBuilder|| window.WebKitBlobBuilder|| window.BlobBuilder;

        var xhr = new XMLHttpRequest();
        var obj = this;
        xhr.open('GET', imgsrc, true);
        xhr.responseType = 'blob';

        //xhr.responseType ='arraybuffer';

        xhr.onload = function(e) {
            if (this.readyState==4){
                if (this.status == 200 || this.status == 304) {
                    //var uInt8Array =new Uint8Array(this.response);
                    // //this.response == uInt8Array.buffer
                    //console.log(this.response == uInt8Array.buffer);
                    //console.log(uInt8Array.buffer);
                    //console.log(this.response);

                    //var blob=new Blob([this.response], {type:'image/jpeg'});
                    //var url = webkitURL.createObjectURL(blob);
                    var blob = this.response;
                    console.log(blob);

                    obj.submitImg(i,blob,success,error);//提交图片
                }else{
                    console.warn('get img result error',this.response);
                    error && error();
                }
            }else{
                console.warn('get img error',this);
                error && error();
            }
        };

        obj.mouseEvent($('.upload-btn').find('a'), xhr.send())
    };

    this.mouseEvent = function(obj,callbcak){
        var eventClick = new MouseEvent('click', {'view': window, 'bubbles': true, 'cancelable': true});
        var eventOver = new MouseEvent('mouseover', {'view': window, 'bubbles': true, 'cancelable': true});
        var eventMove = new MouseEvent('mousemove', {'view': window, 'bubbles': true, 'cancelable': true});
        var eventDown = new MouseEvent('mousedown', {'view': window, 'bubbles': true, 'cancelable': true});
        var eventUp = new MouseEvent('mouseup', {'view': window, 'bubbles': true, 'cancelable': true});
        var eventBlur = new MouseEvent('blur', {'view': window, 'bubbles': true, 'cancelable': true});
        var eventKeydown = new MouseEvent('keydown', {'view': window, 'bubbles': true, 'cancelable': true});
        var eventKeyup = new MouseEvent('keyup', {'view': window, 'bubbles': true, 'cancelable': true});
        obj[0].dispatchEvent(eventMove);
        obj[0].dispatchEvent(eventOver);
        obj[0].dispatchEvent(eventDown);
        obj[0].dispatchEvent(eventClick);
        obj[0].dispatchEvent(eventUp);
        obj[0].click();
        callbcak && callbcak()
    };

    this.submitImg = function(i,file,success,error){

        console.log('submit img');
        var formData = new FormData();
        formData.append('name', '20151010120443_43719.jpg');
        formData.append('PHPSESSID', 'mvpjl6muuk705ipboi3ia0b461');
        formData.append('Filedata', file);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', sendUrl, true);
        xhr.onload = function(e) {
            if (this.readyState==4){
                if (this.status == 200) {
                    console.log(this.response);
                    pictures[i].res = this.response;
                    console.log('success'+pictures[i].picture);
                    var q = parseInt(i) + 1;
                    if(q == pictures.length){
                        showSubmit(pictures)
                    }
                    //var res = 'http://img30.360buyimg.com/shaidan/' + this.response;
                    //var input = $(".img-list input");
                    //console.log(input);
                    //for(var q=1,r=input.length;r>q;q++){
                    //    var s=$('.img-list input[name="imgs'+q+'"]').val();
                    //    console.log(s);
                    //    if(s){
                    //        continue;
                    //    }
                    //    $('.img-list input[name="imgs'+q+'"]').val(res);
                    //    if(q == pictures.length){
                    //        showSubmit();
                    //    }
                    //    break;
                    //}
                    success && success(res);
                }else{
                    //提交未成功
                    console.warn('submit img error',this);
                    error && error();
                }
            }else{
                console.warn('submit img error',this);
                error && error();
            }
        };

        xhr.send(formData);  // multipart/form-data

    };

    this.submit = function(func){
        if(this.pictures){
            for(var i in pictures){
                //var e = parseInt(i)+1;
                this.getImg(i,function(){
                    //if(e == pictures.length){}
                },function(){
                    //if(e == pictures.length){}
                });
            }
        }else{

        }
        func && func();
    };

    this.capture = function(){
        chrome.extension.sendMessage({cmd: 'watchdog'});
        chrome.runtime.sendMessage({cmd: 'capture'},function(response){});
    }
}


