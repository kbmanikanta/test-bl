var _=require("lodash");
var _path=require("path");

//**********************************************************************************************/
module.exports.process = function(data, $, cb){

 	var helpers = global.bl.modules.modelHelpers;

	data.menuItems=[
		// {title:"Create folder"},  // how do you specify the click action? 
		// {title:"Upload from disk"},
		// {title:"Upload from URL"},
		{title:"Upload from FS Library", id:"fshr.shared.fsImageLibraryUploader"}		
	]

 	cb();

}