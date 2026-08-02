// Used throughout the site to play sound when hovering navigation elements
// and to toggle the parents link on mobile / portrait
$(function() {

  // the path to the sound for each menu item is provided as data-audio
  // collect all the sounds into a single object that will be the audio config
  var nav_audio = {};

  // walk through all menu items
  $('#navigation > ul > li > a').each(function(index) {
    var $this = $(this);
    // if there is a sound specified for this menu entry
    if ($this.data('audio')) {
      // build an id for the sound
      var audio_id = 'navigation_' + index;

      // update the sound into the config
      nav_audio[audio_id] = $this.data('audio');

      // store the id on the element, for later use
      $this.data('audio_id', audio_id);
    }
  });

  // initalize the sounds
  audio.load(nav_audio);

  // listen for events to start playing the sounds
  var playing_timeout = null;
  $('#navigation > ul > li > a')
    .on('mouseover', function() {
      // get the sound id of this menu entry and return if there isn't one
      var audio_id = $(this).data('audio_id');
      if (!audio_id) {
        return;
      }

      // in order to avoid multiple sounds overlapping, the sounds are played with a small delay
      window.clearTimeout(playing_timeout);
      playing_timeout = window.setTimeout(function() {
        audio.play(audio_id);
      }, 200);

    })
    .on('mouseout', function() {
      // clear the timer
      window.clearTimeout(playing_timeout);
    })
    .on('touchstart', function() {
      // on touch devices, play the sound as soon as the user taps a menu item
      var audio_id = $(this).data('audio_id');
      if (!audio_id) {
        return;
      }
      audio.play(audio_id);
    });


  // Toggle the parents link in mobile / potrait

  var remove_parents_animate_class_timeout;

  // listen for clicks to the small white arrow (only displayed on mobile / portrait)
  $('#nav-parents em').click(function(e) {
    // make sure the parents links doesn't get this click event
    e.preventDefault();
    e.stopPropagation();

    // remove any previously set timeout
    window.clearTimeout(remove_parents_animate_class_timeout);

    var parents_link = $('#nav-parents'),
        arrow = parents_link.find('> em');

    // add the "animate" class, which triggers css animation to the margin-left but only when opening / closing the menu (we don't want the margin to
    // be animated when positioning the elements from the responsive plugin)
    // also toggle the "opened"
    parents_link.addClass('animate').toggleClass('opened');

    if (parents_link.hasClass('opened')) {
      // if the menu is currently opened, move it into the screen
      parents_link.addClass('opened').css('marginLeft', '-' + parents_link.innerWidth() + 'px');
    }
    else {
      // the menu is currently closed, move it out of the screen
      parents_link.css('marginLeft', '-' + arrow.width() + 'px');
    }

    // remove the "animate" class after the css animation completes
    remove_parents_animate_class_timeout = window.setTimeout(function() {
      parents_link.removeClass('animate');
    }, 350);
  });

  // close the navigation if it is opened before the responsive plugin starts repositioning the elements
  $(window).on('responsive-elements-before-update', function() {
    // if the navigation is not opened, there's nothing else to do here
    if (!$('#nav-parents').hasClass('opened')) {
      return;
    }

    // clear any previously set timer, remove the animate and the opened classes
    window.clearTimeout(remove_parents_animate_class_timeout);
    $('#nav-parents').removeClass('animate').removeClass('opened');

    // the parents link could be updated here, but the responsive plugin will update it's position, so this is not really required
    // $('#nav-parents').css('marginLeft', '-' + $('#nav-parents em').width() + 'px');
  });

});