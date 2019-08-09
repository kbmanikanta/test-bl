
module.exports={
	init: function($el, $){
		var dateFormat = $.widget.format || "yyyy/mm/dd";
		var displayFormat = $.widget.displayFormat || dateFormat;
		var preprocess = $.widget.preprocess || "";
		var postprocess = $.widget.postprocess || "";

		if (preprocess && _.isFunction(preprocess)) {
			preprocess($el, null);
		}

		var datepicker=$el.find("input").pickadate({
			selectMonths: true,
			selectYears: 15,
			format: displayFormat,
			container: "#bl-primary-datepicker"
		});
		$el.data("datepicker", datepicker.pickadate('picker'));
		$el.data('format', dateFormat);
		$el.data('postprocess', postprocess);

	},
	getValue: function($el, name){
		var datepicker=$el.data("datepicker");
		var format = $el.data('format');
		var postprocess = $el.data('postprocess');

		if (postprocess && _.isFunction(postprocess)) {
			postprocess($el, datepicker);
		}

		var value = _.isFunction(format) ? format(datepicker) : datepicker.get("select", format);
		return[{name:name, value:value}];

	}
}

