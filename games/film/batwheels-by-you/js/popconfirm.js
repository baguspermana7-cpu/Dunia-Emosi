var popconfirm = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
popconfirm.prototype = Object.create(foxmovieclip.prototype);
popconfirm.prototype.constructor = popconfirm;

popconfirm.prototype.awaken = function() {
    let t = this;
    // create layer to block buttons below
    fox.makelayer(t,0.4,0x000001);
    // background box
    t.boxbg = common.makeboxbg(200,t);
    let style = fox.textstyle(g.titlefont,35,g.titlefillcolor);
    let yy = -40;
    // make text
    t.textmessage = fox.attachtext(t.message,0, yy,t, style);
    t.textmessage.filters = [g.textglowfilter];
    // make buttons
    t.buttonyes = fox.attachbutton('button_yes',38,(yy+65),t,()=> t.callback());
    t.buttonno = fox.attachbutton('button_no',-38,(yy+65),t,()=> t.close());
    t.spawn();
};

popconfirm.prototype.spawn = function () {
    let t = this;
    t.buttonyes.interactive = t.buttonno.interactive = true;
    t.textmessage.text = t.message;
    fox.jiggle(t);
};

popconfirm.prototype.close = function() {
    let t = this;
    t.buttonyes.interactive = t.buttonno.interactive = false;
    fox.remove(this, 100, 0);
};