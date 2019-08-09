var _=require("lodash");
var _path=require("path");

//**********************************************************************************************/
module.exports.process = function(data, $, cb){

 	var helpers = global.bl.modules.modelHelpers;

	_.assign(data, helpers.blacklight.edit.getPageData($.express.req));

	data.blConfig.treeBasePath = "/etc/tags";
	data.blConfig.treeDataType = "tags";
	data.blConfig.hasPageListingCapability = false;
	data.blConfig.defaultFrameMode = "edit";

	data.blConfig.modes={
		edit:{icon:"mode_edit", prefix: global.bl.appsMount + "blacklight/edit/page/"}
	}

	data.menuItems={
		add:{
			linkAttributes:'data-target="bl-add-tag-dialog"',
			title:"Add tag"},

		delete:{
			linkAttributes:'data-target="bl-delete-tag-dialog"',
			title:"Delete tag", divider:true  },
	}


	data.scripts.js.push("blacklight/edit/js/tag-manager-client.js");

	helpers.blacklight.edit.setFrameScripts(data);
	helpers.blacklight.edit.processScripts(data, $.express.req.bl.config.publicMount);

	data.config.breadcrumb.push({name:"Tags", link:data.blConfig.appsMount + "blacklight/edit/tagging"})


 	cb();

}