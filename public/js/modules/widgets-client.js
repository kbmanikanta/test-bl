/* globals module, require, $, _ , Materialize */
var makeWidget;

module.exports=function($, window, page){
	"use strict";
	var req = require.context('../../../apps/widgets/', true, /client.js$/);
	var slingConnector=require("./sling-client-connector.js");
	var fieldMapping = require("./field-mapping.js");

	makeWidget =function makeWidget(key, config, dialog){
		var widget=config;
		widget.methods={};
		var typeConfig={};
		var $widget=dialog.get$().find(".bl-widget[data-key='" + key + "']");
		var $row=$widget.closest(".form-row");
		var lockMode = $row.hasClass("lock_mode");
		var $lockButton=$row.find(".row-lock");
		var isLocal = ($lockButton.html()!=="lock") ? true : false;

		$lockButton.click(toggleLocalState)
		
		var typePath="./" + widget.widget + "/client.js";
		if(req.keys().indexOf(typePath)>-1){
			typeConfig=req(typePath);
		}
		
		var widgetName=$row.data("widget-name");
		
		
		//this inclusion of the global lodash variable is a temporary placeholder. lodash
		//should, ideally, not be available in the global space, and instead be pulled
		//in here via some 'required' mechanism
		var utils={$:$, _:_, widget:widget, dialog:dialog, page:page};
		
		var mappingConfig = fieldMapping(utils, key, $lockButton);

		//enable customization of the widgets
		var moduleCustomizationKey = (_.get(page,"resourceType") || "").split("/").slice(0,2).join(".") + ".widgetCustomizer";
		var defaultCustomizationKey = window.BL.config.defaultModule + ".widgetCustomizer";
		var widgetCustomizer = _.get(window.BL.modules, moduleCustomizationKey) || _.get(window.BL.modules,  defaultCustomizationKey);

		utils.sling=slingConnector(utils);
		widget.utils=utils;
		widget.isEnabled=true;

		/*********************************************************************************/
		widget.methods.getValue=function(){
			if(lockMode && !isLocal){
				return [{name:key + "@Delete", value:true}]
			}else{
				var retValue = (typeConfig.getValue ? typeConfig.getValue($widget, widget.name, utils) : widget.methods.getInput().serializeArray()) || []; 
				
				if(lockMode && isLocal){
					retValue.push({name:key + '@DefaultValue', value:""});
				}

				return retValue; 
			}
		};

		/*********************************************************************************/
		widget.methods.getPlainValue=function(){
			return typeConfig.getPlainValue ? typeConfig.getPlainValue($widget, widget.name, utils) : widget.methods.getInput().val();  
		};


		/*********************************************************************************/
		widget.methods.getInput=function(){
			if(typeConfig.getInput){
				return typeConfig.getInput($widget, widget.name, utils);
			}else{
				return $widget.find(":input");
			}
		};


		/*********************************************************************************/
		widget.methods.validate = function(callback){
			var validationError=false;
			var $input = widget.methods.getInput();
			if(/^(tabs|panel|fieldset)$/.test(widget.widget)){callback(); return;}

			if(typeConfig.validate){
				validationError = typeConfig.validate($widget, widget.name, utils, actOnResult);
			}else{
				if(widget.validation){
					var serial=widget.methods.getValue();
					var values=[], hasNonBlank=false;
					$.each(serial, function(idx, val){
						if(!/@/.test(val.name)){  values.push(val.value); if(val.value){hasNonBlank=true;}  }
					});

					if(widget.validation.required && !hasNonBlank){
						validationError={message: widget.validation.requiredMessage || "This field is required"};						

					}else if(widget.validation.pattern){
						var pattern = new RegExp(widget.validation.pattern);
						$.each(values, function(idx, val){
							if(!pattern.test(val)){
								validationError = {message: widget.validation.patternMessage || "The field value you provided is not allowed"};
								return false;
							}							
						})
					}
				}
				actOnResult(null, validationError);
			}

			function actOnResult(err, validationError){
				if(validationError){
					$input.tooltip({tooltip:"<i class='material-icons left yellow-text' style='margin-right:7px;'>error</i> <span class='yellow-text' style='display:inline-block; position:relative; top:4px;'>" + validationError.message + "</span>", html:true, position:"top"});
					$input.addClass("invalid");
				}else{
					$input.tooltip("remove");
					$input.removeClass("invalid");
				}
				callback(err, validationError);
			}
		};


		/*********************************************************************************/
		widget.methods.init =function(){
			if(typeConfig.init){
				typeConfig.init($widget, utils);
			}
			//this needs to be done after the init
			//so that the disabled class doesn't mess with
			//any functional code (ex: selects don't and can't
			//if they're initially disabled
			if(!isLocal){
				widget.methods.enabled(false);
			}

			//if there are any valid customizations, invoke them
			if(widgetCustomizer){
				widgetCustomizer($widget, utils);
			}
		};

		/*********************************************************************************/
		widget.methods.enabled =function(enableWidget){
			if(enableWidget===undefined){
				return widget.isEnabled;
			}else{
				if(widget.disabled){
					enableWidget = false; 
				}
				enableWidget=enableWidget?true:false;
				$widget.toggleClass("disabled", !enableWidget);
				if(typeConfig.enable){
					typeConfig.enable($widget, enableWidget, utils);
				}else{
					widget.methods.getInput().prop("disabled", !enableWidget);
				}
				widget.isEnabled = enableWidget;
			}
		};

		/*********************************************************************************/
		function toggleLocalState(){
			isLocal=!isLocal;
			$lockButton.html(!isLocal ? "lock" : "lock_open");
			$lockButton.toggleClass("locked", !isLocal);
			widget.methods.enabled(isLocal);
		}

		return widget;

	};	

	return makeWidget;
};


// module.exports.initWidgets=function($dialog){
// 	if(!makeWidget){throw new Error("makeWidget has not been initialized on this page.")}
// 	var $dialogForm=$dialog.find("form");
// 	var widgetConfigs=$dialogForm.data("widgets");
// 	var widgets={};

// 	if(widgetConfigs){
// 		$.each(widgetConfigs,function(key, val){
// 			widgets[key]=makeWidget(key, val, $dialog);
// 		});

// 		$(".bl-init").each(function(index, item){
// 			var key=$(item).data("key");
// 			if(!key){throw new Error("No data-key attribute in widget markup:" + item.outerHTML)}
// 			widgets[key].methods.init();
// 			$(item).removeClass("bl-init");
// 		});
// 	}

// 	// dialog.config = $dialogForm.data("dialog-config");
// 	// dialog.utils={$:$, _:_, dialog:dialog, page:page};
// 	// dialog.utils.sling=slingConnector(dialog.utils);


// 	Materialize.updateTextFields();	

// 	return widgets;
// }


