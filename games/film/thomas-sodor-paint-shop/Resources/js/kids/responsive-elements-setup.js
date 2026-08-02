/*
  Make elements responsive based on the greatest rectangle that fits into the viewport and which keeps the same aspect ratio as the target size.
  Call the plugin on jQuery objects. The configuration may contain the following settings:
  - static: css styles that are applied directly, without being scaled (for example: {width: 'auto', marginTop: '10px'})
  - dynamic: css styles that are scaled based on the size of the current viewport; all values must be numeric (for example: {width: '100px', marginTop: '10px'})
  - scale: float that will get all the less specific styles to be scaled (for example: 1.5)
  - landscape: styles that are only applied to landscape viewports
  - portrait: styles that are only applied to portrait viewports
  - desktop: styles that are only applied to "desktop"; desktop is any viewport that is greater than the target_mobile size (see the beginning of the code)
  - mobile: styles that are only applied to "mobile"

  All settings except "dynamic" and "static" may be imbricated.
  Settings that are more specific will override the less specific ones.
  "dynamic" rules override the "static" ones

  Examples, considering a 1024x672 desktop and a 720x480 mobile:

    ResponsiveElements.setup('p', {
      dynamic: {fontSize: '14px'},
      desktop: {
        landscape: {
          dynamic: {fontSize: '16px'}
        }
      }
    });
    This will scale the font size on all vieports / "devices" with a 14px target except for the desktop landscape, where it will use 16px as target.
    This will result in the following font sizes, based on the viewport:
      - 1024x672 => 16px
      - 672x1024, 720x480, 480x720 => 14px
      - 240x720 => 7px

    ResponsiveElements.setup('p', {
      dynamic: {fontSize: '14px'},
      desktop: {
        scale: 1.5
        landscape: {
          dynamic: {fontSize: '16px'},
        }
      }
    });
    This will scale the font size on all vieports / "devices" with a 14px target except for the desktop.
    On desktop, the less specific styles are scaled to 1.5, so the font size becomes 21px;
    On desktop / landscape the font size is again overridden to 16px

    Note that the unit may be missing for width and height, but it must be present for all other properties of static or dynamic
*/

var ResponsiveElements = {
  current_scale: 1
};

(function() {
  // global target size for the landscape, used to get the target ratio
  var target_desktop = {width: 1024, height: 672},
      target_mobile = {width: 720, height: 480};

  // collect all the elements that are being setup to be responsive into an array
  var elements = {};

  // Function used to update the css with scaled values
  function update(silent, selector_mask) {
    if (!silent) {
      $(window).trigger('responsive-elements-before-update');
    }

    var is_landscape = getDeviceOrientation() === 'landscape',
        is_portrait = !is_landscape,
        is_desktop = getDeviceType() === 'desktop',
        is_mobile = !is_desktop,
        window_w = $(window).width(),
        window_h = $(window).height(),
        target_size = is_desktop ? target_desktop : target_mobile,
        // reverse values for target size if in portrait orientation
        target_window_w = is_landscape ? target_size.width : target_size.height,
        target_window_h = is_landscape ? target_size.height : target_size.width,
        scale;

    // compute the scale that will be applied to responsive elements
    if (target_window_w / target_window_h < window_w / window_h) {
      scale = window_h / target_window_h;
    }
    else {
      scale = window_w / target_window_w;
    }

    ResponsiveElements.current_scale = scale;

    // Merges a config into css and applies any configuration scaling
    function mergeConfigIntoCss(css, config) {
      // if the config is empty, return
      if (!config) {
        return;
      }

      // apply scaling to the current css
      if (config.scale) {
        for (var attr in css) {
          if (typeof css[attr] === 'object') {
            if (attr !== 'transform') {
              css[attr][0] *= config.scale;
            }
            else {
              // apply the scale to all odd indexes in the array
              for (var i = 1; i < css[attr].length; i += 2) {
                css[attr][i] *= config.scale;
              }
            }
          }
        }
      }

      // copy static and dinamic values into the css
      if (typeof config.static === 'object') {
        for (var attr in config.static) {
          css[attr] = config.static[attr];
        }
      }
      if (typeof config.dynamic === 'object') {
        for (var attr in config.dynamic) {
          // create a new array, otherwise the original config would also be altered when updating the css object
          css[attr] = config.dynamic[attr].slice(0);
        }
      }
    }

    // walk through each element
    for (var selector in elements) {
      if (selector_mask && !selector_mask.test(selector)) {
        continue;
      }

      var objects = $(selector),
          config = elements[selector],
          css = {};

      // skip if the element is not currently present in the page
      if (objects.length === 0) {
        continue;
      }

      // merge all dynamic and static values into a single object
      mergeConfigIntoCss(css, config);

      if (is_landscape && config.landscape) mergeConfigIntoCss(css, config.landscape);
      if (is_portrait && config.portrait) mergeConfigIntoCss(css, config.portrait);

      if (is_desktop && config.desktop) mergeConfigIntoCss(css, config.desktop);
      if (is_mobile && config.mobile) mergeConfigIntoCss(css, config.mobile);

      if (is_desktop && is_landscape && config.desktop && config.desktop.landscape) mergeConfigIntoCss(css, config.desktop.landscape);
      if (is_desktop && is_portrait && config.desktop && config.desktop.portrait) mergeConfigIntoCss(css, config.desktop.portrait);

      if (is_mobile && is_landscape && config.mobile && config.mobile.landscape) mergeConfigIntoCss(css, config.mobile.landscape);
      if (is_mobile && is_portrait && config.mobile && config.mobile.portrait) mergeConfigIntoCss(css, config.mobile.portrait);

      // dynamic values are arrays, other values are numeric or string; scale all dynamic values
      for (var attr in css) {
        if (typeof css[attr] === 'object') {
          if (attr === 'transform') {
            var scaled = '';
            // transform value is splitted by numbers; apply the scale to each number and glue them all back
            // for instance scale(1.5) is stored as  ["scale(", 1.5, ")"]
            for (var i = 0; i < css[attr].length; i++) {
              if (i % 2 === 0) {
                scaled += css[attr][i];
              }
              else {
                scaled += css[attr][i] * scale;
              }
            }
            css[attr] = scaled;
          }
          else {
            var scaled = css[attr][0] * scale;
            // Font size accepts float values, but all other should be set in integer values to avoid issues with extra pixels
            if (attr !== 'font-size' && attr !== 'fontSize') {
              scaled = Math.round(scaled);
            }
            css[attr] = scaled + css[attr][1];
          }
        }
      }

      // apply the new css styles
      objects.css(css);
    }

    if (!silent) {
      $(window).trigger('responsive-elements-updated');
    }
  }

  // Setup the styles that need to be applied to elements matching a certain selector
  function setup(selector, config) {
    // make sure the config is an object
    if (typeof config !== 'object') {
      console.info('Invalid config for selector: "' + selector + '"');
      return;
    }

    // extracts the units from the dynamic values and store each value as an array,
    // with the value as the first element and the unit as the second element
    function setValuesAsArray(config) {
      if (!config || !config.dynamic) {
        return;
      }
      for (var attr in config.dynamic) {
        if (attr === 'transform') {
          // split the string by any numbers, including sign; also capture the split string, in order to have it included into the result of the split
          config.dynamic[attr] = config.dynamic[attr].split(/(\-?\d+(?:\.?\d+)?)/);
          // odd indexes will contain the numbers; make them float
          for (var i = 1; i < config.dynamic[attr].length; i += 2) {
            config.dynamic[attr][i] = parseFloat(config.dynamic[attr][i]);
          }
        }
        else {
          // match a number followed by any letters or '%'
          var matches = /^(\-?\d+(?:\.?\d+)?)([a-z%]+)$/i.exec(config.dynamic[attr]);
          config.dynamic[attr] = matches ? [parseFloat(matches[1]), matches[2]] : [config.dynamic[attr], ''];
        }
      }
    }

    // process all dynamic values
    setValuesAsArray(config);
    if (config.landscape) setValuesAsArray(config.landscape);
    if (config.portrait) setValuesAsArray(config.portrait);

    if (config.desktop) setValuesAsArray(config.desktop);
    if (config.mobile) setValuesAsArray(config.mobile);

    if (config.desktop && config.desktop.landscape) setValuesAsArray(config.desktop.landscape);
    if (config.desktop && config.desktop.portrait) setValuesAsArray(config.desktop.portrait);

    if (config.mobile && config.mobile.landscape) setValuesAsArray(config.mobile.landscape);
    if (config.mobile && config.mobile.portrait) setValuesAsArray(config.mobile.portrait);

    elements[selector] = config;
  };

  // listen to window resize and orientation change in order to update the styles
  var listener_timeout = null;
  $(window).on('resize orientationchange', function(e) {
    window.clearTimeout(listener_timeout);
    listener_timeout = window.setTimeout(update, 100);
  });

  // expose the setup and update functions
  ResponsiveElements.setup = function(selector, config) {
    setup(selector, config);
  };
  ResponsiveElements.update = function(silent, selector_mask) {
    update(silent, selector_mask);
  };

}());
