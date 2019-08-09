/* globals window, $ */

var buildDialog=require("./dialog-builder");
var fuzzysearch = require("./fuzzysearch");

module.exports=addChildHelpers;

/**************************************************************************************************/
function addChildHelpers($addDialog, mode){
	var $dialogBody = $addDialog.find(".modal-content");
	var $searchField = $dialogBody.find("input#search-components")
	var searchItems=[], containers=[];
	var url = $searchField.parent().data("url");

	$dialogBody.find(".explain").click(function(){
		var $explainDialog = buildDialog({
			noSave: true,
		});
		var $reasons=$dialogBody.find(".reasons");
		var html=$reasons.css("display","block").html();
		$reasons.css("display","none");

		$explainDialog.find(".modal-content").html($explainDialog.titleBar("Reasons for available choices") + html);
	})


	// attach a key up listener to input, onchange, do fuzzy search accross all items.  hide non-matches.
	$searchField.on("focus", function(){
		expandAll($dialogBody);  searchItems=[];
		$dialogBody.find(".category-container").each(function(idx,cc){
			var $cc=$(cc);  containers.push($cc);
			$cc.find("a span.title").each(function(x,a){
				var $a=$(a);
				searchItems.push({text:$a.html().toLowerCase(), $a:$a.parent("a"), ccIndex:containers.length-1})
			})
		});

		$searchField.off("keyup").on("keyup", function(evt){
			var query=$searchField.val().toLowerCase(), showContainers={};
			if(evt.keyCode===13){
				if(query.indexOf("/")<0){
					query="*/*/**/*" + query + "*";
				}
				var parsedUrl=$.url(url), params=parsedUrl.param();
				params.config=JSON.stringify({suggested:query.split(","), allowed:[]});
				params.query=query;

				$addDialog.loadBody({url:parsedUrl.attr("path"), data:params, title:"Add Child: Browse Mode"})
				.then($addDialog.processBody).then(function(){addChildHelpers($addDialog, mode);});
				evt.preventDefault();
				return;
			}

			if(evt.which !== 0){
				searchItems.forEach(function(searchItem){
					var match=fuzzysearch(query, searchItem.text);
					if(match){showContainers[searchItem.ccIndex]=true;}
					searchItem.$a.toggle(match)
				});
				containers.forEach(function($cc, idx){
					$cc.toggle(showContainers[idx]?true:false);
				})
			}
		})
	});

	if($searchField.val()){
			$searchField.select();
	}

	function expandAll($dialogBody){
		var $openMe=$dialogBody.find(".collapsible-header");
		$openMe.removeClass("active");
		$openMe.trigger("click.collapse");									
	}

}







/************************************************************************************************/
/************************************************************************************************/
module.exports.onEccAdd=function(page, editDialog){
	return function onEccAdd(){
		var $btn=$(this);
		var parentContext = page.getButtonSlingPath($btn, true);
		var slingPath = parentContext.path;
		var parentType = $btn.closest("[data-sling-type]").data("sling-type");
		var currentAjax;
		var eccConfig = $btn.data("ecc-config") || "";

		var missingParentTypes = "";
		var dialogUrl= window.BL.config.appsMount + "blacklight/edit/dialogs/add-child-component" + "?" + $.param({slingPath:slingPath, parentType: parentType, config:JSON.stringify(eccConfig)});

		var $addDialog = buildDialog({
			noSave: true
		});

		var handleClick=function(event){
			$(this).closest(".modal").closeModal();
			// event.preventDefault();
		}

		missingParentTypes = " data-add-type='" + parentContext.missing + "'";


		$addDialog.processBody=function(data, $dialogBody){
			$dialogBody.css({"background-color":"#fff"});
			$dialogBody.find(".collapsible").collapsible();
			var $searchField = $dialogBody.find("input#search-components")

			var $clickable=$dialogBody.find(".collection-item:not(.unavailable)");
			$clickable.each(function(){

				var $selected=$(this);
				var resourceType = $selected.data("type");
				var pathName =  $selected.data("name");
				var title =  $selected.data("title");

				$selected.attr("data-sling-type", resourceType);
				$selected.attr("data-sling-path", slingPath);
				$selected.attr("data-add-mode", true);
				$selected.attr("data-add-type", parentContext.missing);
				$selected.attr("data-target", editDialog.getId());
				$selected.attr("data-title", "Add new: " + title);
				// TODO: add name hint so that when new item dialog is saved, it has a name based on the resource type.

				$selected.attr("href", "#" + editDialog.getId());

				$selected.click(handleClick)
				$selected.modalButton(editDialog.getStandardEditDialogOptions());

			})
			

			if($clickable.length===1 && !$searchField.val()){
				$clickable.trigger("click");
			}

			addChildHelpers($addDialog,"component");

		}

		///////////////////////////////////////////////////////////////////////////////////////////
		$addDialog.loadBody({url:dialogUrl, data:{parentPath:slingPath}, title:"Add New Child"})
		.then($addDialog.processBody);	


	}
}












