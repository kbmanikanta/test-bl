

module.exports={
		init: function($el){
			var txt = $el.find("textarea");
			var simplemde = new SimpleMDE({ element: txt[0] });
			$el.data("simplemde", simplemde);
		},

		getValue: function($el, name){
			var simplemde = $el.data("simplemde");
			var val = simplemde.value().replace(/\r/g,"");
			return [{name: name, value: val}];
		}
}