/* globals _, module, require, Materialize */

module.exports=function($, window, options){
	"use strict";
	var utils=require("./utils.js")($, window);
 	var blProxy=options.supressSlingProxy?"":window.BL.config.slingProxyPrefix;
 	var tree={};
 	var hasPageListingCapability = options.hasPageListingCapability;
 	var allowedLanguages = window.BL.config.allowedLanguages;
 	var langRegex;

 	//window.BL.utils=utils;


 	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.init=function($el, slingPath, dataProcessor, options){
		var defaults;

 		if(_.isArray(slingPath)){
 			options = dataProcessor;
 			defaults = {
				source: slingPath,
				selectMode: 3,
				autoScroll: true
			};
		}else{
			if(typeof $el==="string"){$el = $($el);}

			var loadNodes;

			if(typeof dataProcessor==="string"){
				if(dataProcessor==="pages"){
					dataProcessor=tree.slingPageProcessor;
				}else if(dataProcessor==="tags"){
					dataProcessor=tree.tagProcessor;
				}else if(dataProcessor === 'assets'){
					dataProcessor = tree.assetProcessor;
					loadNodes = tree.assetsLoadNodes;
				}
			}

			loadNodes = options.loadNodes || loadNodes || (hasPageListingCapability?tree.listingServiceLoadNodes:tree.slingLoadNodes);

			defaults={
				source: loadNodes(slingPath, dataProcessor), // note: dataProcessor is ignored if 'listingServiceLoadNodes' is used.
				selectMode: 3,
				autoScroll: true,
				lazyLoad: function(event, data) {
					var url=data.node.key;
					data.result = loadNodes(url, dataProcessor);
				},

				activate: function(event,data){
					//console.log("Tree - activate node: ", data.node.key);
				},

				dblclick: function(event, data){
					window.alert(data.node.key);
				}, 
				renderTitle: function(event, data){
					if(data.node.data.queryProcessing){
						var checkProcessing = function(){
							var blQPath = window.BL.config.slingProxyPrefix + data.node.key + '.bl-processing.json?pageOnly=true';
							$.get(blQPath + '.json', function(blProcessingData){
								if(!blProcessingData || blProcessingData.processing){
									//recheck in another second
									setTimeout(checkProcessing, 1000);
								}else{
									//update UI
									data.node.data.queryProcessing = false; 
									data.node.icon = 'fa fa-file';
									data.node.lazy = true; 
									data.node.tooltip = data.node.title + " (query complete)";
									data.node.renderTitle(); 
									//todo: instead of just setting lazy true, could check for children now?
								}
							});
						};
						//found a page node that is processing. kick off the monitoring
						setTimeout(checkProcessing, 1000); 
					}
				}
			};


			defaults.source.fail(
				function(err){
					Materialize.toast(err, 4000);
					// creating temporary div for HTML encoding to sanitize content
					var sanitizedErr = $('<div/>').text(err).html();
					$el.html("<div style='margin:10px;margin-right:4px;font-size:12px;'><span style='color:#911'><b>Error:</b> " + sanitizedErr + "</span><br><br>Please check that your Sling server is available and has content, then reload page to retry.</div>").css({"border-right":"1px solid #ccc"});
				}
			)

		}
		var mergedOptions = $.extend( {}, defaults, options );
		$el.fancytree(mergedOptions);
 	};



	// extensions: ["glyph"],

   // glyph: {
   //     map: {
   //         doc: "fa fa-file-o",
   //         docOpen: "fa fa-file-o",
   //         checkbox: "fa fa-square-o",
   //         checkboxSelected: "fa fa-check-square-o",
   //         checkboxUnknown: "fa fa-square",
   //         dragHelper: "fa arrow-right",
   //         dropMarker: "fa long-arrow-right",
   //         error: "fa fa-warning",
   //         expanderClosed: "fa fa-caret-right",
   //         expanderLazy: "fa fa-angle-double-right",
   //         expanderOpen: "fa fa-caret-down",
   //         folder: "fa fa-folder-o",
   //         folderOpen: "fa fa-folder-open-o",
   //         loading: "fa fa-spinner fa-pulse"
   //     }
   // },




 	///////////////////////////////////////////////////////////////////////////////////////////
   tree.openPath=function($el, path, options){
   	
   	var parts=(path||"").split("/"), node, currentKey=""; 
   	options=options||{};
   	parts.shift();

	var finishExpanding = function(node){
		if(node){   						
			node.setActive(true, {noEvents: false});
			node.scrollIntoView(true);						
		}
		$el.fancytree("option", "expand", function(){});
	};

   	// Temporarily set up an "onExpand" function that will find and open the next child.
   	$el.fancytree("option", "expand", function(event,data){
   		if(data.node.key===currentKey){
   			if(parts.length){
   				currentKey= currentKey + "/" + parts.shift();  // this shifting iterator picks up where "rootiest parent" shifting left off
				   node = tree.getNodeByKey(currentKey);

				if(node){
					if(node && !node.isExpanded()) {node.setExpanded(true);}

					if(parts.length===0){
						finishExpanding(node);
					}
				}else{
					//came up short trying to open the tree. set the last found node 
					//to active
					finishExpanding(data.node);
				}
   			}
   		}

   	});
   	var tree=$el.fancytree("getTree"), stillLooking=true;

   	// This iterates until it finds the first node that is an ancestor of the target, but not expanded
   	while(parts.length && stillLooking){
			currentKey = currentKey + "/" + parts.shift();
			// console.log("seeking parent-root:", currentKey);
	   	node=tree.getNodeByKey(currentKey);
	   	if(node){
	   		if(!node.isExpanded()){
	   			node.setExpanded(true);
		   		stillLooking=false;
	   		}
	   	}
   	}

   	if(!node){
   		console.error("Could not find root parent of requested node: ", path)
   	}
   };


 	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.tagProcessor = function(val, wasInSafeMode){
 		var title, hasChildPages=false;
		if($.isPlainObject(val)){
			title=val["jcr:title"];
		}

		if(!wasInSafeMode && $.isPlainObject(val)){
			$.each(val, function(childKey, childVal){
				if($.isPlainObject(childVal) && childVal["sling:resourceType"]==="cq/tagging/components/tag"){
					hasChildPages=true;
					return false;
				}
			});	  					
		}
		return {title:title, hasChildren: hasChildPages, icon:"fa fa-tag"};
 	};

	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.assetProcessor = function(val, wasInSafeMode){
 		var retValue = {
 			title: val.title,
 			hasChildren: val.type === 'folder',
 			folder: val.type === 'folder'
 		};

		return retValue;
 	};



 	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.slingPageProcessor = function(val, wasInSafeMode){
 		var title, hasChildPages=false;
		if(val && val["jcr:content"] && val["jcr:content"]["jcr:title"]){
			title=val["jcr:content"]["jcr:title"];
		}

		if(!wasInSafeMode && $.isPlainObject(val)){
			$.each(val, function(childKey, childVal){
				if(childVal["jcr:content"]){
					hasChildPages=true;
					return false;
				}
			});	  					
		}
		return {title:title, hasChildren: hasChildPages, icon:options.treeIcon};
 	};



 	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.listingServiceLoadNodes = function(baseUrl){
 		baseUrl = baseUrl.replace(/\/$/,"");
 		var def= new $.Deferred();
 		var url = blProxy + baseUrl + ".list.pages.detail.1.json";
 		var results=[];

 		var lang="";
 		if(!langRegex && allowedLanguages){
 			langRegex = new RegExp("^(" + allowedLanguages + ")$");
 		}

 		if(langRegex){
	 		var parts=baseUrl.split("/");
	 		for(var i=0; i<parts.length && !lang; i++){
	 			if(langRegex.test(parts[i])){
	 				lang=parts[i];
	 			}
	 		}
 		}

 		$.ajax({url: url, dataType:"json"})
		.done(function(data){
			if(data.pages){
				$.each(data.pages, function(key,val){
					var title=val.title, name=val.path.split("/").pop();
					if(!options.languageSupport || lang==="en" || !lang){
						title=title?title:name;
					}else{
						title=title? (title + " <span class='lang-label'>(" + name + ")</span>") : name;
					}
					var hasChildren= !val.queryProcessing && val.hasChildren;
	  				results.push({title:title, key:val.path, lazy:hasChildren, icon: val.queryProcessing ? 'fa fa-refresh fa-spin' : options.treeIcon, queryProcessing: val.queryProcessing, tooltip: val.queryProcessing ? 'A query is modifying the children of this page.' : title}); //, icon:"fa fa-file-o"});
				});
				
		  		def.resolve(results);
			}else{
		  		def.reject("Unable to load page listing.");
			}
		});


		return def.promise();
	};


	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.assetsLoadNodes = function(baseUrl){
 		baseUrl = baseUrl.replace(/\/$/,"");
 		var def= new $.Deferred();
		var url = blProxy + baseUrl + ".list.assets.detail.1.json";
		//replace any double // that may have happened with bad concatenation
		url = url.replace('//', '/');

 		var results=[];

 		$.ajax({url: url, dataType:"json"})
		.done(function(data){
			if(data.resources){
				$.each(data.resources, function(key,val){
					var title=val.title;
	  				results.push({title:title, key:val.path, lazy:val.type === 'folder', tooltip: val.path, icon:options.treeIcon}); //, icon:"fa fa-file-o"});
				});

		  		def.resolve(results);
			}else{
		  		def.reject(new Error("Unexpected data from Sling asset listing service:" + url + "\n" + JSON.stringify(data)));
			}
		});


		return def.promise();
	};




 	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.slingLoadNodes = function(baseUrl, typeProcessor){
 		baseUrl = baseUrl.replace(/\/$/,"");
 		var def= new $.Deferred();
 		var url = blProxy + baseUrl + ".3.json";

 		$.ajax({url: url, dataType:"json"})
		.always(function(data){
			if(((data && data.promise) || $.isArray(data) ) && url.indexOf(".3.json")>-1){
				var saferUrl = url.replace(".3.json", ".1.json");
				if(console && console.log){console.log("Too many child nodes, retrying with: " + saferUrl);}
	    		$.ajax({url: saferUrl, dataType:"json"})
				.done(function(data){processGoodResults(data, true);})
				.error(function(err){
					def.reject('Unable to load content tree.');
				});
			}else{
				processGoodResults(data);
			}
		});

		function processGoodResults(data, wasInSafeMode){
	  		var results=[];
	  		$.each(data, function(key,val){

	  			if(!key.match(/^\:?(jcr|sling|cq|fsc|rep)\:/)){
	  				var title="";
	  				var url=baseUrl + "/" + key;

	  				var typeInfo = typeProcessor(val, wasInSafeMode, key);

	  				title=typeInfo.title || utils.prettyName	(key);
	  				results.push({title:title, key:url, lazy:wasInSafeMode || typeInfo.hasChildren, icon: typeInfo.icon, folder: typeInfo.folder}); //, icon:"fa fa-file-o"});
	  			}
	  		});
	  		def.resolve(results);
		}

		return def.promise();
	};

 	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.reload = function($el, path){
		var treeObj=$el.fancytree("getTree");
		if(path && path.split){
			var parts=path.split("/");
			parts.pop();
			path = parts.join("/");
		}else{
			console.error("Bad reload path:", path); 
			return;
		}

		var reloadMe = treeObj.getNodeByKey(path);
		if(reloadMe && reloadMe.lazy){
			reloadMe.load(true)
			.then(function(){
				tree.openPath($el, path);
			})
		}else{
			console.error("tree.reload can't operate on path:", path);
		}

 	}


 	///////////////////////////////////////////////////////////////////////////////////////////
 	tree.refresh = function($el, path){
   	// var tree=$el.fancytree("getTree");
   	// tree.getNodeByKey("")

 	}




 	///////////////////////////////////////////////////////////////////////////////////////////
	return tree;
};
