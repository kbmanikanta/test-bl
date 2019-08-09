
module.exports={
	init: function($el, $){
		
		//figure out root
		var moduleSearchPathsKey = (_.get($,"page.resourceType") || "").split("/").slice(0,2).join(".") + ".tagsRoot";
		var defaultSearchPathsKey = window.BL.config.defaultModule + ".tagsRoot";
		var root = $.widget.root || _.get(window.BL.modules, moduleSearchPathsKey) || _.get(window.BL.modules,  defaultSearchPathsKey) ||  "/etc/tags"
		root = root.replace(/([^:]+):(.*)/, '/etc/tags/$1/$2');

		var tagsQuery = `/content.custom-query.json?statement=SELECT * FROM [cq:Tag] WHERE [sling:resourceType] = 'cq/tagging/components/tag' AND ISDESCENDANTNODE('${root}') ORDER BY [jcr:title]&queryType=JCR-SQL2&property=jcr:title`;
		$.sling.request(tagsQuery, {leaveMangledNames: true}, function(err, data){
			if(err){console.log('Error getting tag data', err);$el.find('div').html('<p style="color:red;">Error retrieving tag data</p>'); return;}
			var initialValue = $el.data('value') || []; 
			
			var availableTags = _.reduce(data, (aggregate, tagResult)=>{
				var tagId = pathToId(tagResult['jcr:path']);
				var tagIdPieces = tagId.split('/');
				var tagNode = tagIdPieces.pop();
				var tagName = `${tagResult['jcr:title']} (${tagNode})`;//tagIdToTitle(tagIdPieces.join('/'), `${tagNode} (${tagResult['jcr:title']})`); 
				aggregate.lookup[tagId] = {
					tag: tagName,
					id: tagId, 
					tooltip: tagId
				}

				aggregate.autocomplete[tagName] = {
					tag: tagName,
					id: tagId, 
					tooltip: tagId
				}
				return aggregate; 

			} ,{lookup: {}, autocomplete: {}});


			initialValue = !_.isArray(initialValue) ? [initialValue] : initialValue; 
			initialValue = _.map(initialValue, (tagId)=> {
				return {
					tag: _.get(availableTags.lookup[tagId], 'tag', tagId + " (Invalid Tag)"), 
					id: tagId, 
					tooltip: tagId
				}
			});
	
			$el.find('.chips').material_chip({
				data: initialValue, 
				autocompleteData: availableTags.autocomplete, 
				onlyAutocomplete: true, 
				limit: $.widget.limit
			}); 

		});

		
		
		// $el.find(".tag-name").each(function(idx, item){
		// 	var $item = $(item);
		// 	var fullTag = $item.html().trim();
		// 	$item.data("value",fullTag);
			// var slashed = fullTag.split(":").pop();
			// var parts = slashed.split("/");
			// var fixed=[];
			// parts.forEach(function(val){
			// 	val=val.replace(/\-|\_/g, " "); 
			// 	val=val.replace(/ [a-z]|^[a-z]/g, function(v){return v.toUpperCase();});
			// 	fixed.push(val);
			// });
			// fixed.push("<span style='color:black'>" + fixed.pop() + "</span>");
		// 	$item.html(fixed.join(" &nbsp;/&nbsp; "));
		// });
	},
	getValue : function($el, name, $){
		var vals=[];
		$el.find(".chips .chip").each(function(idx,item){
			console.log('pushing: ' + $.$(item).data("data").id);
			vals.push({name: name, value: $.$(item).data("data").id});
		});
		vals.push({name: name + "@Delete", value:"true"});
		vals.push({name: name + "@TypeHint", value:"String[]"});
		return vals;
	}, 
	getPlainValue: function($el, name, $){
		return $el.data('value');
	}
}

////////////////////////
function pathToId(tagPath){
	var tagIdPieces = tagPath.split('/').splice(3);
	return tagIdPieces.shift() + ':' + tagIdPieces.join('/');
}

////////////////////////
function tagIdToTitle(tagId, finalSegment){
	var slashed = tagId.split(":").pop();
	var parts = slashed.split("/");
	var fixed=[];
	parts.forEach(function(val){
		val=val.replace(/\-|\_/g, " "); 
		val=val.replace(/ [a-z]|^[a-z]/g, function(v){return v.toUpperCase();});
		fixed.push(val);
	});
	fixed.push('<span style="color:black">' + ( finalSegment ? finalSegment : fixed.pop() ) + "</span>");
	return fixed.join(" &nbsp;/&nbsp; "); 
}