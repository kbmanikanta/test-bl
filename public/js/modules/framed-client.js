/* globals window, module, require, Materialize, BL, _ */
var slingConnector=require("./sling-client-connector.js");
var editPageDialogs=require("./page-dialogs");

module.exports=function($, window){
	"use strict";
  var sling=slingConnector({$:$, _:_, page: window.BL.page});
	var tree=require("./tree.js")($, window, {hasPageListingCapability: window.BL.config.hasPageListingCapability, supressSlingProxy: window.BL.config.treeIgnoreProxy, treeIcon: window.BL.config.treeIcon, languageSupport: true});
	var view={};
	var $modeButtons, modeButtons={}, currentMode="view", currentPath, currentExtraHashSegments="";
	var $iframe, $loadingIndicator;
	var dialog = window.BL.editDialog;
	var $document=$(window.document);
	var staticTreeContent = window.BL.config.staticTreeContent;
	var treeBasePath=window.BL.config.treeBasePath;
	var treeDataType=window.BL.config.treeDataType || "pages";
	var blankPage=window.BL.config.appsMount + "blacklight/edit/page-manager/blank";
	var defaultFrameURL=window.BL.config.defaultFrameURL || blankPage;
	var defaultFrameMode = window.BL.config.defaultFrameMode || "view";
	var breadcrumbBaseItems;
	var lastSeenHash, ignoreManualHashChangeEvents, ignoreManualFrameLoadEvents, viewModeRegexes;
	var blProxyPrefix = window.BL.page.blProxyPrefix;
	var appsMount = window.BL.config.appsMount;
	var customActions={};
	var viewModes = window.BL.config.modes || {
		view:{prefix:""},
		edit:{prefix:window.BL.config.appsMount + "blacklight/edit/page"},
		raw:{postfix:".raw"}
	}

	if(!treeBasePath && !staticTreeContent){
		var errMsg="Internal error: developer must set blConfig.treeBasePath";
		window.alert(errMsg);
		console.error(errMsg);
	}


	window.BL.view=view;


	$.extend(view, {
		publicMount: window.BL.config.publicMount,
		appsMount: window.BL.config.appsMount,
		baseUrl: $("body").data("base-url"),
		proxyMode: $("body").data("proxied"),		
	}, window.BL.config.page);


	/****************************************************/
	view.init=function(){
		$iframe=$("#bl-iframe");
		$loadingIndicator=$("#bl-loading");

		var $bc=$("#bl-breadcrumb");

		breadcrumbBaseItems = $bc.children().length;

		$(window).keydown(function (e){
		    if ((e.metaKey || e.ctrlKey) && e.keyCode === 82) { /*ctrl+r or command+r*/
		    	if(e.shiftKey){
		    		window.location.reload(true);
		    	}else{
		    		$("#bl-reload").click();
		    	}
				e.preventDefault();
				return false;
		    }
		});


		if(staticTreeContent){
			tree.init($("#nav-tree"), staticTreeContent, {
				activate: onTreeClick,
				dblclick: onTreeClick
			});
		}else{
			tree.init($("#nav-tree"), treeBasePath, treeDataType, {
				activate: onTreeClick,
				dblclick: onTreeClick,
				loadChildren: function(event,data){
					view.applyPathAndMode();
					$("#nav-tree").fancytree("option","loadChildren", function(){});
				}
			});
		}


		////////////////////////////////////////////////////////////////////////////
		//resizing left panel stuff
		
		var topPanel = $('#top-panel');
		var leftPanel = $('#left-panel'); 
		var dragOverlay; 

		var resizeFrameItems = function(){
			topPanel.css('margin-left', leftPanel.width());
			$iframe.css('margin-left', leftPanel.width())
			$iframe.css('width', "calc(100vw - " + leftPanel.width() + "px)");
		}; 

		leftPanel.resizable({
			handles: 'e',
			minWidth: 210, 
			start: function(){
				//cover the screen with an overlay. this is needed to prevent the 
				//mouse drag from being captured by the iframe. That leads to a 
				//really choppy drag experience. 
				dragOverlay = $('<div>', {css: {
					position: 'fixed', top: 0, width: '100%', height: '100%'}
				}); 
				dragOverlay.appendTo($('body'));
			},
			stop: function(){
				if(dragOverlay){ dragOverlay.remove(); }
			},
			resize: function(event, ui){
				//need to resize the nav bar and iframe window
				resizeFrameItems(); 
				window.BL.utils.setCookie("bl-frame-size", leftPanel.width(), 365);		
			}
		});

		//is there a saved frame size?
		var savedFrameSize = window.BL.utils.getCookie("bl-frame-size"); 
		if(savedFrameSize){
			leftPanel.css('width', savedFrameSize); 
			resizeFrameItems(); 
		}

		$('select').material_select();

		var settingsButton = $("#page-actions a[data-action='settings']");

		var allowDialogOpen = false;
		settingsButton.click(function(e){
			if(!allowDialogOpen){
				//get the page data
				$.ajax({url: BL.config.appsMount + 'blacklight/edit/page' + view.path() + '.json'}).done(function(data){
					if(data && data.metaType){
						settingsButton.data('sling-path', view.path() + "/jcr:content");
						settingsButton.data('sling-type', data.metaType);

						allowDialogOpen = true;
						settingsButton.click();
					}else{
						Materialize.toast("No Page Data found for Page Settings.", 8000);
					}
				}).fail(function(){
					Materialize.toast("Couldn't open Page Settings dialog. See web console.", 8000);
				});
				e.stopImmediatePropagation();
			}
		});
		settingsButton.modalButton($.extend({},dialog.getStandardEditDialogOptions(), {beforeClose: function(){allowDialogOpen = false; return true;}}));

		(function watchForIframeURLChanges(){
			var last=$iframe[0].contentWindow.location.href, modes=global.BL.config.modes;
			// TODO: Polling is lame, but iframe URL change events are not readily available
			window.setInterval(function(){
				var currentIframeLocation = $iframe[0].contentWindow.location;
				var currentIframeURL = currentIframeLocation.pathname + currentIframeLocation.hash;

				if(last!==currentIframeURL && currentIframeURL!==defaultFrameURL){
					last=currentIframeURL;
					var result = view.parseUrlByMode(currentIframeURL);
					view.brieflyIgnoreHashEvents();
					view.path(result.path);
					view.mode(result.mode || view.mode());
					view.applyPathAndMode({skipIframeLoad:true});
				}
			}, 2000);
		})();


		$iframe.on("load", function(){
			try{
				$loadingIndicator.css("display", "none");

				$($iframe[0].contentWindow).on("unload", function(){
					$loadingIndicator.css("display", "block");
				}).keydown(function (e){
				    if ((e.metaKey || e.ctrlKey) && e.keyCode === 82) { /*ctrl+r or command+r*/
				    	if(e.shiftKey){
				    		window.parent.location.reload(true);
				    	}else{
				    		$(window.parent.document.getElementById("bl-reload")).click();
				    	}
						e.preventDefault();
						return false;
				    }
				});


				if(ignoreManualFrameLoadEvents){return;}
				var currentUrl = $iframe[0].contentWindow.location.pathname;


				var result = view.parseUrlByMode(currentUrl);

				view.brieflyIgnoreHashEvents();
				view.path(result.path);
				view.mode(result.mode || view.mode());
				view.applyPathAndMode({skipIframeLoad:true});

			}catch(err){
				console.log("Ignoring cross-domain frame: ", $iframe[0].src)								
			}
		});

		view.getHash();

		$(window).on('hashchange', function() {
			if(!ignoreManualHashChangeEvents && lastSeenHash!==window.location.hash){
				lastSeenHash=window.location.hash;
				view.getHash();
				view.applyPathAndMode();
			}
		});
		

		$(".custom-action").click(function(){
			var $btn=$(this);
			var action = $btn.find("a").data("action");
			if(customActions[action]){
				customActions[action]($btn);
			}else{
				var msg="No custom action defined for: " + action;
				console.error(msg)
				window.alert(msg)
			}
		})

		$modeButtons=$("a[data-mode]");

		$.each($modeButtons, function(key,val){
			var $btn=$(val);
			var mode=$btn.data("mode");
			modeButtons[mode]=$btn;
			$btn.click(function(){
				view.mode(mode);
				view.applyPathAndMode();
			});
		});

		$("#bl-reload").click(function(){
			tree.reload($("#nav-tree"), view.path());
			$loadingIndicator.css("display", "block");
			$iframe[0].contentWindow.location.reload(true);
		});
		

		$document.keydown(function (e) {
			if(e.altKey) {
				$iframe.focus();
				var iBL = $iframe[0].contentWindow.BL;
				if(iBL && iBL.triggerEditMode){iBL.triggerEditMode();}
			}
		});

		if(staticTreeContent){
			view.applyPathAndMode();
		}
	};


	/****************************************************/
	view.parseUrlByMode=function(href){

		var incomingLocation = window.document.createElement("a");
		incomingLocation.href = href;
		var incomingPath = incomingLocation.pathname;
		currentExtraHashSegments = (incomingLocation.hash || "").replace(/^\#\!?/,"");

		if(!viewModeRegexes){
			viewModeRegexes = _.mapValues(viewModes, (mode)=>{
				var reg=new RegExp("^" + regexize(mode.prefix) + "(.*)" + regexize(mode.postfix) + "$" );
				var score=(mode.prefix&&mode.postfix) ? 2 : ((mode.prefix||mode.postfix)?1:0);
				return {reg, score}
			});
		}

		var result={path:incomingPath};

		_.each(viewModeRegexes, (rule, mode)=>{
			var match=incomingPath.match(rule.reg);
			if(match){
				if(!result.score || rule.score>result.score){
					result={path:match[1], mode, score:rule.score};
				}
			}
		})

		result.path = "/" + result.path.replace(/\/\//g,"/").replace(/^\//,"");

		return result;

		function regexize(str){
			if(!str){return "";}
			else{return str.replace(/\./,"\\.") }
		}
	}


	/****************************************************/
	view.brieflyIgnoreHashEvents=function(){
		ignoreManualHashChangeEvents=true;
		setTimeout(()=>{ignoreManualHashChangeEvents=false}, 1000);
	}

	/****************************************************/
	view.brieflyIgnoreFrameLoadEvents=function(){
		ignoreManualFrameLoadEvents=true;
		setTimeout(()=>{ignoreManualFrameLoadEvents=false}, 2000);
	}



	/****************************************************/
	view.path=function(path, dontSetHash){
		if(path){
			//ensure that we're not setting .html in the path
			currentPath=path.replace(/\.html/g,'');
			if(!dontSetHash){
				view.setHash();
			}
		}else{
			return currentPath;
		}
	};

	/****************************************************/
	view.mode=function(mode, dontSetHash){
		if(mode){
			currentMode=mode;
			if(!dontSetHash){
				view.setHash();
			}
		}else{
			return currentMode;
		}
	};

	/****************************************************/
	view.applyPathAndMode=function(options){
		view.getHash();
		options=options||{};
		var targetNode;

		if(currentPath !== defaultFrameURL){
			targetNode=$("#nav-tree").fancytree("getTree").getNodeByKey(currentPath);
		}


		if(!targetNode){
			if(currentPath && currentPath!==defaultFrameURL){tree.openPath($("#nav-tree"), currentPath);}
		}else{
			targetNode.setActive(true);
		}


		$modeButtons.toggleClass("disabled", false);
		var $btn=modeButtons[currentMode];
		if($btn){
			$btn.toggleClass("disabled", true);
		}else{
			console.error("Unknown view mode:", currentMode);
		}

		var url=currentPath;


		var mode=viewModes[currentMode];
		if(mode){
			if(currentPath === defaultFrameURL){
				url=currentPath;
			}else{
				url = currentPath? ((mode.prefix?mode.prefix:"") + currentPath + (mode.postfix?mode.postfix:"") + (currentExtraHashSegments?("#!" + currentExtraHashSegments):"")) : defaultFrameURL;
			}
		}else{
			url=currentPath;
		}

		url=url?url.replace(/\/\//g,"/"):url;

		if(!options.skipIframeLoad){
			var currentIframeURL=$iframe[0].contentWindow.location.pathname;
			if(currentIframeURL!==url){
				view.brieflyIgnoreFrameLoadEvents();
				if(url){
					$iframe.attr("src", url);
					var parts=url.split("#");
					if(parts[0]!==currentIframeURL){
						$loadingIndicator.css("display", "block");				
					}
				}
			}
		}

		$("#bl-new-window").attr("href", url);
	}


	/****************************************************/
	function onTreeClick(event, data){

		if(event && event.originalEvent){
			var clickType = $.ui.fancytree.getEventTargetType(event.originalEvent);
			if(clickType === "expander"){return;}			
		}

		view.path(data.node.key);
		var breadcrumb=[data.node];

		data.node.visitParents(function(parent){
			breadcrumb.unshift(parent);
		});


		breadcrumb.shift();

		var $bc=$("#bl-breadcrumb");

		$bc.find("a").each(function(index, el){
			var $el=$(el);
			if(index>=breadcrumbBaseItems){
				$el.remove()
			}
		});


		// $("<a href='' class='breadcrumb'>Docs</a>").appendTo($bc);
		$.each(breadcrumb,function(key,val){
			var html="<a data-path='" + val.key + "' class='breadcrumb'>" + (val.title?val.title:val.key) + "</a>";
			$(html).appendTo($bc);
		});

		$bc.find("a:not(:first)").off("click").click(function(){
			var $link=$(this), path=$link.data("path");
			$("#nav-tree").fancytree("getTree").getNodeByKey(path).setActive();
		});

		setTimeout(function(){
			if(!data.node.isExpanded()){
				data.node.setExpanded(true);
			}
		},100);

		view.applyPathAndMode();  //skip reload of iframe if not a real click
	}


	/****************************************************/
	view.setHash=function(){
		view.brieflyIgnoreHashEvents();
		window.document.location.hash="!" + currentPath + "." + currentMode + (currentExtraHashSegments?("!" + currentExtraHashSegments):"");
	};

	/****************************************************/
	view.getHash=function(){
		var fullHash=window.document.location.hash.replace(/^\#\!?|\.html/g,"");
		var hashSegments=fullHash.split("!");
		var hash = hashSegments.shift();
		currentExtraHashSegments = hashSegments.join("!") || "";

		var parts=hash.match(/^(.*?)((\.[^\/^\.]*)?)$/,"");
		if(parts){
			view.path(parts[1], "dontSetHash");
			view.mode(parts[2].slice(1) || defaultFrameMode, "dontSetHash");
		}else{
			view.path(defaultFrameURL);
			view.mode(defaultFrameMode);
		}

	}


	/****************************************************/
	customActions.history=function(){
		editPageDialogs.history(view.path(), blProxyPrefix, appsMount);
	}	

	/****************************************************/
	customActions.activate=function(){
		editPageDialogs.activate(view.path(), blProxyPrefix, appsMount);
	}	

	/****************************************************/
	customActions.deactivate=function(){
		editPageDialogs.deactivate(view.path(), blProxyPrefix, appsMount);
	}	



	return view;
};
