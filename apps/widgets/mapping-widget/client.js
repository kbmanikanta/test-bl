/* globals Materialize, _ */

// Note:  This client.js is invoked a little differently from other dialog widgets; it is required statically by edit-dialog.js

var dialogBuilder=require("../../../public/js/modules/dialog-builder");
var shared = require("./shared.js");

module.exports=function($, window, page, $dialog){
	var mappingPage={};
	var dialog=$dialog.data("dialog");
	var $mappingBody = dialog.$mappingBody;
	var $addMappingButton;

	function activate(){
		$addMappingButton = $dialog.find(".bl-add-mapping");

		$mappingBody.find(".json5").unbind("input propertychange")
		.bind("input propertychange", dirty);

		$mappingBody.find("input.type-value").unbind("input propertychange")
		.bind("input propertychange", dirty);

		$mappingBody.find(".delete-mapping-item").off("click").click(deleteMapping);

		$mappingBody.find(".named-mappings-menu-button").css({cursor:"pointer"}).dropdown({constrainWidth:false});

		$mappingBody.find(".map-link").click(pickNamedMap);

		$addMappingButton.off("click").click(pickNewMapping)
	}

	activate();


	/*************************************************************************************/
	function dirty(){
		mappingPage.dirty = true;
	}

	/*************************************************************************************/
	function pickNamedMap(){
		var $btn=$(this);
		var $menu=$btn.closest(".named-maps-menu");
		var newMapUrl = page.appsMount + "blacklight/edit/dialogs/edit/mapping-add-named"

		var data={mapId: $btn.data("map-link"), resourceType: $menu.data("resource-type"), slingPath: $menu.data("sling-path") }

		$.ajax({url: newMapUrl, data, method:"POST"})
		.done(function(data){
			// var $content = $dialog.find(".mapping-body");
			$mappingBody.html($(data));
			setTimeout(activate,500);
			dirty();
		});

	}

	/*************************************************************************************/
	function deleteMapping(){
		var $btn=$(this);
		var $widget = $btn.closest(".mapping-widget");
		var id=$widget.data("map-id");
		var type=$widget.data("map-type");
		var typeName = shared.mappingTypes[type] || type;
		if(window.confirm(`Delete mapping of type '${typeName}?'`)){
			$widget.html(`
				<i class="material-icons left " style="top: -2px; position: relative; left: -6px; color: #911; margin-right: 0px;">delete_forever</i>
				Deleted mapping of type '<b>${typeName}</b>'.
				<input type="hidden" name="${id}_type" value="${type}">
				<input type="hidden" name="${id}_delete" value="{}">
				`);
			dirty();
		}
	}

	/*************************************************************************************/
	function pickNewMapping(){
		var mappingTypes = _.clone(shared.mappingTypes);
		var $pickMapDialog = dialogBuilder({
			noFooter: true
		});		

		var $dialogBody=$pickMapDialog.find(".modal-content");
		var titleBar = $pickMapDialog.titleBar("Select Mapping Type");
		var options=[];
		var $mappingWidgets = $mappingBody.find('.mapping-widget');
		var biggestKeyCount=-1;

		$mappingWidgets.each(function(){
			var $widget=$(this);
			var key = $widget.data("map-id").match(/^i(\d+)$/);
			var type = $widget.data("map-type");

			if(key){
				let keyCount=parseInt(key[1]);
				if(keyCount>biggestKeyCount){biggestKeyCount=keyCount;}
			}

			if(type==="bl:query"){
				delete mappingTypes["bl:query"];
			}

			if(type==="bl:component-inherit"){
				delete mappingTypes["bl:component-inherit"];
			}

		})

		var nextKey = biggestKeyCount + 1;

		var types= _.each(mappingTypes, function(title,type){
			options.push(`<a href="#!" data-type="${type}" data-key="i${nextKey}" class="collection-item mapping-type">${title}</a>`)
		});

		var body=`
		<div class="row" style="margin:1em;">
			<div class="col s12">
		      <div class="collection">
		      	${options.join("\n")}
		      </div>
		   </div>
		</div>
		`
		$dialogBody.html(titleBar + body);		
		$pickMapDialog.initClickEvents();
		$dialogBody.find(".mapping-type").click(function(){
			var $button=$(this);
			var newMapItemUrl = page.appsMount + "blacklight/edit/dialogs/edit/mapping-add"
			var postMe = {type: $button.data("type"), key: $button.data("key"), resourceType: _.get(dialog,"config.slingType")};

			$.ajax({url: newMapItemUrl, data: postMe, method:"POST"})
			.done(function(data){
				$(data).insertBefore($addMappingButton);
				$pickMapDialog.closeModal();
				var $content = $dialog.find(".modal-content");
				$content.animate({ scrollTop: $content.prop("scrollHeight")}, 2000);
				dirty();
			});
		});
	}



	/*************************************************************************************/
	mappingPage.validate = function(callback){

		var mapValidateUrl = page.appsMount + "blacklight/edit/dialogs/edit/mapping-process"; 

		var values = []; 
		var mapEntries = $mappingBody.find('.map-entry'); 
		mapEntries.each(function(){
			var data = {name: $(this).data('name'), fields: {}};
			var formFields = $(this).find("input, textarea, select").serializeArray(); 
			_.each(formFields, function(field){
				data.fields[field.name] = field.value;
			})
			values.push(data);
		});

		$.ajax({url: mapValidateUrl, data: {maps: values}, method:"POST"})
		.done(function(data){
			let error="";
			if(!data || !data.postFields){
				error = "Error sending data mapping info.";
			}
			mappingPage.postFields = data.postFields;
			callback(error);
		});

	}

	/*************************************************************************************/
	mappingPage.updateView = function(newHtml){
		$mappingBody.html(newHtml);
		activate();
		dirty();
	}

	return mappingPage;
}