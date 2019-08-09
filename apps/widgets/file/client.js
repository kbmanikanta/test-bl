

module.exports={
		init: function($el){

		},

		getValue: function($el, name){
			name = name || $el.data("name");
			var input=$el.find("input")[0];
			var file=(input ? input.files[0] : "");
			if(!file){file="";}
			console.log("FILE IS:", file);
			return [{name: name, value: file}];
		}
};

