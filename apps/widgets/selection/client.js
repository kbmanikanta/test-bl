

module.exports={
	init:function($el, $){
		var $sel = $el.find("select");
		var savedValue = $el.data("saved-value");
		var stringifiedSavedValue; 
		//if there is a saved value and it's not an array, force it into an array
		if((savedValue || savedValue === 0) && !$.$.isArray(savedValue)){
			savedValue = [savedValue];
		}

		if(savedValue){
			stringifiedSavedValue = $.$.map(savedValue,function(val){return val.toString();});
		}


		var options=$.widget.options;

		if($.widget.readonly && $.widget.type === 'select'){
			options = savedValue;
		}

		if(options){
			if(typeof(options)==="function"){
				var errCheck;
				if(options.length>1){
					errCheck = options($, setOptions);
				}
				if(errCheck || options.length<2){throw new Error("Your 'selection' widget options function must accept a callback as a 2nd parameter, and return the options that way");}
			}else{
				setOptions(null, options);
			}


			function setOptions(err, options){
				if(err){
					var msg="Problem building 'selection' widget options.\n";
					if(err instanceof Error){err.message=msg+err.message; throw(err)}
					else{throw new Error(msg + JSON.stringify(err))}
				}
				

				
				var selected;

				var html=["<option value='' disabled selected style='color:#911'>No selection</option>"];

				function handleSelectOption(key,cur){
					if(typeof(cur)==="string"){cur={title:cur, value: cur};}
					if(cur.isGroup && cur.options){
						html.push('<optgroup label="' + cur.title + '">');
						$.$.each(cur.options, handleSelectOption);
						html.push('</optgroup>');
					}else{
						selected = (stringifiedSavedValue && ($.$.inArray(cur.value,stringifiedSavedValue) > -1) ) || (!savedValue && cur.value == $.widget.defaultValue);
						html.push("<option value='" + $._.escape(cur.value) + "'" +  (selected?" selected":"")   + (cur.disabled ? ' disabled ' : '')+  ">" + (cur.title||cur.value) + "</option>");
					}
				}
				$.$.each(options,handleSelectOption);

				$sel.html(html.join(""));
				
				$sel.material_select();
			}

		}

	}, 
	enable: function($el,enableWidget, $){
		$.widget.methods.getInput().prop("disabled", !enableWidget);
		$el.find('.select-dropdown').dropdown({'hover': false, 'closeOnClick': false});
	},
	getPlainValue: function($el, name, $){
		name = name || $el.data("name");
		var sv=$el.data("saved-value");
		return sv ? [{name: name, value: sv}] : $.widget.methods.getInput().serializeArray();
	}
}