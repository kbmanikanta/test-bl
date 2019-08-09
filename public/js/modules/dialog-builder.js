"use strict";
/* globals window, Materialize, $, _ */

var dialogUniqueCount=0;
window.BL = window.BL || {};


/// "Button first" makes good sense for the main edit dialog.  But not so much for this one, which is more "dialog first, create the dialog as you need it, destroy on close".
/// Is there even a way to use "dialog-builder" in  "button first"  mode??  What does that look like?  Why do it?


window.BL.buildDialog = module.exports = function buildDialog(options){
	options=options||{};
	var dialogId=options.id || ("dialog_" + dialogUniqueCount++);
	var $dialog = $(dialogHtml());
	var $dialogBody = $dialog.find(".modal-content");
	if(options.noFooter){
		$dialog.find(".modal-footer").hide();
		$dialog.removeClass("modal-fixed-footer");
	}
	$("body").append($dialog);
	
	// $dialog.modalButton(options);

	if(!options.dontOpen){
		$dialog.openModal(options);
	}

	if(options.url){
		if(options.iframe){
			$dialogBody.html(
				$('<iframe>', {
					src: options.url,
					frameborder: 0,
					height: '100%',
					width: '100%'
				})
			); 
		}else{
			loadBody({url:options.url, title:options.title})
		}
	}

	/*********************************************************************************/
	function loadBody(loadOptions){
		if(typeof loadOptions==="string"){loadOptions={bodyUrl:options};}
		loadOptions = (loadOptions || options) ;
		var url=loadOptions.url;
		if(!url){throw new Error("No 'url' provided in options to dialog-builder.loadBody()");}

		var separator = /\?/.test(url) ? "&" : "?";
		url = url + separator + "dialogId=" + dialogId;

		$dialogBody.html(loadingDiv(url));
 		var def= new $.Deferred();
 		var dataType = loadOptions.dataType || options.dataType || null;
		var onLoad = loadOptions.onLoad || options.onLoad;
		var data = loadOptions.data===undefined?options.data:loadOptions.data;
		var method=loadOptions.type || options.type || "GET";

		$.ajax({url:url, type:method, dataType:dataType, data:data})  //+ "&stamp=" + (new Date().getTime())
		.done(function(data,status,ajax){
			var content, script;

			if(dataType==="html" || /html/.test(ajax.getResponseHeader("content-type"))){
				try{
					if(loadOptions.title || options.noFooter){
						data = dialogTitleBar(loadOptions.title) + data;
					}
					content = $(data);
					script="";
					for(var i=0; i<content.length;i++){   /// For some reason, content.remove("script") was not working. So this hack.
						if(content[i].tagName === "SCRIPT"){
							script=content[i].innerText || content[i].innerHTML;
							content.splice(i,1)
						}
					}
				}catch(err){
					console.trace("Problem parsing dialog HTML in dialog data:", err);
					content="<h1>Problem parsing HTML in dialog data</h1>"+data;
				}

				$dialogBody.html(content);
				$dialog.initClickEvents();
				if(options.noFooter){
					$dialogBody.find(".modal-close").click(function(){$(this).closest(".modal").closeModal()});
				}
				if(script){$.globalEval(script);}
			}

			def.resolve(data, $dialogBody);
			if(onLoad){
				onLoad(null, data, $dialogBody, ajax)
			}
		})
		.fail(function(ajax, status){
			var builtUrl = url, qs=data?$.param(data):"";
			if(data){builtUrl=builtUrl + (/\?/.test(builtUrl) ? "&" : "?") + qs;}
			$dialogBody.html("<div style='margin:48px;margin-bottom:24px;'>Could not load dialog, internal error:<br><a target='_blank' href='" + builtUrl +"'>" + builtUrl + "</a></div>" + (ajax.responseText ? ("<div class='error'>" + ajax.responseText + "</div>") : ""));
			def.fail("Couldn't load dialog: " + url);
			if(onLoad){
				onLoad("Failed to load", status, $dialogBody, ajax);
			}
		});

		return def.promise();
	}

	$dialog.loadBody=loadBody;
	$dialog.titleBar=dialogTitleBar;

	/*********************************************************************************/
	$dialog.initClickEvents=function(){
		var dialogCSSFull={width:"100%",height:"100vh",top:"0", marginTop:"0", marginBottom:"0", bottom:"0"};
		var dialogCSSNormal={};
		var $fullscreenButton=$dialog.find(".modal-fullscreen");

		$.each(dialogCSSFull, function(idx, val){
			dialogCSSNormal[idx]=$dialog.css(idx);
		})

		$fullscreenButton.click(function(){
			if($.fullscreen && $.fullscreen.isFullScreen()){
				$.fullscreen.exit();
				$dialog.css(dialogCSSNormal);
				$fullscreenButton.html("fullscreen");
			}else{
				$dialog.fullscreen();
				$dialog.css(dialogCSSFull);
				$fullscreenButton.html("fullscreen_exit");
			}
		});

		$dialog.find(".modal-close").off("click").click(function(){
			if($.fullscreen){
				$.fullscreen.exit();
			}
			$dialog.css(dialogCSSNormal);
			$fullscreenButton.html("fullscreen");
			$dialog.closeModal();
		})		
	}


	/*********************************************************************************/
	function dialogTitleBar(title){
		var closeButton = (options.noFooter || options.closeButton) ? `<a href="javascript:;"><i class="modal-close material-icons white-text" style="position:absolute;top:4px;right:0px;">close</i></a>` : "";
		var fullscreenButton = (options.fullscreen) ? `<a href="javascript:;"><i class="modal-fullscreen material-icons white-text" style="position:absolute;top:4px;right:32px;">fullscreen</i></a>` : "";
		return `<div style="font-size: 1rem;position:relative; padding:5px; text-align:center; color:white; text-transform:uppercase;" class="blue accent-2 titlebar">${closeButton}${fullscreenButton}${title}</div>`
	}

	/*********************************************************************************/
	function loadingDiv(url){
		return `
		<div height='100%' class='' style='text-align:center;padding:50px;'>
			<div>
				<a href='${url || "#"}' target='_blank'><i class='fa fa-refresh fa-spin fa-5x' style='color:#e0e0e0;font-size:150px'></i></a>
			</div>
			<div style='margin-top:30px;clear:both;'>LOADING...</div>
		</div>`
	}

	/*********************************************************************************/
	function dialogHtml(){
		var saveText = options.saveText || "Save";
		var icon = options.icon ? `<i class="material-icons left" style="margin-right: 12px;top: -1px;position: relative;left: 1px;">${options.icon}</i>` : ""
		var saveButton = options.noSave ? "" : `<a class="bl-save-button waves-effect waves-light blue btn ${options.saveDisable?"disabled":""}" style="margin-left:10px;" href="javascript:;">${icon}${saveText}</a>`;

		return `
			<div id="${dialogId}" class="bl-widget modal modal-fixed-footer dynamic-modal" >
				<div class="modal-content dialog-body">
					${loadingDiv()}
				</div>
				<div class="modal-footer">
					${saveButton}
					<a href="javascript:;" class="modal-close waves-effect waves-light red btn">Cancel</a>

					<div class="preloader-wrapper right small active spinner" style="top:5px; right:49px; display:none;">
					 <div class="spinner-layer spinner-red-only">
					   <div class="circle-clipper left">
					     <div class="circle"></div>
					   </div><div class="gap-patch">
					     <div class="circle"></div>
					   </div><div class="circle-clipper right">
					     <div class="circle"></div>
					   </div>
					 </div>
					</div>
				</div>
			</div>
		`

	}


	return $dialog;

};












