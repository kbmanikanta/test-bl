/* globals window, _, $ */

module.exports = function makeBreadcrumbNav($el, options){
	var segmentCounter=0;
	var roots = options.roots;
	var moreAvailable = " &nbsp;... &nbsp; &nbsp; &nbsp; &nbsp;";
 	var blProxy=options.supressSlingProxy?"":window.BL.config.slingProxyPrefix;
	var matchingRoot = "";
	var clickIndex=0;

	if(roots && roots.length){
		var rts = _.map(roots,function(val,idx){return val.path || val});
		if(options.startingPath){
			_.each(rts, function(root){
				if(options.startingPath.indexOf(root)===0){
					if(root.length > matchingRoot.length){
						matchingRoot = root;
					}
				}
			});
		}
		if(!matchingRoot){matchingRoot = rts[0];}
		addSegment(matchingRoot,rts);

		if(options.startingPath){
			var remainingPath = options.startingPath.slice(matchingRoot.length+1).split("/");
			var curPath=matchingRoot.replace(/\/$/,"");
			var nextRemainder=function(){
				if(remainingPath.length){
					loadChildren(curPath, function(err, children){
						var curSelectedName = remainingPath.shift();
						if(err){console.error("Error loading from", curPath, err); return;}
						if(children && children.length){
							addSegment(curSelectedName, children);
						}
						curPath += ("/" + curSelectedName);
						nextRemainder();				
					})
				}else{
					updateToCurPath(clickIndex);
				}
			}
			nextRemainder();
		}
	}

	$el.data("value", options.startingPath || matchingRoot)


	//////////////////////////////////////////////////////////////////////////////////////////////////////
	function addSegment(value, options){
		var segmentId="bread-nav-segment-" + (segmentCounter++).toString();

		var dropdown=[`<ul id="${segmentId}" class="dropdown-content">`];

		if(!value){
			dropdown.push(`<li class="bread-nav-link more"><a href="javascript:;">${moreAvailable}</a></li>`);			
		}

		for(var i=0;i<2;i++){
			_.each(options, function(val, idx){
				val = val.path || val;
				if((i===0 && val===value) || (i>0 && val!==value)){
					dropdown.push(`<li class="bread-nav-link" data-val="${val}"><a href="javascript:;">${val}</a></li>`);
				}
			});		
		}
		dropdown.push("</ul>");

		var html=`<span class="bread-nav-segment"><a class="dropdown-button" href="#" data-value="${value}" data-activates="${segmentId}">/ ${value.replace(/^\//,"") || moreAvailable}</a>\n` + dropdown.join("\n") + "</span>";

		$el.append(html);			
		$el.find(".dropdown-button").dropdown({hover: true, belowOrigin: true, constrainWidth:false});
		
		$el.find(`#${segmentId} .bread-nav-link`).click(function(){
			clickIndex++;
			var $item = $(this);
			if($item.hasClass("more")){return;}

			var selectedValue = $item.data("val");
			var $segment = $item.closest(".bread-nav-segment");
			var $button = $segment.find(".dropdown-button");

			$segment.find(".bread-nav-link.more").remove();
			$button.html("/ " + selectedValue.replace(/^\//,""));
			$button.data("value", selectedValue);
			$item.parent().prepend(this);
			$segment.nextAll().remove();
			updateToCurPath(clickIndex);
			$el.trigger("change", $el.data("value"));
		});
	}


	//////////////////////////////////////////////////////////////////////////////////////////////////////
	function updateToCurPath(myClickIndex){
		var curPath="";
		$el.find(".bread-nav-segment .dropdown-button").each(function(){
			var curVal = $(this).data("value").replace(/^\//,"");
			if(curVal && curVal !== moreAvailable){
				curPath += ("/" + curVal);
			}
		});

		loadChildren(curPath, function(err, children){
			if(err){console.error("Error loading from", curPath, err); return;}
			if(children && children.length && myClickIndex===clickIndex){
				addSegment("",children);
			}
		});
		$el.data("value", curPath);
	}


	//////////////////////////////////////////////////////////////////////////////////////////////////////
	function loadChildren(baseUrl, cb){
		var url = blProxy + baseUrl + ".list.assets.detail.1.json";
 		var results=[];
		
		$.ajax({url: url, dataType:"json"})
		.done(function(data){
			if(data.resources){
				$.each(data.resources, function(key,val){
					if(val.type === "folder"){
						var title=val.title, name=val.path.split("/").pop();
	  					results.push({title:title?title:name, path:name});
	  				}
				});
				results=_.sortBy(results,"path");
		  		cb(null,results);
			}else{
		  		cb("Unable to load page listing.");
			}
		});		
	}	

}