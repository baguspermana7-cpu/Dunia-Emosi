var gallery = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
gallery.prototype = Object.create(foxmovieclip.prototype);
gallery.prototype.constructor = gallery;

gallery.prototype.awaken = function() {
    let t = this;
    t.thumbnailcontaineroffset = -40;
    t.bglayer = fox.makelayer(t,1,0x000001);
    // for this game, fox.makelayer doesn't cover the whole screen when viewed in portrait, so we made it bigger
    fox.setscale(t.bglayer,1.5);
    t.bgcontainer = fox.makecontainer(0,0,t);
    t.buttoncontainer = fox.makecontainer(0,0,t);
    t.thumbnailcontainer = fox.makecontainer(0,t.thumbnailcontaineroffset,t);
    t.photobgcontainer = fox.makecontainer(0,0,t);
    t.photocontainer = fox.makecontainer(0,-20,t);
    t.topbuttoncontainer = fox.makecontainer(0,0,t);
    g.greenglow = new PIXI.filters.GlowFilter({distance: 20, outerStrength: 1, quality: 0.1, color: 0x66FF00});
    // make bg
    t.wid = 740;
    t.hei = 580;
    t.bg = fox.attachpic('gallerybg',0,0,t.bgcontainer)
    fox.setscale(t.bg,4)
    // make text
    let pos = 240;
    t.style = fox.textstyle(g.copyfont,25,0xffffff);
    t.pageinfo = fox.attachtext('1/1',0,pos,t.buttoncontainer,t.style);
    t.pageinfo.filters = [g.greenglow];
    // make solid black background for photo
    fox.makelayer(t.photobgcontainer,0.8,0x000001,()=> t.hidephoto());
    // thumbnail scale
    t.thumbnailska = 0.28;
    // make trashcan
    t.trashcan = fox.attachpic('trashcan',70-t.wid/2,-14+t.hei/2,t.buttoncontainer);
    // make buttons
    t.buttonclose = fox.attachbutton('button_close',-8+t.wid/2,8-t.hei/2,t.buttoncontainer,()=> t.close());
    t.buttonhide = fox.attachbutton('button_close',350,-250,t.topbuttoncontainer,()=> t.hidephoto());
    t.buttondownload = fox.attachbutton('button_download',0,280,t.topbuttoncontainer,()=> t.downloadimage());
    t.buttonnext = fox.attachpic('button_nav1',88,pos,t.buttoncontainer);
    t.buttonprev = fox.attachpic('button_nav2',-88,pos,t.buttoncontainer);
    t.buttonnext.interactive = t.buttonprev.interactive = true;
    t.buttonnext.filters = t.buttonprev.filters = [g.greenglow];
    t.buttonnext.cacheAsBitmap = t.buttonprev.cacheAsBitmap = true;
    t.buttonnext.on('pointertap',()=> { t.nextpage() });
    t.buttonprev.on('pointertap',()=> { t.prevpage() });
    t.spawn();
};

gallery.prototype.spawn = function () {
    let t = this;
    g.gallery = t;
    t.bglayer.alpha = g.showgallery ? 1 : 0.6;
    t.thumbnails = [];
    t.columns = 3;
    t.rows = 3;
    t.totalpagethumbs = t.columns*t.rows;
    t.photobgcontainer.visible = t.buttondownload.visible = t.buttonhide.visible = t.trashcan.visible = t.showing = t.hiding = t.dragging = false;
    t.showingphoto = t.dragitem = null;
    t.dragska = t.thumbnailska;
    t.presstime = 0;
    t.xspacing = 220;
    t.yspacing = 150;
    // starting page
    t.pagenow = 1;
    t.totalpages = Math.ceil(g.photos.length/t.totalpagethumbs);
    if (g.photos.length > 0) {
        t.fillpage(t.pagenow);
        fox.jiggle(t.trashcan,700,200+Math.min(g.photos.length,t.totalpagethumbs)*50);
    }
    t.updatepageinfo(t.pagenow);
    fox.playsound('zopen');
};

gallery.prototype.loop = function () {
    let t = this;
    // detect dragging thumbnail
    if (t.presstime > 0 && Date.now()-t.presstime > 50) {
        if (Math.abs(g.mousex-t.presspos.x) > 10 || Math.abs(g.mousey-t.presspos.y) > 10) t.startdrag();
    }
    if (t.dragging) {
        t.dragitem.x = g.mousex;
        t.dragitem.y = g.mousey-t.y-t.thumbnailcontaineroffset;
        // check over trashcan
        t.dragska = t.mouseovertrashcan() ? 0.5*t.thumbnailska : t.thumbnailska;
        // adjust scale
        fox.setscale(t.dragitem,t.dragitem.scale.x+(t.dragska-t.dragitem.scale.x)/4);
    }
}

gallery.prototype.mouseovertrashcan = function () {
    let t = this;
    return Math.abs(g.mousex - t.trashcan.x) < 100 && Math.abs(g.mousey - t.y - t.trashcan.y) < 90
}

gallery.prototype.deletephoto = function (photo) {
    let t = this;
    photo.die();
    g.photos.splice(photo.idx,1);
    t.fillpage(t.pagenow);
    t.updatepageinfo(t.pagenow);
    fox.jiggle(t.trashcan);
    fox.playsound('ztrash');
    common.savehighscore();
}

gallery.prototype.nextpage = function () {
    let t = this;
    if (t.pagenow < t.totalpages) {
        t.pagenow++;
        t.fillpage(t.pagenow);
        t.updatepageinfo(t.pagenow);
        fox.playbuttonsfx();
    }
}

gallery.prototype.prevpage = function () {
    let t = this;
    if (t.pagenow > 1) {
        t.pagenow--;
        t.fillpage(t.pagenow);
        t.updatepageinfo(t.pagenow);
        fox.playbuttonsfx();
    }
}

gallery.prototype.updatepageinfo = function (page) {
    let t = this;
    t.totalpages = Math.ceil(g.photos.length/t.totalpagethumbs);
    if (t.totalpages < 2) {
        // no photos
        t.pageinfo.text = g.photos.length === 0 ? '' : '';
        t.buttonprev.alpha = t.buttonnext.alpha = 0;
    } else {
        // show current page
        t.pageinfo.text = page + '/' + t.totalpages;
        t.buttonprev.alpha = page === 1 ? 0.3 : 1;
        t.buttonnext.alpha = page < t.totalpages ? 1 : 0.3;
    }
}

gallery.prototype.startdrag = function () {
    let t = this;
    if (t.dragging) return;
    t.dragging = true;
    t.dragitem = t.presstarget;
    t.dragska = t.thumbnailska;
    fox.bringtotop(t.dragitem);
}

gallery.prototype.stopdrag = function () {
    let t = this;
    if (!t.dragging) return;
    // delete photo?
    if (t.mouseovertrashcan()) {
        t.deletephoto(t.dragitem);
    } else {
        fox.tweenremoveallfrom(t.dragitem);
        fox.tweenmove(t.dragitem, t.dragitem.position, t.dragitem.origin, 400, 0, g.easing.outExpo());
        fox.setscale(t.dragitem, t.thumbnailska);
    }
    t.dragitem = null;
    t.dragging = false;
}

gallery.prototype.fillpage = function (page) {
    let t = this;
    // first clear the page
    t.clearpage();
    // make thumbnails
    let startx = -t.xspacing;
    let xx = startx;
    let yy = -t.yspacing;
    let idx = (page-1)*t.totalpagethumbs;
    if (idx > g.photos.length-1) {
        // no photo here
        if (g.photos.length > 0) {
            t.pagenow--;
            t.totalpages = Math.ceil(g.photos.length/t.totalpagethumbs);
            fox.delayaction(-1,()=> {
                t.fillpage(t.pagenow);
                t.updatepageinfo(t.pagenow);
            });
        }
        return;
    }
    for (let i = 0; i < t.rows; i++) {
        for (let f = 0; f < t.columns; f++) {
            let p = g.photos[idx];
            let it = fox.spawn('photo', xx, yy, t.thumbnailcontainer,{p});
            it.idx = idx;
            it.origin = {x:xx,y:yy};
            it.interactive = true;
            it.on('pointerdown',()=> { t.onpointerdown(it) });
            it.on('pointerup',()=> { t.onpointerup(it) });
            it.on('pointerupoutside',()=> { t.onpointerup(it) });
            t.thumbnails.push(it);
            fox.setscale(it,0.001);
            it.visible = false;
            // animate
            fox.delayaction(i*100,()=> {
                it.visible = true;
                fox.tweenscale(it,{x:0.001,y:t.thumbnailska},{x:t.thumbnailska,y:t.thumbnailska},600,0,g.easing.outElastic());
            })
            xx += t.xspacing;
            idx++;
            if (idx >= g.photos.length) return;
        }
        yy += t.yspacing;
        xx = startx;
    }
}

gallery.prototype.onpointerdown = function (it) {
    let t = this;
    t.presstime = Date.now();
    t.presspos = {x:g.mousex,y:g.mousey};
    t.presstarget = it;
}

gallery.prototype.onpointerup = function () {
    let t = this;
    let pressduration = Date.now() - t.presstime;
    if (!t.dragging) {
        if (pressduration < 200) t.showphoto(t.presstarget);
    } else {
        if (t.dragging) t.stopdrag();
    }
    t.presstime = 0;
}

gallery.prototype.showphoto = function (thumbnail) {
    let t = this;
    if (t.showing) return;
    t.showing = true;
    t.showingphoto = fox.spawn('photo', 0, 0, t.photocontainer,{p:thumbnail.p});
    t.showingphoto.interactive = true;
    t.showingphoto.on('pointertap',()=> { t.hidephoto() });
    fox.setscale(t.showingphoto,0.001);
    let tw = fox.tweenscale(t.showingphoto,0.001,1,400,0,g.easing.outBack());
    tw.once('end',()=> {
        t.showing = false;
        fox.jiggle(t.buttondownload);
        fox.jiggle(t.buttonhide,700,200);
    })
    // fade photo bg
    t.photobgcontainer.visible = true;
    t.photobgcontainer.alpha = 0;
    fox.tweenremoveallfrom(t.photobgcontainer);
    fox.tweenalpha(t.photobgcontainer,t.photobgcontainer.alpha,1,300);
    fox.playsound('zshow');
}

gallery.prototype.downloadimage = function() {
    let t = this;
    g.app.renderer.plugins.extract.canvas(t.photocontainer).toBlob(function (b) {
        var a = document.createElement("a");
        document.body.append(a);
        a.download = 'Batwheels_'+common.datestring()+'.jpg';
        a.href = URL.createObjectURL(b);
        a.click();
        a.remove();
    }, "image/jpeg",0.95);
}

gallery.prototype.hidephoto = function () {
    let t = this;
    if (t.showing || t.hiding) return;
    t.hiding = true;
    if (t.showingphoto) {
        t.buttondownload.visible = t.buttonhide.visible = false;
        fox.tweenscale(t.showingphoto,t.showingphoto.scale.x,0.001,150,0,g.easing.inSine());
        // fade photo bg
        fox.tweenremoveallfrom(t.photobgcontainer);
        let tw = fox.tweenalpha(t.photobgcontainer,t.photobgcontainer.alpha,0,200);
        tw.once('end',()=> {
            t.showingphoto.die();
            t.photobgcontainer.visible = t.hiding = false;
        });
    }
    fox.playsound('zhide');
}

gallery.prototype.clearpage = function () {
    let t = this;
    for (let i = t.thumbnails.length-1; i >= 0; i--) {
        t.thumbnails[i].die();
    }
    t.thumbnails = [];
}

gallery.prototype.close = function () {
    let t = this;
    if (g.showgallery) {
        g.showgallery = false;
        fox.runscene('titlescreen');
    } else {
        fox.killchildren(t.photocontainer);
        t.clearpage();
        fox.remove(t);
        fox.playsound('zclose');
    }
}