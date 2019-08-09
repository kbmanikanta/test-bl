var _=require("lodash");
var fs=require("fs");
var appRoot = global.bl.appRoot + "/";

module.exports.process = function(data, $, cb){

	var installedModules, moduleClientHelpers, moduleClientSites;
	var res=$.express.res;

	if(!moduleClientHelpers){
		moduleClientHelpers={};
		moduleClientSites=[];
		installedModules = global.bl.moduleLoader.listInstalledModules();


		_.each(installedModules, function(module){
			var modulePath=module.replace(".","/");
			var parts = module.split(".");
			var site  = parts.shift();
			var modId = parts.shift();

			if(moduleClientSites.indexOf(site)<0){
				moduleClientSites.push(site);
			}

			var path =  "apps/" + modulePath + "/client-helpers.js";

			if(fs.existsSync(appRoot + path)){
				var key=
				moduleClientHelpers[module]={path: "/" + path, site:site, module:modId, code: fs.readFileSync(appRoot + path)};
			}
		});
	}


	data.helpers=moduleClientHelpers;
	data.sites=moduleClientSites;
	cb(null, undefined, {contentType:"application/javascript; charset=utf-8"});
}