var _=require("lodash");
var _path=require("path");

//**********************************************************************************************/
module.exports.process = function(data, $, cb){

 	var helpers = global.bl.modules.modelHelpers;

	_.assign(data, helpers.blacklight.edit.getPageData($.express.req));

	data.blConfig.treeBasePath = "/content/dam/";
	data.blConfig.treeDataType = "assets";
	data.blConfig.defaultFrameMode = "edit";

	data.blConfig.modes={
		view:{icon:"visibility"},
		edit:{icon:"mode_edit", prefix: global.bl.appsMount + "blacklight/edit/page/"}
	}

	data.menuItems={
		create_new_folder:{
			title:"Add folder"
		},

		add:{
			title:"Add asset",
			icon:"add_to_photos"
		},

		delete:{
			title:"Delete asset", divider:true
		},
	}


	data.scripts.js.push("blacklight/edit/js/media-client.js");

	helpers.blacklight.edit.setFrameScripts(data);
	helpers.blacklight.edit.processScripts(data, $.express.req.bl.config.publicMount);

	data.config.breadcrumb.push({name:"Media", link:data.blConfig.appsMount + "blacklight/edit/media"})


 	cb();

}