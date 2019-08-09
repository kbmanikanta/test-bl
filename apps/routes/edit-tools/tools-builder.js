var _=require("lodash");
var _path=require("path");
var fs=require("fs");
var TOOLS_ROUTES_DIR = 'tools';

module.exports = function($, callback){

	var appsRoot =_path.join(global.bl.appRoot, "apps");
	var staticTreeContent = {};

	////////////////////////////////
	var noOpRoute = function(suffix){
		return $.blConfig.appsMount + 'blacklight/edit/edit-tools/default' + (suffix ? (suffix[0] === '/' ? suffix : '/' + suffix ): '');
	};

	////////////////////////////////
	var completedCalls = 0;
	var needToComplete = 0;
	var callCompleted = function(){
		completedCalls = completedCalls + 1;

		if(completedCalls >= needToComplete){
				/////////////////////////////
				var fixChildren = function(obj){
					if(obj.children){
						obj.children = _.sortBy(_.values(obj.children), 'title');
						_.each(obj.children, function(item){
							fixChildren(item);
						});
					}
				};

				_.each(staticTreeContent, function(siteObj, site){
					siteObj.title = global.bl.config[site].title;
					siteObj.key = noOpRoute(site);

					//need to default the title / key on the module levels if a tools route isn't defined
					_.each(siteObj.children, function(moduleObj, module){
						moduleObj.title = global.bl.prettyName(module.replace(/^\d+-/,""));
						moduleObj.key = moduleObj.key || noOpRoute(site + '/' + module);
					});

					fixChildren(siteObj);
				});

				staticTreeContent = _.sortBy(_.values(staticTreeContent), 'title')

				callback(staticTreeContent);
		}
	};

	////////////////////////////////
	var getAllChildRoutes = function (path, valuePrefix, routePrefix){
		var jsToCheck = path.split('/').pop();
		var isToolsRoot = jsToCheck === TOOLS_ROUTES_DIR; //want to effectively treat this as the module level

		fs.readdir(path,function(err,files){
			if(!err){
				var newValuePrefix = isToolsRoot ? valuePrefix : (valuePrefix + '.children.' + jsToCheck);
				var newRoutePrefix = routePrefix + '/' + jsToCheck;

				_.set(staticTreeContent, newValuePrefix, {
					title: global.bl.prettyName(jsToCheck.replace(/^\d+-/,"")),
					key: _.includes(files, jsToCheck + '.js') ? newRoutePrefix : noOpRoute(newRoutePrefix)
				});

				needToComplete+=files.length;
				_.each(files, function(file){
					getAllChildRoutes(path + '/' + file, newValuePrefix, newRoutePrefix);
				});
			}
			callCompleted();
		});
	};

	needToComplete += _.size(global.bl.sites);
	_.each(global.bl.sites,function(siteObj, site){
		var siteRoot = _path.join(appsRoot, site);
		fs.readdir(siteRoot,function(err,files){
			if(!err){
				needToComplete+=files.length;
				files.sort();
				_.each(files, function(file){
					var moduleKey = file;
					var moduleToolsRoot=_path.join(siteRoot, file,'routes', TOOLS_ROUTES_DIR);
					getAllChildRoutes(moduleToolsRoot, site + '.children.' + moduleKey, $.blConfig.appsMount + site + '/' + file);
				});
			}
			callCompleted();
		});
	});

}