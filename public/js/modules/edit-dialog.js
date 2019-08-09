"use strict";
/* globals Materialize, _ */

var slingConnector=require("./sling-client-connector.js");
var dataMapWidget=require("../../../apps/widgets/mapping-widget/client.js");

module.exports=function($, window, page, dialogId, options){
	var dialog={};
	options=options||{};
	var document=window.document;
	dialogId = dialogId.replace(/^#/,"");
	var $dialogForm;
	var $dialog=$("#" + dialogId);
	var makeWidget=require("./widgets-client.js")($, window, page);
	var $saveButton = $dialog.find(".bl-save-button");
	var $dataMapButton = $dialog.find(".bl-data-map");
	var $annotationsButton = $dialog.find(".bl-annotations");
	var $nodeNameField = $dialog.find("#bl-node-name");
	$dialog.data("dialog", dialog);

	var widgets={};
	var componentTemplateUrl = window.BL.config.appsMount + "blacklight/edit/component/template-content";

	$.ajaxSetup({ cache: false });


	///		getValue(fieldName), setValue(fieldName), hide(fieldName),  show(fieldName), 
	///		getConfig(fieldName), valueChanged(fieldName)
	///
	///		can you avoid onChange() type notion, by virtue of auto-dependencies through "getValue"  ?


	/*********************************************************************************/
	dialog.init = function(){
		$dialogForm=$dialog.find("form");
		var widgetConfigs=$dialogForm.data("widgets");

		$.each(widgetConfigs,function(key, val){
			widgets[key]=makeWidget(key, val, dialog);
		});

		$dialog.find(".bl-widget").each(function(index, item){
			var key=$(item).data("key");
			if(!key){throw new Error("No data-key attribute in widget markup:" + item.outerHTML)}
			widgets[key].methods.init();
			$(item).removeClass("bl-init");
		});

		dialog.$widgetBody = $dialog.find(".widget-body");
		dialog.$mappingBody = $dialog.find(".mapping-body");
		dialog.$annotationsBody = $dialog.find(".annotations-body");

		if(dialog.showDataMapFirst){
			$dataMapButton.click();
		}

		if(dialog.showAnnotationsFirst){
			$annotationsButton.click();
		}

		dialog.config = $dialogForm.data("dialog-config");

		if(dialog.config.hasDataMap){
			$dataMapButton.removeClass("ghosty").addClass("semi-ghosty");
		}else{
			$dataMapButton.addClass("ghosty").removeClass("semi-ghosty");
		}

		$nodeNameField.val("");
		if(dialog.config && dialog.config.developerMode && dialog.config.addMode){
			$nodeNameField.parent().css("display","inline-block");
		}

		dialog.utils={$:$, _:_, dialog:dialog, page:page};
		dialog.utils.sling=slingConnector(dialog.utils);

		Materialize.updateTextFields();	
		dialog.mappingPage = dataMapWidget($, window, page, $dialog);
	}


	/*********************************************************************************/
	dialog.getWidget = function(fieldName){
		if(!widgets[fieldName] && console){console.error("Can't find widget named:", fieldName);}
		return widgets[fieldName];
	}



	/*********************************************************************************/
	dialog.getStandardEditDialogOptions = function(){
		var jcrBasePath;
		
		if(/^\/etc\/tags/.test(page.baseUrl)){
			jcrBasePath = page.baseUrl + "/";
		}else{
			jcrBasePath = page.baseUrl + "/jcr:content/";
		}

		return {
			////////////////////////////////////////
			beforeOpen: function($dialog, $btn){
				var slingPath=$btn.closest("[data-sling-path]").data("sling-path");
				var parentContext={};

				var addType=$btn.data("add-type");
				if(!slingPath){
					parentContext = page.getButtonSlingPath($btn, true);
					slingPath=parentContext.path;
					if(!addType){
						addType=parentContext.missing;
					}
				}

				if(!options.noHash && !(window.BL && window.BL.config && window.BL.config.noDialogHash)){
					window.replaceHash("#!" + slingPath.slice(jcrBasePath.length))
				}

				var addMode=$btn.data("add-mode") || "";
				var content="";

				if(addMode){
					content=$btn.data("content") || "";
					if(content && typeof content!=="string"){content=JSON.stringify(content)}
				}

				openEditDialog({
						slingType: $btn.closest("[data-sling-type]").data("sling-type"),  
						slingPath:slingPath,  
						title: $btn.data("title") || "",
						addMode: addMode,
						addType: addType,
						mergeMarker: $btn.data("merge-marker"),
						content:content,
						inheritFrom: parentContext.inheritFrom || "",
						showDataMapFirst: $btn.data("mapping-mode"),
						showAnnotationsFirst: $btn.data("annotations-mode")
					},
				$dialog);
			},

			////////////////////////////////////////
			beforeClose: function($dialog){
				return true; //confirm("Really close it?")
			},

			////////////////////////////////////////
			top: "7%"
		};
	}



	/*********************************************************************************/
	function openEditDialog(options, $actionDialog){

			var $dialog	= $actionDialog || $("#" + dialogId);
			
			$dialog.find(".spinner").css("display", "none");

			var uri= window.BL.config.appsMount + "blacklight/edit/dialogs/edit/" + options.slingType;

			options.modalId=dialogId;
			
			var $modalContent = $dialog.find(".modal-content");

			$modalContent.html("<div height='100%' class='' style='text-align:center;padding:50px;'><div><a href='" + uri + "' target='_blank'><i class='fa fa-refresh fa-spin fa-5x' style='color:#e0e0e0;font-size:150px'></i></a></div><div style='margin-top:30px;clear:both;'>LOADING...</div></div>");


			$.ajax({url:uri, 
				data: options,
				dataType:"html"})
			.done(function(data){

				var content = $(data)
				var script="alert('Could not find dialog initialization script')";
				for(var i=0; i<content.length;i++){   /// For some reason, content.remove("script") was not working. So this hack.
						if(content[i].tagName === "SCRIPT"){
							script=content[i].innerText || content[i].innerHTML;
							content.splice(i,1)
					}
				}

				$modalContent.html(content);
				$.globalEval(script);
				dialog.showDataMapFirst = options.showDataMapFirst;
				dialog.showAnnotationsFirst = options.showAnnotationsFirst;
				dialog.init();
			
			})
			.fail(function(ajax, status, errorObj){
				$modalContent.html("<div style='margin:48px;margin-bottom:24px;'>Could not load dialog, internal error:<br><a target='_blank' href='" + uri + "?" + $.param(options) + "'>" + uri + "</a></div>" + (ajax.responseText ? ("<div class='error'>" + ajax.responseText + "</div>") : ""));
			});
	}



	/*********************************************************************************/
	function makeSlingFromValues(valuesArray){
		var values={}, keys=[], sling={};
		$.each(valuesArray, function(idx,val){
			var key=val.name.replace(/^\.\//, "").replace(/\/\.\//g,"/");
			val.key=key;
			// console.log(key,"=",val.value)
			values[key]=val.value;
			if(key.indexOf("@")===-1){keys.push(key);}
		});

		////////////////////////////////////////////////////////////////
		$.each(valuesArray,function(idx, cur){
			if(cur.key.indexOf("@")===-1){
				setValue(sling, cur.key, cur.value);
			}
		});
		return sling;


		/////////////////////////////////////////////////////////////////////
		function setValue(sling, keyPath, value){
			var parts=keyPath.split("/");
			var tailKey = parts.pop();
			var targetObject=sling;					
			var keysToTarget=[];
			var curPartialKey;

			while(curPartialKey = parts.shift()){
				keysToTarget.push(curPartialKey);
				addKeyWithTypeHint(targetObject, curPartialKey, keysToTarget.join("/") );
				targetObject=targetObject[curPartialKey];
			}

			addKeyWithTypeHint(targetObject, tailKey, keyPath);



			var ignoreBlanks=values[keyPath + "@IgnoreBlanks"];
			if( !ignoreBlanks || (ignoreBlanks && value)){
				if(values[keyPath + "@TypeHint"]==="String[]"){
					targetObject[tailKey].push(value);
				}else{
					targetObject[tailKey]=value;
				}
			}
		}

		/////////////////////////////////////////////////////////////////////
		function addKeyWithTypeHint(targetObject, targetPartialKey, fullKeyPath){
			if(typeof(targetObject[targetPartialKey])!=="undefined"){
				return;
			}

			var hintPath=fullKeyPath + "@TypeHint";
			if(values[hintPath]==="String[]"){
				targetObject[targetPartialKey]=[];
			}else{
				var needsObjectType=false;
				$.each(keys,function(idx,curKey){
					if(curKey.indexOf(fullKeyPath + "/")===0){
						needsObjectType=true; 
						return false;
					}
				});

				if(needsObjectType){
					targetObject[targetPartialKey]={};
				}else{
					targetObject[targetPartialKey]="";
				}
			}
		}		
	}


	/*********************************************************************************/
	dialog.get$=function(){
		return $dialog;
	}


	/*********************************************************************************/
	dialog.serialize = function(){
		var valuesList=[];

		if(dialog.mappingPage.postFields){
			valuesList = valuesList.concat(dialog.mappingPage.postFields);
		}

		getChildWidgets($dialog).each(
			function(idx, widget){
				var widgetKey=$(widget).data("key");
				var result=widgets[widgetKey].methods.getValue();
				if(result && result.length){	
					valuesList=valuesList.concat(result);
				}
			});


		return valuesList;
	};

	/*********************************************************************************/
	var getChildWidgets=function($parentWidget){
		var allDescendants = $parentWidget.find(".bl-widget");
		return allDescendants.filter(function(idx,el){
			var parent=$(el).parent().closest(".bl-widget");
			return parent.is($parentWidget);
		});

	};


	/*********************************************************************************/
	dialog.saveAction = function(){
		var allClear = true;
		var $btn=$(this);
		var keys=Object.keys(widgets);


		if(dialog.mappingPage.dirty){
			dialog.mappingPage.validate((err, mappingValues)=>{
				if(err){
					Materialize.toast(err, 8000);
				}else{
					validateNext();
				}
			})
		}else{
			validateNext();	
		}

		function validateNext(){
			if(keys.length){
				var key=keys.shift();
				var widget=widgets[key];
				widget.methods.validate(function(err, validationError){
					if(validationError){allClear=false;}
					validateNext();
				})
			}else{
				if(allClear){
					dialog.saveAfterValidation($btn);
				}else{
					Materialize.toast("Please review your content for errors and retry.", 8000)
				}
			}
		};
		
	}

	/*********************************************************************************/
	dialog.saveAfterValidation = function($btn){

			/// TODO: First check if "this" is the save button.  If so, great.  If not, use dialogId to grab dialog.
			var $dialogWidget = $btn.closest(".bl-widget");

			$dialogWidget.find(".spinner").css("display", "block");

			////////////////////////////////////////////////////////////
			function addMissingParentTypes(cb){
				var types=dialog.config.addParentType.split(";");

				function addCurrentType(){
					if(types.length>0){
						var typeSpec = types.shift().split(",");
						var curPath=typeSpec[0], curType=typeSpec[1];

						var fd=new window.FormData();
						var request = new window.XMLHttpRequest();
						fd.append("sling:resourceType", curType);

						request.open("POST", page.blProxyPrefix + curPath);
						request.send(fd);	
						request.onload = function(event){
							if(request.status >= 200 && request.status<300){
								addCurrentType();
							}else{
							  if(console){console.error("Error " + request.status + " occurred when trying to write ECC type.");}
							  window.alert("There was an error writing your content to the server.\nYour changes may not be saved.");
							}
						}
					}else{
						cb();
					}
				}
				addCurrentType();
			}


			////////////////////////////////////////////////////////////
			function addComponentTemplate(baseName, options, cb){
				console.log("Writing component template content locally for:", fd.get("sling:resourceType"),"\n",componentTemplateUrl);
				$.ajax({url:componentTemplateUrl,data:{
					resourceType: fd.get("sling:resourceType"),
					path: dialog.config.saveTarget,
					prefix: ""
				
				}}).then(function(data){
					if(data.template){
						$.each(data.template, function(idx, item){
							if(!fd.has(item.name)){
								if(_.isArray(item.value)){
									fd.append(item.name + "@TypeHint", "String[]")
									_.each(item.value,function(val){
										fd.append(item.name, val);								
									})
								}else{
									fd.append(item.name, item.value);								
								}
							}
						})
					}
					postMainSling();
				});

			}


			////////////////////////////////////////////////////////////
			function postMainSling(){
				//console.log("POSTING",fd, "\nTo:", saveTarget);
				var request = new window.XMLHttpRequest();
				request.open("POST", page.blProxyPrefix + dialog.config.saveTarget);
				request.send(fd);
				request.onload = function(event) {
					if (request.status >= 200 && request.status<300) {
						$dialogWidget.find(".spinner-layer").removeClass("spinner-red-only").addClass("spinner-green-only");
						document.location.reload(true);
					} else {
					  if(console){console.error("Error " + request.status + " occurred when trying to save your content.");}
					  window.alert("There was an error writing your content to the server.\nYour changes may not be saved.");
					}
				};
			}


			////////////////////////////////////////////////////////////
			function buildFdValues(){
				$.each(valuesArray, function(idx,val){
					var key=val.name.replace(/^\.\//,"").replace(/\/\.\//g,"/");
					fd.append(key, val.value);
				});

				if(dialog.config.addMode){
					fd.append(":order","last");
					if(dialog.config.mergeMarker){
						fd.append("sling:dontMerge",  dialog.config.mergeMarker==="false" ? "" : "true");
					}

					if(dialog.config.addParentType){
						addMissingParentTypes(addComponentTemplate);
					}else{
						addComponentTemplate();
					}
				}else{
					postMainSling();
				}
			}




			////////////////////////////////////////////////////////////
			function findUniqueNumberedName(baseName, options, cb){
				var namespace="";
				if(typeof(options)==="function"){cb=options;options={};}
				if(!options.slingConnectorPreservesNamespace){
					var parts=baseName.match(/^(.*:)(.*)/);
					if(parts){
						namespace=parts[1];
						baseName=parts[2];
					}
				}

				var pad = options.baseNumber || "0000";
				dialog.utils.sling.request(dialog.config.saveTarget + ".1.json",function(err, data){
					if(err){data={};}
					var keys=Object.keys(data), found=false, i=0, name="";
					while(!found && i<20000){
						var num = i.toString();
						var postfix = pad.substring(0, pad.length - num.length) + num;
						name=namespace + baseName + postfix;
						if(namespace){
							found = keys.indexOf(baseName + postfix)<0;
						}else{
							found = keys.indexOf(name)<0;
						}
						i++;
					}
					if(found){
						cb(null, name);
					}else{
						window.alert("Uh oh. 'findUniqueNumberedName()' can't find available name: " + name);
					}
				});
			}


			////////////////////////////////////////////////////////////
			if($dialogWidget.length){
				var $form=$dialogWidget.find("form");

				var valuesArray = dialog.serialize();
				var sling = makeSlingFromValues(valuesArray);

				//console.log("SAVING SLING:", sling, valuesArray);
				var fd=new window.FormData();
				fd.append("_charset_", "utf-8");
				fd.append(":status", "browser");


				var hasResourceType = false, i;
				for(i=0; i<valuesArray.length && !hasResourceType; i++){
					hasResourceType=valuesArray[i].name==="sling:resourceType";
				}
				if(!hasResourceType){
					fd.append("sling:resourceType", dialog.config.slingType);
				}

		
				if(dialog.config.addMode){
					if(dialog.config.forceEntryName && (typeof dialog.config.forceEntryName === "function") ){
						try{						
							dialog.config.saveTarget = dialog.config.saveTarget.replace(/\/\*$/,"");
							dialog.utils.saveTarget = dialog.config.saveTarget;
							dialog.utils.findUniqueNumberedName = findUniqueNumberedName;
							dialog.config.forceEntryName(sling, dialog.utils, function(err,newNodeName){
								if(err){throw err;}
								newNodeName= newNodeName.replace(/\//g,"");
								dialog.config.saveTarget = dialog.config.saveTarget + "/" + newNodeName;
								buildFdValues();
							});
						}catch(err){
							var msg = "Problem running 'forceEntryName' function for this new entry.";
							window.alert(msg + " See console.");
							console.error(msg, err);
						}
					}else{
						var firstVal = valuesArray[0];
						if(firstVal){if(firstVal.name.match(/@/)){
							firstVal=null;
						}}

						var forcedName = $nodeNameField.val();

						if(forcedName){
							fd.append(":name", forcedName);
						}else{
							var nameHint = dialog.config.nameHint || (firstVal?firstVal.value:"") || dialog.config.fallbackNameHint || "";

							if(nameHint){
								fd.append(":nameHint", nameHint);
							}
						}


						buildFdValues();
					}
				}else{
					buildFdValues();
				}

				
			}else{
				window.alert("No dialog attached to this save button.");
			}
	}





	/*********************************************************************************/
	dialog.getId=function(){return dialogId;}

	$saveButton.click(dialog.saveAction);

	$dataMapButton.click(function(){
		var transitionSpeed=500;
		$dataMapButton.removeClass("ghosty").addClass("semi-ghosty");
		if(dialog.$mappingBody.is(":visible")){
			swap($dataMapButton, "Data Map", "my_location", "arrow_forward");
			dialog.$mappingBody.hide(transitionSpeed);
			dialog.$widgetBody.show(transitionSpeed);		
		}else{
			swap($dataMapButton, "Content", "arrow_back", "edit");
			dialog.$mappingBody.show(transitionSpeed);
			dialog.$widgetBody.hide(transitionSpeed);		
		}
		swap($annotationsButton, "Annotations", "chat", "arrow_forward");
		dialog.$annotationsBody.hide(transitionSpeed);
	});

	$annotationsButton.click(function(){
		var transitionSpeed=500;
		$annotationsButton.removeClass("ghosty").addClass("semi-ghosty");
		if(dialog.$annotationsBody.is(":visible")){
			swap($annotationsButton, "Annotations", "chat", "arrow_forward");
			dialog.$annotationsBody.hide(transitionSpeed);
			dialog.$widgetBody.show(transitionSpeed);
		}else{
			swap($annotationsButton, "Content", "arrow_back", "edit");
			dialog.$annotationsBody.show(transitionSpeed);
			dialog.$widgetBody.hide(transitionSpeed);
		}
		swap($dataMapButton, "Data Map", "my_location", "arrow_forward");
		dialog.$mappingBody.hide(transitionSpeed);
	});

	function swap(button, title, icon, icon2){
		button.find("i:first-child").text(icon);
		button.find(".btn-title").text(title);
		button.find("i:eq(1)").text(icon2);
	}

	return dialog;

}

