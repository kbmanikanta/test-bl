var _ =require("lodash");
var _path=require("path");
var exec=require("child_process").exec;
var async = require('async');
var fs=require('fs');
var logger;


module.exports=function(data, $, cb){
	logger = $.log;
	var req=$.express.req;
	var parts=req.path.split("/");
	var action = parts[2];
	var parentPath = req.query['parentPath'];
	var newPageName = req.query['newPageName'];

	if(parentPath){
		data.listing=getComponentRootPaths();
		data.namedPageTypes = [];

		/*
			1. pull in the page.js for the resource type of the provided page path
			2. If is has an allowedChildPageTypes field, return / invoke that.
			3. If not, check the model-helpers.js for each module and invoke the childPageConstraints function, if it exists
			4. Order the results for each module based on the module the providedPage is in and the important flag for each page result
		*/

		var slingPath= parentPath+ "/jcr:content.1.json";
		$.sc.getSling(slingPath, {leaveMangledNames: true},function(err, slingData){
			try{
				//make sure no error and there is page data
				if(!err && slingData && slingData["sling:resourceType"]){
					var rtype=slingData["sling:resourceType"];
					var pageInfo = buildPageInfo(parentPath, rtype, newPageName);
					var pageJs = getPageJsFromType(rtype);
					if(pageJs && pageJs.allowedChildPageTypes){
						if(_.isFunction(pageJs.allowedChildPageTypes)){
							pageJs.allowedChildPageTypes(pageInfo, $, function(pageTypes){
								data.namedPageTypes = groupAndSortPageTypes(getNamedTypesFromTypes(pageTypes), rtype);
								cb();
							});
						}else{
							data.namedPageTypes = groupAndSortPageTypes(getNamedTypesFromTypes(pageJs.allowedChildPageTypes), rtype);
							cb();
						}
					}else{

						//a list of file paths to search for page types
						var pageTypeSearchPaths = [];
						var addSearchPath = function(site, module){
							_.each(getComponentRootPaths(), function(root){
								var possiblePath = _path.join(root, site, module);
								if(fs.existsSync(possiblePath)){
									pageTypeSearchPaths.push(possiblePath);
								}
							});
						};

						//get the site or all of them
						var parentSite = rtype ? rtype.split('/')[0] : '';
						var sites;
						if(parentSite && global.bl.modules.modelHelpers[parentSite]){
							sites = _.pick(global.bl.modules.modelHelpers, parentSite)
						}else{
							sites = global.bl.modules.modelHelpers;
						}

						//always execute the find function
						var asyncFunctions = [
							function(asyncCb){
								if(_.size(pageTypeSearchPaths)){
									findPageTypesInPaths(pageTypeSearchPaths, function(namedTypes){
										_.each(namedTypes, function(namedType){
											data.namedPageTypes.push(namedType);
										});
										asyncCb();
									});
								}else{
									asyncCb();
								}
							}
						];


						_.each(sites, function(modules, site){
							//iterate each module
							_.each(modules, function(helpers, module){
								var constraintsFunc = helpers.childPageConstraints;
								if(constraintsFunc && _.isFunction(constraintsFunc)){
									asyncFunctions.push(function(asyncCb){
										constraintsFunc(pageInfo, global.bl.modules.modelHelpers, function(types){
											//add the result from this module to the overall list
											_.each(getNamedTypesFromTypes(types), function(namedType){
												data.namedPageTypes.push(namedType);
											});
											asyncCb();
										}, $);
									});
								}else{
									//just fallback to file system find
									addSearchPath(site, module);
								}
							});
						});


						//now we need to deal with the modules that just use the find
						//then order the results
						async.parallel(asyncFunctions,

							/* async complete */
							function(){
								data.namedPageTypes = groupAndSortPageTypes(data.namedPageTypes, rtype);
								cb();
							}
						);
					}
				}else{
					cb({stack: '', templateText :"Invalid 'parentPath' parameter received: " + parentPath + ". Err received: " + err});
				}
			}	catch(e){
				cb(e);
			}
		});
	}else{
		cb({stack: '', templateText :"Must provide 'parentPath' parameter."});
	}

};

///////////////////////////////////////////
/* order logic
	1. suggested first (and by ranking inside there)
	2. same module as parent page
*/
function groupAndSortPageTypes(pageTypes, parentType){
	var groups = {};
	_.each(pageTypes, function(type){
		//get section
		var section = type.rank ? 'suggested' : type.type.split('/').slice(0,2).join('/');

		//create the group if not already present
		if(!groups[section]){
			groups[section] = [];
		}

		groups[section].push(type);

	});
	//sort the suggest items by rank
	if(groups.suggested){
		groups.suggested.sort(function(item1, item2){
			return item1.rank - item2.rank;
		});
	}

	var ordered = _.map(groups, function(types, section){
		return {name: section, types: types};
	});

	ordered.sort(function(item1, item2){
		if(item1.name === 'suggested'){
			return -1;
		}else if(item2.name === 'suggested'){
			return 1;
		}else if(parentType){
			if(parentType.indexOf(item1.name) === 0){
				return -1;
			}else if(parentType.indexOf(item2.name) === 0){
				return 1;
			}else{
				return 0;
			}
		}else{
			return 0;
		}
	});

	return ordered;
};

///////////////////////////////////////////
function getComponentRootPaths(){
	var allCompRoots = {};
	//iterate through each site and find the componentRoot for each one
	_.each(_.without(_.keys(global.bl.config),"environment"),function(key){
		_.each(_.get(global.bl.config[key], 'componentRoots'), (root) => allCompRoots[root] = true);
	});

	return _.reduce(allCompRoots, (result, value, root) => {
		result.push(_path.resolve(root));
		return result;
	}, []);
};

///////////////////////////////////////////
var typeRegex = new RegExp('^(' + getComponentRootPaths().join('|') + ')/(.*)/page.js$');
function findPageTypesInPaths(paths, cb){
	var execCmd = "find -L " + (_.isArray(paths) ? paths.join(' ') : paths) + " -name 'page.js' ";
	exec(execCmd,
		function(err, stdout, stderr){
			if(err){cb(err);return;}
			var types = _.map(stdout.split("\n"),function(val){return val.replace(typeRegex, "$2")});
			types = _.filter(types, function(type){return type;});

			cb(getNamedTypesFromTypes(types));
		}
	);
};


///////////////////////////////////////////
function getNamedTypesFromTypes(types){
	//do a require on each of the page.js found
	var namedTypes = [];
	_.each(types, function(type){
		var rank;
		if(_.isObject(type)){
			rank = type.rank;
			type = type.type;
		}

		var pageJs = getPageJsFromType(type);
		if(pageJs){
			if(pageJs.title){
				namedTypes.push({
					title: pageJs.title,
					type: type,
					rank: rank
				});
			}
		}else{
			logger.warning('No page.js found for ' + type);
		}
	});

	return namedTypes;
};

///////////////////////////////////////////
function getPageJsFromType(pageType){
	//iterate through each of the component roots
	var pageJs;
	_.each(getComponentRootPaths(), function(root){
			//try to do a require on the page.js
			try{
				pageJs = require(_path.join(root, pageType, 'page.js'));
				pageJs = pageJs && pageJs.page;
				return;
			}catch(e){/*do nothing*/}
	});

	return pageJs;
};

///////////////////////////////////////////
function buildPageInfo(parentPath, parentType, newPageName){
	var pathParts = parentPath.split('/');
	return {
		parent: {
			path: parentPath,
			type: parentType,
			name: pathParts[pathParts.length - 1]
		},
		newPage: {
			name: newPageName,
			path: newPageName ? parentPath + '/' + newPageName : ''
		}
	};
};
