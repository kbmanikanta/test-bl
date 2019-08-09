var _ = require('lodash');
module.exports.process = function(data, $, cb){
	data.isFoss = $.sc.foss;

	if($.express.req.headers["x-user-info"]){
		var userInfo = JSON.parse($.express.req.headers["x-user-info"]);
		data.author = userInfo.firstName|| $.sc.username;
		if(userInfo.lastName){data.author = data.author + ' ' + userInfo.lastName}
	}else{
		data.author = $.sc.username;
	}

	if(data.author && data.author.indexOf('@')>-1){data.author = data.author.substring(0, data.author.indexOf('@'))}
	cb(null, undefined, {contentType:"application/javascript; charset=utf-8"});
}