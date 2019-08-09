var _=require("lodash");

module.exports=function(){
		var hb = global.bl.hb;
		var hbManager={hb: hb};

		if(!hb){throw(new Error("blacklight-edit could not find the global handlebars object in `global.bl.hb`"))}

		hbManager.makeHelpers = function(widgetRegistry, componentRegistry){
			var defaultTitle;
			

			//*****************************************************************************//
			///  component-config

			hb.registerHelper('component-config', function(context, options) {
				var isDeveloperMode=_.get(options,["data","root","developerMode"]);
				var rtype, data, msg, missingType="", localFields;
				if(options.hash.type){
					rtype=options.hash.type;
					if(context["sling:resourceType"]!==rtype){
						missingType="data-missing-type=\"" + rtype + "\"";
					}
				}else{
					rtype=context?context["sling:resourceType"]:"";
					options.hash.type=rtype;
				}


				if (options.data) {
					data = hb.createFrame(options.data);
				}else{
					data={};
				}


				if(!rtype){
					msg="ERROR: No sling:resourceType found in source data, and none provided as parameter to helper 'component-config'";
					return msg;
				}


				/// FEB 2017:  right here, you'd say, is the current type "parsys" and is bl:guiParsys defined.
				///  if so, and we are NOT in developer mode (@root.developer?), then inject the bl:title, suggested, etc, as data elements for "+" button to use.

				//  OK, and again: if not in developer mode, then we can collapse "useless"structures.
				//		do that by simulating a different "includes" result, which simply skips over the unneeded parts and 
				//		and represent them as name="page/layout"

				///  ... BUT!  what if you just don't write those extra structures at all?  Is that an option?
				///	that leaves it as the component's job to do inheritence.  but maybe that's better?
				
				// this may also be the place to simply hide things that are "locked" from the component definition side

				var component=_.clone(componentRegistry.get(rtype));
				if(component){
					data.component={title:component.title, maxItems:""};
					if(component.hasFields){
						data.component.hasDialog=true;
					}


					if(component.container){
						data.component.title = component.container.title || data.component.title;
						data.component.isECC = component.container.isECC;
						data.component.maxItems = component.container.maxItems;
						data.component.includes = component.container.includes;
						_.each(data.component.includes, function(include){
							if(!include.name){
								throw new Error("Missing field 'name' specification in 'include' section for: " + component.path + "/data.js");
							}

							//handle the case where nested names are provided
							var normalizedName = _.replace(include.name, '/', '.');
							var relativeContext = _.get(context, normalizedName);
							if(include.forceChildType && relativeContext){
								var forcedType = _.isFunction(include.forceChildType) || _.isString(include.forceChildType) ? include.forceChildType : _.get(include, 'eccItems.0.type');

								if(forcedType){
									_.each(relativeContext, function(item){
										if(_.isObject(item)){
											item['sling:resourceType'] = _.isFunction(forcedType) ? forcedType(item, component) : forcedType;
										}
									});
								}else{
									throw new Error("Can't determine the type that should be forced to children for '" + include.name + "' at : " + component.path + "/container.js");
								}
							}
						});
					}

					data.component.type=rtype;
					data.component.missingType=missingType;


					if(rtype==="foundation/components/parsys"){
						if(!isDeveloperMode){
							if(_.get(context,"bl:parsys")){
								var eccConfig = {
									title: context["bl:parsys"].title, 
									suggested: context["bl:parsys"].suggested, 
									allowed: context["bl:parsys"].allowed,
									maxItems: context["bl:parsys"].maxItems,
									inherit: context["bl:parsys"].inherit
								}
								data.component.eccConfig=JSON.stringify(eccConfig);
								if(eccConfig.maxItems){data.component.maxItems=eccConfig.maxItems;}
							}

							data.component.hasDialog = false;
						}
					}

				}else{
					data.component={};
				}

				_.each(options.hash, function(val, idx){
					if(val){data.component[idx]=val;}
				});
	

				return options.fn(context, { data: data });
			});


			//*****************************************************************************//
			hb.registerHelper('dialog-content-mode', function(rtype, content, options) {
				var component=componentRegistry.get(rtype);
				if(component){
					var template=component.getFirstWidgetTemplate("content");
					if(!template){return "";}
					return new hb.SafeString(template.compiled(content));
				}
			});


			//*****************************************************************************//
			hb.registerHelper('entry-title', function(content, rtype, key, options) {
				var component=componentRegistry.get(rtype);
				var title;
				var rtypeTitle=options.hash.rtypeTitle;

				if(rtype==="foundation/components/parsys" && _.get(content, ["bl:parsys", title]) && !_.get(options,["data","root","developerMode"])){
					title="<div class='item-label'>" + content["bl:parsys"].title + "</div>";					
				}else if(component){
					var firstField=component.getFirstField();
					if(firstField){
						var wid=widgetRegistry.get(firstField.widget);
						if(wid){
							var templates=wid.templatesFromConfig(firstField);
							if(templates.content){
								var tmpl=hb.compile(templates.content);
								title="<div class='item-label'>" + (rtypeTitle || component.title) + "</div><div class='item-content'>" + tmpl(_.defaults({"bl:titleMode":true},content)) + "</div>";
							}
						}
					}else{
						title="<div class='item-label'>" + (rtypeTitle || component.title) + "</div>";
					}
				}

				if(!title || !title.trim()){
					title=defaultTitle({type:rtype, key:key});
				}

				return new hb.SafeString(title);


			});


			//*****************************************************************************//
			hb.registerHelper('inheritance-mark', function(context, options) {
				var mode=_.get(options,["hash","mode"], "edit-page");
				if(mode==="edit-page"){
					if(context){
						var isInherited = context["bl:inherited"]  || (context["bl:map"]?"data-mapped":"");
						if(isInherited){
							return new hb.SafeString(`data-inherited="${isInherited}"`);
						}
					}
				}
			});



			//*****************************************************************************//
			hb.registerHelper('setlocal', function (name, value, options) {
				console.log("OPTIONS:", options.data)
				//options.hash[name]=value;		
			});



			//*****************************************************************************//
			hb.registerHelper('quote', function(value) {
				if(value && value.replace){
					return value.replace(/(['"])/g, '\\$1');
				}else{
					return "";
				}
			});

			//*****************************************************************************//
			hb.registerHelper('as-json', function(value, options) {
				var padJson=(options.hash.pad||options.hash.pretty)?"  ":null;

				if(value){
					if(typeof(value)==="function"){
						return new hb.SafeString(value.toString());
					}else{
						if(typeof(value) === 'string'){
							if(!options.hash.dontQuoteStrings){
								return new hb.SafeString(JSON.stringify(value,null,padJson).replace(/'/g,"&apos;"));
							}else{
								return value;
							}
						}else{
							return new hb.SafeString(JSON.stringify(value,null,padJson).replace(/'/g,"&apos;"));
						}
					}
				}else{
					return "null";
				}
			});

			//*****************************************************************************//
			hb.registerHelper('is-array', function(value) {
				return _.isArray(value);
			});

			//*****************************************************************************//
			hb.registerHelper('is-object', function(value) {
				return _.isObject(value);
			});

			//*****************************************************************************//
			hb.registerHelper('is-string', function(value) {
				return _.isString(value);
			});

			//*****************************************************************************//
			hb.registerHelper('safename', function(value) {
				if(value && value.replace){
					return value.replace(/\W/g, '_');
				}else{
					return "";
				}
			});

			//*****************************************************************************//
			hb.registerHelper('prettyname', function(value) {
				return global.bl.prettyName(value, {allCaps:true});
			});

			/////////////////////////////////////////////////////////////////////////////////////////////
			hb.registerHelper('replace', function (value, find, replace, options) {
				replace = replace || "";
				if(!value){return "";}
				return value.replace(new RegExp(find, "g"), replace);
			 });


			hb.registerHelper('lookup', function(obj, field) {
				if(!field || !field.replace){return "";}

				field=field.replace(/\//g,".");
				var fields=field.split(".");
				var cur=obj;

				_.each(fields,function(field){
					if(cur && cur[field]){
						cur=cur[field];
					}else{
						cur=false;return false;
					}
				});
				
				return cur;
			});



			//*****************************************************************************//
			hb.registerHelper('get-by-index', function(data, keyNumber, additionalKey) {
				if(typeof(data)!=="object" || typeof(keyNumber)!=="number"){
					return "";
				}else{
					var keys = _.keys(data);
					if(keys[keyNumber]){
						if(additionalKey){
							if(typeof(data[keys[keyNumber]])==="object"){
								return data[keys[keyNumber]][additionalKey]
							}
							else{
								return "";
							}
						}
					}else{
						return data[keys[keyNumber]]
					}
				}
			});



			//*****************************************************************************//
			hb.registerHelper('get-template', function(config, requestedTemplate, options) {
				/// TODO: iterate over config items, pull out each widget, grab template

				if(!options){
					options=requestedTemplate;
					requestedTemplate="";
				}
				if(!options){
					return "get-templates requires a config object and optionally accepts a template type (field, body)";
				}

				var whichTemplate = requestedTemplate || "field";
				var widgetName=config.widget;
				var templates;

				var widget = widgetRegistry.get(widgetName);
				if(widget){
					templates = _.defaults({config:config}, widget.templatesFromConfig(config));
					if(templates[whichTemplate]){
						return new hb.SafeString(templates[whichTemplate]);
					}else{
						return "get-template: No template '" + whichTemplate + "' found in widget '" + widget + "'";
					}
				}else{
					console.trace("No widget called'" + widgetName + "' in ", config)
					return "get-template: No widget found called '" + widgetName + "'";
				}

			});


			//*****************************************************************************//
			hb.registerHelper('increment', function(keyName, options) {
				if(typeof(keyName)!=="string"){throw new Error("Must provide a keyName to increment")}
				var x=options.data.root[keyName] || "0";
				options.data.root[keyName] = parseInt(x)+1
			});


			//*****************************************************************************//
			hb.registerHelper('decrement', function(keyName, options) {
				if(typeof(keyName)!=="string"){throw new Error("Must provide a keyName to decrement")}
				var x=options.data.root[keyName] || "0";
				options.data.root[keyName] = parseInt(x)-1
			});



	
			//*****************************************************************************//
			defaultTitle=hb.compile('<span style="color:#BBE;">{{prettyname key}}</span> <span style="color:#ddd;margin-left:30px;">{{type}}</span>');
		}

		return hbManager;
}
