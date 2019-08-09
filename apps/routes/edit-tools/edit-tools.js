var _=require("lodash");
var toolsBuilder = require('./tools-builder');

module.exports.process=function(data, $, cb){

	toolsBuilder($, function(staticTreeContent){
		data.blConfig.staticTreeContent = staticTreeContent;
		cb();
	});

	// This is where the main framed HTML page is loaded.
	data.blConfig = $.blConfig;
	data.blConfig.modes={
		view:{icon:"visibility"}, 
		documentation : {icon : "library_books", title: "Documentation", prefix: global.bl.appsMount + "blacklight/edit/documentation/"}
	}
	data.config.breadcrumb.push({name:"Tools", link:data.blConfig.appsMount + "blacklight/edit/tools"})
	global.bl.modules.modelHelpers.blacklight.edit.setFrameScripts(data);
}




