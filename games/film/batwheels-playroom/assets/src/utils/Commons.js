

function fixTextPos(_main) {
    var ctx = _main.context;
    if (navigator.userAgent.search("MSIE") >= 0) {
        console.warn("MSIE");
    }
    else if (navigator.userAgent.search("Chrome") >= 0  && navigator.userAgent.search("OPR") < 0) {

        c.Text.prototype._drawTextLine = function(ctx, text, y)
        {

            if (this.textBaseline === "top")
            {
                var lineHeight = this.lineHeight || this.getMeasuredLineHeight();
                y += lineHeight * 0.25;
            }
            if (this.outline) {
                ctx.strokeText(text, 0, y, this.maxWidth||0xFFFF);
            }
            else {
                ctx.fillText(text, 0, y, this.maxWidth||0xFFFF);
            }
        };
    }
    else if (navigator.userAgent.search("Firefox") >= 0) {

        c.Text.prototype._drawTextLine = function(ctx, text, y)
        {

            if (this.textBaseline === "top")
            {
                var lineHeight = this.lineHeight || this.getMeasuredLineHeight();
                y += lineHeight * 0.25;
            }
            if (this.outline) {
                ctx.strokeText(text, 0, y, this.maxWidth||0xFFFF);
            }
            else {
                ctx.fillText(text, 0, y, this.maxWidth||0xFFFF);
            }
        };
    }
    else if (navigator.userAgent.search("Safari") >= 0 && navigator.userAgent.search("Chrome") < 0) {

        c.Text.prototype._drawTextLine = function(ctx, text, y)
        {

            if (this.textBaseline === "top")
            {
                var lineHeight = this.lineHeight || this.getMeasuredLineHeight();
                y += lineHeight * (0.05);
            }
            if (this.outline) {
                ctx.strokeText(text, 0, y, this.maxWidth||0xFFFF);
            }
            else {
                ctx.fillText(text, 0, y, this.maxWidth||0xFFFF);
            }
        };
    }
    else if (navigator.userAgent.search("OPR") >= 0){
        c.Text.prototype._drawTextLine = function(ctx, text, y)
        {

            if (this.textBaseline === "top")
            {
                var lineHeight = this.lineHeight || this.getMeasuredLineHeight();
                y += lineHeight * (0.20);
            }
            if (this.outline) {
                ctx.strokeText(text, 0, y, this.maxWidth||0xFFFF);
            }
            else {
                ctx.fillText(text, 0, y, this.maxWidth||0xFFFF);
            }
        };

    }
}
const addSeparator=(n)=>{
    let sNumber;
    let sN = n.toString()
    if(sN.length>3){
        sNumber = sN.substr(0,sN.length-3)+','+sN.substr(sN.length-3);
    }else{
        sNumber=sN;
    }
    return sNumber;
}
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

function playLoop(s){

    c.Sound.stop();
    if(globals.bSound==true){

        globals.music = c.Sound.play(s,{loop:-1});
    }
}
function createCookie(name,value,days) {
    window.localStorage.setItem(name,value);
}
function readCookie(name, type) {
    return window.localStorage.getItem(name);
}
function createCookie2(name,value,days) {
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

const shuffle2=(array)=> {
    var currentIndex = array.length, temporaryValue, randomIndex;


    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function readCookie2(name) {
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
    if(globals.bSound==true){

        c.Sound.play(s);
    }
}
function stopPlaying() {
    if(globals.soundInstance){
        globals.soundInstance.stop();
    }

}
function playSounds2(s){

    'use strict';
    if(globals.bSound===true){
        globals.soundInstance = createjs.Sound.play(s);
    }
}

const parseMiliSecondsToTimerString=(n)=>{
    let godziny1,minuty1,sekundy1,milisekundy1;
    let dt = parseInt(n);
    let min=Math.floor(Math.floor(dt/1000)/60);
    let sec=Math.floor(dt/1000)-min*60;
    let mili=Math.floor(dt/1000)-min*60;
    if (sec.toString().length < 2) {
        sec = '0' + sec;
    }
    let elapsedGodz = Math.floor(dt / 3600000);
    dt = dt - (elapsedGodz * 3600000);
    let elapsedMin = Math.floor(dt / 60000);
    dt = dt - (elapsedMin * 60000);
    let elapsedSek = Math.floor(dt / 1000);
    dt = dt - (elapsedSek * 1000);
    let elapsedMiliSek = dt;
    elapsedGodz < 10 ? godziny1 = '0' + elapsedGodz.toString() : godziny1 = elapsedGodz.toString();
    elapsedMin < 10 ? minuty1 = '' + elapsedMin.toString() : minuty1 = elapsedMin.toString();
    elapsedSek < 10 ? sekundy1 = '0' + elapsedSek.toString() : sekundy1 = elapsedSek.toString();
    if (elapsedMiliSek < 100) {
        if (elapsedMiliSek < 10) {
            milisekundy1 = '0' + elapsedMiliSek.toString();
        } else {
            milisekundy1 ='0' +elapsedMiliSek.toString();
        }
    } else {
        milisekundy1 = elapsedMiliSek.toString();
    }
    milisekundy1 = milisekundy1.substr(0,2);

    return minuty1 + ':' + sekundy1;
}
var hidden, visibilityChange;
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
}
var parsed = (document.location.href.split('#')[1]||'').split('&');
var params = parsed.reduce(function (params, param) {
    var param = param.split('=');
    params[param[0]] = decodeURIComponent(param.slice(1).join('='));
    return params;
}, {});