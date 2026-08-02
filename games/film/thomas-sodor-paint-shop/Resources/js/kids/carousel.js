$(function() {
  $('.carousel').each(setupCarousel);
});

function setupCarousel() {
  // get the elements
  var container = $(this),
      carousel = $('.carousel-root', container),
      carousel_list = $('.carousel-list', container),
      control_next = $('.controls .next', container),
      control_previous = $('.controls .previous', container),
      pagination = $('.pagination', container),
      items = $('.carousel-item', container),
      first_item = $(items.get(0)),
      carousel_enabled = false;

  function stopAutoplay() {
    if (autoplay) {
      carousel.jcarouselAutoscroll('stop');
    }
    autoplay = false;
  }

  function setCurrentActiveItems() {
    if (swipe_in_progress) {
      return;
    }
    items.removeClass('active-item');
    carousel.jcarousel('visible').addClass('active-item');
    container.trigger('carousel-activated-item');
  }

  function setVisibleControls() {
    carousel.jcarousel('hasNext') ? control_next.removeClass('disabled') : control_next.addClass('disabled');
    carousel.jcarousel('hasPrev') ? control_previous.removeClass('disabled') : control_previous.addClass('disabled');
  }

  // get carousel config
  var min_items = container.data('min-items') || 1,
      max_items = container.data('max-items') || 1,
      fit_landscape_items = container.data('landscape-items') || 0,
      fit_portrait_items = container.data('portrait-items') || 0,
      item_target_width = container.data('item-target-width') || null,
      item_target_height = container.data('item-target-height') || null,
      item_margin = container.data('item-margin') || 0,
      item_margin_procentual = false,
      autoplay = typeof container.data('autoplay') !== 'undefined' ? container.data('autoplay') : false,
      infinite = typeof container.data('infinite') !== 'undefined' ? container.data('infinite') : true,
      speed = container.data('speed') || 200,
      pause = container.data('pause') || 3000;

  if (!infinite) {
    container.addClass('finite');
  }
  
  if (!item_target_width) {
    item_target_width = first_item.width();
  }
  //  validate the min / max items
  if (isNaN(min_items) || isNaN(max_items) || min_items > max_items) {
    console.error('Invalid value supplied to min and or max items: ' + min_items + ' / ' + max_items + '. Both need to be numeric and min must be smaller than max.', container);
    return;
  }
  
  // validate and set the margin
  var margin = /^(\d+(?:\.\d+)?)(.*)$/.exec(item_margin);
  var unit = margin ? margin[2].toLowerCase() : '';
  if (!margin || (unit !== '' && unit !== '%' && unit !== 'px')) {
    console.error('Carousel only supports px or % margins. Invalid value supplied: ' + item_margin, container);
    return;
  }
  item_margin = parseFloat(margin[1]);
  item_margin_procentual = unit === '%';


  var swipe_in_progress = false,
      swipe_item_width,
      swipe_list_start_position,
      swipe_list_visible_width,
      swipe_list_total_width;

  // set the maximum width of the carousel on window resize and on carousel create
  $(window).on('responsive-elements-updated', function() {
    carousel.jcarousel('reload');
  });
  
  // adjust the size of each item on carousel create / reload
  carousel.on('jcarousel:reload jcarousel:create', function (e) {
    if (swipe_in_progress) {
      return;
    }

    var available_width = carousel.width(),
        margin = item_margin_procentual ? Math.floor(available_width * item_margin / 100) : item_margin,
        orientation = getDeviceOrientation(),
        css = {},
        fit;

    // check how many items will fit, including the margins
    if (fit_landscape_items && orientation === 'landscape') {
      fit = fit_landscape_items;
    }
    else if (fit_portrait_items && orientation === 'portrait') {
      fit = fit_portrait_items;
    }
    else if (!item_target_width) {
      // if the width of the items is unknown, then fit the maximum number of items
      fit = max_items;
    }
    else {
      // check how many can fit; items must scale both up and down, so just round the number of items
      // n items must fit with n-1 margins, so add an extra margin to the available width to measure
      fit = Math.round((available_width + margin) / (item_target_width + margin));
      
      // make sure to fit the min / max required items
      fit = Math.min(max_items, Math.max(fit, min_items));
    }

    css.marginRight = margin;

    // compute the width of each item
    css.width = Math.floor((available_width - (fit - 1) * margin) / fit);
    // due to rounding, there may be some extra pixels
    // it's ok if the difference is negative, as the last visible element will be a bit cut off
    // however, if the difference is positive, this will create a margin in the right side of the carousel and that must not happens
    var extra_pixels = available_width - fit * css.width - (fit - 1) * margin;
    if (extra_pixels > 0 && margin === 0) {
      css.width++;
    }


    if (items.length < fit) {
      // center the carousel
      var displayed = Math.min(fit, items.length),
          extra_pixels = available_width - displayed * css.width - (displayed - 1) * margin;
      carousel_list.css('marginLeft', (extra_pixels / 2) + 'px');
    }
    else {
      carousel_list.css('marginLeft', 0);
    }

    // adjust the height if needed
    if (item_target_width && item_target_height) {
      css.height = Math.round(item_target_height * css.width / item_target_width);
    }
     
    // set the css attributes
    carousel.jcarousel('items').css(css);

    // if all items are in view, disable pagination and stop auto scrolling
    if (fit >= items.length) {
      container.addClass('disabled');
      if (autoplay && e.type != 'jcarousel:create') {
        carousel.jcarouselAutoscroll('stop');
      }
      carousel_enabled = false;
    }
    else {
      container.removeClass('disabled');
      if (autoplay && e.type != 'jcarousel:create') {
        carousel.jcarouselAutoscroll('start');
      }
      carousel_enabled = true;
    }

    setVisibleControls();
  });

  carousel.on('jcarousel:animate', setVisibleControls);
  carousel.on('jcarousel:animateend', setCurrentActiveItems);
  
  // initialize the carousel
  carousel.jcarousel({
    transitions: !Modernizr.csstransitions ? false : {
      transforms: Modernizr.csstransforms,
      transforms3d: Modernizr.csstransforms3d,
      easing: 'ease'
    },
    wrap: infinite ? 'circular' : null,
    animation: speed
  });

  // initialize the autoscroll
  carousel.jcarouselAutoscroll({
    autostart: autoplay,
    interval: pause
  });

  // setup the previous slide control
  control_previous.jcarouselControl({
    method: function() {
      stopAutoplay();
      var visible_items = carousel.jcarousel('visible');
      carousel.jcarousel('scroll', '-=' + visible_items.length);
    }
  });

  // setup the next slide control
  control_next.jcarouselControl({
    method: function() {
      stopAutoplay();
      var visible_items = carousel.jcarousel('visible');
      carousel.jcarousel('scroll', '+=' + visible_items.length);
    }
  });
  
  // initialize the pagination
  pagination
    .on('jcarouselpagination:active', 'span', function() {
      $(this).addClass('active');
    })
    .on('jcarouselpagination:inactive', 'span', function() {
      $(this).removeClass('active');
    })
    .on('click', function(e) {
      e.preventDefault();
      stopAutoplay();
    })
    .jcarouselPagination({
      'carousel': carousel,
      item: function(page) {
        return '<span>' + page + '</span>';
      }
    });
  ;

  carousel
    .on('movestart', function(e) {
      // ignore if another swipe is already in progress (may happen on moveend, during the items snap animation)
      if (!carousel_enabled || swipe_in_progress) {
        e.preventDefault();
        return;
      }

      // allow browser scroll
      if ((e.distX > e.distY && e.distX < -e.distY) ||
          (e.distX < e.distY && e.distX > -e.distY)) {
        e.preventDefault();
        return;
      }

      stopAutoplay();
      items.removeClass('active-item');
      
      swipe_in_progress = true;
      swipe_item_width = first_item.innerWidth() + parseInt(first_item.css('marginRight'));
      swipe_list_start_position = carousel.jcarousel('list').position().left;
      swipe_list_visible_width = carousel.jcarousel('visible').length * swipe_item_width;
      swipe_list_total_width = items.length * swipe_item_width;
    })
    .on('move', function(e) {
      if (!carousel_enabled || !swipe_in_progress || e.deltaX === 0) {
        return;
      }

      // if the carousel's position becomes greater than 0 or less then the minimum position at which elements are visible,
      // then scroll the carousel and update the swiping start position
      if (infinite && (
        (swipe_list_start_position + e.distX > 0) ||
        (swipe_list_start_position + e.distX < swipe_list_visible_width - swipe_list_total_width)
      )) {
        // measure how many items have to be scrolled
        var swiped_items = -Math.ceil((swipe_list_start_position + e.distX) / swipe_item_width);

        // the carousel will rearrage elements (append first elements to the end of the list or vice-versa)
        //
        // get the left position of the carousel before scrolling
        carousel.jcarousel('scroll', '+=0', false);
        var start_left = carousel.jcarousel('list').position().left;

        // scroll the carousel and get it's current position
        carousel.jcarousel('scroll', (swiped_items > 0 ? '+' : '-') + '=' + Math.abs(swiped_items), false);
        var end_left = carousel.jcarousel('list').position().left;

        // measure what's the expected position of the carousel if no elements are rearranged
        var expected_left = start_left - swipe_item_width * swiped_items;

        // finally, adjust the start position based on the expected and the current position
        swipe_list_start_position -= expected_left - end_left;
      }
      
      // adjust the position of the carousel elements relative to swiping position
      carousel.jcarousel('move', {left: (swipe_list_start_position + e.distX) + 'px'});
    })
    .on('moveend', function(e) {
      swipe_in_progress = false;

      // get the index of the first element that is in view and scroll the carousel to that element
      var scroll_to_element = Math.round(-(swipe_list_start_position + e.distX) / swipe_item_width);

      if (!infinite) {
        scroll_to_element = Math.max(scroll_to_element, 0);
        scroll_to_element = Math.min(scroll_to_element, items.length - carousel.jcarousel('visible').length);
      }
      carousel.jcarousel('scroll', $('.carousel-item:eq(' + scroll_to_element + ')', container), true);
    });

  carousel.jcarousel('reload');
  setCurrentActiveItems();
  setVisibleControls();

  // expose a method to replace the items in the carousel
  // this method must have access to the local variables of the current method, so it cannot be defined as global
  carousel.data('replace-items', function(new_items) {
    // remove the current elements and add the new ones
    carousel_list.empty();
    carousel_list.append(new_items);

    // update the local variables used by the parent method
    items = $('.carousel-item', container);
    first_item = $(items.get(0));

    // reload the carousel and scroll to the first element
    carousel.jcarousel('reload');
    carousel.jcarousel('scroll', 0);
  });
};
