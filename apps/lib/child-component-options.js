
var _=require("lodash");
var fs=require("fs");
var util=require("util");
var glob=require("glob");
var globCache={};
var componentRoot = global.bl.appRoot + "components";
var 	siteRegex =/^[^\/]*$/,
		moduleRegex = /^[^\/]*\/[^\/]*$/,
		globRegex = /\*|\{|\(|\!/;
		
var componentIcons={
	"pages":"insert_drive_file",
	"pages-secondary":"check_box_outline_blank",
	"content":"view_comfy",
	"content-secondary":"blur_on",
	"layouts":"dashboard",
	"layouts-secondary":"dashboard"
}


if(global.bl){
	global.bl.componentWatch.on("change",(f)=>{globCache={}})
}

module.exports = function(parentPath, slingConnector, options, cb){

	if(!parentPath){handleError("You must specify 'parentPath' as a query string parameter.");return;}
	var collections = global.bl.collections;
	var prettyName=global.bl.prettyName;
	var componentRegistry= global.bl.componentRegistry;
	var allTypes=[], parentResourceType=options.parentType;
	var keepAddingMore=true, existingChildren=[];
	var defaultRule, jcrContent;
	var reasons=[], moduleId, siteId;
	var writeMergeMetaMarking = "";

	/// TODO: this "isDeveloperMode" thing short circuits some useful stuff at the 
	var isDeveloperMode=false; //parentPath.match(/.*\/blacklight\/develop\/components\/(.*)\/jcr:content\/template/);
	if(isDeveloperMode){
		parentResourceType=isDeveloperMode[1];
	}


	function findModuleIdFromParentType(){
		moduleId = parentResourceType ? parentResourceType.split("/").slice(0,2).join("/") : "";
		siteId = parentResourceType ? parentResourceType.split("/").shift() : "";
	}

	var componentFolder = options.pageMode ? "pages" : "content";


	var results={
		suggested:[], 
		pageMode: options.pageMode,
		componentMode: options.componentMode
	};


	if(options.externalConfig){
		findModuleIdFromParentType();
		if(options.externalConfig.inherit){
			var parentParts = parentPath.split('/jcr:content/');
			var pagePath = parentParts[0];
			var relativeParentPathParts = _.size(parentParts) > 1  ? parentParts[1].split('/') : [];
			//get the jcr:content.infinity of the current page
			slingConnector.getSling(pagePath + '/_jcr_content.infinity.json', (err, data)=>{
				if(!err && data){
					var parentPar;
					var lastPathChecked;
					while(relativeParentPathParts.length > 1 && !parentPar){
						relativeParentPathParts.pop();
						lastPathChecked = pagePath + '/jcr:content/' + relativeParentPathParts.join('/');
						var tempParent = _.get(data, relativeParentPathParts.join('.') + '.bl:parsys');
						if(tempParent && !tempParent.inherit){
							parentPar = tempParent; 
						}
					}

					if(parentPar){
						options.externalConfig.allowed = parentPar.allowed;
						options.externalConfig.suggested = parentPar.suggested;
						reasons.push({msg:"Inherited bl:parsys (allowed and suggested)", detail:'<strong>From </strong>' + lastPathChecked, result:parentPar});
					}
				}
				checkParentComponentRules();
			});
		}else{
			checkParentComponentRules();
		}
	}else if(!parentResourceType){
		var childQuery=parentPath + ".1.json";
		slingConnector.getSling(childQuery, (err, slingChildren)=>{
			if(options.pageMode){jcrContent="_jcr_content.";}       // todo: this doesn't work for component's getSling();
			parentResourceType=_.get(slingChildren, jcrContent + "_sling_resourceType");
			findModuleIdFromParentType();
			existingChildren=Object.keys(slingChildren)
			reasons.push({msg:"Checked for existing children", detail:childQuery, result:existingChildren})
			if(options.pageMode){
				checkCollections();
			}else{
				checkParentComponentRules();
			}
		});
	}else{
		findModuleIdFromParentType();
		if(options.pageMode){
			checkCollections();
		}else{
			checkParentComponentRules();
		}		
	}


	/************************************************************************************/
	function checkCollections(){
		var collection = collections.testPath(parentPath);
		reasons.push({msg:"Checked for collection", detail:parentPath, result:collection?(collection):"None found."})
		if(collection && collection.children){
			if(collection.children.allowed){
				categorizeComponentsByModule(collection.children.allowed, results.suggested);
				reasons.push({msg:"Found collection rule", detail:parentPath + "<br>(see previous log entry for details)", result:results.suggested})

				if(collection.children.strict){
					reasons.push({msg:"Collection rule is strict. Finishing.", detail:parentPath})
					finalizeSelections(); return;
				}
			}else{
				if(!collection.children.strict){
					reasons.push({msg:"No child pages specified in collection, but not strict. Proceeding."})
					checkParentComponentRules();return;
				}
				var msg="No child pages can be placed under this parent page."
				reasons.push({msg: "Collection rule: "+msg, detail:parentPath, result:results.suggested})
				results.noChildrenAllowed = msg;
				results.noChildrenReason = "Prohibited by collection rule at: " + collection.pathTemplate;
				finalizeSelections(); return;
			}
			//data.suggested.push()
		}
		
		reasons.push({msg:"Collection rule is not strict. Continuing.", detail:parentPath, result:"OK"})
		checkParentComponentRules();
	}



	/************************************************************************************/
	function categorizeComponentsByModule(optionsArray, targetArray){
		var byCategory={};
		_.each(optionsArray, (pageRules, pageName)=>{
			var type=pageRules.type || pageRules, noClassFound=false, forceInclude=pageRules.forceInclude;
			if(_.isNumber(pageName)){pageName="";}
			var id=type  +  (pageName?(":" + pageName):"");
			if(allTypes.indexOf(id)<0){
				var component = componentRegistry.get(type), includeIt=false;
				var title = pageRules.title || (component?component.title:"");
				var parts = type.split("/"), componentClass, longName=[];
				for (var i = parts.length; i-- > 0 && !componentClass; ){
					if(/^(content|pages|layouts)$/.test(parts[i])){componentClass=parts[i];}
				}
				if(!componentClass){noClassFound=true;}
				componentClass=componentClass||"pages";

				if(componentClass===componentFolder || componentClass==="layouts" || noClassFound || forceInclude){
					_.each(parts.slice(2),(part)=>{longName.push(global.bl.prettyName(part, {allCaps:true}));})
					var category = parts[0] + "/" + parts[1];
					if(!title){title=prettyName(parts[parts.length-1]);}

					if(parts[2]!==componentFolder){
						var extra=parts[2];
						componentClass=componentClass + "-secondary";
						if(parts[2]==="pages"){extra = parts[3];}
						if(!pageRules.title){title=prettyName(extra) + " / " + title};
					}


					byCategory[category]=byCategory[category] || [];

					if(pageName==="*" && pageRules.allowed){
						_.each(pageRules.allowed, (options, allowedName)=>{
							byCategory[category].push({ type:type, componentClass, longName:longName.join(" / "), icon: componentIcons[componentClass], title: options.title || title, name: allowedName, unavailable:existingChildren.indexOf(allowedName)>-1?"unavailable":false });
						});
					}else{
						byCategory[category].push({ type:type, componentClass, longName:longName.join(" / "), icon: componentIcons[componentClass], title, name: (pageName==="*" ? "" : pageName), unavailable:existingChildren.indexOf(pageName)>-1?"unavailable":false });
					}
					allTypes.push(id);
				}
			}
		});
		
		var keys=_.keys(byCategory).sort();
		for(var step=0; step<3; step++){
			_.each(keys,(key)=>{
				var includeKey=false;
				var isModuleKey = key===moduleId;
				var isSiteKey = key.indexOf(siteId)===0;
				if(step===0 && isModuleKey){
					includeKey=true;
				}else if (step===1 && isSiteKey && !isModuleKey){
					includeKey=true;
				}else if (step===2 && !isSiteKey && !isModuleKey){
					includeKey=true;
				}
				if(includeKey){
					var options=byCategory[key];
					var parts=key.split("/");
					key = prettyName(parts[0]) + " / " + prettyName(parts[1]);
					targetArray.push({category:key, options})
				}
			})
		}
	}


	/************************************************************************************/
	function checkParentComponentRules(){
		var suggested=[], allowed=[], childRules, parentComponent;
		if(options.externalConfig){
			reasons.push({msg:"Using external config, sent via URL", result:options.externalConfig})
			childRules={suggested: options.externalConfig.suggested, allowed: options.externalConfig.allowed}
		}else{
			if(parentResourceType){
				parentComponent = componentRegistry.get(parentResourceType);


				/// possibilities for "childRules" setting:
				///   nothing specified 								// falls back to top-level items under "pages" in current module
				///   [] 													// no child pages allowed here
				///   ["item1","item2",]   							//  only those specific items allowed
				///	{suggested:["item1","item2"]} 				//  preferred items, but system default if others allowed
				///	{suggested:["item1","item2"], allowed:["item3","item4"]}  //  specified preferences, plus specific others; none but these two groups allowed

				var nonEmptyArr = function(arr){
					var filteredArr = _.filter(arr, (item)=>{return _.size(item);});
					if(filteredArr && _.size(filteredArr)){
						return filteredArr 
					}else {
						return null; 
					}
				}; 


				if(options.pageMode){
					//check for allowedChildPages set in GUI
					childRules=nonEmptyArr(_.get(parentComponent, "config.page.allowedChildPages"));
					reasons.push({msg:"Checking parent component rules in allowedChildPages", detail:parentResourceType, result:childRules?childRules:"No rules found."}); 

					if(!childRules){
						//check for allowedChildPages in container
						childRules=nonEmptyArr(_.get(parentComponent, "container.allowedChildPages"));
						reasons.push({msg:"Checking parent component rules in container.allowedChildPages", detail:parentResourceType, result:childRules?childRules:"No rules found."})
					}

					if(!childRules){
						//check for allowedChildPages in model-helper.js for module
						var modelHelpersResult = _.get(global.bl.modules.modelHelpers, [siteId, moduleId, 'allowedChildPages']); 
						if(modelHelpersResult){
							if(_.isFunction(modelHelpersResult)){
								childRules = modelHelpersResult(parentPath, parentResourceType);
							}else if(_.isArray(modelHelpersResult)){
								childRules = nonEmptyArr(modelHelpersResult);
							}else{
								childRules = modelHelpersResult;
							}
						}
						reasons.push({msg:"Checking module rules in model-helpers.allowedChildPages", detail:parentResourceType, result:childRules?childRules:"No rules found."})
					}

					if(!childRules){
						//check for allowedChildPages in model-helper.js for all modules in the site
						//and glob search for 
						var getPageTypesForSite = function(siteId){
							var globInclude = []; 
							var aggregatedTypes = []; 
							_.each(global.bl.modules.modelHelpers[siteId], function(funcs, moduleId){
								if(funcs.allowedChildPages){
									var modelHelpersResult = funcs.allowedChildPages(parentPath, parentResourceType, global.bl.modules.modelHelpers	);

									if(_.isString(modelHelpersResult)){
										aggregatedTypes.push(modelHelpersResult); 
									}else if(_.isArray(modelHelpersResult)){
										_.each(modelHelpersResult, function(item){
											aggregatedTypes.push(item); 
										})
									}
									reasons.push({msg:`Checking module rules in ${siteId}.${moduleId} model-helpers.allowedChildPages`, result:modelHelpersResult.length?modelHelpersResult:"No rules found."})
								}else{
									globInclude.push(moduleId);
								}						
							}); 

							var globSet = globInclude.length ? (globInclude.length === 1 ? globInclude[0]: '{' + globInclude.join(',') + '}') : '*';
							var globSearch = `${siteId}/${globSet}/**/${componentFolder}/**`; 
							var globMatches = resolveGlob(globSearch);
							_.each(globMatches, function(item){
								aggregatedTypes.push(item);
							});
							return aggregatedTypes.length ? aggregatedTypes : null; 
						}
						//try to get just for this site
						childRules = getPageTypesForSite(siteId); 

						if(!childRules){
							var allSitesResult = []; 
							//get for all sites
							_.each(global.bl.modules.modelHelpers, function(module, localSiteId){
								if(localSiteId !== siteId){ //we already know there are no results for this one
									_.each(getPageTypesForSite(localSiteId), function(item){
										allSitesResult.push(item);
									});
								}
							});

							if(allSitesResult.length){
								childRules = allSitesResult; 
							}
						}
					}
				}else{
					_.each(_.get(parentComponent, "container.includes"), function(include,idx){
						if(parentPath.match(new RegExp("/"+include.name + "$"))){
							childRules = include.eccItems;
							if(include.noMerge || include.noMerge===false){
								writeMergeMetaMarking = include.noMerge;
							}
							return false;
						}
					});
					reasons.push({msg:"Parent component specified allowed child components, in container.include", detail:parentResourceType, result:childRules})
				}


				if(_.isFunction(childRules)){
					childRules=childRules({
						slingPath: parentPath, 
						parentType: parentResourceType,

						get: function(patterns){
							var results=[];
							if(!_.isArray(patterns)){patterns=[patterns];}
							_.each(patterns, function(pattern){								
								_.each(resolveGlob(pattern, "container.js in "+ parentResourceType), (resolved)=>{
									results.push({type:resolved});
								});
							});
							return results;
						}
					}, 
					componentRegistry);
				}
			}else{
				reasons.push({msg:"No parent resource type.", details:"What next?"})
			}
		}

		if(!childRules){    	/// Fall back to system default if 'childRules' not specified
			childRules={};
			resolveDefaultRule();
			reasons.push({msg:"No child rules in parent component, so using a default rule.", details:parentResourceType, result:defaultRule})
			if(results.suggested.length){ childRules.allowed=[defaultRule];}
			else{ childRules.suggested=[defaultRule]; }
		}else{   				/// else normalize 'childRules' for final processing
			if(_.isString(childRules)){childRules=[childRules]}
			if(_.isArray(childRules)){
				childRules = {suggested:childRules, allowed:[]};
			}else{
				if(childRules.suggested && !childRules.allowed){
					resolveDefaultRule();
					childRules.allowed = [defaultRule];
				}
				if(_.isString(childRules.suggested)){childRules.suggested=[childRules.suggested];}
				if(_.isString(childRules.allowed)){childRules.allowed=[childRules.allowed];}
			}
		}
		/// at this point, "suggested" & "allowed" should exactly correspond with "suggested" & "allowed" needed in JSON reponse.
		var mapping={suggested:"suggested",allowed:"allowed"};
		_.each(mapping,(targetKey, sourceKey)=>{
			var sources=childRules[sourceKey];
			if(!sources){return;}
			var targets=[];
			var resolved;
			sources.forEach((pattern,idx)=>{
				if(pattern){
					if(pattern.type){pattern=pattern.type;}
					var originalPattern=pattern;
					if(siteRegex.test(pattern)){
						pattern = pattern + "/*/" + componentFolder + "/*";
					}else if(moduleRegex.test(pattern)){
						pattern = pattern + "/" + componentFolder + "/*";
					}else if(!globRegex.test(pattern)){
						targets.push({type: pattern, forceInclude: true});return;
					}

					_.each(resolveGlob(pattern, "'" + targetKey + "' parent component rule " + ((pattern!==originalPattern)?("expansion of "+originalPattern):"")  ), (resolved)=>{
						targets.push({type:resolved});
					});

					if(pattern === "*/*/**/*parsys*"){
						targets.push("foundation/components/parsys");
					}
				}
			})

			if(targets.length){
				results[targetKey]=results[targetKey]||[];
				categorizeComponentsByModule(targets, results[targetKey]);
			}
		});

		if(results.suggested && !results.suggested.length){ // if suggested is empty, make allowed the suggested
			results.suggested=results.allowed;
			results.allowed=null;
		}

		finalizeSelections(); return;
	}


	/************************************************************************************/
	function resolveDefaultRule(){
		if(defaultRule){return defaultRule;}

		var parts=parentResourceType?parentResourceType.split("/"):[];
		defaultRule = `${parts[0]}/${parts[1]}/**/${componentFolder}/*`;
		var matches=resolveGlob(defaultRule, "resolving site-level default rule");
		if(!matches.length){
			defaultRule=`${parts[0]}/*/**/${componentFolder}/*`;      					/// Grab all site-level pages if module-level resolution comes up with squat.
			reasons.push({msg:"Default rule: No match for this module, expanding scope to this site.", detail:defaultRule})
			matches=resolveGlob(defaultRule);
			if(!matches.length){

				
				defaultRule=`*/*/**/${componentFolder}/*`;
				reasons.push({msg:"Default rule: No match for this site, expanding scope to all sites.", detail:defaultRule})
			} 			/// Grab all pages for all sites, if we can't resolve anything relative to parent type.
		}else{
			reasons.push({msg:"Found default rule.", detail:defaultRule})
		}
		results.defaultRule=defaultRule;
	}


	/************************************************************************************/
	function resolveGlob(pattern, source){
		if(!globCache[pattern]){
			globCache[pattern] = glob.sync(pattern, {cwd:componentRoot}).filter( (file)=>!/\./.test(file) );
		}

		reasons.push({msg:"Resolving glob", detail:pattern + (source?("<br><b>From:</b> "+source):""), result:globCache[pattern]})
		return globCache[pattern];
	}



	/************************************************************************************/
	function finalizeSelections(){
		results.hideSearch = allTypes.length<12;
		results.writeMergeMetaMarking=writeMergeMetaMarking;
		results.reasons=reasons;

		if(options.pageMode){
			//remove any resource types that have been added that aren't actually valid
			var removedTypes = []; 
			var validateTypes = function(categories){
				function validPageFilter(entry){
					var rType = entry.type; 

					var comp = componentRegistry.get(rType);
					var valid = comp && (_.get(comp, 'config.page.component_type') === 'is_page' || _.get(comp, 'container.componentType') === 'page'); 

					if(!valid){
						removedTypes.push(rType);
					}
					return valid; 
					
				}; 

				//need to remove any categories that no longer have options
				_.each(categories, function(category){
					if(category.options){
						category.options = _.filter(category.options, validPageFilter);
					}
				});

				return _.filter(categories, function(cat){return _.size(cat.options)});

			}


			results.suggested = validateTypes(results.suggested); 
			results.allowed = validateTypes(results.allowed); 

			results.reasons.push({msg:"Removing invalid page types", detail:"No config.page.component_type or container.componentType === 'page'", result:removedTypes});
		}
		// console.log("RESULTS:", util.inspect(results.suggested,{depth:5}) );
		cb(null, results);
	}

	/************************************************************************************/
	function handleError(message){
		cb(message, results);
	}

}




		// 1. check the collections schema

		// 2. if no collections OR collection is not strict, 
		//		- check the custom child page rules (specified in container.js and/or in .content.json)
		// 	- allows for glob patterns to be specified at certain points (such as container.js)

		// 3. if no custom child page rules, OR custom rules allow it, then:
		//		check "pages" and "content" file system conventions under "components" folder - container.js can specify allowed scope of browse outside (this module, site, all sites)
		// 	- `components/fshr/property/pages` ... `components/fshr/property/content`
		// 	- any direct child of pages is available as a page to add ...
		// 	- any direct child of components is available as a component to add to a parsys


		// collection response possiblities:  
		//		path falls under a collection, and it is strict
		//				a) child is allowed here,  b) child is not allowed here
		//    path falls under a collection tree, but it is not strict
		//		path does not fall under any collection

		//   extra case:  for "new page" situation, when holder page has already been placed




