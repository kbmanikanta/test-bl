/* globals module, require, Materialize */


module.exports=function($, window){
	"use strict";

	$("#page-actions a[data-target]").each(function(idx,val){
		var $btn=$(val);
		var action=$btn.data("action");

		switch(action){
			case "delete":
				$btn.click(onDeleteRequest);
			break;

			case "add":
				$btn.click(function(){require("./add-page-client")({view:window.BL.view})});
			break;
		}
	});

	/****************************************************/
	// TODO: NOT DRY!  Shared with component-manager-client.js
	function onDeleteRequest(){
		var view=window.BL.view;
		var $dialog=$("#bl-delete-page-dialog");
		var $deleteButton = $dialog.find(".bl-delete-button");
		var $modalContent=$dialog.find(".modal-content");
		var slingPath=view.path();

		$deleteButton.off().one('click', function(){
			var uri;
			uri= window.BL.config.slingProxyPrefix + view.path();

			var fd=new window.FormData();
			fd.append("_charset_", "utf-8");
			fd.append(":operation", "delete");

			var request = new window.XMLHttpRequest();
			request.open("POST",uri);
			request.send(fd);
			request.onload = function(event) {
				if (request.status === 200) {
					var pathParts=slingPath.split("/");
					pathParts.pop();
					view.path(pathParts.join("/"));
					window.document.location.reload(true);
					$dialog.closeModal();
				} else {
					$modalContent.html("<span class='red-text'>Error deleting content at '" + slingPath +"' </span>");
				}
			};
		});

		$dialog.css({height:"80%", width:"90%", maxWidth:"900px"});

		$modalContent.html("<span class='red-text'>Are you sure you wish to delete this <span class='page-and-children'>page</span>?</span><div class='card' style='margin:12px; width: calc(100% - 72px); max-height:calc(100% - 200px); overflow-y:scroll; overflow-x:scroll;  padding:8px;'><ul style='margin:0;' class='page-delete-listing'><li>" + slingPath + "</li></ul></div>");
		$dialog.openModal({top:"14%"});

		var pageListingUrl = window.BL.config.slingProxyPrefix + slingPath + ".list.pages.1.json";
		$.ajax({url:pageListingUrl, dataType:"json"})
			.done(function(data){
				if(data){
					var html=$.map(data,function(val){return("<li>"+val+"</li>");});
					$("ul.page-delete-listing").append(html.join("\n"));

					if(data.length>0){
						$("span.page-and-children").html("page and its " + data.length + " child page" + (data.length>1?"s":"") );
					}

				}
			});

	}	

};
