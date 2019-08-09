

module.exports={
	init:function($el, $){
		var valueFn=$.widget.value;
		if(valueFn){
			if(typeof(valueFn)==="function"){
				var errCheck;
				if(valueFn.length>1){

					errCheck = valueFn($, $el.find("input").val(), setValue);
				}
				if(errCheck || valueFn.length<2){throw new Error("Your 'hidden' widget 'value' function must accept a callback as a 2nd parameter, and return the value that way");}
			}else{
				setValue(null, valueFn);
			}

			function setValue(err, value){
				if(err){
					var msg="Problem building 'hidden' widget value.\n";
					if(err instanceof Error){err.message=msg+err.message; throw(err)}
					else{throw new Error(msg + JSON.stringify(err))}
				}
				var $hidden = $el.find("input");
				if(value!==null && typeof(value)!=="undefined"){
					$hidden.val(value);
				}
			}

		}

	}
}