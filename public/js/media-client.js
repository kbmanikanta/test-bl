/* globals $, window, _, Materialize */

$(function(){

	var buildDialog = window.BL.buildDialog;

	$("#page-actions a[data-action]").each(function(idx,val){
		var $btn=$(val);
		var action=$btn.data("action");
		var view = window.BL.view;

		switch(action){
			case "delete":
				$btn.click(onDeleteRequest);
			break;

			case "add":
				$btn.click(onAddTag);
			break;

			case "create_new_folder":
				$btn.click(function(){window.alert("creating a folder");})
			break;
		}


		/****************************************************/
		// TODO: NOT DRY!  Shared with page-manager-client.js and component-manager-client.js
		function onDeleteRequest(){
			var $deleteDialog = buildDialog({
				saveText:"Delete asset",
				icon:"delete",
				onLoad:null, //function(err, data, $dialogBody, xhr){}
			});

			var $modalContent=$deleteDialog.find(".modal-content");
			var slingPath=view.path();

			var $deleteButton = $deleteDialog.find(".modal-footer .bl-save-button");

			$deleteButton.off().click(function(){
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
						$deleteDialog.closeModal();
					} else {
						$modalContent.html("<span class='red-text'>Error deleting content at '" + slingPath +"' </span>");
					}
				};
			});

			// $deleteDialog.css({height:"80%", width:"90%", maxWidth:"900px"});

			$modalContent.html("<span class='red-text'>Are you sure you wish to delete this <span class='page-and-children'>asset</span>?</span><div class='card' style='margin:12px; width: calc(100% - 72px); max-height:calc(100% - 200px); overflow-y:scroll; overflow-x:scroll;  padding:8px;'><ul style='margin:0;' class='page-delete-listing'><li>" + slingPath + "</li></ul></div>");
			// $deleteDialog.openModal({top:"14%"});

			var pageListingUrl = window.BL.config.slingProxyPrefix + slingPath + ".list.pages.1.json";
			$.ajax({url:pageListingUrl, dataType:"json"})
				.done(function(data){
					if(data){
						var html=$.map(data,function(val){return("<li>"+val+"</li>");});
						$("ul.page-delete-listing").append(html.join("\n"));

						if(data.length>0){
							$("span.page-and-children").html("tag and its " + data.length + " child tags" + (data.length>1?"s":"") );
						}

					}
				});

		}	




		/****************************************************/
		// TODO: NOT DRY!  Shared with page-manager-client.js and component-manager-client.js
		function onAddTag(){
			var slingPath=view.path()

			var $addDialog = buildDialog({
				saveText:"Upload to library",
				icon:"file_upload",
				onLoad:null, //function(err, data, $dialogBody, xhr){}
				complete:function(){window.alert("Closed modal.");}
			});


			var dialogUrl = window.BL.config.appsMount + "blacklight/edit/dialogs/media/upload-from-disk" + "?" + $.param({slingPath:slingPath});

			$addDialog.loadBody({url:dialogUrl, data:{parentPath:slingPath}, title:"Upload To Library"})
			.then(()=>{
				var $modalContent=$addDialog.find(".modal-content");	
				var $uploadField = $modalContent.find("input.file-upload")
				var uploadField = $uploadField.get(0);
				var $assetName = $modalContent.find("input.asset-name")
				var $parentPath = $modalContent.find("input.parent-path")
				var $storeType = $modalContent.find(".asset-store-type")
				var $saveButton = $addDialog.find(".bl-save-button");
				var $cleanUpNames = $modalContent.find("input.clean-up");

				Materialize.updateTextFields();


				$uploadField.on("change", fileSelectChange);
				$cleanUpNames.on("change", fileSelectChange);

				function fileSelectChange(){
					var cleanedUpNames=[];
					var doClean = $cleanUpNames.get(0).checked;

					if(uploadField && uploadField.files && uploadField.files.length===1){
						console.log("doClean?", doClean);
						var selectedFilename = uploadField.files[0]?uploadField.files[0].name:"";
						$assetName.get(0).disabled=false;
						$assetName.focus();
						$assetName.val(doClean ? cleanUpName(selectedFilename) : selectedFilename);
					}else{
						_.each(uploadField.files, function(file){
							if(doClean){
								cleanedUpNames.push(cleanUpName(file.name))
							}else{
								cleanedUpNames.push(file.name);
							}
						});
						$assetName.val(cleanedUpNames.join(", "));
						setTimeout(function(){$assetName.get(0).disabled=true;}, 300);
					}
				};

				function cleanUpName(selectedFilename){
					selectedFilename = selectedFilename.replace(/\\/g,"/");
					selectedFilename = selectedFilename.split("/").pop();
					selectedFilename = selectedFilename.split(".");
					var extension = selectedFilename.pop();
					if(!selectedFilename.length){selectedFilename=extension}else{selectedFilename=selectedFilename.join("-")}
					selectedFilename = selectedFilename.replace(/[\W]/g,"-").replace(/-{2,}/g,"-").replace(/-$/,"");
					return selectedFilename + "." + extension;
				}


				$saveButton.off().click(function(){

					var files=uploadField.files;
					var parentPath = $parentPath.val();
					var request;

					if(files.length<1){
						Materialize.toast("Please select at least one file to upload.", 4000);
						return;
					}

					var $shadowOverlay = $(
						`<div class="progress-overlay" style="position: absolute; top:0; left:0; width: 100%; height:100%; background-color: black; opacity:.5; z-index: 20000">
						 </div>
					`);

					$shadowOverlay.appendTo($modalContent);

					var $progressOverlay=$(`
				      <div class="row" style="position: absolute; top:50px; left:100px; width:calc(100% - 200px); z-index: 20005">
				        <div class="col s12">
				          <div class="card white">
				            <div class="card-content">
			            			<div class="card-title"></div>
										<div class="progress">
									      <div class="indeterminate" style="width: 100%"></div>
									  	</div>			
								  	</div>
							  	</div>
						  	</div>
					  	</div>										  
					`);

					$progressOverlay.appendTo($modalContent);

					$saveButton.addClass("disabled");

					var $progressTitle = $progressOverlay.find(".card-title");
					var $progress = $progressOverlay.find(".progress");
					var multiFile = files.length>1;
					var itemIndex=0;
					var fileCount = files.length;

					function uploadNextFile(){
						var file = files[itemIndex];
						itemIndex++;
						let fd=new window.FormData();
						let doClean = $cleanUpNames.get(0).checked;
						let assetName = multiFile ? (doClean ? cleanUpName(file.name) : file.name) : $assetName.val();
						assetName = assetName.replace(/\.\.\//g, "");
						let uri= window.BL.config.slingProxyPrefix + parentPath.replace(/\/$/,"") + "/" + assetName;
						let storeType = $storeType.val() || "sling";

						$progressTitle.html(`Uploading file ${itemIndex}/${files.length}:<br><span style="font-size:14px; ">${assetName}</span>`);

						fd.append("_charset_", "utf-8");
						fd.append("jcr:primaryType", "dam:Asset");
						fd.append("jcr:content/jcr:primaryType", "dam:AssetContent");
						fd.append("jcr:content/renditions/jcr:primaryType", "nt:folder");
						fd.append("jcr:content/renditions/original", $uploadField.get(0).files[itemIndex-1]);
						fd.append("jcr:content/metadata/jcr:primaryType", "nt:unstructured");
						fd.append("jcr:content/metadata/bl:assetProcess", "true");

						if(storeType!=="sling"){
							fd.append("jcr:content/metadata/bl:assetDesiredStorage", storeType);
						}


						request = new window.XMLHttpRequest();

						request.onload = function(event) {
							if (request.status >= 200 && request.status < 300) {					
								let newPage =  request.getResponseHeader("location")
								newPage = newPage ? (newPage.split("/").pop()) : assetName;

								let newPath = view.path() + "/" + newPage;
								view.path(newPath);
								if(itemIndex >= fileCount){
									window.document.location.reload(true);
								}else{
									uploadNextFile();
								}
							} else {
								$modalContent.html("<span class='red-text'>Error adding asset at <br>'" + uri +"' </span>");
							}
						};

						if(request.upload){
							request.upload.onprogress = (evt)=>{

							  if (evt.lengthComputable) {
							    var percentComplete = (evt.loaded / evt.total) * 100;
							    $progress.removeClass("indeterminate").addClass("determinate").css({"width": percentComplete + "%"})
							  } else {
							    $progress.removeClass("determinate").addClass("indeterminate").css({"width":"100%"})
							  }
							}
						}

						request.open("POST",uri);
						request.send(fd);

					}

					uploadNextFile();

				});

			});	



	
		}
	});




})