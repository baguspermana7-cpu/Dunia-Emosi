var movingbackground = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
movingbackground.prototype = Object.create(foxmovieclip.prototype);
movingbackground.prototype.constructor = movingbackground;

movingbackground.prototype.awaken = function() {
    let t = this;
    t.spawn();
};

movingbackground.prototype.spawn = function() {
    let t = this;
    t.slices = [];
    t.pics = [];
    t.picsize = [];
    t.idx = 0;
    // range is the area which will always be filled with background
    if (!t.range) t.range = 200;
    // search for all slice pics for this background ( suffix '_1','_2','_3','_4', etc)
    // NOTE: use TileMage to easily split images
    let num = 1;
    while (num < 999) {
        let picname = t.bg+'_'+num;
        if (g.foxpic.hasOwnProperty(picname)) {
            // add pic name to array
            t.pics.push(picname);
            t.picsize.push(g.foxpic[picname].height);
            num++;
        } else {
            num = 999;
        }
    }
    t.totalslices = t.pics.length;
    if (t.totalslices === 0) fox.alert('Moving background failed! '+t.bg+' not found!');
    // initial fill
    let posnow = 0;
    while (posnow < t.range) {
        let pic = t.addslice(t.idx,posnow);
        t.slices.push(pic);
        posnow = pic.edgemax;
        t.idx++;
        if (t.idx >= t.totalslices) t.idx = 0;
    }
};

// add a slice
movingbackground.prototype.addslice = function(idx,pos) {
    let t = this;
    let pic = fox.spawn(t.pics[idx],0,pos,t);
    pic.idx = idx;
    pic.edgemin = pos;
    pic.edgemax = pos+t.picsize[idx];
    fox.setanchor(pic,0.5,0);
    return pic;
};

// move the background
movingbackground.prototype.move = function(speed) {
    let t = this;
    for (let  i = t.slices.length-1; i >= 0; i--) {
        let it = t.slices[i];
        it.y += speed;
        it.edgemin += speed;
        it.edgemax += speed;
        // check out of area
        if ((speed > 0 && it.edgemin > t.range) || (speed < 0 && it.edgemax < 0)) {
            t.slices.remove(it);
            it.kill();
        }
    }
    // fill up with new slices if necessary
    if (speed > 0) {
        while (t.slices[0].y > 0) {
            // add more slices to the top
            let idx = t.slices[0].idx-1;
            if (idx < 0) idx += t.totalslices;
            let pic = t.addslice(idx,t.slices[0].edgemin-t.picsize[idx]);
            t.slices.unshift(pic);
        }
    } else {
        while (t.slices[t.slices.length-1].edgemax < t.range) {
            // add more slices to the bottom
            let idx = t.slices[t.slices.length-1].idx+1;
            if (idx >= t.totalslices) idx = 0;
            let pic = t.addslice(idx,t.slices[t.slices.length-1].edgemax);
            t.slices.push(pic);
        }
    }
};