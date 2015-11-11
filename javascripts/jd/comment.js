//order_comment
var task = null;
var settings = null;

var item_id = null;
var item_only = null;
var business_oid = null;

var running = null;

var api = null;

chrome.extension.sendMessage({cmd: 'watchdog'});

console.log('order_comment');

messageListener();

storageData();

/**
 * 初始化数据
 */
function storageData(){
	console.log("storage data");
	chrome.storage.local.get(null, function(data) {
		chrome.extension.sendMessage({cmd: 'watchdog'});

		//data = {
		//	task:{
		//		order_comments_body:'衣服质量很不错，做工也很精良，款式穿着大气',
		//		item_id:'1784784607',
		//		business_oid: '10411324496',
		//		anonymous:true,
		//		item_only:false,
		//		custom_tags:'good'
		//		//share:{
		//		//	id: 8961,
		//		//	status: 2
		//		//},
		//		//pictures:[
		//		//	{picture:'/Public/Uploads/Shares/201510/20151010124756_41035.jpg'}
		//		//]
		//	},
		//	running:true,
		//	settings:{
		//		client_id : 'hn_009',
		//		running : true
		//	}
		//};

		task = data.task;
		settings = data.settings;
		item_id = task.item_id ? task.item_id : null;
		item_only = task.item_only ? true : false;
		business_oid = task.business_oid;


		console.log('task');
		console.log(task);
		console.log('settings');
		console.log(settings);

		running = data.running;
		console.log('running');
		console.log(running);

		api = new RemoteApi(settings);
		checkOrder()
	})
}

/**
 * 页面最大化
 * @param callback
 */
function documentZoom(callback){
	if (running && settings) {
		api = new RemoteApi(settings);
		chrome.extension.sendMessage({cmd: 'zoom'});
		callback && callback()
	}else{
		storageData()
	}
}

function messageListener(){
	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
		if(message.cmd === 'reloaded'){

		}else if(message.cmd == 'zoom'){
			setTimeout(function () {
				chrome.extension.sendMessage({cmd: 'watchdog'});
				checkOrder()
			},500)
		}else if(message.cmd == 'tags'){
			var product_id = message.product_id ? message.product_id : item_id;
			var hot_tags = message.tags ? message.tags : null;
			var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
			var tags = comt_box.find('.tags-list .tag-item a');
			console.log(tags);
			cancelTag(tags.first());
			if(hot_tags && hot_tags.length > 0){
				productHotTags(product_id, hot_tags)
			}else{
				productTags(product_id)
			}
		}
	})
}

/**
 * 确保打开的订单页面  是任务中需要执行的订单
 */
function checkOrder(){
	var href = location.href;
	if(href.indexOf(business_oid) != -1){
		checkTaskData()
	}else{
		console.log('当前打开的不是任务中的订单');
		console.log('返回订单列表');
		location.href = 'http://order.jd.com/center/list.action'
	}
}

function checkTaskData(){
	if( ! task.order_comments_body){
		console.log('无评价内容');
		return false
	}
	commentComplate()
}

function checkComment(){
	var comt_order = $('#evalu01').find('.comt-plists');
	if(comt_order.length <= 0){
		console.log('没有找到订单显示部分');
		commentRelay('没有找到订单显示部分');
		return false
	}
	var comt_plist = comt_order.find('.comt-plist');
	if(comt_plist.length <= 0){
		console.log('无订单商品显示');
		commentRelay('无订单商品显示');
		return false
	}
	//var comment_btns = comt_plist.find('.op-btns a[voucherstatus="0"]');

	if(item_only){
		clue('仅评价主商品');
		var item = comt_plist.find('.op-btns a[alt="'+ item_id +'"]');
		if(item.attr('voucherstatus') != 0 && item.text().indexOf('点击评价') == -1){
			console.log('仅评价主商品');
			console.log('主商品已评价');
			commentSuccess('仅评价主商品');
			return true
		}
	}else{
		clue('评价赠品');
		var comment_btns = comt_plist.find('.op-btns a:contains("点击评价")');
		console.log(comment_btns);
		if(comment_btns.length <=0){
			console.log('已全部评价');
			commentSuccess('已全部评价');
			return true
		}
	}
	showCommentBox()
}

/**
 * 评价商品
 */
function showCommentBox(){
	var btn = item_only ? $('a[alt="'+ item_id +'"][voucherstatus="0"]') : $('.op-btns a:contains("点击评价")');
	if(btn.length <= 0 ){
		checkComment()
	}else{
		chrome.extension.sendMessage({cmd: 'watchdog'});
		btn[0].click();
		setTimeout(function () {
			chrome.extension.sendMessage({cmd: 'watchdog'});
			checkComtBox()
		},10000)
	}
}

function checkComtBox(){
	var comt_box = $('.comt-box:visible');
	if(comt_box.length <= 0){
		showCommentBox()
	}else{

	}
}

function productComment(product_id){
	console.log('评价商品'+product_id);
	chrome.extension.sendMessage({cmd: 'watchdog'});
	//var btn_9 = $('a[alt="'+ product_id +'"][voucherstatus="0"]');
	var btn_9 = $('a[alt="'+ product_id +'"]:contains("点击评价")');
	if(btn_9.length >0){
		var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
		if(comt_box.length <= 0){
			console.log('没有找到'+ product_id +'评价框');
			return false
		}
		productScore(product_id)
	}
	else{

	}
}

function productScore(product_id){
	var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
	console.log('商品打5分');
	var star5 = comt_box.find('a.star5');
	if(star5.length <= 0){
		console.log('没有找到商品评5分');
		return false
	}

	if(star5.hasClass('active')){
		var tags = comt_box.find('.tags-list .tag-item a');
		if(tags.length >0){
			getHotCommentTagStatistics(product_id)
		}else{
			productXinde(product_id)
		}
	}else{
		//star5.addClass('active');
		star5[0].click();
		setTimeout(function () {
			chrome.extension.sendMessage({cmd: 'watchdog'});
			productScore(product_id)
		},1000)
	}
}

function productHotTags(product_id, hot_tags){
	console.log('从热门标签随机1-4个标签');
	randTags(product_id,hot_tags);
	//var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
	//var tags = comt_box.find('.tags-list .tag-item a');
	//var recommends = [];
	//tags.each(function(i){
	//	var tag = $(this).text();
	//	var index = $.inArray(tag, hot_tags);
	//	if(index != -1){
	//		recommends.push(tag)
	//	}
	//});
	//if(recommends.length > 0){
	//	console.log('推荐标签中含有经过识别为非差的标签，从中随机1-4个打上');
	//	randTags(product_id,recommends);
	//}else{
	//	console.log('从热门标签随机1-4个标签');
	//	randTags(product_id,hot_tags);
	//}
}

function randTags(product_id, tags){
	var num = new Date().getTime();
	num = num.toString().substr(-2);
	num = num%4;
	num = parseInt(num) + 1;
	if(tags.length > num){
		var product_tags = 	[];
		var k = 0;
		do{
			if(k >= num){
				break;
			}
			var tag_index = parseInt(Math.random() * tags.length);
			var tag = tags[tag_index];
			if($.inArray(tag, product_tags) == -1){
				product_tags.push(tag);
				k++
			}
		}while(1);
		findTags(product_id, product_tags)
	}else{
		findTags(product_id, tags)
	}
}

function productTags(product_id){
	var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
	//var report_tags = [];
	console.log('评价商品打标签');
	chrome.extension.sendMessage({cmd: 'watchdog'});
	var custom_tags =  task.custom_tags.split(',');
	var tags = comt_box.find('.tags-list .tag-item a');
	console.log(tags);
	findTags(product_id, custom_tags);
	//for(var i in custom_tags){
	//	var custom_tag = custom_tags[i];
	//	tags.last().after('<a class="tag-txt old-tag" href="javascript:void(0);" vid="'+ i +'">'+ custom_tag +'</a>');
	//	setTag(comt_box.find('.tags-list .tag-item a[vid="'+ i +'"]'));
	//	if(i+1 == custom_tags.length){
	//		productXinde(product_id)
	//	}
	//}
}

function getHotCommentTagStatistics(product_id){
	chrome.extension.sendMessage({cmd: 'watchdog'});
	chrome.extension.sendMessage({cmd: 'tags',product_id: product_id});
}

function findTags(product_id, tags){
	for(var i in tags){
		var tag = tags[i];
		getTag(product_id, i ,tag);
		var index = parseInt(i) + 1;
		if(index == tags.length){
			productXinde(product_id)
		}
	}
}

function getTag(product_id, i, tag){
	var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
	var recommend_tags = comt_box.find('.tags-list .tag-item a');
	var recommend_tag = comt_box.find('.tags-list .tag-item a[vid="'+ i +'"]');
	if(recommend_tag.length > 0 && recommend_tag.text() == tag){
		selectTag(recommend_tag)
	}else{
		recommend_tags.last().after('<a class="tag-txt old-tag" href="javascript:void(0);" vid="'+ i +'">'+ tag +'</a>');
		setTimeout(function () {
			getTag(product_id, i ,tag)
		},500)
	}
}

function cancelTag(obj){
	if(obj.hasClass('tag-txt-selected')){
		var objobj = obj[0];
		var eventClick = new MouseEvent('click', {'view': window, 'bubbles': true, 'cancelable': true});
		var eventMove = new MouseEvent('mousemove', {'view': window, 'bubbles': true, 'cancelable': true});
		var eventDown = new MouseEvent('mousedown', {'view': window, 'bubbles': true, 'cancelable': true});
		var eventUp = new MouseEvent('mouseup', {'view': window, 'bubbles': true, 'cancelable': true});
		var eventBlur = new MouseEvent('blur', {'view': window, 'bubbles': true, 'cancelable': true});

		objobj.dispatchEvent(eventMove);
		objobj.dispatchEvent(eventDown);
		objobj.dispatchEvent(eventClick);
		obj.click();
		objobj.dispatchEvent(eventUp);
		objobj.dispatchEvent(eventBlur);
		obj.removeClass('tag-txt-selected');
	}else{

	}
}

function selectTag(obj){
	if(obj.hasClass('tag-txt-selected')){

	}else{
		var objobj = obj[0];
		var eventClick = new MouseEvent('click', {'view': window, 'bubbles': true, 'cancelable': true});
		var eventMove = new MouseEvent('mousemove', {'view': window, 'bubbles': true, 'cancelable': true});
		var eventDown = new MouseEvent('mousedown', {'view': window, 'bubbles': true, 'cancelable': true});
		var eventUp = new MouseEvent('mouseup', {'view': window, 'bubbles': true, 'cancelable': true});
		var eventBlur = new MouseEvent('blur', {'view': window, 'bubbles': true, 'cancelable': true});

		objobj.dispatchEvent(eventMove);
		objobj.dispatchEvent(eventDown);
		objobj.dispatchEvent(eventClick);
		obj.click();
		objobj.dispatchEvent(eventUp);
		objobj.dispatchEvent(eventBlur);
		obj.addClass('tag-txt-selected');
	}
}

function productXinde(product_id){
	setTimeout(function () {
		chrome.extension.sendMessage({cmd: 'watchdog'});
		var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
		var area = comt_box.find('textarea');
		if(area.length <= 0){
			console.log('没有找到商品心得输入框')
		}
		Writing(area, task.order_comments_body, function () {
			if(area.val() == task.order_comments_body){
				area.blur();
				productCommentAnonymous(product_id)
			}else{
				productXinde(product_id)
			}
		})
	},3000)
}

function productCommentAnonymous(product_id){
	var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
	if(task.anonymous){
		clue('匿名评价');
		var anonymousFlag = comt_box.find('#anonymousFlag');
		if(anonymousFlag.length > 0){
			anonymousFlag.attr('checked',true)
		}
	}else{
		clue('非匿名评价');
	}
	setTimeout(function () {
		chrome.extension.sendMessage({cmd: 'watchdog'});
		productCommentSubmit(product_id)
	},1000)
}

function productCommentSubmit(product_id){
	var comt_box = $('.comt-box[oid="'+ business_oid +'"][pid="'+ product_id +'"]:visible');
	var setcomment = comt_box.find('.setcomment');
	if(setcomment.length > 0){
		chrome.extension.sendMessage({cmd: 'watchdog'});
		setcomment[0].click()
	}
}

/**
 * 四项评分
 */
function serviceScore(){
	console.log('四项评分');
	var score = $('.score:visible');
	if(score.length > 0){
		var commstars = $('div[class="score"] > dl[class="ev-list"] > dd > span[class="commstar"]');
		if(commstars.length > 0){
			for(var i = 0;i < commstars.length;i++){
				console.log("选最后一个满分");
				var star_last = $(commstars[i]).find('a:last');
				if(star_last.length > 0){
					star_last[0].click()
				}
			}
			var service_score_submit = $('a[class="btn-5"]');
			if(service_score_submit.length > 0){
				console.log("四项评分提交按钮");
				setTimeout(function(){
					chrome.extension.sendMessage({cmd: 'watchdog'});
					service_score_submit[0].click()
				},1000)
			}
		}else{
			taskDone()
		}
	}else{
		taskDone()
	}
}

function taskDone(){
	var comt_order = $('#evalu01').find('.comt-plists');
	if(comt_order.length <= 0){
		console.log('没有找到订单显示部分');
		commentRelay('没有找到订单显示部分');
		return false
	}
	var comt_plist = comt_order.find('.comt-plist');
	if(comt_plist.length <= 0){
		console.log('无订单商品显示');
		commentRelay('无订单商品显示');
		return false
	}
	//var comment_btns = comt_plist.find('.op-btns a[voucherstatus="0"]');

	if(item_only){
		var item = comt_plist.find('.op-btns a[alt="'+ item_id +'"]');
		if(item.attr('voucherstatus') != 0 && item.text().indexOf('点击评价') == -1){
			chrome.extension.sendMessage({cmd: 'task_done'})
		}
	}else{
		var comment_btns = comt_plist.find('.op-btns a:contains("点击评价")');
		console.log(comment_btns);
		if(comment_btns.length <=0){
			console.log('已全部评价');
			chrome.extension.sendMessage({cmd: 'task_done'})
		}else{

		}
	}
}

function showSubmit(pictures){
	if(pictures){
		var imgs = '';
		for(var i in pictures){
			var picture = pictures[i];
			imgs += i>0 ? ',' : '';
			imgs += '//img30.360buyimg.com/shaidan/'+picture.res
		}
		var product_name = $('.pro-info[oid="'+ business_oid +'"][pid="'+ item_id +'"]').find('.p-name a').text();
		var data = {
			imgs: imgs,
			productId:item_id,
			orderId: business_oid,
			anonymousFlag: task.anonymous ? 1 : 0,
			productName: encodeURI(product_name)
		}
	}else{

	}
}

var observer = new MutationObserver(function(mutations) {
	mutations.forEach(function (mutation) {
		if(mutation.type == 'characterData') {
			console.log(mutation.type);
			var target = mutation.target;
			if(target.data && target.data.indexOf('1-500字') != -1){
				//console.log(target.parentNode);
				//parentNodeUntilComtBox(target)
			}
			else if(target.data && target.data.indexOf('麻烦填写0-500个字哦')!=-1){

			}
			else if(target.data && target.data.indexOf('给商品打个标签呗')!=-1){
				//window.location.reload(true)
			}
			else if(target.data && target.data.indexOf('最多能打五个标签呦，思考一下')!=-1){
				window.location.reload(true)
			}
		}else if(mutation.type == 'childList'){
			//console.log('childList');
			//console.log(mutation.target);
			//console.log(mutation);
			if(mutation.target.className == 'ui-dialog'){
				if(mutation.target.innerText.indexOf('评价成功') != -1){
					//showCommentBox()
					window.location.reload(true)
				}
				else if(mutation.target.innerText.indexOf('屏蔽词') != -1){
					commentReplace(mutation.target.innerText)
				}
			}else if(mutation.target.className === "score"){
				console.log("出现四项评分");
				if(mutation.addedNodes.length > 0){
					console.log("出现四项评分提交");
					serviceScore()
				}
			}
		}else if(mutation.type == 'attributes'){
			if(mutation.target.className.indexOf('comt-box')!=-1){
				if(mutation.attributeName == 'style' && mutation.oldValue == null) {
					currentComtBox(mutation.target)
				}
			}
			else if(mutation.target.className === "score-succ" && mutation.target.hidden === false){
				console.log("感谢您的评分  是可见状态");
				taskDone()
			}
		}else{

		}
	})
});

observer.observe(document.body, {
	attributes: true,
	childList: true,
	characterData: true,
	subtree: true,
	attributeOldValue: true
});

function commentSuccess(msg){
	console.log('评价成功 report');
	chrome.extension.sendMessage({cmd: 'watchdog'});
	msg = msg ? msg : '';
	api.reportTask("comment_success", task.order_id, 0, msg, function(){
		chrome.extension.sendMessage({cmd: 'watchdog'});
		serviceScore()
	}, function(){
		chrome.extension.sendMessage({cmd: 'watchdog'});
		setTimeout(function(){
			chrome.extension.sendMessage({cmd: 'watchdog'});
			commentSuccess(msg);
		},5000);
	});
}

function commentRelay(msg){
	chrome.extension.sendMessage({cmd: 'watchdog'});
	var order_id=task.order_id;
	var delay= 24*3600;
	msg = msg ? msg : "";
	api.reportTask('comment_error', order_id, delay, msg, function(){
		chrome.extension.sendMessage({cmd: 'watchdog'});
		setTimeout(function(){
			chrome.extension.sendMessage({cmd: 'watchdog'});
			chrome.extension.sendMessage({cmd: 'task_done'});
		},4000);
	}, function(){
		chrome.extension.sendMessage({cmd: 'watchdog'});
		setTimeout(function(){
			chrome.extension.sendMessage({cmd: 'watchdog'});
			commentRelay(msg);
		},5000);
	});
}

function currentComtBox(target){
	var attrs = target.attributes;
	var oid = null;
	var pid = null;
	var style = null;
	for (var i in attrs) {
		var attr = attrs[i];
		if (attr.name == "oid") {
			oid = attr.value;
		} else if (attr.name == 'pid') {
			pid = attr.value;
		} else if (attr.name == 'style') {
			style = attr.value;
		}
	}
	console.log('oid:' + oid);
	console.log('pid:' + pid);
	console.log('style:' + style);
	if (oid && oid == business_oid && pid && style.indexOf('none') == -1) {
		productComment(pid)
	}
}

function commentReplace(text){
	var word=text.split('屏蔽词');
	word=word[1];

	word=word.split('，');
	word=word[0];

	word=word.split('“');
	word=word[0]?word[0]:word[1];
	word=word.split('”');
	word=word[0]?word[0]:word[1];
	reportReplaceWords(word,function(){
		chrome.extension.sendMessage({cmd: 'watchdog'});
		word = word.toUpperCase();
		do{
			var word_rep = new Array( word.length + 1 ).join( '。' );
			task.order_comments_body = task.order_comments_body.replace(word,word_rep);
			var temp=task.order_comments_body.split(word);
		}while(temp.length!=1);
		var comt_box = $('.comt-box:visible');
		if(comt_box.length > 0){
			var product_id = comt_box.attr('pic');
			productXinde(product_id)
		}
	});


	//chrome.storage.local.set({task:task},function(){
	//	window.location.reload(true)
	//})
}

function reportReplaceWords(word, callback){
	chrome.extension.sendMessage({cmd: 'watchdog'});
	var words = [word];
	api.reportReplaceWord(words, business_oid, function(data){
		if(data.success){
			callback && callback()
		}
		else{
			callback && callback()
		}
	}, function(){
		callback && callback()
	})
}

function commentComplate(){
	console.log(task.order_comments_body);
	console.log('去除空。处理已知屏蔽词');
	var re_str = ' ';
	task.order_comments_body = task.order_comments_body.replace(new RegExp(re_str,'gm'),'');
	task.order_comments_body = task.order_comments_body.toUpperCase();
	var strs = ['天瘦','买卖','天猫','MD','一B','TM','口交','DIY','AV','QQ群','C4','——','~','～','TMD','X东','TB','T猫','A片'];
	for(var i in strs){
		var str = strs[i];
		var rep = new Array( str.length + 1 ).join( '。' );
		task.order_comments_body = task.order_comments_body.replace(new RegExp(str,'gm'),rep)
	}

	var length=checksum(task.order_comments_body);
	console.log(length);
	if(length == 1){
		task.order_comments_body += " "
	}
	length=checksum(task.order_comments_body);
	if(length < 10){
		console.log("length < 10");
		do{
			var position = Math.round(length * Math.random());
			var position_valid = false;
			if(position>1 && position<length){
				position_valid=true
			}
		}while(!position_valid);
		task.order_comments_body=task.order_comments_body.substr(0,position)+"。"+task.order_comments_body.substr(position);
		commentComplate()
	}else{
		showCommentBox()
	}
}


//功能：统计包含汉字的字符个数
//说明：汉字占1个字符，非汉字占0.5个字符
function checksum(chars){
	var sum = 0;
	for (var i=0; i<chars.length; i++)
	{
		var c = chars.charCodeAt(i);
		if ((c >= 0x0001 && c <= 0x007e) || (0xff60<=c && c<=0xff9f))
		{
			sum++;
		}
		else
		{
			sum+=2;
		}
	}

	return Math.floor(sum/2);
}
