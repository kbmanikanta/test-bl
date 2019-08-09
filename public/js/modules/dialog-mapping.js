
module.exports = function(utils){
	var dialog = utils.dialog; 

	var blMaps = dialog.get$().find('form').data('blMaps'); 

	var updateMaps = function(newMaps){
		blMaps = newMaps; 
		dialog.get$().find('form').data('blMaps', newMaps);
	}; 

	var result = {

		flattenMaps: function(){
			var flattened = {}; 

			var recursiveFlatten = function(obj, prefix){
				prefix = prefix ? prefix + '/': '';

				_.each(obj, function(value, key){
					if(_.isPlainObject(value)){
						recursiveFlatten(value, prefix + key);
					}else{
						flattened[prefix +  key] = value; 
					}
				});
			}

			recursiveFlatten(blMaps);

			return flattened;
		},

		getRefsBySource: function(source){
			var blRefs = {}; 
			var flattened = result.flattenMaps(); 
			//we only care about the keys
			var keys = _.keys(flattened);
			_.each(keys, function(key){
				if(_.endsWith(key,'/bl:ref')){
					let nameRoot = key.split('bl:map')[0] + 'bl:map';
					let refParent = key.substring(nameRoot.length + 1).split('/bl:ref')[0]; 
					let blRef = _.get(blMaps, [nameRoot].concat(refParent.split('/')));
					_.each(_.get(blRef, 'nodes'), (directive, nodeName)=>{
						if(_.isPlainObject(directive) && directive.target){
							let refPath = blRef['bl:ref'];
							let storedDirective = {
								source: directive.source, 
								target: directive.target, 
								templateId: directive.templateId,
								path: [nameRoot].concat( (refParent + '/nodes/' + nodeName).split('/'))
							}
							
							let relativeTarget = nameRoot.replace('bl:map', '') + storedDirective.target
							if(!blRefs[relativeTarget]){
								blRefs[relativeTarget] = {};
							}

							if(!blRefs[relativeTarget][refPath]){
								blRefs[relativeTarget][refPath] = []; 
							}


							blRefs[relativeTarget][refPath].push(storedDirective);
						}
					});
				}
			});

			return source ? blRefs[source] : blRefs;
		}, 


		processRefUpdates: function(newBlRefs){
			//assumes that the refs are updated by source target
			//iterate through each ref path
			_.each(newBlRefs, function(nodes, ref){
				_.each(nodes, function(node){
					var cloneNode = function(){
						return {source: node.source, target: node.target, templateId: node.templateId}; 
					}; 
					if(node.newEntry){
						//save this in the top level bl:map
						var foundRef = false; 
						_.each(blMaps['bl:map'], function(entry, key){
							//iterate through all the entries currently under bl:map until we 
							//find one with a matching bl:ref
							if(_.isPlainObject(entry) && entry['bl:ref'] === ref){
								//we're just going to add this entry here
								entry.nodes = entry.nodes || {}; 
								var newNode = result.getIndexedName(entry.nodes, 'n');
								_.set(entry.nodes, newNode, cloneNode());
								foundRef = true; 
							}
						}); 

						if(!foundRef){
							var newNode = result.getIndexedName(blMaps['bl:map'], 'i');
							_.set(blMaps, ['bl:map', newNode], { 'bl:ref': ref, 'nodes': {'n0': cloneNode()}}); 
						}
					}else if(node.toDelete){
						//delete
						_.set(blMaps, node.path, undefined);
						//check if there are any other nodes on this bl:ref
						var otherNodes = _.filter(_.get(blMaps, node.path.slice(0, -1)), 'source');
						//Delete the entire bl:ref if no other nodes need it
						if(_.isEmpty(otherNodes)) {
							_.unset(blMaps, node.path.slice(0, 2));
						}
					}else if(node.modified){
						//copy just the relevant data
						_.set(blMaps, node.path, cloneNode());
					}
				});
			})

			result.updateDataMappingTab();

		},
		
		getIndexedName : function(objToCheck, prefix){
			if(_.keys(objToCheck).length === 0){
				return prefix + '0';
			}else{
				var found = false;
				var index = 0; 
				while(!found){
					var toTest = prefix + index;
					if(!objToCheck[toTest]){
						found = toTest; 
					}else{
						index++; 
					}
				}

				return found; 
			}
		},


		updateDataMappingTab: function(){
			var newMapItemUrl = utils.page.appsMount + "blacklight/edit/dialogs/edit/mapping-update"
			var postMe = {maps: blMaps, type: _.get(dialog,"config.slingType")};

			$.ajax({url: newMapItemUrl, data: postMe, method:"POST"})
			.done(dialog.mappingPage.updateView);

		}

	}

	return result; 
};