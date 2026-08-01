var start = function (x,y,params) {
    foxmovieclip.call(this,x,y,params);
};
start.prototype = Object.create(foxmovieclip.prototype);
start.prototype.constructor = start;

start.prototype.awaken = function() {
    let t = this;
    t.all = fox.makecontainer(0,0,t);
    g.workspacecontainer = fox.makecontainer(0,0,t.all);
    t.bgcontainer = fox.makecontainer(0,0,g.workspacecontainer);
    g.photobackgroundcontainer = fox.makecontainer(0,0,g.workspacecontainer);
    g.vehiclecontainer = fox.makecontainer(0,0,g.workspacecontainer,true);
    g.vehiclebasecontainer = fox.makecontainer(0,0,g.vehiclecontainer);
    g.vehiclecolorcontainer = fox.makecontainer(0,0,g.vehiclecontainer);
    g.vehiclebeloweyescontainer = fox.makecontainer(0,0,g.vehiclecontainer);
    g.vehicleeyescontainer = fox.makecontainer(0,0,g.vehiclecontainer);
    g.vehiclebelowmouthcontainer = fox.makecontainer(0,0,g.vehiclecontainer);
    g.vehiclemouthcontainer = fox.makecontainer(0,0,g.vehiclecontainer);
    g.vehiclestickercontainer = fox.makecontainer(0,0,g.vehiclecontainer);
    g.waterdropcontainer = fox.makecontainer(0,0,g.workspacecontainer);
    g.bubblecontainer = fox.makecontainer(0,0,g.workspacecontainer);
    g.splashcontainer = fox.makecontainer(0,0,g.workspacecontainer);
    g.vehicleshadowcontainer = fox.makecontainer(0,0,g.workspacecontainer);
    g.toolscontainer = fox.makecontainer(0,0,t.all);
    g.tool = fox.makecontainer(0,0,t.all);
    g.menucontainer = fox.makecontainer(0,340,t.all);
    t.topcontainer = fox.makecontainer(0,0,t.all);
    // background
    t.bg = fox.attachpic('bg', 0, 0, t.bgcontainer, true);
    fox.setanchor(t.bg,0.5,0.75);
    // make buttons
    t.buttonback = fox.attachbutton('button_back',0,0,t, ()=> {
        if (g.menubar.visible) {
            fox.runscene('start',true);
        } else {
            t.showselection();
        }
    });
    // make vehicle selection container
    t.selectcontainer = fox.makecontainer(0,0,t);
    // make photo container
    g.photoblocklayercontainer = fox.makecontainer(0,0,t);
    g.photocontainer = fox.makecontainer(0,0,t);
    // add full screen layer that we can use to block anything behind a photo
    fox.makelayer(g.photoblocklayercontainer);
    // glow
    g.textglowfilter = new PIXI.filters.GlowFilter({distance:14,outerStrength:2,color:0x78a6e1,quality:3});
    g.backgroundglowfilter = new PIXI.filters.GlowFilter({distance:40,outerStrength:2,innerStrength:2,color:0x000000});
    t.toolglowfilter = new PIXI.filters.GlowFilter({distance:30,outerStrength:2});
    // progress bar
    t.progressbarcontainer = fox.makecontainer(0,0,t);
    t.progressbarbg = fox.attachpic('progressbarbg',0,0,t.progressbarcontainer);
    t.progressbarbar = fox.attachpic('progressbarbar',-141,-3,t.progressbarcontainer,{center:false});
    t.progressbarbar.filters = [new PIXI.filters.GlowFilter({distance:8,outerStrength:2})];
    // vehicle zones (to detect progress/completion)
    g.zones['vehicle4'] = [{x1:184, y1:-30,x2:214, y2:0}, {x1:154, y1:-30,x2:184, y2:0}, {x1:154, y1:-61,x2:184, y2:-31}, {x1:123, y1:-30,x2:153, y2:0}, {x1:93, y1:-30,x2:123, y2:0}, {x1:62, y1:-30,x2:92, y2:0}, {x1:-152, y1:-30,x2:-122, y2:0}, {x1:-121, y1:-30,x2:-91, y2:0}, {x1:1, y1:-30,x2:31, y2:0}, {x1:-60, y1:-30,x2:-30, y2:0}, {x1:-183, y1:-30,x2:-153, y2:0}, {x1:32, y1:-30,x2:62, y2:0}, {x1:-30, y1:-30,x2:0, y2:0}, {x1:-91, y1:-30,x2:-61, y2:0}, {x1:-152, y1:-61,x2:-122, y2:-31}, {x1:-121, y1:-61,x2:-91, y2:-31}, {x1:93, y1:-61,x2:123, y2:-31}, {x1:62, y1:-61,x2:92, y2:-31}, {x1:1, y1:-61,x2:31, y2:-31}, {x1:-60, y1:-61,x2:-30, y2:-31}, {x1:-183, y1:-61,x2:-153, y2:-31}, {x1:123, y1:-61,x2:153, y2:-31}, {x1:32, y1:-61,x2:62, y2:-31}, {x1:-30, y1:-61,x2:0, y2:-31}, {x1:-91, y1:-61,x2:-61, y2:-31}, {x1:154, y1:-92,x2:184, y2:-62}, {x1:154, y1:-123,x2:184, y2:-93}, {x1:154, y1:-154,x2:184, y2:-124}, {x1:123, y1:-92,x2:153, y2:-62}, {x1:93, y1:-92,x2:123, y2:-62}, {x1:62, y1:-92,x2:92, y2:-62}, {x1:62, y1:-185,x2:92, y2:-155}, {x1:1, y1:-185,x2:31, y2:-155}, {x1:-60, y1:-185,x2:-30, y2:-155}, {x1:42, y1:-215,x2:72, y2:-185}, {x1:32, y1:-185,x2:62, y2:-155}, {x1:-30, y1:-186,x2:0, y2:-156}, {x1:-91, y1:-185,x2:-61, y2:-155}, {x1:-152, y1:-92,x2:-122, y2:-62}, {x1:-121, y1:-92,x2:-91, y2:-62}, {x1:1, y1:-92,x2:31, y2:-62}, {x1:-60, y1:-92,x2:-30, y2:-62}, {x1:-183, y1:-92,x2:-153, y2:-62}, {x1:32, y1:-92,x2:62, y2:-62}, {x1:-30, y1:-92,x2:0, y2:-62}, {x1:-91, y1:-92,x2:-61, y2:-62}, {x1:-152, y1:-123,x2:-122, y2:-93}, {x1:-121, y1:-123,x2:-91, y2:-93}, {x1:93, y1:-123,x2:123, y2:-93}, {x1:62, y1:-123,x2:92, y2:-93}, {x1:1, y1:-123,x2:31, y2:-93}, {x1:-60, y1:-123,x2:-30, y2:-93}, {x1:123, y1:-123,x2:153, y2:-93}, {x1:32, y1:-123,x2:62, y2:-93}, {x1:-30, y1:-123,x2:0, y2:-93}, {x1:-91, y1:-123,x2:-61, y2:-93}, {x1:93, y1:-154,x2:123, y2:-124}, {x1:62, y1:-154,x2:92, y2:-124}, {x1:1, y1:-154,x2:31, y2:-124}, {x1:-60, y1:-154,x2:-30, y2:-124}, {x1:123, y1:-154,x2:153, y2:-124}, {x1:32, y1:-154,x2:62, y2:-124}, {x1:-30, y1:-154,x2:0, y2:-124}, {x1:-91, y1:-154,x2:-61, y2:-124}, {x1:154, y1:124,x2:184, y2:154}, {x1:185, y1:124,x2:215, y2:154}, {x1:123, y1:155,x2:153, y2:185}, {x1:93, y1:155,x2:123, y2:185}, {x1:62, y1:155,x2:92, y2:185}, {x1:1, y1:155,x2:31, y2:185}, {x1:32, y1:155,x2:62, y2:185}, {x1:-152, y1:124,x2:-122, y2:154}, {x1:-121, y1:124,x2:-91, y2:154}, {x1:93, y1:124,x2:123, y2:154}, {x1:62, y1:124,x2:92, y2:154}, {x1:1, y1:124,x2:31, y2:154}, {x1:-60, y1:124,x2:-30, y2:154}, {x1:-183, y1:124,x2:-153, y2:154}, {x1:123, y1:124,x2:153, y2:154}, {x1:32, y1:124,x2:62, y2:154}, {x1:-30, y1:124,x2:0, y2:154}, {x1:-91, y1:124,x2:-61, y2:154}, {x1:-213, y1:124,x2:-183, y2:154}, {x1:185, y1:94,x2:215, y2:124}, {x1:154, y1:94,x2:184, y2:124}, {x1:154, y1:1,x2:184, y2:31}, {x1:185, y1:1,x2:215, y2:31}, {x1:154, y1:63,x2:184, y2:93}, {x1:185, y1:63,x2:215, y2:93}, {x1:154, y1:32,x2:184, y2:62}, {x1:185, y1:32,x2:215, y2:62}, {x1:123, y1:94,x2:153, y2:124}, {x1:93, y1:94,x2:123, y2:124}, {x1:62, y1:94,x2:92, y2:124}, {x1:-152, y1:1,x2:-122, y2:31}, {x1:-121, y1:1,x2:-91, y2:31}, {x1:93, y1:1,x2:123, y2:31}, {x1:62, y1:1,x2:92, y2:31}, {x1:1, y1:1,x2:31, y2:31}, {x1:-60, y1:1,x2:-30, y2:31}, {x1:-214, y1:1,x2:-184, y2:31}, {x1:-183, y1:1,x2:-153, y2:31}, {x1:123, y1:1,x2:153, y2:31}, {x1:32, y1:1,x2:62, y2:31}, {x1:-30, y1:1,x2:0, y2:31}, {x1:-91, y1:1,x2:-61, y2:31}, {x1:-152, y1:94,x2:-122, y2:124}, {x1:-121, y1:94,x2:-91, y2:124}, {x1:1, y1:94,x2:31, y2:124}, {x1:-60, y1:94,x2:-30, y2:124}, {x1:-183, y1:94,x2:-153, y2:124}, {x1:32, y1:94,x2:62, y2:124}, {x1:-30, y1:94,x2:0, y2:124}, {x1:-91, y1:94,x2:-61, y2:124}, {x1:-213, y1:94,x2:-183, y2:124}, {x1:-152, y1:63,x2:-122, y2:93}, {x1:-121, y1:63,x2:-91, y2:93}, {x1:93, y1:63,x2:123, y2:93}, {x1:62, y1:63,x2:92, y2:93}, {x1:1, y1:63,x2:31, y2:93}, {x1:-60, y1:63,x2:-30, y2:93}, {x1:-183, y1:63,x2:-153, y2:93}, {x1:123, y1:63,x2:153, y2:93}, {x1:32, y1:63,x2:62, y2:93}, {x1:-30, y1:63,x2:0, y2:93}, {x1:-91, y1:63,x2:-61, y2:93}, {x1:-213, y1:63,x2:-183, y2:93}, {x1:-152, y1:32,x2:-122, y2:62}, {x1:-121, y1:32,x2:-91, y2:62}, {x1:93, y1:32,x2:123, y2:62}, {x1:62, y1:32,x2:92, y2:62}, {x1:1, y1:32,x2:31, y2:62}, {x1:-60, y1:32,x2:-30, y2:62}, {x1:-183, y1:32,x2:-153, y2:62}, {x1:123, y1:32,x2:153, y2:62}, {x1:32, y1:32,x2:62, y2:62}, {x1:-30, y1:32,x2:0, y2:62}, {x1:-91, y1:32,x2:-61, y2:62}, {x1:-213, y1:32,x2:-183, y2:62}];
    g.zones['vehicle5'] = [{x1:92, y1:94,x2:122, y2:124}, {x1:61, y1:94,x2:91, y2:124}, {x1:123, y1:94,x2:153, y2:124}, {x1:0, y1:94,x2:30, y2:124}, {x1:31, y1:94,x2:61, y2:124}, {x1:190, y1:64,x2:220, y2:94}, {x1:160, y1:64,x2:190, y2:94}, {x1:98, y1:64,x2:128, y2:94}, {x1:68, y1:64,x2:98, y2:94}, {x1:129, y1:64,x2:159, y2:94}, {x1:189, y1:33,x2:219, y2:63}, {x1:181, y1:2,x2:211, y2:32}, {x1:-96, y1:-60,x2:-66, y2:-30}, {x1:-157, y1:-60,x2:-127, y2:-30}, {x1:-126, y1:-60,x2:-96, y2:-30}, {x1:-188, y1:-60,x2:-158, y2:-30}, {x1:158, y1:33,x2:188, y2:63}, {x1:151, y1:2,x2:181, y2:32}, {x1:-83, y1:-122,x2:-53, y2:-92}, {x1:-52, y1:-122,x2:-22, y2:-92}, {x1:92, y1:-91,x2:122, y2:-61}, {x1:-83, y1:-91,x2:-53, y2:-61}, {x1:-52, y1:-91,x2:-22, y2:-61}, {x1:61, y1:-91,x2:91, y2:-61}, {x1:88, y1:-60,x2:118, y2:-30}, {x1:27, y1:-60,x2:57, y2:-30}, {x1:-34, y1:-60,x2:-4, y2:-30}, {x1:58, y1:-60,x2:88, y2:-30}, {x1:-3, y1:-60,x2:27, y2:-30}, {x1:-65, y1:-60,x2:-35, y2:-30}, {x1:-152, y1:-29,x2:-122, y2:1}, {x1:-121, y1:-29,x2:-91, y2:1}, {x1:93, y1:-29,x2:123, y2:1}, {x1:62, y1:-29,x2:92, y2:1}, {x1:1, y1:-29,x2:31, y2:1}, {x1:-60, y1:-29,x2:-30, y2:1}, {x1:-213, y1:-29,x2:-183, y2:1}, {x1:-182, y1:-29,x2:-152, y2:1}, {x1:32, y1:-29,x2:62, y2:1}, {x1:-29, y1:-29,x2:1, y2:1}, {x1:-91, y1:-29,x2:-61, y2:1}, {x1:-146, y1:64,x2:-116, y2:94}, {x1:-116, y1:64,x2:-86, y2:94}, {x1:7, y1:64,x2:37, y2:94}, {x1:-54, y1:64,x2:-24, y2:94}, {x1:-177, y1:64,x2:-147, y2:94}, {x1:37, y1:64,x2:67, y2:94}, {x1:-24, y1:64,x2:6, y2:94}, {x1:-85, y1:64,x2:-55, y2:94}, {x1:-148, y1:33,x2:-118, y2:63}, {x1:-117, y1:33,x2:-87, y2:63}, {x1:97, y1:33,x2:127, y2:63}, {x1:66, y1:33,x2:96, y2:63}, {x1:5, y1:33,x2:35, y2:63}, {x1:-56, y1:33,x2:-26, y2:63}, {x1:-178, y1:33,x2:-148, y2:63}, {x1:128, y1:33,x2:158, y2:63}, {x1:36, y1:33,x2:66, y2:63}, {x1:-25, y1:33,x2:5, y2:63}, {x1:-87, y1:33,x2:-57, y2:63}, {x1:-155, y1:2,x2:-125, y2:32}, {x1:-125, y1:2,x2:-95, y2:32}, {x1:90, y1:2,x2:120, y2:32}, {x1:59, y1:2,x2:89, y2:32}, {x1:-2, y1:2,x2:28, y2:32}, {x1:-63, y1:2,x2:-33, y2:32}, {x1:-186, y1:2,x2:-156, y2:32}, {x1:120, y1:2,x2:150, y2:32}, {x1:28, y1:2,x2:58, y2:32}, {x1:-33, y1:2,x2:-3, y2:32}, {x1:-94, y1:2,x2:-64, y2:32}, {x1:-216, y1:2,x2:-186, y2:32}];
    g.zones['vehicle3'] = [{x1:87, y1:25,x2:117, y2:55}, {x1:87, y1:-99,x2:117, y2:-69}, {x1:26, y1:-99,x2:56, y2:-69}, {x1:-35, y1:-99,x2:-5, y2:-69}, {x1:57, y1:-99,x2:87, y2:-69}, {x1:-5, y1:-99,x2:25, y2:-69}, {x1:-66, y1:-99,x2:-36, y2:-69}, {x1:87, y1:-68,x2:117, y2:-38}, {x1:26, y1:-68,x2:56, y2:-38}, {x1:-35, y1:-68,x2:-5, y2:-38}, {x1:57, y1:-68,x2:87, y2:-38}, {x1:-5, y1:-68,x2:25, y2:-38}, {x1:-66, y1:-68,x2:-36, y2:-38}, {x1:-111, y1:56,x2:-81, y2:86}, {x1:-80, y1:56,x2:-50, y2:86}, {x1:-50, y1:56,x2:-20, y2:86}, {x1:-127, y1:25,x2:-97, y2:55}, {x1:-96, y1:25,x2:-66, y2:55}, {x1:26, y1:25,x2:56, y2:55}, {x1:-35, y1:25,x2:-5, y2:55}, {x1:57, y1:25,x2:87, y2:55}, {x1:-5, y1:25,x2:25, y2:55}, {x1:-66, y1:25,x2:-36, y2:55}, {x1:-127, y1:-6,x2:-97, y2:24}, {x1:-96, y1:-6,x2:-66, y2:24}, {x1:87, y1:-6,x2:117, y2:24}, {x1:26, y1:-6,x2:56, y2:24}, {x1:-35, y1:-6,x2:-5, y2:24}, {x1:57, y1:-6,x2:87, y2:24}, {x1:-5, y1:-6,x2:25, y2:24}, {x1:-66, y1:-6,x2:-36, y2:24}, {x1:-96, y1:-37,x2:-66, y2:-7}, {x1:87, y1:-37,x2:117, y2:-7}, {x1:26, y1:-37,x2:56, y2:-7}, {x1:-35, y1:-37,x2:-5, y2:-7}, {x1:57, y1:-37,x2:87, y2:-7}, {x1:-5, y1:-37,x2:25, y2:-7}, {x1:-66, y1:-37,x2:-36, y2:-7}];
    g.zones['vehicle2'] = [{x1:128, y1:-142,x2:158, y2:-112}, {x1:48, y1:-142,x2:78, y2:-112}, {x1:-13, y1:-142,x2:17, y2:-112}, {x1:18, y1:-142,x2:48, y2:-112}, {x1:-43, y1:-142,x2:-13, y2:-112}, {x1:136, y1:-111,x2:166, y2:-81}, {x1:106, y1:-111,x2:136, y2:-81}, {x1:44, y1:-111,x2:74, y2:-81}, {x1:-17, y1:-111,x2:13, y2:-81}, {x1:75, y1:-111,x2:105, y2:-81}, {x1:14, y1:-111,x2:44, y2:-81}, {x1:-47, y1:-111,x2:-17, y2:-81}, {x1:106, y1:-80,x2:136, y2:-50}, {x1:44, y1:-80,x2:74, y2:-50}, {x1:-17, y1:-80,x2:13, y2:-50}, {x1:75, y1:-80,x2:105, y2:-50}, {x1:14, y1:-80,x2:44, y2:-50}, {x1:-47, y1:-80,x2:-17, y2:-50}, {x1:-109, y1:-49,x2:-79, y2:-19}, {x1:-78, y1:-80,x2:-48, y2:-50}, {x1:-78, y1:-49,x2:-48, y2:-19}, {x1:136, y1:75,x2:166, y2:105}, {x1:106, y1:75,x2:136, y2:105}, {x1:136, y1:-49,x2:166, y2:-19}, {x1:106, y1:-49,x2:136, y2:-19}, {x1:44, y1:-49,x2:74, y2:-19}, {x1:-17, y1:-49,x2:13, y2:-19}, {x1:75, y1:-49,x2:105, y2:-19}, {x1:14, y1:-49,x2:44, y2:-19}, {x1:-47, y1:-49,x2:-17, y2:-19}, {x1:-109, y1:-18,x2:-79, y2:12}, {x1:-78, y1:-18,x2:-48, y2:12}, {x1:136, y1:-18,x2:166, y2:12}, {x1:106, y1:-18,x2:136, y2:12}, {x1:44, y1:-18,x2:74, y2:12}, {x1:-17, y1:-18,x2:13, y2:12}, {x1:-170, y1:-18,x2:-140, y2:12}, {x1:-139, y1:-18,x2:-109, y2:12}, {x1:167, y1:-18,x2:197, y2:12}, {x1:75, y1:-18,x2:105, y2:12}, {x1:14, y1:-18,x2:44, y2:12}, {x1:-47, y1:-18,x2:-17, y2:12}, {x1:-94, y1:106,x2:-64, y2:136}, {x1:-63, y1:106,x2:-33, y2:136}, {x1:-2, y1:106,x2:28, y2:136}, {x1:-124, y1:106,x2:-94, y2:136}, {x1:-32, y1:106,x2:-2, y2:136}, {x1:-109, y1:75,x2:-79, y2:105}, {x1:-78, y1:75,x2:-48, y2:105}, {x1:44, y1:75,x2:74, y2:105}, {x1:-17, y1:75,x2:13, y2:105}, {x1:-139, y1:75,x2:-109, y2:105}, {x1:75, y1:75,x2:105, y2:105}, {x1:14, y1:75,x2:44, y2:105}, {x1:-47, y1:75,x2:-17, y2:105}, {x1:-170, y1:75,x2:-140, y2:105}, {x1:-109, y1:44,x2:-79, y2:74}, {x1:-78, y1:44,x2:-48, y2:74}, {x1:136, y1:44,x2:166, y2:74}, {x1:106, y1:44,x2:136, y2:74}, {x1:44, y1:44,x2:74, y2:74}, {x1:-17, y1:44,x2:13, y2:74}, {x1:-139, y1:44,x2:-109, y2:74}, {x1:167, y1:44,x2:197, y2:74}, {x1:75, y1:44,x2:105, y2:74}, {x1:14, y1:44,x2:44, y2:74}, {x1:-47, y1:44,x2:-17, y2:74}, {x1:-170, y1:44,x2:-140, y2:74}, {x1:-109, y1:13,x2:-79, y2:43}, {x1:-78, y1:13,x2:-48, y2:43}, {x1:136, y1:13,x2:166, y2:43}, {x1:106, y1:13,x2:136, y2:43}, {x1:44, y1:13,x2:74, y2:43}, {x1:-17, y1:13,x2:13, y2:43}, {x1:-139, y1:13,x2:-109, y2:43}, {x1:167, y1:13,x2:197, y2:43}, {x1:75, y1:13,x2:105, y2:43}, {x1:14, y1:13,x2:44, y2:43}, {x1:-47, y1:13,x2:-17, y2:43}, {x1:-170, y1:13,x2:-140, y2:43}];
    g.zones['vehicle1'] = [{x1:164, y1:13,x2:194, y2:43}, {x1:164, y1:13,x2:194, y2:43}, {x1:164, y1:13,x2:194, y2:43}, {x1:164, y1:13,x2:194, y2:43}, {x1:164, y1:13,x2:194, y2:43}, {x1:164, y1:13,x2:194, y2:43}, {x1:144, y1:-111,x2:174, y2:-81}, {x1:-31, y1:-111,x2:-1, y2:-81}, {x1:-31, y1:-111,x2:-1, y2:-81}, {x1:-31, y1:-111,x2:-1, y2:-81}, {x1:-1, y1:-111,x2:29, y2:-81}, {x1:101, y1:-80,x2:131, y2:-50}, {x1:9, y1:-80,x2:39, y2:-50}, {x1:-52, y1:-80,x2:-22, y2:-50}, {x1:131, y1:-80,x2:161, y2:-50}, {x1:39, y1:-80,x2:69, y2:-50}, {x1:39, y1:-80,x2:69, y2:-50}, {x1:-22, y1:-80,x2:8, y2:-50}, {x1:112, y1:-49,x2:142, y2:-19}, {x1:81, y1:-49,x2:111, y2:-19}, {x1:81, y1:-49,x2:111, y2:-19}, {x1:20, y1:-49,x2:50, y2:-19}, {x1:-41, y1:-49,x2:-11, y2:-19}, {x1:142, y1:-49,x2:172, y2:-19}, {x1:50, y1:-49,x2:80, y2:-19}, {x1:-11, y1:-49,x2:19, y2:-19}, {x1:-72, y1:-49,x2:-42, y2:-19}, {x1:-133, y1:-18,x2:-103, y2:12}, {x1:-103, y1:-18,x2:-73, y2:12}, {x1:112, y1:-18,x2:142, y2:12}, {x1:81, y1:-18,x2:111, y2:12}, {x1:20, y1:-18,x2:50, y2:12}, {x1:-41, y1:-18,x2:-11, y2:12}, {x1:-164, y1:-18,x2:-134, y2:12}, {x1:-164, y1:-18,x2:-134, y2:12}, {x1:142, y1:-18,x2:172, y2:12}, {x1:50, y1:-18,x2:80, y2:12}, {x1:-11, y1:-18,x2:19, y2:12}, {x1:-72, y1:-18,x2:-42, y2:12}, {x1:-118, y1:106,x2:-88, y2:136}, {x1:-88, y1:106,x2:-58, y2:136}, {x1:-26, y1:106,x2:4, y2:136}, {x1:-149, y1:106,x2:-119, y2:136}, {x1:4, y1:106,x2:34, y2:136}, {x1:-57, y1:106,x2:-27, y2:136}, {x1:-133, y1:75,x2:-103, y2:105}, {x1:-103, y1:75,x2:-73, y2:105}, {x1:20, y1:75,x2:50, y2:105}, {x1:-41, y1:75,x2:-11, y2:105}, {x1:-164, y1:75,x2:-134, y2:105}, {x1:50, y1:75,x2:80, y2:105}, {x1:-11, y1:75,x2:19, y2:105}, {x1:-72, y1:75,x2:-42, y2:105}, {x1:-194, y1:75,x2:-164, y2:105}, {x1:-142, y1:44,x2:-112, y2:74}, {x1:-112, y1:44,x2:-82, y2:74}, {x1:103, y1:44,x2:133, y2:74}, {x1:72, y1:44,x2:102, y2:74}, {x1:11, y1:44,x2:41, y2:74}, {x1:-50, y1:44,x2:-20, y2:74}, {x1:-173, y1:44,x2:-143, y2:74}, {x1:133, y1:44,x2:163, y2:74}, {x1:41, y1:44,x2:71, y2:74}, {x1:-20, y1:44,x2:10, y2:74}, {x1:-81, y1:44,x2:-51, y2:74}, {x1:-203, y1:44,x2:-173, y2:74}, {x1:-142, y1:13,x2:-112, y2:43}, {x1:-112, y1:13,x2:-82, y2:43}, {x1:103, y1:13,x2:133, y2:43}, {x1:72, y1:13,x2:102, y2:43}, {x1:11, y1:13,x2:41, y2:43}, {x1:-50, y1:13,x2:-20, y2:43}, {x1:-173, y1:13,x2:-143, y2:43}, {x1:133, y1:13,x2:163, y2:43}, {x1:41, y1:13,x2:71, y2:43}, {x1:-20, y1:13,x2:10, y2:43}, {x1:-81, y1:13,x2:-51, y2:43}, {x1:-203, y1:13,x2:-173, y2:43}];
    // create particle space/limit based on zone (to limit amount of particles made)
    t.particlespacelimit = 2;
    // we create 4 square spaces per zone
    for (let key in g.zones) {
        let zone = g.zones[key];
        g.particlespace[key] = [];
        for (let i = 0; i < zone.length; i++) {
            let z = zone[i];
            let cx = 0.5*(z.x1+z.x2);
            let cy = 0.5*(z.y1+z.y2);
            g.particlespace[key].push({x1:z.x1,y1:z.y1,x2:cx,y2:cy,total:t.particlespacelimit});
            g.particlespace[key].push({x1:cx,y1:z.y1,x2:z.x2,y2:cy,total:t.particlespacelimit});
            g.particlespace[key].push({x1:z.x1,y1:cy,x2:cx,y2:z.y2,total:t.particlespacelimit});
            g.particlespace[key].push({x1:cx,y1:cy,x2:z.x2,y2:z.y2,total:t.particlespacelimit});
        }
    }
    // make vehicle selection
    fox.makelayer(t.selectcontainer,0.5,0x000001,()=> { t.hideselection() });
    let spacing = 150;
    let sx = -296;
    t.select = [];
    t.select[0] = fox.attachbutton('select1',sx,0,t.selectcontainer,()=> t.startgame(1));
    t.select[1] = fox.attachbutton('select2',sx+8+spacing,-20,t.selectcontainer,()=> t.startgame(2));
    t.select[2] = fox.attachbutton('select3',sx+2*spacing,0,t.selectcontainer,()=> t.startgame(3));
    t.select[3] = fox.attachbutton('select4',sx+8+3*spacing,-20,t.selectcontainer,()=> t.startgame(4));
    t.select[4] = fox.attachbutton('select5',sx+4*spacing,0,t.selectcontainer,()=> t.startgame(5));
    for (let i = 0; i < t.select.length; i++) {
        t.select[i].pos = {x:t.select[i].x,y:t.select[i].y};
        t.select[i].visible = false;
    }
    // load SAT polygon data
    common.SATloadpolygondata();
    t.prespawn();
    t.spawn();
};

start.prototype.prespawn = function() {
    let t = this;
    let prespawnitems = ['waterspray'];
    for (let i = 0; i < prespawnitems.length; i++) {
        let it = fox.spawn(prespawnitems[i],-5000,-5000,t);
        it.kill();
    }
    for (let i = 1; i < 40; i++) {
        for (let f = 1; f <= 6; f++) {
            fox.spawn('waterdrop'+f, -5000,-5000, g.waterdropcontainer);
        }
    }
    for (let i = 1; i < 40; i++) {
        for (let f = 1; f <= 4; f++) {
            fox.spawn('bubble'+f, -5000,-5000, g.bubblecontainer);
        }
    }
    fox.killchildren(g.waterdropcontainer);
    fox.killchildren(g.bubblecontainer);
}

start.prototype.init = function() {
    let t = this;
    g.colornow = g.stickernow = g.eyesnow = g.mouthnow = g.backgroundnow = g.hilitenow = -1;
    g.stickercolornow = 0;
    t.udaflashtool = t.noscrubsfx = g.photoblocklayercontainer.visible = false;
    t.toolymin = -240;
    t.toolymaxafterpickup = 170;
    g.workspacecontainer.filters = null;
    fox.stopsound('zwaterspray');
    // unmute all sounds
    if (!g.mute) PIXI.sound.unmuteAll();
    t.cleartools();

    // make bat computer
    if (g.batcomputer) g.batcomputer.kill();
    fox.delayaction(-1,()=> { g.batcomputer = fox.spawn('batcomputer', 20, -180, t.bgcontainer) })

    // make tools
    t.toolbutton = [null];
    t.toolypos = [null,{x:-60,y:300},{x:120,y:280},{x:310,y:270}];
    t.toolbutton[1] = fox.spawn('sudsysponge',t.toolypos[1].x,t.toolypos[1].y,g.toolscontainer);
    t.toolbutton[2] = fox.spawn('hose',t.toolypos[2].x,t.toolypos[2].y,g.toolscontainer);
    t.toolbutton[3] = fox.spawn('foldedtowel',t.toolypos[3].x,t.toolypos[3].y,g.toolscontainer);
    for (let i = 1; i <= 3; i++) {
        t.toolbutton[i].interactive = true;
        t.toolbutton[i].on('pointerdown',()=> { t.picktool(i) })
    }
    g.waterdropcontainer.removeChildren();
    g.bubblecontainer.removeChildren();
    // minimum value for the progress to be considered done
    t.progressdonevaluearray = [null,0.9,0.9,0.7];

    // create vehicle
    g.vehiclenow = g.vehiclenow || 1;
    g.vehiclename = 'vehicle'+g.vehiclenow;
    g.vehicle = fox.spawn(g.vehiclename,0,0,g.vehiclebasecontainer);
    g.vehicledirt = fox.spawn(g.vehiclename+'dirt',0,0,g.vehiclebasecontainer);
    // add default sticker (NOTE: default sticker has it's own color, so we don't need to tint)
    fox.spawn(g.vehiclename+'sticker'+g.stickernow,0,0,g.vehiclestickercontainer);
    // add zone for this vehicle
    g.vehicle.zone = g.zones[g.vehiclename];
    g.vehicle.particlespace = g.particlespace[g.vehiclename];
    g.vehicle.zonedone = new Array(g.zones[g.vehiclename].length).fill(false);
    // add SAT polygons array for this vehicle
    g.vehicle.SATpoly = [];
    for (let i = 1; i < 30; i++) {
        let key = g.vehiclename+i;
        if (g.SATpolygon.hasOwnProperty(key)) {
            g.vehicle.SATpoly.push(fox.createSATpolygon(g.SATpolygon[key]));
        }
    }
    g.vehiclecontainer.y = g.vehicleshadowcontainer.y = g.waterdropcontainer.y = g.bubblecontainer.y = g.splashcontainer.y = g.vehiclecontaineroffset[g.vehiclenow];
    t.randomexpression('eyes');
    t.randomexpression('mouth');
    t.bd = t.blinkdelay = 60;
    t.ed = t.eyeswitchdelay = 3; // based on how many blinks
    t.md = t.mouthswitchdelay = 300;
    // prepare menu bar
    g.menubar = fox.spawn('menubar',0,40,g.menucontainer);
    g.menubar.visible = false;
    t.buttonback.visible = true;

    // draw SAT polygons?
    if (g.drawSATpoly === 1) for (let i = 0; i < g.vehicle.SATpoly.length; i++) fox.drawSATpolygon(g.vehicle.SATpoly[i],g.vehiclecontainer);

    t.flashtool();

    if (g.skipclean === 1) {
        g.skipclean = g.vehicledirt.alpha = 0;
        t.beginstep(4);
    }
}

start.prototype.spawn = function() {
    let t = this;
    g.start = this;
    t.state = g.stepnow = t.progressbarcontainer.alpha = 0;
    // hide selection
    t.selectcontainer.visible = false;
    for (let i = 0; i < t.select.length; i++) {
        t.select[i].visible = false;
    }
    if (g.showgallery) {
        // just showing gallery
        fox.spawn('gallery',0,0,g.photocontainer);
    } else {
        t.init();
    }
    fox.fadescreen();
    t.resize();
};

start.prototype.showselection = function() {
    let t = this;
    t.selectcontainer.visible = true;
    for (let i = 0; i < t.select.length; i++) {
        let it = t.select[i];
        it.x = it.pos.x+(fox.isEven(i) ? -80 : 80);
        it.y = it.pos.y+(fox.isEven(i) ? 200 : -200);
        fox.delayaction(i*150,()=> {
            it.visible = true;
            fox.tweenmove(it,it.position,it.pos,800,0,g.easing.outElastic());
        })
    }
    // mute all sounds
    PIXI.sound.muteAll();
}

start.prototype.hideselection = function() {
    let t = this;
    for (let i = 0; i < t.select.length; i++) {
        let it = t.select[i];
        it.visible = false;
    }
    t.selectcontainer.visible = false;
    // unmute all sounds
    if (!g.mute) PIXI.sound.unmuteAll();
}

start.prototype.startgame = function(num) {
    g.vehiclenow = num;
    g.showgallery = false;
    fox.playsound('zvo'+num+'start');
    fox.runscene('start');
}

start.prototype.loop = function() {
    let t = this;
    if (!t.selectcontainer.visible) {
        if (t.state === 1) {
            // bubbles
            t.movetool();
            t.makebubbles();
            t.cekprogress();
        } else if (t.state === 2) {
            // water
            t.movetool();
            t.spraywater();
            t.cekprogress();
        } else if (t.state === 3) {
            // dryer
            t.movetool();
            t.toweldry();
            t.cekprogress();
        }
        if (t.state >= 0 && t.state <= 3) {
            t.cekexpressions();
        }
    }
}

start.prototype.cekexpressions = function() {
    let t = this;
    if (g.vehicleeyescontainer.children.length === 0) return;
    // eyes blink
    t.bd--;
    if (t.bd <= 0) {
        t.bd = t.blinkdelay+fox.random(100);
        t.ed--;
        if (t.ed <= 0) {
            // switch eyes
            t.randomexpression('eyes');
            t.ed = t.eyeswitchdelay+fox.random(2);
        } else {
            // blink eyes
            let eyes = g.vehicleeyescontainer.children[0];
            fox.tweenscale(eyes, eyes.scale, {x: 1, y: 0.1}, 60, 0, g.easing.inOutSine());
            fox.delayaction(120, () => {
                if (g.vehicleeyescontainer.children.length > 0) {
                    let eyes = g.vehicleeyescontainer.children[0];
                    if (eyes.scale.y < 1) fox.tweenscale(eyes, eyes.scale, {x: 1, y: 1}, 60, 0, g.easing.inOutSine());
                }
            })
        }
    }
    // mouth switch
    t.md--;
    if (t.md <= 0) {
        t.md = t.mouthswitchdelay+fox.random(50);
        t.randomexpression('mouth');
    }
}

start.prototype.randomexpression = function(item, index = 999) {
    let t = this;
    // eyes
    let container = g['vehicle'+item+'container'];
    common.clearcontainer(container);
    // spawn item
    let idx = index < 999 ? index : fox.getrandom(g[g.vehiclename+'expression'+item],g.vehiclename+'expression'+item);
    let name = g.vehiclename+item+idx;
    let xx = g.vehicle.x+g[name].x;
    let yy = g.vehicle.y+g[name].y;
    let it = fox.spawn(name, xx, yy, container);
    fox.tweenscale(it,{x:1,y:0.001},{x:1,y:1},300,0,g.easing.outElastic());
    // add glow
    let colorindex = g.colornow < 0 ? 8 : g.colornow;
    let tintcolor = g[g.vehiclename + 'tint'][colorindex];
    let tintcolorbelow = g[g.vehiclename + 'tintbelow'][colorindex];
    // exception for Red & Batwing (these two have different tint for eyes/mouth for default)
    if (g.vehiclenow === 2 && item === 'eyes' && g.colornow < 0) { tintcolor = 0x16ba04; tintcolorbelow = 0x15A604; }
    if (g.vehiclenow === 5 && item === 'eyes' && g.colornow < 0) { tintcolor = 0xa71ad5; tintcolorbelow = 0xa71ad5; }
    common.addglow(g['vehicle'+item+'container'],g['vehiclebelow'+item+'container'],tintcolor,tintcolorbelow);
}

start.prototype.makesparkle = function(xx,yy) {
    let t = this;
    let it = fox.spawn('sparkle', xx,yy, g.vehiclecontainer);
    fox.blendmode(it);
    let tw = fox.tweenrotation(it, 0, 90, 1400, 0);
    tw.once('end', () => {
        it.kill()
    });
    fox.tweenalpha(it, 1, 0, 1400);
    fox.tweenscale(it, 0.1, 1, 700, 0, g.easing.inOutSine(), 1, true);
}

start.prototype.cleartools = function() {
    let t = this;
    t.state = 0;
    fox.killchildren(g.tool);
    g.tool.visible = false;
    t.spray = t.toolpic = null;
}

start.prototype.beginstep = function(step) {
    let t = this;
    if (g.stepnow === step) return;
    g.stepnow = step;
    t.stepdone = t.udaflashtool = false;
    t.worktime = 0;
    t.maxworktime = 180;
    t.toolymax = 250
    t.nextprogressVO = [0.4];
    // clear zone done
    g.vehicle.zonedone = new Array(g.zones[g.vehiclename].length).fill(false);
    if (step === 1) {
        // make swingingitem
        t.toolpic = fox.spawn('swingingitem', 0, 0, g.tool);
        t.tooltargetoffset = {x:0, y:0};
    } else if (step === 2) {
        t.cleartools();
        // make water spray
        t.spray = fox.spawn('waterspray', -24, -2, g.tool);
        t.spray.angle = -5;
        fox.blendmode(t.spray, 1);
        t.spray.visible = false;
        // make water gun
        t.toolpic = fox.spawn('watergun', 0, 0, g.tool);
        fox.setanchor(t.toolpic, 0.3, 0.085);
        t.tooltargetoffset = {x: -80, y: -4};
        // fox.drawcrosshair(g.tool,t.tooltargetoffset.x,t.tooltargetoffset.y);
    } else if (step === 3) {
        t.cleartools();
        // make towel
        t.toolpic = fox.spawn('swingingitem', 0, 0, g.tool);
        t.tooltargetoffset = {x:0, y:0};
        fox.gotoandstop(t.toolpic.pic,0);
    } else if (step === 4) {
        t.cleartools();
        // start customizing
        fox.remove(t.toolbutton[1]);
        fox.remove(t.toolbutton[2]);
        fox.remove(t.toolbutton[3]);
        // set default expression
        g.eyesnow = g[g.vehiclename+'cleaneyes'];
        g.mouthnow = g[g.vehiclename+'cleanmouth'];
        t.randomexpression('eyes', g.eyesnow);
        t.randomexpression('mouth', g.mouthnow);
        g.menubar.visible = true;
        fox.tweenY(g.menubar,40,0,700,0,g.easing.outSine());
        let tw = fox.tweenalpha(g.menubar,0,1,300,0);
        tw.once('end',()=> {
            // hide progress bar
            fox.tweenalpha(t.progressbarcontainer,t.progressbarcontainer.alpha,0,300);
            // show finger
            t.finger = fox.spawn('fingertap', g.firsttabposition, g.menucontainer.y+g.menubar.tabpos+20, t.topcontainer);
        })
        t.state = 4;
    }
}

start.prototype.flashtool = function() {
    let t = this;
    if (g.stepnow <= 3) {
        // flash next tool button
        let b = t.toolbutton[g.stepnow + 1];
        fox.tween(t.toolglowfilter, {distance: 20, outerStrength: 2}, {
            distance: 0,
            outerStrength: 0
        }, 500, 0, g.easing.linear(), -1, true);
        b.filters = [t.toolglowfilter];
        // show finger
        t.finger = fox.spawn('fingertap', b.x, b.y - 20, t.topcontainer);
        t.finger.alpha = 0;
        fox.delayaction(-60, () => {
            if (g.stepnow <= 3) t.finger.alpha = 1
        });
    }
}

start.prototype.picktool = function(num) {
    let t = this;
    if (num > g.stepnow+1) return;
    t.beginstep(g.stepnow+1);
    g.tool.x = t.toolbutton[g.stepnow].x;
    g.tool.y = t.toolbutton[g.stepnow].y;
    g.tool.visible = true;
    t.resetspacelimit();
    fox.tweenremoveallfrom(t.toolglowfilter);
    t.toolbutton[g.stepnow].visible = t.toolbutton[g.stepnow].interactive = false;
    fox.playbuttonsfx();
    if (t.finger) t.finger.kill();
    if (g.stepnow <= 3) {
        if (t.state === 0 && g.stepnow === 1) t.state = 1;
        if (t.state === 0 && g.stepnow === 2) t.state = 2;
        if (t.state === 0 && g.stepnow === 3) { t.state = 3; fox.stopsound('zwaterspray') }
        // reset progress bar
        t.progressbarxs = 0;
        t.progressbaraccel = 0.8;
        t.progressbarconvert = 0.4;
        t.progressbarbar.scale.x = 0.01;
        fox.tweenremoveallfrom(t.progressbarcontainer);
        if (t.progressbarcontainer.alpha > 0) fox.tweenalpha(t.progressbarcontainer,t.progressbarcontainer.alpha,0,200);
        t.progressdonevalue = t.progressdonevaluearray[g.stepnow];
    }
}

start.prototype.cekprogress = function() {
    let t = this;
    if (t.stepdone) return;
    let total = 0
    for (let f = 0; f < g.vehicle.zonedone.length; f++) {
        if (g.vehicle.zonedone[f]) total++;
    }
    // progress
    let realprogress = (total/g.vehicle.zonedone.length)/t.progressdonevalue;
    let workprogress = Math.min(1,t.worktime/t.maxworktime);
    t.progress = Math.max(0.01,Math.min(1,Math.max(realprogress,workprogress)));
    // t.progressbarbar.scale.x = t.progressbarbar.scale.x+(t.progress-t.progressbarbar.scale.x)/8;

    // VO
    if (t.nextprogressVO.length > 0 && t.progress > t.nextprogressVO[0]) {
        fox.say('zvo'+g.vehiclenow+'progress'+fox.getrandom(g.cleanVO['vehicle'+g.vehiclenow],'vehicle'+g.vehiclenow+'progressVO'));
        t.nextprogressVO.shift();
    }

    t.progressbarxs = (t.progressbarxs*t.progressbaraccel)+(t.progress-t.progressbarbar.scale.x)*t.progressbarconvert;
    t.progressbarbar.scale.x += t.progressbarxs;

    t.stepdone = (t.progress === 1);
    // show progress bar
    if (t.progress > 0.01 && t.progressbarcontainer.alpha === 0) {
        fox.tweenremoveallfrom(t.progressbarcontainer);
        t.progressbarcontainer.alpha = 0.1;
        fox.tweenalpha(t.progressbarcontainer,t.progressbarcontainer.alpha,1,500);
        fox.tweenY(t.progressbarcontainer,t.progressbarpos-20,t.progressbarpos,400,0,g.easing.outSine());
    }

    // remove dirt based on progress
    if (g.stepnow === 1 && t.progress > 0.01) {
        g.vehicledirt.alpha = 1-t.progress;
    }

    if (t.stepdone && !t.udaflashtool) {
        // done with this step
        fox.brightfade(t.progressbarcontainer);
        fox.playsound('zdone');
        // VO
        fox.delayaction(500,()=> { fox.say('zvo'+g.vehiclenow+'clean'+fox.getrandom(g.cleanVO['vehicle'+g.vehiclenow],'vehicle'+g.vehiclenow+'cleanVO')) })
        if (g.stepnow === 1) {
            // flash next tool
            t.flashtool();
            t.udaflashtool = true;
        } else if (g.stepnow === 2) {
            // remove bubbles slowly
            t.removefx(g.bubblecontainer);
            // flash next tool
            t.flashtool();
            t.udaflashtool = true;
        } else if (g.stepnow === 3) {
            // vehicle clean, make sparkles
            for (let i = 0; i < 40; i++) {
                let xx = -200+fox.random(400);
                let yy = -120+fox.random(240);
                if (t.cekhitvehicle(xx, yy)) {
                    fox.delayaction(i * 300, () => { t.makesparkle(xx, yy) })
                }
            }
            // remove all water drops
            t.removefx(g.waterdropcontainer);
            // make sure there's no bubbles left
            t.removefx(g.bubblecontainer);
            // begin step 4
            t.beginstep(4);
        }
    }
}

// remove all children from container slowly (for bubbles/waterdrops)
start.prototype.removefx = function(container) {
    let t = this;
    for (let i = 0; i < container.children.length; i++) {
        let it = container.children[i];
        fox.tweenremoveallfrom(it);
        let tw = fox.tweenalpha(it,it.alpha,0,1000,10+fox.random(500));
        tw.once('end',()=> it.kill())
    }
}

start.prototype.resetspacelimit = function() {
    let t = this;
    for (let  i = 0; i < g.vehicle.particlespace.length; i++) {
        let r = g.vehicle.particlespace[i];
        r.total = t.particlespacelimit;
    }
    return false;
}

start.prototype.cekspacelimit = function(px,py) {
    let t = this;
    for (let  i = 0; i < g.vehicle.particlespace.length; i++) {
        let r = g.vehicle.particlespace[i];
        if (fox.pointinrectangle(px,py,r.x1,r.y1,r.x2,r.y2)) {
            if (r.total > 0) {
                r.total--;
                return true;
            }
        }
    }
    return false;
}

start.prototype.makebubbles = function() {
    let t = this;
    if (!common.pointermoved()) return;
    // get cursor position
    let tx = g.tool.x + t.tooltargetoffset.x;
    let ty = g.tool.y + t.tooltargetoffset.y - g.vehiclecontaineroffset[g.vehiclenow];
    // check if cursor is touching vehicle
    if (!t.cekhitvehicle(tx, ty)) return;
    // track how long player has been working
    t.worktime++;
    // scrubbing sfx
    t.scrubsfx('zscrub',200);
    // check if we can still make bubbles in this space (because we have a limit)
    let limit = t.cekspacelimit(tx,ty);
    if (limit > 0) {
        // create bubbles
        for (let i = 0; i < 2; i++) {
            let p = fox.getrandompointincircle(20);
            let xx = tx + p.x;
            let yy = ty + p.y;
            if (t.cekhitvehicle(xx, yy)) {
                // add bubble
                let it = fox.spawn('bubble' + (1 + fox.random(3)), xx, yy, g.bubblecontainer);
                it.dripping = false;
                fox.setscale(it, fox.random(100) > 10 ? 0.3 + 0.1 * fox.random(5) : 0.7 + 0.1 * fox.random(3))
                it.angle = fox.random(360);
                it.alpha = 0.5+0.1*fox.random(5);
                // check if this bubble is inside any of the zones
                for (let f = 0; f < g.vehicle.zone.length; f++) {
                    if (!g.vehicle.zonedone[f]) {
                        // mark this zone as done (for progress/completion)
                        let r = g.vehicle.zone[f];
                        if (fox.pointinrectangle(xx, yy, r.x1, r.y1, r.x2, r.y2)) {
                            g.vehicle.zonedone[f] = true;
                        }
                    }
                }
            }
        }
        // add dripping animation
        if (g.bubblecontainer.children.length > 10) {
            // we only add animation randomly to 4 of the last 20 bubble particles
            for (let i = 0; i < 2; i++) {
                let ran = g.bubblecontainer.children.length - 10 + fox.random(9);
                let it = g.bubblecontainer.children[ran];
                if (!it.bubbleslid) {
                    fox.tweenY(it, it.y, it.y + 1 + fox.random(2), 300 + fox.random(500), fox.random(100) > 70 ? 0 : 300 + fox.random(700), g.easing.outSine());
                    it.bubbleslid = true;
                }
            }
        }
    }
}

start.prototype.spraywater = function() {
    let t = this;
    if (!common.pointermoved()) return;
    // get cursor position
    let tx = g.tool.x + t.tooltargetoffset.x;
    let ty = g.tool.y + t.tooltargetoffset.y - g.vehiclecontaineroffset[g.vehiclenow];
    // check if cursor is touching vehicle
    if (!t.cekhitvehicle(tx, ty)) return;
    // make splashes
    for (let i = 0; i < 10; i++) {
        let sx = tx-fox.random(30);
        let sy = ty-25+fox.random(50);
        if (t.cekhitvehicle(sx, sy)) {
            let it = fox.spawn('splash' + (1 + fox.random(4)), sx, sy, g.splashcontainer)
            if (fox.random(100) > 50) it.flipX = -1;
            it.angle = 20+fox.random(30);
            fox.setscale(it,0.8+0.1*fox.random(20))
            it.kill(-2);
        }
    }
    // track how long player has been working
    t.worktime++;
    if (g.mousey < t.toolymax+30) {
        // show spray
        if (!t.spray.visible) {
            t.spray.visible = true;
            fox.playloop('zwaterspray');
        }
        // remove bubbles
        for (let i = g.bubblecontainer.children.length-1; i >= 0; i--) {
            let it = g.bubblecontainer.children[i];
            let dx = it.x-tx;
            let dy = it.y-ty;
            if (dx*dx+dy*dy < 800) {
                if (fox.random(100) > 50) {
                    if (fox.random(100) > 60) {
                        // remove instantly
                        it.kill();
                    } else {
                        // fade out
                        if (!it.alphafade) {
                            let tw = fox.tweenalpha(it, it.alpha, 0, 100 + fox.random(300), fox.random(100));
                            tw.once('end', () => it.kill())
                            it.alphafade = true;
                        }
                    }
                } else {
                    // slide down
                    if (!it.dripping) {
                        let tw = fox.tweenY(it, it.y, it.y + 2 + fox.random(5), 200 + fox.random(300), 0, g.easing.outSine());
                        tw.once('end',()=> it.kill())
                        it.dripping = true;
                    }
                }
            }
        }

        // check if we can still spray in this space (because we have a limit)
        let limit = t.cekspacelimit(tx,ty);
        if (limit > 0) {
            // create water drops
            for (let i = 0; i < 2; i++) {
                let p = fox.getrandompointincircle(20);
                let wx = tx + p.x;
                let wy = ty + p.y;
                if (t.cekhitvehicle(wx, wy)) {
                    let it = fox.spawn('waterdrop' + (1 + fox.random(5)), wx, wy, g.waterdropcontainer);
                    it.dripping = false;
                    it.alpha = 0.2 + 0.1 * fox.random(8);
                    fox.setscale(it, fox.random(100) > 50 ? 0.3+0.1*fox.random(7) : 0.6+0.1*fox.random(4))
                    // check if this drop is inside any of the zones
                    for (let f = 0; f < g.vehicle.zone.length; f++) {
                        if (!g.vehicle.zonedone[f]) {
                            let r = g.vehicle.zone[f];
                            if (fox.pointinrectangle(wx, wy, r.x1, r.y1, r.x2, r.y2)) g.vehicle.zonedone[f] = true;
                        }
                    }
                }
            }
        }

        // add dripping animation
        if (g.waterdropcontainer.children.length > 20) {
            // we only add animation randomly to 5 of the last 20 foam particles
            for (let i = 0; i < 5; i++) {
                let ran = g.waterdropcontainer.children.length - 20 + fox.random(19);
                let it = g.waterdropcontainer.children[ran];
                if (!it.dripping) {
                    fox.tweenY(it, it.y, it.y + 1 + fox.random(4), 300 + fox.random(500), fox.random(100) > 70 ? 0 : 300 + fox.random(700), g.easing.outSine());
                    it.dripping = true;
                }
            }
        }
    } else {
        // hide spray
        if (t.spray.visible) {
            t.spray.visible = false;
            fox.stopsound('zwaterspray');
        }
    }
}

start.prototype.toweldry = function() {
    let t = this;
    if (!common.pointermoved()) return;
    // get cursor position
    let tx = g.tool.x + t.tooltargetoffset.x;
    let ty = g.tool.y + t.tooltargetoffset.y - g.vehiclecontaineroffset[g.vehiclenow];
    // check if cursor is touching vehicle
    if (!t.cekhitvehicle(tx, ty)) return;
    // scrubbing sfx
    t.scrubsfx('ztowel',250);
    // track how long player has been working
    t.worktime++;
    if (g.mousey < t.toolymax+30) {
        // remove water drops
        let xx = g.tool.x + t.tooltargetoffset.x;
        let yy = g.tool.y + t.tooltargetoffset.y - g.vehiclecontaineroffset[g.vehiclenow];
        for (let i = g.waterdropcontainer.children.length-1; i >= 0; i--) {
            let it = g.waterdropcontainer.children[i];
            let dx = it.x-xx;
            let dy = it.y-yy;
            if (dx*dx+dy*dy < 400) it.kill();
        }
        // cek done
        for (let f = 0; f < g.vehicle.zone.length; f++) {
            if (!g.vehicle.zonedone[f]) {
                let r = g.vehicle.zone[f];
                if (fox.pointinrectangle(xx, yy, r.x1, r.y1, r.x2, r.y2)) g.vehicle.zonedone[f] = true;
            }
        }
    }
    // towel animation
    if (t.toolmovedistance2 > 100 && !t.toolpic.pic.playing) {
        fox.gotoandplay(t.toolpic.pic,1);
    }
}

start.prototype.scrubsfx = function(sfx,lifespan) {
    let t = this;
    if (t.toolmovedistance2 > 150 && !t.noscrubsfx) {
        fox.playsound(sfx)
        t.noscrubsfx = true;
        fox.delayaction(lifespan, () => { t.noscrubsfx = false },true)
    }
}

start.prototype.movetool = function() {
    let t = this;
    t.toololdx = g.tool.x;
    t.toololdy = g.tool.y;
    g.tool.x = g.mousex;
    g.tool.y = Math.min(t.toolymax,Math.max(t.toolymin,g.mousey));
    t.tooldx = g.tool.x-t.toololdx;
    t.tooldy = g.tool.y-t.toololdy;
    t.toolmovedistance2 = t.tooldx*t.tooldx+t.tooldy*t.tooldy;
    // adjust toolymax after tool is picked up
    t.toolymax = Math.min(t.toolymax,Math.max(g.tool.y,t.toolymaxafterpickup));
}

start.prototype.cekhitvehicle = function(xx,yy) {
    let t = this;
    for (let i = 0; i < g.vehicle.SATpoly.length; i++) {
        if (SAT.pointInPolygon(new SAT.Vector(xx,yy),g.vehicle.SATpoly[i])) {
            return true;
        }
    }
    return false;
}

// adjustments when window resized
start.prototype.resize = function() {
    let t = this;
    // adjust t.all container and get the scale
    t.all.width = g.screenwid;
    g.ska = t.all.scale.y = t.all.scale.x;
    fox.setscale(t.selectcontainer, g.ska);
    fox.setscale(g.photocontainer, g.ska);
    t.x = g.hscreenwid;
    t.y = g.hscreenhei;
    // button
    t.buttonback.x = Math.max(-360, -g.hscreenwid+g.buttonmargin*g.ska)
    t.buttonback.y = Math.max(-200,-g.hscreenhei+g.buttonmargin*g.ska)
    fox.setscale(t.buttonback,g.ska);
    // progress bar
    t.progressbarcontainer.y = t.progressbarpos = -g.hscreenhei+60;
    fox.trace('start resized');
}