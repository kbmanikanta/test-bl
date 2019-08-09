/* globals Sortable, module, require, SimpleMDE, window, _, Materialize */

var buildDialog=require("./dialog-builder");
var fuzzysearch = require("./fuzzysearch");
var addChildHelpers=require("./add-child-helpers");
var pathWidget=require('./path-widget');
var editPageDialogs=require('./page-dialogs');

module.exports=function($, window, page, editDialog){
	"use strict";
	var pageInit={};

	$.ajaxSetup({ cache: false });


	/***************************************************************************************************/
	pageInit[".button-collapse"]=function($el){
			$el.sideNav();
	};


	/***************************************************************************************************/
	pageInit[".bl-open-dialog-button"]=function($el){
		$el.modalButton(editDialog.getStandardEditDialogOptions());
	};


	/***************************************************************************************************/
	pageInit["body.home"]=function($el){
		if($el.length){
			var home=require("./home-client.js")($, window);
			home.init();
		}
	};

	/***************************************************************************************************/
	pageInit["body.landing"]=function($el){
		if($el.length){
			$(".landing-link").click(function(){
				var link=$(this).data("link");
				if(link.match(/^http/)){
					window.open(link, '_blank');
				}else{
					window.document.location.href=link;
				}
			});
		}
	};


	/***************************************************************************************************/
	pageInit["body.generic-iframe"]=function($el){
		if($el.length){
			var iframed=require("./framed-client.js")($, window);
			iframed.init();
		}
	};



	/***************************************************************************************************/
	pageInit["body.bl-page.edit"]=function($el){
		var links=$("span.file-link");
		links.each(function(){
			var $el=$(this);
			var slingPath = page.getButtonSlingPath($el) + "/" + $el.data("name");
			var oldHtml = $el.html();
			$el.html(`<a href="${page.blProxyPrefix}${slingPath}" target="_blank">${oldHtml}</a>`);
		});

		$(".collapsible-header, .edit-button").hover(function(){
			var $header=$(this);
			if($header.data("target")){ // oops, acutally an edit button, not a header.
				$header = $header.closest(".item-buttons").siblings(".collapsible-header");
			}

			var childCount = $header.data("childCount");
			var off=$header.offset();

			if(typeof childCount == "undefined"){
				var $buttons = $header.closest(".inner-li").find("a.edit-button");
				childCount = $buttons.length;
				$header.data("childCount",childCount);
				var leftOff = childCount>9 ? 36 : 28;
				if(off){
					$header.append(`<div style="position:absolute; top:${off.top}px; left:${off.left-leftOff}px; display:none;" class="child-count">${childCount}<span class="child-count-arrow">↴</span></div>`)				
				}

			}

			var $count=$header.find(".child-count");
			$count.css("display","block")
			if(off){$count.css("top", `${off.top}px`)};

		}, function(){
			var $header=$(this)
			if($header.data("target")){ // oops, acutally an edit button, not a header.
				$header = $header.closest(".item-buttons").siblings(".collapsible-header");
			}
			$header.find(".child-count").css("display", "none");
		})

	};


	/***************************************************************************************************/
	pageInit[".bl-go-preview"]=function($el){
		$el.on("click", function(){
			var match=window.document.location.href.match(/^(https?:\/\/[^\/]*)\/[^#]*\/blacklight\/edit\/page(.*)$/);
			if(match){
				window.location.href = match[1] + match[2];
			}else{
				page.setCookie("wcmmode", "preview", 7);
				window.location.assign(document.location.pathname + document.location.hash);
				window.location.reload(true);
			}
		});
	};
	
	/***************************************************************************************************/
	pageInit[".bl-documentation"]=function($el){
		$el.on("click", function(){
			var match=window.document.location.href.match(/^(https?:\/\/[^\/]*)\/([^#]*\/blacklight\/edit\/page)?(.*)$/);
			if(match){
				window.location.href = match[1] + '/alt/apps/blacklight/edit/documentation' + (_.startsWith(match[3], '/') ? '' : '/') +  match[3];
			}
		});
	};


	/***************************************************************************************************/
	pageInit[".bl-go-page-manager"]=function($el){

		$el.on("click", function(){
			var match=window.document.location.href.match(/^(https?:\/\/[^\/]*)\/[^#]*\/blacklight\/edit\/page(.*)$/);
			if(match){
				var path = match[2].match(/^(.*?)(\/|\.html)?(#.*)?$/);
				var pmPath= page.proxyMode? (window.BL.config.appsMount + "blacklight/edit/page-manager#!") : "/pm#!";
				var finalPath = match[1] + pmPath + path[1] + ".edit";
				window.location.href = finalPath;
			}
		});
		
	};




	/***************************************************************************************************/
	pageInit[".bl-coming-soon"]=function($el){
		$el.on("click", function(){
			window.alert("This feature is not working yet.  Coming soon.");
		});
	};



	/***************************************************************************************************/
	pageInit[".bl-history"]=function($el){
		$el.click(function(){
			editPageDialogs.history(page.baseUrl, page.blProxyPrefix, window.BL.config.appsMount);
		})
	}

	/***************************************************************************************************/
	pageInit[".bl-activation"]=function($el){
		$el.on("click", function(){
			var deactivate=$(this).data("deactivate");
			if(deactivate){
				editPageDialogs.deactivate(page.baseUrl, page.blProxyPrefix, window.BL.config.appsMount);
			}else{
				editPageDialogs.activate(page.baseUrl, page.blProxyPrefix, window.BL.config.appsMount);
			}
		});
	};

	/***************************************************************************************************/
	pageInit[".item-menu"]=function($el){
		var menuIdCount=0, allMenuButtons=[];
		$el.css("cursor","pointer");

		$el.click(function(){
			var $menuButton = $(this);
			var $holder
			if($menuButton.hasClass("ecc-menu")){				
				$holder=$menuButton.next(".eccContainer[data-key]");
			}else{
				$holder=$menuButton.closest("[data-key]");
			}

			var isEccEntry = $menuButton.hasClass("ecc-entry");
			var $pasteMenu;

			var rtype = $holder.data("sling-type");
			var parentContext = page.getButtonSlingPath($menuButton, true);
			var context={type:rtype, path:parentContext.path, parentContexts:parentContext,  buildDialog, editDialog}

			var menuId = "bl-content-menu-" + menuIdCount++;
			var toolMenuId = "bl-tool-menu-" + menuIdCount++;

			var submenuArrow=`<i class="material-icons tiny" style="font-size:.9rem;float:right;margin-right:5px;margin-top:14px;color:#999;">play_arrow</i>`

			if(isEccEntry){
				var pasteEccHtml=`<ul id="paste_${menuIdCount}" class="dropdown-content menu-body">
					<li><a class="paste-item"  data-action="before" href="#"><i class="material-icons small">keyboard_arrow_up</i>Paste before current</a></li>
					<li><a class="paste-item"  data-action="replace" href="#"><i class="material-icons small">play_for_work</i>Replace current</a></li>
					<li><a class="paste-item" data-action="after" href="#"><i class="material-icons small">keyboard_arrow_down</i>Paste after current</a></li>
				</ul>`

				$pasteMenu = $(pasteEccHtml);
				$("body").append($pasteMenu);
			}


			var toolHtml=`<ul id="${toolMenuId}" class="dropdown-content menu-body">
			</ul>`

			var $toolMenu = $(toolHtml), hasMenu=false;


			_.each(["local","page"], (mode)=>{
				var parts=rtype.split("/");
				var menuPath
				if(mode==="local"){
					menuPath=["modules", parts[0], parts[1],"bl","menus"].concat(parts.slice(2));
				}else{
					parts=window.BL.config.page.resourceType.split("/");
					menuPath=["modules", parts[0], parts[1],"bl","pageMenus"].concat(parts.slice(2));
				}

				var menus=_.get(window.BL, menuPath);

				if(_.isFunction(menus)){menus=menus(context);}
				if(!_.isArray(menus)){menus=[menus];}

				try{
					_.each(menus, function(menu,idx){
						if(_.isFunction(menu)){menu=menu(context);}
						if(menu && menu.title){
							hasMenu=true;

							var $menuButton=$(`<li class="${menu.classes}${menu.disabled?" disabled":""}"><a href="#"><i class="material-icons small">${menu.icon || "settings"}</i>${menu.title}</a></li>`);
							$menuButton.click(function(evt){
								if(!menu.disabled){
									if(!menu.action){Materialize.toast("No menu action found.",8000);}
									else{menu.action(_.defaults(context, {menu:menu, $menuButton:$menuButton}));}
								}
								evt.preventDefault();
							});
							$toolMenu.append($menuButton);
						}
					})
				}catch(err){
					var msg="Internal error. Problem loading menu at: " + rtype;
					window.alert(msg); console.log(msg); console.trace(err);
					return;
				}
			});
			
			var toolsMenuButton="";
			if(hasMenu){
				$("body").append($toolMenu);
				toolsMenuButton = `<li>${submenuArrow}<a class="tools-menu" href="#"><i class="material-icons small">build</i>Tools</a></li>`;
			}



			var html=`<ul id="${menuId}" class="dropdown-content menu-body">
				${toolsMenuButton}
				<li class="divider"></li>
				<li><a class="copy-item" href="#"><i class="material-icons small">content_copy</i>Copy item</a></li>
				<li><a class="cut-item"  href="#"><i class="material-icons small">content_cut</i>Cut item</a></li>
				<li>${isEccEntry?submenuArrow:""}<a class="paste-item" href="#"><i class="material-icons small">content_paste</i>Paste</a></li>
				<li class="divider"></li>
				<li><a class="add-annotation" href="#"><i class="material-icons small">chat_bubble_outline</i>Notes</a></li>
				<li><a class="show-documentation" href="#"><i class="material-icons small">library_books</i>Docs</a></li>
				<li><a class="get-info" href="#"><i class="material-icons small">info_outline</i>Inspect</a></li>
			</ul>`
				// <li class="divider"></li>
				// <li><a data-action="select-item" href="#"><i class="material-icons small">check</i>Select item</a></li>

			var $menu = $(html);

			$("body").append($menu);

			$menuButton.off("click");
			$menuButton.attr("data-activates",menuId)
			$menuButton.dropdown({
			   inDuration: 300,
			   outDuration: 225,
			   constrainWidth: false, // Does not change width of dropdown to that of the activator
			   hover: false, // Activate on hover
			   gutter: 20, // Spacing from edge
			   belowOrigin: true, // Displays dropdown below the button
			   alignment: "right", // Displays dropdown with edge aligned to the left of button
			   stopPropagation: true // Stops event propagation
			 });



			$menuButton.dropdown("open");

			var subMenuOptions={
				hover:true,
				alignment:"left",
				belowOrigin:false,
				stopPropagation: true,
				constrainWidth: false,
				gutter: $menu.width()-28
			};

			$menu.find(".tools-menu").parent().attr("data-activates",toolMenuId).dropdown(subMenuOptions);

			if(isEccEntry){
				$menu.find(".paste-item").parent().attr("data-activates",`paste_${menuIdCount}`).dropdown(subMenuOptions);
			}else{
				$menu.find(".cut-item").parent().addClass("disabled");
			}

			$menu.find(".copy-item, .cut-item").click(function(ev){
				var $btn=$(this)
				var cut=$btn.hasClass("cut-item");
				window.sessionStorage.setItem("bl-buffer-path", context.path);
				window.sessionStorage.setItem("bl-buffer-rtype", rtype);
				window.sessionStorage.setItem("bl-buffer-type", cut?"cut":"copy");
				ev.preventDefault();
			});

			$menu.find(".add-annotation").click(function(ev){
				ev.preventDefault();
				buildDialog({
					noSave: true,
					title: "Annotations",
					url: window.BL.config.appsMount + "blacklight/edit/annotations.html?path=" + context.path
				});
			});
			
			$menu.find(".show-documentation").click(function(ev){
				ev.preventDefault();
				buildDialog({
					noSave: true,
					title: "Component Documentation",
					url: window.BL.config.appsMount + "blacklight/edit/documentation" + context.path, 
					iframe: true
				});
			});

			$menu.find(".get-info").click(function(ev){
				var $explainDialog = buildDialog({
					noSave: true,
					title: "Content Inspector",
					url: window.BL.config.appsMount + "blacklight/edit/dialogs/inspect?path=" + context.path
				});

				// $explainDialog.find(".modal-content").html($explainDialog.titleBar("Reasons for available choices") + `<br><br>Path: ${context.path}`);
			});


			var $pasteButtons=(isEccEntry?$pasteMenu:$menu).find(".paste-item")

			$pasteButtons.click(function(ev){
				var path=window.sessionStorage.getItem("bl-buffer-path");
				var rtype=window.sessionStorage.getItem("bl-buffer-rtype");
				var pasteType = window.sessionStorage.getItem("bl-buffer-type");
				var $btn=$(this);
				var action = $btn.data("action") || "replace";

				var pasteIsDisabled = !path;
				if(pasteIsDisabled){
					Materialize.toast("Nothing to paste.", 5000, "rounded");
					return;
				}
				if(!pasteIsDisabled){
					console.log("pasting", action, "from", pasteType, " at ", path, "\nto:",context.path);
					// TODO: actually execute the paste with a sling command or two.  No sweat.
				}
				ev.preventDefault();
			})



			function closeAllOthers(){ /// Handles a minor bug in materialize dropdown.  Force close of other dropdowns, to be safe.
				$.each(allMenuButtons,function(idx,$btn){
					if(!$menuButton.is($btn)){
						$btn.dropdown("close");
					}
				})
				// TODO: check if "paste" is currently available and enable/disable menu button accordingly
			}

			closeAllOthers();
			allMenuButtons.push($menuButton);
			$menuButton.click(closeAllOthers);


		});
	}


	/***************************************************************************************************/
	pageInit[".bl-add-to-ecc"]=function($el){
		// Setup of "add child component buttons" (i.e. ghostly green "plus" buttons)
		$el.click(addChildHelpers.onEccAdd(page,editDialog))
	};


	/***************************************************************************************************/
	pageInit["div.markdown-text"]=function($items){
		
		$items.each(function(){
			var $el=$(this);
			var contents=$el.data("contents");
			// TODO: Might want a more general-purpose way of fixing these backlash-escaped chars
			if(contents){
				contents=contents.replace(/\\r/g,"").replace(/\\n/g,"\n").replace(/\\t/g,"\t");
				if(SimpleMDE){$el.html(SimpleMDE.prototype.markdown(contents));}
			}
		})
	};


	/***************************************************************************************************/
	pageInit[".delete-composite"]=function($el){
		$el.click(function(event){
			var x=$(this).parent("li");
			x.remove();
		});
	};



	/***************************************************************************************************/
	pageInit["ul.collapsible"]=function($el){

		 	//////////////////////////////////////////////////////////
		    $el.each(function(){
		    	if($el.find("i.drag-handle").length<1){return;}
		    	var $collection=$(this);
		    	if(typeof Sortable === "undefined"){
		    		console.error("Please load the 'Sortable' Javascript library");
		    		return;
		    	}

				Sortable.create(this, {
					handle: '.drag-handle',
					animation: 150,
					onEnd: function (/**Event*/evt) {
						var $moved=$(evt.item); 
						var idx=evt.newIndex;
						var orderOrder;
						
						var slingPath = page.getButtonSlingPath($moved.find(":first"));

						if(idx>0){
							var $prev=$moved.prev();
							var prevKey=$prev.data("key");
							orderOrder="after " + prevKey;
						}else{
							orderOrder="first";
						}

						var fd=new window.FormData();
						fd.append("_charset_", "utf-8");
						fd.append(":order", orderOrder);

						var request = new window.XMLHttpRequest();
						request.open("POST", page.blProxyPrefix + slingPath);
						request.send(fd);
						request.onload = function(event) {
							if (request.status === 200) {
								/// TODO: show toaster popup here saying "All is groovy"
								var x="OKEY DOKEY";
							} else {
								window.alert("ERROR: Problem reordering item.");
							}
						};

					},
				});
				
		    });

	};




	/***************************************************************************************************/
	pageInit["ul.tabs"]=function($el){

			$el.tabs();
	};


	/***************************************************************************************************/
	pageInit["table.panel-content"]=function($el){
		$el.each(function(idx, el){
			if(!el.children[0] || !el.children[0].children.length){
				$(el).parent().css("display","none");
			}
		});
	};


	/***************************************************************************************************/
	pageInit[".delete-contained-item"]=function($el){

			$el.click(function(){
				var $btn=$(this);
				var slingPath=page.getButtonSlingPath($btn);
				var $dialog=$("#bl-delete-dialog");
				var $deleteButton = $dialog.find(".bl-delete-button");
				var $modalContent=$dialog.find(".modal-content");

				$deleteButton.off().click(function(){
					var uri;
					uri= page.blProxyPrefix + slingPath;

					var fd=new window.FormData();
					fd.append("_charset_", "utf-8");
					fd.append(":operation", "delete");

					var request = new window.XMLHttpRequest();
					request.open("POST",uri);
					request.send(fd);
					request.onload = function(event) {
						if (request.status === 200) {
							var $li=$btn.closest("li"), $addBtn=$li.closest("ul").siblings(".bl-add-to-ecc");
							var maxItems=$addBtn.data("max-items");
							var remainingItems = $li.siblings().length;
							
							if(remainingItems){
								$li.remove();
							}else{
								$li.html('<div style="padding:8px; color:#999; padding-left:16px; padding-top:12px;">Currently empty.  Click the plus buton to add an item.</div>')
							}

							if(remainingItems < maxItems){
								$addBtn.toggle(true);
							}
							
							$dialog.closeModal();
						} else {
							$modalContent.html("<span class='red-text'>Error deleting content at '" + slingPath +"' </span>");
						}
					};
				});

				$dialog.css({height:"75%", width:"70%", maxWidth:"700px"});

				var title=$btn.parent().find(".collapsible-header").find(".item-title").html();

				$modalContent.html("Are you sure you wish to delete this entry?<div class='card' style='margin:30px; width: calc(100% - 110px); padding:24px;'>" + title + "</div>");
				$dialog.openModal({top:"14%"});

			});
	};



	/***************************************************************************************************/
	pageInit["select.materialize"]=function($el){
		$el.material_select();
	}

	/***************************************************************************************************/
	pageInit['input[type="text"].path-widget']=function($el){
		$el.each(function () {
			// retrieve element attributes
			pathWidget($(this));

		});
	}

	/***************************************************************************************************/
	pageInit['.processing-query']=function($el){
		$el.each(function () {
			var thisProcessor = $(this);

			var localKey = thisProcessor.data('component-key') ? ("/" +thisProcessor.data('component-key')) : ""; 
			var blQPath = page.blProxyPrefix + page.getButtonSlingPath(thisProcessor) + localKey;
			
			var checkProcessing = function(){
				$.get(blQPath + '.bl-processing.json', function(data){
					if(!data || data['processing']){
						//recheck in another second
						setTimeout(checkProcessing, 1000);
					}else{
						//update UI
						thisProcessor.find('.loading').hide();
						thisProcessor.find('.done').show();

					}
				});
			}

			setTimeout(checkProcessing, 1000);

		});
	}


	return pageInit;

};

