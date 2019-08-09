var _path=require("path");
var _=require("lodash");
var fs=require("fs");
var log = global.bl.logger.get("blacklight.edit.component");
var componentCacheDisable = _.get(global, "bl.config.environment.componentCacheDisable");
var componentCacheClearOnChange = _.get(global, "bl.config.environment.componentCacheClearOnChange");


/// This module is for loading the EDIT potions of each component.  
//  Render portions still are handled by the component-types.js module in blacklight
function getEcomponentRegistry(options){
	var cregistry={};
	var componentCache={};

	cregistry.get=function(rtype){
		// console.log("RTYPE", rtype, typeof(rtype)=="string")
		if(!_.isString(rtype)){throw new Error("Bad (or no) resource type provided to componentRegistry.get():", rtype)}
		var component=componentCache[rtype];
		if(!component || componentCacheDisable){
			component=loadComponent(rtype, options.roots, options.widgetRegistry, options.hb);
			componentCache[rtype]=component;
		}		
		return component;
	}

	if(global.bl.componentWatch){
		global.bl.componentWatch.on("change", (f)=>{
			componentCache={};
		});
	}


	return cregistry;
}





//////////////////////////////////////////////////////////////
function loadComponent(rtype, roots, widgetRegistry, hb){
	var fullPath, pathToTest;
	var component;
	var componentName=rtype.split("/").pop();
	var mangledGuiTemplate;

	/// First search all component roots for the type's folder.
	_.each(roots, function(componentRoot){
		pathToTest = _path.join(componentRoot, rtype);
		if(fs.existsSync(pathToTest)){
			fullPath = pathToTest;
			return false;
		}
	});


	if(fullPath){
		component={path: fullPath, type:rtype, firstWidgetCompiledTemplates:{}};
		component.modules={};
		var parts=["dialog","container",".content", componentName], isProcessor;
		_.each(parts, function(partName){
			var pathToPart = _path.join(fullPath, partName + ".js"), mod, func;
			if(partName[0]==="."){pathToPart=pathToPart + "on";}
			try{
				if(fs.existsSync(pathToPart)){
					if(componentCacheClearOnChange || componentCacheDisable){
						delete require.cache[require.resolve(pathToPart)]
					}
					mod = require(pathToPart);
					isProcessor = partName===componentName;
					component.modules[isProcessor?"processor":partName] = mod;
					if(isProcessor){
						component.processor = mod;
					}else{
						func=mod[partName];
						if(typeof(func)==="function"){
							// TODO: look up the appropriate part of .content.json, and send in as context to the function.
							component[partName]=func(component);
						}
					}
				}
			}catch(err){
				err.message = "Error loading component '" + partName + "' at: " + fullPath + "/" + partName + ".js" + "\n" + err.message;
				throw(err);
			}

			///////////////////////////////////////////////////////////////////////
			if(partName===".content"){
				var guiConfig = _.cloneDeep(_.get(component, ["modules",".content","jcr:content"]));

				if(guiConfig){
					if(guiConfig.template){
						component.template=guiConfig.template;
						delete guiConfig.template;

						if(guiConfig.includes){
							component.container = component.container || {};
							component.container.includes=component.container.includes||[];
							_.each(guiConfig.includes, (include)=>{
								if(include.template_path){
									var node=_.get(component.template,include.template_path.split("/"),{"sling:resourceType":"blacklight/component"})
									component.container.includes.push({name:include.template_path, type:node["sling:resourceType"], title:include.title});
								}
							})
						}else{
							_.each(component.template, (val, key)=>{
								if(!global.bl.namespaceRegex.test(key)){
									if(val["sling:resourceType"]){
										// component.container = component.container || {};
										// component.container.includes=component.container.includes||[];
										// component.container.includes.push({name:key, type:val["sling:resourceType"]})
										// TODO: check for parsys, and if it is, set title, and suggested & allowed child components
									}
								}
							});
						}
					}

					if(guiConfig.named_maps){
						component.named_maps={};
						_.each(guiConfig.named_maps, (val, key)=>{
							if(!global.bl.namespaceRegex.test(key)){
								component.named_maps[key]=val;
							}
						});
						delete guiConfig.named_maps;
					}

					component.config = stashMeta(guiConfig);
					if(component.config.dialog_fields){
						component.config.dialog_fields={items: component.config.dialog_fields};
						panelizeDialog(component.config.dialog_fields)
					}

					Object.freeze(component.config);

				}
				// _.unset(component, ["modules",".content"]);
			}

		});



		// scenarios:
		// 	GUI config already exists, dialog.js is added later:  
		//    dialog.js already exists, GUI config is added later
		//    "forceAppend" is the normal behavior you want.  so "dontAppendFields" is the exception, and they can set it if they want it.
		//    "dontAppendFields" can also be set by dialog.js   

		var  guiDialog=_.get(component,"config.dialog_fields");

		if((component.dialog && component.dialog.items)){
			panelizeDialog(component.dialog)
			if(guiDialog && !_.get(component, ["config", "settings", "dont_append_configuration"]) && !_.get(component, ["modules", "dialog", "dont_append_configuration"])){

				// TODO: find first panel in configDialog, and merge with first panel in component.dialog ... 
				//  what about tabs?  scenarios:  conf=t,comp=t;   conf=p, comp=t;   comp=p, comp=t;   conf=p, comp=p; 

				var confKeys=_.keys(guiDialog.items), compKeys = _.keys(component.dialog.items), confMerge, compMerge;
				var confFirst = _.get(guiDialog,["items", confKeys[0], "widget"]);
				var compFirst = _.get(component.dialog,["items", compKeys[0], "widget"]);
				confMerge = [confKeys[0]]; compMerge = [compKeys[0]];

				if(confFirst === "panel" && compFirst === "panel"){
					confMerge = [confKeys[0]]; compMerge = [compKeys[0]];
				}else if(confFirst === "tabs" && compFirst === "panel"){
					// TODO
				}else if(confFirst === "panel" && compFirst === "tabs"){
					// TODO
				}else if(confFirst === "tabs" && compFirst === "tabs"){
					// TODO
				}

				_.merge(_.get(component.dialog.items,compMerge), _.get(guiDialog.items, confMerge));
				// console.log("MERGE-RESULT:", JSON.stringify(component.dialog.items,null,"  "));
			}
		}else{
			component.dialog=guiDialog;
		}

		component.nameHint = _.get(component,"config.settings.name_hint", _.get(component, "dialog.nameHint"));

		// if(component.container && component.container.includes){

		// }else{
		// 	console.log("Adding Fake thing:",rtype);
		// 	_.set(component,"container.includes",[{name:"Fake include", type:"fshr/poc3/pages/property-landing/content/property-landing-about"}])
		// }


		// console.log("COMPONENT:", rtype, component);

		if(component.dialog && !component.allWidgets){
			component.allWidgets=[];
			getWidgets(component.dialog);
			_.each(component.allWidgets, function(widget, key){
				widget.name=widget.name||widget.key;
				widget.fieldLabel=widget.fieldLabel||widget.label||global.bl.prettyName(widget.name.split("/").pop());
				var fdsc=widget.fieldDescription||widget.description;
				if(fdsc){widget.fieldDescription=fdsc;}
				if(!widget.name){throw new Error("Widget without name:\n" + JSON.stringify(widget,null,"  "))}
				widget.key=widget.name.replace(/^.\/\.\/|^\.\//g, "").replace(/\/\.\//g,"/");

				//prefixing with './' avoids fieldname and helper function name collisions
				// eq: we have a helper named 'quote' which is not uncommon for a field name
				widget.hbsValidName = "./" + _.map(widget.name.split('/'), (nameSegment)=>{
					return /[^\w^:]/.test(nameSegment) ? '['+nameSegment +']' : nameSegment;
				}).join('/');
				widget.lockAllowed = widget.widget !== 'hidden' && !widget.readonly && !widget.diabled;
				widget.hide_on_edit_page = widget.widget === 'hidden';
				widget.wingo="bigno";
			});

		}


		component.hasFields = component.allWidgets ? component.allWidgets.length : 0;


		/// Set title.  Dialog takes precedence over container.
		if(component.dialog && component.dialog.title){
			component.title=component.dialog.title;
		}else if(component.container && component.container.title){
			component.title=component.container.title;
		}else if(component.config && component.config.title){
			component.title=component.config.title;
		}
		




		////////////////////////////////////////////////////////////////////////
		component.getFirstWidgetTemplate=function(which){

			if(!component.firstWidgetCompiledTemplates[which]){
				var templates=component.getTemplatesForFirstWidgetInDialog();
				if(!templates){return;}
				try{
					component.firstWidgetCompiledTemplates[which]=hb.compile(templates[which]);
				}catch(err){
					err.message = "Error compiling configured stage 2 template '" + which + "' for '" + component.path + "/dialog.js'\n" + err.message ;
					throw err;
				}
			}
			return {text: component.firstWidgetTemplates[which], compiled: component.firstWidgetCompiledTemplates[which]};
		}

		////////////////////////////////////////////////////////////////////////
		component.getTemplatesForFirstWidgetInDialog=function(){
			if(!component.firstWidgetTemplates){
				var config=component.getFirstWidgetInDialog();
				if(!config){return null;}
				if(config.widget!=="tabs" && config.widget!=="fieldset" && config.widget!=="panel"){
					throw new Error("First widget in dialog must be of type 'panel' or fieldset' or 'tabs' (found '" + config.widget + "')");
				}
				var widget = widgetRegistry.get(config.widget);

				if(!widget){
					throw new Error("Unknown widget type: '" + config.widget + "' referenced in component dialog: '" + component.path + "'<pre>\n" + JSON.stringify(config,null,"  "))
				}

				component.firstWidgetTemplates = widget.templatesFromConfig(config);
			}
			
			return component.firstWidgetTemplates;
		}


		////////////////////////////////////////////////////////////////////////
		component.getFirstWidgetInDialog=function(){
			if(!component.allWidgets || !component.allWidgets[0]){return null;}         //throw new Error ("No widgets/dialog defined at: '" + component.path + "/dialog.js'");}

			return component.allWidgets[0];
		}


		////////////////////////////////////////////////////////////////////////
		component.getFirstField=function(){
			if(!component.allWidgets || !component.allWidgets[0]){return;}
			var nonField=["panel", "tabs", "fieldset"]
			for(var i=0; i<component.allWidgets.length; i=i+1){
				if(nonField.indexOf(component.allWidgets[i].widget)<0){
					return component.allWidgets[i];
				}
			}
		}

		////////////////////////////////////////////////////////////////////////
		component.templateWriteRule=function(context){
			if(typeof context==="string"){context={path:context};}
			if(!context.path){throw new Error("component.templateWriteRule requires a path");}

			if(!component.config){return false;}
			else{return true;}


			// var writeRules=_.get(component, "config.settings.template_write_rules");
			// if(writeRules==="always_write"){
			// 	return true;
			// }else if(writeRules==="never_write"){
			// 	return false;
			// }else if(/\/content\//.test(context.path)){
			// 	return true;
			// }
		}


		/*******************************************************************************/
		component.getComponentInheritSettings=function(options){
			if(!component.template){
				return null;
			}else{
				var result={
					"bl:inherit-component":rtype,
				}

				var editablePaths=[];

				_.each(this.config.includes,(include)=>{
					if(include.template_path){editablePaths.push(include.template_path)}
				})

				_.each(component.allWidgets,(widget)=>{
					if(widget.name){editablePaths.push(widget.name)}
				})

				if(editablePaths.length){
					result.exclude=editablePaths;
				}
				return result;
			}
		}


		/*******************************************************************************/
		component.getGuiTemplate=function(options){
			var getMangled = options&&options.mangled;
			var guiTemplate = component.template;

			if(guiTemplate){
				if(getMangled){
					if(!mangledGuiTemplate){
						mangledGuiTemplate=_.cloneDeep(guiTemplate);
						global.bl.SlingConnector.prototype.mangleNamespaces(mangledGuiTemplate);
					}
					return mangledGuiTemplate;
				}else{
					return guiTemplate;
				}
			}
		}



	}else{
		log.warning("Can't find type: '" + rtype + "' in: " + roots)
	}



	//// Recurse down the structure to get a flat listing of all widgets.
	function getWidgets(cur, key){	
		var keys=Object.keys(cur);

		if(!_.includes(cur.widget, '/')){
			for(var i=0; i<keys.length; i++){
				if(keys[i]==="widget" && key!=="fieldConfig"){
					cur.key=key;

					component.allWidgets.push(cur);
				}
				if(typeof(cur[keys[i]])==="object"){
					getWidgets(cur[keys[i]], keys[i]);
				}
			}
		}
	}				


	//// Add an enclosing panel to top-level fields object, if one does not already exist.
	function panelizeDialog(object){
		// if(!object){return;}
		var hasNonPanel=false;
		var fields = object.items;
		var panelWidgetTypes=/^panel|^tabs/;

		_.each(fields, (field, fieldName)=>{
			if(!panelWidgetTypes.test(field.widget)){hasNonPanel=true; return false;}
		});

		if(hasNonPanel){
			object.items = { auto_panel: { widget:"panel",  items: fields } };
		}
	}


	//TODO: pre-process data and dialog configs to fill in defaults, expand _ref values, etc.

	return component;
}

				// var curConfig = config.items;
				// while(curConfig && !curConfig.widget){
				// 	curConfig=curConfig[_.keys(curConfig)[0]]
				// }
				// if(!curConfig || !curConfig.widget){
				// 	throw new Error("Could not find widget in dialog config:<pre>" + JSON.stringify(config,null,"  "));
				// }

				// var widget = widgetRegistry.get(curConfig.widget);
				// if(!widget){
				// 	throw new Error("Unknown widget type: '" + curConfig.widget + "' referenced in component dialog: '" + rtype + "'<pre>\n" + JSON.stringify(curConfig,null,"  "))
				// }

				// var templates = widget.templatesFromConfig(curConfig);


var widgetRegex=/^blacklight\/develop\/widgets\/(.*)/;

function stashMeta(model){
	if(!model){return;}
	model._meta={};
	Object.defineProperty(model, "_meta", {enumerable: false});
	
	if(widgetRegex.test(model["sling:resourceType"])){
		model.widget=model["sling:resourceType"].replace(widgetRegex,"$1");
	}

	_.each(model,function(val,key){
		if(/[a-z]{1,6}:.*/.test(key)){
			model._meta[key]=val;
			delete model[key];
		}else{
			if(_.isPlainObject(model[key])){
				stashMeta(model[key]);
			}
		}
	});

	return model;
}


//fieldset, panel, tabs


module.exports=getEcomponentRegistry;

/* includes:
	"loadComponentPart" 
	loadDialog
		processes and caches any required composite dialogs in a dialog
		processes and caches any field-level content renderings in a dialog

	loadPage

	does caching.

*/

