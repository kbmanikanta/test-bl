var _=require("lodash");

//**********************************************************************************************/
module.exports.process = function(dialogData, $, cb){

	let req=$.express.req;
	let isFolder = /[f|F]older/;

	var curPath = req.query.parentPath;
	dialogData.parentPath = "/fake/things";

	$.sling.get(curPath, 1, (err, data)=>{
		if(isFolder.test(data._jcr_primaryType)){
			dialogData.parentPath = curPath;
			cb();
		}else{
			curPath = curPath.split("/");
			curPath.pop();
			curPath=curPath.join("/");
			$.sling.get(curPath, 1, (err, data)=>{
				if(isFolder.test(data._jcr_primaryType)){
					console.log("This is a folder:", curPath, data);
					dialogData.parentPath = curPath;
					cb();
				}else{
					cb("Neither child nor parent path components are folders: " + req.query.parentPath);
				}
			});

		}
	})


}