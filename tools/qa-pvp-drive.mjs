// B-293 drive: gym flow → PvP mode → screenshot each step + BattleArena bleed check
import puppeteer from 'puppeteer'
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({headless:'new',args:['--no-sandbox']})
for(const [w,h,tag] of [[844,390,'land'],[390,844,'port']]){
  const p=await b.newPage(); await p.setViewport({width:w,height:h})
  const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())}); p.on('pageerror',e=>errs.push('PE:'+e.message))
  await p.goto('http://localhost:8081/games/gym-pokemon.html',{waitUntil:'domcontentloaded'})
  await sleep(2500)
  await p.evaluate(()=>{ const c=document.querySelector('.trainer-card:not(.locked)'); if(c)c.click() })
  await sleep(1500)
  await p.evaluate(()=>{ const c=document.querySelector('.pkg-card'); if(c&&c.offsetParent)c.click() })
  await sleep(1500)
  await p.evaluate(()=>{ const f=document.getElementById('gw-fight'); if(f&&f.offsetParent)f.click() })
  await sleep(1500)
  await p.evaluate(()=>{ const g=document.getElementById('tcf-go'); if(g&&g.offsetParent)g.click() })
  await sleep(6500)   // VS countdown → mode modal
  await p.screenshot({path:`tools/qa-out/pvp-0-modal-${tag}.png`})
  await p.evaluate(()=>{ const a=document.querySelector('.bm-card[data-mode="pvp"]'); if(a&&a.offsetParent)a.click() })
  await sleep(2000)
  await p.screenshot({path:`tools/qa-out/pvp-1-setup-${tag}.png`})
  // step through pre-battle: names → size → per-player package picks
  for(let i=0;i<14;i++){
    const done=await p.evaluate(()=>{
      if(document.querySelector('.bm-stage-grid')) return true
      // name step: fill both inputs then go
      const inputs=[...document.querySelectorAll('.bm-tour-name-input')]
      if(inputs.length){
        inputs.forEach((inp,ix)=>{ inp.value=ix?'Ayu':'Bagas'; inp.dispatchEvent(new Event('input',{bubbles:true})) })
        const go=document.getElementById('bm-name-go'); if(go&&!go.disabled){go.click()}
        return false
      }
      // size step
      const sz=document.querySelector('.bm-size-card[data-size="3"]'); if(sz&&sz.offsetParent){sz.click(); return false}
      // package pick step (once per player)
      const pk=document.querySelector('.bm-pkg-card[data-pkg]'); if(pk&&pk.offsetParent){pk.click(); return false}
      return false
    })
    await sleep(1400)
    if(done)break
  }
  await sleep(3000) // initiative banner / first turn settles
  await p.screenshot({path:`tools/qa-out/pvp-2-battle-${tag}.png`})
  // click Serang! in the ACTIVE zone → question renders inside that zone
  await p.evaluate(()=>{ const a=document.querySelector('.bm-qzone[data-state="active"] [data-action="attack"]'); if(a)a.click() })
  await sleep(1200)
  await p.screenshot({path:`tools/qa-out/pvp-3-question-${tag}.png`})
  const qst=await p.evaluate(()=>{
    const z=document.querySelector('.bm-qzone[data-state="active"]')
    const q=z&&z.querySelector('.bm-q-text')
    const r=q&&q.getBoundingClientRect()
    return { activeZone: z?z.className:null, qText: q?q.textContent:null,
      qRect: r?{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}:null,
      choices: z?z.querySelectorAll('.bm-choice').length:0 }
  })
  console.log(tag,'QUESTION',JSON.stringify(qst))
  // answer correctly → attack resolves → turn swaps to the OTHER zone
  await p.evaluate(()=>{
    const z=document.querySelector('.bm-qzone[data-state="active"]')
    if(!z)return
    const q=(z.querySelector('.bm-q-text')||{}).textContent||''
    const m=q.match(/(\d+)\s*([+\-×x*])\s*(\d+)/)
    let ans=null
    if(m){const a=+m[1],b=+m[3];ans=m[2]==='+'?a+b:(m[2]==='-'?a-b:a*b)}
    const btns=[...z.querySelectorAll('.bm-choice')]
    const hit=btns.find(b=>b.textContent.trim()==String(ans))||btns[0]
    if(hit)hit.click()
  })
  await sleep(1000)
  // pick first move if moves phase shows
  await p.evaluate(()=>{ const mv=document.querySelector('.bm-qzone[data-state="active"] .bm-move'); if(mv)mv.click() })
  await sleep(4000)  // attack anim + turn swap
  await p.screenshot({path:`tools/qa-out/pvp-4-turnswap-${tag}.png`})
  const swp=await p.evaluate(()=>{
    const act=document.querySelector('.bm-qzone[data-state="active"]')
    return { activeIsTop: act?act.classList.contains('bm-qzone-top'):null }
  })
  console.log(tag,'SWAP',JSON.stringify(swp))
  // v56.9 A-323 — STYLE parity: arena bg = stadium plate + ba-card white/rounded cards
  const style=await p.evaluate(()=>{
    const arena=document.querySelector('.bm-arena')
    const bg=arena?getComputedStyle(arena).getPropertyValue('--bm-arena-bg'):''
    const card=document.querySelector('.bm-info-card')
    const cs=card?getComputedStyle(card):null
    return { arenaBgStadium: /stadium/.test(bg||''),
      cardRadius: cs?cs.borderTopLeftRadius:null, cardBg: cs?cs.backgroundColor:null }
  })
  console.log(tag,'STYLE',JSON.stringify(style))
  // v56.9 A-323 — BALANCE: auto-play the match to completion, recording the round
  // leader each turn. Assert the match finishes (all round/initiative/comeback code
  // paths execute) and that the leader is NOT a rigid P1-always sequence.
  const leaders=[]
  let finished=false
  for(let i=0;i<80;i++){
    const step=await p.evaluate(()=>{
      if(document.querySelector('.bm-champion')) return {done:true}
      const z=document.querySelector('.bm-qzone[data-state="active"]')
      if(!z) return {wait:true}
      // forced/voluntary switch panel → pick first enabled bench pokemon
      const sw=z.querySelector('.bm-switch-card[data-swap]:not([disabled])')
      if(sw){ sw.click(); return {act:'switch'} }
      // action menu → Serang
      const atk=z.querySelector('[data-action="attack"]')
      if(atk){ const idx=z.classList.contains('bm-qzone-bot')?0:1; atk.click(); return {act:'attack',lead:idx} }
      // question → solve + answer
      const q=z.querySelector('.bm-q-text')
      if(q && z.querySelector('.bm-choice')){
        const t=q.textContent||''; const m=t.match(/(\d+)\s*([+\-×x*])\s*(\d+)/)
        let ans=null; if(m){const a=+m[1],b=+m[3];ans=m[2]==='+'?a+b:(m[2]==='-'?a-b:a*b)}
        const btns=[...z.querySelectorAll('.bm-choice')]
        const hit=btns.find(x=>x.textContent.trim()==String(ans))||btns[0]; if(hit)hit.click(); return {act:'answer'}
      }
      // moves phase → first move
      const mv=z.querySelector('.bm-move'); if(mv){ mv.click(); return {act:'move'} }
      return {wait:true}
    })
    if(step.done){ finished=true; break }
    if(step.act==='attack' && typeof step.lead==='number') leaders.push(step.lead)
    await sleep(700)
  }
  const uniqueLeaders=[...new Set(leaders)]
  console.log(tag,'BALANCE',JSON.stringify({finished,turns:leaders.length,leaderSeq:leaders.slice(0,16),bothPlayersLed:uniqueLeaders.length>1}))
  await p.screenshot({path:`tools/qa-out/pvp-5-result-${tag}.png`})
  const st=await p.evaluate(()=>{
    const vis=el=>{ if(!el)return false; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden' }
    const topAt=(x,y)=>{ const e=document.elementFromPoint(x,y); return e?(e.className&&String(e.className.baseVal||e.className)).slice(0,60):null }
    return {
      grid: !!document.querySelector('.bm-stage-grid'),
      qzTop: vis(document.querySelector('.bm-qzone-top')),
      qzBot: vis(document.querySelector('.bm-qzone-bot')),
      qText: (document.querySelector('.bm-q-text')||{}).textContent||null,
      // v56.8 B-293 — Adventure scene must be PARKED (display:none) during PvP
      baBackdropHidden: (()=>{const e=document.querySelector('.ba-backdrop');return e?getComputedStyle(e).display==='none':null})(),
      baCardsHidden: [...document.querySelectorAll('.ba-card')].every(e=>getComputedStyle(e).display==='none'),
      baVsHidden: (()=>{const e=document.querySelector('.ba-vs');return e?getComputedStyle(e).display==='none':null})(),
      baFieldHidden: (()=>{const e=document.querySelector('.ba-field');return e?getComputedStyle(e).display==='none':null})(),
      // landscape fit: active zone's choices/actions must be fully inside the viewport
      zoneOverflow: (()=>{const z=document.querySelector('.bm-qzone[data-state="active"]');if(!z)return null;
        const els=[...z.querySelectorAll('.bm-choice,.bm-action-card,.bm-move')];if(!els.length)return null;
        return els.some(e=>{const r=e.getBoundingClientRect();return r.bottom>innerHeight+1||r.top<-1})})(),
      // what actually paints on top at center + corners
      topCenter: topAt(innerWidth/2, innerHeight/2),
      topTL: topAt(60, 80),
    }
  })
  console.log(tag, JSON.stringify(st,null,1), 'errors:', errs.filter(e=>!/favicon|net::ERR|Failed to load/i.test(e)).slice(0,3))
  // v56.8 B-293 — exit match (accept the confirm) → Adventure scene must be restored
  p.on('dialog', d=>d.accept())
  await p.evaluate(()=>{ const x=document.querySelector('.bm-real-exit'); if(x)x.click() })
  await sleep(1500)
  const rest=await p.evaluate(()=>{
    const disp=sel=>{const e=document.querySelector(sel);return e?getComputedStyle(e).display:null}
    return { pvpGone: !document.querySelector('.bm-pvp-real'),
      backdrop: disp('.ba-backdrop'), card: disp('.ba-card'), vs: disp('.ba-vs') }
  })
  console.log(tag,'RESTORE',JSON.stringify(rest))
  await p.close()
}
await b.close()
