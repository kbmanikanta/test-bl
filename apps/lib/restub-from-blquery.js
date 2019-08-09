var SC = require("sling-connector");
var templateContent=require("./template-content");
var _=require("lodash");
var _path=require("path");
var collections = global.bl.collections;
const log = global.bl.logger.get("blacklight.restub");

var defaultSite = _.get(global.bl,["config","environment","defaultSite"]);
var defaultSC = new SC(_.get(global.bl.config,[defaultSite, "modes", "author", "sling"]));


var isBlQuery = /\/bl:query$/;

/**
	This function takes a sling path which resolves to a bl:query specification and will ensure all 
	appropriate auto-stubs have been added.
**/

// TODO:  how to retain the originating user id and apply to all changes made?  Or should you even do so?
// TODO:  for queue system, test failures modes, and callback timeout scenarios.  plus email alerts.

module.exports = function restubFromBlQuery(params, cb){
	var {blQueryPath, sc} = params;
	sc = sc || defaultSC;

	// function to add jobs to the post update queue
	let addPostJob = (path, form) =>{
		const postQueue = global.bl.queues.get("blacklight.edit.post-data");
		let tasks={prototype:{}, tasks:[{path, form}]};
		log.debug('Restub query job', tasks);

		postQueue.makeJob(tasks,(err,job)=>{
			if(err){log.error("Couldn't add job to 'post-data' queue", err);}
			else{
				log.info("Success adding job to 'post-data' queue:", job.id);
			}
		});
	};


	if(!isBlQuery.test(blQueryPath)){cb("Provided 'blQueryPath' does not end with 'bl:query': " + blQueryPath); return;}

	let path = blQueryPath.replace(isBlQuery, "");
	let pageMode=false, jcrContentNode="";

	log.debug("----------\nmapped-stub will try to build stubs:", path);

	sc.get(path,"infinity",(err, querySpecification)=>{
		if(err){cb("Couldn't load path: " + path, err);return;}

		//we remove the note about processing when the processing is done
		let origCb = cb;
		cb = (cbErr) => {
			addPostJob(path, {'bl:processing@Delete': "true" });
			origCb(cbErr)
		}

		var queryPath = querySpecification["bl:query"];
		var targetNode = querySpecification.targetChildPage || querySpecification.targetNode;
		var targetParts = targetNode?targetNode.split("/"):[];
		var targetPath;
		var resourceTypes = querySpecification.resourceTypes;
		var filters = querySpecification.filters;
		var slingTemplatePath = querySpecification.slingTemplate;
		var slingTemplateContent;
		var sourceMapping = querySpecification.sourceMapping;
		var allowLocalChildren = querySpecification.allowLocalChildren || false; 

		if(querySpecification.writeStubTo){
			if(!_.isArray(querySpecification.writeStubTo)){
				querySpecification.writeStubTo = [querySpecification.writeStubTo];
			}

			querySpecification.writeStubToTransform = querySpecification.writeStubToTransform ||{
				replace: '' ,
				with: ''
			}
		}


		if(!queryPath){cb("No 'bl:query' property found at path: " + path); return;}
		if(!_.isArray(resourceTypes)){cb("Must be an array. Bad 'resourceTypes' value at bl:query path: " + path); return;}
		if(resourceTypes.length !== targetParts.length){cb("There must be one 'resourceTypes' entry for each target child node pattern component at path: " + path); return;}

		
		////////////////////////////////////////////////////
		if(querySpecification.targetChildPage){
			pageMode=true;
			jcrContentNode="/jcr:content";
			let match = path.match(/(.*)\/jcr:content/);
			if(match){
				targetPath = match[1];

				var executeStubbing = () => {
					listExistingTargetChildren(targetPath, (err, children)=>{
						reconcileMissingChildren(children);
					});
				}

				if(slingTemplatePath){
					sc.getSling(slingTemplatePath + ".infinity.json",  {leaveMangledNames:true} ,(err, rawTemplateContent)=>{
						if(!err){
							slingTemplateContent = global.bl.flattenObject(rawTemplateContent);
							//we need to delete values that we can't write or that we want to control
							var propertiesToSkip = ["^jcr:content/jcr:title", "^jcr:content/sling:resourceType", "jcr:createdBy$", "jcr:created$", "jcr:lastModified$", "jcr:lastModifiedBy$", "jcr:data$", "jcr:uuid$"];
							slingTemplateContent = _.filter(slingTemplateContent, (templateItem)=>{
								return _.startsWith(templateItem.name, "jcr:content/") && !_.some(propertiesToSkip, (toSkip) => {return templateItem.name.match(toSkip);})
							});
						}
						executeStubbing();
					});
				} else{
					executeStubbing();
				}
			}else{
				cb("No jcr:content found in path.  Can't create child page: " + path); return
			}
		}else if(querySpecification.targetNode){
			let parts=path.split("/");
			while(parts.length && parts.pop()!=="bl:map"){_.noop();}
			if(!parts.length){cb("No 'bl:map' parent node found in path: "+path); return;}
			targetPath = _path.join(parts.join("/"));
			listExistingTargetChildren(targetPath, (err, children)=>{
				reconcileMissingChildren(children);
			});
		}else{
			cb("No targetNode, nor targetChildPage, specified in bl:query at: " + path); return;
		}


		///////////////////////////////////////////////////////////////
		function listExistingTargetChildren(startPath, finalCallback){
			var depth = targetParts.length;
			var results=[];

			////////////////////////////////////////////////////
			function getNextLevel(path, pathPostFix, remainingDepth, nextLevelCb){
				let fullPath = _path.join(path, pathPostFix);
				sc.getSling(`${fullPath}.${pageMode ? "2" : "1"}.json`, {leaveMangledNames:true}, (err, childData, other)=>{
					let curChildren = [];
					if(!err){
						_.each(childData,(cur,key)=>{
							if(!global.bl.namespaceRegex.test(key)){
								results.push({key: pathPostFix + key, value:cur});
								curChildren.push(pathPostFix + key);
							}							
						});
					}

					(function expandChildEntry(){
						if(curChildren.length){
							var curChild = curChildren.pop();
							if(remainingDepth-1>0){
								getNextLevel(path, pathPostFix + curChild + "/", remainingDepth-1, (err)=>{
									expandChildEntry();
								});
							}else{
								expandChildEntry();
							}
						}else{
							nextLevelCb();
						}
					})();
				});						
			}

			////////////////////////////////////////////////////
			getNextLevel(startPath, "", depth, ()=>{
				let sorted=_.sortBy(results,"key");
				let finalResult={};
				_.each(sorted,(item)=>{finalResult[item.key]=item.value;});
				finalCallback(null, finalResult);										
			});
		}



		///////////////////////////////////////////////////////////////
		function reconcileMissingChildren(existingTargetChildren){
			var queryString="";
			if(filters){
				sc.stashMeta(filters);
				queryString = global.escape(JSON.stringify(filters));
			}
			var queryUrl; 

			var orderBy = querySpecification.orderBy || '';
			var orderByType = querySpecification.orderByType ? '&orderbyType=' + querySpecification.orderByType : ''; 
			var limit = querySpecification.limit || '-1';

			if(sc.queryType === 'loki'){
				queryUrl =  `/bin/collections/query${queryPath}?filters=${queryString}&orderby=${orderBy}`;
			}else{
				queryUrl = `/bin/collections/query?path=${queryPath}&filters=${queryString}&count=${limit}&orderby=${orderBy}${orderByType}`;
			}
			sc.getSling(queryUrl, {leaveMangledNames:true}, (err, validSourcePages)=>{
				if(err){cb("Problem resolving map query: " + queryPath, err); return;}
				if(validSourcePages.results){
					validSourcePages = _.map(validSourcePages.results,'path');
				}
				let handledParentPaths=[];

				// for each child node not already in the resultQuery, add them all to a single appending sling post, which when done will add all stubs in at once.
				// also, don't you need to delete any existing stubs that are not in the validSourcePages?


				// Problem: how do you reverse-map from the "existing children" which ones are a result of this particular auto-mapping?
				// Question: do you disallow two different auto mappings from intermingling in such a way that they could be confused?
				//	Question: do you require an uambiguous (eg, strict?) collections entry for all target pages, so that types etc can always be extracted?  (I'm thinking NOT ... doesn't really add much)

				// Question: what if there is an existing page/node that matches the mapped name, but is not auto-stubbed?  Do you then mark it as auto-stubbed?  NO.  You need to leave it alone.


				let sourcePages = _.clone(validSourcePages);
				let sourceCollection;
				let targetNodeTagRegex = /\{(\:?[\w-]+)\}/g;
				let allNewNodes = [], templatedValidSources = [], deactivations = [], deletions = [];

				/*****  validate that the targetNode pattern includes only applicable wildcards  ***/
				let allowedTags = [":name"];
				let problemFound=false;

				if(sourcePages.length){
					sourceCollection = collections.testPath(sourcePages[0]);


					if(sourceCollection){
						allowedTags = allowedTags.concat(_.keys(sourceCollection.params));
					}


					let referencedTags=targetNode.match(targetNodeTagRegex);
					if(referencedTags){
						_.forEach(referencedTags, (tag)=>{
							if(!allowedTags.includes(tag.replace(/\{|\}/g,""))){
								problemFound="bl:query child target path includes unknown tag: " + tag + "\nat Sling path: " + blQueryPath;
								return false;
							}
						});

						if(problemFound){cb(problemFound); return;}
					}


					/*********************    Add missing nodes   ******************/

					_.each(validSourcePages, (sourcePath)=>{
						var pathInfo = collections.testPath(sourcePath);
						var curTargetPath = targetNode;
						_.each(pathInfo.params, (val,key)=>{
							curTargetPath = curTargetPath.replace("{" + key + "}", val);
						});
						templatedValidSources.push(curTargetPath);


						if(!existingTargetChildren[curTargetPath]){
							let curParentParts = curTargetPath.split("/").slice(0,-1);
							let curParentPath = "";
							_.each(curParentParts,(parentPart, idx)=>{
								curParentPath = curParentPath + (curParentPath?"/":"") + parentPart;
								if(!handledParentPaths.includes(curParentPath)){
									handledParentPaths.push(curParentPath);
									log.debug("Creating parent folder ", curParentPath ," of type:", resourceTypes[idx]);
									if(pageMode){
										allNewNodes.push({name:_path.join(curParentPath, "jcr:primaryType"), value:"cq:Page"})
										allNewNodes.push({name:_path.join(curParentPath, "jcr:content", "jcr:primaryType"), value:"cq:PageContent"})
										allNewNodes.push({name:_path.join(curTargetPath, "jcr:content", "jcr:title"), value: global.bl.prettyName(parentPart)})
									}
									var templateContentResult = templateContent({resourceType: resourceTypes[idx], targetPath: (sourceMapping ? sourcePath : _path.join(targetPath,curParentPath)) , prefix: curParentPath + jcrContentNode});
									if(_.isArray(templateContentResult)){
										allNewNodes = allNewNodes.concat(templateContentResult);
									}else{
										if(pageMode){
											allNewNodes.push({name:_path.join(curParentPath, "jcr:content","sling:resourceType"), value:resourceTypes[idx]})
										}else{
											allNewNodes.push({name:_path.join(curParentPath,"sling:resourceType"), value:resourceTypes[idx]})
										}
									}
								}
							});

							var resourceType = resourceTypes[curParentParts.length];

							if(pageMode){
								allNewNodes.push({name:_path.join(curTargetPath, "jcr:primaryType"), value:"cq:Page"})
								if(slingTemplateContent){
									_.each(slingTemplateContent, (templateItem)=>{
										allNewNodes.push({name:_path.join(curTargetPath, templateItem.name), value:templateItem.value});
									});
								}else{
									allNewNodes.push({name:_path.join(curTargetPath, "jcr:content", "jcr:primaryType"), value:"cq:PageContent"})
								}
								allNewNodes.push({name:_path.join(curTargetPath, "jcr:content", "jcr:title"), value: global.bl.prettyName(curTargetPath.split("/").slice(-1)[0])})
								allNewNodes.push({name:_path.join(curTargetPath, "jcr:content", "bl:autoStubbed"), value: sourcePath})
							}else{
								allNewNodes.push({name:_path.join(curTargetPath, "bl:autoStubbed"), value: sourcePath})
							}

							var templateContentResult = !slingTemplateContent ? templateContent({resourceType, targetPath: sourceMapping ? sourcePath : _path.join(targetPath, curTargetPath), prefix: curTargetPath + jcrContentNode, forceChildMap: querySpecification.childMap}) : '';
							if(_.isArray(templateContentResult)){
								allNewNodes = allNewNodes.concat(templateContentResult);
							}else{
								if(pageMode){
									allNewNodes.push({name:_path.join(curTargetPath, "jcr:content","sling:resourceType"), value:resourceType})
								}else{
									allNewNodes.push({name:_path.join(curParentPath,"sling:resourceType"), value:resourceType})
								}
							}

							if(querySpecification.writeStubTo){
								_.each(querySpecification.writeStubTo ,(path) =>{
									let writeToStubValue = sourcePath.replace(new RegExp(querySpecification.writeStubToTransform.replace), querySpecification.writeStubToTransform.with);
									allNewNodes.push({name: pageMode ? _path.join(curTargetPath, "jcr:content", path) : _path.join(curTargetPath, path), value: writeToStubValue});	
								});
							}


							log.debug("creating:", _path.join(targetPath, curTargetPath), " of type ", resourceType);

						}
					});

				}


				//**********  Delete superfluous nodes ********************************************//
				if(!allowLocalChildren){
					_.each(existingTargetChildren, (existingChild, childSubPath)=>{
						if(pageMode ? _.get(existingChild, "jcr:content.bl:autoStubbed") : existingChild["bl:autoStubbed"]){
							let currentIsValid=false;

							// TODO: for multi-segment target paths, make sure not to delete parent folders that have children which shouldn't be deleted
							if(!templatedValidSources.includes(childSubPath)){
								allNewNodes.push({name:childSubPath + "@Delete", value: "true"})

								if(pageMode){
									deactivations.push(_path.join(targetPath, childSubPath));
								}
								log.debug("DELETE THIS:", childSubPath, existingChild, allNewNodes);
							}
						}


						//  do you need to allow more free-form mappings?  and if free-form, how do you reverse-map?  build a regex to rewrite the pattern as a regex.   /\{(\:?[\w]+)\}/g  =>  ([^\/]+)

						//	  what you need is to find the existing entries that were previously auto-stubbed, but no longer belong and must be deleted.  That's where you apply this:
						//  		1. must match regex derived from "targetNode" pattern.  2. must be auto-stubbed  3. must match expected resource type?     and 4. no longer exists in source list (i.e. in "validSourcePages").

						//  TODO: auto-delete the parent folder, if it is auto-stubbed and has no children anymore.

					});
				}


				//  TODO: Any other possible operations besides add and delete?  ... what about "reorder"?  and possibly "rename"?

				// TODO: update local bl:query params to exclude local page, upon delete of that local page



				let throttledRequests = [];
				let reqIdx = 0;
				//need to throttle the number of formParms to ~500
				_.each(allNewNodes, (item)=>{
					//Need to group the initial page creation otherwise oak exception occurs
					if(_.endsWith(item.name,'jcr:primaryType') && _.size(throttledRequests[reqIdx]) > 450) {
						reqIdx++;
					}
					if(throttledRequests.length < (reqIdx + 1)){
						throttledRequests.push({});
					}
					throttledRequests[reqIdx][item.name]=item.value;
					if(_.isArray(throttledRequests[reqIdx][item.name])){
						throttledRequests[reqIdx][item.name + "@TypeHint"]="String[]";
					}

					if(_.size(throttledRequests[reqIdx]) > 500){
						reqIdx++;
					}
				});

				_.each(deletions, (deletion) => {
					throttledRequests.push({[deletion.name]: deletion.value});
				});



				/***************************/
				// actually add our params to the queue for processing
				/***************************/
				_.each(deactivations, deactivation => {
					if (!_.includes(deactivation, "jcr:content")){	
						addPostJob("/bin/replicate.json", {path: deactivation, cmd: 'deactivate'});
					}else{
						log.error("Bad path replication requested from stub", deactivation); 
					}
				});

				_.each(throttledRequests, (throttled)=>{
					addPostJob(targetPath, throttled);
				});

				log.info('Added ' + (_.size(deactivations) + _.size(throttledRequests)) + ' post update jobs.' );
				cb();
			});
		}
	});

}