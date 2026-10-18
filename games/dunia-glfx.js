/* games/dunia-glfx.js — window.DuniaGLFX: a WebGL post-process over a game's finished 2D canvas (owner 2026-10-18:
 * "shadernya improve, banyakin"). The 2D renderer draws exactly as before; each frame its canvas is uploaded as a
 * texture and one fragment shader paints the result on a WebGL canvas laid over it:
 *   bloom       bright areas (lamps, sun, tail lights, sparks) bleed a soft glow (8-tap bright-pass ring)
 *   grade       contrast + vibrance lift, a time-of-day white balance (warm / cool), lifted shadows for night
 *   speed       during a boost: radial blur toward the centre and chromatic aberration at the edges
 *   haze        heat shimmer in the lower half (desert, volcano), a gentle uv wobble
 *   grain       a whisper of film grain so flat gradients do not band
 *   vignette    soft, follows the boost
 * The 2D canvas stays in the page (gates and screenshots that read its pixels still work) but is made invisible
 * while the GL canvas shows. No WebGL, a lost context or a slow device -> the GL canvas hides and the 2D canvas
 * shows again (enable(false)), so the game never depends on it.
 *
 *   var fx = DuniaGLFX.attach(canvas2d)          // null when WebGL is unavailable
 *   fx.frame({ boost, warm, night, haze, bloom, t })   // after the 2D frame is drawn
 *   fx.enable(bool); fx.active(); fx.destroy()
 */
;(function (W, D) {
  'use strict'
  var VS = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*0.5+0.5;uv.y=1.0-uv.y;gl_Position=vec4(p,0.0,1.0);}'
  var FS = [
    'precision mediump float;',
    'varying vec2 uv;uniform sampler2D tex;uniform vec2 px;uniform float t,boost,warm,night,haze,bloom,grainA;',
    'float h(vec2 q){return fract(sin(dot(q,vec2(12.9898,78.233)))*43758.5453);}',
    'vec3 bright(vec3 c){float l=dot(c,vec3(0.299,0.587,0.114));return c*smoothstep(0.62,0.95,l);}',
    'void main(){',
    '  vec2 q=uv;',
    // heat haze: only below the horizon band, strongest at the bottom
    '  if(haze>0.0){float k=smoothstep(0.45,1.0,q.y)*haze;q.x+=sin(q.y*90.0+t*6.0)*0.0016*k;q.y+=cos(q.x*70.0+t*4.0)*0.0011*k;}',
    '  vec2 cdir=q-vec2(0.5,0.48);',
    // chromatic aberration grows toward the edges while boosting
    '  float ca=boost*0.0045*length(cdir)*2.0;',
    '  vec3 col=vec3(texture2D(tex,q+cdir*ca).r,texture2D(tex,q).g,texture2D(tex,q-cdir*ca).b);',
    // radial speed blur
    '  if(boost>0.02){vec3 acc=col;float wsum=1.0;for(int i=1;i<=5;i++){float f=float(i)/5.0;vec2 o=q-cdir*f*0.035*boost;acc+=texture2D(tex,o).rgb*(1.0-f*0.5);wsum+=1.0-f*0.5;}col=acc/wsum;}',
    // bloom: bright-pass on a ring of 8 taps at two radii
    '  if(bloom>0.0){vec3 b=vec3(0.0);for(int i=0;i<8;i++){float a=float(i)*0.7853982;vec2 d=vec2(cos(a),sin(a))*px;b+=bright(texture2D(tex,q+d*6.0).rgb)+bright(texture2D(tex,q+d*14.0).rgb)*0.6;}',
    '    col+=b/12.8*bloom*(1.0+night*0.8);}',
    // grade: white balance, contrast, vibrance, night shadow lift
    '  col*=mix(vec3(1.0),warm>0.0?vec3(1.06,1.0,0.9):vec3(0.92,0.98,1.08),abs(warm));',
    '  col=(col-0.5)*(1.06-night*0.04)+0.5;',
    '  float l=dot(col,vec3(0.299,0.587,0.114));float sat=max(col.r,max(col.g,col.b))-min(col.r,min(col.g,col.b));',
    '  col=mix(vec3(l),col,1.0+0.22*(1.0-sat));',
    '  col+=vec3(0.02,0.025,0.05)*night*(1.0-l);',
    // vignette + grain
    '  float v=smoothstep(0.95,0.35,length(cdir*vec2(1.0,1.15)));col*=mix(0.88,1.0,v)-boost*0.06*(1.0-v);',
    '  col+=(h(uv*vec2(913.0,577.0)+t)-0.5)*grainA;',
    '  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);',
    '}'
  ].join('\n')

  function attach (src, o) {
    o = o || {}
    if (!src || !src.parentNode) return null
    var cv = D.createElement('canvas'), gl = null
    cv.className = (src.className || '') + ' glfx'
    cv.setAttribute('aria-hidden', 'true')
    cv.style.pointerEvents = 'none'
    try { gl = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' }) } catch (e) { gl = null }
    if (!gl) return null
    function sh (type, s) { var x = gl.createShader(type); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) { console.warn('[glfx] shader', gl.getShaderInfoLog(x)); return null } return x }
    var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS)
    if (!vs || !fs) return null
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn('[glfx] link', gl.getProgramInfoLog(pr)); return null }
    gl.useProgram(pr)
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    var U = {}; ['px', 't', 'boost', 'warm', 'night', 'haze', 'bloom', 'grainA'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n) })
    src.parentNode.insertBefore(cv, src.nextSibling)
    var on = true, lost = false, dead = false
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; show(false) })
    function show (v) { cv.style.display = v ? '' : 'none'; src.style.opacity = v ? '0' : '' }
    show(true)
    return {
      frame: function (u) {
        if (dead || lost || !on) return
        if (cv.width !== src.width || cv.height !== src.height) { cv.width = src.width; cv.height = src.height; gl.viewport(0, 0, cv.width, cv.height) }
        u = u || {}
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src)
          gl.uniform2f(U.px, 1 / Math.max(1, src.width), 1 / Math.max(1, src.height))
          gl.uniform1f(U.t, (u.t || 0) % 100); gl.uniform1f(U.boost, Math.max(0, Math.min(1, u.boost || 0)))
          gl.uniform1f(U.warm, Math.max(-1, Math.min(1, u.warm || 0))); gl.uniform1f(U.night, Math.max(0, Math.min(1, u.night || 0)))
          gl.uniform1f(U.haze, Math.max(0, Math.min(1, u.haze || 0))); gl.uniform1f(U.bloom, u.bloom == null ? 0.55 : u.bloom)
          gl.uniform1f(U.grainA, u.grain == null ? 0.018 : u.grain)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        } catch (e) { console.warn('[glfx] frame failed, back to 2D', e); on = false; show(false) }
      },
      enable: function (v) { v = !!v && !lost && !dead; if (v === on) return; on = v; show(v) },
      active: function () { return on && !lost && !dead },
      destroy: function () { dead = true; show(false); if (cv.parentNode) cv.parentNode.removeChild(cv) }
    }
  }
  W.DuniaGLFX = { attach: attach }
})(window, document)
