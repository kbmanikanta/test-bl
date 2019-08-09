/* globals window */

module.exports={
	init: function($el, $){

		var tree=require("../../../public/js/modules/tree.js")($.$, window, {languageSupport: true, hasPageListingCapability: window.BL.config.hasPageListingCapability});

		var pathWidget;
		if(!$.widget.disableTypeAhead){
			pathWidget = require("../../../public/js/modules/path-widget.js");
		}

		var $targetInput=$el.find("input");
		var $treeOpener = $el.find('.resource-tree');
		var $dialog=$.$("#bl-resource-selector");
		var $tempSelected = $dialog.find('span#temp-selected');
		var $accept = $dialog.find('#accept-search');
		var $resourceTreeSelector = $dialog.find('#resource-tree-selector');
		var _=$._;
		var root = $.widget.root || "/content";

		if(_.isFunction(root)){
			root = root($el, $);
		}

//		if(pathWidget){
//			pathWidget($targetInput, {root: root, filters: $.widget.typeAheadFilters ||  $.widget.typeAheadFilterBy || 'pages'});
//		}

		//handle accept click
		$accept.click(function(){
			//set the input val to the temp value
			//there's only one accept button on page, so it 
			//needs to be told who it's updating
			if($accept.data('inputTarget')){
				$accept.data('inputTarget').val($tempSelected.text());
				$accept.data('inputTarget').focus();
			}
			//close the tree view
			$dialog.closeModal();
		});

		$targetInput.select();


		$targetInput.on("dblclick", ()=>{
			$accept.data('inputTarget', $targetInput); 
			$tempSelected.text($targetInput.val());
			$dialog.css({height:"75%", width:"90%", maxWidth:"900px"});
			$dialog.openModal({top:"14%"});

			var currentPath = $targetInput.val() || root;
			var initialPath = currentPath || root;


			//////////////////////////////////
			var onTreeClick = function(event, data){
				var currentPath = data.node.key;

				if(event && event.originalEvent){
					var clickType = $.$.ui.fancytree.getEventTargetType(event.originalEvent);
					if(clickType === "expander"){return;}
				}

				$tempSelected.text(currentPath);

			};

			//destroy any existing tree that may already be there
			if($resourceTreeSelector.data('initialized')){
				$resourceTreeSelector.fancytree('destroy');
				$resourceTreeSelector.data('initialized', false);
			}

			//////////////////////////////////////////
			tree.init($resourceTreeSelector, root, $.widget.type || 'assets', {
				activate: onTreeClick,
				click:onTreeClick,
				dblclick: onTreeClick,
				loadChildren: function(event,data){
					$resourceTreeSelector.data('initialized', true);
					tree.openPath($resourceTreeSelector, initialPath);
					$resourceTreeSelector.fancytree("option","loadChildren", function(){});
				}
			});

		});

		//handle tree opener click
		$treeOpener.click(()=>{
			$targetInput.trigger("dblclick");
		});
	},

	getValue : function($el, name){
		return [{name : name, value : _.trim($el.find('input').val())}];
	}
}


