/* globals window, $ */
(function(){
	var longTypes = ['x', 'y', 'width', 'height'];
	function applyTypes(data){
		$.each(longTypes, function(idx, typedName){
			if(data[typedName]){
				data[typedName + '@TypeHint'] = 'Long';
			}
		});
	}
	function internalCreate(path, nameHint, pathSegment, data, cb){
		data = data || {};
		data[':nameHint'] = nameHint;
		applyTypes(data);
		$.post(window.BL.proxyPrefix + path + pathSegment, data)
				.always(function(data, status, request){
					if(cb){
						if(status === 'error'){
							cb('Failed to create content at ' + path);
						}else{
							var newPath = request.getResponseHeader('location');
							if(newPath){
								cb('', newPath.replace(/\/_([a-z]+)_(.*?)\//g, '/$1:$2/'));
							}else{
								cb('The path of the new node was not returned in the response header');
							}
						}
					}
				});
	}

	/* sling operation functions */
	window.BL.annotations = {
		create: function(componentPath, data, cb){
			internalCreate(componentPath, 'annotation', '/bl:annotations/', data, cb);
		},
		delete: function(slingPath, cb){
			$.ajax({
          url: window.BL.proxyPrefix + slingPath,
          type: 'DELETE'
      }).always(function(res, status){if(cb){cb(status === 'error' ? 'There was an error deleting ' + slingPath : '');}});
		},
		modify: function(path, modifications, cb){
			applyTypes(modifications);
			$.post(window.BL.proxyPrefix + path, modifications)
			.always(function(res, stats){if(cb){cb(status === 'error' ? 'Error modifying path' + path : '');}});
		},
		addEntry: function(annotationPath, data, cb){
			internalCreate(annotationPath, 'entry', '/entries/', data, cb);
		},
		addDrawing: function(annotationPath, data, cb){
			internalCreate(annotationPath, 'drawing', '/drawings/', data, cb);
		}
	}

	/////////////////////////////////////
	window.BL.annotations.getAnnotations = function(cb){
		var pagePath = window.document.location.pathname;
		pagePath = pagePath.indexOf('.') > -1 ? pagePath.substring(0, pagePath.indexOf('.')) : pagePath;

		$.get(window.BL.appsMount + 'blacklight/edit/annotations.json', {path: pagePath})
			.done(function(data){
				cb(data);
			})
			.fail(function(){console.log('failed fetching annotations'); cb(); });
	}

	/////////////////////////////////////
	window.BL.annotations.renderAnnotations = function(annotations){

		if(annotations && annotations.length){
			$.each(annotations, function(idx, annotationList){
				$.each(annotationList.annotations, function(key, annotation){
					if(annotation.x && annotation.y){
						var $annotationsContainer = $('<div></div>', {css: {position:'absolute', top: 0, left: 0}});
						var annotationPath = annotationList.componentPath + '/bl:annotations/' + key;
						window.BL.annotations.renderAnnotation($annotationsContainer, annotation, annotationPath);
						$('body').append($annotationsContainer);
					}
				});
			});
		}
	}

	/////////////////////////////////////
	window.BL.annotations.renderAnnotation = function($container, annotation, annotationPath){
		var $annotation = $(
		'<div class="bl-annotation bl-preview draggable">' +
			'<div class="resizable">' +
				'<a class="btn-floating hover-only ghosty delete-annotation">' +
					'<i class="material-icons red darken-2">delete</i>' +
				'</a>' +
				'<div class="text">' +
					'<table></table>' +
				'</div>' +
				'<div class="toolbar-item"><a class="btn-floating ghosty add-entry">' +
					'<i class="material-icons green">add</i>' +
					'</a></div>' +
				'<div class="toolbar-item"><a class="btn-floating ghosty add-drawing">' +
					'<i class="material-icons blue">vignette</i>' +
					'</a></div>' +
				'<div class="toolbar-item"><input type="color" class="btn-floating ghosty change-color" value="'+annotation.color+'"/></div>' +
			'</div>' +
		'</div>'
		).css({
			top:annotation.y,
			left: annotation.x,
			'background-color': annotation.color,
			position: 'absolute'
		})
		.draggable({
			stop: function( event, ui ) {
				window.BL.annotations.modify(annotationPath, {x: ui.position.left, y: ui.position.top});
			}
		});

		$annotation.find('.resizable').css({
		width: annotation.width,
		height: annotation.height || 'auto',
		'min-height': 100
		})
		.resizable({
			handles: 'se',
			minHeight: 100,
			minWidth: 150,
			classes: {
			"ui-resizable-se": "ui-icon ui-icon-gripsmall-diagonal-se ghosty"
			},
			stop: function( event, ui ) {
				window.BL.annotations.modify(annotationPath, {width: ui.size.width, height: ui.size.height});
			}
		});

		$annotation.find('.delete-annotation').click(function(e){
			if (window.confirm('Are you sure you want to delete this annotation and associated drawings?')) {
				window.BL.annotations.delete(annotationPath);
				$container.remove();
      }
			e.preventDefault();
		});
		$annotation.find('.add-entry').click(function(e){
			var $addButton = $(this);

			if(!$addButton.hasClass('disabled')){
				$addButton.addClass('disabled');
				var $textEntry = $('<tr><th><div fulltext="' + window.BL.author + '">' + window.BL.author + '</div></th><td><textarea></textarea></td></tr>');
				$annotation.find('table').append($textEntry);
				$textEntry.find('textarea').keyup(function(e) {
					var $textArea = $(this);
					var code = e.keyCode ? e.keyCode : e.which;
					if (code === 13 && $textArea.val()) {  // Enter keycode
						//save the entry
						var entryData = {author: window.BL.author, message: $textArea.val()};
						window.BL.annotations.addEntry(annotationPath, entryData , function(err){
							if(!err){
								window.BL.annotations.renderEntry($annotation, entryData);
							}else{
								window.alert('Failed to save annotation entry.');
							}
						});
						//remove the text field
						$textEntry.remove();
						$addButton.removeClass('disabled');
					}
				}).focus();
			}
			e.preventDefault();
		});
		$annotation.find('.change-color').change(function(e){
			var newColor = $(this).val();
			$annotation.css({'background-color': newColor});
			$container.find('.drawing').css({'border-color':newColor});
			window.BL.annotations.modify(annotationPath, {color: newColor});
			annotation.color = newColor;
		});
		$annotation.find('.add-drawing').click(function(e){
			var drawingData = {
				shape: 'rectangle',
				x: e.pageX,
				y: e.pageY + 40,
				width: 150,
				height: 100
			};
			window.BL.annotations.addDrawing(annotationPath, drawingData, function(err, newPath){
				if(err){console.log('err')}else{
					window.BL.annotations.renderDrawing($container, drawingData, newPath, annotation);
				}
			});
			e.preventDefault();
		});

		if(annotation.entries){
			$.each(annotation.entries, function(key, entry){
				if(entry.author && entry.message){
					window.BL.annotations.renderEntry($annotation, entry);
				}
			});
		}
		$container.append($annotation);

		if(annotation.drawings){
			$.each(annotation.drawings, function(key, drawing){
				if(drawing.shape){
					var drawingPath = annotationPath + '/drawings/' + key;
					window.BL.annotations.renderDrawing($container, drawing, drawingPath, annotation);
				}
			});
		}
	};

	/////////////////////////////////////
	window.BL.annotations.renderDrawing = function($container, drawing, drawingPath, annotation){
		var $drawing = $(
		'<div class="bl-annotation bl-preview drawing draggable ' + drawing.shape + '">' +
			'<div class="resizable">' +
				'<a class="btn-floating hover-only ghosty change-shape">' +
					'<i class="material-icons blue">vignette</i>' +
					'</a>' +
				'<a class="btn-floating hover-only ghosty delete-annotation">' +
					'<i class="material-icons red darken-2">delete</i>' +
				'</a>' +
			'</div>' +
		'</div>'
		)
		.css({
			top:drawing.y,
			left: drawing.x,
			position: 'absolute',
			'border-color': annotation.color
		})
		.draggable({
			stop: function( event, ui ) {
				window.BL.annotations.modify(drawingPath, {x: ui.position.left, y: ui.position.top});
			}
		});

		$drawing.find('.resizable').css({
			width: drawing.width,
			height: drawing.height || 'auto',
			'min-height': 50
		})
		.resizable({
			handles: 'se',
			minHeight: 50,
			minWidth: 50,
			classes: {
				"ui-resizable-se": "ui-icon ui-icon-gripsmall-diagonal-se ghosty"
			},
			stop: function( event, ui ) {
				window.BL.annotations.modify(drawingPath, {width: ui.size.width, height: ui.size.height});
			}
		});

		$drawing.find('.delete-annotation').click(function(e){
			if (window.confirm('Are you sure you want to delete this drawing?')) {
				window.BL.annotations.delete(drawingPath);
				$drawing.remove();
			}
			e.preventDefault();
		});
		$drawing.find('.change-shape').click(function(e){
			var newShape = $drawing.hasClass('circle') ? 'rectangle' : 'circle';
			var oldShape = $drawing.hasClass('circle') ? 'circle' : 'rectangle';
			$drawing.removeClass(oldShape).addClass(newShape);
			window.BL.annotations.modify(drawingPath, {shape: newShape});
			e.preventDefault();
		});

		$container.append($drawing);
	}

	/////////////////////////////////////
	window.BL.annotations.renderEntry = function($annotation, entry){
		$annotation.find('table').append('<tr><th><div fulltext="' + entry.author + '">' + entry.author + '</div></th><td>' + entry.message + '</td></tr>');
	}
	/////////////////////////////////////
	window.BL.annotations.showAnnotations = function(){
		$('.bl-annotation').show();
	}

	/////////////////////////////////////
	window.BL.annotations.hideAnnotations = function(){
		$('.bl-annotation').hide();
	}
})();