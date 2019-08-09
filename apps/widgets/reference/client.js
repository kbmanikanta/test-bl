

module.exports={
	init: function($el, utils){
		var dialogBuilder=require("../../../public/js/modules/dialog-builder");
		var tree=require("../../../public/js/modules/tree.js")(utils.$, window, {languageSupport: true, hasPageListingCapability: window.BL.config.hasPageListingCapability});

		var _=utils._;
		var $ = utils.$; 
		var root = utils.widget.root;
		if(_.isFunction(root)){
			root = root($el, utils);
		}
		var initialPath = utils.widget.initialPath;
		if(_.isFunction(initialPath)) {
			initialPath = initialPath($el, utils);
		}

		if(!root){
			//get the default root
			var moduleRootKey = (_.get($,"page.resourceType") || "").split("/").slice(0,2).join(".") + ".defaultReferenceRoot";
			var defaultReferenceKey = window.BL.config.defaultModule + ".defaultReferenceRoot";
			root = _.get(window.BL.modules, moduleRootKey) || _.get(window.BL.modules,  defaultReferenceKey) ||  "/content/" + window.BL.config.defaultModule.split('.')[0] + '/collections';
		}

		var $targetInput=$el.find("input");

		$targetInput.on("click", function(ev){

			initialPath = $targetInput.val() || initialPath ||  root;

			//open two panel dialog
			var $dialog = dialogBuilder({
				fullscreen: true,
				title:"Reference"
			});
			var $dialogBody=$dialog.find(".modal-content");


			var titleBar = $dialog.titleBar("Reference");
			var body=`
				<div class="reference-dialog row">
					<div class="col s6 ">
						<span style="font-style: italic;">Root: ${root}</span>
						<div class="tree"></div>
					</div>
					<div class="col s6 ">
						<span>Fields</span>
						<div class="dialog"></div>
					</div>	
				</div>
			`;
			$dialogBody.html(titleBar + body);
			$dialog.initClickEvents();

		


			var $saveButton = $dialog.find('.bl-save-button'); 
			$saveButton.text('Apply');
			var $treePanel = $dialog.find('.tree');
			var $dialogPanel = $dialog.find('.dialog');
			var $modalFooter = $dialog.find('.modal-footer');
			var $valueSpan = $('<p>', {text: $targetInput.val() || '', css: {
				'max-width': '700px',
				'float': 'left',
				'overflow': 'scroll'
			}});

			//force the hieght of the 2 columns
			$treePanel.css({height: $dialogBody.height() - 54});
			$dialogPanel.css({height: $dialogBody.height() - 54});

			$modalFooter.prepend($valueSpan);

			$saveButton.click(function(){
				$targetInput.val($valueSpan.text());
				$targetInput.focus();

				if(utils.widget.onChange){
					utils.widget.onChange($valueSpan.text());
				}
				$dialog.closeModal();
			});


			//////////////////////////////////
			var onTreeClickFactory = function(which, cb){
				return function(event, data){
					console.log('click handler', {event, data});
					var slingPath = data.node.key;
					var savedPath = which === 'dblclick' ? _.get(data, ['node', 'data', 'indexable'], slingPath) : slingPath; 
					
					
					$valueSpan.text(savedPath);
					
					var uri= window.BL.config.appsMount + "blacklight/edit/dialogs/reference/content?slingPath=" + slingPath;

					$.ajax({url:uri, 
						dataType:"html"})
					.success(function(data){
						$dialogPanel.html($(data));
						var allRows = $dialogPanel.find('tr').not('.fieldset'); 
						allRows.on('click', function(){
							allRows.removeClass('selected');
							$(this).addClass('selected');
							var fieldName = $(this).data('name');
							var insertedJcrContent = savedPath.indexOf('/jcr:content') < 0 ? '/jcr:content' : ''; 
							
							$valueSpan.text(savedPath + insertedJcrContent + '/' + fieldName);
						});

						if(cb){
							cb(allRows);
						}
					}); 
				}
			};

			var initialPathLoaded = false; 
			//////////////////////////////////////////
			tree.init($treePanel, root, function(val){
				var title;
				if(val && val["jcr:content"] && val["jcr:content"]["jcr:title"]){
					title=val["jcr:content"]["jcr:title"];
				}

				var jcrType = val['jcr:primaryType']; 


				return {title:title, icon:jcrType && jcrType === 'cq:Page' ? 'fa fa-file-o' : 'fa fa-folder-o'};
			},
			{
				activate: function(event, data){
					//we only care about this the first time
					if(!initialPathLoaded){
						initialPathLoaded = true; 

						//do we need to select a field?
						var loadedPath = data.node.key;
						if(loadedPath && loadedPath.length < initialPath.length && loadedPath.indexOf('jcr:content') > -1){
							var fieldPath = initialPath.substring(loadedPath.length + 1);
							if(fieldPath){
								onTreeClickFactory('click', function(allRows){
									allRows.filter("[data-name='" + fieldPath + "']").click();
								})(event, data);
							}
						} else if(loadedPath) {
							onTreeClickFactory('click')(event, data);
						}
					}
				},
				click:onTreeClickFactory('click'),
				dblclick: onTreeClickFactory('dblclick'),
				loadChildren: function(event,data){
					tree.openPath($treePanel, initialPath);
					//get the tree value
					//var currentNode = $treePanel.fancytree("getNode");
					//console.log('currentNode', currentNode);
					$treePanel.fancytree("option","loadChildren", function(){});
				}, 
				loadNodes: function(baseUrl, typeProcessor){
					var blProxy=window.BL.config.slingProxyPrefix;
					baseUrl = baseUrl.replace(/\/$/,"");
					var def= new $.Deferred();
					
					if(baseUrl.indexOf('/jcr:content') > 1){
						var url = window.BL.config.appsMount + "blacklight/edit/dialogs/reference/children?slingPath=" + baseUrl;
						$.ajax({url: url, dataType:"json"}).always(function(data){
							var results=[];
							$.each(data, function(idx,item){
								results.push({title:item.title, key:item.path, lazy:true, icon: 'fa fa-square-o', indexable: item.indexable}); //, icon:"fa fa-file-o"});
							});
							def.resolve(results);
						});
					}else{
						var url = blProxy + baseUrl + ".1.json";
						$.ajax({url: url, dataType:"json"}).always(function(data){
							var results=[];
							var jcrContent = data['jcr:content']; 
							if( jcrContent && jcrContent['jcr:primaryType'] === 'cq:PageContent'){
								results.push({title:' [page content]', key:baseUrl + '/jcr:content', lazy:true, icon: 'fa fa-cog' }); //, icon:"fa fa-file-o"});
							}
							$.each(data, function(key,val){
			
								if(!key.match(/^\:?(jcr|sling|cq|fsc|rep|oak)\:/)){
									var typeInfo = typeProcessor(val, true, key);
									results.push({title:typeInfo.title || key, key:baseUrl + "/" + key, lazy:true, icon: typeInfo.icon}); //, icon:"fa fa-file-o"});
								}
							});
							def.resolve(results);
						});
					}
		   
				   return def.promise();
				}
			});
		});

	}
}