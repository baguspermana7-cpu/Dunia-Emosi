/* ==========================================================================
   Switch images source for mobile / desktop
   ========================================================================== */
var USE_75_SCALED_IMAGES = Modernizr.touch && screen.width < 1024 && screen.height < 1024;

/**
 * Setup all the elements that need to switch images.
 * Will only process elementes that had not been processed yet
 * Needs to be called once when the dom is ready and then each time new elements are added to the page
 */
function setupResponsiveImagesSwitch() {
  $('[data-hires]').each(function() {
    var $this = $(this);

    if ($this.data('image-switch-processed')) {
      return;
    }
    $this.data('image-switch-processed', true);

    if (this.nodeName.toLowerCase() === 'img') {
      $this.data('lowres', $this.attr('src'));
    }
    else {
      $this.data('lowres', $this.css('background-image'));
      var hires = $this.data('hires');
      if (hires.indexOf('url') !== 0) {
        $this.data('hires', 'url(' + hires + ')');
      }
    }
  });
  
  switchResponsiveImages();
}

/**
 * Sets the source for the responsive elements based on the current view
 */
function switchResponsiveImages() {
  $('[data-hires]').each(function() {
    var $this = $(this);
    var new_src = $this.data(USE_75_SCALED_IMAGES ? 'lowres' : 'hires');
    if (this.nodeName.toLowerCase() === 'img') {
      if (new_src !== $this.attr('src')) {
        $this.attr('src', new_src);
      }
    }
    else {
      if (new_src !== $this.css('background-image')) {
        $this.css('background-image', new_src);
      }
    }
  });
}


/**
 * On DOM ready setup the elements and attach an event to update the source of the images when switching from mobile to desktop and vice-versa
 */
$(function() {
  setupResponsiveImagesSwitch();
  $('body').attr('data-image-scale', USE_75_SCALED_IMAGES ? '75' : '');
});