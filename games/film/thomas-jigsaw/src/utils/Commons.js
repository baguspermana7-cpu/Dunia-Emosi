
function detectApple(){
    'use strict';
    if( navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i)){
        return true;
    }else{
        return false;
    }
}
function detectMobile() {
    'use strict';
    if( navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i)){
        return true;
    }
    else {
        return false;
    }
}
function getoffset(z){
    return parseInt(z.substr(0, z.indexOf('px')));
}
function trace(s){
    'use strict';
    if(globals.isDebugging){
        console.log(s);
    }
}
function createCookie(name,value,days) {
    'use strict';
    var expires;
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        expires = '; expires='+date.toGMTString();
    }
    else  expires = '';
    document.cookie = name+'='+value+expires+'; path=/';
}

function readCookie(name) {
    'use strict';
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function playSounds(s){

    'use strict';
    
    if(globals.bSound==true){
        createjs.Sound.play(s);
    }
}
function stopPlaying() {
    if(globals.soundInstance){
        globals.soundInstance.stop();
    }

}
function playSounds2(s){

    'use strict';
    if(globals.bSound==true){
        globals.soundInstance = createjs.Sound.play(s);
    }
}

(function(){
    'use strict';
    var t;
    var BrowserTest=function()
    {
        t=this;

        var isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
        var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
        // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)

        var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
        // At least Safari 3+: '[object HTMLElementConstructor]'
        var isChrome = !!window.chrome && !isOpera;              // Chrome 1+
        var isIE = /*@cc_on!@*/false || !!document.documentMode; // At least IE6

    };
    var browserTest=BrowserTest.prototype;

    window.BrowserTest=BrowserTest;



}());


function getOrientation() {
    var ua = navigator.userAgent.toLowerCase();
    var isAndroid = ua.indexOf('android') > -1;
    if (isAndroid) {

        if (window.orientation == 0 || window.orientation == 180) { //Landscape Mode
            return false;

        }
        else if (window.orientation == 90 || window.orientation == -90) { //Portrait Mode
            return true;
        }
    }
    else {
        if (window.orientation == 90 || window.orientation == -90) { //Landscape Mode
            return true;
        }
        else if (window.orientation == 0 || window.orientation == 180) { //Portrait Mode
            return false;
        }
    }
}

function getTagInfo()
{

    window.groupId = window.groupId == undefined ? Math.round(Math.random() * 1000) : window.groupId;
    var viewPort = getViewPort();
    var alias = viewPort.width < 768 ? 'mobile' : (viewPort.width >= 768 && viewPort.width <= 932 ? 'tablet' : 'display');
    var domain = alias == 'mobile' ? 'a' : (alias == 'tablet' ? 'a' : 'adserver');
    return {domain: domain, alias: alias, groupId: groupId, viewPort: viewPort}
}

function getViewPort()
{
    var screenWidth, screenHeight;
    if (typeof window.innerWidth == 'number')
    {
        screenWidth = window.innerWidth;
        screenHeight = window.innerHeight;
    } else if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight))
    {
        screenWidth = document.documentElement.clientWidth;
        screenHeight = document.documentElement.clientHeight;
    } else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
        screenWidth = document.body.clientWidth;
        screenHeight = document.body.clientHeight;
    }
    return {width: screenWidth, height: screenHeight};
}




function sendStats(ssss){
    dataLayer.eventName = ssss;
    Bootstrapper.ensEvent.trigger("microsite-interaction");
}
function onResize(){

}
function getTagInfo()
{

    window.groupId = window.groupId == undefined ? Math.round(Math.random() * 1000) : window.groupId;
    var viewPort = getViewPort();
    var alias = viewPort.width < 768 ? 'mobile' : (viewPort.width >= 768 && viewPort.width <= 932 ? 'tablet' : 'display');
    var domain = alias == 'mobile' ? 'a' : (alias == 'tablet' ? 'a' : 'adserver');
    return {domain: domain, alias: alias, groupId: groupId, viewPort: viewPort}
}

function getViewPort()
{
    var screenWidth, screenHeight;
    if (typeof window.innerWidth == 'number')
    {
        screenWidth = window.innerWidth;
        screenHeight = window.innerHeight;
    } else if (document.documentElement && (document.documentElement.clientWidth || document.documentElement.clientHeight))
    {
        screenWidth = document.documentElement.clientWidth;
        screenHeight = document.documentElement.clientHeight;
    } else if (document.body && (document.body.clientWidth || document.body.clientHeight)) {
        screenWidth = document.body.clientWidth;
        screenHeight = document.body.clientHeight;
    }
    return {width: screenWidth, height: screenHeight};
}
