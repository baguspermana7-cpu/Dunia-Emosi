/**
 * jquery.simplr.smoothscroll
 * version 1.0
 * copyright (c) 2012 https://github.com/simov/simplr-smoothscroll
 * licensed under MIT
 * requires jquery.mousewheel - https://github.com/brandonaaron/jquery-mousewheel/
 */
;(function($) {
    'use strict';
    
    $.srSmoothscroll = function(options) {
    
    var self = $.extend({
        step: 55,
        speed: 400,
        ease: "swing"
    }, options || {});
    
    // private fields & init
    var win = $(window),
        doc = $(document),
        top = 0,
        step = self.step,
        iterationStep = self.step,
        speed = self.speed,
        viewport = win.height(),
        body = (document.scrollingElement) ? document.scrollingElement : document.documentElement,
        wheel = false,
        highAccelerationWheel = false,
        lastTime = $.now();

    // retrieve previous highAccelerationWheel value
    if(Modernizr.sessionstorage){
    	highAccelerationWheel = sessionStorage.getItem("highAccelerationWheel");
    }

    // events
    if(body != document.documentElement){$('body').mousewheel(function(event, delta) {

        if(!highAccelerationWheel && Math.abs(delta) > 6){
            highAccelerationWheel = true;

		    if(Modernizr.sessionstorage){
		    	sessionStorage.setItem("highAccelerationWheel", highAccelerationWheel);
		    }
        }

        //fallback to regular functioning if this wheel generates momentum. 
        if(highAccelerationWheel)
            return true;  

        wheel = true;

        //do not accept event intervals under 3ms
        iterationStep = step;
		if(($.now() - lastTime) < 7) {
			iterationStep = Math.min(iterationStep, ($.now() - lastTime)/2);
		}

        if (delta < 0) // down
            top = (top+viewport) >= doc.height() ? top : top+=iterationStep;

        else // up
            top = top <= 0 ? 0 : top-=iterationStep;

        body.stop().animate({scrollTop: top}, speed, self.ease, function () {
            wheel = false;

        });
        lastTime = $.now();

        return false;
    });}

    win
    .on('resize', function (e) {
        viewport = win.height();
    })
    .on('scroll', function (e) {
        if (!wheel)
            top = win.scrollTop();
    });
    
    };
})(jQuery);