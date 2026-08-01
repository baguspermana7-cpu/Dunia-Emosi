var common = common || {};

common = {
    showappinfo: function() {
        fox.trace(fox.devicetype()+' '+g.screenwid+'x'+g.screenhei+' Userscale:'+g.userscale.toFixed(2)+' Ratio:'+g.ratio+' AppBuild:'+g.appBuildNumber);
    },

    onpointerdown: function(it) {
        // for this game, mouse pointer is based on local g.start
        if (!g.start) return;
        g.pressing = true;
        g.startpresstime = Date.now();
        let local = g.start.toLocal(it);
        g.mousex = g.startpressx = local.x/g.ska;
        g.mousey = g.startpressy = local.y/g.ska;
    },

    onpointerup: function(it) {
        g.pressing = false;
        g.startpressx = g.startpressy = null;
    },

    onpointermove: function(it) {
        // for this game, mouse pointer is based on local g.start
        if (!g.start) return;
        let local = g.start.toLocal(it);
        g.mousex = local.x/g.ska;
        g.mousey = local.y/g.ska;
    },

    // check pointer moved (at least 2 pixels)
    pointermoved: function() {
        if (Math.abs(g.mousex-g.oldmousex) < 2 && Math.abs(g.mousey-g.oldmousey) < 2) return false;
        g.oldmousex = g.mousex;
        g.oldmousey = g.mousey;
        return true;
    },

    // returns current date in YYYYMMDD string format
    datestring: function() {
        let d = new Date();
        return d.getDate() + "-" + (d.getMonth()+1)  + "-" + d.getFullYear() + "_" + d.getHours() + "-" + d.getMinutes() + "-" + d.getSeconds();
    },

    tintsticker: function(clr) {
        for (let i = 0; i < g.vehiclestickercontainer.children.length; i++) {
            let it = g.vehiclestickercontainer.children[i];
            fox.tint(it,clr);
        }
    },

    glowbutton: function(it, selected = false) {
        if (selected) {
            // this is the selected button, glow it bright
            if (it.item === 'color' || it.item === 'background') {
                // for coloring/background
                it.filters = [g.thickwhiteoutline,g.greenglow];
            } else {
                // for sticker/eyes/mouth
                fox.clearcolor(it);
                it.filters = it.idx === g.defaultindexes[it.item] ? [g.thickwhiteoutline, g.greenglow] : [g.greenglow];
            }
        } else {
            // not the selected button
            if (it.item === 'color' || it.item === 'background') {
                // for coloring/background
                it.filters = [g.thinwhiteoutline,g.darkenglow];
            } else {
                // for sticker/eyes/mouth
                if (it.idx !== 8) fox.tintcolor(it, g.buttontintcolor); // dim the button
                it.filters = it.idx === g.defaultindexes[it.item] ? [g.thinwhiteoutline, g.darkenglow] : [g.darkenglow];
            }
        }
    },

    clearcontainer: function(container) {
        for (let i = container.children.length-1; i >= 0; i--) {
            let it = container.children[i];
            fox.tweenremoveallfrom(it);
            it.kill();
        }
    },

    cekpopfigure: function() {
        // hero mode starts at advanced level
        g.level = g.heromode? g.herostartlevel : g.levelnow;
        if (g.udapopfigure) fox.runscene('start',true);
        if (!g.udapopfigure) {
            fox.spawn('popfigures',0,0,g.overcontainer);
            g.udapopfigure = true;
        }
    },

    clearparticles: function() {
        for (let key in g.activebullet) {
            let bullets = g.activebullet[key];
            for (let i = bullets.length - 1; i >= 0; i--) {
                let b = bullets[i];
                bullets.remove(b);
                g.particlepool[key].push(b);
                b.alpha = 0;
            }
        }
        for (let key in g.activepart) {
            let particles = g.activepart[key];
            for (let i = particles.length - 1; i >= 0; i--) {
                let b = particles[i];
                particles.remove(b);
                g.particlepool[key].push(b);
                b.alpha = 0;
            }
        }
    },

    // load polygon data we got from Flash
    SATloadpolygondata: function() {
        // vehicle1
        g.SATpolygon['vehicle112'] = [{x:174, y:-45}, {x:154, y:-96}, {x:186, y:-118}];
        g.SATpolygon['vehicle111'] = [{x:154, y:-59}, {x:153, y:-88}, {x:201, y:-115}, {x:196, y:-88}];
        g.SATpolygon['vehicle110'] = [{x:188, y:16}, {x:115, y:58}, {x:148, y:61}, {x:165, y:60}, {x:174, y:53}, {x:184, y:36}, {x:176, y:-36}, {x:187, y:-7}];
        g.SATpolygon['vehicle19'] = [{x:26, y:98}, {x:-2, y:-35}, {x:175, y:-57}, {x:139, y:61}];
        g.SATpolygon['vehicle18'] = [{x:157, y:60}, {x:-36, y:-65}, {x:177, y:-44}, {x:33, y:41}];
        g.SATpolygon['vehicle17'] = [{x:159, y:57}, {x:119, y:-45}, {x:156, y:-98}, {x:186, y:-118}];
        g.SATpolygon['vehicle16'] = [{x:75, y:-85}, {x:54, y:-64}, {x:60, y:-94}, {x:85, y:-72}];
        g.SATpolygon['vehicle15'] = [{x:5, y:-61}, {x:11, y:-101}, {x:37, y:-73}];
        g.SATpolygon['vehicle14'] = [{x:-36, y:-62}, {x:-22, y:-118}, {x:8, y:-136}, {x:16, y:-80}];
        g.SATpolygon['vehicle13'] = [{x:-36, y:-65}, {x:-21, y:-111}, {x:17, y:-136}, {x:22, y:-112}];
        g.SATpolygon['vehicle12'] = [{x:175, y:-33}, {x:85, y:14}, {x:-60, y:-22}, {x:-44, y:-58}, {x:-52, y:-46}, {x:-16, y:2}, {x:30, y:-78}, {x:86, y:-69}, {x:-34, y:-66}, {x:-5, y:-76}];
        g.SATpolygon['vehicle11'] = [{x:-114, y:-14}, {x:15, y:5}, {x:30, y:118}, {x:-196, y:30}, {x:-188, y:84}, {x:-200, y:61}, {x:12, y:132}, {x:-168, y:103}, {x:-62, y:-19}, {x:-183, y:8}, {x:39, y:95}, {x:-159, y:-5}];
        // vehicle 2
        g.SATpolygon['vehicle210'] = [{x:-16, y:-86}, {x:-44, y:-72}, {x:-3, y:-84}, {x:-19, y:-68}];
        g.SATpolygon['vehicle29'] = [{x:133, y:-103}, {x:118, y:-63}, {x:149, y:-92}];
        g.SATpolygon['vehicle28'] = [{x:144, y:-106}, {x:147, y:-84}, {x:154, y:-86}, {x:153, y:-111}];
        g.SATpolygon['vehicle27'] = [{x:134, y:-115}, {x:67, y:-53}, {x:56, y:-65}, {x:152, y:-122}, {x:159, y:-116}];
        g.SATpolygon['vehicle26'] = [{x:-24, y:-124}, {x:-42, y:-103}, {x:-39, y:-114}, {x:-5, y:-131}, {x:2, y:-126}];
        g.SATpolygon['vehicle25'] = [{x:129, y:-72}, {x:145, y:-91}, {x:-38, y:-87}, {x:-6, y:-117}, {x:127, y:-109}];
        g.SATpolygon['vehicle24'] = [{x:158, y:81}, {x:174, y:22}, {x:76, y:81}, {x:173, y:49}, {x:141, y:-31}, {x:166, y:-7}, {x:167, y:70}];
        g.SATpolygon['vehicle23'] = [{x:161, y:-27}, {x:41, y:100}, {x:-31, y:32}, {x:90, y:88}, {x:144, y:-44}, {x:117, y:-56}];
        g.SATpolygon['vehicle22'] = [{x:-107, y:-11}, {x:11, y:-72}, {x:15, y:123}, {x:-14, y:123}, {x:-39, y:-74}, {x:55, y:-66}, {x:110, y:-49}, {x:-80, y:-50}];
        g.SATpolygon['vehicle21'] = [{x:-107, y:-11}, {x:29, y:14}, {x:21, y:121}, {x:-166, y:31}, {x:-165, y:90}, {x:-168, y:55}, {x:-74, y:119}, {x:-153, y:99}, {x:-56, y:-6}, {x:-158, y:13}, {x:34, y:95}, {x:-129, y:-3}];
        // vehicle 3
        g.SATpolygon['vehicle37'] = [{x:79, y:-80}, {x:17, y:38}, {x:67, y:23}, {x:-48, y:-39}];
        g.SATpolygon['vehicle36'] = [{x:-6, y:-81}, {x:5, y:-99}, {x:11, y:-79}];
        g.SATpolygon['vehicle35'] = [{x:-46, y:-72}, {x:-43, y:-99}, {x:-20, y:-84}];
        g.SATpolygon['vehicle34'] = [{x:92, y:45}, {x:111, y:-17}, {x:21, y:-53}, {x:66, y:31}, {x:111, y:10}, {x:96, y:-53}, {x:108, y:-40}, {x:104, y:31}];
        g.SATpolygon['vehicle33'] = [{x:75, y:-90}, {x:105, y:-79}, {x:37, y:-21}, {x:98, y:-89}, {x:61, y:-83}, {x:46, y:-66}];
        g.SATpolygon['vehicle32'] = [{x:-60, y:-25}, {x:-23, y:-86}, {x:20, y:38}, {x:-21, y:33}, {x:-45, y:-74}, {x:-1, y:-89}, {x:51, y:-71}, {x:-58, y:-50}];
        g.SATpolygon['vehicle31'] = [{x:-70, y:-18}, {x:-17, y:39}, {x:-46, y:86}, {x:-110, y:18}, {x:-107, y:63}, {x:-112, y:42}, {x:-74, y:87}, {x:-95, y:78}, {x:-16, y:-17}, {x:-102, y:-1}, {x:-25, y:69}, {x:-87, y:-14}];
        // vehicle 4
        g.SATpolygon['vehicle410'] = [{x:-87, y:-103}, {x:-125, y:-100}, {x:-55, y:-37}, {x:-160, y:-75}, {x:-162, y:-40}, {x:-140, y:-97}];
        g.SATpolygon['vehicle49'] = [{x:113, y:-90}, {x:158, y:-107}, {x:154, y:-75}, {x:167, y:-92}];
        g.SATpolygon['vehicle48'] = [{x:132, y:-128}, {x:123, y:-93}, {x:165, y:-114}, {x:163, y:-134}];
        g.SATpolygon['vehicle47'] = [{x:84, y:-146}, {x:41, y:-159}, {x:48, y:-197}, {x:72, y:-182}];
        g.SATpolygon['vehicle46'] = [{x:-31, y:-165}, {x:-13, y:-186}, {x:3, y:-166}];
        g.SATpolygon['vehicle45'] = [{x:50, y:-85}, {x:-99, y:-78}, {x:-71, y:-154}];
        g.SATpolygon['vehicle44'] = [{x:111, y:-97}, {x:93, y:-147}, {x:-47, y:-164}, {x:18, y:-97}, {x:-4, y:-167}, {x:-86, y:-152}, {x:-82, y:-141}, {x:33, y:-165}];
        g.SATpolygon['vehicle43'] = [{x:145, y:139}, {x:130, y:164}, {x:180, y:-12}, {x:184, y:-63}, {x:150, y:-82}, {x:86, y:-104}, {x:46, y:181}, {x:23, y:165}, {x:105, y:186}, {x:-59, y:-111}, {x:-89, y:-102}];
        g.SATpolygon['vehicle42'] = [{x:-172, y:1}, {x:-41, y:117}, {x:200, y:120}, {x:177, y:140}, {x:-148, y:-52}, {x:-177, y:-47}, {x:176, y:-13}, {x:194, y:-3}, {x:204, y:14}, {x:210, y:46}, {x:210, y:81}, {x:-180, y:-23}];
        g.SATpolygon['vehicle41'] = [{x:-171, y:0}, {x:-78, y:128}, {x:-63, y:101}, {x:-197, y:122}, {x:-208, y:90}, {x:-140, y:153}, {x:-172, y:145}, {x:-103, y:148}, {x:-207, y:55}, {x:-57, y:6}, {x:-195, y:22}];
        // vehicle 5
        g.SATpolygon['vehicle513'] = [{x:-60, y:79}, {x:-15, y:70}, {x:-87, y:-47}, {x:-62, y:-106}, {x:-43, y:83}];
        g.SATpolygon['vehicle512'] = [{x:-58, y:60}, {x:106, y:28}, {x:-18, y:-47}, {x:4, y:-52}, {x:19, y:84}];
        g.SATpolygon['vehicle510'] = [{x:64, y:17}, {x:69, y:-5}, {x:181, y:72}, {x:187, y:41}];
        g.SATpolygon['vehicle511'] = [{x:148, y:93}, {x:174, y:11}, {x:209, y:31}, {x:214, y:47}, {x:211, y:61}, {x:200, y:73}, {x:180, y:83}, {x:103, y:105}];
        g.SATpolygon['vehicle59'] = [{x:103, y:53}, {x:140, y:34}, {x:106, y:42}, {x:145, y:38}];
        g.SATpolygon['vehicle58'] = [{x:103, y:53}, {x:145, y:62}, {x:140, y:68}, {x:126, y:52}];
        g.SATpolygon['vehicle57'] = [{x:115, y:64}, {x:102, y:53}, {x:77, y:109}];
        g.SATpolygon['vehicle56'] = [{x:9, y:116}, {x:122, y:100}, {x:9, y:25}, {x:70, y:111}, {x:21, y:18}];
        g.SATpolygon['vehicle55'] = [{x:70, y:-18}, {x:96, y:-46}, {x:54, y:-31}, {x:120, y:-84}, {x:94, y:-79}, {x:119, y:-91}];
        g.SATpolygon['vehicle54'] = [{x:-85, y:-53}, {x:-41, y:-42}, {x:-30, y:-106}, {x:-62, y:-106}, {x:-31, y:-116}];
        g.SATpolygon['vehicle53'] = [{x:-212, y:2}, {x:-203, y:-15}, {x:-187, y:-29}, {x:-163, y:-41}, {x:-130, y:-50}, {x:97, y:-21}, {x:-87, y:-54}, {x:-214, y:20}, {x:-32, y:-51}];
        g.SATpolygon['vehicle52'] = [{x:-34, y:-84}, {x:-156, y:24}, {x:-24, y:-71}, {x:-172, y:15}, {x:-25, y:-54}];
        g.SATpolygon['vehicle51'] = [{x:97, y:-31}, {x:104, y:-15}, {x:-61, y:80}, {x:-156, y:24}, {x:-158, y:87}, {x:-164, y:73}, {x:-115, y:93}, {x:-141, y:93}, {x:103, y:-23}, {x:98, y:2}];
        for (let key in g.SATpolygon) {
            // check if the property/key is defined in the object itself, not in parent
            if (g.SATpolygon.hasOwnProperty(key)) {
                fox.sortcounterclockwise(g.SATpolygon[key],fox.getcenter(g.SATpolygon[key]));
            }
        }
    },

    // add glow to eyes & mouth
    addglow: function(container,belowcontainer,tintcolor,tintcolorbelow) {
        let glow = new PIXI.filters.GlowFilter({ distance: 10, outerStrength: 2.2, quality: 0.3, color: tintcolor });
        fox.killchildren(belowcontainer);
        for (let i = 0; i < container.children.length; i++) {
            let it = container.children[i];
            it.filters = [glow];
            // spawn this eyes/mouth below version into below container
            let b = fox.spawn(it.name+'below',it.x,it.y,belowcontainer);
            fox.tint(b,tintcolorbelow);
        }
    },

    // pre-spawn some game objects at the beginning of the game
    prespawn: function() {
        // for (var i = 0; i < 10; i++) fox.spawn('wall'+i, 0, 0, g.hiddencontainer);
    },

    // make version number
    makeversionnumber: function(x,y,parent) {
        let versionstyle = fox.textstyle(g.titlefont, 14,0x555555);
        return fox.attachtext(g.buildversion,x, y,parent, versionstyle);
    },

    // clicking pause button?
    clickpause: function() {
        return (g.mousex > g.screenwid-70 && g.mousey < 70);
    },

    startgame: function() {
        // create player
        fox.spawn('player',0,50,g.playercontainer);
        // update stats
        common.updatestatscore();
        common.updateenergybar();
        common.updatechargebar();
        // common.updatestatcombo();
        g.noclick = 0;
        g.gamestart = true;
    },

    // create HUD
    createHUD: function(parent) {
        // create stat score
        g.statscore = fox.attachbitmaptext('0',10, 68,parent,false,'luckiestguydigits1',32,'left');
        g.statscore.tint = 0xffcc00;
        // create stat coins
        g.statcoinicon = fox.attachpic('coinicon',20, 110,parent,true);
        g.statcoindigits = fox.attachbitmaptext(g.coins.toString(),30, 100,parent,false,'luckiestguydigits4',21,'left');
        g.statcoindigits.tint = 0xff7700
        // create stat progress
        let style = fox.textstyle(g.titlefont,16,0xffcc00,4,g.titlestrokecolor);
        g.statprogresstitle = fox.attachtext('LEVEL  1 :',g.screenwid-44, 144,parent,style);
        g.statprogresspercent = fox.attachpic('percent',g.screenwid-18, 145,parent,true);
        g.statprogressdigits = fox.attachbitmaptext('0',g.screenwid-29, 144,parent,false,'luckiestguydigits4',20,'right');
        fox.setanchor(g.statprogresstitle,1,0.5);
        fox.setanchor(g.statprogressdigits,1,0.5);
        fox.setscale(g.statprogresstitle,0.88,1);
        g.statprogressdigits.tint = 0xff7700;
        // make energy bar
        g.energybar = fox.makecontainer(g.screenwid-50,80,parent);
        g.energybar.bg = fox.attachpic('energybarbg',0,0,g.energybar);
        g.energybar.bar = fox.attachpic('energybarbar',-38,0,g.energybar,{heaven:true});
        g.energybar.top = fox.attachpic('energybartop',0,0,g.energybar,{heaven:true});
        g.energybar.icon = fox.attachpic('iconheart',-40,-7,g.energybar,{heaven:true});
        fox.setanchor(g.energybar.bar,0,0.5);
        // make charge bar
        g.chargebar = fox.makecontainer(g.screenwid-50,115,parent);
        g.chargebar.bg = fox.attachpic('chargebarbg',0,0,g.chargebar);
        g.chargebar.bar = fox.attachpic('chargebarbar',-38,0,g.chargebar);
        g.chargebar.top = fox.attachpic('chargebartop',0,0,g.chargebar,{heaven:true});
        g.chargebar.icon = fox.attachpic('iconcharge',-40,-2,g.chargebar,{heaven:true});
        g.chargebar.alphaspeed = 0.1;
        fox.setanchor(g.chargebar.bar,0,0.5);
        // make pause button
        g.pausebutton = fox.attachbutton('button_pause',g.screenwid-37,36,parent,common.pausegame);
        // right stats starting position
        let yy = 15;
    },

    pausegame: function() {
        if (!g.paused) fox.spawn('pausescreen',0,0,g.overcontainer);
    },

    // update progress
    updatestatprogress: function() {
        g.progress = Math.floor((g.enemyout/g.totalincoming)*100);
        g.statprogressdigits.text = g.progress;
        g.statprogresstitle.x = g.screenwid-g.statprogressdigits.width-28;
    },

    // update energy bar
    updateenergybar: function() {
        // first clear all tweens and tint
        fox.tweenremoveallfrom(g.energybar.bar);
        fox.tweenremoveallfrom(g.energybar.icon);
        fox.setscale(g.energybar.icon,1);
        fox.tintcolor(g.energybar.bar,0x33CC00);
        g.energybar.bar.alpha = 1;
        // getting hit? flash energy bar
        let ska = g.energy/g.energymax;
        if (ska < g.energybar.bar.scale.x) {
            fox.tintflash(g.energybar.top);
            fox.tintflash(g.energybar.icon);
        }
        fox.tweenscale(g.energybar.bar,g.energybar.bar.scale,{x:ska,y:1},700,0,g.easing.outSine());
        // low energy?
        if (ska < 0.3) {
            fox.tintcolor(g.energybar.bar,0xFF0000);
            fox.tweenalpha(g.energybar.bar,1,0,70,0,g.easing.inCirc(),-1,true);
            fox.tweenscale(g.energybar.icon,1,0.7,200,0,g.easing.inOutCirc(),-1,true);
        }
    },

    // update charge bar
    updatechargebar: function() {
        g.chargebar.bar.scale.x = g.charge/g.chargemax;
        if (g.chargebar.bar.scale.x === 1) {
            g.chargebar.bar.alpha += g.chargebar.alphaspeed;
            if (g.chargebar.bar.alpha > 1 || g.chargebar.bar.alpha < 0) {
                g.chargebar.bar.alpha = Math.min(1,Math.max(0,g.chargebar.bar.alpha));
                g.chargebar.alphaspeed = -g.chargebar.alphaspeed;
            }
        } else {
            g.chargebar.bar.alpha = 1;
        }
    },

    // update score
    updatestatscore: function() {
        g.statscore.text = g.score;
    },

    // update coins
    updatestatcoins: function() {
        g.statcoindigits.text = g.coins.toString();
    },

    // SDK pause
    SDKpause: function () {
        if (g.pausescr == null) {
            fox.pausegame(true);
        }
    },

    // SDK play
    SDKplay: function () {
        if  (g.pausescr == null) {
            fox.resumegame();
        }
    },

    // bugfix for audio loss after interrupt on some devices
    cekaudioloss: function() {
        if (!g.pausescr && !g.continuescr && !g.mute) PIXI.sound.unmuteAll(); // keep game sound on
    },

    // mute or unmute music based on g.mutemusic
    applymutemusic: function() {
        for (let key in g.sfx) {
            if (g.sfx.hasOwnProperty(key)) {
                // mute or unmute all music loops
                if (key.substring(0, 5) === "zloop") {
                    g.sfx[key].muted = g.mutemusic;
                }
            }
        }
    },

    // mute or unmute sfx based on g.mutesfx
    applymutesfx: function() {
        for (let key in g.sfx) {
            if (g.sfx.hasOwnProperty(key)) {
                // mute or unmute everything EXCEPT music loops
                if (key.substring(0, 5) !== "zloop") g.sfx[key].muted = g.mutesfx;
            }
        }
    },

    analytics: function(location) {
        // CN Arcade SDK =========================
        if (window['PlayPromise']) {
            window['PlayPromise'].then(sdk => {
                sdk.analytics.trackPlay(location);
                fox.trace('Tracked analytics : '+location);
            });
        }
        // =======================================
    },


    // make box bg
    makeboxbg: function (hei,parent,clr) {
        clr = typeof clr !== 'undefined' ? clr : 0x000000;
        let wid = 320;
        let margin = 7;
        let margincolor = 0x146cb8;
        let it = fox.makecontainer(0,0,parent);
        fox.makeroundedbox(-wid/2,-hei/2,wid,hei,20,0x000000,1,0,0,0,it);
        // fox.makebox(4-wid/2,4-hei/2,wid-8,hei-8,it,margincolor);
        // fox.makebox(margin-wid/2,margin-hei/2,wid-2*margin,hei-2*margin,it,clr);
        it.filters = [new PIXI.filters.GlowFilter({distance:25,outerStrength:2,color:0x055bc8,quality:3})];
        it.interactive = it.cacheAsBitmap = true;
        return it;
    },

    // achievement
    // usage for boolean achievement: common.achievement(2);
    // usage for progress achievement "get Grizz to play guitar 3x": each time Grizz launched -> common.achievement(4,1);
    // usage for progress achievement "punch enemy 3x": in player.js -> common.achievement(6,1); // each time player punch enemy
    achievement: function(num,progress) {
        progress = typeof progress !== 'undefined' ? progress : 0;
        if (progress === 0) fox.trace('Achievement '+num+' triggered!');
        if (progress > 0) fox.trace('Achievement '+num+' progress: '+progress);
        // CN Arcade SDK =========================
        if (g.achievements[num] === 0) {
            if (window['PlayPromise']) {
                window['PlayPromise'].then(sdk => {
                    if (progress === 0) {
                        // boolean achievement
                        sdk.unlockAchievement(g.achievementslugs[num - 1]).then(achievement => {
                            fox.trace('Unlocked Achievement '+num);
                            g.achievements[num] = 1;
                        })
                    }
                    if (progress > 0) {
                        // progressive achievement
                        g.achievementprogress[num] += progress;
                        sdk.setAchievementProgress(g.achievementslugs[num - 1],g.achievementprogress[num]).then(achievement => {
                            fox.trace('Achievement '+num+' progress: '+achievement.timesAcquired+'/'+achievement.timesRequired);
                            if (achievement.completed) g.achievements[num] = 1;
                        })
                    }
                })
            }
        }
        // =======================================
        /*
        // original achievement before using SDK
        if (g.achievements[num] === 0) {
            if (progress == 0) {
                fox.popmessage('Achievement '+num, g.hscreenwid, 100);
                fox.trace('New Achievement '+num);
                g.achievements[num] = 1;
            }
            if (progress > 0) {
                fox.popmessage('Ach'+num+' progress:'+progress, g.hscreenwid, 100);
                fox.trace('Achievement '+num+' progress: '+progress);
            }
            common.savehighscore();
        }
         */
    },

    // sync achievements between g.achievements (from saved data via common.savehighscore) and the actual sdk.achievements
    // we do this just to make sure all g.achievements values are recorded
    syncachievements: function() {
        if (window['PlayPromise']) {
            window['PlayPromise'].then(sdk => {
                // sync achievements
                for (let  i = 0; i < g.achievementslugs.length; i++) {
                    let achievement = sdk.achievements.find(achievement => achievement.slug === g.achievementslugs[i]);
                    if (achievement) {
                        // if g.achievements has this achievement completed, but it's not registered in sdk.achievements..
                        if (g.achievements[i+1] === 1 && !achievement.completed) {
                            // .. try to register it again
                            fox.warn('syncing achievement '+achievement.title+' with SDK..');
                            if (achievement.timesRequired > 1) {
                                common.achievement(i+1,achievement.timesRequired);
                            } else {
                                common.achievement(i+1);
                            }
                        } else if (achievement.completed && g.achievements[i+1] === 0) {
                            // if sdk.achievements said this achievement is completed, but g.achievements said it's not..
                            g.achievements[i+1] = 1;
                            fox.warn('syncing achievement '+achievement.title+' with g.achievements');
                            common.savehighscore();
                        }
                        // get g.achievementprogress values from sdk.achievements
                        if (achievement.timesRequired > 1) g.achievementprogress[i+1] = achievement.timesAcquired;
                    } else {
                        fox.alert(g.achievementslugs[i]+' NOT FOUND in sdk.achievements! Make sure the achievement slug is correct!')
                    }
                }
                // console log achievements status
                for (let  i = 0; i < g.achievementslugs.length; i++) {
                    let achievement = sdk.achievements.find(achievement => achievement.slug === g.achievementslugs[i]);
                    if (achievement) {
                        let checkbox = achievement.completed ? '☑ ':'☐ ';
                        let info = achievement.timesRequired > 1 ? ' ('+achievement.timesAcquired+'/'+achievement.timesRequired+')' : '';
                        fox.trace(checkbox+achievement.slug+info);
                    }
                }
                console.log(sdk.achievements);
            })
        }
    },

    // helper function to get achievement progress and put it in g.achievementprogress
    // NOTE: no longer need to use this, since we now have common.syncachievements()
    getachievementprogress: function(num) {
        if (window['PlayPromise']) {
            window['PlayPromise'].then(sdk => {
                sdk.getAchievementProgress(g.achievementslugs[num - 1]).then(progress => { g.achievementprogress[num] = progress });
            })
        }
    },

    sessionscore: function() {
        // CN Arcade SDK =========================
        if (window['PlayPromise']) {
            window['PlayPromise'].then(sdk => {
                sdk.sessionScore(g.score).then(()=> fox.trace('Session score sent'),
                    (error)=> console.warn('Error sending session score!',error))
            });
        }
    },

    savehighscore: function() {
        /*
        // CN Arcade SDK =========================
        if (window['PlayPromise']) {
            window['PlayPromise'].then(sdk => {
                if (!g.errorfetchinghighscore) {
                    // save high score
                    sdk.setHighScore(g.highscore).then(()=> fox.trace('Highscore saved'),
                        (error)=> console.warn('Error saving highscore!',error));
                }

                if (!g.errorfetchingstate) {
                    // save game data
                    sdk.setGameState({
                        batwheelsactivity_mutemusic: g.mutemusic,
                        batwheelsactivity_mutesfx: g.mutesfx,
                        batwheelsactivity_photos: g.photos,
                    }).then(()=> fox.trace('Game data saved'),
                    (error)=> console.warn('Error saving game data!',error));
                }
            });
        }
        */

        // =======================================
        // original savehighscore before using SDK
        fox.ceklocalstorage();
        // must put everything in an object
        let data = {};
        data.highscore = g.highscore;
        data.mutemusic = g.mutemusic;
        data.mutesfx = g.mutesfx;
        data.photos = g.photos;
        localStorage.setItem(g.localsavedata, JSON.stringify(data));

    },

    loadhighscore: function() {
        /*
        let defaults = {
            mutemusic: false,
            mutesfx: false,
            photos: [],
        };

        // CN Arcade SDK =========================
        if (window['PlayPromise']) {
            fox.trace('Loading CN saved data');
            if (!config) {
                fox.alert('Game is not configured with an account');
                fox.alert('No saved data loaded! Using defaults');
                g.highscore = 0;
                g.mutemusic = defaults.mutemusic;
                g.mutesfx = defaults.mutesfx;
                g.photos = defaults.photos;
            }
            window['PlayPromise'].then(sdk => {
                // fetch highscore
                sdk.getHighScore().catch(error => {
                    g.errorfetchinghighscore = true;
                    console.warn('Error fetching highscore! Using defaults', error);
                    return 0;
                }).then(score => {
                    g.highscore = score;
                    fox.trace('Highscore fetched : '+g.highscore);
                });

                // fetch saved game data
                sdk.getGameState().catch(error => {
                    g.errorfetchingstate = true;
                    console.warn('Error fetching saved data! Using defaults', error);
                }).then(state => {
                    let data = state || defaults;
                    g.mutemusic = data.batwheelsactivity_mutemusic || defaults.mutemusic;
                    g.mutesfx = data.batwheelsactivity_mutesfx || defaults.mutesfx;
                    g.photos = data.batwheelsactivity_photos || defaults.photos;
                    if (typeof state === 'undefined' || state == null) {
                        // first time fetching state from API, save the new default values
                        if (!g.errorfetchingstate) common.savehighscore();
                        fox.trace('SDK getGameState returns null. Defaults used & saved.');
                    } else {
                        fox.trace('Saved game data fetched');
                        console.log(state);
                        // sync achievements
                        common.syncachievements();
                    }
                });

                // find out if player has a certain figures
                sdk.getUserFigures().catch(error => {
                    console.warn('Error fetching figures!', error);
                }).then(myfigs => {
                    try {
                        // uncomment below to print out user figures data
                        // fox.trace('Printing user figures data');
                        // fox.trace(myfigs);
                        g.userfigures = fox.clone(myfigs);
                        g.signal.emit('userfigureloaded');
                        fox.trace('User figure data fetched');
                    } catch (e){
                        fox.trace('Error parsing figure data!');
                    }
                });
            });
        }
        */

        // =======================================
        // original loadhighscore before using SDK
        if (localStorage.getItem(g.localsavedata) == null) {
            g.highscore = 0;
            g.mutemusic = g.mutesfx = false;
            g.photos = [];
        } else {
            // load object data and parse it
            let data = JSON.parse(localStorage.getItem(g.localsavedata));
            g.highscore = data.highscore;
            g.mutemusic = data.mutemusic;
            g.mutesfx = data.mutesfx;
            g.photos = data.photos;
        }
    },

    // load special figures by Tags
    loadspecialfigures_byTags : function (figs) {
        fox.trace('Loading special CN figures');
        if (!config) {
            fox.alert('Game hang? Make sure URL is configured with draft account.');
            fox.alert('Or comment out figureIDs & figureTags in globalvar to skip figure loading.');
        }
        if (window['PlayPromise']) {
            window['PlayPromise'].then(sdk => {
                // uncomment below to print out all figures data
                // sdk.getFigures().then(allfigs => {
                //     fox.trace('Printing CN figures array');
                //     for (let i = 0; i < allfigs.length; i++) fox.trace(allfigs[i]);
                // });
                sdk.getFigures(Play.TAG_MATCH.ANY, g.figureTags).then(tagfigs => {
                    // uncomment below to print out all figures with matching Tags
                    // fox.trace('Printing CN figures with matching Tags');
                    // fox.trace(tagfigs);
                    // put result in global variable
                    g.figuresTagsdata = fox.clone(tagfigs);
                    // load figure images
                    let errorloadingfigures = false;
                    for (var i = 0; i < g.figuresTagsdata.length; i++) {
                        try {
                            // workaround to get image from CN, use /published instead of /data
                            // g.loader.add('locked_'+i, g.figuresTagsdata[i].notAcquiredImage.replace('/data', '/published'))
                            // g.loader.add('unlocked_'+i, g.figuresTagsdata[i].acquiredImage.replace('/data', '/published'))
                            // g.loader.add('hint_'+i, g.figuresTagsdata[i].hints.image.replace('/data', '/published'))

                            // CN figure image links (non-protected) for testing
                            // g.figuresTagsdata[i].notAcquiredImage = g.testCNfigureNotAcquiredImage;
                            // g.figuresTagsdata[i].acquiredImage = g.testCNfigureAcquiredImage;
                            // g.figuresTagsdata[i].hints.image = g.testCNfigureHintImage;

                            g.loader.add('locked_'+i, g.figuresTagsdata[i].notAcquiredImage);
                            g.loader.add('unlocked_'+i, g.figuresTagsdata[i].acquiredImage);
                            g.loader.add('hint_'+i, g.figuresTagsdata[i].hints.image);
                        } catch (e) {
                            errorloadingfigures = true;
                            fox.alert('Error loading images for CN figure #'+i);
                        }
                    }
                    // once loaded, add to foxpic so we can call them with with fox.attachpic
                    g.loader.load(() => {
                        if (!errorloadingfigures) fox.trace('Special figure images retrieved from CN');
                        for (var i = 0; i < g.figuresTagsdata.length; i++) {
                            try {
                                g.foxpic['locked_'+i] = g.loader.resources['locked_'+i].texture;
                                g.foxpic['unlocked_'+i] = g.loader.resources['unlocked_'+i].texture;
                                g.foxpic['hint_'+i] = g.loader.resources['hint_'+i].texture;
                            } catch (e) {
                            }
                        }
                        // send special figures loaded signal
                        g.signal.emit('specialfigureloaded');
                    });
                })
            })
        }
    },

    // load special figures by ID
    loadspecialfigures_byID : function (figs) {
        fox.trace('Loading special CN figures');
        if (!config) {
            fox.alert('Game hang? Make sure URL is configured with draft account.');
            fox.alert('Or comment out figureIDs & figureTags in globalvar to skip figure loading.');
        }
        if (window['PlayPromise']) {
            window['PlayPromise'].then(sdk => {
                sdk.getFigures().then(allfigs => {
                    // uncomment below to print out all figures
                    fox.trace('Printing CN figures array');
                    for (let i = 0; i < allfigs.length; i++) fox.trace(allfigs[i]);
                    // retrieve needed figure data
                    for (let i = 0; i < g.figureIDs.length; i++) {
                        for (var f = 0; f < allfigs.length; f++) {
                            if (g.figureIDs[i] === allfigs[f].uuid) {
                                g.figureIDdata[g.figureIDs[i]] = fox.clone(allfigs[f])
                                break;
                            }
                        }
                    }
                    // load figure images
                    let errorloadingfigures = false;
                    for (var i = 0; i < g.figureIDs.length; i++) {
                        if (g.figureIDdata.hasOwnProperty(g.figureIDs[i])) {
                            try {
                                // workaround to get image from CN, use /published instead of /data
                                // g.loader.add('locked_' + g.figureIDs[i], g.figureIDdata[g.figureIDs[i]].notAcquiredImage.replace('/data', '/published'))
                                // g.loader.add('unlocked_' + g.figureIDs[i], g.figureIDdata[g.figureIDs[i]].acquiredImage.replace('/data', '/published'))
                                // g.loader.add('hint_' + g.figureIDs[i], g.figureIDdata[g.figureIDs[i]].hints.image.replace('/data', '/published'))

                                // test CN figure links
                                // g.figureIDdata[g.figureIDs[i]].notAcquiredImage = g.testCNfigureNotAcquiredImage;
                                // g.figureIDdata[g.figureIDs[i]].acquiredImage = g.testCNfigureAcquiredImage;
                                // g.figureIDdata[g.figureIDs[i]].hints.image = g.testCNfigureHintImage;

                                g.loader.add('locked_' + g.figureIDs[i], g.figureIDdata[g.figureIDs[i]].notAcquiredImage);
                                g.loader.add('unlocked_' + g.figureIDs[i], g.figureIDdata[g.figureIDs[i]].acquiredImage);
                                g.loader.add('hint_' + g.figureIDs[i], g.figureIDdata[g.figureIDs[i]].hints.image);
                            } catch (e) {
                                errorloadingfigures = true;
                                fox.alert('Error loading images for CN figure '+g.figureIDs[i]);
                            }
                        }
                    }
                    // once loaded, add to foxpic so we can call them with with fox.attachpic
                    g.loader.load(() => {
                        if (!errorloadingfigures) fox.trace('Special figure images retrieved from CN');
                        for (var i = 0; i < g.figureIDs.length; i++) {
                            try {
                                g.foxpic['locked_' + g.figureIDs[i]] = g.loader.resources['locked_' + g.figureIDs[i]].texture;
                                g.foxpic['unlocked_' + g.figureIDs[i]] = g.loader.resources['unlocked_' + g.figureIDs[i]].texture;
                                g.foxpic['hint_' + g.figureIDs[i]] = g.loader.resources['hint_' + g.figureIDs[i]].texture;
                            } catch (e) {
                            }
                        }
                        // send special figures loaded signal
                        g.signal.emit('specialfigureloaded');
                    });
                })
            })
        }
    },
};