// Decide when will the animations be disabled
(function() {
  var md = new MobileDetect(window.navigator.userAgent);
  // window.LIMIT_ANIMATIONS = !!(md.mobile() || md.tablet());
  window.LIMIT_ANIMATIONS = false;

  // if(/MSIE [7-9].0/.test(navigator.userAgent)){
  //   LIMIT_ANIMATIONS = true;
  // }

  if (/with-animations/.test(window.location.search)) {
    LIMIT_ANIMATIONS = false;
  }
  if (/without-animations/.test(window.location.search)) {
    LIMIT_ANIMATIONS = true;
  }

  /*Targetting lower than Android 4.2 */
  if(/Android/.test(navigator.userAgent)){
    if(!Modernizr.history) {
      LIMIT_ANIMATIONS = true;
    }
  }

  //targetting lower than iOS 6 /* @TODO reported to be failing on iOS 5 */
  if(/(iPad|iPhone|iPod)/.test(navigator.userAgent)){ 
   if(!Modernizr.webaudio) {
      LIMIT_ANIMATIONS = true;
    } 
  }

  // //targetting lower than iOS 8
  // if(/(iPad|iPhone|iPod)/.test(navigator.userAgent)){ 
  //  if(!Modernizr.indexeddb) {
  //     LIMIT_ANIMATIONS = true;
  //   } 
  // }


}());

// Computes the current orientation
function getDeviceOrientation() {
  // try using media queries to determine the orientation
  if (typeof window.matchMedia === 'function') {
    var is_portrait = window.matchMedia('(orientation: portrait)').matches,
        is_landscape = window.matchMedia('(orientation: landscape)').matches;
    // make sure the media query works as expected, returning different values for different orientations
    if (is_portrait !== is_landscape) {
      return is_portrait ? 'portrait' : 'landscape';
    }
  }

  // media query was not available, determine the orientation based on the viewport size
  return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
}

// Determines the current device type, based on the viewport size
function getDeviceType() {
  var window_w = $(window).width(),
      window_h = $(window).height();

  return (
    (window_w <= 720) && (window_h <= 480) ||
    (window_w <= 480) && (window_h <= 720)
  ) ? 'mobile' : 'desktop';
}

if (!window.requestAnimationFrame) {
  var vendors = ['ms', 'moz', 'webkit', 'o'];
  for (var i = 0; i < vendors.length && !window.requestAnimationFrame; i++) {
    window.requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame = window[vendors[i] + 'CancelAnimationFrame'] || window[vendors[i] + 'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      return window.setTimeout(callback, 1000 / 60);
    };
    window.cancelAnimationFrame = function(id) {
      window.clearTimeout(id);
    };
  }
}

// Function.bind polyfill
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof fNOP && oThis ? this: oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

