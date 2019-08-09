var _=require("lodash");
var toolsBuilder = require('../tools-builder');

module.exports.process=function(data, $, cb){
	var keyToFind = $.blConfig.appsMount + 'blacklight/edit' + $.express.req.path;

	var getNodeWithKey = function(obj){
		var found;
		_.some(obj, function(child){
			found = child.key === keyToFind ? child : '';
			if(!found){
				found = getNodeWithKey(child.children);
			}
			//stops iteration when an object is found
			return found;
		});
		return found;
	};


	toolsBuilder($, function(treeContent){
		data.treeContent = _.get(getNodeWithKey(treeContent), 'children');
		cb();
	});

}