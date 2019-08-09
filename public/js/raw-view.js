/* globals $, window */

$(function(){
	var lastHover;
	var reservedRtypes=["blacklight/meta", "foundation/components/parsys"];

	/////////////////////////////////////////
	$(".raw-nav").each(function(){
		var $btn=$(this);
		if(!$btn.hasClass("active")){
			$btn.click(function(){
				var url;
				if($btn.hasClass("processed")){
					url = window.BL.replaceSelector(window.document.location.href, "");
				}else{
					url = window.BL.replaceSelector(window.document.location.href, "unprocessed");
				}

				window.location.href = url;
			})
		}
	});


	/////////////////////////////////////////
	$(".rtype").click(
		function(){
			var $link=$(this);
			var rtype=$link.text().trim();
			if(reservedRtypes.indexOf(rtype)>-1){return false;}
			var url=window.BL.appsMount + "/blacklight/develop/cm#!" + window.BL.appsMount + "blacklight/develop/components/" + rtype + ".edit"
			var win = window.open(url, '_blank');
  			win.focus();			
		}
	);

	/////////////////////////////////////////
	$(".key").hover(
		function hoverIn(e){
			var $cur=$(this);
			var $tr=$cur.parent("tr");
			$tr.css("background-color","#eee");
		},

		function hoverOut(e){
			var $cur=$(this);
			var $tr=$cur.parent("tr");
			$tr.css("background-color","transparent");
		}

	)

	/////////////////////////////////////////
	$(".key").click(
		function click(e){
			var $cur=$(this);
			if(e.altKey){
				var path=getPropertyPath($cur);
				var hash = "#!" + path;

				if(window.history.pushState) {
				    window.history.pushState(null, null, hash);
				}
				else {
				    window.location.hash = hash;
				}
				window.BL.switchToEditMode();
				return;
			}

			var transitionSpeed = 500;
			var $tr=$cur.parent("tr");
			var $contentTd = $cur.siblings("td.value");

			var $collapseMarker = $contentTd.find("> div.collapse-marker");
			if(!$collapseMarker.length){
				$contentTd.append(`<div class="collapse-marker" style="display:none;">collapsed</div>`);
				$collapseMarker = $contentTd.find("> div.collapse-marker");
			}

			var $val = $contentTd.find("> div.val");

			if($val.is(':visible')){
				$cur.addClass("collapsed");
				$collapseMarker.show(transitionSpeed);
				$val.hide(transitionSpeed);
			}else{
				$cur.removeClass("collapsed");
				$collapseMarker.hide(transitionSpeed);
				$val.show(transitionSpeed);
			}

			e.preventDefault();
			e.stopPropagation();
		}
	);



	/////////////////////////////////////////
	$(".bl-key").each(function(){
		var $cur=$(this);
		var txt=$cur.text();
		var isBlRef, hasSingleTarget; 
		if(txt==="bl:ref"){isBlRef=true;}
		else if(/^bl:list-ancestors$|^bl:link$|^bl:list-subtree$/.test(txt)){hasSingleTarget=true;}

		if(isBlRef || hasSingleTarget){
			var $root = findUp($cur, "bl:map", {plus:1});
			if(!$root){
				console.log("Error: Could not find bl:map parent of bl:ref at ", this)
			}
			var $nodes, $targets;
			if(isBlRef){
				$nodes=$cur.parent("tr").siblings("tr").has("td:contains('nodes')");
				$targets = $nodes.find("tr tr:contains('target')");
				$cur.siblings("td.value").addClass("ref-navigate").click(function(e){
					var $btn=$(this);
					var url=$btn.text().trim();					
					if(url){
						window.location.href=url + ".raw";
					}
				});
			}else{
				$targets=$cur.parent("tr").siblings("tr").has("td:contains('target')");				
			}
			$targets.addClass("map-target");
			$targets.click(function(){
				var $btn=$(this);
				var wasMarkedAlready=$btn.find("div.val").hasClass("map-path");
				
				$(".map-path").removeClass("map-path");				
				if(wasMarkedAlready){return;}

				var targetPath=$btn.find(".value").text().trim();
				if(targetPath){
					var parts=targetPath.split("/");
					var $cur=$root;
					$btn.find("div.val").addClass("map-path");
					$.each(parts, function(idx,val){
						$cur = findDown($cur, val);
						if($cur){
							$cur.find("> td.key").addClass("map-path");
						}else{
							console.log("Couldn't resolve map path:", val, $cur.get(0));
							return false;
						}
					});

				}else{
					window.alert("No target path found");
				}
			});
		}else{
			if(txt==="bl:map"){
				$cur.parent("tr").addClass("bl-map");
			}
		}
	});

	/////////////////////////////////////////
	function findUp($cur, key, options){
		options=options||{};
		var plusCount=0;
		var $found;
		$cur.parents("tr").each(function(){
			var $candidate=$(this);			
			var $candidateKey = $candidate.find("> td.key");
			if($found){
				plusCount+=1;
				if(plusCount >= options.plus){
					$found = $candidate;
					return false;
				}
			}else if($candidateKey.text()===key){
				$found = $candidate;
				if(!options.plus){
					return false;
				}
			}
		});
		return $found;
	}


	/////////////////////////////////////////
	function findDown($cur, key, options){
		options=options||{};
		var $found;
		var $childTable = $cur.closest_descendent("table");

		if(!$childTable.length){console.log("NO TABLE INSIDE:",$cur);  return null;}

		$childTable.find("> tbody > tr > td.key").each(function(){
			var curKey = $(this).text();
			if(curKey === key){
				$found=$(this).parent("tr");
				return false;
			}
		})

		return $found;
	}


	///////////////////////////////////////////
	function getPropertyPath($cur){
		var path=[], key;
		$cur.parents("tr").each(function(){
			var $candidate=$(this);			
			var $candidateKey = $candidate.find("> td.key");
			key=$candidateKey.text();
			if(key){
				path.unshift(key);
			}
		});

		return path.join("/");
	}


});


/////////////////////////////////////////
$.fn.closest_descendent = function(filter) {
     var $found = $(),
         $currentSet = this; // Current place
     while ($currentSet.length) {
         $found = $currentSet.filter(filter);
         if ($found.length) break;  // At least one match: break loop
         // Get all children of the current set
         $currentSet = $currentSet.children();
     }
     return $found.first(); // Return first match of the collection
}  
