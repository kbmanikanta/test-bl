/* globals $, Materialize, window, _ */
var buildDialog=require("./dialog-builder");
var addChildHelpers=require("./add-child-helpers");

// CLIENT SIDE //

module.exports = function addRequest(options){
	var view=options.view;

	var dialogUrl = view.appsMount + "blacklight/edit/dialogs/add-child-page";
	var componentTemplateUrl = view.appsMount + "blacklight/edit/component/template-content";
	var parentPath = view.path(), pathName;
	var $addPathNameField, $addTitleField, resourceType, writeTemplateLocally=false;

	var $addDialog = buildDialog({
		saveText:"Add Page",
		icon:"add_circle",
		saveDisable: true,
		onLoad:null, //function(err, data, $dialogBody, xhr){}
	});

	var $saveButton = $addDialog.find(".modal-footer .bl-save-button");

	$addDialog.loadBody({url:dialogUrl, data:{parentPath:parentPath}, title:"Add New Page"})
	.then(function(data, $dialogBody){
		$dialogBody.css({"background-color":"#fff"});
		$dialogBody.find(".collapsible").collapsible();

		$dialogBody.find(".collection-item:not(.unavailable)").click(stepTwo);

		addChildHelpers($addDialog,"page");
	});

	//////////////////////////////////////////////////////////////////////////
	function stepTwo(event){
		var $selected=$(this);
		event.preventDefault();
		resourceType = $selected.data("type");
		pathName =  $selected.data("name");
		var title =  $selected.data("title");

		$addDialog.loadBody({url:dialogUrl, data:{step2: true, title:pathName?title:"", pathName:pathName,  parentPath:parentPath, resourceType:resourceType}, title:"Add New Page: " + title})
		.then(function(data, $dialogBody){
			$addTitleField=$addDialog.find("#add_title");
			$addPathNameField=$addDialog.find("#add_path");
			var pathDisabled=$addPathNameField.prop("disabled");
			var manualPathChange=false;
			
			$.addSettings = $dialogBody.find(".add-settings");
			writeTemplateLocally = $.addSettings.data("write-template-locally");


			$addTitleField.select();

			if(!pathDisabled){
				$addTitleField.unbind("keyup");

				$addTitleField.keyup(function(){
					if(!manualPathChange){
						var src=$addTitleField.val();
						var original=$addPathNameField.val();
						var altered=src.replace(/[\W]/g,"-").replace(/-{2,}/g,"-").replace(/-$/,"").toLowerCase();
						$addPathNameField.val(altered);
						if(!original){
							$addPathNameField.focus();
							$addTitleField.focus();
						}			
					}
				});
			}

			$saveButton.removeClass("disabled");
			$saveButton.off("click").on("click", function(){
				if(!$addPathNameField.val()){
					Materialize.toast("You must specify a 'Path Name'", 4000);
				}
				slingAddPage();
			})
		})

		return false;

	}

	////////////////////////////////////////////////////////////////////////////
	function slingAddPage(){

		var uri;
		uri= window.BL.config.slingProxyPrefix + view.path() + "/*";

		var fd=new window.FormData();

		fd.append("_charset_", "utf-8");

		pathName = pathName || $addPathNameField.val();
		var title = $addTitleField.val();

		fd.append(":name", pathName);
		fd.append("jcr:primaryType", "cq:Page");
		fd.append("jcr:content/jcr:primaryType", "cq:PageContent");
		fd.append("jcr:content/jcr:title", title);
		fd.append("jcr:content/sling:resourceType", resourceType || "blacklight/edit/page/new");




		if(writeTemplateLocally){
			console.log("Writing template content locally for:", resourceType,"\n",componentTemplateUrl);
			$.ajax({url:componentTemplateUrl,data:{
				resourceType: resourceType,
				path: view.path() + "/" + pathName,
				prefix: "jcr:content"
			
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
				writePage();
			});

		}else{
			writePage();
		}
		

		function writePage(){
			var request = new window.XMLHttpRequest();
			request.open("POST",uri);
			request.send(fd);
			request.onload = function(event) {
				if (request.status >= 200 && request.status < 300) {					
					var newPage =  request.getResponseHeader("location").split("/").pop();
					var newPath = parentPath + "/" + newPage;
					view.path(newPath);
					window.document.location.reload(true);
				} else {
					$addDialog.find(".modal-content").html("<span class='red-text'>Error adding page at '" + parentPath +"' </span>");
				}
			};
		}

		/// TODO:  somehow this client-side code should recieve indication of if a template write is necessary.
		//     possibly, just call a restful thing that says "hey, I'm writing this type to this path, so return a template as flattened name/value pairs, if I should be writing any templates here"
		//			maybe that even happens prior to the request above, so template results can be incorporated into this single write.

	}




}