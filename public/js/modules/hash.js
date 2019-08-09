/* globals module */

module.exports = function($, window, page){
	"use strict";
	var updateHashOnCollpase=true, actOnHashChange=true;
	var hash={};

	hash.init=function(){

		$(window.document).on("collapse-toggle", function(ev, $header){
				if(updateHashOnCollpase && !$header.data("no-hash")){
					var path=page.getButtonSlingPath($header.first()), parts;
					var itemWasOpened=$header.hasClass("active");
					var basePath = page.baseUrl + "/jcr:content/";
					path = path.slice(basePath.length);

					if(!itemWasOpened){
						parts=path.split("/");
						parts.pop();
						path=parts.join("/");
					}
					actOnHashChange=false;
					setTimeout(function(){actOnHashChange=true;},500);
					window.replaceHash("#!" + path);
				}
			});
	};



	hash.actOnUrlHash=function(){
			if(!actOnHashChange){ return;}
			var hash=window.document.location.hash;
			var requestedPath=hash.replace(/^\#\!\/?/,"");		
			var seekingChildPath=requestedPath;
			var jcrBasePath = page.baseUrl + "/jcr:content";
			var currentBasePath="", lastTimeout;

			if(seekingChildPath){
				updateHashOnCollpase=false;


				$(".page-level-li").each(function(idx, item){
					var $item=$(item);
					var isEcc=$item.data("is-ecc");
					var key=isEcc? $item.find("div.eccContainer").data("key"):$item.data("key");


					if(seekingChildPath.indexOf(key)===0){
						// var $collapseMe = $(item).siblings();
						// $collapseMe.each(function(idx,item){
						// 	var $collapsible = $(item).find(".collapsible-header").first();
						// 	$collapsible.addClass("active");
						// 	$collapsible.trigger("click.collapse");		
						// });

						var $openMe = $item.find(".collapsible-header").first();
						$openMe.removeClass("active");
						$openMe.trigger("click.collapse");

						lastTimeout = window.setTimeout((function($child){return function(){
								$('html, body').animate({
								     scrollTop: ($child.offset().top - 100)
								 }, 250);						
						};})($item),250);

						expandNextChild($item, key);
						return false;
					}
				});


				function expandNextChild($parent, parentKey){

					seekingChildPath = parentKey?seekingChildPath.slice(parentKey.length+1):seekingChildPath;
					currentBasePath = currentBasePath + (currentBasePath?"/":"") + parentKey;

					var firstPart = seekingChildPath.split("/").shift();

					// console.log("Now seeking:", firstPart, "\nout of:", seekingChildPath, "\nfrom base:", currentBasePath,"\nunder:",$parent);


					$parent.find("[data-key='" +firstPart + "'],[data-key^='" +firstPart + "/']").each(function(idx, child){
						var $child=$(child);
						var parentPath = page.getButtonSlingPath($child).slice(jcrBasePath.length+1);

						// console.log("OPENING?:", parentPath.replace(/^\//,""), "?==", currentBasePath);
						if(parentPath.replace(/^\//,"") === currentBasePath){
							var childKey=$child.data("key");
							if($child.hasClass("eccContainer")){
								// console.log("Not opening ECC:", currentBasePath, "+", childKey)
							}else{
								var $openMe=$child.find(".collapsible-header").first();
								$openMe.removeClass("active");
								$openMe.trigger("click.collapse");									
							}

							if(lastTimeout){clearTimeout(lastTimeout);}
							lastTimeout = window.setTimeout((function($child){return function(){
									$('html, body').animate({
									     scrollTop: ($child.offset().top - 100)
									 }, 250);						
							};})($child),250);
							expandNextChild($child, childKey);

							return false;
						}
						// else{
						// 	console.log("ABORTING. PARENT PATH:", parentPath, "!=", currentBasePath)
						// }

					});
				}
				updateHashOnCollpase=true;
			}

	};


	///////////////////////////////////////////////////////////////////////////
	function initReplaceHash(){
		if ('replaceState' in window.history) { // Yay, supported!
		  window.replaceHash = function(newhash) {
		      if ((''+newhash).charAt(0) !== '#') {newhash = '#' + newhash;}
		      window.history.replaceState('', '', newhash);
		  };
		} else {
		  var hash = window.document.location.hash;
		  window.replaceHash = function(newhash) {
		      if (window.document.location.hash !== hash) {window.history.back();}
		      window.document.location.hash = newhash;
		  };
		}
	}



	///////////////////////////////////////////////////////////////////////////
	initReplaceHash();
	return hash;

};
