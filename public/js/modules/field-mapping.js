"use strict";
/* globals window, Materialize, $, _ */


module.exports = function(utils, key, $lockButton){
	"use strict";
	var dialogMapping=require("./dialog-mapping")(utils);
	var dialogBuilder=require("./dialog-builder");
	var referenceWidget = require('../../../apps/widgets/reference/client.js');
	
	var dialog = utils.dialog; 
	var widget = utils.widget; 
	var mappingContext = {};

	var getClosestToComponentPath = function(paths) {
		return _.minBy(paths, function(path) {
			var target = dialog.config.saveTarget;
			if(!path.includes('jcr:content')) {
				target = target.split('/jcr:content')[0];
			}
			var pageParts = target.split('/');
			var pathParts = path.split('/');
			return (pageParts.length > pathParts.length ? _.difference(pageParts, pathParts).length : _.difference(pathParts, pageParts).length);
		});
	}

	var buildBlRefItem = function(ref, options, parentTriggers){
		ref = ref || ''; 
		options = options || {}; 
		options = _.defaults({}, options, {
			source: '', templateId: '', path: [], toDelete: false, target: key
		}); 

		var $li = $(`	
			<li class="collection-item ${options.toDelete ? 'to-delete' : '' } ${!ref ? 'warning' : ''}" data-sling-path='${JSON.stringify(options.path)}'>

				<a class="btn-floating ghosty enabled right delete" ${options.toDelete ? 'style="display: none;"' : '' }><i class="material-icons red darken-2">delete</i></a>
				<a class="btn-floating enabled right undo" ${!options.toDelete ? 'style="display: none;"' : '' } ><i class="material-icons yellow darken-2">undo</i></a>
				<a class="btn-floating ghosty enabled right edit" style="margin-right:10px; ${options.toDelete ? 'display: none;"' : '' }"><i class="material-icons blue">edit</i></a>
				<div class="values">
					<p><strong>Reference Page:</strong> <span class="reference">${ref}</span></p>
					<p><strong>Field:</strong> <span class="source">${options.source}</span></p>
					
					<strong>Template Id 
						<i class="material-icons help-icon tooltipped" data-tooltip="If the Template Id is not set the referenced value will be used directly for the field. As a result, no more than one reference should be setup. If Template Id is set, it can be used as a variable in your field. For example, if you set the Template Id to 'phone', all instances of {{phone}} will be replace with the referenced value. Multiple Templated references can be used for a single field." data-position="bottom">help_outline</i>
					</strong>
					<input class="templateId" value="${options.templateId}"  type="text" style="max-width: 50%;">
					
					<div class="hidden-wrapper" style="display:none;">
						<input class="hidden-ref" type="hidden" />
					</div>
				</div>
			</li>
		`);

		$li.find('.tooltipped').tooltip();
		var $ref = $li.find('.reference');
		var $source = $li.find('.source');
		var $hiddenRef = $li.find('.hidden-ref');
		var initialPath = ref;
		var referenceInitialPath = initialPath || options.referenceInitialPath;

		if(ref && options.source){
			if(initialPath.indexOf('jcr:content') > -1){
				initialPath += "/" + options.source;
			}else{
				initialPath += "/jcr:content/" + options.source
			}
		}

		//default initial path
		if(!referenceInitialPath) {
			if(_.includes(utils.page.baseUrl, '/pages/')) {
				referenceInitialPath = utils.page.baseUrl.replace('/pages/', '/collections/').split('/').slice(0, 7).join('/');
			} else if(_.includes(utils.page.baseUrl, '/feeds/')) {
				var pathParts = utils.page.baseUrl.split('/');
				referenceInitialPath = _.concat(pathParts.slice(0, pathParts.indexOf('feeds')), 'collections', pathParts.slice(pathParts.indexOf('feeds')+2, pathParts.length)).join('/');
			}
		}

		$hiddenRef.val(initialPath);
		var clonedUtils = _.clone(utils); 
		clonedUtils.widget = {onChange: function(updatedVal){
			var val = $hiddenRef.val() || '';
			if(val.indexOf('jcr:content') > -1){
				var parts = val.split('/jcr:content');
				$ref.html(parts[0]);

				var source = parts[1].length ? parts[1].substring(1): ''; 
				$source.html(source);

				if(source){
					$li.removeClass('warning'); 
				}else{
					$li.addClass('warning'); 
				}
			}else{
				$ref.html(val);
				$source.html('');
				$li.addClass('warning'); 
			}
		}, initialPath: referenceInitialPath};

		referenceWidget.init($hiddenRef.parent(), clonedUtils);

		var $delete = $li.find('.delete'); 
		var $undo = $li.find('.undo');
		var $edit = $li.find('.edit'); 
		var $templateId = $li.find('.templateId');

		$delete.click(function(){
			if(options.path.length){
				$li.addClass('to-delete');
				$undo.show();
				$delete.hide();
				$edit.hide();
			}else{
				$li.remove();
			}

			parentTriggers.updateWarningState();
		});

		$undo.click(function(){
			$li.removeClass('to-delete');
			$undo.hide();
			$delete.show(); 
			$edit.show();
			parentTriggers.updateWarningState();
		})

		$edit.click(function(){
			$hiddenRef.click();
		});

		$templateId.keyup(parentTriggers.updateWarningState);

		$li.data('toRefObj', function(){
			var newObj = {
				ref: $li.find('.reference').text(),
				source: $li.find('.source').text(), 
				target: options.target,
				templateId: $li.find('.templateId').val(),
				path: $li.data('sling-path'), 
				toDelete: $li.hasClass('to-delete')
			};

			newObj.modified = 
				newObj.ref !== ref || 
				newObj.source !== options.source || 
				newObj.templateId !== options.templateId;
			newObj.newEntry = newObj.path.length < 1;

			return newObj; 
		});


		return $li; 
		
	}

	$lockButton.contextmenu(function (event) {
		// Avoid the real one
		event.preventDefault();

		// open data mapping for this field
		var $dialog = dialogBuilder({
			fullscreen: true
		});

		$dialog.css({"overflow-y": "hidden", "overflow-x":"hidden", "height":"calc(90vh)"});
		var $dialogBody=$dialog.find(".modal-content");

		//get the blRefs
		var blRefs = dialogMapping.getRefsBySource(key);
		var titleBar = $dialog.titleBar("Data Reference");

		var body=`
			<div class="row field-mapping">
				<div class="col s10 offset-s1">
					<p>This field has the following mappings defined. Changes will not be saved until you click 'Apply' below and 'Save' on the dialog. If you click 'Cancel' on either screen the changes here will be cleared.</p>
					<ul class="collection">
					</ul>
					<a class="add-mapping btn-floating semi-ghosty enabled right" style="clear:both;margin-right:-15px;top:-30px;" >
						<i class="material-icons green">add</i>
					</a>
				</div>
			</div>
			`;
		$dialogBody.html(titleBar + body);

		var $mixWarning = $("<p class='styled-warning yellow darken-2 btn'>Mixing references that have / don't have Template Id will likley not work as intended.</p>");
		$dialog.find('.modal-footer').append($mixWarning);
		var updateWarningState = function(){
			var allReferences = $dialogBody.find('.collection-item:not(.to-delete) .templateId'); 
			if(allReferences.length < 2){
				$mixWarning.hide();
			}else{
				var withTemplateIds = allReferences.filter(function(){return this.value && this.value.length});
				var noTemplateIds = allReferences.filter(function(){return !this.value });

				if(withTemplateIds.length === allReferences.length || noTemplateIds.length === allReferences.length){
					$mixWarning.hide();
				}else{
					$mixWarning.show();
				}
			}
		}

		var mappings = $dialogBody.find('.collection');

		_.each(blRefs, function(nodes, ref){
			_.each(nodes, function(node){
				mappings.append(buildBlRefItem(ref, node, {updateWarningState: updateWarningState}));
			});
		});

		var addNewItem = function(referenceInitialPath) {
			var newItem = buildBlRefItem('', {referenceInitialPath}, {updateWarningState: updateWarningState});
			mappings.append(newItem);
			newItem.find('.edit').click();
			updateWarningState();
		}

		$dialogBody.find('.add-mapping').click(function(){
			var referenceInitialPath;

			//Check the Current Component for other blrefs
			var currentComponentBlRefs = _.uniq(_.flatMap(dialogMapping.getRefsBySource(), function(value) {return _.keys(value)}));
			if(currentComponentBlRefs.length) {
				//if only 1 then just set it
				if(currentComponentBlRefs.length === 1) {
					referenceInitialPath = currentComponentBlRefs[0];
				} else { //otherwise find least number of differences in path
					referenceInitialPath = getClosestToComponentPath(currentComponentBlRefs);
				}
			}
			//Query the current page to find other blrefs (only want parents of current component??)
			if(!referenceInitialPath) {
				var blrefQuery = `/content.custom-query.json?statement=/jcr:root${utils.page.baseUrl}/jcr:content//*[@bl:ref or @bl:autoStubbed]&property=bl:ref,bl:autoStubbed&queryType=xpath`
				utils.sling.request(blrefQuery, { leaveMangledNames: true }, function(err, data) {
					//only get from components that are parents of the current component
					var filteredData = _.filter(data, function(item) {
						let path = item['jcr:path'].split('/').slice(0, -2).join('/');
						return _.includes(dialog.config.saveTarget, path);
					});
					var queriedblRefs = _.uniq(_.map(filteredData, function(item) {return item['bl:ref'] || item['bl:autoStubbed']}));
					referenceInitialPath = getClosestToComponentPath(queriedblRefs);
					addNewItem(referenceInitialPath);
				});
			} else {
				addNewItem(referenceInitialPath);
			}
		});

		var $applyButton = $dialog.find('.bl-save-button'); 
		$applyButton.text('Apply');

		$applyButton.click(function(){
			var newBlRefs = {}; 


			//rebuild the bl:refs for this
			$dialogBody.find('.collection-item').each(function(){
				var curMapping = $(this).data('toRefObj')();
				if(curMapping.ref && curMapping.source){
					var ref = curMapping.ref; 
					delete curMapping.ref; 
					
					if(!newBlRefs[ref]){
						newBlRefs[ref] = []; 
					}
					newBlRefs[ref].push(curMapping);
				}

			});


			//resolve the changes with the bl:maps found
			dialogMapping.processRefUpdates(newBlRefs); 

			$dialog.closeModal();
		});

		$dialog.initClickEvents();

		updateWarningState(); 

	});





	return mappingContext; 
}