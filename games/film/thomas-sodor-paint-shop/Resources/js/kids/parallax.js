/* ==========================================================================
   Skrollr initialization for parallax effect, stopped for mobile
   ========================================================================== */
$(function() {
  var skrollr_instance = null;

  // enable skrollr in all pages
  var SKROLLR_ENABLED = true;

  // disable skrollr in engines landing and in drawing tool
  if ($('#engines-list').length || $('#drawing-tool').length) {
    SKROLLR_ENABLED = false;
  }

  function skrollrInit() {
    if (!SKROLLR_ENABLED) {
      return;
    }

    if (skrollr_instance){
      return;
    }

    skrollr_instance = skrollr.init({
      easing: 'sqrt',
      smoothScrolling: false,
      forceHeight: false
    });
    $(window).trigger('skrollr-init');
  }

  function skrollrDestroy() {
    if (!skrollr_instance) {
      return;
    }
    skrollr_instance.destroy();
    skrollr_instance = null;
    $(window).trigger('skrollr-destroy');
  }
  
  function skrollrSetup() {
    if (!/Android|iPad|iPod|iPhone/i.test(navigator.userAgent)){
      skrollrInit();
    }
    else {
      skrollrDestroy();
    }
  }

  window.skrollrRefresh = function() {
    if (skrollr_instance) {
      skrollr_instance.refresh();
      $(window).trigger('skrollr-refresh');
    }
  };

  $(window).on('load responsive-elements-updated', window.skrollrRefresh);
  $(window).resize(skrollrSetup);
  
  // function used to scroll the page to a certain element
  window.scrollPageTo = function(to, callback) {
    var target_top = null;

    if (typeof to === 'number') {
      target_top = to;
    }
    else {
      to = $(to);
      if (to.length === 0) {
        return;
      }

      if (!skrollr_instance) {
        target_top = to.offset().top;
      }
      else {
        if (to.parents('body').length) {
          target_top = skrollr_instance.relativeToAbsolute(to.get(0), 'top', 'top');
        }
        else {
          target_top = 0;
        }
      }
    }

    if (typeof callback !== 'function') {
      callback = function() {};
    }

    if (!skrollr_instance) {
      $('html, body').animate({scrollTop: target_top}, 500, callback);
    }
    else {
      skrollr_instance.animateTo(target_top, {duration: 500, done: callback});
    }
    return;
  };

  window.getScrollTop = function() {
    return skrollr_instance ? skrollr_instance.getScrollTop() : $(document).scrollTop();
  };

  window.getMaxScrollTop = function() {
    return skrollr_instance ? skrollr_instance.getMaxScrollTop() : $(document).height() - $(window).height();
  };

  skrollrSetup();
});
