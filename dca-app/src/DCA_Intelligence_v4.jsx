import { useState, useMemo, useReducer, useRef, useCallback, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend, BarChart, Bar, PieChart, Pie, Cell, ReferenceLine } from "recharts";
import { useTheme } from "./ThemeContext";
import { useResponsive } from "./useResponsive";

/* ══════════════════════════════════════════════
   ETF DATABASE — historical data calibrated
   ══════════════════════════════════════════════ */
const DB = {
  VOO:  { nm:"Vanguard S&P 500",         cat:"Large Blend",   r:14.86, d:1.3, er:.03, b:1.00, dd:-24.5, c:"#2563eb",
    hist:{2015:1.31,2016:12.17,2017:21.77,2018:-4.50,2019:31.35,2020:18.29,2021:28.78,2022:-18.19,2023:26.32,2024:24.98,2025:17.82} },
  QQQ:  { nm:"Invesco Nasdaq-100",       cat:"Large Growth",  r:18.30, d:0.6, er:.20, b:1.15, dd:-33.0, c:"#7c3aed",
    hist:{2015:9.45,2016:7.10,2017:32.66,2018:-0.12,2019:38.98,2020:48.40,2021:27.42,2022:-32.58,2023:54.85,2024:25.58,2025:24.80} },
  SCHD: { nm:"Schwab Dividend Equity",   cat:"Dividend Value", r:11.00, d:3.5, er:.06, b:.80, dd:-16.0, c:"#059669",
    hist:{2015:-1.42,2016:16.43,2017:15.47,2018:-5.56,2019:27.18,2020:2.40,2021:29.87,2022:-3.23,2023:3.67,2024:12.09,2025:9.80} },
  VTI:  { nm:"Vanguard Total Market",    cat:"Total Market",  r:14.50, d:1.3, er:.03, b:1.02, dd:-25.0, c:"#d97706",
    hist:{2015:0.40,2016:12.68,2017:21.19,2018:-5.13,2019:30.80,2020:20.95,2021:25.72,2022:-19.53,2023:26.07,2024:23.87,2025:17.00} },
  VIG:  { nm:"Vanguard Div Appreciation",cat:"Div Growth",    r:12.00, d:1.8, er:.06, b:.85, dd:-18.0, c:"#db2777",
    hist:{2015:-0.83,2016:10.98,2017:20.94,2018:-2.01,2019:29.58,2020:15.48,2021:23.68,2022:-9.84,2023:14.52,2024:17.75,2025:13.50} },
  SPY:  { nm:"SPDR S&P 500 Trust",       cat:"Large Blend",   r:14.77, d:1.2, er:.09, b:1.00, dd:-24.5, c:"#6d28d9",
    hist:{2015:1.25,2016:12.00,2017:21.70,2018:-4.56,2019:31.22,2020:18.37,2021:28.75,2022:-18.17,2023:26.19,2024:24.89,2025:17.70} },
  VGT:  { nm:"Vanguard Info Tech",       cat:"Sector Tech",   r:19.00, d:0.6, er:.10, b:1.20, dd:-34.0, c:"#0891b2",
    hist:{2015:5.90,2016:13.70,2017:38.78,2018:-0.30,2019:48.00,2020:46.00,2021:30.30,2022:-33.70,2023:50.10,2024:24.20,2025:22.00} },
  SPLG: { nm:"SPDR S&P 500 Low Cost",   cat:"Large Blend",   r:14.80, d:1.3, er:.02, b:1.00, dd:-24.5, c:"#ea580c",
    hist:{2015:1.30,2016:12.10,2017:21.70,2018:-4.52,2019:31.30,2020:18.30,2021:28.70,2022:-18.20,2023:26.30,2024:24.95,2025:17.80} },
};

const INTERVALS = [
  { id:"weekly", nm:"Weekly", factor:52/12, perYr:52 },
  { id:"biweekly", nm:"Biweekly", factor:26/12, perYr:26 },
  { id:"monthly", nm:"Monthly", factor:1, perYr:12 },
  { id:"quarterly", nm:"Quarterly", factor:1/3, perYr:4 },
];

const ALLOC_MODES = [{ id:"pct", nm:"%" }, { id:"usd", nm:"USD" }];

/* ══════════════════════════════════════════════
   FORMATTERS
   ══════════════════════════════════════════════ */
const $=(n,d=0)=>{if(n==null||isNaN(n))return"$0";const a=Math.abs(n),s=n<0?"-":"";if(a>=1e9)return`${s}$${(a/1e9).toFixed(1)}B`;if(a>=1e6)return`${s}$${(a/1e6).toFixed(1)}M`;return`${s}$${a.toLocaleString("en",{minimumFractionDigits:d,maximumFractionDigits:d})}`};
const P=(n,d=1)=>`${(n||0).toFixed(d)}%`;
const td=()=>new Date().toISOString().slice(0,10);
const IDR=(n)=>{if(n==null||isNaN(n))return"Rp 0";const a=Math.abs(n),s=n<0?"-":"";if(a>=1e12)return`${s}Rp ${(a/1e12).toFixed(1)}T`;if(a>=1e9)return`${s}Rp ${(a/1e9).toFixed(1)}B`;if(a>=1e6)return`${s}Rp ${(a/1e6).toFixed(1)}M`;return`${s}Rp ${a.toLocaleString("en",{maximumFractionDigits:0})}`};

/* ══════════════════════════════════════════════
   FORECAST ENGINE — 3-method blended
   Uses: (1) 10Y CAGR, (2) 5Y recent CAGR, (3) mean reversion model
   Weighted blend for more accurate forward projection
   ══════════════════════════════════════════════ */
function forecast(etf, adjPct) {
  const h = Object.values(etf.hist);
  const recent5 = h.slice(-5);
  const cagr10 = etf.r;
  const cagr5 = recent5.reduce((a,v)=>a*(1+v/100),1) ** (1/5) * 100 - 100;
  // Mean reversion: if recent >> long-term, dampen forward estimate
  const deviation = cagr5 - cagr10;
  const meanRevAdj = -deviation * 0.3; // 30% mean reversion pull
  const blended = cagr10 * 0.4 + cagr5 * 0.35 + (cagr10 + meanRevAdj) * 0.25;
  return {
    base: blended + adjPct,
    bull: blended + adjPct + 4,
    bear: blended + adjPct - 6,
    conservative: blended + adjPct - 2.5,
    optimistic: blended + adjPct + 2,
    cagr10, cagr5, blended,
    volatility: Math.sqrt(h.reduce((s,v)=>s+Math.pow(v-cagr10,2),0)/h.length),
  };
}

/* ══════════════════════════════════════════════
   USD/IDR FORECAST ENGINE
   Multi-period CAGR blend with mean-reversion
   Data: Bank Indonesia + Bloomberg historical rates
   ══════════════════════════════════════════════ */
const USDIDR_HIST={2010:9090,2011:8770,2012:9387,2013:10461,2014:11878,2015:13795,2016:13436,2017:13384,2018:14481,2019:14146,2020:14582,2021:14269,2022:15731,2023:15455,2024:16260,2025:16400};
function forecastIDR(yearsFromNow){
  const BASE=16400,keys=Object.keys(USDIDR_HIST).map(Number),vals=Object.values(USDIDR_HIST),n=vals.length;
  // Multi-period CAGR analysis
  const cagr15=Math.pow(vals[n-1]/vals[0],1/(keys[n-1]-keys[0]))-1; // ~4.0%
  const i10=keys.findIndex(k=>k>=keys[n-1]-10),cagr10=Math.pow(vals[n-1]/vals[i10],1/(keys[n-1]-keys[i10]))-1; // ~1.7%
  const i5=keys.findIndex(k=>k>=keys[n-1]-5),cagr5=Math.pow(vals[n-1]/vals[i5],1/(keys[n-1]-keys[i5]))-1; // ~2.4%
  // Long-term anchor: BI inflation target differential (~3%) + structural factors
  const longTermAnchor=0.028;
  // Blended forecast: recent trends + structural anchor
  const blended=cagr10*0.25+cagr5*0.35+longTermAnchor*0.40;
  // Diminishing certainty for long horizons (slight dampening >10yr)
  const dampened=yearsFromNow>10?blended*0.95:blended;
  const rate=BASE*Math.pow(1+dampened,yearsFromNow);
  return{rate:Math.round(rate),cagr:blended*100,baseRate:BASE};
}

/* ══════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════ */
const DEFAULTS = {
  invest:60, fee:0.3, spread:0.25, yrs:10, adj:0,
  annInc:0, divReinvest:true, interval:"monthly", allocMode:"pct",
  appMode:"sim", view:"main",
  slots:[
    {tk:"VOO",alloc:30,usd:0,txns:[]},
    {tk:"QQQ",alloc:20,usd:0,txns:[]},
    {tk:"SCHD",alloc:15,usd:0,txns:[]},
    {tk:"SPY",alloc:10,usd:0,txns:[]},
    {tk:"VTI",alloc:15,usd:0,txns:[]},
    {tk:"VIG",alloc:10,usd:0,txns:[]},
  ],
  editIdx:null, showCfg:true,
};
const LS_KEY="dca-portfolio-state";
function loadState(){
  try{const s=localStorage.getItem(LS_KEY);if(s){const p=JSON.parse(s);return{...DEFAULTS,...p,view:"main",editIdx:null};}}catch{}
  return DEFAULTS;
}
function saveState(s){
  try{const{view,editIdx,...rest}=s;localStorage.setItem(LS_KEY,JSON.stringify(rest));}catch{}
}
const INIT=loadState();

function rd(s,{type:t,p}) {
  switch(t) {
    case "SET": return {...s,...p};
    case "CFG": return {...s,...p};
    case "SLOT_ADD": {
      if(s.slots.length>=6||s.slots.find(x=>x.tk===p))return s;
      return {...s,slots:[...s.slots,{tk:p,alloc:0,usd:0,txns:[]}]};
    }
    case "SLOT_RM": return {...s,slots:s.slots.filter((_,i)=>i!==p),editIdx:null};
    case "SLOTS_SET": return {...s,slots:p,editIdx:null};
    case "SLOTS_EQ": {const n=s.slots.length;if(!n)return s;const eq=Math.floor(100/n),rem=100-eq*n;return{...s,slots:s.slots.map((sl,i)=>({...sl,alloc:eq+(i===0?rem:0)}))};}
    case "SLOT_UPD": {
      const sl=[...s.slots]; sl[p.i]={...sl[p.i],...p.d}; return {...s,slots:sl};
    }
    case "TX_ADD": {
      const sl=[...s.slots],x=sl[p.i];
      sl[p.i]={...x,txns:[...x.txns,{id:Date.now(),dt:td(),pr:"",am:"",note:""}]};
      return {...s,slots:sl};
    }
    case "TX_UPD": {
      const sl=[...s.slots],x=sl[p.i];
      sl[p.i]={...x,txns:x.txns.map(t=>t.id===p.id?{...t,[p.f]:p.v}:t)};
      return {...s,slots:sl};
    }
    case "TX_DEL": {
      const sl=[...s.slots],x=sl[p.i];
      sl[p.i]={...x,txns:x.txns.filter(t=>t.id!==p.id)};
      return {...s,slots:sl};
    }
    case "TX_BULK": {
      const sl=[...s.slots],x=sl[p.i];
      const nw=[];const dt=new Date();
      for(let m=0;m<p.n;m++){
        const d2=new Date(dt);
        if(s.interval==="weekly")d2.setDate(d2.getDate()+7*(m+1));
        else if(s.interval==="biweekly")d2.setDate(d2.getDate()+14*(m+1));
        else if(s.interval==="quarterly")d2.setMonth(d2.getMonth()+3*(m+1));
        else d2.setMonth(d2.getMonth()+m+1);
        nw.push({id:Date.now()+m,dt:d2.toISOString().slice(0,10),pr:String(p.pr),am:String(p.am),note:`Plan #${m+1}`});
      }
      sl[p.i]={...x,txns:[...x.txns,...nw].sort((a,b)=>a.dt.localeCompare(b.dt))};
      return {...s,slots:sl};
    }
    default: return s;
  }
}

/* ══════════════════════════════════════════════
   UI COMPONENTS
   ══════════════════════════════════════════════ */
/* cs is now provided by ThemeContext — see useTheme() hook below */

const Box=({children,style,ac,onClick,cs,glow})=><div onClick={onClick} style={{background:cs.sf,border:`1px solid ${cs.bd}`,borderRadius:12,borderLeft:ac?`3px solid ${ac}`:undefined,cursor:onClick?"pointer":undefined,boxShadow:glow?`${cs.sh2}, 0 0 0 1px ${glow}15`:cs.sh,backgroundImage:cs.grd,transition:"all .25s",...style}}>{children}</div>;
const Num=({l,v,c,s,cs})=><div><div style={{fontSize:16,fontWeight:700,color:c||cs.t1,fontFamily:cs.m}}>{v}</div><div style={{fontSize:11,color:cs.t3,marginTop:2}}>{l}</div>{s&&<div style={{fontSize:10,color:cs.t3}}>{s}</div>}</div>;

const Tip=({title,text,formula,cs,children})=>{
  const trigRef=useRef(null);
  const tipRef=useRef(null);
  const[vis,setVis]=useState(false);
  const[pos,setPos]=useState({top:0,left:0,above:true,arrow:0});
  const doShow=useCallback(()=>{
    if(!trigRef.current||!tipRef.current)return;
    const r=trigRef.current.getBoundingClientRect();
    const tip=tipRef.current;
    tip.style.visibility="visible";tip.style.opacity="0";
    const tw=tip.offsetWidth,th=tip.offsetHeight,gap=8;
    let left=r.left+r.width/2-tw/2;
    if(left<8)left=8;
    if(left+tw>window.innerWidth-8)left=window.innerWidth-tw-8;
    let top,above=true;
    if(r.top-th-gap>8){top=r.top-th-gap;}
    else{top=r.bottom+gap;above=false;}
    let arrow=r.left+r.width/2-left;
    arrow=Math.max(12,Math.min(arrow,tw-12));
    setPos({top,left,above,arrow});setVis(true);
  },[]);
  return<>
    {children}
    <span ref={trigRef} onMouseEnter={doShow} onMouseLeave={()=>setVis(false)}
      onTouchStart={e=>{e.preventDefault();doShow();setTimeout(()=>setVis(false),3000);}}
      style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,borderRadius:"50%",
        background:`${cs.acc}25`,color:cs.acc,fontSize:"0.65rem",fontWeight:700,cursor:"help",marginLeft:6,verticalAlign:"middle",flexShrink:0}}>?</span>
    <div ref={tipRef} style={{
      position:"fixed",zIndex:100000,top:pos.top,left:pos.left,
      background:cs.isDark?"#1e293b":"#fff",color:cs.isDark?"#e2e8f0":"#1e293b",
      border:`1px solid ${cs.acc}4d`,borderRadius:10,padding:14,
      width:280,maxWidth:"calc(100vw - 16px)",
      boxShadow:cs.isDark?"0 8px 30px rgba(0,0,0,0.4)":"0 8px 30px rgba(0,0,0,0.12)",
      opacity:vis?1:0,visibility:vis?"visible":"hidden",
      transition:"opacity 0.15s, visibility 0.15s",pointerEvents:"none",
      whiteSpace:"normal",wordWrap:"break-word",fontFamily:cs.f,textTransform:"none",letterSpacing:"normal",
    }}>
      {title&&<div style={{fontSize:"0.82rem",fontWeight:700,color:cs.acc,marginBottom:6}}>{title}</div>}
      <div style={{fontSize:"0.78rem",color:cs.isDark?"#cbd5e1":"#4b5563",lineHeight:1.5,marginBottom:formula?8:0}}>{text}</div>
      {formula&&<div style={{fontSize:"0.72rem",color:cs.isDark?"#94a3b8":"#9ca3af",paddingTop:6,
        borderTop:`1px solid ${cs.isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`,fontStyle:"italic"}}>{formula}</div>}
    </div>
  </>;
};

const Inp=({l,v,onChange,pre,suf,w,step,ph,type="number",cs,tip,fmt})=>{
  const[foc,setFoc]=useState(false);
  const dv=fmt&&!foc&&v!==""&&!isNaN(v)?Number(v).toLocaleString("en"):v;
  return<div style={{display:"flex",flexDirection:"column",gap:2,width:w,minWidth:0}}>
  {l&&<label style={{fontSize:11,color:cs.t3,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>
    {tip?<Tip title={tip.t} text={tip.d} formula={tip.f} cs={cs}><span>{l}</span></Tip>:l}
  </label>}
  <div style={{display:"flex",alignItems:"center",background:cs.inp,border:`1px solid ${cs.bd}`,borderRadius:6,height:36,overflow:"hidden",transition:"border-color .2s"}}>
    {pre&&<span style={{padding:"0 8px",fontSize:11,color:cs.t3,background:cs.sf2,borderRight:`1px solid ${cs.bd}`,height:"100%",display:"flex",alignItems:"center",whiteSpace:"nowrap"}}>{pre}</span>}
    <input type={fmt?"text":type} inputMode={fmt?"numeric":undefined} value={dv}
      onFocus={()=>fmt&&setFoc(true)} onBlur={()=>fmt&&setFoc(false)}
      onChange={e=>{if(fmt){const raw=e.target.value.replace(/,/g,"");onChange(raw===""?"":+raw);}else{onChange(type==="number"?(e.target.value===""?"":+e.target.value):e.target.value);}}}
      step={fmt?undefined:step} placeholder={ph}
      style={{flex:1,padding:"0 8px",background:"transparent",border:"none",color:cs.t1,fontSize:14,fontFamily:cs.m,outline:"none",width:"100%",minWidth:0}}/>
    {suf&&<span style={{padding:"0 8px",fontSize:11,color:cs.t3,whiteSpace:"nowrap"}}>{suf}</span>}
  </div>
</div>;
};

const Pill=({active,onClick,children,color,cs})=><button onClick={onClick} style={{
  padding:"7px 16px",borderRadius:8,border:`1px solid ${active?color||cs.acc:cs.bd}`,
  background:active?`linear-gradient(135deg,${(color||cs.acc)}18,${(color||cs.acc)}08)`:"transparent",
  color:active?color||cs.acc:cs.t3,
  fontSize:13,fontWeight:active?700:500,cursor:"pointer",fontFamily:cs.f,transition:"all .2s",
  boxShadow:active?`0 2px 8px ${(color||cs.acc)}20`:"none",
}}>{children}</button>;

/* ══════════════════════════════════════════════
   NARRATIVE ENGINE
   ══════════════════════════════════════════════ */
function buildNarrative(sd,tot,proj,cfg,netPer,totalAl,intv,cs) {
  const lines=[];
  if(!sd.length)return{lines,wR:0,wD:0,wB:0,wER:0,wDD:0,risk:"—",riskC:cs.t3,techP:0,divP:0,sp5P:0};
  const wR=totalAl>0?sd.reduce((a,x)=>a+x.fc.base*x.al,0)/totalAl:0;
  const wD=totalAl>0?sd.reduce((a,x)=>a+x.etf.d*x.al,0)/totalAl:0;
  const wB=totalAl>0?sd.reduce((a,x)=>a+x.etf.b*x.al,0)/totalAl:0;
  const wER=totalAl>0?sd.reduce((a,x)=>a+x.etf.er*x.al,0)/totalAl:0;
  const wDD=totalAl>0?sd.reduce((a,x)=>a+x.etf.dd*x.al,0)/totalAl:0;
  const techP=sd.filter(x=>["QQQ","VGT"].includes(x.tk)).reduce((a,x)=>a+x.al,0);
  const divP=sd.filter(x=>["SCHD","VIG"].includes(x.tk)).reduce((a,x)=>a+x.al,0);
  const sp5P=sd.filter(x=>["VOO","SPY","SPLG"].includes(x.tk)).reduce((a,x)=>a+x.al,0);
  const dup=sd.filter(x=>["VOO","SPY","SPLG"].includes(x.tk));
  const risk=wB>1.08?"AGGRESSIVE":wB>0.95?"MODERATE":"CONSERVATIVE";
  const riskC=risk==="AGGRESSIVE"?cs.red:risk==="MODERATE"?cs.amb:cs.grn;
  const fin=proj[proj.length-1];
  const yr5=proj.find(p=>Math.abs(p.m-60)<4);

  lines.push({i:"📊",t:"Forecast Engine",x:
    `Blended forecast model (40% 10Y CAGR + 35% recent 5Y + 25% mean-reversion): weighted projected return ${P(wR)}/yr. `+
    `Interval: ${intv.nm} (${intv.perYr}×/yr). `+
    (cfg.annInc>0?`DCA increases ${cfg.annInc}%/yr (compounding). `:"")
  });

  lines.push({i:"🛡️",t:`Risk: ${risk} (β ${wB.toFixed(2)})`,x:
    `Max drawdown estimate: ${P(wDD)}. `+
    (fin?`Worst case from ${$(fin.val)}: could drop ${$(Math.abs(wDD/100)*fin.val)} in a crash. `:"")
    +(risk==="AGGRESSIVE"?`Tech ${techP}% is high — expect 30%+ volatility.`
    :risk==="MODERATE"?`Good balance between growth & income.`
    :`Defensive — lower returns but more stable.`),
    c:riskC
  });

  if(dup.length>1) lines.push({i:"⚠️",t:"S&P 500 Overlap",x:
    `${dup.map(x=>x.tk).join("+")} all track S&P 500 (total ${sp5P}%). Consider consolidating to one (VOO: ER 0.03%) unless intentionally split for different averaging strategy.`,c:cs.amb});

  lines.push({i:"💰",t:"Cost Analysis",x:
    `Blended ER: ${P(wER,3)}/yr. Trading cost: ${P(cfg.fee+cfg.spread)} per trade × ${intv.perYr}×/yr = ~${P((cfg.fee+cfg.spread)*intv.perYr/100*100,2)} drag/yr. `+
    (wER>0.10?`Tip: replace ETFs with ER >0.10% with cheaper alternatives.`:`ER is efficient.`)
  });

  lines.push({i:"💎",t:"Dividend",x:
    `Weighted yield: ${P(wD)}/yr. `+
    (fin?`Year ${cfg.yrs}: ~${$(fin.divMo)}/mo. `:"")
    +(cfg.divReinvest?"DRIP ON — optimal compounding.":"DRIP OFF — consider enabling for better compounding.")
    +(divP<10?` Dividend allocation low (${divP}%). Consider adding SCHD/VIG for income.`:"")
  });

  if(fin) lines.push({i:"🚀",t:`Projection ${cfg.yrs}yr`,x:
    `DCA ${$(netPer)}/${intv.nm.toLowerCase()}: Invested ${$(fin.inv)} → ${$(fin.val)} (+${P(fin.pPct)}). `+
    (yr5?`5yr checkpoint: ${$(yr5.val)} (+${P(yr5.pPct)}). `:"")
  });

  lines.push({i:"🏛️",t:"Tax Impact (WHT)",x:
    `US dividends subject to ${P(10)} withholding tax (US-ID treaty). `+
    `Gross yield: ${P(wD)} → Net after tax: ${P(wD*0.9)}. `+
    (fin?`Estimated tax at year ${cfg.yrs}: ~${$(fin.divMo*12*0.1)}/yr.`:""),
    c:cs.amb
  });

  const totalCostDrag=fin?(fin.inv*(cfg.fee+cfg.spread)/100):0;
  lines.push({i:"📉",t:"Cost Drag",x:
    `Fee ${P(cfg.fee)} + Spread ${P(cfg.spread)} = ${P(cfg.fee+cfg.spread)} per trade. `+
    (fin?`Cumulative cost on ${$(fin.inv)} invested: ~${$(totalCostDrag)}. `:"")
    +`Choose low-fee brokers & liquid ETFs to minimize drag.`
  });

  const recs=[];
  if(techP>40)recs.push("Reduce tech below 35%");
  if(divP===0)recs.push("Add 10-20% dividend ETFs");
  if(dup.length>1)recs.push("Consolidate S&P 500 duplicates");
  if(cfg.annInc===0)recs.push("Set annual increase 5-10%");
  if(!cfg.divReinvest)recs.push("Enable dividend reinvestment");
  if(totalAl!==100)recs.push(`Allocation ${totalAl}% — should be 100%`);
  if(sd.length<2)recs.push("Diversify to 2-3 ETFs");
  if(cfg.yrs<5)recs.push("Horizon <5yr too short for equities");
  if(!recs.length)recs.push("Portfolio is optimal — stay consistent");
  lines.push({i:"✅",t:"Recommendations",x:recs.join(" · "),c:cs.grn});

  return{lines,wR,wD,wB,wER,wDD,risk,riskC,techP,divP,sp5P};
}

/* ══════════════════════════════════════════════
   COMPARE PROJECTION HELPER
   ══════════════════════════════════════════════ */
function computeProjection(cfg,sls){
  const iv=INTERVALS.find(x=>x.id===cfg.interval)||INTERVALS[2];
  const gross=cfg.invest*(1-cfg.fee/100-cfg.spread/100)*iv.factor;
  const sd2=sls.map(sl=>{const etf=DB[sl.tk];if(!etf)return null;const fc=forecast(etf,cfg.adj||0);
    const per=cfg.allocMode==="usd"?sl.usd:gross*sl.alloc/100;return{etf,fc,per};}).filter(Boolean);
  if(!sd2.length)return[];
  const periods=cfg.yrs*iv.perYr,pts=[];let vals=sd2.map(()=>0),cum=0;
  for(let p=0;p<=periods;p++){
    if(p>0){const inc=Math.pow(1+(cfg.annInc||0)/100,Math.floor((p-1)/iv.perYr));
      sd2.forEach((x,i)=>{const mr=x.fc.base/100/iv.perYr;const dr=cfg.divReinvest?x.etf.d/100/iv.perYr:0;
        vals[i]=vals[i]*(1+mr+dr)+x.per*inc;cum+=x.per*inc;});}
    const tv=vals.reduce((a,b)=>a+b,0);const yr=p/iv.perYr;
    if(p===0||p%iv.perYr===0||p===periods)pts.push({yr,lbl:p===0?"Now":`${yr%1===0?yr:yr.toFixed(1)}yr`,val:tv,inv:cum});
  }
  return pts;
}

/* ══════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════ */
export default function App(){
  const{cs}=useTheme();
  const{isMobile,isTablet}=useResponsive();
  const[s,d]=useReducer(rd,INIT);
  const D=(t,p)=>d({type:t,p});
  const{invest,fee,spread,yrs,adj,annInc,divReinvest,interval,allocMode,appMode,view,slots,editIdx,showCfg}=s;
  const[bkN,setBkN]=useState(12);
  const[bkPr,setBkPr]=useState("");
  const[bkAm,setBkAm]=useState("");
  const[confirmDel,setConfirmDel]=useState(null);
  const[savedSims,setSavedSims]=useState(()=>{try{return JSON.parse(localStorage.getItem("dca-saved-sims")||"[]");}catch{return[];}});
  const[showSave,setShowSave]=useState(false);
  const[saveName,setSaveName]=useState("");
  const[cmpIds,setCmpIds]=useState([null,null]);
  const[fireTarget,setFireTarget]=useState(2000);

  // Persist state to localStorage
  useEffect(()=>{saveState(s);},[s]);
  useEffect(()=>{try{localStorage.setItem("dca-saved-sims",JSON.stringify(savedSims));}catch{}},[savedSims]);
  // Reset confirm-delete when switching ETF tabs
  useEffect(()=>{setConfirmDel(null);},[editIdx]);

  const intv=INTERVALS.find(x=>x.id===interval)||INTERVALS[2];
  const grossPer=useMemo(()=>invest*(1-fee/100-spread/100)*intv.factor,[invest,fee,spread,intv]);
  const netPerYr=grossPer*intv.perYr;
  const totalAl=slots.reduce((a,x)=>a+x.alloc,0);

  // Slot analytics
  const sd=useMemo(()=>slots.map((sl,i)=>{
    const etf=DB[sl.tk]; const fc=forecast(etf,adj);
    const txns=sl.txns.filter(t=>+t.pr>0&&+t.am>0);
    const inv=txns.reduce((a,t)=>a+ +t.am,0);
    const sh=txns.reduce((a,t)=>a+ +t.am/+t.pr,0);
    const avg=sh>0?inv/sh:0;
    const last=txns.length>0?+txns[txns.length-1].pr:0;
    const cur=sh*last; const gl=cur-inv; const glP=inv>0?gl/inv*100:0;
    const annD=cur*etf.d/100;
    const perUSD=allocMode==="usd"?sl.usd:grossPer*sl.alloc/100;
    return{i,tk:sl.tk,al:sl.alloc,usd:sl.usd,etf,fc,txns:sl.txns,inv,sh,avg,last,cur,gl,glP,annD,perUSD,txnCount:txns.length};
  }),[slots,grossPer,adj,allocMode]);

  const tot=useMemo(()=>{
    const t={inv:0,cur:0,annD:0};
    sd.forEach(x=>{t.inv+=x.inv;t.cur+=x.cur;t.annD+=x.annD});
    t.gl=t.cur-t.inv;t.glP=t.inv>0?t.gl/t.inv*100:0;
    return t;
  },[sd]);

  // Record stats — derive DCA pattern from actual transactions
  const recStats=useMemo(()=>{
    if(appMode!=="record")return null;
    const allDates=sd.flatMap(x=>x.txns.filter(t=>t.dt&&+t.am>0).map(t=>t.dt)).sort();
    if(!allDates.length)return null;
    const first=allDates[0],last=allDates[allDates.length-1];
    const days=Math.max(1,(new Date(last)-new Date(first))/86400000);
    const months=Math.max(1,days/30.44);
    const totalTxns=allDates.length;
    const avgPerMonth=tot.inv/months;
    const gaps=[];
    for(let i=1;i<allDates.length;i++)gaps.push((new Date(allDates[i])-new Date(allDates[i-1]))/86400000);
    const avgGap=gaps.length>0?gaps.reduce((a,b)=>a+b,0)/gaps.length:30;
    const freq=avgGap<10?"Weekly":avgGap<20?"Biweekly":avgGap<45?"Monthly":"Quarterly";
    return{first,last,months:Math.round(months),totalTxns,avgPerMonth,freq,avgGap};
  },[sd,tot,appMode]);

  // Historical timeline for record mode charts
  const recHist=useMemo(()=>{
    if(appMode!=="record")return[];
    const allTx=[];
    sd.forEach(x=>{x.txns.filter(t=>+t.pr>0&&+t.am>0&&t.dt).forEach(t=>{
      allTx.push({dt:t.dt,pr:+t.pr,am:+t.am,tk:x.tk});
    });});
    if(!allTx.length)return[];
    allTx.sort((a,b)=>a.dt.localeCompare(b.dt));
    const sharesMap={};let cumInv=0;const byDate=new Map();
    allTx.forEach(tx=>{
      if(!sharesMap[tx.tk])sharesMap[tx.tk]={sh:0,lastPr:0};
      sharesMap[tx.tk].sh+=tx.am/tx.pr;
      sharesMap[tx.tk].lastPr=tx.pr;
      cumInv+=tx.am;
      let val=0;
      Object.entries(sharesMap).forEach(([_,d])=>{val+=d.sh*d.lastPr;});
      byDate.set(tx.dt,{inv:cumInv,val});
    });
    return Array.from(byDate.entries()).map(([dt,d])=>{
      const date=new Date(dt+'T00:00:00');
      return{lbl:date.toLocaleDateString("en",{month:"short",day:"numeric"}),dt,inv:d.inv,hist:d.val};
    });
  },[sd,appMode]);

  // Projection
  const proj=useMemo(()=>{
    const periods=yrs*intv.perYr;const pts=[];
    let vals=sd.map(x=>appMode==="record"?x.cur:0);
    let cumInv=appMode==="record"?tot.inv:0;
    for(let p=0;p<=periods;p++){
      if(p>0){
        const yrNum=Math.floor((p-1)/intv.perYr);
        const incM=Math.pow(1+annInc/100,yrNum);
        sd.forEach((x,i)=>{
          const mr=x.fc.base/100/intv.perYr;
          const dr=divReinvest?x.etf.d/100/intv.perYr:0;
          const contrib=x.perUSD*incM;
          vals[i]=vals[i]*(1+mr+dr)+contrib;
          cumInv+=contrib;
        });
      }
      const tv=vals.reduce((a,b)=>a+b,0);
      const dm=sd.reduce((a,x,i)=>a+vals[i]*x.etf.d/100/12,0);
      const mo=p/intv.perYr*12;
      if(p===0||p%intv.perYr===0||p===periods||(p<=intv.perYr&&p%(Math.max(1,Math.floor(intv.perYr/4)))===0)){
        const yr=p/intv.perYr;
        pts.push({m:mo,p,yr,lbl:p===0?"Now":yr<1?`${Math.round(mo)}mo`:`${yr%1===0?yr:yr.toFixed(1)}yr`,
          val:tv,inv:cumInv,profit:tv-cumInv,pPct:cumInv>0?(tv-cumInv)/cumInv*100:0,divMo:dm});
      }
    }
    return pts;
  },[sd,yrs,intv,annInc,divReinvest,appMode,tot]);

  // Combined chart data for record mode (historical + projection)
  const fullChart=useMemo(()=>{
    if(appMode!=="record"||!recHist.length)return null;
    const hist=recHist.map(p=>({lbl:p.lbl,dt:p.dt,inv:p.inv,hist:p.hist,proj:null,divMo:0}));
    const now={lbl:"NOW",inv:tot.inv,hist:tot.cur,proj:tot.cur,divMo:tot.annD/12,isNow:true};
    const fwd=proj.slice(1).map(p=>({lbl:p.lbl,inv:p.inv,hist:null,proj:p.val,divMo:p.divMo,profit:p.profit,pPct:p.pPct}));
    return[...hist,now,...fwd];
  },[appMode,recHist,proj,tot]);

  // Scenarios
  const scens=useMemo(()=>{
    const adjs=[{n:"Bear",a:-6,c:cs.red},{n:"Consv",a:-2.5,c:cs.amb},{n:"Base",a:0,c:cs.acc},{n:"Bull",a:3,c:cs.grn},{n:"Opti",a:6,c:cs.pur}];
    return[1,2,3,5,7,10,15,20].filter(y=>y<=yrs).map(y=>{
      const row={yr:y,inv:(appMode==="record"?tot.inv:0)+sd.reduce((a,x)=>a+x.perUSD,0)*intv.perYr*y};
      adjs.forEach(sc=>{
        let vs=sd.map(x=>appMode==="record"?x.cur:0);
        const periods=y*intv.perYr;
        for(let p=1;p<=periods;p++){
          const inc=Math.pow(1+annInc/100,Math.floor((p-1)/intv.perYr));
          sd.forEach((x,i)=>{
            const base=forecast(x.etf,adj+sc.a).base;
            const mr=base/100/intv.perYr;
            const dr=divReinvest?x.etf.d/100/intv.perYr:0;
            vs[i]=vs[i]*(1+mr+dr)+x.perUSD*inc;
          });
        }
        row[sc.n]=vs.reduce((a,b)=>a+b,0);
      });
      return row;
    });
  },[sd,yrs,intv,annInc,divReinvest,adj,appMode,tot]);

  const milestones=useMemo(()=>
    [1e3,5e3,1e4,25e3,5e4,1e5,25e4,5e5,1e6].map(t=>{const pt=proj.find(p=>p.val>=t);return pt?{t,lbl:pt.lbl}:null}).filter(Boolean)
  ,[proj]);

  const narr=useMemo(()=>buildNarrative(sd,tot,proj,s,grossPer,totalAl,intv,cs),[sd,tot,proj,s,grossPer,totalAl,intv,cs]);
  const pie=sd.map(x=>({name:x.tk,value:x.al,color:x.etf.c}));
  const fin=proj[proj.length-1];

  // FIRE Independence tracker
  const fireData=useMemo(()=>{
    const f=proj[proj.length-1];
    if(!f)return null;
    const tgt=fireTarget||2000;
    const covPct=Math.min(100,f.divMo/tgt*100);
    const fireYr=proj.find(p=>p.divMo>=tgt);
    return{tgt,covPct,fireYr:fireYr?.lbl||null,divMo:f.divMo,yrsToFire:fireYr?.yr||null};
  },[proj,fireTarget]);

  // Portfolio Health Score (0-100)
  const healthScore=useMemo(()=>{
    if(!sd.length)return{score:0,grade:"—",c:cs.t3,subs:[]};
    const subs=[];
    let dv=0;const n=sd.length;dv+=Math.min(15,n*3);if(totalAl===100)dv+=10;
    const cats=new Set(sd.map(x=>x.etf.cat));dv+=Math.min(5,cats.size*2);
    subs.push({l:"Diversification",v:dv,max:30});
    const cost=narr.wER<0.05?25:narr.wER<0.10?20:narr.wER<0.15?15:5;
    subs.push({l:"Cost Efficiency",v:cost,max:25});
    let rk=0;if(narr.wB>=0.85&&narr.wB<=1.05)rk=25;else if(narr.wB<1.15)rk=18;else rk=8;
    subs.push({l:"Risk Balance",v:rk,max:25});
    const inc=Math.min(20,Math.round(narr.wD*6));
    subs.push({l:"Income",v:inc,max:20});
    const score=Math.min(100,subs.reduce((a,x)=>a+x.v,0));
    const grade=score>=90?"A+":score>=80?"A":score>=70?"B+":score>=60?"B":score>=50?"C":"D";
    const c=score>=80?cs.grn:score>=60?cs.amb:cs.red;
    return{score,grade,c,subs};
  },[sd,totalAl,narr,cs]);

  // Cost of Waiting analysis
  const costOfWait=useMemo(()=>{
    const f=proj[proj.length-1];
    if(!f||yrs<1)return[];
    return[1,3,6,12].map(mo=>{
      const eYrs=Math.max(0.5,yrs-mo/12);
      const pds=Math.round(eYrs*intv.perYr);
      let vs=sd.map(()=>0);
      for(let p=1;p<=pds;p++){
        const inc2=Math.pow(1+annInc/100,Math.floor((p-1)/intv.perYr));
        sd.forEach((x,i)=>{const mr=x.fc.base/100/intv.perYr;const dr=divReinvest?x.etf.d/100/intv.perYr:0;
          vs[i]=vs[i]*(1+mr+dr)+x.perUSD*inc2;});
      }
      const tv=vs.reduce((a,b)=>a+b,0);
      return{lbl:`${mo}mo`,val:tv,cost:f.val-tv};
    });
  },[proj,yrs,sd,intv,annInc,divReinvest]);

  // Chart tooltip style matching TOOLTIP_STANDARD.md
  const chartTip={background:cs.isDark?"#1e293b":"#fff",border:`1px solid ${cs.acc}4d`,borderRadius:10,
    padding:"10px 14px",fontSize:"0.78rem",fontFamily:cs.m,color:cs.isDark?"#e2e8f0":"#1e293b",
    boxShadow:cs.isDark?"0 8px 30px rgba(0,0,0,0.4)":"0 4px 24px rgba(0,0,0,0.12)",lineHeight:1.5};

  return(
  <div style={{fontFamily:cs.f,background:"transparent",color:cs.t1,minHeight:"100vh",padding:"0 20px",transition:"color .3s"}}>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;600;700&display=swap" rel="stylesheet"/>

    {/* ═══ HEADER ═══ */}
    <div style={{padding:isMobile?"10px 0":"14px 0 10px",borderBottom:`1px solid ${cs.bd}`}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <div style={{display:"flex",gap:4,background:cs.sf,borderRadius:10,padding:3,border:`1px solid ${cs.bd}`}}>
          {[{m:"sim",l:"Simulation",ic:"📊"},{m:"record",l:"Record",ic:"📒"}].map(x=>
            <button key={x.m} onClick={()=>D("CFG",{appMode:x.m})} style={{
              padding:"8px 16px",borderRadius:8,border:"none",
              background:appMode===x.m?`linear-gradient(135deg,${cs.acc}20,${cs.acc}08)`:  "transparent",
              color:appMode===x.m?cs.acc:cs.t3,fontSize:13,fontWeight:appMode===x.m?700:500,
              cursor:"pointer",fontFamily:cs.f,transition:"all .2s",
              boxShadow:appMode===x.m?`0 2px 8px ${cs.acc}20`:"none",
            }}>{x.ic} {x.l}</button>
          )}
        </div>
        <div style={{flex:1}}/>
        {appMode==="sim"&&<>
          {showSave?(
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Portfolio name"
                style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${cs.bd}`,background:cs.inp,color:cs.t1,fontSize:12,fontFamily:cs.m,outline:"none",width:120}}/>
              <button onClick={()=>{if(!saveName.trim())return;
                setSavedSims(prev=>[...prev,{id:Date.now(),name:saveName.trim(),
                  config:{invest,fee,spread,yrs,adj,annInc,divReinvest,interval,allocMode},
                  slots:slots.map(x=>({tk:x.tk,alloc:x.alloc,usd:x.usd})),
                  metrics:fin?{inv:fin.inv,val:fin.val,profit:fin.profit,pPct:fin.pPct,
                    cagr:fin.inv>0?(Math.pow(fin.val/fin.inv,1/yrs)-1)*100:0,divMo:fin.divMo,risk:narr.risk}:null}]);
                setSaveName("");setShowSave(false);}}
                style={{padding:"6px 12px",borderRadius:6,border:"none",background:cs.grn,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>Save</button>
              <button onClick={()=>{setShowSave(false);setSaveName("");}}
                style={{padding:"6px 8px",borderRadius:6,border:`1px solid ${cs.bd}`,background:"transparent",color:cs.t3,fontSize:11,cursor:"pointer"}}>✕</button>
            </div>
          ):(
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setShowSave(true)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${cs.grn}40`,background:`${cs.grn}08`,color:cs.grn,fontSize:12,fontWeight:600,cursor:"pointer"}}>💾 Save</button>
              {savedSims.length>=2&&<button onClick={()=>D("SET",{view:"compare"})} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${cs.pur}40`,background:`${cs.pur}08`,color:cs.pur,fontSize:12,fontWeight:600,cursor:"pointer"}}>⚖️ Compare</button>}
            </div>
          )}
        </>}
        {appMode==="sim"&&<button onClick={()=>D("CFG",{showCfg:!showCfg})} style={{
          padding:"8px 14px",borderRadius:8,border:`1px solid ${cs.bd}`,
          background:showCfg?cs.sf2:"transparent",color:cs.t2,fontSize:13,cursor:"pointer",
          transition:"all .2s",display:"flex",alignItems:"center",gap:4
        }}>{showCfg?"▼":"▶"} Settings</button>}
      </div>

      {/* Config — Simulation mode only */}
      {showCfg&&appMode==="sim"&&(
        <div style={{padding:isMobile?12:16,background:cs.sf,borderRadius:12,border:`1px solid ${cs.bd}`,marginBottom:8,boxShadow:cs.sh,backgroundImage:cs.grd,transition:"all .25s"}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":`repeat(4,1fr)`,gap:8,marginBottom:10}}>
            <Inp cs={cs} l="Investment" v={invest} onChange={v=>D("CFG",{invest:v})} pre="$" fmt tip={{t:"Investment (USD)",d:"Investment amount per period in USD. Start with any amount that fits your budget.",f:"Benchmark: $50-300/mo"}}/>
            <Inp cs={cs} l="Fee" v={fee} onChange={v=>D("CFG",{fee:v})} suf="%" step={.1} tip={{t:"Broker Fee",d:"Trading fee per order. Gotrade ~0.3%, Interactive Brokers ~$1 flat.",f:"Benchmark: <0.5% cost-efficient"}}/>
            <Inp cs={cs} l="Spread" v={spread} onChange={v=>D("CFG",{spread:v})} suf="%" step={.1} tip={{t:"Bid-Ask Spread",d:"Price spread during execution. Liquid ETFs like VOO/SPY have very small spreads.",f:"Benchmark: 0.01-0.05% (VOO)"}}/>
            <Inp cs={cs} l="Horizon" v={yrs} onChange={v=>D("CFG",{yrs:Math.max(1,Math.min(30,v||1))})} suf="yr" tip={{t:"Investment Horizon",d:"Investment time horizon. DCA into equities is optimal for 5-10+ years to maximize compounding.",f:"Ref: S&P 500 no loss over 20yr period"}}/>
            <Inp cs={cs} l="Adj Return" v={adj} onChange={v=>D("CFG",{adj:v})} suf="%" step={.5} tip={{t:"Return Adjustment",d:"Manual adjustment to projected return. Negative = conservative, positive = optimistic.",f:"Benchmark: -2% to -5% for conservative"}}/>
            <Inp cs={cs} l="DCA +/yr" v={annInc} onChange={v=>D("CFG",{annInc:v})} suf="%" tip={{t:"Annual Increase",d:"Increase DCA amount annually to match income growth.",f:"Benchmark: 5-10%/yr"}}/>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              <label style={{fontSize:11,color:cs.t3,fontWeight:600,textTransform:"uppercase"}}><Tip title="DRIP" text="Dividend Reinvestment Plan — dividends automatically reinvested into shares for compounding." formula="Ref: DRIP adds ~1-2% CAGR over 20 years" cs={cs}><span>DRIP</span></Tip></label>
              <button onClick={()=>D("CFG",{divReinvest:!divReinvest})} style={{height:36,borderRadius:6,
                border:`1px solid ${divReinvest?cs.grn:cs.bd}`,background:divReinvest?`${cs.grn}18`:"transparent",
                color:divReinvest?cs.grn:cs.t3,fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .2s"}}>{divReinvest?"ON ✓":"OFF"}</button>
            </div>
          </div>

          {/* Interval + Alloc mode */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8,flexWrap:"wrap"}}>
            <Tip title="Interval" text="Investment frequency. Monthly is most common, Weekly reduces timing risk." formula="Ref: Weekly vs Monthly diff <0.3%/yr" cs={cs}><span style={{fontSize:12,color:cs.t3,fontWeight:600}}>Interval:</span></Tip>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {INTERVALS.map(iv=><Pill cs={cs} key={iv.id} active={interval===iv.id} onClick={()=>D("CFG",{interval:iv.id})}>{iv.nm}</Pill>)}
            </div>
            <Tip title="Alloc Mode" text="Allocation as percentage (%) or fixed USD ($) per ETF." cs={cs}><span style={{fontSize:12,color:cs.t3,fontWeight:600,marginLeft:isMobile?0:10}}>Alloc:</span></Tip>
            <div style={{display:"flex",gap:4}}>
              {ALLOC_MODES.map(am=><Pill cs={cs} key={am.id} active={allocMode===am.id} onClick={()=>D("CFG",{allocMode:am.id})} color={cs.pur}>{am.nm}</Pill>)}
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:`linear-gradient(135deg,${cs.grn}08,transparent)`,borderRadius:8,alignItems:"center",flexWrap:"wrap",gap:4,border:`1px solid ${cs.grn}20`}}>
            <span style={{fontSize:12,color:cs.t3}}>Net per {intv.nm.toLowerCase()}</span>
            <span style={{fontSize:18,fontWeight:700,color:cs.grn,fontFamily:cs.m}}>{$(grossPer,2)}<span style={{fontSize:11,color:cs.t3,fontWeight:400,marginLeft:6}}>({$(invest,0)} × {intv.factor.toFixed(2)})</span></span>
          </div>
        </div>
      )}

      {/* Quick bar — sim mode collapsed / record mode stats */}
      {appMode==="sim"&&!showCfg&&(
        <div style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",background:cs.sf2,borderRadius:4,fontSize:12,color:cs.t3,alignItems:"center"}}>
          <span>DCA: <b style={{color:cs.grn,fontFamily:cs.m}}>{$(grossPer,2)}/{intv.nm.toLowerCase()}</b></span>
          <span>Risk: <b style={{color:narr.riskC}}>{narr.risk}</b></span>
          {fin&&<span>{yrs}yr: <b style={{color:cs.acc,fontFamily:cs.m}}>{$(fin.val)}</b></span>}
        </div>
      )}
      {appMode==="record"&&recStats&&(
        <Box cs={cs} glow={cs.grn} style={{padding:"10px 14px",marginBottom:4}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:13,fontWeight:700,color:cs.grn}}>📋 Portfolio Record</span>
            <span style={{fontSize:11,color:cs.t3}}>{recStats.totalTxns} transactions · {sd.length} ETFs</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:6}}>
            <div><div style={{fontSize:10,color:cs.t3,textTransform:"uppercase",fontWeight:600}}>First DCA</div><div style={{fontSize:13,fontWeight:700,fontFamily:cs.m,color:cs.t1}}>{new Date(recStats.first+'T00:00:00').toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})}</div></div>
            <div><div style={{fontSize:10,color:cs.t3,textTransform:"uppercase",fontWeight:600}}>Portfolio Age</div><div style={{fontSize:13,fontWeight:700,fontFamily:cs.m,color:cs.t1}}>{recStats.months} months</div></div>
            <div><div style={{fontSize:10,color:cs.t3,textTransform:"uppercase",fontWeight:600}}>Avg DCA</div><div style={{fontSize:13,fontWeight:700,fontFamily:cs.m,color:cs.grn}}>{$(recStats.avgPerMonth,0)}/mo</div></div>
            <div><div style={{fontSize:10,color:cs.t3,textTransform:"uppercase",fontWeight:600}}>Frequency</div><div style={{fontSize:13,fontWeight:700,fontFamily:cs.m,color:cs.acc}}>{recStats.freq}</div></div>
          </div>
        </Box>
      )}
      {appMode==="record"&&!recStats&&(
        <Box cs={cs} style={{padding:16,marginBottom:4,textAlign:"center"}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>📋 Start Your Record</div>
          <div style={{fontSize:12,color:cs.t3}}>Switch to the Record tab, select an ETF, and add your first transaction.<br/>Enter the date, price, and either amount (USD) or shares.</div>
        </Box>
      )}
    </div>

    {/* ═══ NAV ═══ */}
    <div style={{display:"flex",gap:2,padding:"6px 0",marginBottom:4,background:cs.sf,borderRadius:10,border:`1px solid ${cs.bd}`,marginTop:8}}>
      {[{id:"main",l:"Dashboard",ic:"📊"},...(appMode==="record"?[{id:"txn",l:"Record",ic:"📒"}]:[]),{id:"proj",l:"Projection",ic:"📈"},{id:"anal",l:"Analysis",ic:"🧠"},...(appMode==="sim"&&savedSims.length>=2?[{id:"compare",l:"Compare",ic:"⚖️"}]:[])].map(n=>
        <button key={n.id} onClick={()=>D("SET",{view:n.id})} style={{
          flex:1,padding:"10px 0",border:"none",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:cs.f,
          background:view===n.id?`linear-gradient(135deg,${cs.acc}18,${cs.acc}08)`:"transparent",
          color:view===n.id?cs.acc:cs.t3,borderRadius:8,margin:"0 3px",
          boxShadow:view===n.id?`0 2px 8px ${cs.acc}15`:"none",transition:"all .2s",
        }}>{n.ic} {n.l}</button>
      )}
    </div>

    <div style={{padding:isMobile?8:12}}>

    {/* ══════ DASHBOARD ══════ */}
    {view==="main"&&(<>
      {/* Metrics */}
      {appMode==="record"&&(
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
          {[{l:"Invested",v:$(tot.inv),g:cs.acc},{l:"Value",v:$(tot.cur),c:cs.acc,g:cs.acc},{l:"P&L",v:`${tot.gl>=0?"+":""}${$(tot.gl)}`,c:tot.gl>=0?cs.grn:cs.red,s:P(tot.glP),g:tot.gl>=0?cs.grn:cs.red},{l:"Div/yr",v:$(tot.annD),c:cs.cyn,g:cs.cyn}]
            .map((x,i)=><Box cs={cs} key={i} glow={x.g} style={{padding:"12px 14px"}}><Num cs={cs} l={x.l} v={x.v} c={x.c} s={x.s}/></Box>)}
        </div>
      )}

      {/* Allocation */}
      <Box cs={cs} style={{padding:14,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <Tip title="Allocation" text={allocMode==="pct"?"Portfolio allocation per ETF. In % mode, total must equal 100%.":"Fixed USD amount per period for each ETF."} formula="Benchmark: 60/20/20 core/growth/dividend" cs={cs}><span style={{fontSize:13,fontWeight:700}}>Allocation {allocMode==="usd"?"(USD)":"(%)"}</span></Tip>
          <span style={{fontSize:13,fontFamily:cs.m,color:totalAl===100||allocMode==="usd"?cs.grn:cs.red,fontWeight:700}}>
            {allocMode==="pct"?`${totalAl}%`:$(sd.reduce((a,x)=>a+x.perUSD,0))+`/${intv.nm.toLowerCase()}`}
          </span>
        </div>

        {allocMode==="pct"&&<div style={{display:"flex",gap:4,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
          {appMode==="sim"&&<>
            <span style={{fontSize:10,color:cs.t3,fontWeight:600}}>Presets:</span>
            {[
              {n:"🚀 Growth",s:[{tk:"VOO",a:25},{tk:"QQQ",a:30},{tk:"VGT",a:25},{tk:"VTI",a:20}]},
              {n:"⚖️ Balanced",s:[{tk:"VOO",a:25},{tk:"QQQ",a:15},{tk:"SCHD",a:20},{tk:"VTI",a:25},{tk:"VIG",a:15}]},
              {n:"💰 Income",s:[{tk:"SCHD",a:30},{tk:"VIG",a:30},{tk:"VOO",a:25},{tk:"SPY",a:15}]},
              {n:"📊 Index",s:[{tk:"VOO",a:35},{tk:"VTI",a:35},{tk:"SPLG",a:30}]},
            ].map(tmpl=>
              <button key={tmpl.n} onClick={()=>D("SLOTS_SET",tmpl.s.map(x=>({tk:x.tk,alloc:x.a,usd:0,txns:[]})))}
                style={{padding:"3px 10px",borderRadius:6,border:`1px solid ${cs.acc}30`,background:`${cs.acc}06`,color:cs.acc,fontSize:10,fontWeight:600,cursor:"pointer",transition:"all .2s"}}>{tmpl.n}</button>
            )}
          </>}
          <button onClick={()=>D("SLOTS_EQ")}
            style={{padding:"3px 10px",borderRadius:6,border:`1px solid ${cs.pur}30`,background:`${cs.pur}06`,color:cs.pur,fontSize:10,fontWeight:600,cursor:"pointer",marginLeft:appMode==="sim"?4:0}}>= Equal</button>
        </div>}

        {allocMode==="pct"&&<div style={{display:"flex",height:6,borderRadius:4,overflow:"hidden",marginBottom:8,background:cs.bd}}>
          {sd.map((x,i)=><div key={i} style={{width:`${x.al}%`,background:`linear-gradient(90deg,${x.etf.c},${x.etf.c}cc)`,transition:"width .3s",boxShadow:`0 0 4px ${x.etf.c}40`}}/>)}
        </div>}

        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}>
            {sd.map((x,i)=>(
              <div key={i} onClick={()=>D("SET",{editIdx:i,view:"txn"})} style={{
                display:"flex",alignItems:"center",gap:8,padding:"8px 10px",marginBottom:3,borderRadius:8,cursor:"pointer",
                border:`1px solid ${editIdx===i?x.etf.c:cs.bd}`,
                background:editIdx===i?`${x.etf.c}10`:"transparent",
                transition:"all .2s",
              }}>
                <div style={{width:8,height:8,borderRadius:"50%",background:x.etf.c,flexShrink:0,boxShadow:`0 0 6px ${x.etf.c}60`}}/>
                <span style={{fontSize:13,fontWeight:800,color:x.etf.c,fontFamily:cs.m,width:40}}>{x.tk}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:cs.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.etf.nm}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0,display:"flex",alignItems:"center",gap:6}}>
                  {allocMode==="pct"?(
                    <input type="number" value={x.al} onChange={e=>D("SLOT_UPD",{i,d:{alloc:Math.max(0,Math.min(100,+e.target.value||0))}})}
                      onClick={e=>e.stopPropagation()}
                      style={{width:40,textAlign:"center",padding:"3px",background:cs.bg,border:`1px solid ${cs.bd}`,borderRadius:3,color:x.etf.c,fontSize:13,fontFamily:cs.m,fontWeight:700,outline:"none"}}/>
                  ):(
                    <input type="number" value={x.usd} step="1" placeholder="0" onChange={e=>D("SLOT_UPD",{i,d:{usd:+e.target.value||0}})}
                      onClick={e=>e.stopPropagation()}
                      style={{width:56,textAlign:"right",padding:"3px 4px",background:cs.bg,border:`1px solid ${cs.bd}`,borderRadius:3,color:x.etf.c,fontSize:13,fontFamily:cs.m,fontWeight:700,outline:"none"}}/>
                  )}
                  <span style={{fontSize:10,color:cs.t3,width:14}}>{allocMode==="pct"?"%":"$"}</span>
                  <span style={{fontSize:11,color:cs.t3,fontFamily:cs.m,width:44,textAlign:"right"}}>{$(x.perUSD,1)}</span>
                </div>
              </div>
            ))}
          </div>
          {allocMode==="pct"&&<div style={{width:80,height:80,flexShrink:0}}><ResponsiveContainer><PieChart>
            <Pie data={pie} dataKey="value" cx="50%" cy="50%" innerRadius={18} outerRadius={36} strokeWidth={0} paddingAngle={2}>
              {pie.map((d,i)=><Cell key={i} fill={d.color}/>)}
            </Pie>
            <Tooltip content={({active,payload})=>{
              if(!active||!payload?.length)return null;
              const d=payload[0]?.payload;if(!d)return null;
              return<div style={chartTip}>
                <div style={{fontWeight:700,color:d.color,marginBottom:2}}>{d.name}</div>
                <div>{d.value}% allocation</div>
                <div style={{fontSize:"0.72rem",color:cs.isDark?"#94a3b8":"#9ca3af"}}>{DB[d.name]?.nm}</div>
              </div>;
            }}/>
          </PieChart></ResponsiveContainer></div>}
        </div>

        {Object.keys(DB).some(t=>!slots.find(x=>x.tk===t))&&(
          <div style={{display:"flex",gap:3,flexWrap:"wrap",paddingTop:5,borderTop:`1px solid ${cs.bd}`,marginTop:5,alignItems:"center"}}>
            <span style={{fontSize:11,color:cs.t3,fontWeight:600}}>+ Add:</span>
            {Object.keys(DB).filter(t=>!slots.find(x=>x.tk===t)).map(t=>
              <button key={t} onClick={()=>D("SLOT_ADD",t)} disabled={slots.length>=6}
                style={{padding:"3px 10px",borderRadius:8,border:`1px solid ${DB[t].c}40`,background:"transparent",
                  color:slots.length>=6?cs.t3:DB[t].c,fontSize:11,fontWeight:700,
                  cursor:slots.length>=6?"not-allowed":"pointer",opacity:slots.length>=6?0.3:1}}>{t}</button>
            )}
            {slots.length>=6&&<span style={{fontSize:10,color:cs.t3,fontStyle:"italic"}}>Max 6 ETFs</span>}
          </div>
        )}
      </Box>

      {/* Narrative preview */}
      <Box cs={cs} style={{padding:14,marginBottom:10}}>
        <div style={{fontSize:14,fontWeight:800,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>🧠 Intelligence</div>
        {narr.lines.slice(0,3).map((ln,i)=>(
          <div key={i} style={{padding:"5px 0",borderBottom:i<2?`1px solid ${cs.bd}10`:undefined}}>
            <div style={{fontSize:12,fontWeight:700,color:ln.c||cs.t1}}>{ln.i} {ln.t}</div>
            <div style={{fontSize:11,color:cs.t2,lineHeight:1.5}}>{ln.x}</div>
          </div>
        ))}
        <button onClick={()=>D("SET",{view:"anal"})} style={{marginTop:6,padding:"6px 0",width:"100%",borderRadius:3,border:`1px dashed ${cs.acc}30`,background:"transparent",color:cs.acc,fontSize:11,fontWeight:600,cursor:"pointer"}}>Full Analysis →</button>
      </Box>

      {/* Mini chart — dual mode */}
      {(fullChart||proj.length>2)&&(
        <Box cs={cs} style={{padding:14}}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={fullChart||proj} margin={{top:5,right:5,bottom:0,left:5}}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cs.acc} stopOpacity={.25}/><stop offset="100%" stopColor={cs.acc} stopOpacity={0}/></linearGradient>
                <linearGradient id="gH" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cs.grn} stopOpacity={.3}/><stop offset="100%" stopColor={cs.grn} stopOpacity={0}/></linearGradient>
                <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cs.acc} stopOpacity={.2}/><stop offset="100%" stopColor={cs.acc} stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="lbl" tick={{fontSize:9,fill:cs.t3}} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v=>$(v)} tick={{fontSize:10,fill:cs.t3}} axisLine={false} width={44}/>
              <Tooltip content={({active,payload})=>{
                if(!active||!payload?.length)return null;
                const d=payload[0]?.payload;if(!d)return null;
                const val=d.hist||d.proj||d.val||0;const isH=d.hist!=null&&d.proj==null;
                return<div style={chartTip}>
                  <div style={{fontWeight:700,color:isH?cs.grn:cs.acc,marginBottom:4,fontSize:"0.82rem"}}>{d.lbl} {isH?"(Actual)":d.isNow?"":"(Projected)"}</div>
                  <div>Portfolio: <b style={{color:isH?cs.grn:cs.acc}}>{$(val)}</b></div>
                  <div>Invested: {$(d.inv)}{d.inv>0&&val>0?<> | P&L: <b style={{color:val>=d.inv?cs.grn:cs.red}}>{val>=d.inv?"+":""}{$(val-d.inv)} ({P((val-d.inv)/d.inv*100)})</b></>:null}</div>
                  {d.divMo>0&&<div style={{color:cs.cyn}}>Div: {$(d.divMo,1)}/mo</div>}
                </div>;
              }}/>
              {fullChart?<>
                <Area type="monotone" dataKey="hist" stroke={cs.grn} fill="url(#gH)" strokeWidth={2} connectNulls={false}/>
                <Area type="monotone" dataKey="proj" stroke={cs.acc} fill="url(#gF)" strokeWidth={2} strokeDasharray="6 3" connectNulls={false}/>
                <ReferenceLine x="NOW" stroke={cs.red} strokeWidth={2} strokeDasharray="4 2" label={{value:"NOW",fill:cs.red,fontSize:9,fontWeight:700,position:"top"}}/>
              </>:<>
                <Area type="monotone" dataKey="val" stroke={cs.acc} fill="url(#g1)" strokeWidth={1.5}/>
              </>}
              <Area type="monotone" dataKey="inv" stroke={cs.t3} fill="none" strokeWidth={1} strokeDasharray="3 3"/>
            </AreaChart>
          </ResponsiveContainer>
          {fullChart&&<div style={{display:"flex",gap:12,justifyContent:"center",marginTop:4,fontSize:10,color:cs.t3}}>
            <span><span style={{display:"inline-block",width:12,height:2,background:cs.grn,verticalAlign:"middle",marginRight:4}}/>Actual</span>
            <span><span style={{display:"inline-block",width:12,height:2,background:cs.acc,borderBottom:`1px dashed ${cs.acc}`,verticalAlign:"middle",marginRight:4}}/>Projected</span>
            <span><span style={{display:"inline-block",width:8,height:8,border:`2px solid ${cs.red}`,verticalAlign:"middle",marginRight:4}}/>NOW</span>
          </div>}
          {fin&&<div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:11,color:cs.t3}}>
            <span>{yrs}yr: <b style={{color:cs.acc}}>{$(fin.val)}</b></span>
            <span>+<b style={{color:cs.grn}}>{P(fin.pPct)}</b></span>
            <span>CAGR: <b style={{color:cs.amb}}>{P(fin.inv>0?(Math.pow(fin.val/fin.inv,1/yrs)-1)*100:0)}</b></span>
            <span>Div: <b style={{color:cs.cyn}}>{$(fin.divMo)}/mo</b></span>
          </div>}
        </Box>
      )}

      {/* Final Summary with IDR */}
      {fin&&(()=>{
        const idrEnd=forecastIDR(yrs);
        const idrMid=forecastIDR(Math.floor(yrs/2));
        const totalDiv=proj.filter(p=>p.m>0).reduce((a,p)=>a+p.divMo,0)*12/proj.filter(p=>p.m>0).length*yrs||0;
        const metrics=[
          {l:"Total Invested",v:$(fin.inv),idr:IDR(fin.inv*idrMid.rate),c:cs.t1,rateNote:`avg Rp ${idrMid.rate.toLocaleString("en")}`},
          {l:"Final Value",v:$(fin.val),idr:IDR(fin.val*idrEnd.rate),c:cs.acc,rateNote:`Rp ${idrEnd.rate.toLocaleString("en")}`},
          {l:"Total Profit",v:`${fin.profit>=0?"+":""}${$(fin.profit)} (${P(fin.pPct)})`,idr:`${fin.profit>=0?"+":""}${IDR(fin.profit*idrEnd.rate)}`,c:fin.profit>=0?cs.grn:cs.red},
          {l:"CAGR",v:P(fin.inv>0?(Math.pow(fin.val/fin.inv,1/yrs)-1)*100:0),c:cs.pur},
          {l:"Total Dividends (est.)",v:$(totalDiv),idr:IDR(totalDiv*idrMid.rate),c:cs.cyn},
          {l:`Passive Income (yr ${yrs})`,v:`${$(fin.divMo)}/mo`,idr:`${IDR(fin.divMo*idrEnd.rate)}/mo`,c:cs.cyn},
        ];
        return(
        <Box cs={cs} glow={cs.acc} style={{padding:16,marginTop:10,borderLeft:`3px solid ${cs.acc}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:14,fontWeight:800,color:cs.acc}}>Final Summary</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:cs.amb,fontWeight:600}}>USD/IDR yr{yrs}: Rp {idrEnd.rate.toLocaleString("en")}</div>
                <div style={{fontSize:9,color:cs.t3}}>+{idrEnd.cagr.toFixed(1)}%/yr forecast · Base: Rp {forecastIDR(0).baseRate.toLocaleString("en")}</div>
              </div>
              <select value={yrs} onChange={e=>D("CFG",{yrs:+e.target.value})}
                style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${cs.bd}`,background:cs.inp,color:cs.t1,fontSize:13,fontFamily:cs.m,cursor:"pointer",outline:"none"}}>
                {[5,10,15,20,25,30].map(y=><option key={y} value={y}>{y} Years</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:8}}>
            {metrics.map((x,i)=>(
              <div key={i} style={{padding:"10px 12px",background:cs.sf2,borderRadius:8,border:`1px solid ${cs.bd}`,
                backgroundImage:`linear-gradient(135deg,${x.c}08,transparent 60%)`}}>
                <div style={{fontSize:18,fontWeight:700,color:x.c,fontFamily:cs.m}}>{x.v}</div>
                {x.idr&&<div style={{fontSize:12,color:cs.amb,fontFamily:cs.m,marginTop:2,opacity:0.85}}>{x.idr}</div>}
                <div style={{fontSize:11,color:cs.t3,marginTop:3}}>{x.l}{x.rateNote&&<span style={{fontSize:9,color:cs.t3,marginLeft:4}}>@{x.rateNote}</span>}</div>
              </div>
            ))}
          </div>
        </Box>);
      })()}

      {/* FIRE Independence Tracker */}
      {fin&&(
        <Box cs={cs} glow={cs.amb} style={{padding:16,marginTop:10,borderLeft:`3px solid ${cs.amb}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}>
            <span style={{fontSize:14,fontWeight:800,color:cs.amb}}>FIRE Independence</span>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{fontSize:11,color:cs.t3}}>Target:</span>
              <div style={{display:"flex",alignItems:"center",background:cs.inp,border:`1px solid ${cs.bd}`,borderRadius:6,height:28,overflow:"hidden"}}>
                <span style={{padding:"0 6px",fontSize:10,color:cs.t3,background:cs.sf2,borderRight:`1px solid ${cs.bd}`,height:"100%",display:"flex",alignItems:"center"}}>$</span>
                <input type="number" value={fireTarget} onChange={e=>setFireTarget(Math.max(100,+e.target.value||2000))}
                  style={{width:60,padding:"0 6px",background:"transparent",border:"none",color:cs.t1,fontSize:12,fontFamily:cs.m,outline:"none"}}/>
                <span style={{padding:"0 6px",fontSize:10,color:cs.t3}}>/mo</span>
              </div>
            </div>
          </div>
          {fireData&&<>
            <div style={{height:8,background:`${cs.amb}15`,borderRadius:4,overflow:"hidden",marginBottom:8}}>
              <div style={{height:"100%",width:`${fireData.covPct}%`,background:`linear-gradient(90deg,${cs.amb},${fireData.covPct>=100?cs.grn:cs.amb}cc)`,borderRadius:4,transition:"width .5s",boxShadow:`0 0 8px ${cs.amb}40`}}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:12}}>
              <div><div style={{fontSize:10,color:cs.t3,textTransform:"uppercase",fontWeight:600}}>Coverage</div>
                <div style={{fontSize:16,fontWeight:800,fontFamily:cs.m,color:fireData.covPct>=100?cs.grn:cs.amb}}>{P(fireData.covPct,1)}</div></div>
              <div><div style={{fontSize:10,color:cs.t3,textTransform:"uppercase",fontWeight:600}}>Div Income (yr {yrs})</div>
                <div style={{fontSize:16,fontWeight:800,fontFamily:cs.m,color:cs.cyn}}>{$(fireData.divMo,0)}/mo</div></div>
              <div><div style={{fontSize:10,color:cs.t3,textTransform:"uppercase",fontWeight:600}}>FIRE ETA</div>
                <div style={{fontSize:16,fontWeight:800,fontFamily:cs.m,color:fireData.fireYr?cs.grn:cs.t3}}>{fireData.fireYr||`${yrs}yr+`}</div></div>
            </div>
            <div style={{fontSize:11,color:cs.t2,marginTop:6,lineHeight:1.5}}>
              {fireData.covPct>=100?"Your dividend income covers your target expenses. Financial independence reached!"
                :fireData.covPct>=75?`Almost there! Dividends cover ${P(fireData.covPct,0)} of expenses. Keep investing consistently.`
                :fireData.covPct>=50?"Halfway to FIRE! Your passive income is growing steadily."
                :`Dividends cover ${P(fireData.covPct,0)} of your ${$(fireData.tgt)}/mo target. Consistency is key.`}
            </div>
          </>}
        </Box>
      )}
    </>)}

    {/* ══════ TRANSACTIONS / PLAN ══════ */}
    {view==="txn"&&(<>
      <div style={{display:"flex",gap:3,marginBottom:8}}>
        {sd.map((x,i)=><button key={i} onClick={()=>D("SET",{editIdx:i})} style={{
          flex:1,padding:"7px 2px",borderRadius:4,border:`1.5px solid ${editIdx===i?x.etf.c:cs.bd}`,
          background:editIdx===i?`${x.etf.c}10`:"transparent",color:editIdx===i?x.etf.c:cs.t3,
          fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:cs.m
        }}>{x.tk}<br/><span style={{fontSize:9,fontWeight:400}}>{x.txnCount}tx</span></button>)}
      </div>

      {editIdx!==null&&editIdx<sd.length&&(()=>{
        const x=sd[editIdx],sl=slots[editIdx];
        return(<>
          <Box cs={cs} style={{padding:14,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:18,fontWeight:800,color:x.etf.c,fontFamily:cs.m}}>{x.tk}</span>
                <span style={{fontSize:11,color:cs.t2}}>{x.etf.nm} · {x.etf.cat}</span>
              </div>
              {confirmDel===editIdx?(
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:10,color:cs.red,fontWeight:600}}>Remove?</span>
                  <button onClick={()=>{D("SLOT_RM",editIdx);setConfirmDel(null);}} style={{padding:"2px 8px",borderRadius:4,border:"none",background:cs.red,color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer"}}>Yes</button>
                  <button onClick={()=>setConfirmDel(null)} style={{padding:"2px 8px",borderRadius:4,border:`1px solid ${cs.bd}`,background:"transparent",color:cs.t3,fontSize:10,cursor:"pointer"}}>No</button>
                </div>
              ):(
                <button onClick={()=>setConfirmDel(editIdx)} title="Remove ETF"
                  style={{padding:"3px 8px",borderRadius:3,border:`1px solid ${cs.red}30`,background:"transparent",color:cs.red,fontSize:11,cursor:"pointer",opacity:0.4,transition:"opacity .2s"}}>×</button>
              )}
            </div>
            <div style={{fontSize:11,color:cs.t3,marginBottom:4}}>
              Forecast: {P(x.fc.base)} (10Y:{P(x.fc.cagr10)} 5Y:{P(x.fc.cagr5)} Blend:{P(x.fc.blended)}) · Div:{P(x.etf.d)} · ER:{P(x.etf.er,2)} · β:{x.etf.b} · MaxDD:{P(x.etf.dd)}
            </div>
            {appMode==="record"&&x.txnCount>0&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,padding:6,background:cs.bg,borderRadius:4}}>
                <Num cs={cs} l="Shares" v={x.sh>0?x.sh.toFixed(3):"—"}/><Num cs={cs} l="Avg" v={x.avg>0?$(x.avg,2):"—"}/>
                <Num cs={cs} l="Value" v={$(x.cur)} c={cs.acc}/><Num cs={cs} l="P&L" v={x.inv>0?`${x.gl>=0?"+":""}${P(x.glP)}`:"—"} c={x.gl>=0?cs.grn:cs.red}/>
              </div>
            )}
          </Box>

          {/* Bulk generator */}
          <Box cs={cs} glow={cs.pur} style={{padding:14,marginBottom:8,borderColor:`${cs.pur}30`,backgroundImage:`linear-gradient(135deg,${cs.pur}08,transparent 60%)`}}>
            <div style={{fontSize:12,fontWeight:700,color:cs.pur,marginBottom:4}}>⚡ Quick Generate ({intv.nm})</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 80px",gap:6}}>
              <Inp cs={cs} l={`# of ${intv.nm.toLowerCase()}`} v={bkN} onChange={setBkN}/>
              <Inp cs={cs} l="Est. price" v={bkPr} onChange={setBkPr} pre="$" ph="0.00"/>
              <Inp cs={cs} l="Amount" v={bkAm} onChange={setBkAm} pre="$" ph={x.perUSD>0?x.perUSD.toFixed(0):"0"}/>
              <div style={{display:"flex",alignItems:"flex-end"}}><button onClick={()=>{
                if(+bkPr>0)D("TX_BULK",{i:editIdx,n:bkN||12,pr:+bkPr,am:+(bkAm||x.perUSD.toFixed(0))});
              }} style={{padding:"0 10px",height:36,borderRadius:4,border:"none",background:cs.pur,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",width:"100%"}}>Go</button></div>
            </div>
            <div style={{fontSize:11,color:cs.t3,marginTop:4}}>Generate {bkN} entries × {$(+(bkAm||x.perUSD.toFixed(0)))} every {intv.nm.toLowerCase()}</div>
          </Box>

          {/* Transaction list */}
          <Box cs={cs} style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:14,fontWeight:700}}>Entries</span>
              <span style={{fontSize:11,color:cs.t3}}>{sl.txns.length} total</span>
            </div>

            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"18px 74px 62px 62px 62px 18px":"20px 92px 78px 78px 78px 20px",gap:3,padding:"3px 0",borderBottom:`1px solid ${cs.bd}`,minWidth:isMobile?296:366}}>
              {["#","Date","Price","Amount","Shares",""].map((h,i)=><span key={i} style={{fontSize:10,color:cs.t3,fontWeight:700,textTransform:"uppercase"}}>{h}</span>)}
            </div>
            <div style={{fontSize:9,color:cs.t3,padding:"3px 0",fontStyle:"italic"}}>Fill Amount or Shares — the other auto-calculates when Price is set</div>

            {sl.txns.length===0&&<div style={{padding:20,textAlign:"center",fontSize:13,color:cs.t3}}>No entries yet</div>}

            <div style={{maxHeight:300,overflowY:"auto"}}>
              {sl.txns.map((t,ti)=>{
                const sh=+t.pr>0&&+t.am>0?+t.am/+t.pr:0;
                return(
                  <div key={t.id} style={{display:"grid",gridTemplateColumns:isMobile?"18px 74px 62px 62px 62px 18px":"20px 92px 78px 78px 78px 20px",gap:3,padding:"3px 0",borderBottom:`1px solid ${cs.bd}10`,minWidth:isMobile?296:366}}>
                    <span style={{fontSize:11,color:cs.t3,display:"flex",alignItems:"center"}}>{ti+1}</span>
                    <input type="date" value={t.dt} onChange={e=>D("TX_UPD",{i:editIdx,id:t.id,f:"dt",v:e.target.value})}
                      style={{padding:"3px 4px",background:cs.bg,border:`1px solid ${cs.bd}`,borderRadius:3,color:cs.t1,fontSize:12,fontFamily:cs.m}}/>
                    <div style={{display:"flex",alignItems:"center",background:cs.bg,border:`1px solid ${cs.bd}`,borderRadius:3}}>
                      <span style={{padding:"0 3px",fontSize:10,color:cs.t3}}>$</span>
                      <input type="number" value={t.pr} step="0.01" placeholder="0.00" onChange={e=>D("TX_UPD",{i:editIdx,id:t.id,f:"pr",v:e.target.value})}
                        style={{width:"100%",padding:"3px",background:"transparent",border:"none",color:cs.t1,fontSize:12,fontFamily:cs.m,outline:"none"}}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",background:cs.bg,border:`1px solid ${cs.bd}`,borderRadius:3}}>
                      <span style={{padding:"0 3px",fontSize:10,color:cs.t3}}>$</span>
                      <input type="number" value={t.am} step="0.01" placeholder="0" onChange={e=>{
                        D("TX_UPD",{i:editIdx,id:t.id,f:"am",v:e.target.value});
                      }} style={{width:"100%",padding:"3px",background:"transparent",border:"none",color:cs.t1,fontSize:12,fontFamily:cs.m,outline:"none"}}/>
                    </div>
                    <div style={{display:"flex",alignItems:"center",background:cs.bg,border:`1px solid ${x.etf.c}30`,borderRadius:3}}>
                      <input type="number" key={`sh-${t.id}-${t.am}-${t.pr}`}
                        defaultValue={sh>0?parseFloat(sh.toFixed(7)):""}
                        step="any" placeholder="shares"
                        onBlur={e=>{
                          const v=parseFloat(e.target.value);
                          if(!isNaN(v)&&v>0&&+t.pr>0)D("TX_UPD",{i:editIdx,id:t.id,f:"am",v:String(+(v*+t.pr).toFixed(4))});
                        }}
                        style={{width:"100%",padding:"3px",background:"transparent",border:"none",color:x.etf.c,fontSize:12,fontFamily:cs.m,outline:"none"}}/>
                    </div>
                    <button onClick={()=>D("TX_DEL",{i:editIdx,id:t.id})} style={{background:"transparent",border:"none",color:cs.red,cursor:"pointer",fontSize:12,padding:0}}>×</button>
                  </div>
                );
              })}
            </div>
            </div>

            <button onClick={()=>D("TX_ADD",{i:editIdx})} style={{
              marginTop:6,padding:"8px 0",width:"100%",borderRadius:4,border:`1.5px dashed ${cs.acc}40`,
              background:"transparent",color:cs.acc,fontSize:13,fontWeight:700,cursor:"pointer"
            }}>+ Manual Entry</button>
          </Box>
        </>);
      })()}
    </>)}

    {/* ══════ PROJECTION ══════ */}
    {view==="proj"&&(<>
      <Box cs={cs} style={{padding:14,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:6}}>
          <span style={{fontSize:14,fontWeight:700}}>{appMode==="record"?"Actual + Forecast":"Growth"}</span>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:2,background:cs.sf2,borderRadius:8,padding:2,border:`1px solid ${cs.bd}`}}>
              {[1,3,5,7,10,15,20].map(y=><button key={y} onClick={()=>D("CFG",{yrs:y})} style={{
                padding:"4px 10px",borderRadius:6,border:"none",
                background:yrs===y?`linear-gradient(135deg,${cs.acc}20,${cs.acc}08)`:"transparent",
                color:yrs===y?cs.acc:cs.t3,fontSize:11,fontWeight:yrs===y?700:500,
                cursor:"pointer",fontFamily:cs.m,transition:"all .2s",minWidth:30,textAlign:"center",
                boxShadow:yrs===y?`0 1px 4px ${cs.acc}20`:"none",
              }}>{y}y</button>)}
            </div>
            <Inp cs={cs} v={adj} onChange={v=>D("CFG",{adj:v})} pre="±" suf="%" w={80} step={.5}/>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={fullChart||proj} margin={{top:5,right:5,bottom:5,left:5}}>
            <defs>
              <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cs.acc} stopOpacity={.25}/><stop offset="100%" stopColor={cs.acc} stopOpacity={0}/></linearGradient>
              <linearGradient id="gPH" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cs.grn} stopOpacity={.3}/><stop offset="100%" stopColor={cs.grn} stopOpacity={0}/></linearGradient>
              <linearGradient id="gPF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={cs.acc} stopOpacity={.2}/><stop offset="100%" stopColor={cs.acc} stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={cs.bd}/>
            <XAxis dataKey="lbl" tick={{fontSize:9,fill:cs.t3}} axisLine={false}/>
            <YAxis tickFormatter={v=>$(v)} tick={{fontSize:10,fill:cs.t3}} axisLine={false} width={48}/>
            <Tooltip content={({active,payload})=>{
              if(!active||!payload?.length)return null;
              const d=payload[0]?.payload;if(!d)return null;
              const val=d.hist||d.proj||d.val||0;const isH=d.hist!=null&&d.proj==null;
              return<div style={chartTip}>
                <div style={{fontWeight:700,color:isH?cs.grn:d.isNow?cs.red:cs.acc,marginBottom:4,fontSize:"0.82rem"}}>{d.lbl} {isH?"(Actual)":d.isNow?"(Current)":"(Projected)"}</div>
                <div style={{display:"grid",gridTemplateColumns:"auto auto",gap:"2px 10px"}}>
                  <span style={{color:cs.isDark?"#94a3b8":"#9ca3af"}}>Portfolio:</span><span style={{color:isH?cs.grn:cs.acc,fontWeight:600}}>{$(val)}</span>
                  <span style={{color:cs.isDark?"#94a3b8":"#9ca3af"}}>Invested:</span><span>{$(d.inv)}</span>
                  {d.inv>0&&val>0&&<><span style={{color:cs.isDark?"#94a3b8":"#9ca3af"}}>P&L:</span><span style={{color:val>=d.inv?cs.grn:cs.red,fontWeight:600}}>{val>=d.inv?"+":""}{$(val-d.inv)} ({P((val-d.inv)/d.inv*100)})</span></>}
                  {d.divMo>0&&<><span style={{color:cs.isDark?"#94a3b8":"#9ca3af"}}>Div/mo:</span><span style={{color:cs.cyn}}>{$(d.divMo,1)}</span></>}
                </div>
              </div>;
            }}/>
            {fullChart?<>
              <Area type="monotone" dataKey="hist" stroke={cs.grn} fill="url(#gPH)" strokeWidth={2.5} connectNulls={false}/>
              <Area type="monotone" dataKey="proj" stroke={cs.acc} fill="url(#gPF)" strokeWidth={2} strokeDasharray="6 3" connectNulls={false}/>
              <ReferenceLine x="NOW" stroke={cs.red} strokeWidth={2} strokeDasharray="4 2"
                label={{value:"NOW",fill:cs.red,fontSize:10,fontWeight:700,position:"top"}}/>
            </>:<>
              <Area type="monotone" dataKey="val" stroke={cs.acc} fill="url(#gP)" strokeWidth={2}/>
            </>}
            <Area type="monotone" dataKey="inv" stroke={cs.t3} fill="none" strokeWidth={1} strokeDasharray="4 3"/>
          </AreaChart>
        </ResponsiveContainer>
        {fullChart&&<div style={{display:"flex",gap:14,justifyContent:"center",marginTop:6,fontSize:10,color:cs.t3}}>
          <span><span style={{display:"inline-block",width:14,height:3,background:cs.grn,verticalAlign:"middle",marginRight:4,borderRadius:1}}/>Actual</span>
          <span><span style={{display:"inline-block",width:14,height:3,background:cs.acc,verticalAlign:"middle",marginRight:4,borderRadius:1,opacity:0.7}}/>Projected</span>
          <span><span style={{display:"inline-block",width:2,height:10,background:cs.red,verticalAlign:"middle",marginRight:4}}/>NOW</span>
          <span><span style={{display:"inline-block",width:14,height:1,borderBottom:`1px dashed ${cs.t3}`,verticalAlign:"middle",marginRight:4}}/>Invested</span>
        </div>}
      </Box>

      <Box cs={cs} style={{padding:14,marginBottom:10,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["","Invested","Value","Profit","Return","Div/mo"].map((h,i)=>
            <th key={i} style={{padding:"4px 5px",textAlign:i?"right":"left",fontSize:10,color:cs.t3,fontWeight:700,borderBottom:`1px solid ${cs.bd}`,whiteSpace:"nowrap"}}>{h}</th>
          )}</tr></thead>
          <tbody>{proj.filter(p=>p.m>0&&(p.m%12===0||p.p===yrs*intv.perYr)).map((p,i)=>
            <tr key={i}><td style={{padding:"4px 5px",fontSize:12,fontWeight:700,color:cs.acc,fontFamily:cs.m}}>{p.lbl}</td>
            <td style={{padding:"4px 5px",textAlign:"right",fontSize:12,fontFamily:cs.m,color:cs.t3}}>{$(p.inv,0)}</td>
            <td style={{padding:"4px 5px",textAlign:"right",fontSize:12,fontFamily:cs.m,fontWeight:600}}>{$(p.val,0)}<div style={{fontSize:9,color:cs.amb,fontWeight:400}}>Real: {$(p.val/Math.pow(1.025,p.yr),0)}</div></td>
            <td style={{padding:"4px 5px",textAlign:"right",fontSize:12,fontFamily:cs.m,color:p.profit>=0?cs.grn:cs.red}}>{p.profit>=0?"+":""}{$(p.profit,0)}</td>
            <td style={{padding:"4px 5px",textAlign:"right",fontSize:12,fontFamily:cs.m,color:p.pPct>=0?cs.grn:cs.red}}>{p.pPct>=0?"+":""}{P(p.pPct)}</td>
            <td style={{padding:"4px 5px",textAlign:"right",fontSize:12,fontFamily:cs.m,color:cs.cyn}}>{$(p.divMo,0)}</td>
            </tr>
          )}</tbody>
        </table>
      </Box>

      <Box cs={cs} style={{padding:14,marginBottom:10}}>
        <div style={{fontSize:14,fontWeight:700,color:cs.cyn,marginBottom:4}}>Dividend Income</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={proj.filter(p=>p.m>0&&p.m%12===0)} margin={{top:0,right:0,bottom:0,left:0}}>
            <XAxis dataKey="lbl" tick={{fontSize:10,fill:cs.t3}} axisLine={false}/>
            <YAxis tickFormatter={v=>$(v)} tick={{fontSize:10,fill:cs.t3}} axisLine={false} width={40}/>
            <Tooltip content={({active,payload})=>{
              if(!active||!payload?.length)return null;
              const d=payload[0]?.payload;if(!d)return null;
              return<div style={chartTip}>
                <div style={{fontWeight:700,color:cs.cyn,marginBottom:2}}>{d.lbl}</div>
                <div>Dividend: <b style={{color:cs.cyn}}>{$(d.divMo,1)}/mo</b></div>
                <div style={{color:cs.isDark?"#94a3b8":"#9ca3af",marginTop:2}}>Annual: {$(d.divMo*12,0)}</div>
              </div>;
            }}/>
            <Bar dataKey="divMo" fill={cs.cyn} radius={[2,2,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {milestones.length>0&&(
        <Box cs={cs} style={{padding:14,marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>🎯 Milestones</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(85px,1fr))",gap:4}}>
            {milestones.map((m,i)=><div key={i} style={{padding:"6px 8px",background:cs.bg,borderRadius:4,border:`1px solid ${cs.bd}`,textAlign:"center"}}>
              <div style={{fontSize:13,fontWeight:800,fontFamily:cs.m,color:cs.grn}}>{$(m.t,0)}</div>
              <div style={{fontSize:11,color:cs.acc,fontWeight:600}}>@{m.lbl}</div>
            </div>)}
          </div>
        </Box>
      )}

      {/* Cost of Waiting */}
      {costOfWait.length>0&&(
        <Box cs={cs} glow={cs.red} style={{padding:14,marginBottom:10,borderLeft:`3px solid ${cs.red}`}}>
          <div style={{fontSize:14,fontWeight:700,color:cs.red,marginBottom:4}}>Cost of Waiting</div>
          <div style={{fontSize:11,color:cs.t2,marginBottom:8}}>Potential loss by delaying your DCA start (same {yrs}yr horizon)</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:6}}>
            {costOfWait.map((w,i)=>(
              <div key={i} style={{padding:"8px",background:`${cs.red}06`,borderRadius:6,border:`1px solid ${cs.red}15`,textAlign:"center"}}>
                <div style={{fontSize:11,color:cs.t3,fontWeight:600,marginBottom:2}}>Delay {w.lbl}</div>
                <div style={{fontSize:14,fontWeight:800,fontFamily:cs.m,color:cs.red}}>-{$(w.cost)}</div>
                <div style={{fontSize:10,color:cs.t3}}>Final: {$(w.val)}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:cs.t2,marginTop:6,fontStyle:"italic"}}>Every month of delay costs ~{$(costOfWait[0]?.cost||0)} in potential growth.</div>
        </Box>
      )}

      <Box cs={cs} style={{padding:14}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>5-Scenario</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={scens} margin={{top:5,right:5,bottom:5,left:5}}>
            <CartesianGrid strokeDasharray="3 3" stroke={cs.bd}/>
            <XAxis dataKey="yr" tickFormatter={v=>`${v}y`} tick={{fontSize:10,fill:cs.t3}}/>
            <YAxis tickFormatter={v=>$(v)} tick={{fontSize:10,fill:cs.t3}} width={48}/>
            <Tooltip content={({active,payload,label})=>{
              if(!active||!payload?.length)return null;
              const d=payload[0]?.payload;if(!d)return null;
              return<div style={chartTip}>
                <div style={{fontWeight:700,color:cs.isDark?"#e2e8f0":"#1e293b",marginBottom:3}}>Year {label} — Invested: {$(d.inv)}</div>
                {[{k:"Bear",c:cs.red},{k:"Consv",c:cs.amb},{k:"Base",c:cs.acc},{k:"Bull",c:cs.grn},{k:"Opti",c:cs.pur}].map(sc=>
                  d[sc.k]!=null&&<div key={sc.k} style={{display:"flex",justifyContent:"space-between",gap:10}}>
                    <span style={{color:sc.c,fontWeight:600}}>{sc.k}:</span>
                    <span>{$(d[sc.k])} <span style={{color:d[sc.k]>d.inv?cs.grn:cs.red}}>({d.inv>0?`${d[sc.k]>d.inv?"+":""}${P((d[sc.k]-d.inv)/d.inv*100)}`:"—"})</span></span>
                  </div>
                )}
              </div>;
            }}/>

            <Line dataKey="inv" stroke={cs.t3} strokeDasharray="5 5" strokeWidth={1} dot={false} name="Invested"/>
            {[{k:"Bear",c:cs.red},{k:"Consv",c:cs.amb},{k:"Base",c:cs.acc},{k:"Bull",c:cs.grn},{k:"Opti",c:cs.pur}].map(x=>
              <Line key={x.k} dataKey={x.k} stroke={x.c} strokeWidth={x.k==="Base"?2:1.2} dot={false}/>
            )}
            <Legend wrapperStyle={{fontSize:7}}/>
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </>)}

    {/* ══════ ANALYSIS ══════ */}
    {view==="anal"&&(<>
      <Box cs={cs} glow={cs.acc} style={{padding:16,marginBottom:10}}>
        <div style={{fontSize:16,fontWeight:800,marginBottom:3}}>🧠 Portfolio Intelligence</div>
        <div style={{fontSize:11,color:cs.t3,marginBottom:10}}>Blended forecast · {intv.nm} DCA · {appMode==="record"?"Actual+Projection":"Pure Simulation"}</div>

        <div style={{display:"flex",gap:10,marginBottom:12,padding:10,background:cs.bg,borderRadius:5}}>
          <div style={{textAlign:"center",width:90}}>
            <div style={{fontSize:24,fontWeight:800,color:narr.riskC,fontFamily:cs.m}}>{narr.wB.toFixed(2)}β</div>
            <div style={{fontSize:12,fontWeight:700,color:narr.riskC}}>{narr.risk}</div>
          </div>
          <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
            <Num cs={cs} l="Forecast" v={P(narr.wR)} c={cs.grn}/><Num cs={cs} l="Div Yield" v={P(narr.wD)} c={cs.cyn}/>
            <Num cs={cs} l="ER" v={P(narr.wER,3)}/><Num cs={cs} l="MaxDD" v={P(narr.wDD)} c={cs.red}/>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:10}}>
          {[{l:"S&P 500",v:narr.sp5P,c:cs.acc},{l:"Tech/Growth",v:narr.techP,c:cs.pur},{l:"Dividend",v:narr.divP,c:cs.grn}].map((x,i)=>
            <div key={i} style={{padding:8,background:cs.bg,borderRadius:4,textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,fontFamily:cs.m,color:x.c}}>{x.v}%</div>
              <div style={{fontSize:11,color:cs.t3}}>{x.l}</div>
              <div style={{height:3,background:`${x.c}20`,borderRadius:2,marginTop:3}}><div style={{height:3,background:x.c,borderRadius:2,width:`${Math.min(100,x.v)}%`}}/></div>
            </div>
          )}
        </div>
      </Box>

      {/* Portfolio Health Score */}
      <Box cs={cs} glow={healthScore.c} style={{padding:16,marginBottom:10,borderLeft:`3px solid ${healthScore.c}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{width:60,height:60,borderRadius:"50%",background:`${healthScore.c}15`,border:`3px solid ${healthScore.c}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",flexShrink:0}}>
            <div style={{fontSize:20,fontWeight:800,fontFamily:cs.m,color:healthScore.c,lineHeight:1}}>{healthScore.score}</div>
            <div style={{fontSize:9,fontWeight:700,color:healthScore.c}}>{healthScore.grade}</div>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:800}}>Portfolio Health</div>
            <div style={{fontSize:11,color:cs.t2}}>{healthScore.score>=80?"Excellent portfolio composition":healthScore.score>=60?"Good portfolio, room for improvement":"Consider rebalancing for better results"}</div>
          </div>
        </div>
        <div style={{display:"grid",gap:6}}>
          {healthScore.subs.map((sub,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:cs.t3,width:100,flexShrink:0}}>{sub.l}</span>
              <div style={{flex:1,height:6,background:`${cs.t3}20`,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${sub.v/sub.max*100}%`,background:sub.v/sub.max>=0.8?cs.grn:sub.v/sub.max>=0.6?cs.amb:cs.red,borderRadius:3,transition:"width .5s"}}/>
              </div>
              <span style={{fontSize:11,fontFamily:cs.m,color:cs.t2,width:32,textAlign:"right"}}>{sub.v}/{sub.max}</span>
            </div>
          ))}
        </div>
      </Box>

      {narr.lines.map((ln,i)=>(
        <Box cs={cs} key={i} ac={ln.c||cs.bd} style={{padding:12,marginBottom:6}}>
          <div style={{fontSize:12,fontWeight:700,color:ln.c||cs.t1}}>{ln.i} {ln.t}</div>
          <div style={{fontSize:11,color:cs.t2,lineHeight:1.6,marginTop:3}}>{ln.x}</div>
        </Box>
      ))}

      <Box cs={cs} style={{padding:14,marginTop:8,overflowX:"auto"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>ETF Comparison</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["ETF","Al%","Forecast","5Y","Div","ER","β","DD","$/period"].map((h,i)=>
            <th key={i} style={{padding:"4px",textAlign:i>1?"right":"left",fontSize:10,color:cs.t3,fontWeight:700,borderBottom:`1px solid ${cs.bd}`}}>{h}</th>
          )}</tr></thead>
          <tbody>{sd.map((x,i)=>
            <tr key={i}><td style={{padding:"4px",fontSize:12,fontWeight:800,color:x.etf.c,fontFamily:cs.m}}>{x.tk}</td>
            <td style={{padding:"4px",fontSize:12,fontFamily:cs.m}}>{x.al}%</td>
            <td style={{padding:"4px",textAlign:"right",fontSize:12,fontFamily:cs.m,color:cs.grn,fontWeight:600}}>{P(x.fc.base)}</td>
            <td style={{padding:"4px",textAlign:"right",fontSize:11,fontFamily:cs.m,color:cs.t2}}>{P(x.fc.cagr5)}</td>
            <td style={{padding:"4px",textAlign:"right",fontSize:11,fontFamily:cs.m,color:cs.cyn}}>{P(x.etf.d)}</td>
            <td style={{padding:"4px",textAlign:"right",fontSize:11,fontFamily:cs.m,color:x.etf.er>.1?cs.amb:cs.t2}}>{P(x.etf.er,2)}</td>
            <td style={{padding:"4px",textAlign:"right",fontSize:11,fontFamily:cs.m,color:x.etf.b>1.1?cs.red:cs.t2}}>{x.etf.b}</td>
            <td style={{padding:"4px",textAlign:"right",fontSize:11,fontFamily:cs.m,color:cs.red}}>{P(x.etf.dd)}</td>
            <td style={{padding:"4px",textAlign:"right",fontSize:11,fontFamily:cs.m}}>{$(x.perUSD,1)}</td>
            </tr>
          )}</tbody>
        </table>
      </Box>

      {/* Historical returns table */}
      <Box cs={cs} style={{padding:14,marginTop:8,overflowX:"auto"}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:6}}>Historical Annual Returns (%)</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={{padding:"3px 4px",fontSize:10,color:cs.t3,textAlign:"left"}}>Year</th>
            {sd.map((x,i)=><th key={i} style={{padding:"3px 4px",fontSize:11,color:x.etf.c,fontWeight:700,textAlign:"right"}}>{x.tk}</th>)}
          </tr></thead>
          <tbody>{Object.keys(sd[0]?.etf.hist||{}).reverse().map(yr=>
            <tr key={yr}><td style={{padding:"3px 4px",fontSize:11,color:cs.t3,fontFamily:cs.m}}>{yr}</td>
            {sd.map((x,i)=>{const v=x.etf.hist[yr];return(
              <td key={i} style={{padding:"3px 4px",textAlign:"right",fontSize:11,fontFamily:cs.m,color:v>=0?cs.grn:cs.red}}>{v>=0?"+":""}{v?.toFixed(1)}</td>
            )})}</tr>
          )}</tbody>
        </table>
      </Box>
    </>)}

    {/* ══════ COMPARE ══════ */}
    {view==="compare"&&appMode==="sim"&&(()=>{
      const simA=savedSims.find(x=>x.id===cmpIds[0])||savedSims[0];
      const simB=savedSims.find(x=>x.id===cmpIds[1])||savedSims[1];
      if(!simA||!simB)return<Box cs={cs} style={{padding:20,textAlign:"center"}}><div style={{fontSize:14,color:cs.t3}}>Save at least 2 simulations to compare.</div></Box>;
      const projA=computeProjection(simA.config,simA.slots);
      const projB=computeProjection(simB.config,simB.slots);
      const maxLen=Math.max(projA.length,projB.length);
      const cmpData=[];
      for(let i=0;i<maxLen;i++){
        const a=projA[i]||{},b=projB[i]||{};
        cmpData.push({lbl:a.lbl||b.lbl||`${i}yr`,valA:a.val||null,valB:b.val||null,invA:a.inv||null,invB:b.inv||null});
      }
      const mA=simA.metrics,mB=simB.metrics;
      const better=(a,b,higher=true)=>higher?(a>b?"A":"B"):(a<b?"A":"B");
      return<>
        <Box cs={cs} style={{padding:14,marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:800,color:cs.pur,marginBottom:10}}>⚖️ Compare Simulations</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <select value={cmpIds[0]||""} onChange={e=>setCmpIds([+e.target.value||null,cmpIds[1]])}
              style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${cs.acc}40`,background:cs.inp,color:cs.t1,fontSize:12,fontFamily:cs.m}}>
              {savedSims.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={cmpIds[1]||""} onChange={e=>setCmpIds([cmpIds[0],+e.target.value||null])}
              style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${cs.pur}40`,background:cs.inp,color:cs.t1,fontSize:12,fontFamily:cs.m}}>
              {savedSims.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Side-by-side params */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            {[{sim:simA,c:cs.acc,lbl:"A"},{sim:simB,c:cs.pur,lbl:"B"}].map(({sim:s,c,lbl})=>(
              <div key={lbl} style={{padding:10,background:cs.sf2,borderRadius:8,border:`1px solid ${c}30`}}>
                <div style={{fontSize:13,fontWeight:700,color:c,marginBottom:6}}>{s.name}</div>
                <div style={{fontSize:11,color:cs.t2,lineHeight:1.8}}>
                  <div>DCA: <b style={{fontFamily:cs.m}}>${s.config.invest}/{INTERVALS.find(x=>x.id===s.config.interval)?.nm.toLowerCase()||"mo"}</b></div>
                  <div>Horizon: <b style={{fontFamily:cs.m}}>{s.config.yrs}yr</b> · Fee: {P(s.config.fee)} · Spread: {P(s.config.spread)}</div>
                  <div>DRIP: {s.config.divReinvest?"ON":"OFF"} · Inc: {P(s.config.annInc||0)}/yr</div>
                  <div style={{marginTop:4}}>{s.slots.map(x=><span key={x.tk} style={{fontSize:10,fontWeight:700,color:DB[x.tk]?.c||cs.t1,marginRight:6}}>{x.tk} {x.alloc}%</span>)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Metrics comparison */}
          {mA&&mB&&(
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>Key Metrics</div>
              <div style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr",gap:"4px 8px",fontSize:12,fontFamily:cs.m}}>
                <span style={{color:cs.t3,fontWeight:600}}></span><span style={{color:cs.acc,fontWeight:700,textAlign:"right"}}>{simA.name}</span><span style={{color:cs.pur,fontWeight:700,textAlign:"right"}}>{simB.name}</span>
                {[{l:"Final Value",a:mA.val,b:mB.val,f:$,h:true},{l:"Invested",a:mA.inv,b:mB.inv,f:$},{l:"Profit",a:mA.profit,b:mB.profit,f:$,h:true},{l:"CAGR",a:mA.cagr,b:mB.cagr,f:v=>P(v),h:true},{l:"Div/mo",a:mA.divMo,b:mB.divMo,f:v=>$(v,0),h:true},{l:"Risk",a:mA.risk,b:mB.risk,f:v=>v}].map(r=>(
                  <>{/*Fragment*/}<span style={{color:cs.t3,fontSize:11}}>{r.l}</span>
                  <span style={{textAlign:"right",color:r.h&&r.a>r.b?cs.grn:cs.t1,fontWeight:r.h&&r.a>r.b?700:400}}>{r.f(r.a)}{r.h&&r.a>r.b?" ✓":""}</span>
                  <span style={{textAlign:"right",color:r.h&&r.b>r.a?cs.grn:cs.t1,fontWeight:r.h&&r.b>r.a?700:400}}>{r.f(r.b)}{r.h&&r.b>r.a?" ✓":""}</span></>
                ))}
              </div>
            </div>
          )}
        </Box>

        {/* Overlay chart */}
        <Box cs={cs} style={{padding:14,marginBottom:10}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>Growth Comparison</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={cmpData} margin={{top:5,right:5,bottom:5,left:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={cs.bd}/>
              <XAxis dataKey="lbl" tick={{fontSize:10,fill:cs.t3}}/>
              <YAxis tickFormatter={v=>$(v)} tick={{fontSize:10,fill:cs.t3}} width={48}/>
              <Tooltip content={({active,payload})=>{
                if(!active||!payload?.length)return null;
                const d=payload[0]?.payload;if(!d)return null;
                return<div style={chartTip}>
                  <div style={{fontWeight:700,marginBottom:4}}>{d.lbl}</div>
                  {d.valA!=null&&<div><span style={{color:cs.acc}}>{simA.name}:</span> <b>{$(d.valA)}</b> (inv: {$(d.invA)})</div>}
                  {d.valB!=null&&<div><span style={{color:cs.pur}}>{simB.name}:</span> <b>{$(d.valB)}</b> (inv: {$(d.invB)})</div>}
                </div>;
              }}/>
              <Line dataKey="valA" stroke={cs.acc} strokeWidth={2} dot={false} name={simA.name}/>
              <Line dataKey="valB" stroke={cs.pur} strokeWidth={2} dot={false} name={simB.name}/>
              <Line dataKey="invA" stroke={cs.t3} strokeWidth={1} strokeDasharray="4 3" dot={false}/>
              <Line dataKey="invB" stroke={cs.t3} strokeWidth={1} strokeDasharray="2 2" dot={false}/>
              <Legend wrapperStyle={{fontSize:10}}/>
            </LineChart>
          </ResponsiveContainer>
        </Box>

        {/* Manage saved sims */}
        <Box cs={cs} style={{padding:14}}>
          <div style={{fontSize:12,fontWeight:700,marginBottom:6}}>Saved Simulations ({savedSims.length})</div>
          {savedSims.map(s=>(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${cs.bd}10`}}>
              <span style={{fontSize:12,fontWeight:600}}>{s.name}</span>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <span style={{fontSize:10,color:cs.t3}}>{s.config.yrs}yr · ${s.config.invest}/{INTERVALS.find(x=>x.id===s.config.interval)?.nm.toLowerCase()||"mo"}</span>
                <button onClick={()=>{if(confirm("Delete "+s.name+"?"))setSavedSims(prev=>prev.filter(x=>x.id!==s.id));}}
                  style={{padding:"2px 6px",borderRadius:3,border:`1px solid ${cs.red}30`,background:"transparent",color:cs.red,fontSize:10,cursor:"pointer",opacity:0.5}}>×</button>
              </div>
            </div>
          ))}
        </Box>
      </>;
    })()}

    </div>
    <div style={{padding:"12px 14px",textAlign:"center",borderTop:`1px solid ${cs.bd}`,fontSize:11,color:cs.t3}}>
      {appMode==="record"?"Projections based on historical performance. ":"Simulation only. "}Not financial advice. Do your own research before investing.
    </div>
  </div>);
}
