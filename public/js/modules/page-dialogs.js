/* globals window, Materialize, _, $ */

var buildDialog=require("./dialog-builder");

var idCounter=0;


/***************************************************************************************/
module.exports.activate=function(baseUrl, blProxyPrefix, appsMount){
	var paths=[];
	var references={};
	baseUrl = loseExtensions(baseUrl);

	// Look up other dependencies:  images, linked pages (?), unactivated collections you point to
	// if this is a collection item, then after activation, show a list of its consumers for possible activation.

	var $dialog = buildDialog({
		saveText: "Activate Page"
	});
	var $dialogBody = $dialog.find(".modal-content");
	var titleBar=$dialog.titleBar("Activate");
	var $checkboxes;

	var referencesAPI = blProxyPrefix + "/libs/wcm/core/content/reference.json";
	var sharedDependenciesAPI = appsMount + "blacklight/edit/dependencies/shared-data";


	/////////////////////////////////////////////////////////////////////
	$.ajax({url:referencesAPI, data:{path: baseUrl}, dataType:"json"})
	.done(function(data, textStatus, jqXHR){
		_.each(data, (paths, category)=>{
			if(paths.length){references[category]=paths}
		});
		done();
	})
	.fail(function(jqXHR, textStatus, errorThrown){
		console.error("Error loading activation dependecy list:",encodeURIComponent(textStatus), encodeURIComponent(errorThrown));
		$dialog.closeModal();
		window.alert("Problem loading this page's activation dependecies.\nSee web console.")
	});


	/////////////////////////////////////////////////////////////////////
	$.ajax({url:sharedDependenciesAPI, data:{path: baseUrl}, dataType:"json"})
	.done(function(data, textStatus, jqXHR){
		_.each(data, (paths, category)=>{
			if(paths.length){references[category]=paths}
		});
		done();
	})
	.fail(function(jqXHR, textStatus, errorThrown){
		console.error("Error loading shared data dependecy list:", encodeURIComponent(textStatus), encodeURIComponent(errorThrown));
		$dialog.closeModal();
		window.alert("Problem loading this page's shared data dependecies.\nSee web console.")
	});



	/////////////////////////////////////////////////////////////////////
	var done=_.after(2, function(){
		var html=[titleBar, 
		`<form>
			<div class="row">
			<div class="col s12" style="margin:24px; width:calc(100% - 48px);">
		`]

		var keys = _.keys(references).sort();

		if(keys.length){
			html.push(`
				<div class="eccTitle z-depth-1" style="background-color:#f3f3c7; margin-top: -5px; top: -4px; left: -12px;">
					Unactivated dependencies
				</div>

				<ul class="collapsible" data-collapsible="collapsible">`);
			
			_.each(keys, function(category){
				var refs=references[category];
				var id="category-" + (idCounter++);
				var paths=[];
				_.each(refs, function(ref){paths.push(ref.path)})

				html.push(`
				<li>
					<div class="collapsible-header active">
						<input id="${id}" class="filled-in" checked="checked" type="checkbox" data-category="${category}"> 
						<label for="${id}">${_.capitalize(category.replace(/_/g," "))}</label>					
					</div>
					<div class="collapsible-body" style="padding-top:5px;padding-bottom:5px; background-color:#f9f9f0;">
						<ul>`);
				
				_.each(refs,function(ref, idx){
					var checked = (ref.indeterminate || ref.missing) ? "" : `checked="checked"`;
					var missing = ref.missing ? "color:red" : "";
					html.push(`<li data-path="${ref.path}">
							<input id="${id}-${idx}" class="filled-in checkbox" type="checkbox" data-path="${ref.path}" ${checked}> 
							<label for="${id}-${idx}">&nbsp;</label>					
							<a href="${ref.path}" style="${missing}" target="_blank">${ref.path}</a>
						</li>`);
				});

				html.push(`
						</ul>
					</div>
				</li>`);
			});

			html.push(`</ul>`);

		}else{
			html.push("<h5>Activate this page?</h5>")
		}

		html.push(`</div></div></form>`);

		$dialogBody.html(html.join(" "))
		$dialogBody.find(".collapsible").collapsible();
		$checkboxes = $dialogBody.find(".checkbox");
		getSelectedDependencies();
		$dialogBody.find("input").click(function(){
			var $chk=$(this);
			var category=$chk.data("category");
			if(category){
				var $childChks = $chk.closest("div.collapsible-header").siblings(".collapsible-body").find(".checkbox");
				var newCheckState = $chk.is(":checked") ? "checked" : "";
				$chk.addClass("filled-in").prop("indeterminate", false).prop("checked",newCheckState);					
				$childChks.prop("checked",newCheckState);
			}else{
				setTimeout(function(){
					var $parent = $chk.closest("div.collapsible-body");
					var $parentChk = $parent.siblings(".collapsible-header").find("input");
					var $categoryChecks = $parent.find(".checkbox");
					var allAreChecked = true, allAreNotChecked = true;
					$categoryChecks.each(function(){
						if($(this).is(":checked")){
							allAreNotChecked = false;
						}else{
							allAreChecked = false;
						}
					});

					if(allAreChecked){
						$parentChk.addClass("filled-in").prop("indeterminate", false).prop("checked","checked");
					}else if(allAreNotChecked){
						$parentChk.addClass("filled-in").prop("indeterminate", false).prop("checked","");
					}else{
						$parentChk.removeClass("filled-in").prop("indeterminate", true);
					}
				}, 100)
			}
			getSelectedDependencies();
		});
	});

	////////////////////////////////////////////////////////////////////////////////////
	function getSelectedDependencies(){
		paths=[];
		$checkboxes.each(function(){
			var $chk = $(this);
			if($chk.is(":checked")){
				paths = paths.concat($chk.data("path"));
			}
		});
	}

	////////////////////////////////////////////////////////////////////////////////////
	$dialog.find(".bl-save-button").click(function(){
		paths.push(baseUrl);

		activateOrDeactivate("Activate", paths, blProxyPrefix, (err)=>{
			$dialog.closeModal();
			if(err){Materialize.toast("Error activating.  See web console for details."); console.error("Error activating " + baseUrl, err); return;}
			
			Materialize.toast("Page activation successful", 4000, "rounded");
			if(isCollection(baseUrl)){
				window.alert("Here is where I offer this collection item's consumers for activation.");
			}
		});
	})
}

/***************************************************************************************/
function loseExtensions(path){
	var parts=path.split("/");
	var leaf = parts.pop();
	var extensions = leaf.split(".");
	parts.push(extensions.shift());
	return parts.join("/");
}

/***************************************************************************************/
function isCollection(path){
	if(!path || !path.test){return false;}
	return path.test(/^\/content\/[^\/]+\/collections\//);
}



/***************************************************************************************/
module.exports.deactivate=function(baseUrl, blProxyPrefix){
	var $dialog = buildDialog({
		saveText: "Deactivate Page"
	});
	var $dialogBody = $dialog.find(".modal-content");
	var titleBar=$dialog.titleBar("Deactivate");
	var html=[titleBar, 
		`<form>
			<div class="row">
			<div class="col s12" style="margin:24px; width:calc(100% - 48px);">
		`];

	html.push("<h5>Dectivate this page?</h5>");
	html.push(`</div></div></form>`);
	$dialogBody.html(html.join(" "));
		
	////////////////////////////////////////////////////////////////////////////////////
	$dialog.find(".bl-save-button").click(function(){
		// if this is a collection item, then after deactivation show a list of stubs which could be deactivated
		activateOrDeactivate("Deactivate", [baseUrl], blProxyPrefix, (err)=>{
			$dialog.closeModal();
			if(err){Materialize.toast("Error deactivating.  See web console for details."); console.error("Error deactivating " + baseUrl, err); return;}
			Materialize.toast("Page deactivation successful", 4000, "rounded")
		});
	})


}



/***************************************************************************************/
function activateOrDeactivate(command, paths, blProxyPrefix, cb){
		// console.log("Doing '" + command + "' on:", paths);

			var activationAPI = "/bin/replicate.json";

			var fd=new window.FormData();

			_.each(paths, (path)=>{
				fd.append("path", path);
			});
			fd.append("cmd", command);

			var request = new window.XMLHttpRequest();
			request.open("POST", blProxyPrefix + activationAPI);
			request.send(fd);
			
			request.onload = function(event) {
				if (request.status === 200) {
					cb();
				} else {
				  if(console){console.error("Error " + request.status + " occurred when trying to upload your file.", request);}
				  cb("There was an error with the " + command + " attempt.\nYour changes may not be saved.");
				}
			};
}










/***************************************************************************************/
module.exports.history = function history(baseUrl, blProxyPrefix){

			var $dialog = buildDialog({
				noSave: true,
			});

			var tabId= "history-tab-" + idCounter++;

			var query= blProxyPrefix + baseUrl  + ".audit.json"  //page.blProxyPrefix + "/bin/audit/page.json"

			var $dialogBody = $dialog.find(".modal-content");

			$.ajax({url:query,  dataType:"json"})
			.done(function(results,status){
				var rows=[];
				$.each(results.entries, function(idx, result){
					rows.push(`<tr><td>${result.type}</td><td>${result.date}</td><td>${result.user}</td></tr>`);
				});

				var titleBar=$dialog.titleBar("History");
				var wcmCommand = blProxyPrefix + "/bin/wcmcommand";

				$dialogBody.html(`${titleBar}

					<div class="row">	
					   <div class="col s12" style="margin-bottom:24px;">
							<ul class="tabs">
								<li class="tab col s3"><a class="red-text text-darken-4" href="#${tabId}-1">Audit Log</a></li>
								<li class="tab col s3"><a class="red-text text-darken-4" href="#${tabId}-2">Create Version</a></li>
								<li class="tab col s3"><a class="red-text text-darken-4" href="#${tabId}-3">Restore Version</a></li>
							</ul>
						</div>
						
						<div id="${tabId}-1" style="margin-right: 4%; margin-left: 4%; display: block;" class="col s11">
							<table class="bordered highlight">
								${rows.join("\n")}
							</table>
						</div>						

						<div id="${tabId}-2" style="margin-right: 4%; margin-left: 4%; display: block;" class="col s11">
							<div class="bl-widget input-field">
								<textarea id="${tabId}-comment" rows="3" name="comment" class="validate" style="background-color:#eee;padding-left:5px;height:auto;"></textarea>
								<label for="${tabId}-comment">Comment about new version</label>
							</div>

							<div class="bl-widget input-field">
								<input value="" id="${tabId}-label" name="seoTitle" type="text" class="validate" style="background-color:#eee;padding-left:5px;">
								<label for="${tabId}-label">Label for new version – e.g. "1.3" &nbsp;<i>(optional)</i></label>
							</div>
							<a class="create-version waves-effect waves-light blue btn right" style="margin-left:10px;" href="javascript:;">Create new version</a>
						</div>	

						<div id="${tabId}-3" style="margin-right: 4%; margin-left: 4%; display: block;" class="col s11">
							Restore version...
						</div>	



					</div>



					`);

				var $tabs=$dialogBody.find(".tabs");
				$tabs.tabs({onShow:function(which){
					var whichId = which.attr("id").slice(-1);
					if(whichId==="3"){
						$.ajax({url: blProxyPrefix + "/bin/wcm/versions.json", data: {path: baseUrl}})
						.done(function(results, status){
							if(results && results.versions){
								var versions=[];

								if(results.versions.length){
									versions.push(`<div class="collection versions">`);
									$.each(results.versions,function(idx, val){
										var date=val.created.split(" ");
										var time = date[1];
										date=date[0].split(".");
										date = `${date[1]}/${date[0]}/${date[2]}`;
										versions.push(`<a href="javscript:;" class="collection-item" data-id="${val.id}" data-label="${val.label}">
											<div class="row" style="margin-bottom:0">
												<div class="col s1">${val.label}</div>
												<div class="col s3">${date} – ${time}</div>
												<div class="col s8" style="overflow-x:hidden">${val.comment}</div>
											</div>	

											</a>`)
									})

									versions.push(`</div>`);
								}else{
									versions.push(`No versions currently defined for this page.<br>Use 'Create Version' above to define one.`)
								}

								which.html(versions.join(" "));
								which.find(".collection-item").click(function(){
									var $btn=$(this);
									var id=$btn.data("id");
									var label=$btn.data("label");

									var doRestore=window.confirm("Restore version '" + label + "' of this page?")
									if(doRestore){
										var data={
											_charset_:"utf-8",
											":status": "browser",
											cmd:"restoreVersion",
											id: id,
											path:baseUrl
										}

										$.ajax({url:wcmCommand, data, method:"POST"})
										.done(function(results, status){
											window.document.location.reload(true);
										})
									}
								})
							}else{
								which.html("Error:", status);
							}
						})
					}
				}});

				$dialogBody.find(".create-version").click(function(){
					var $body=$(this).parent("div");
					var label = $body.find("input").val();
					var comment = $body.find("textarea").val();
		
					var data={
						_charset_:"utf-8",
						":status": "browser",
						cmd:"createVersion",
						label: label,
						comment: comment,
						path:baseUrl
					}

					$.ajax({url:wcmCommand, data, method:"POST"})
					.done(function(results, status){
						// TODO: To get the version label, this code should instead manifest the HTML from "results" and then use jquery to extract text from the element with id="message"
						Materialize.toast("Created version: " + (comment || "No comment provided"), 5000);
						$body.find("input,textarea").val("");				
					})

				})

			})
			.fail(function(err){
				$dialogBody.html(`<div class="container"><div class="row"><div class="col-xs-10" style="margin-top:16px;"><h5>Failed to load history from:</h5><p>${query}</p></div></div></div>`);
			});
}
