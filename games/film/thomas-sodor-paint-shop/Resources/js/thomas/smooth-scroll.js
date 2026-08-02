/* ==========================================================================
   Enable smooth scrolling on browser that don't support it natively
   ========================================================================== */
$(function() {
  var is_webkit = / AppleWebKit\//.test(navigator.userAgent),
      is_ie = / MSIE \d+\.\d+/.test(navigator.userAgent) || /Trident.+rv[ :]+11\./.test(navigator.userAgent);
      // platform = navigator.platform.toLowerCase(),
      // is_windows_or_linux = platform.indexOf('win') != -1 || platform.indexOf('linux') != -1;
  if (is_webkit || is_ie) {
    $.srSmoothscroll({step: 50, speed: 200});
  }
});