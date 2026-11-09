/* games/dunia-cinema-pixi.js — the PixiJS half of DuniaCinema (loaded by dunia-cinema.js only when the page has PIXI).
 * One post-process filter on the game's stage, the in-scene steps of the low-poly lighting reel that a DOM overlay
 * cannot do because they need the game's own pixels (tier 2 all of it, tier 1 the grade only, tier 0 off):
 *   bloom      bright pixels (sun, lamps, sparks, glowing items) bleed a soft glow (bright-pass on a 16-tap spiral)
 *   form       every flat-filled region reads as a lit solid: its edge toward the key light warms, the far edge falls
 *              toward the fill (colour distance on the same taps, so no extra cost)
 *   shadow     the scene's big layers cast a soft shadow away from the light onto the layers behind (one pass each, max 4)
 *   key/fill   lit side a little warmer and brighter, the far side a little cooler (the light's direction, per theme)
 *   depth fog  a thin haze at the horizon band, so the far scene sits back and the action stands forward
 *   DoF        a slight tilt-shift on the very top and bottom edges only (it ate detail when it reached further)
 *   vignette   frames the action
 * Plus DuniaCinema.rim(sprite): a one-sided rim light on a character, the light's colour on the edge that faces it
 * (never a ring all round: that would be the white sticker outline the owner rejected).
 * The page's app is found by name (a top-level `let app` is visible to other classic scripts through an indirect eval),
 * so no game file changes. Every filter renders at the game's own resolution. A slow device or reduced motion
 * keeps the grade and drops the costly taps.
 */
;(function (W) {
  'use strict'
  var P = W.PIXI
  if (!P || !P.Filter || !P.GlProgram || !W.DuniaCinema) return

  var VERT = [
    'in vec2 aPosition;out highp vec2 vTextureCoord;out highp vec2 vScreen;',
    'uniform vec4 uInputSize;uniform vec4 uOutputFrame;uniform vec4 uOutputTexture;',
    'void main(void){',
    '  vec2 position=aPosition*uOutputFrame.zw+uOutputFrame.xy;',
    '  position.x=position.x*(2.0/uOutputTexture.x)-1.0;',
    '  position.y=position.y*(2.0*uOutputTexture.z/uOutputTexture.y)-uOutputTexture.z;',
    '  gl_Position=vec4(position,0.0,1.0);',
    '  vTextureCoord=aPosition*(uOutputFrame.zw*uInputSize.zw);',
    '  vScreen=aPosition;',
    '}'
  ].join('\n')
  var FRAG = [
    'in highp vec2 vTextureCoord;in highp vec2 vScreen;out vec4 finalColor;',
    'uniform sampler2D uTexture;uniform highp vec4 uInputSize;uniform highp vec4 uInputClamp;',
    'uniform float uBloom;uniform float uDof;uniform float uForm;uniform float uRes;uniform highp vec2 uDir;uniform vec3 uFillD;uniform vec3 uKeyT;uniform float uSide;uniform vec3 uKey;uniform vec3 uFill;uniform vec3 uHaze;uniform float uFog;',
    'vec3 bright(vec3 c){float l=dot(c,vec3(0.299,0.587,0.114));return c*smoothstep(0.82,1.0,l)*(0.4+0.6*smoothstep(0.1,0.5,max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b))+step(0.97,l)));}',
    'vec4 tx(vec2 q){return texture(uTexture,clamp(q,uInputClamp.xy,uInputClamp.zw));}',
    'void main(void){',
    '  vec2 px=uInputSize.zw;vec4 src=tx(vTextureCoord);vec3 col=src.rgb;',
    // DoF: blur grows toward the top and bottom edges, the middle 60% stays sharp
    '  float d=smoothstep(0.38,0.5,abs(vScreen.y-0.52))*uDof;',
    '  if(d>0.01){vec3 acc=col;for(int i=0;i<8;i++){float a=float(i)*0.7853982;acc+=tx(vTextureCoord+vec2(cos(a),sin(a))*px*uRes*3.0*d).rgb;}col=mix(col,acc/9.0,d);}',
    // bloom
    '  if(uBloom>0.0){vec3 b=vec3(0.0);vec2 g=vec2(0.0);float e=0.0;',
    // 16 taps on a Vogel disk (golden-angle spiral, every tap its own radius 2-8.5 px, the spiral turned per pixel):
    // two fixed rings drew a second contour round every shape, a wide sparse spiral drew fingerprint streaks
    '    float jr=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)*6.2831853;',
    '    for(int i=0;i<16;i++){float fi=float(i);float a=fi*2.3999632+jr;float r=2.0+6.5*sqrt((fi+0.5)/16.0);vec2 d=vec2(cos(a),sin(a));',
    '      vec3 s1=tx(vTextureCoord+d*px*uRes*r).rgb;b+=bright(s1);',
    '      float d1=min(length(s1-src.rgb),0.6);g+=d*d1;e+=d1;}',
    '    col+=b/10.0*uBloom;',
    // form: every flat-filled region reads as a lit solid (the paper-cut / low-poly look of the reference). The edge of a
    // region lies toward g, so the region's edge that faces the key light warms, the far edge falls toward the fill and
    // a thin crease darkens where two regions meet. Colour distance, not luminance, so a dark shape never reads as a hole
    '    g/=2.2;e/=6.4;float lit=clamp(dot(g,uDir),-1.0,1.0);',
    '    col*=mix(vec3(1.0),uFillD,clamp(-lit,0.0,1.0)*uForm);col+=col*uKeyT*clamp(lit,0.0,1.0)*uForm;',
    '    col*=1.0-clamp(e-0.05,0.0,0.4)*uForm*0.15;}',
    // key + fill: across the frame from the lit side to the far side
    '  float k=uSide>0.0?1.0-vScreen.x:vScreen.x;k=k*0.7+(1.0-vScreen.y)*0.3;',
    '  col*=mix(uFill,uKey,k);',
    // depth fog at the horizon band
    '  float f=(smoothstep(0.18,0.4,vScreen.y)*(1.0-smoothstep(0.42,0.62,vScreen.y)))*uFog;col=mix(col,uHaze,f);',
    // grade: a little contrast (no vibrance: it turned the hills neon, a look the owner withdrew)
    '  col=(col-0.5)*1.04+0.5;',
    // vignette
    '  float v=smoothstep(0.98,0.38,length((vScreen-vec2(0.5,0.46))*vec2(1.0,1.15)));col*=mix(0.9,1.0,v);',
    '  finalColor=vec4(clamp(col,0.0,1.0)*src.a,src.a);',
    '}'
  ].join('\n')
  var RIM = [
    'in highp vec2 vTextureCoord;in highp vec2 vScreen;out vec4 finalColor;',
    'uniform sampler2D uTexture;uniform highp vec4 uInputSize;uniform highp vec4 uInputClamp;uniform vec3 uRim;uniform vec2 uDir;uniform float uAmt;',
    'void main(void){',
    '  vec4 c=texture(uTexture,vTextureCoord);',
    // an edge that faces the light: this pixel is solid and the one toward the light is empty
    '  vec2 o=uDir*uInputSize.zw*3.0;float a1=texture(uTexture,clamp(vTextureCoord+o,uInputClamp.xy,uInputClamp.zw)).a;',
    '  float a2=texture(uTexture,clamp(vTextureCoord+o*2.0,uInputClamp.xy,uInputClamp.zw)).a;',
    '  float e=c.a*(1.0-min(a1,a2))*uAmt;',
    '  finalColor=vec4(c.rgb+uRim*e*c.a,c.a);',
    '}'
  ].join('\n')

  // per-layer cast shadow: a big layer (pipes, trains, the sea floor) throws a soft shadow away from the key light onto
  // the layers behind it, so the scene separates into depth planes. A pixel is shadowed when the layer covers a point
  // toward the light from it
  var SHADE = [
    'in highp vec2 vTextureCoord;in highp vec2 vScreen;out vec4 finalColor;',
    'uniform sampler2D uTexture;uniform highp vec4 uInputSize;uniform highp vec4 uInputClamp;',
    'uniform vec3 uShC;uniform highp vec2 uDir;uniform float uRes;uniform float uDrop;',
    'float al(vec2 q){return texture(uTexture,clamp(q,uInputClamp.xy,uInputClamp.zw)).a;}',
    'void main(void){',
    '  vec4 c=texture(uTexture,vTextureCoord);highp vec2 o=uDir*uInputSize.zw*uRes;',
    '  float j=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);float s=0.0;highp vec2 n=vec2(-o.y,o.x);',
    // six taps spread along the light and a little across it, offset per pixel: three fixed taps drew three stacked copies
    '  for(int i=0;i<6;i++){float t=(float(i)+j)/6.0;s+=al(vTextureCoord+o*(4.0+11.0*t)+n*(t-0.5)*5.0)*(1.15-t*0.5);}',
    '  s*=(1.0-c.a)*uDrop/5.4;',
    '  finalColor=vec4(c.rgb+uShC*s*(1.0-c.a),c.a+s*(1.0-c.a));',
    '}'
  ].join('\n')

  function lightDir (side) { var x = -side * 0.75, y = -0.66, n = Math.sqrt(x * x + y * y); return [x / n, y / n] }
  function rgb (s) { var p = s.split(','); return [p[0] / 255, p[1] / 255, p[2] / 255] }
  function tone (c, amt) { return [1 + (c[0] - 0.5) * amt, 1 + (c[1] - 0.5) * amt, 1 + (c[2] - 0.5) * amt] }

  var prog = null, rimProg = null, filter = null, theApp = null
  function make () {
    var th = W.DuniaCinema.theme && W.DuniaCinema.theme()
    if (!th) return null
    prog = prog || P.GlProgram.from({ vertex: VERT, fragment: FRAG, name: 'dunia-cinema-post' })
    return new P.Filter({
      glProgram: prog,
      resources: {
        cine: {
          uBloom: { value: 0.6, type: 'f32' }, uDof: { value: 0.8, type: 'f32' }, uSide: { value: th.side, type: 'f32' },
          uKey: { value: new Float32Array(tone(rgb(th.key), 0.12)), type: 'vec3<f32>' },
          uFill: { value: new Float32Array(tone(rgb(th.fill), 0.10).map(function (v) { return v * 0.98 })), type: 'vec3<f32>' },
          uHaze: { value: new Float32Array(rgb(th.haze)), type: 'vec3<f32>' }, uFog: { value: 0.12, type: 'f32' },
          uForm: { value: 0.85, type: 'f32' }, uRes: { value: 1, type: 'f32' }, uDir: { value: new Float32Array(lightDir(th.side)), type: 'vec2<f32>' },
          uFillD: { value: new Float32Array(rgb(th.fill).map(function (v) { return 0.62 + v * 0.3 })), type: 'vec3<f32>' },
          uKeyT: { value: new Float32Array(rgb(th.key).map(function (v) { return 0.08 + v * 0.22 })), type: 'vec3<f32>' }
        }
      }
    })
  }
  // filterArea is read in the STAGE's own space: on a game that moves or scales its stage (Mario) the screen rectangle
  // cropped the scene to 28% of its detail (2026-11-09), so it is only set while the stage sits untransformed
  function fitArea (app) {
    var st = app.stage, plain = st.x === 0 && st.y === 0 && st.scale.x === 1 && st.scale.y === 1 && !st.rotation
    st.filterArea = plain ? app.screen : undefined
  }
  // a Filter renders at resolution 1 by default: on a phone the whole game went through a 1x texture and came back soft
  // with stair-stepped edges (owner screenshot 2026-11-09). Match the game's own resolution and antialiasing.
  function sharp (f, app) { try { f.resolution = app.renderer.resolution || 1; f.antialias = 'inherit'; var u = f.resources.cine && f.resources.cine.uniforms; if (u) u.uRes = f.resolution } catch (e) {} }
  function attach (app) {
    if (!app || !app.stage || !app.renderer || app.__dcine) return false
    var f = make(); if (!f) return false
    app.__dcine = f; filter = f; theApp = app
    sharp(f, app)
    if (W.DuniaCinema.inScene) W.DuniaCinema.inScene()
    fitArea(app)
    app.stage.filters = (app.stage.filters || []).concat([f])
    return true
  }
  function findApp () {
    var a = null
    try { a = (0, eval)('typeof app!=="undefined"?app:null') } catch (e) { a = null }
    if (!a && W.app) a = W.app
    return a && a.stage && a.renderer ? a : null
  }
  // some games build their Pixi app only after the child picks a train, so the search never gives up (4 Hz for the
  // first 30 s, then once a second)
  var tries = 0
  ;(function poll () {
    var a = findApp()
    if (a && attach(a)) return
    W.setTimeout(poll, ++tries < 120 ? 250 : 1000)
  })()

  // quality follows the layer's own tier: tier 2 = everything, below = grade only (no bloom/DoF taps)
  W.setInterval(function () {
    if (!filter) return
    var s = W.DuniaCinema.state(), u = filter.resources.cine.uniforms
    var full = s.quality >= 2 && !s.reduced
    u.uBloom = full ? 0.6 : 0; u.uDof = full ? 0.35 : 0; u.uForm = full ? 0.85 : 0
    filter.enabled = s.quality >= 1          // tier 0: the game renders exactly as it did
    if (theApp) fitArea(theApp)
  }, 1000)

  W.DuniaCinema.rim = function (sprite, o) {
    if (!sprite || sprite.__dcRim) return null
    o = o || {}
    var th = W.DuniaCinema.theme(), side = th ? th.side : 1
    rimProg = rimProg || P.GlProgram.from({ vertex: VERT, fragment: RIM, name: 'dunia-cinema-rim' })
    var f = new P.Filter({
      glProgram: rimProg,
      resources: { rim: { uRim: { value: new Float32Array(rgb(o.color || (th ? th.key : '255,220,160'))), type: 'vec3<f32>' }, uDir: { value: new Float32Array([-side * 0.8, -0.6]), type: 'vec2<f32>' }, uAmt: { value: o.amount == null ? 0.55 : o.amount, type: 'f32' } } }
    })
    sprite.__dcRim = f
    sprite.filters = (sprite.filters || []).concat([f])
    return f
  }
  // the rim goes on each game's player / entity layer (by name, so the game files stay untouched); a layer the game
  // rebuilds (a new train after a restart) is picked up on the next check
  var RIM_TARGETS = {
    // never a whole-level container: a filter on Mario's level-wide `world` rendered an oversized texture and wiped the
    // bricks, coins and hills (2026-11-09, 31% of the frame's detail left); Mario and Run have no player-sized layer
    'pokemon-birds': 'birdContainer', 'pokemon-bawah-laut': 'swimContainer',
    'ducky-volley': 'entityLayer', 'monster-candy': 'gameLayer', 'mobil': 'carContainer',
    'balapan-kereta': 'L.player', 'balapan-kereta-side': 'trainContainer', 'lokomotif-pemberani': 'trainContainer',
    'selamatkan-kereta': 'trainContainer'
  }
  var page = (W.location.pathname || '').split('/').pop().replace(/\.html$/, ''), rims = [], rimSeen = false
  W.setInterval(function () {
    var ex = RIM_TARGETS[page]; if (!ex || !theApp) return
    var o = null
    try { o = (0, eval)('typeof ' + ex.split('.')[0] + '!=="undefined"?' + ex + ':null') } catch (e) { o = null }
    if (o) rimSeen = true
    if (o && typeof o.addChild === 'function' && !o.__dcRim) { var f = W.DuniaCinema.rim(o); if (f) rims.push(f) }
    var full = W.DuniaCinema.state().quality >= 2
    for (var i = 0; i < rims.length; i++) rims[i].enabled = full
  }, 1000)

  // form shading goes on the scene's big layers (the stage's own children that cover a good part of the screen): one
  // pass per layer, at most 4, tier 2 only. A stage the game moves or scales (Mario) is left alone: filter areas are
  // read in its own space (see fitArea). A layer the game filters itself, or that carries the rim, is skipped.
  var shades = [], shadeProg = null
  function shadeFilter () {
    var th = W.DuniaCinema.theme(), side = th ? th.side : 1
    shadeProg = shadeProg || P.GlProgram.from({ vertex: VERT, fragment: SHADE, name: 'dunia-cinema-shade' })
    var f = new P.Filter({
      glProgram: shadeProg, padding: 16,
      resources: { sh: {
        uShC: { value: new Float32Array(rgb(th ? th.fill : '120,150,220').map(function (v) { return v * 0.12 })), type: 'vec3<f32>' },
        uDir: { value: new Float32Array(lightDir(side)), type: 'vec2<f32>' },
        uRes: { value: theApp.renderer.resolution || 1, type: 'f32' }, uDrop: { value: 0.3, type: 'f32' }
      } }
    })
    sharp(f, theApp)
    return f
  }
  function scanLayers () {
    var st = theApp.stage, sw = theApp.screen.width, sh = theApp.screen.height
    if (st.x || st.y || st.scale.x !== 1 || st.scale.y !== 1) return
    for (var i = 0; i < st.children.length && shades.length < 4; i++) {
      var k = st.children[i]
      if (k.__dcShade || k.__dcRim || !k.visible || (k.filters && k.filters.length)) continue
      var bb = null
      try { bb = k.getBounds() } catch (e) { continue }
      var w = Math.min(bb.x + bb.width, sw) - Math.max(bb.x, 0), h = Math.min(bb.y + bb.height, sh) - Math.max(bb.y, 0)
      if (w <= 0 || h <= 0 || w * h < sw * sh * 0.15 || h < sh * 0.2) continue
      var f = shadeFilter(); k.__dcShade = f; k.filters = [f]; shades.push(f)
    }
  }
  W.setInterval(function () {
    if (!theApp || !W.DuniaCinema.state().on) return
    var full = W.DuniaCinema.state().quality >= 2
    if (full) scanLayers()
    for (var i = 0; i < shades.length; i++) shades[i].enabled = full && !shadeOff
  }, 1000)
  var shadeOff = false

  W.DuniaCinema.pixiEnable = function (v) { if (filter) filter.enabled = !!v; for (var i = 0; i < rims.length; i++) rims[i].enabled = !!v; shadeOff = !v; for (var j = 0; j < shades.length; j++) shades[j].enabled = !!v }
  W.DuniaCinema.pixi = function () { return { app: !!theApp, filter: !!filter, bloom: filter ? filter.resources.cine.uniforms.uBloom : 0, rims: rims.length, rimTarget: rimSeen, shades: shades.length } }
})(window)
