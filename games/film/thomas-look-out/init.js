/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011      Zynga Inc.

 http://www.cocos2d-x.org


 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
 
 var IS_IOS5 = /OS 5(\_\d)+ like Mac OS X/i.test(navigator.userAgent),
     IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent),
     IS_IOS5_MOBILE = IS_IOS5 && IS_IOS,
     IS_IPHONE = navigator.userAgent.match(/iPhone|iPod/i),
     IS_ANDROID = /Android/i.test(navigator.userAgent),
     IS_MOBILE = IS_IOS || IS_ANDROID;

var loader = {
  interval_id: null,

  animate: function() {
    var domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
        el = document.getElementById('game-loader').children[0],
        animation = false,
        animationstring = 'animation',
        keyframeprefix = '',
        pfx = '';

    if (el.style.animationName) {
      animation = true;
    }
    else {
      for (var i = 0; i < domPrefixes.length; i++) {
        if (el.style[ domPrefixes[i] + 'AnimationName' ] !== undefined ) {
          pfx = domPrefixes[i];
          animationstring = pfx + 'Animation';
          keyframeprefix = '-' + pfx.toLowerCase() + '-';
          animation = true;
          break;
        }
      }
    }

    if (animation) {
      el.style[ animationstring ] = 'loader 0.8s steps(8) infinite';
      var keyframes = '@' + keyframeprefix + 'keyframes loader { from { background-position: 0 0; } to { background-position: 0 -1712px; } }';

      if (document.styleSheets && document.styleSheets.length ) {
        document.styleSheets[0].insertRule(keyframes, 0);
      }
      else {
        var s = document.createElement('style');
        s.innerHTML = keyframes;
        document.getElementsByTagName('head')[0].appendChild(s);
      }
    }
    else {
      var loader_top = 0;
      this.interval_id = window.setInterval(function() {
        loader_top += 214;
        if (loader_top >= 1926) {
          loader_top = 0;
        }
        el.style.backgroundPosition = '0 -' + loader_top + 'px';
      }, 100);
    }
  },

  remove: function() {
    var canvas = document.getElementById(document.ccConfig.tag),
        el = document.getElementById('game-loader');

    window.clearInterval(this.interval_id);

    canvas.style.visibility = "visible";
    el.parentNode.removeChild(el);
  }

};

//logic to define game locale
var Locale = {
  language: null,
  init: function() {
    var url = window.location.pathname;
    //get string placed between dots
    var url_region = url.substr(url.indexOf('.') + 1,  url.lastIndexOf('.') - url.indexOf('.') - 1);
    this.setLanguage(url_region);    
  },
  getLanguage: function() {
    return this.language;
  },
  setLanguage: function(url_region) {
    switch(url_region) {
      case 'en-us':
      case 'en-ca':
      case 'en-au':
      case 'en-gb':
        this.language = 'en';
        break;
      case 'nl-nl':
        this.language = 'nl';
        break;
      case 'de-de':
        this.language = 'de';
        break;
      case 'pt-pt':
      case 'pt-br':
        this.language = 'ptA';
        break;
      case 'es-mx':
      case 'es-la':
      case 'es-es':
        this.language = 'es';
        break;
      default:
        this.language = 'en';
        break;  
    }
  }
};

(function () {
  loader.animate();
  var d = document;
  var c = {
    COCOS2D_DEBUG: 0, //0 to turn debug off, 1 for basic debug, and 2 for full debug
    box2d: false,
    chipmunk: false,
    showFPS: false,
    frameRate: 60,
    loadExtension: false,
    renderMode: 1,       //Choose of RenderMode: 0(default), 1(Canvas only), 2(WebGL only)
    tag: 'game_canvas', //the dom element to run cocos2d on
    appFiles: []
  };

  // cocos2d engine
  if (c.COCOS2D_DEBUG) {
    c.engineDir = 'js/cocos2d-html5/';
    c.showFPS = true;
  }
  else { //no debug option - load minified file
    c.SingleEngineFile = 'src.min.js';
  }

  // application files
  if (c.COCOS2D_DEBUG) {
    c.appFiles = [
      'js/cocos2d/base64.js',
      "js/frameworks/jquery-1.11.1.min.js",
      'js/src/Analytics.js',
      'js/src/Resources.js',
      'js/src/audio.js',
      "js/src/VideoObject.js",
      "js/src/TitleScene.js",
      "js/src/settings.js",
      "js/src/ItemSprite.js",
      "js/src/VideoCutScene.js",
      "js/src/PayoffScene.js",
      "js/src/PayoffVideoScene.js",
      "js/src/Character.js",
      "js/src/Rounds/RoundBaseLayer.js",
      "js/src/Rounds/AnimalsRound.js",
      "js/src/Rounds/FootprintsRound.js",
      "js/src/Rounds/ScaryFacesRound.js",
      "js/src/SideContainer.js",
      "js/src/EndScene.js"
    ];
  }

  if (!d.createElement('canvas').getContext){
    var s = d.createElement('div');
    s.innerHTML = '<h2>Your browser does not support HTML5 canvas!</h2>' +
        '<p>Google Chrome is a browser that combines a minimal design with sophisticated technology to make the web faster, safer, and easier.Click the logo to download.</p>' +
        '<a href="http://www.google.com/chrome" target="_blank"><img src="http://www.google.com/intl/zh-CN/chrome/assets/common/images/chrome_logo_2x.png" border="0"/></a>';
    var p = d.getElementById(c.tag).parentNode;
    p.style.background = 'none';
    p.style.border = 'none';
    p.insertBefore(s);

    d.body.style.background = '#ffffff';
    return;
  }

  window.addEventListener('DOMContentLoaded', function () {
    this.removeEventListener('DOMContentLoaded', arguments.callee, false);
    document.ccConfig = c;
    var s = d.createElement('script');
    s.src = c.SingleEngineFile ? c.SingleEngineFile : (c.engineDir + 'jsloader.js');
    d.body.appendChild(s);
    s.id = 'cocos2d-html5';
  });

  //game locale
  var locale = Locale.init();
  window.language = Locale.getLanguage();
  console.log(window.language);

  //---------------------------
  //START: Set Audio properties
  //---------------------------

  //checking for audio API support
  window.audioAPI = false;
  window.waitforAudioLoad = false;
  window.useFlash = false;

  if ('webkitAudioContext' in window || 'AudioContext' in window ){
    waitforAudioLoad = true;
    audioAPI = true;
  } else if(!IS_MOBILE) {
    window.useFlash = true;
    console.log("audio: flash");
    if(navigator.userAgent.match(/(MSIE)/g)) {
      var doc = document.getElementsByTagName('html')[0];
      doc.className = 'isie';
      useFlash = true;
      try { flashObj = new ActiveXObject('ShockwaveFlash.ShockwaveFlash'); } catch (ex) { useFlash = false; }
    }
  }

  var a = new Audio(),
      can_ogg = a.canPlayType('audio/ogg'),
      can_mp3 = a.canPlayType('audio/mpeg');
  var AUDIO_USE_OGG = false, AUDIO_USE_MP3 = false;
  if (can_ogg != '' && (can_ogg == 'probably' || can_mp3 != 'probably')) {
    AUDIO_USE_OGG = true;
  }
  else if (can_mp3) {
    AUDIO_USE_MP3 = true;
  }
  delete a, can_ogg, can_mp3;

  //base64 audio files (for browsers supporting the Audio API)
  if(audioAPI){
    if(AUDIO_USE_OGG) {
      console.log("audio: base64 ogg");
      c.appFiles.push('res/sounds/' + language + '/base64/ogg.js');
    }else {
      console.log("audio: base64 mp3");
      c.appFiles.push('res/sounds/' + language + '/base64/mp3.js');
    }
  } else if(!audioAPI && IS_MOBILE) {
    console.log("audio: mobile with no audio api ");
    c.appFiles.push('res/sounds/' + language + '/sheet/audiosheet.js');
  }

  //---------------------------
  //END: Set audio properties
  //---------------------------

})();
