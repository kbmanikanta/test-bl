

module.exports={
		init: function($el, $){

			$el.find(".richedit").tinymce({
				plugins:"code fullscreen wordcount paste table link autoresize",
				menubar: false,
				toolbar: $.widget.toolbar || "bold italic styleselect removeformat | table link | alignleft aligncenter alignright | bullist numlist outdent indent | undo redo | code fullscreen | pastetext",
				statusbar: true,
				paste_text_use_dialog: true,
				relative_urls: false,
				autoresize_bottom_margin: 20,
				autoresize_max_height: 400,
				setup : function(ed)
				{
				    ed.on('init', function() 
				    {
						var doc= this.getDoc()
						var sheet = doc.createElement('style')
						sheet.innerHTML = "body, table td {font-size: 14px !important; background-color:#eee;}\n table td{background-color:#f6f6f6;}";
						doc.body.appendChild(sheet);
				    });

				  //   ed.on("LoadContent", function(){
						// // console.log("MCE:", $el.find(".bl-mce"));
						// $el.find(".disabled-overlay").css({height: $el.find(".bl-mce").outerHeight()});
				  //   });
				}, 
				readonly: $.widget.readOnly ? 1 : 0,
				block_formats: $.widget.blockFormats
			});
		},

		getValue: function($el, name){
			name = name || $el.data("name");
			var re=$el.find(".richedit");
			var value=re.val();
			return [{name: name, value: re.val()}];
		},

		enable: function($el, enableWidget, utils){
			var $mce=$el.find(".bl-mce");
			$mce.find(".disabled-overlay").remove();

			if(!enableWidget){
				var $overlay=utils.$("<div class='disabled-overlay' style='z-index:4400;cursor:not-allowed;opacity:0.6;background-color:#fff;width:0;height:0;position:absolute;left:0;top:0'></div>")
				var offset=$mce.offset();
				var styles={width:$mce.outerWidth(), height:$mce.outerHeight(), top:"20px", left:"30px", display: "block"};
	         $overlay.css(styles);
	         $mce.append($overlay);
	         var fixCount=0;

	         var fixOverlayHeight = function(){  // dumb hack.  but apparently no "onReady" event is available from tinymce.
	         	$overlay.css({height:$mce.outerHeight()});
	         	if(fixCount<2){
	         		setTimeout(fixOverlayHeight,1000)
	         		fixCount++;
	         	}
	         }
	         setTimeout(fixOverlayHeight,500) 
			}
		}
}









