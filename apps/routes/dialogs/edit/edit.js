
var _=require("lodash");
var util=require("util");
// var blMapRender=require("./bl-map-render");
var blMapRender=require("../../../widgets/mapping-widget/mapping-widget").renderDialogPage;
var sanitize = global.bl.sanitize;


module.exports.process=function(data,$,cb){
	"use strict";
	
	var req=$.express.req;
	var res=$.express.res;

	var rtype=$.page.action;
	var slingPath=req.query.slingPath;
	var dialogBody;
	var addMode = req.query.addMode;
	var addParentType = req.query.addType;
	var inheritFrom = req.query.inheritFrom;
	var parentMapDirectives=[];
	var saveTarget=req.query.slingPath;
	var modalId = req.query.modalId || "bl-edit-dialog";
	var missingNodes = [], localFields;   // missingNodes: someday, maybe for data-mapped or template-inherited content, use this to fill in missing parents
	let blRefs = {};
	let blMaps = {};

	var requestedComponent=$.componentRegistry.get(rtype); 
	if(!requestedComponent){throw new Error("No component found of type '" + rtype + "'");}

	var writeTemplate = requestedComponent.templateWriteRule(slingPath);

	var developerMode = /\/apps\/blacklight\/develop\/components/.test(slingPath);

	var fallbackNameHint="";


	/**************************************************************************************************/
	if(!addMode){  // We are NOT in ADD MODE

		var slingUri= (inheritFrom?inheritFrom:slingPath) + ".deref.infinity.json";

		// if in inheritFrom mode, then load sling from inheritFrom+".infinty.json" , instead of slingPath
		// 	then get the data from the component template
		//		then make a note of the path segments that are missing from sling, and their types, so they can be rebuilt by the dialog on save
		//				possibly this isn't needed, it turns out.  at least not with nodejs-sling
		//		then merge the sling with the template content
		//		then truncate down to the merged sling that the dialog actually needs to display
		//		also, you'll need a step to tell the dialog which values are local vs which are not, right?
		//			that's basically just, did sling have this dialog's node, and if so, flatten all keys that are present, into an array
		//			all very nice, but it probably means you'll have to implement your own "defaultsDeep()" with tracking of original nodes
		//			actually you don't necessarily need that.  because you only need field-by-field testing on the dialog's node


		$.sc.getSling(slingUri, {leaveMangledNames: true},function(err, slingData){

			var msg;
			var pageMatch=slingUri.match(/(.*)\/jcr:content\/?([^\.]+)?(.*)/);
			if(err){
				if(!pageMatch){
					msg="ERROR loading sling for dialog: " + slingUri;
					$.log.error(msg, {error:err, stack:err.stack}); $.handleError(new Error(msg), res, req);
					return;
				}
				slingData = {"sling:resourceType":rtype};
			}
			
			if(inheritFrom){
				// todo: maybe rather than just get the top-most template content, you should scale down the tree to the dialog spot
				// $.componentRegistry.get(rtype);
				if(slingPath.indexOf(inheritFrom)!==0){msg="ERROR: inheritance path is not a parent of the sling path:" + inheritFrom;  $.handleError(new Error(msg), res, req); return;  }
				var extras = ("/" + _.trim(slingPath.slice(inheritFrom.length),"/")).split("/");
				var dialogDataPath = extras.slice(1);
				_.remove(dialogDataPath,(val)=>!val);
				inheritFrom = dialogDataPath.join("/");
				var localData = dialogDataPath.length?_.get(slingData, dialogDataPath):slingData;
				localFields = _.map(global.bl.flattenObject(localData, {excludeBlHandled: true}), (val)=>val.name);

				if(pageMatch){
					global.bl.mappingDeref(slingData, {page:{trimmedPath:pageMatch[1]}, express:$.express, sling:$.sc}, {startPath:pageMatch[2] ,markLocals:true,leaveMangledNames:true}, listParentMaps);
				}else{
					console.log("Couldn't find jcr:content on path:", sanitize.log(slingUri));
					listParentMaps();
				}

			}else{
				renderDialog(slingData);
			}


			/////////////////////////////////////////////////////////////////////////////////////////
			function listParentMaps(){
				if(dialogDataPath.length){					
					var requestedData=_.get(slingData,dialogDataPath);
					while(dialogDataPath.length){
						dialogDataPath = dialogDataPath.slice(0,-1);
						let currentParent=_.get(slingData, dialogDataPath, slingData);
						let curParentPath = dialogDataPath.join("/");
						let curMap = currentParent?currentParent["bl:map"]:"";
						let curPathToTarget = inheritFrom.slice(curParentPath.length).replace(/^\//,"");
						let releventDirectives=[];

						_.each(curMap,(map,key)=>{
							if(map.nodes){	
								_.each(map.nodes,(node)=>{
									if(node && curPathToTarget.indexOf(node.target || node)===0){
										releventDirectives.push(map);
										return false;
									}
								});
							}else if(map.exclude){
								let curTargetIsExcluded=false;
								_.each(map.exclude, (exclusion)=>{
									if(curPathToTarget.indexOf(exclusion)===0){
										curTargetIsExcluded=false;  return false;
									}
									if(!curTargetIsExcluded){releventDirectives.push(map)}
								});
							}else if(map.target){
								if(curPathToTarget.indexOf(map.target)===0){
										releventDirectives.push(map);		
								}						
							}
						});
						if(releventDirectives.length){
							parentMapDirectives.push({path:curParentPath, directives:releventDirectives})  // TODO: parentMapDirectives is not even used anywhere.  blMapRender just ignores it.  Delete all this?
						}
					}
					slingData=requestedData;
				}				

				if(slingData){

					let templatedFields = [];

					//this is to account for fields that might write objects
					//rather than just a single value
					_.each(localFields, function(key){
						if(key.indexOf('/')){
							var keySegments = key.split('/');
							keySegments.pop();
							var deepKey = keySegments.join('/');
							if(deepKey && !_.includes(localFields, deepKey)){
								localFields.push(deepKey);
							}
						}


						if(_.includes(key,'bl:map')){
							let relativeSlingPath = key.split('bl:map')[0];
							relativeSlingPath += 'bl:map';
							if(!blMaps[relativeSlingPath]){
								blMaps[relativeSlingPath] = _.get(slingData, relativeSlingPath.split('/'));
							}
						}

						if(key.indexOf('/bl:templated/') > -1){
							let mapAtRoot = key.indexOf('bl:map/bl:templated/') === 0;
							let splitParts = key.split((mapAtRoot ? '' : '/') + 'bl:map/bl:templated/');
							let relativeSlingPath = mapAtRoot ? splitParts[1] : splitParts.join('/');
							let templateValueParts = (mapAtRoot ? [] : splitParts[0].split('/')).concat(['bl:map', 'bl:templated', splitParts[1]]);
							let templateValue = _.get(slingData, templateValueParts);

							//console.log('templated handling', {key, splitParts, relativeSlingPath, templateValueParts, templateValue});
							_.set(slingData, relativeSlingPath.split('/'), templateValue);
							templatedFields.push(relativeSlingPath);
						}
					});

					slingData["bl:local"]=localFields;
					slingData["bl:lock-mode"]=true;
					slingData["bl:templated"]=templatedFields;
				}

				renderDialog(slingData);
			}

		});


	/**************************************************************************************************/
	}else{    // We are in ADD MODE

		// TODO: load the rtype, and check on the template write rules.  This should happen up top.  Should be sent as path, etc to a method called "templateWriteRules()" in the component object.
		// If writeRules for this path are "write it" then get the data, and send it to renderDialog() below.
		// Also, you need to dsitinguish between fileds that are handled by the dialog vs. fields that need to be passed through as hidden.  So flatten the template defaults, and, um...compare against the flattened dialog field list?
		//  Once you have the list of unhandled fields, pass them through renderDialog() as a 2nd param, where they can be sent to the dialog render to populate "extra hidden fields"

		saveTarget = saveTarget.replace(/\/$/,"") + "/*";
		fallbackNameHint=rtype.split("/").pop();
		var defaultContent={};


		var componentTemplate = requestedComponent.getGuiTemplate({mangled:true})


		if(req.query.content){
			try{
				defaultContent=JSON.parse(req.query.content);
				if(inheritFrom){
					defaultContent["bl:lock-mode"]=true;
					defaultContent["bl:local"]=_.keys(defaultContent); ///TODO: use _.keysDeep() ... not just _.keys()
				}
			}catch(err){
				console.error("Problem parsing JSON default content from query string:", req.query.content)
			}
		}

		defaultContent._sling_resourceType=rtype;

		// global.bl.fillInComponentTemplateData(defaultContent);

		_.defaultsDeep(defaultContent, componentTemplate);

		renderDialog(defaultContent);
	}
	



	/**************************************************************************************************/
	/**************************************************************************************************/
	function renderDialog(slingData){
		try{


			var fieldTemplate=requestedComponent.getFirstWidgetTemplate("field"), usedKeys=[];

			var excludedConfigKeys=["items","key"];
			var hasField=false;
			var holderWidgetTypes = ["panel","fieldset"]
			var configs={};
			_.each(requestedComponent.allWidgets, function(config){
				if(usedKeys.includes(config.key)){throw new Error("Dialog contains a widget with an already-used key or name in object: " +  JSON.stringify(config))}
				usedKeys.push(config.key);
				if(!hasField && !holderWidgetTypes.includes(config.widget)){
					hasField=true;
				}

				var processedConfig={};
				_.each(config, function(val,key){
					if(!excludedConfigKeys.includes(key)){
						processedConfig[key]=val;
					}
				});

				processedConfig.lockMode = true;
				configs[config.key]=processedConfig;
			})

			if(slingData){slingData._id = ((new Date().getTime()) * Math.random()).toString().replace(/\./g,"");}
			if(!hasField){
				dialogBody="<div style='margin:24px;font-size:1.2em;color:#aaa;'>This component has no editable fields." +
					(addMode?"<br>But you can click <b>Save</b> now to add it to the page.</div>":"</div>");
			}else{
				if(!fieldTemplate.compiled){throw new Error("No 'field' template found (missing dialog.js?) for component: " + rtype);}
				dialogBody = fieldTemplate.compiled(slingData);
			}

			var dialogConfig={
				slingType: rtype,
				saveTarget: saveTarget,
				addMode: addMode,
				developerMode: developerMode,
				nameHint:   requestedComponent.nameHint || (developerMode?fallbackNameHint:""),
				forceEntryName: _.get(requestedComponent, "dialog.forceEntryName", ""),
				fallbackNameHint: fallbackNameHint,
				addParentType: addParentType,
				mergeMarker:req.query.mergeMarker,
				title: req.query.title || _.get(requestedComponent,"title", "Not editable"),
				modalId: modalId,
				hasDataMap : _.size(blMaps) > 0
			}


			var mapping=slingData ? blMapRender(blMaps, slingData['sling:resourceType']) : '';


			var dialogContent = $.template({body:dialogBody, mapping, lock:inheritFrom?true:false, widgetConfigs:configs, dialogConfig: dialogConfig, title: dialogConfig.title,  blMaps: blMaps});
			res.send(dialogContent);
			res.end();
		}catch(err){
			$.handleError(err,res,req);				
		}
	}


	/// Let caller know that HTTP response rendering is handled here.
	cb(null, false);


}
