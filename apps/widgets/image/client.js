/* globals window, _, $, document, LazyLoad, Materialize */



module.exports={
	init: function($el, $){
		var $imageHolder=$el.find(".image-holder");
		var $pathInput=$el.find("input.image-path");
		var $cropInput=$el.find("input.cropping");
		var $focalInput=$el.find("input.focal-point");
		var dialogBuilder=require("../../../public/js/modules/dialog-builder");
		var makeBreadcrumbNav=require("../../../public/js/modules/breadcrumb-navigator");
		var curSearchProviderIsProgressive = false;
		var _=$._;
		var resultCount=0;
		var selectedImagePath, selectedCropping, selectedZoomRatio;
		var selectedFocalPoint, selectedAspect, parsedCropAnnotation;
		var availableCroppings = getCroppings();
		var isMetaMode = _.size(availableCroppings) || $.widget.focalPoint;

		$pathInput.on("dblclick", function(ev){
			if(isMetaMode && $pathInput.val().trim()){
				openImageCropper(ev);
			}else{
				openImageSelector(ev);
			}
		});

		function pullFromFieldValues(){
			selectedImagePath = $pathInput.val();
			selectedCropping = $cropInput.val();
			parsedCropAnnotation = parseCropAnnotation();
			selectedFocalPoint = $focalInput.val();
			selectedAspect = selectedCropping ? parsedCropAnnotation.width/parsedCropAnnotation.height : _.get(availableCroppings,0,{}).aspect;
		}



		pullFromFieldValues();

		$imageHolder.click(function(){
			$pathInput.trigger("dblclick");
		});		

		$pathInput.on("change", onFieldChange);
		$pathInput.on("change", onFieldChange);
		$pathInput.trigger("change");


		////////////////////////////////////////////////////////////////////////////////////////////
		function onFieldChange(){
			var $imagePath=$.$(this);
			var curUrl=$imagePath.val().trim() || "";
			var cropping=$cropInput.val() || "";
			if(cropping){cropping = "." + cropping.replace(/\./g,",");}

			var $img=$imagePath.parent().next().find(".image-display");
			var $noImage = $imagePath.parent().next().find(".no-image");
			var pattern = $img.data("pattern");

			if(curUrl){
				$img.css("display", "inline");
				$noImage.css("display", "none");

				$img.attr("src", pattern.replace("[url]", curUrl).replace("[crop]", cropping));
			}else{
				$img.css("display", "none");
				$noImage.css("display", "block");
			}
		}


		////////////////////////////////////////////////////////////////////////////////////////////
		function openImageSelector(ev){
			if($el.hasClass("disabled")){return;}

			var $dialog = dialogBuilder({
				noFooter: true,
				fullscreen: true,
				title:"Select Image"
			});

			$dialog.css({"overflow-y": "hidden", "overflow-x":"hidden", "height":"calc(90vh)"});


			var currentAjaxRequest, queryStart, queryEnd, progressiveLoadSize=20;
			var currentSearchPath="/content/dam";
			var $dialogBody=$dialog.find(".modal-content");


			var titleBar = $dialog.titleBar("Select Image");
			var body=`
				<div class="modal-footer" style="top:0;height:140px; margin: -5px;width: calc(100% + 12px);margin-left: -6px;">
					
					<div class="row">
						<div class="col s12">
							<div class="breadcrumb-navigator z-depth-1 blue accent-2"></div>
						</div>
						<div class="col s12">
							<div class="card" style="width:calc(100% - 40px); margin:0 20px 20px 20px; ">
								<input id="search-image" style="border: none !important; width: calc(100% - 85px); margin: 0; padding-left: 10px;" >


								<i class="material-icons" style="font-size: 32px;float: left; top: 6px; position: relative; left:5px; color:#999;">search</i>
								<i class="material-icons add-to-media-library"  style="cursor:pointer; font-size: 32px;color:#999; display:inline-block; position:relative; top:9px">add_to_photos</i>
							</div>
						</div>
					</div>
					<i class="loading-spinner fa fa-refresh fa-spin fa-5x" style="color:#333; opacity: .9; font-size:150px; z-index:999; position:relative; top:50px; left:calc(50% - 70px); text-shadow: 0px 0px 3px #fff; display:none;"></i>

				</div>

				<div class="modal-content search-results" style="position:absolute; top: 145px; width:100%; height:calc(100% - 140px); margin:0; padding:20px; padding-top:0; overflow-y: scroll;">
				</div>
				`
			$dialogBody.html(titleBar + body);
			$dialog.initClickEvents();
			var $searchInput=$dialog.find("input#search-image");
			var $loadingSpinner = $dialog.find(".loading-spinner");
			var $results = $dialog.find(".search-results");
			var $uploadButton = $dialog.find(".add-to-media-library");
			var uploadOptionsUrl = $.page.appsMount + "blacklight/edit/dialogs/media/upload";

			$uploadButton.click(function(){
				var context={widgetType:$.dialog.config.slingType, pageType: $.page.resourceType};
				var $addImage = dialogBuilder({
					noFooter: true
				})
				$addImage.loadBody({url:uploadOptionsUrl, data:context, title:"Add Image"})
				.then(function(data, $dialogBody){
					$dialogBody.find(".upload-button").each((idx, btn)=>{
						var $btn=$.$(btn);
						$btn.click(()=>{
							var fn = _.get(window.BL,"modules." + $btn.data("action"));
							if(fn && fn.action){
								$addImage.closeModal();
								fn.action(context, {dialogBuilder, page:$.page}, function onUpload(path){
									imgClick(null, path);
									$dialog.closeModal();
								});
							}else{window.alert("Internal error:\nNo action defined for this upload button.")}
						})
					})
				});

			});

			// OK, so here I am deciding to show the upload button.  And I always show the upload button.  But the dialog that appears may have options.
			// For example:  "Make folder"  "Upload Image"  "Pull Image from FS Library"
			// Conditional show based on user privelege - how to define who's allowed?
			// Conditional show based on context of field's parent component (i.e. site/module) - how/where to define available upload options?
			//		Site-specific: in site/config.json   
			//    Module-specific:  model-helpers.js ... "imageUploaders={fs_library:{title:"Pull Image from FS Library"}}"
			// 			plus, client-helpers.js  to build dialogs, etc.

			// you've got a client/server divide that might need to be bridged.  
			// The ID for a given uploader is e.g. "fshr.shared.fsImageLibraryUploader" which is client.
			// But the indicator for when to include/exclude that is needed server side. (site/config.json and model-helpers @ "imageUploaders.include / exclude / users(?)")
			// 



			var moduleSearchPathsKey = (_.get($,"page.resourceType") || "").split("/").slice(0,2).join(".") + ".imageSearchPaths";
			var defaultSearchPathsKey = window.BL.config.defaultModule + ".imageSearchPaths";
			var searchPaths = $.widget.searchPaths || _.get(window.BL.modules, moduleSearchPathsKey) || _.get(window.BL.modules,  defaultSearchPathsKey) ||  ["/content/dam"];
			var $breadcrumbNav = $dialog.find(".breadcrumb-navigator");


			makeBreadcrumbNav($breadcrumbNav, {
				roots: searchPaths,
				startingPath: selectedImagePath.split("/").slice(0,-1).join("/")
			});

			loadResults("");

			$breadcrumbNav.on("change",function(ev,data){
				loadResults($searchInput.val())
			});



			var lazyLoader = new LazyLoad({
			    container: $results.get(0)
			});

			$results.on("scroll", function() {
				if(curSearchProviderIsProgressive && ($results.scrollTop() + $results.innerHeight() >= $results[0].scrollHeight )) {
					loadResults($searchInput.val(), true);
				}
			});

			$searchInput.on("keyup", function(ev){
				var key=ev.which;
				if(key === 32 || key === 13){
					$searchInput.insertAtCaret(" ");
					var query=$searchInput.val();
					if(query.length<2){return;}

					if(!currentAjaxRequest || (currentAjaxRequest.state && currentAjaxRequest.state()!=="pending" ) ){
						queryStart=0; queryEnd=20;
						loadResults(query);
					}
				}else if(resultCount){
					var searchTerm=$searchInput.val().toLowerCase();
					$results.find(".card").each(function(){
						var $cur=$.$(this);
						if(!searchTerm || $cur.data("name").toLowerCase().indexOf(searchTerm)>-1){
							$cur.show();
						}else{
							$cur.hide();
						}
					});
					lazyLoader.update();
				}

			});


			//////////////////////////////////////////////////////////////////////////////////////////
			function loadResults(query, retainCurrentResults){
				$loadingSpinner.show();
				var searchProvider = getSearchProvider(query);
				curSearchProviderIsProgressive = searchProvider.isProgressive;

				if(!curSearchProviderIsProgressive){retainCurrentResults=false;}

				if(retainCurrentResults){
					queryStart=queryEnd;
					queryEnd+=progressiveLoadSize;
				}else{
					resultCount=0;
					queryStart=0;
					queryEnd=progressiveLoadSize;
				}


				currentAjaxRequest=$.$.ajax({url:searchProvider.url, dataType:"json"})
				.done(function(results,status){

					if(searchProvider.formatResults){
						results = searchProvider.formatResults(results);
					}

					$loadingSpinner.hide();
					if(!retainCurrentResults){$results.html("");}

					if(_.size(results)){
						_.each(results, function(result){
							var imgPath = result.path; // + "/jcr:content/renditions/original";
							var name=result.name || result.path.split("/").pop();
							$results.append("<div class='card grey lighten-3" + (result.selected?" selected":"") + "' style='display:inline-block; margin:6px;' data-name='" + name + "'><img data-path='" +
									imgPath + "' data-original='"  + imgPath +
									"' style='cursor:pointer; max-height:150px;' height='150'><div style='font-size:.8em;color:#777;padding:2px; padding-left:5px;'>" + name + "</div></div>");
						});
						resultCount=_.size(results);
					}
					$results.find("img").on("click", imgClick);
					lazyLoader.update();
				})
				.fail(function(err){
					$loadingSpinner.hide();
					$results.html("<h3>FAILED TO LOAD QUERY RESULTS.</h3>");
				});
			}


			/////////////////////////////////////////////////////////////////////////////////////
			function getSearchProvider(query, start, end){
				var url, formatResults, isProgressive;
				var baseFolder = $breadcrumbNav.data("value");
				var blProxy = $.page.blProxyPrefix || "";

				if(query){
					url = blProxy + "/bin/customassetviewservlet.json?damPath=" + baseFolder + "&query=|QUERY|&format=&mimeType=image&charset=utf-8&limit=|RANGE|";
					url = url.replace(/\|QUERY\|/, window.escape(query)).replace(/\|RANGE\|/, queryStart + ".." + queryEnd);
					formatResults = function(rawResults){
						var results=[];
						_.each(_.get(rawResults,"hits"), function(val){
							results.push({path:val.path, name: val.name, type:"asset"})
						});
						return results;
					}
					isProgressive=true;
				}else{
					url = blProxy + baseFolder + ".list.assets.detail.1.json";
					formatResults = function(rawResults){
						var selectedItem;
						var results=[];
						_.each(_.get(rawResults,"resources"), function(val){
							if(val.type==="asset"){
								var item={path:val.path, name: val.title, type: val.type};
								if(selectedImagePath===val.path){
									item.selected=true;
									selectedItem=item;
								}else{
									results.push(item);
								}								
							}
						});
						if(selectedItem){results.unshift(selectedItem);}
						return results;
					}
				}

				return {url:url, formatResults: formatResults, isProgressive: isProgressive}
			}

			/////////////////////////////////////////////////////////////////////////////////////
			function imgClick(ev, path){
				var $clickedImage = $.$(this);
				var newSelection = path || $clickedImage.data("path");
				if(isMetaMode && newSelection!==selectedImagePath){
					selectedCropping="";
					selectedFocalPoint = "";
					selectedAspect=availableCroppings[0].aspect;
				}
				selectedImagePath=newSelection;
				if(isMetaMode){
					$dialog.closeModal();
					openImageCropper();
				}else{
					writeResults();
					$dialog.closeModal();
				}

			}


		}





		/***********************************************************************************/
		function openImageCropper(){
			var $cropDialog = dialogBuilder({
				fullscreen: true,
				title:"Crop Image"
			});
			var modalId = $cropDialog.attr("id");
			var $dialogBody=$cropDialog.find(".modal-content");
			var titleBar = $cropDialog.titleBar("Select Image");
			var aspectDropId = "aspect-dropdown-" + modalId;
			var aspectOptions=makeDropdown(aspectDropId, _.map(availableCroppings, (crop)=>{if(crop){return{title:crop.title, value:crop.aspect}}} ));
			var revealFocalPoint = function () { window.alert("Can't reveal focal point") };

			var body=`
				<div class="row" style="margin-top:.5rem;margin-bottom:.5rem;">
			  		<div class="col s5">
				  		<a class="dropdown-button aspect btn  grey lighten-1" href="javascript:;" data-activates="${aspectDropId}"><span class="aspect-text">Aspect Ratio</span></a>
						<a class="dropdown-button btn  grey lighten-1" href="javascript:;" style="margin-left:.1rem;" data-activates="existing-crops"><i class="material-icons left">crop</i>Presets</a>
					</div>
					<div class="col s2" style="text-align:center;">
						<div class="btn grey lighten-1 center disabled" style="padding:0 1em;">
							<span class="cropped-width"></span> x <span class="cropped-height"></span>
						</div>
					</div>
			  		<div class="col s5">
						<a class="pick-different-image waves-effect waves-light btn right grey lighten-1"><i class="material-icons left">collections</i>Images</a>
						<a class="set-focus waves-effect waves-light right btn grey lighten-1" style="margin-right:.4rem;"><i class="material-icons left">location_searching</i>Focus</a>
					</div>
				</div>

				<div class="row">

					<div class="col s12 container">
						<img class="crop-image" src="${selectedImagePath}" alt="Crop this image" style="max-height: calc(70vh - 60px);">
					</div>
					<div class="col s12">
						<input class="zoom-slider no-materialize" type="range" min="0" max="100" step=".000001" value="0" style="width:100%; margin-top:15px;" disabled/>
					</div>
			  </div>

			  ${aspectOptions}
			`

			$dialogBody.html(titleBar + body);
			$cropDialog.initClickEvents();

			var $allAspectLinks = $dialogBody.find(`#${aspectDropId} li`);
			
			$allAspectLinks.each(function(){
				var $li=$.$(this);
				var val = parseFloat($li.data("value"));
				if(Math.abs(selectedAspect - val) < 0.001){
					$li.addClass("selected");
					$dialogBody.find(".aspect-text").html("Aspect " + $li.data("title"));
				}else{
					$li.removeClass("selected");
				}
				$li.click(function(){
					selectedAspect = $li.data("value");
					selectedCropping = "";
					selectedFocalPoint = "";
					$cropDialog.closeModal({complete:openImageCropper});
				})
			})

			$dialogBody.find(".dropdown-button").dropdown({belowOrigin:true, constrainWidth:false})
			$dialogBody.find(".pick-different-image").click(function(){
				$cropDialog.closeModal();
				openImageSelector();
			});

			$cropDialog.find(".modal-close").off("click").click(function(){
				$cropDialog.closeModal();
				pullFromFieldValues();
			});

			var naturalWidth, naturalHeight, cropBoxHeight, cropBoxWidth;

			var $image=$dialogBody.find(".crop-image");
			window.theimage = $image;
			var $slider=$dialogBody.find(".zoom-slider");
			var $width=$dialogBody.find(".cropped-width");
			var $height=$dialogBody.find(".cropped-height");
			var minWidth = $.widget.minWidth || 100
			var minHeight  = $.widget.minHeight;
			var highestRatio, lowestRatio, heightOriented;
			var resetScaleTimeout, isDisabled=false;
			var iterationCount=1;

			$cropDialog.find(".bl-save-button").html("Accept").click(function(){
				var cropData = $image.cropper("getData");
				selectedCropping= cropData.x.toFixed(4) + "-" + cropData.y.toFixed(4) + "-" + cropData.width.toFixed(4) + "-" + cropData.height.toFixed(4);
				writeResults();
				$cropDialog.closeModal();				
			})

			$slider.on("input",function(){
				var pct=$slider.val();
				var zoom = (pct * (highestRatio - lowestRatio) / 100) + lowestRatio;
				$image.cropper("zoomTo", zoom); 
				var cropData = $image.cropper("getData");
				setCropSize(cropData.width, cropData.height);
			})

			$image.cropper({
				viewMode: 1,
				aspectRatio: selectedAspect,
				dragMode: "move",
				autoCropArea: 0.95,
				restore: false,
				guides: false,
				highlight: false,
				cropBoxMovable: false,
				cropBoxResizable: false,
				minCropBoxWidth: minWidth,
				minCropBoxHeight: minHeight,

				ready: function () {
					$slider.attr('disabled', false);

					$cropDialog.find(".set-focus").click(function(){
						revealFocalPoint();
						$image.cropper("setDragMode", "crop");
					});

					/////////////////////////////////////////////////////////////////////////////
					revealFocalPoint = function(){
					var $cropperBox = $cropDialog.find(".cropper-crop-box");
					var translatedFocalPoint = {x:0,y:0};
					if(selectedFocalPoint){
						var parts=selectedFocalPoint.split(",");
						var fx = parseFloat(parts[0]), fy=parseFloat(parts[1]);
						translatedFocalPoint={x:fx*selectedZoomRatio - 100, y:fy*selectedZoomRatio-100}
					}else{
						var w=$cropperBox.width(), h=$cropperBox.height();
						translatedFocalPoint = {x:w/2-100, y:h/2-100};
					}

						function createCircle(){
						$cropperBox.append(`<div class='locator-circle' style='top:${translatedFocalPoint.y}px; left:${translatedFocalPoint.x}px;'></div>`);

						setTimeout(function(){
							$.$(".locator-circle:last-child").addClass("zoom");
						},10);
						
						setTimeout(function(){
							$.$(".locator-circle:first-child").remove();
						},1000);
						}	  

						createCircle();
						var interval=setInterval(function(){
							createCircle();
						},333);

						setTimeout(function(){clearInterval(interval);}, 2000);					
						setTimeout(function(){$.$(".locator-circle").remove();}, 3000);					
					}



					/////////////////////////////////////////////////////////////////////////////
					function init(){
					var canvasData = $image.cropper("getCanvasData");
					var cropBoxData = $image.cropper("getCropBoxData")
					var containerData = $image.cropper("getContainerData")
					naturalWidth = canvasData.naturalWidth;
					naturalHeight = canvasData.naturalHeight;
					cropBoxHeight = cropBoxData.height;
					cropBoxWidth = cropBoxData.width;

					//  Find range of slider:
					highestRatio = cropBoxData.width / minWidth 

					if (naturalWidth/naturalHeight > selectedAspect ){
							lowestRatio = cropBoxData.height / naturalHeight;
							heightOriented=true;
							// console.log("lowestRatio height:", lowestRatio);
					}else{
							lowestRatio = cropBoxData.width / naturalWidth;
							heightOriented=false;
							// console.log("lowestRatio: width", lowestRatio);
					}

					if(selectedCropping){
						var $cropperBox = $cropDialog.find(".cropper-face");
						window.cropperbox = $cropperBox;

						selectedZoomRatio = $cropperBox.width()/parsedCropAnnotation.width;
						$image.cropper("zoomTo", selectedZoomRatio);
						var curCrop = $image.cropper("getData");

						var zeroLeft = $cropperBox.offset().left - $cropDialog.find(".cropper-wrap-box").offset().left;
						var zeroTop = $cropperBox.offset().top - $cropDialog.find(".cropper-wrap-box").offset().top;
						$image.cropper("moveTo", zeroLeft-(parsedCropAnnotation.x*selectedZoomRatio), zeroTop-(parsedCropAnnotation.y*selectedZoomRatio))
						

						// var diff=curCrop.width - selectedCrop.width;	            	
						// if(Math.abs(diff) > 1){
						// 	var timeout=setTimeout(function(){
						// 		if(iterationCount++>3){clearTimeout(timeout); iterationCount=1; return;}
						// 		init()
						// 	}, 500*iterationCount);
						// }
					}else{
						$image.cropper("zoomTo", lowestRatio);
					}
					var cropData=$image.cropper("getData");
					setCropSize(cropData.width, cropData.height);

					function disableSave(){
						$cropDialog.find(".bl-save-button").addClass("disabled");
					}
					if(minWidth && (naturalWidth<minWidth)){
					isDisabled=true;
					disableSave();
					Materialize.toast("Can't use this image due to minimum width requirement: " + minWidth + "px", 6000);
					}else if(minHeight && (naturalHeight<minHeight)){
					isDisabled=true;
					disableSave();
					Materialize.toast("Can't use this image due to minimum height requirement: " + minHeight + "px", 6000);
					}
				}

				setTimeout(init, 500);

				$image.load(init);
				$.$(window).resize(init);
				},

				cropstart:function(e){
				if(isDisabled){
					e.preventDefault();
					return false;
				}
				if(e.action==="crop"){
						var x = e.originalEvent.offsetX/selectedZoomRatio;
						var y = e.originalEvent.offsetY/selectedZoomRatio;
						selectedFocalPoint = `${x},${y}`;
					e.preventDefault();
					$image.cropper("setDragMode", "move");
					revealFocalPoint();
					return false;
				}
				},

				zoom: function(e){
				var data=$image.cropper("getData");
				if((e.oldRatio<e.ratio)){
					if(minWidth  && (data.width < minWidth) || (minHeight  && (data.height < minHeight)) )  {
					clearTimeout(resetScaleTimeout);
					resetScaleTimeout = setTimeout(function(){$image.cropper("zoomTo", highestRatio);}, 200);
					e.preventDefault();
					$slider.val(100)
					return false;
					}
				}

				$slider.val( ((e.ratio - lowestRatio) / (highestRatio-lowestRatio)) * 100 );
				setCropSize(data.width, data.height);
				},

				// crop:function(e){
				//   var data=$image.cropper("getData");
				//   var canvData=$image.cropper("getCanvasData");
				//   $output.html(JSON.stringify(data,null,"  ") + "<br>" + JSON.stringify(canvData,null,"  ")) ;          
				// }

			});

			//////////////////////////////////////////////
			function setCropSize(width, height){
				$width.html(Math.round(width));
				$height.html(Math.round(height));
			};
		}


		/////////////////////////////////////////////////////////////////////////////////////
		function parseCropAnnotation(){
			if(!selectedCropping){return {};}
      	var parts=selectedCropping.split("-");
      	var data={x:parseFloat(parts[0]), y:parseFloat(parts[1]), width: parseFloat(parts[2]), height: parseFloat(parts[3])};
      	data.aspect = data.width/data.height;
      	return data;
		}


		/////////////////////////////////////////////////////////////////////////////////////
		function getCroppings(){
			var stringAspect=/(\d+) ?[:x\/] ?(\d+)/

			var moduleSearchPathsKey = (_.get($,"page.resourceType") || "").split("/").slice(0,2).join(".") + ".imageCroppings";
			var defaultSearchPathsKey = window.BL.config.defaultModule + ".imageCroppings";
			var crops = (_.size($.widget.cropping) ? $.widget.cropping : '') || _.get(window.BL.modules, moduleSearchPathsKey) || _.get(window.BL.modules,  defaultSearchPathsKey);
			var resultCrops=[];
			if(crops && crops === "disabled") {return resultCrops;} //return empty result to skip cropping 
			if(crops && !_.isArray(crops)){crops=[crops];}

			_.each(crops, function(crop){
				if(!_.isObject(crop)){
					if(_.isString(crop)){
						var match=crop.match(stringAspect);
						if(match){
							crop={title:crop, aspect:parseInt(match[1]) / parseInt(match[2])}
						}else{
							crop={title:"Bad crop string: " + crop, aspect:1}
						}
					}else if(_.isNumber(crop)){
						var title, denominator;
						for(let i=1; i<25 && !title; i++){
							denominator=i/crop;
							if(denominator - Math.floor(denominator) < 0.001){
								title=`${i}:${denominator}`;
							}
						}
						if(!title){title=_.round(crop, 3).toString();}
						crop={title:title, aspect:crop};
					}
				}

				resultCrops.push(crop);

			});

			return resultCrops;
		}


		/////////////////////////////////////////////////////////////////////////////////////
		function makeDropdown(id, options){
			var html=[`<ul id="${id}" class="dropdown-content dynamic">`];
			_.each(options, function(option){
				if(!_.isObject(option)){option={title:option};}
				html.push(`<li class="${option.class||""}" data-value="${option.value || option.title || ""}" data-title="${option.title}"><a href="#">${option.title}</a></li>`)
			});
			html.push("</ul>")
			return html.join("\n");
		}

		/////////////////////////////////////////////////////////////////////////////////////
		function writeResults(){
			$focalInput.val(selectedFocalPoint);
			$cropInput.val(selectedCropping);
			$pathInput.val(selectedImagePath);
			$pathInput.select();
			$pathInput.trigger("change");
		}

	
	},












	/******************************************************************************************/
	getValue : function($el, name, $){
		var isMetaMode = $el.find("input.cropping").val() || $el.find("input.focal-point").val();		
		var pathValue = _.trim($el.find("input.image-path").val());
		var result;

		if(isMetaMode && pathValue){
			result = [
				{name : name + "/jcr:primaryType", value : "nt:unstructured"},
				{name : name + "/path", value : pathValue},
				{name : name + "/cropping", value : $el.find("input.cropping").val()},
				{name : name + "/focalPoint", value : $el.find("input.focal-point").val()}
			];
		}else{
			result= [{name : name, value : pathValue}];			
		}

		result.push({name : name + "@Delete", value : "true"});
		return result;
	}
}






$.fn.extend({
	insertAtCaret: function(myValue){
	  return this.each(function(i) {
	    if (document.selection) {
	      //For browsers like Internet Explorer
	      this.focus();
	      var sel = document.selection.createRange();
	      sel.text = myValue;
	      this.focus();
	    }
	    else if (this.selectionStart || this.selectionStart == "0") {
	      //For browsers like Firefox and Webkit based
	      var startPos = this.selectionStart;
	      var endPos = this.selectionEnd;
	      var scrollTop = this.scrollTop;
	      this.value = this.value.substring(0, startPos)+myValue+this.value.substring(endPos,this.value.length);
	      this.focus();
	      this.selectionStart = startPos + myValue.length;
	      this.selectionEnd = startPos + myValue.length;
	      this.scrollTop = scrollTop;
	    } else {
	      this.value += myValue;
	      this.focus();
	    }
	  });
	}
});

