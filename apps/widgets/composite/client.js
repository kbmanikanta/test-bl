

module.exports={
	init: function($el,$){
		var jq=$.$;

		Sortable.create($el.find("ul.collapsible").get(0), {
			handle: '.drag-handle',
			animation: 150
		});	

		$el.find(".drag-handle").click(function(e){
			e.preventDefault();
			e.stopPropagation();
			// here is where you would toggle some sorting controls for all rows.
		});

	    $el.find('.collapsible').collapsible({
	      accordion : false 
	    });

		$el.find(".delete-button").click(function(){
			var $li = jq(this).closest("li");
			if($li.siblings().length>0){
				$li.remove();
			}else{
				$li.find("input").val("");
			}
		});

		$el.find(".add-button").click(function(){
			var $ul=jq(this).siblings("ul");
			var $clone = $ul.find("li").first().clone(true);
			$clone.appendTo($ul);
			$clone.find("input").val("");
		});
	}
}