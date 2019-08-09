'use strict';


module.exports = function($el, options){
	options = options || {};
	var rootPath = options.root || $el.data('root') || '/';
	var filters = options.filters || $el.data('filters');

	if(filters === 'pages'){
		filters = ["sling:OrderedFolder","cq:Page"];
	}else if(filters === 'assets'){
		filters = ["sling:OrderedFolder","dam:Asset"];
	}
	if(filters && !$.isArray(filters)){filters=[filters];}
	var advancedFilter = $el.data('advanced-filters');
	// switch off the browsers autocomplete function (!)
	$el.attr('autocomplete', 'off');

	///////////////////
	var parseInput = function(input){
		var lastSlash = input.lastIndexOf('/');
		return {
			pathRoot: input[0] === '/'&& lastSlash > 0 ? input.substring(0, lastSlash) : '/',
			query: input[0] === '/' && input.length > 1 ? input.substring(lastSlash + 1): ''
		}
	}

	//////////////////
	var addSlash = function(path){
		return path.slice(-1) === '/' ? path : path + '/';
	}

	var parsedInput;

	var pathSuggestions = new Bloodhound({
		datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		remote: {
			url: '/bin/typeahead.json?query={{query}}',
			prepare: function(query, settings){
				if(advancedFilter){
					settings.url = settings.url.replace('{{query}}', encodeURIComponent(query));
					if(filters){
						settings.url += '&filters=' + encodeURIComponent($.isArray(filters) ? filters.join(',') : filters);
					}
				}else{
					parsedInput = parseInput(query);
					var proxyPrefix =  !$("body").data("proxied") ? window.BL.config.appsMount + "blacklight/edit/proxy" : '';
					settings.url = proxyPrefix + parsedInput.pathRoot + '.1.json';
				}

				return settings;
			},
			transform: function(response){
				var results = [];
				if(advancedFilter){
					if(rootPath){
						$.each(response, function(idx, item){
							if(item.indexOf(rootPath) === 0 || rootPath.indexOf(item) === 0){
								results.push(item);
							}
						});
					}else{
						results = response;
					}
				}else{
					$.each(response, function(key, obj){
						if($.isPlainObject(obj) && key.indexOf(parsedInput.query) === 0){
							var path = addSlash(parsedInput.pathRoot) + key;
							var valid = true;
							if(rootPath && path.indexOf(rootPath) !== 0 && rootPath.indexOf(path) !== 0){
								valid = false
							}

							if(valid && filters){
								valid = filters.includes(obj['jcr:primaryType']);
							}

							if(valid){
								results.push(path);
							}
						}
					});
				}

				return results;
			}
		}
	});

	//check if we've got a label before or after
	var moveFunc;
	var label = $el.prev('label');
	if(label.length){
		moveFunc = function(){label.insertBefore($el)}
	}else{
		label = $el.next('label');
		if(label.length){
			moveFunc = function(){label.insertAfter($el)}
		}
	}

	// add typeahead function to the input field
	$el.typeahead({
		minLength: 1,
		highlight: true,
		classNames: {
			menu: 'tt-menu autocomplete-content dropdown-content'
		}
	},{limit: 100, source: pathSuggestions});

	if(moveFunc){
		moveFunc();
	}
};