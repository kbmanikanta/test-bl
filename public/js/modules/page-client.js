/* globals  module, require, BL  */

require("./bl-modal");
require("./dialog-builder");

module.exports=function($, window){
	"use strict";
	var page=$.extend({
		publicMount: window.BL.config.publicMount,
		appsMount: window.BL.config.appsMount,
		baseUrl: $("body").data("base-url"),
		proxyMode: $("body").data("proxied"),		
	}, BL.config.page);


	page.blProxyPrefix="";
	if(!page.proxyMode){
		page.blProxyPrefix = window.BL.config.appsMount + "blacklight/edit/proxy";
	}

	var editDialog=require("./edit-dialog.js")($, window, page, "#bl-edit-dialog");
	var pageInit=require("./page-client-init.js")($, window, page, editDialog);
	var hash=require("./hash.js")($, window, page);

	window.BL.editDialog=editDialog;	

	///////////////////////////////////////////////////////////////
	page.init=function(){

		window.addEventListener("hashchange", hash.actOnUrlHash, false, false);
		hash.init();

		$.each(pageInit, function(selector, method){
			method($(selector));
		});

		hash.actOnUrlHash();

		if(window.self !== window.top && window.top.BL){
			$(".fixed-action-btn.page-actions").css("display", "none");
		}else{
			$("header .navbar-fixed").css("display","block");
			$("ul.collapsible li.page-control").css("display","list-item");
		}

	};





	//////////////////////////////////////////////////////////////////////
	page.getButtonSlingPath=function($btn, getExtendedInfo){
		var keys=[], slingPath=$btn?$btn.data("sling-path"):"";
		var allInherited=[], inheritFrom="", cancelAllInheritance=false;

		if(slingPath){
			if(typeof slingPath === "function"){
				slingPath=slingPath($btn);
			}
			return {path:slingPath};
		}

		if($btn){
			$btn.parents("[data-key]").each(function(idx,val){
				var $val=$(val), inheritSetting;
				var key=$val.attr("data-key");
				var trimmedKey=key.replace(/^\/|\/$/g, '');
				if(trimmedKey){
					if(getExtendedInfo){ 
						inheritSetting=$val.data("inherited");
						keys.unshift({key: trimmedKey, missing: $val.data("missing-type"), inherited: inheritSetting});
					}else{
						keys.unshift(trimmedKey);
					}
				}

			});
		}

		if(getExtendedInfo){
			var path="";
			var missing=[];
			$.each(keys, function(idx, val){
				path = path.replace(/\/$/,"") + ("/" + val.key);
				if(val.missing){
					missing.push(path +"," + val.missing);
				}

				if(val.inherited===false){cancelAllInheritance=true;}
				if(val.inherited && !cancelAllInheritance){
					allInherited.push(path);
					if(!inheritFrom || path.length<inheritFrom.length){
						inheritFrom=path;
					}
				}
			});
			return {path: path, missing: missing.join(";"), allInherited, inheritFrom};
		}else{
			return "/" + keys.join("/");
		}
	};


	///////////////////////////////////////////////////////////////
	page.runtimeError=function(message, detail1, detail2){
		window.alert("Blacklight Runtime Error:\n" + (message?message:""));
		if(console && console.error){
			console.error("Blacklight Runtime Error:\n",message + "\n", (detail1?detail1:""), (detail2?detail2:""));
		}
	};



	///////////////////////////////////////////////////////////////
	page.setCookie = function(cname, cvalue, exdays) {
	    var d = new Date();
	    d.setTime(d.getTime() + (exdays*24*60*60*1000));
	    var expires = "expires="+d.toUTCString();
	    window.document.cookie = cname + "=" + cvalue + "; " + expires +  "; path=/";
	};



	return page;


};