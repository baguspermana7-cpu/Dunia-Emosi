var popfigures = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
popfigures.prototype = Object.create(foxmovieclip.prototype);
popfigures.prototype.constructor = popfigures;

popfigures.prototype.awaken = function() {
    let t = this;
    t.ID = g.figureIDs ? g.figureIDs[0] : 0;
    t.figure = g.figureIDs ? g.figureIDdata[t.ID] : g.figuresTagsdata[0];
    // create layer to block buttons below
    fox.makelayer(t,0.6,0x000001,()=> { t.close() });
    // box background
    let wid = 270;
    let hei = 280;
    fox.makeroundedbox(-wid/2,-hei/2,wid,hei,25,0xffffff,1,0,0,0,t);
    let yy = -hei/2;
    // add icon
    fox.attachpic('CNfigure_icon',0,yy,t,true);
    // add text
    let introstyle = fox.textstyle('avenir',13,0x000000);
    // add figure
    let fx = 0;
    let fy = -yy-72;
    let base = fox.attachpic('CNfigure_base',fx,fy+6,t,true);
    fox.setscale(base,1.25);
    let fig = null;
    if (g.gotfigure) {
        // player has special figure
        t.introcopy = 'You get double points in the game\nbecause you collected this figure.';
        fig = fox.attachpic('unlocked_'+t.ID,fx,fy,t);
        fox.attachpic('CNfigure_checkmark',fx,fy+36,t,true);
    } else {
        // player doesn't have the special figure
        t.introcopy = 'Collect this figure to get\ndouble points in the game.';
        fig = fox.attachpic('locked_'+t.ID,fx,fy,t);
        fox.attachbutton('CNfigure_buttonhint',fx,fy+36,t,()=>t.showhint());
    }
    fox.setanchor(fig,0.5,1);
    fox.setscale(fig,0.25);
    fox.attachtext(t.introcopy,0, yy+48,t,introstyle);
    // button close
    t.buttonclose = fox.attachbutton('button_play',0,40+hei/2,t,()=> { t.close() });
    // make hint
    t.makehintbox();
    t.spawn();
};

popfigures.prototype.spawn = function() {
    let t = this;
    t.x = g.hscreenwid;
    t.y = g.hscreenhei;
    t.uda = false;
    t.buttonclose.interactive = true;
    // animate
    fox.tweenremoveallfrom(t);
    fox.tweenscale(t,2,1,700,0,g.easing.outElastic());
    fox.disableinput(1000); // disable input during tween
    if (g.autoplay) fox.delayaction(1000,()=> { t.close() });
};

popfigures.prototype.showhint = function(idx) {
    let t = this;
    t.hint.visible = true;
    fox.tweenremoveallfrom(t.hint);
    fox.tweenscale(t.hint,2,1,700,0,g.easing.outElastic());
};

popfigures.prototype.hidehint = function() {
    let t = this;
    t.hint.visible = false;
};

popfigures.prototype.close = function() {
    let t = this;
    if (!t.uda) {
        t.uda = true;
        t.buttonclose.interactive = false;
        fox.runscene('start',true);
    }
};

popfigures.prototype.makehintbox = function () {
    var t = this;
    // create hint box
    t.hint = fox.makecontainer(0,0,t);
    fox.makelayer(t.hint,0.6,0x000001);
    t.hintcontent = fox.makecontainer(0,0,t.hint);
    let hwid = 290;
    let hhei = 220;
    t.hintmask = fox.makeroundedbox(-hwid/2,-hhei/2,hwid,hhei,25,0xffffff,1,0,0,0,t.hint);
    t.hintcontent.mask = t.hintmask;
    // grey bg
    fox.makebox(-hwid/2,-hhei/2,hwid,hhei,t.hintcontent,0x999999);
    // hint image
    t.hintpic = fox.attachpic('hint_'+t.ID,0,-hhei/2,t.hintcontent);
    fox.setanchor(t.hintpic,0.5,0);
    fox.setscale(t.hintpic,0.33);
    // white bg for text
    fox.makebox(-hwid/2,46,hwid,70,t.hintcontent,0xffffff);
    // hint text
    let hintstyle = {fontFamily:'avenir',fontSize:12,fill:0x000000,letterSpacing:0.1,wordWrap:true,wordWrapWidth:250};
    t.hintcopy = '';
    try { t.hintcopy = t.figure.hints.text; } catch (e) { fox.trace('hint copy not found!'); }
    t.hinttext = fox.attachtext(t.hintcopy,0, 77,t.hintcontent,hintstyle);
    // hint button close
    t.buttonclose = fox.attachbutton('CNfigure_buttonclose',141,6-hhei/2,t.hint,()=> { t.hidehint() });
    t.hint.visible = false;
}