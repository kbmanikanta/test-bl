/* globals module, window, jQuery */


var metaRegex=/"(jcr|cq|sling|fsc|fsl|fsr):/g ;
var keepRegex=/^(jcr|cq|sling)$/ ;


module.exports=function($){
	"use strict";
	
	var sling={};

	/*********************************************************************************/
	sling.getType=function(model){
		if(model && model._meta && model._meta._sling_resourceType){
			return model._meta._sling_resourceType;
		}
			
		return "";
	};


	/*********************************************************************************/
	sling.getTitle=function(model){
		if(model && model._meta && model._meta._jcr_content){
			if(model._meta._jcr_content._jcr_title){
				return model._meta._jcr_content._jcr_title;
			}
		}
			
		return "";
	};



	/*********************************************************************************/
	sling.requestPage = function(path, options, callback){
		if(typeof(options)==="function"){
			callback=options;
			options={};
		}

		if(!options.depth){options.depth="infinity";}

		path = sling.trimUrl(path);

		if(!path.match(/\/(jcr\:content|_jcr_content)$/)){
			path=path + "/_jcr_content";
		}

		path = path + "." + options.depth + ".json";

		sling.request(path, options, callback);
	};



	/*********************************************************************************/
	sling.request = function(path, options, callback){
		if(typeof options === "function"){
			callback=options;
			options={};
		}
		if(!options){options={};}

		var uri=sling.buildUrl(path);

		var request = new window.XMLHttpRequest();
		request.open("GET", uri);
		request.onload = function(event) {
			if (request.status < 300 && request.status >= 200) {	
				options.uri=uri;
				if(!request.responseText.trim()){
					callback("No response text from sling request:" + uri);
				}else{
					sling.processBody(request.responseText, options, callback);
				}
			} else {
				if(console){console.error("Error " + request.status + " from sling request.");}
				callback("Sling request error: " + request.statusText.trim());
			}
		};
		request.send();


		
	};



	/*********************************************************************************/
	sling.processBody = function(bodyText, options, callback){
		if(!options.leaveMangledNames){
			bodyText = bodyText.replace(metaRegex, function(match,p1){if(p1.match(keepRegex)){return("\"_"+p1+"_");}else{return("\"");}});
		}

		if(options.dontParseBody){
			callback(null, bodyText);
		}else{
			var model={};

			try {
				model=JSON.parse(bodyText);
			}
			catch (err) {
				var msg="JSON parse error: " + options.uri + "\n" + err + "\n" + bodyText;
				console.error(msg);
				callback(msg);
			}

			if(!options.dontStashMeta){
				sling.stashMeta(model);
			}
			callback(null, model);
		}
	};




	/*********************************************************************************/
	sling.buildUrl = function(path){
		var proxyPrefix = $.page.blProxyPrefix || "";
		path = sling.trimUrl(path);		
		return proxyPrefix + "/" + path;
	};


	/*********************************************************************************/
	sling.makeBaseUrl = function(url, depth){
		if(typeof url === "number"){
			depth=url;
			url="";
		}else{
			if(!depth){throw new Error("Usage: sling.baseUrl([url], [depth]) ... with no url, will use current page's baseUrl");}
		}

		if(!url){
			url=$.page.baseUrl;
		}

		if(depth){
			var baseUrl=sling.trimUrl(url);
			var parts=baseUrl.split("/");
			return parts.slice(0,depth).join("/");
		}else{
			return url;
		}
	};


	/*********************************************************************************/
	sling.trimUrl = function(url){
		if(url && url.replace){
			return url.replace(/^\//,"").replace(/\/$/,"");
		}else{
			return "";
		}
	};


	/*********************************************************************************/
	sling.stashMeta=function(model){
		model._meta={};
		Object.defineProperty(model, "_meta", {enumerable: false});

		jQuery.each(model,function(key, val){
			if(key[0]==="_"){
				model._meta[key]=val;
				delete model[key];
			}else{
				if(jQuery.isPlainObject(model[key])){
					sling.stashMeta(model[key]);
				}
			}
		});
	};





	return sling;

};