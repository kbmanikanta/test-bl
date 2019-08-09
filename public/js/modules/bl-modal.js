/* globals window, jQuery */

(function($) {

  $.ajaxSetup({ cache: false });

  var _stack = 0,
  _lastID = 0,
  _generateID = function() {
    _lastID++;
    return 'materialize-bl-overlay-' + _lastID;
  };

  $.fn.extend({
    openModal: function(options) {
      options=options||{};
      var $modal = $(this);
      if(typeof(options.beforeOpen) === "function" && (options.beforeOpen($modal, options)===false)){
        return;
      }

      $('body').css('overflow', 'hidden');

      var defaults = {
        opacity: 0.5,
        in_duration: 350,
        out_duration: 250,
        ready: undefined,
        complete: undefined,
        dismissible: true,
        starting_top: '4%',
        top: '7%'
      },
      overlayID = _generateID(),
      $overlay = $('<div class="bl-overlay"></div>'),
      lStack = (++_stack);





      // Store a reference of the overlay
      $overlay.attr('id', overlayID).css('z-index', 1000 + lStack * 2);
      $modal.data('overlay-id', overlayID).css('z-index', 1000 + lStack * 2 + 1);

      // Override defaults
      options = $.extend(defaults, options);

      if(!options.noOverlay)
      	$("body").append($overlay);


      if (options.dismissible) {
        $overlay.click(function() {
          $modal.closeModal(options);
        });
        // Return on ESC
        $(window.document).on('keyup.blModal' + overlayID, function(e) {
          if (e.keyCode === 27 && lStack===_stack) {   // ESC key
            $modal.closeModal(options);
          }
        });
      }

      $modal.find(".modal-close").on('click.close', function(e) {
        $modal.closeModal(options);
      });

      $overlay.css({ display : "block", opacity : 0 });

      $modal.css({
        display : "block",
        opacity: 0
      });

      $overlay.velocity({opacity: options.opacity}, {duration: options.in_duration, queue: false, ease: "easeOutCubic"});
      $modal.data('associated-overlay', $overlay[0]);

      // Define Bottom Sheet animation
      if ($modal.hasClass('bottom-sheet')) {
        $modal.velocity({bottom: "0", opacity: 1}, {
          duration: options.in_duration,
          queue: false,
          ease: "easeOutCubic",
          // Handle modal ready callback
          complete: function() {
            if (typeof(options.ready) === "function") {
              options.ready($modal);
            }
          }
        });
      }
      else {
        $.Velocity.hook($modal, "scaleX", 0.7);
        $modal.css({ top: options.starting_top });
        $modal.velocity({top: options.top, opacity: 1, scaleX: '1'}, {
          duration: options.in_duration,
          queue: false,
          ease: "easeOutCubic",
          // Handle modal ready callback
          complete: function() {
            if (typeof(options.ready) === "function") {
              options.ready($modal);
            }
          }
        });
      }


    }
  });

  $.fn.extend({
    closeModal: function(options) {
      var defaults = {
        out_duration: 250,
        complete: undefined,
        beforeClose: undefined
      },
      $modal = $(this),
      overlayID = $modal.data('overlay-id'),
      $overlay = $('#' + overlayID);
      var isDynamic = $modal.hasClass("dynamic-modal"); // This modal's HTML is safe to delete on close.


      options = $.extend(defaults, options);

      if(typeof(options.beforeClose) === "function"){
      	if(options.beforeClose($modal)===false){
      		return;
      	}
      }

      // Disable scrolling
      $('body').css('overflow', '');

      $modal.find('.modal-close').off('click.close');
      $(window.document).off('keyup.blModal' + overlayID);

      $overlay.velocity( { opacity: 0}, {duration: options.out_duration, queue: false, ease: "easeOutQuart"});


      // Define Bottom Sheet animation
      if ($modal.hasClass('bottom-sheet')) {
        $modal.velocity({bottom: "-100%", opacity: 0}, {
          duration: options.out_duration,
          queue: false,
          ease: "easeOutCubic",
          // Handle modal ready callback
          complete: function() {
            $overlay.css({display:"none"});

            // Call complete callback
            if (typeof(options.complete) === "function") {
              options.complete();
            }
            $overlay.remove();
            
            if(isDynamic){
              $modal.remove();
            }
            _stack--;
          }
        });
      }
      else {
        $modal.velocity(
          { top: options.starting_top, opacity: 0, scaleX: 0.7}, {
          duration: options.out_duration,
          complete:
            function() {
              var $this = $(this);
              $this.css('display', 'none');
              // Call complete callback
              if (typeof(options.complete) === "function") {
                options.complete();
              }
              $overlay.remove();
              if(isDynamic){
                $this.remove();
              }
              _stack--;
            }
          }
        );
      }
    }
  });

  $.fn.extend({
    modalButton: function(option) {
      return this.each(function() {

        var defaults = {
          starting_top: '4%'
        },
        // Override defaults
        options = $.extend(defaults, option);

        // Close Handlers
        $(this).click(function(e) {
          options.starting_top = ($(this).offset().top - $(window).scrollTop()) /1.15;
          var modal_id = $(this).attr("href") || '#' + $(this).data('target');
          var $modal = $(modal_id)
    		  e.preventDefault();
		  
		      if(typeof(options.beforeOpen) === "function" && (options.beforeOpen($modal, $(this))===false)){
			      return;
		      }else{
            var openOptions=$.extend({}, options);
            openOptions.beforeOpen=null;  /// Remove any "button-oriented" beforeOpen, so it won't get run by openModal.  Messy.
            $modal.openModal(openOptions);
          }
        }); // done set on click
      }); // done return
    }
  });
})(jQuery);



