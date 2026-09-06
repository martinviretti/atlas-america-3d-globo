/* ============================================================
   ATLAS AMÉRICA 3D — motor compartido
   Store · repetición espaciada · logros · audio · UI · accesibilidad ·
   globo 3D (Globe.GL) · mapa 2D accesible · helpers de escenario.
   Lo usan index.html (app completa) y estudiar.html (versión breve).
   La clave de localStorage se define con window.ATLAS_KEY antes de cargar
   este archivo; si no, se usa "atlas3d.v1".
   ============================================================ */
'use strict';

/* ============================================================
   ATLAS AMÉRICA 3D
   Módulos en un único scope: DATA · Store · SR · A11y · Audio ·
   Globe · Map2D · Quiz · Eval · Game · UI · Router
   Fuentes: ISO 3166 (alfa-2/alfa-3) · OEA (Estados) · ONU M49 ·
   Natural Earth (geometrías) · coordenadas publicadas.
   ============================================================ */

/* ---------- Utilidades base ---------- */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
function el(tag, attrs={}, ...kids){
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{})){
    if(v==null||v===false) continue;
    if(k==='class') n.className=v;
    else if(k==='html') n.innerHTML=v;
    else if(k==='text') n.textContent=v;
    else if(k==='dataset') Object.assign(n.dataset,v);
    else if(k.startsWith('on')&&typeof v==='function') n.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k in n && k!=='list') { try{n[k]=v;}catch{ n.setAttribute(k,v);} }
    else n.setAttribute(k,v);
  }
  for(const kid of kids.flat()){ if(kid==null||kid===false) continue; n.append(kid.nodeType?kid:document.createTextNode(kid)); }
  return n;
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rint=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const sample=(arr,n)=>shuffle(arr).slice(0,n);
const uniq=a=>Array.from(new Set(a));
const pad2=n=>String(n).padStart(2,'0');
const fmtTime=s=>{s=Math.max(0,Math.round(s));return `${pad2(Math.floor(s/60))}:${pad2(s%60)}`;};
const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;};

/* Los datos (regiones, los 35 países, confusiones, territorios, glosario y fuentes)
   viven en assets/atlas-data.js, compartidos con estudiar.html. */

/* ============================================================
   Store — persistencia local (localStorage)
   ============================================================ */
const Store=(function(){
  // cada página define su propio almacén: la app completa y la versión breve
  // no comparten progreso (pueden usarlas personas distintas en el mismo navegador)
  const KEY=(typeof window!=='undefined'&&window.ATLAS_KEY)||'atlas3d.v1';
  const DEFAULT_CONFIG={region:'todas',level:'principiante',sound:false,volume:.6,
    motion:'auto',contrast:'normal',textsize:0,quality:'auto',view:'relieve',
    labels:true,capitals:true,rotate:true,
    // globo: relieve, retícula y capas
    relieve:60,meridianos:true,meridianosPaso:15,lineasClave:true,mundo:true,banderas:true};
  let state;
  function fresh(){return{version:1,config:{...DEFAULT_CONFIG},progress:{},
    stats:{points:0,bestStreak:0,studySeconds:0,answered:0,correct:0},
    evals:[],achievements:{},daily:{}};}
  function load(){
    try{const raw=localStorage.getItem(KEY);
      if(!raw){state=fresh();return;}
      const p=JSON.parse(raw); state=Object.assign(fresh(),p);
      state.config=Object.assign({...DEFAULT_CONFIG},p.config||{});
      // migración v1 -> v2: el globo pasa a tener relieve y retícula por defecto
      if(p.config&&p.config.relieve===undefined){
        state.config.relieve=DEFAULT_CONFIG.relieve;
        if(state.config.view==='educativa')state.config.view=DEFAULT_CONFIG.view;
      }
    }catch(e){console.warn('Store: no se pudo leer, se reinicia.',e);state=fresh();}
  }
  let saveT=null;
  function save(){clearTimeout(saveT);saveT=setTimeout(()=>{
    try{localStorage.setItem(KEY,JSON.stringify(state));}
    catch(e){console.warn('Store: no se pudo guardar.',e);UI&&UI.toast('No se pudo guardar el progreso','warn');}
  },160);}
  function get(){return state;}
  function cfg(){return state.config;}
  function setCfg(k,v){state.config[k]=v;save();}
  function prog(id){ if(!state.progress[id]) state.progress[id]={seen:0,correct:0,wrong:0,streak:0,box:0,ease:2.3,avgMs:0,lastMs:0,last:0,due:0,dificil:false}; return state.progress[id]; }
  function exportJSON(){return JSON.stringify(state,null,2);}
  function importJSON(text){
    const p=JSON.parse(text);
    if(!p||typeof p!=='object'||!('progress'in p)) throw new Error('Estructura no válida');
    state=Object.assign(fresh(),p);
    state.config=Object.assign({...DEFAULT_CONFIG},p.config||{});
    save();return true;
  }
  function reset(){state=fresh();save();}
  load();
  return {get,cfg,setCfg,prog,save,exportJSON,importJSON,reset,DEFAULT_CONFIG};
})();

/* ============================================================
   SR — dominio por país y repetición espaciada (Leitner simple)
   ============================================================ */
const MASTERY={
  nuevo:{id:'nuevo',label:'Nuevo',color:'var(--m-nuevo)',pat:'○'},
  aprendiendo:{id:'aprendiendo',label:'En aprendizaje',color:'var(--m-aprendiendo)',pat:'◔'},
  practica:{id:'practica',label:'En práctica',color:'var(--m-practica)',pat:'◑'},
  casi:{id:'casi',label:'Casi dominado',color:'var(--m-casi)',pat:'◕'},
  dominado:{id:'dominado',label:'Dominado',color:'var(--m-dominado)',pat:'●'},
  repaso:{id:'repaso',label:'Necesita repaso',color:'var(--m-repaso)',pat:'⟳'},
};
const SR=(function(){
  const DAY=86400000;
  const INTERVAL=[0,1,2,4,8,16,32]; // días por caja (box 0..6)
  function level(id){
    const p=Store.prog(id);
    if(p.seen===0) return 'nuevo';
    if(p.due&&Date.now()>p.due&&p.box>=2) return 'repaso';
    if(p.dificil&&p.box<=1) return 'repaso';
    return ['aprendiendo','aprendiendo','practica','practica','casi','dominado','dominado'][clamp(p.box,0,6)];
  }
  function record(id,correct,ms,grade){
    const p=Store.prog(id);
    p.seen++; if(ms>0){p.lastMs=ms;p.avgMs=p.avgMs?Math.round(p.avgMs*.7+ms*.3):ms;}
    p.last=Date.now();
    // grade: 'facil' | 'dudo' | 'nose' (tarjetas) — opcional
    if(grade==='nose'){correct=false;}
    if(correct){
      p.correct++; p.streak=(p.streak||0)+1;
      const step=(grade==='dudo')?0:1;
      p.box=clamp((p.box||0)+step,0,6);
      if(p.box>=3) p.dificil=false;
    }else{
      p.wrong++; p.streak=0; p.box=clamp((p.box||0)-2,0,6); p.dificil=true;
    }
    p.due=Date.now()+INTERVAL[clamp(p.box,0,6)]*DAY;
    Store.save();
    return level(id);
  }
  function weight(id){
    const p=Store.prog(id), lv=level(id);
    let w=1;
    if(lv==='nuevo') w=2;
    else if(lv==='repaso') w=4;
    else if(lv==='aprendiendo') w=3;
    else if(lv==='practica') w=1.6;
    else if(lv==='casi') w=1;
    else if(lv==='dominado') w=.4; // no se ocultan, solo bajan de frecuencia
    if(p.dificil) w+=2;
    return w;
  }
  function weightedPick(pool,n){
    pool=pool.slice(); const out=[];
    n=Math.min(n,pool.length);
    for(let k=0;k<n;k++){
      const ws=pool.map(c=>weight(c.id)); const tot=ws.reduce((a,b)=>a+b,0);
      let r=Math.random()*tot,i=0; while(r>ws[i]&&i<ws.length-1){r-=ws[i++];}
      out.push(pool.splice(i,1)[0]);
    }
    return out;
  }
  function counts(pool){
    const c={nuevo:0,aprendiendo:0,practica:0,casi:0,dominado:0,repaso:0};
    pool.forEach(x=>c[level(x.id)]++); return c;
  }
  function dueList(pool){return pool.filter(c=>level(c.id)==='repaso'||Store.prog(c.id).dificil);}
  return {level,record,weight,weightedPick,counts,dueList,INTERVAL};
})();

/* ============================================================
   Logros
   ============================================================ */
const ACHIEVEMENTS=[
 {id:'primer-pais',nombre:'Primer país aprendido',desc:'Respondé bien tu primer país.',
   check:s=>Object.values(s.progress).some(p=>p.correct>=1)},
 {id:'norte',nombre:'América del Norte dominada',desc:'Dominá los 3 países del Norte.',
   check:()=>inRegion('norte').every(c=>SR.level(c.id)==='dominado')},
 {id:'central',nombre:'Ruta centroamericana',desc:'Dominá los 7 países de América Central.',
   check:()=>inRegion('central').every(c=>SR.level(c.id)==='dominado')},
 {id:'caribe',nombre:'Experto del Caribe',desc:'Dominá los 13 países del Caribe.',
   check:()=>inRegion('caribe').every(c=>SR.level(c.id)==='dominado')},
 {id:'sur',nombre:'Conquistador del Sur',desc:'Dominá los 12 países de América del Sur.',
   check:()=>inRegion('sur').every(c=>SR.level(c.id)==='dominado')},
 {id:'todos',nombre:'35 de 35',desc:'Dominá los 35 Estados de América.',
   check:()=>COUNTRIES.every(c=>SR.level(c.id)==='dominado')},
 {id:'racha10',nombre:'Diez respuestas seguidas',desc:'Alcanzá una racha de 10 aciertos.',
   check:s=>s.stats.bestStreak>=10},
 {id:'examen-perfecto',nombre:'Examen perfecto',desc:'Obtené 100 en una evaluación.',
   check:s=>s.evals.some(e=>e.score>=100)},
 {id:'sin-pistas',nombre:'Sin pistas',desc:'Completá una evaluación de 10+ sin usar pistas.',
   check:s=>s.evals.some(e=>e.n>=10&&!e.hints)},
 {id:'velocidad',nombre:'Velocidad geográfica',desc:'Terminá un modo contrarreloj con 10+ aciertos.',
   check:s=>!!s.stats.velocidad},
];
const Game=(function(){
  function addPoints(n){Store.get().stats.points+=n;Store.save();}
  function bumpStreak(streak){const st=Store.get().stats;if(streak>st.bestStreak){st.bestStreak=streak;Store.save();}}
  function level(){return Math.floor(Store.get().stats.points/500)+1;}
  function checkAchievements(){
    const s=Store.get(); const nuevos=[];
    for(const a of ACHIEVEMENTS){
      if(!s.achievements[a.id] && a.check(s)){s.achievements[a.id]=Date.now();nuevos.push(a);}
    }
    if(nuevos.length){Store.save();nuevos.forEach(a=>{UI.toast('🏅 Logro: '+a.nombre,'ok',a.desc);Audio.play('badge');});}
    return nuevos;
  }
  return {addPoints,bumpStreak,level,checkAchievements};
})();

/* ============================================================
   Audio — Web Audio (tonos) + Web Speech (pronunciación)
   ============================================================ */
const Audio=(function(){
  let ctx=null;
  function ac(){if(!ctx&&window.AudioContext){try{ctx=new AudioContext();}catch{}}return ctx;}
  function on(){return Store.cfg().sound;}
  function vol(){return clamp(Store.cfg().volume,0,1);}
  function tone(freq,dur,type='sine',t0=0,gain=1){
    const c=ac(); if(!c) return;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type; o.frequency.value=freq;
    const t=c.currentTime+t0;
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol()*gain*.5,t+.01);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t+dur+.02);
  }
  function play(kind){
    if(!on()) return; const c=ac(); if(!c) return; if(c.state==='suspended')c.resume();
    if(kind==='ok'){tone(660,.12,'sine',0,.9);tone(880,.16,'sine',.09,.8);}
    else if(kind==='bad'){tone(220,.18,'sine',0,.7);tone(180,.22,'sine',.06,.6);}
    else if(kind==='badge'){[523,659,784,1047].forEach((f,i)=>tone(f,.18,'triangle',i*.09,.7));}
    else if(kind==='click'){tone(440,.05,'square',0,.3);}
    else if(kind==='win'){[523,587,659,784,880,1047].forEach((f,i)=>tone(f,.22,'sine',i*.1,.7));}
  }
  let voices=[];
  function loadVoices(){voices=(window.speechSynthesis&&speechSynthesis.getVoices())||[];}
  if(window.speechSynthesis){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}
  function speak(text){
    if(!on()||!window.speechSynthesis) return;
    try{speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);
      const v=voices.find(x=>/es[-_]/i.test(x.lang))||voices.find(x=>/^es/i.test(x.lang));
      if(v)u.voice=v; u.lang=(v&&v.lang)||'es-ES'; u.rate=.95; u.volume=vol();
      speechSynthesis.speak(u);
    }catch(e){}
  }
  function resume(){const c=ac();if(c&&c.state==='suspended')c.resume();}
  return {play,speak,resume};
})();

/* ============================================================
   UI — toast, modal, announce, iconos
   ============================================================ */
const ICON={
  norte:'M12 3l4 8H8l4-8z',search:'M11 4a7 7 0 105 12l4 4',
  check:'M4 12l5 5L20 6',x:'M6 6l12 12M18 6L6 18',
  play:'M8 5v14l11-7z',trophy:'M6 4h12v3a6 6 0 01-12 0V4zM9 20h6M12 14v6',
  book:'M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5z',target:'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4a5 5 0 100 10 5 5 0 000-10zm0 3a2 2 0 100 4 2 2 0 000-4z',
  globe:'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
};
function svgIcon(d,cls){return `<svg class="${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;}
const UI=(function(){
  const liveEl=()=>$('#live'), liveA=()=>$('#live-assert');
  function announce(msg,assertive){const n=assertive?liveA():liveEl();if(n){n.textContent='';setTimeout(()=>n.textContent=msg,30);}}
  function toast(title,type='info',sub){
    const root=$('#toast-root');
    const t=el('div',{class:'toast '+type,role:'status'},
      el('div',{},el('b',{text:title}),sub?el('small',{text:sub}):null));
    root.appendChild(t); announce(title,type==='bad');
    setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(20px)';setTimeout(()=>t.remove(),300);},type==='bad'?4200:3200);
  }
  let lastFocus=null;
  function modal(contentNode,{title,onClose}={}){
    const root=$('#modal-root'); root.innerHTML='';
    lastFocus=document.activeElement;
    const box=el('div',{class:'modal'});
    if(title){const h=el('h3',{id:'modal-title',text:title});box.appendChild(h);root.setAttribute('aria-labelledby','modal-title');}
    const x=el('button',{class:'iconbtn modal-x','aria-label':'Cerrar',onclick:close,html:svgIcon(ICON.x)});
    box.appendChild(x); box.appendChild(contentNode); root.appendChild(box);
    root.classList.add('open');
    function onKey(e){if(e.key==='Escape')close(); if(e.key==='Tab')trapTab(e,box);}
    root.__key=onKey; document.addEventListener('keydown',onKey);
    root.onclick=e=>{if(e.target===root)close();};
    setTimeout(()=>{(box.querySelector('[autofocus],button,input,select,textarea')||box).focus();},30);
    function close(){root.classList.remove('open');root.innerHTML='';document.removeEventListener('keydown',onKey);if(onClose)onClose();if(lastFocus)try{lastFocus.focus();}catch{}}
    root.__close=close; return {close};
  }
  function trapTab(e,box){
    const f=box.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    if(!f.length)return; const first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  function confirm(msg,{title='Confirmar',okText='Aceptar',danger=false}={}){
    return new Promise(res=>{
      let done=false;
      const responder=v=>{if(done)return;done=true;res(v);};
      const body=el('div',{},el('p',{class:'dim',text:msg}),
        el('div',{class:'row end',style:'margin-top:16px'},
          el('button',{class:'btn ghost',text:'Cancelar',onclick:()=>{m.close();responder(false);}}),
          el('button',{class:'btn '+(danger?'':'primary'),text:okText,style:danger?'border-color:var(--bad);color:var(--bad)':'',onclick:()=>{m.close();responder(true);}})));
      // cerrar con Escape, clic fuera o la X equivale a cancelar
      const m=modal(body,{title,onClose:()=>responder(false)});
    });
  }
  function celebrate(){
    if(Store.cfg().motion==='reduced'||document.documentElement.dataset.motion==='reduced')return;
    const wrap=el('div',{class:'celebrate','aria-hidden':'true'}); document.body.appendChild(wrap);
    const cols=['#38bdf8','#37d6b3','#ffb454','#c58bfa','#34d399','#fb7185'];
    for(let i=0;i<80;i++){
      const c=el('div',{class:'confetti'});
      c.style.left=Math.random()*100+'vw'; c.style.background=cols[i%cols.length];
      c.style.animationDuration=(1.6+Math.random()*1.8)+'s'; c.style.animationDelay=(Math.random()*.4)+'s';
      c.style.top='-20px'; wrap.appendChild(c);
    }
    setTimeout(()=>wrap.remove(),3600);
  }
  return {announce,toast,modal,confirm,celebrate};
})();

/* ============================================================
   A11y — aplica preferencias y cablea controles globales
   ============================================================ */
const A11y=(function(){
  const mq=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false,addEventListener(){}};
  function reducedMotion(){const m=Store.cfg().motion;return m==='reduced'||(m==='auto'&&mq.matches);}
  function apply(){
    const c=Store.cfg(), html=document.documentElement;
    html.dataset.motion=reducedMotion()?'reduced':'full';
    html.dataset.contrast=c.contrast==='high'?'high':'normal';
    html.dataset.textsize=String(c.textsize||0);
    const sb=$('#btnSound'); if(sb){sb.setAttribute('aria-pressed',String(!!c.sound));sb.classList.toggle('on',!!c.sound);sb.setAttribute('aria-label',c.sound?'Silenciar sonido':'Activar sonido');}
    if(window.Globe&&Globe.applyPrefs) Globe.applyPrefs();
  }
  function wire(opciones){
    const o=opciones||{};
    const bs=$('#btnSound');
    if(bs)bs.addEventListener('click',()=>{
      const v=!Store.cfg().sound; Store.setCfg('sound',v); apply();
      if(v){Audio.resume();Audio.play('click');UI.toast('Sonido activado','info','Pronunciación y efectos disponibles');}
      else UI.toast('Sonido silenciado','info');
    });
    const ba=$('#btnA11y');
    if(ba&&o.onConfig)ba.addEventListener('click',o.onConfig);
    const nt=$('#navToggle');
    if(nt)nt.addEventListener('click',()=>{
      const nav=$('#nav'),b=$('#navToggle');if(!nav)return;
      const open=nav.classList.toggle('open');
      b.setAttribute('aria-expanded',String(open));
    });
    mq.addEventListener&&mq.addEventListener('change',apply);
    document.addEventListener('visibilitychange',()=>{if(window.Globe&&Globe.setVisible)Globe.setVisible(!document.hidden);});
  }
  return {apply,wire,reducedMotion};
})();

/* ============================================================
   Globe — globo 3D (Globe.GL) con fallback y accesibilidad
   ============================================================ */
function webglOK(){
  try{const c=document.createElement('canvas');
    return !!(window.WebGLRenderingContext&&(c.getContext('webgl')||c.getContext('experimental-webgl')));
  }catch(e){return false;}
}
/* ---------- Estilos de globo (texturas y paleta) ----------
   Texturas: NASA Visible Earth / Blue Marble (dominio público), empaquetadas
   con three-globe. Se sirven desde assets/textures — no se pide nada a la red. */
const GLOBE_TEX={dia:'assets/textures/earth-day.jpg',noche:'assets/textures/earth-night.jpg',
  topo:'assets/textures/earth-topology.png',agua:'assets/textures/earth-water.png'};
const GLOBE_VIEWS={
  relieve:{label:'Relieve',desc:'Terreno real: montañas, desiertos y selvas con sombreado.',
    img:'dia',bump:true,water:true,fill:.36,strokeC:'rgba(255,255,255,.8)',ocean:null,
    atmos:'#8fd0ff',atmosAlt:.15,grid:'rgba(200,230,255,.30)',gridKey:'rgba(125,211,252,.85)',
    ctxStroke:'rgba(255,255,255,.30)',ctxFill:'rgba(8,20,40,.10)'},
  satelite:{label:'Satélite',desc:'La Tierra tal cual se ve desde el espacio, sin colores por región.',
    img:'dia',bump:true,water:true,fill:.10,strokeC:'rgba(255,255,255,.55)',ocean:null,
    atmos:'#8fd0ff',atmosAlt:.15,grid:'rgba(200,230,255,.22)',gridKey:'rgba(125,211,252,.7)',
    ctxStroke:'rgba(255,255,255,.22)',ctxFill:'rgba(0,0,0,0)'},
  nocturna:{label:'Nocturna',desc:'Luces de las ciudades por la noche.',
    img:'noche',bump:true,water:false,fill:.30,strokeC:'rgba(160,210,255,.75)',ocean:null,
    atmos:'#2f6dbd',atmosAlt:.18,grid:'rgba(150,200,255,.26)',gridKey:'rgba(125,211,252,.8)',
    ctxStroke:'rgba(150,200,255,.28)',ctxFill:'rgba(0,0,0,0)'},
  educativa:{label:'Educativa',desc:'Océano plano y países por color de región: máxima legibilidad.',
    img:null,bump:false,water:false,fill:.92,strokeC:'rgba(220,238,255,.7)',ocean:'#0b1b3a',
    atmos:'#3aa0ff',atmosAlt:.16,grid:'rgba(190,220,255,.30)',gridKey:'rgba(125,211,252,.85)',
    ctxStroke:'rgba(255,255,255,.30)',ctxFill:'rgba(64,88,128,.75)'},
  politica:{label:'Política',desc:'Colores plenos y fronteras marcadas, sin relieve.',
    img:null,bump:false,water:false,fill:.99,strokeC:'rgba(255,255,255,.92)',ocean:'#12406e',
    atmos:'#5ab6ff',atmosAlt:.14,grid:'rgba(230,244,255,.42)',gridKey:'rgba(255,255,255,.9)',
    ctxStroke:'rgba(255,255,255,.42)',ctxFill:'rgba(120,142,175,.85)'},
};
const GLOBE_VIEW_ORDER=['relieve','satelite','educativa','politica','nocturna'];
const TEX_STATE={};

/* Prioridad de etiqueta: 1 = siempre visible · 2 = zoom medio · 3 = zoom cercano */
const LABEL_PRIO={canada:1,'estados-unidos':1,mexico:1,brasil:1,argentina:1,peru:1,colombia:1,
  bolivia:1,venezuela:1,chile:1,paraguay:1,ecuador:1,guyana:1,surinam:1,uruguay:1,cuba:1,
  guatemala:2,honduras:2,nicaragua:2,'costa-rica':2,panama:2,belice:2,'el-salvador':2,haiti:2,
  'republica-dominicana':2,jamaica:2,bahamas:2,'trinidad-y-tobago':2,
  'antigua-y-barbuda':3,barbados:3,dominica:3,granada:3,'san-cristobal-y-nieves':3,
  'santa-lucia':3,'san-vicente-y-las-granadinas':3};
const PRIO_ALT={1:99,2:2.7,3:1.7};

/* Paralelos y meridianos con nombre propio */
const GRID_NAMED=[
  {kind:'p',deg:0,name:'Ecuador',short:'Ecuador 0°'},
  {kind:'p',deg:23.4363,name:'Trópico de Cáncer (23,44° N)',short:'T. de Cáncer'},
  {kind:'p',deg:-23.4363,name:'Trópico de Capricornio (23,44° S)',short:'T. de Capricornio'},
  {kind:'p',deg:66.5637,name:'Círculo Polar Ártico (66,56° N)',short:'C. P. Ártico'},
  {kind:'p',deg:-66.5637,name:'Círculo Polar Antártico (66,56° S)',short:'C. P. Antártico'},
  {kind:'m',deg:0,name:'Meridiano de Greenwich (0°)',short:'Greenwich 0°'},
  {kind:'m',deg:180,name:'Antimeridiano (180°)',short:'180°'},
];

const Globe=(function(){
  const available=(typeof window.Globe==='function')&&webglOK();
  let world=null, host=null, geo=null, worldGeo=null, selectedId=null, ro=null;
  let opts={rotate:true,onSelect:null,capitals:true,labels:true,view:'relieve',mastery:false,
    world:true,grid:true,gridStep:15,gridNamed:true,relief:60,flags:true};
  let tourTimer=null, hoverId=null, chips=[], camAlt=2.4, focusId=null, dirLight=null, updLight=null, declutterRAF=0, declutterT=0, declutterTimer=0, camLng=-75, especularTex=null;

  function ensureStars(){
    if($('#stars-style'))return;
    const s=el('style',{id:'stars-style',html:`
     .stage-stars{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden;
       background-image:radial-gradient(1px 1px at 20% 30%,rgba(255,255,255,.7),transparent),
       radial-gradient(1px 1px at 65% 15%,rgba(255,255,255,.5),transparent),
       radial-gradient(1px 1px at 85% 55%,rgba(255,255,255,.6),transparent),
       radial-gradient(1px 1px at 40% 70%,rgba(255,255,255,.4),transparent),
       radial-gradient(1.5px 1.5px at 12% 80%,rgba(180,210,255,.6),transparent),
       radial-gradient(1px 1px at 75% 85%,rgba(255,255,255,.5),transparent),
       radial-gradient(1px 1px at 55% 45%,rgba(255,255,255,.35),transparent);
       background-repeat:repeat;background-size:520px 420px;opacity:.9}
     #globe-host{z-index:1}`});
    document.head.appendChild(s);
  }
  function style(){return GLOBE_VIEWS[opts.view]||GLOBE_VIEWS.relieve;}
  function regionHex(id){return (REGIONS[byId(id)?.regionPedagogica]||{}).hex||'#6aa9ff';}
  function hexA(hex,a){const h=hex.replace('#','');const n=parseInt(h,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
  function isCtx(f){return !!(f.properties&&f.properties.ctx);}

  function capColor(f){
    if(isCtx(f))return style().ctxFill;
    const id=f.properties.id;
    if(opts.mastery){const lv=SR.level(id);const map={nuevo:'#3a4a63',aprendiendo:'#ffb454',practica:'#38bdf8',casi:'#a78bfa',dominado:'#34d399',repaso:'#fb7185'};
      return hexA(map[lv],selectedId===id?.95:Math.max(.55,style().fill));}
    if(selectedId===id) return 'rgba(56,189,248,.95)';
    if(hoverId===id) return hexA(regionHex(id),Math.min(1,style().fill+.35));
    if(focusId&&focusId!==id) return hexA(regionHex(id),style().fill*.45);
    return hexA(regionHex(id),style().fill);
  }
  function strokeColor(f){return isCtx(f)?style().ctxStroke:style().strokeC;}
  function sideColor(f){return isCtx(f)?'rgba(0,0,0,0)':'rgba(20,40,70,.5)';}
  function polyAlt(f){if(isCtx(f))return .006;return selectedId===f.properties.id?.055:.012;}

  /* ---------- Polígonos: América (estudio) + resto del mundo (contexto) ---------- */
  function polyData(){
    const a=geo?geo.features:[];
    const w=(opts.world&&worldGeo)?worldGeo.features:[];
    return w.concat(a); // el contexto va primero; los 35 países quedan encima
  }

  /* ---------- Retícula: meridianos y paralelos ---------- */
  function gridPaths(){
    if(!opts.grid)return [];
    const step=opts.gridStep||15, out=[];
    const ptsM=lng=>{const p=[];for(let lat=-90;lat<=90;lat+=3)p.push([lat,lng]);return p;};
    const ptsP=lat=>{const p=[];for(let lng=-180;lng<=180;lng+=3)p.push([lat,lng]);return p;};
    const named=(k,d)=>GRID_NAMED.some(g=>g.kind===k&&Math.abs(g.deg-d)<.01);
    for(let lng=-180;lng<180;lng+=step){
      out.push({id:'m'+lng,kind:'m',deg:lng,pts:ptsM(lng),key:named('m',lng)});
    }
    for(let lat=-90+step;lat<90;lat+=step){
      out.push({id:'p'+lat,kind:'p',deg:lat,pts:ptsP(lat),key:named('p',lat)});
    }
    if(opts.gridNamed){
      GRID_NAMED.forEach(g=>{
        const yaEsta=out.some(o=>o.kind===g.kind&&Math.abs(o.deg-g.deg)<.01);
        if(yaEsta)return;
        out.push({id:g.kind+g.deg,kind:g.kind,deg:g.deg,key:true,
          pts:g.kind==='p'?ptsP(g.deg):ptsM(g.deg)});
      });
    }
    return out;
  }
  function gridColor(d){return d.key?style().gridKey:style().grid;}

  /* ---------- Etiquetas HTML: país + bandera · capital · líneas clave ---------- */
  function chipData(){
    const out=[];
    COUNTRIES.forEach(c=>{
      out.push({type:'pais',id:c.id,lat:c.coordenadasPais.lat,lng:c.coordenadasPais.lng,
        name:c.nombreES,cap:c.capitalPrincipal,flag:c.bandera,prio:LABEL_PRIO[c.id]||2,reg:c.regionPedagogica});
      out.push({type:'capital',id:c.id,lat:c.coordenadasCapital.lat,lng:c.coordenadasCapital.lng,
        name:c.capitalPrincipal,pais:c.nombreES,reg:c.regionPedagogica,prio:LABEL_PRIO[c.id]||2});
    });
    GRID_NAMED.forEach(g=>out.push({type:'grid',id:'g-'+g.kind+g.deg,kind:g.kind,deg:g.deg,
      lat:g.kind==='p'?g.deg:2, lng:g.kind==='p'?-52:g.deg, name:g.short, full:g.name}));
    return out;
  }
  function chipNode(d){
    const n=document.createElement('div');
    d.__el=n;
    if(d.type==='grid'){
      n.className='g-chip g-grid'; n.textContent=d.name; n.title=d.full; d.__box=n;
      return n;
    }
    if(d.type==='capital'){
      n.className='g-chip g-cap r-'+d.reg;
      n.appendChild(el('span',{class:'nm',text:'★ '+d.name}));
      n.title='Capital de '+d.pais+': '+d.name;
      d.__box=n.querySelector('.nm');
    }else{
      n.className='g-chip g-pais prio-'+d.prio+' r-'+d.reg;
      n.appendChild(el('img',{alt:'',src:d.flag,loading:'lazy',
        onerror:function(){this.style.display='none';}}));
      n.appendChild(el('span',{class:'nm',text:d.name}));
      n.appendChild(el('span',{class:'cp',text:'★ '+d.cap}));
      n.title=d.name+' — capital: '+d.cap;
      d.__box=n;
    }
    n.addEventListener('pointerenter',()=>setHover(d.id));
    n.addEventListener('pointerleave',()=>setHover(null));
    n.addEventListener('click',ev=>{ev.stopPropagation();const c=byId(d.id);
      if(c){selectCountry(c,true);if(opts.onSelect)opts.onSelect(c);}});
    return n;
  }
  function chipVisible(d){
    if(d.type==='grid')return !!(opts.grid&&opts.gridNamed)&&!focusId;
    // modo foco (recorridos): solo el país en curso y su capital, sin ruido alrededor
    if(focusId)return d.id===focusId;
    const on=(d.id===selectedId||d.id===hoverId);
    if(d.type==='capital'){
      if(!opts.capitals)return false;
      return on||camAlt<=2.25;
    }
    if(!opts.labels)return on;
    return on||camAlt<=(PRIO_ALT[d.prio]||2.2);
  }
  function setFocus(id){
    if(focusId===id)return;
    focusId=id||null;
    if(world)world.polygonCapColor(capColor);
    refreshChips();
  }
  function refreshChips(){
    chips.forEach(d=>{const n=d.__el; if(!n)return;
      n.classList.toggle('off',!chipVisible(d));
      n.classList.toggle('on',d.id===selectedId||d.id===hoverId);
      n.classList.toggle('sel',d.id===selectedId);
      n.classList.toggle('noflag',!opts.flags);
      if(d.type==='pais')n.classList.toggle('caps',!!opts.capitals);
    });
    queueDeclutter();
  }
  /* Anticolisión: si dos etiquetas se pisan en pantalla, gana la de mayor prioridad.
     Así los nombres se leen siempre, sin amontonarse. */
  function rank(d){
    if(d.id===selectedId)return 0;
    if(d.id===hoverId)return 1;
    if(d.type==='grid')return 46;
    if(d.type==='capital')return (byId(d.id)&&(d.id===selectedId||d.id===hoverId))?4:40;
    return 8+(d.prio||2)*10;
  }
  function queueDeclutter(){
    const ahora=(window.performance&&performance.now())?performance.now():Date.now();
    if(ahora-declutterT>200){
      declutterT=ahora;
      if(declutterRAF)return;
      declutterRAF=requestAnimationFrame(()=>{declutterRAF=0;declutter();});
      return;
    }
    if(declutterTimer)return;
    declutterTimer=setTimeout(()=>{declutterTimer=0;declutterT=(window.performance&&performance.now())?performance.now():Date.now();declutter();},200);
  }
  function declutter(){
    if(!host||host.style.display==='none')return;
    const vis=chips.filter(d=>d.__el&&d.__box&&!d.__el.classList.contains('off')&&!d.__el.classList.contains('behind'));
    vis.sort((a,b)=>rank(a)-rank(b));
    const kept=[];
    for(const d of vis){
      const n=d.__el;
      n.classList.remove('clash');
      const r=d.__box.getBoundingClientRect();
      if(!r.width||!r.height)continue;
      const box={l:r.left-2,t:r.top-2,r:r.right+2,b:r.bottom+2};
      const choca=kept.some(k=>box.l<k.r&&box.r>k.l&&box.t<k.b&&box.b>k.t);
      if(choca&&rank(d)>1)n.classList.add('clash');
      else kept.push(box);
    }
  }
  /* Los rótulos de paralelos siguen a la cámara para quedar siempre legibles */
  function moverEtiquetasDeLinea(){
    if(!world)return;
    let hay=false;
    chips.forEach(d=>{if(d.type==='grid'&&d.kind==='p'){d.lng=camLng-22;hay=true;}});
    if(hay)world.htmlElementsData(chips);
  }
  function setHover(id){
    if(hoverId===id)return;
    hoverId=id;
    if(world)world.polygonCapColor(capColor);
    refreshChips();
  }

  /* ---------- Material del globo (texturas / relieve) ---------- */
  /* three-globe pone material.color = null al cargar una textura, así que no se puede
     asumir que las propiedades de color existan. Se reutiliza la clase Color de otra
     propiedad viva del material (three.js no está expuesto como global). */
  let ColorCls=null;
  function colorSet(gm,prop,hex){
    const c=gm[prop];
    if(c&&typeof c.set==='function'){c.set(hex);return;}
    if(!ColorCls){
      const ref=gm.color||gm.emissive||gm.specular;
      if(ref&&typeof ref.constructor==='function')ColorCls=ref.constructor;
    }
    if(ColorCls){try{gm[prop]=new ColorCls(hex);}catch(e){}}
  }
  /* Verifica una sola vez que la textura exista; si falta, avisa y cae a "Educativa" */
  function verificarTextura(url){
    if(TEX_STATE[url]!==undefined)return TEX_STATE[url];
    TEX_STATE[url]='cargando';
    const im=new Image();
    im.onload=()=>{TEX_STATE[url]=true;};
    im.onerror=()=>{TEX_STATE[url]=false;
      console.warn('Globo: falta la textura',url);
      if(UI&&UI.toast)UI.toast('Falta una textura del globo','warn','Se cambió al estilo Educativa. Revisá assets/textures/ (ver README).');
      setView('educativa');
      if(Store&&Store.setCfg)Store.setCfg('view','educativa');};
    im.src=url;
    return 'cargando';
  }
  function applyTexture(){
    if(!world)return;
    const s=style();
    try{
      if(s.img)verificarTextura(GLOBE_TEX[s.img]);
      world.globeImageUrl(s.img?GLOBE_TEX[s.img]:null);
      world.bumpImageUrl((s.bump&&opts.relief>0)?GLOBE_TEX.topo:null);
    }catch(e){console.warn('Globo: no se pudieron cargar las texturas',e);}
    try{
      const gm=world.globeMaterial();
      if(s.img){
        colorSet(gm,'color','#ffffff');      // blanco = sin teñir la textura
        colorSet(gm,'emissive','#000000');
        if('emissiveIntensity'in gm)gm.emissiveIntensity=0;
        gm.shininess=s.water?16:2;
        colorSet(gm,'specular',s.water?'#24435f':'#000000');
      }else{
        colorSet(gm,'color',s.ocean||'#0b1b3a');
        colorSet(gm,'emissive','#04203a');
        if('emissiveIntensity'in gm)gm.emissiveIntensity=.35;
        gm.shininess=6;
        colorSet(gm,'specular','#0a2036');
      }
      if('bumpScale'in gm)gm.bumpScale=(s.bump?1:0)*(opts.relief||0)/100*10;
      gm.needsUpdate=true;
      aplicarEspecular(gm,!!s.water);
    }catch(e){console.warn('Globo: no se pudo ajustar el material',e);}
    applyLights();
  }
  /* La luz principal sigue a la cámara (con un desfase) para que el hemisferio
     visible siempre esté iluminado y el relieve mantenga sombras. */
  function wireLight(){
    try{
      const ls=world.lights&&world.lights(); if(!ls)return;
      dirLight=ls.find(l=>l.isDirectionalLight)||null;
      if(!dirLight)return;
      const cam=world.camera();
      updLight=()=>{
        if(!dirLight||!cam)return;
        const p=cam.position, a=.5, r=Math.hypot(p.x,p.z)||1;
        dirLight.position.set(p.x*Math.cos(a)-p.z*Math.sin(a), p.y+r*.3, p.x*Math.sin(a)+p.z*Math.cos(a));
      };
      const ctr=world.controls();
      if(ctr&&ctr.addEventListener){ctr.addEventListener('change',updLight);ctr.addEventListener('change',queueDeclutter);}
      updLight();
    }catch(e){}
  }
  /* Máscara de agua: los océanos reflejan la luz y la tierra queda mate.
     three.js no está expuesto como global, así que reutilizamos la clase Texture
     de una textura ya cargada. Si algo falla, simplemente no se aplica. */
  let especularTries=0;
  function aplicarEspecular(gm,activar){
    try{
      if(!activar){if(gm.specularMap){gm.specularMap=null;gm.needsUpdate=true;}return;}
      if(gm.specularMap||especularTex===false)return;
      if(especularTex){gm.specularMap=especularTex;gm.needsUpdate=true;return;}
      const base=gm.map||gm.bumpMap;
      if(!base||typeof base.constructor!=='function'){
        if(especularTries++<40)setTimeout(()=>{if(world)aplicarEspecular(world.globeMaterial(),activar);},250);
        return;
      }
      const Tex=base.constructor;
      const im=new Image();
      im.onload=()=>{try{const t=new Tex(im);t.needsUpdate=true;especularTex=t;
        const m=world&&world.globeMaterial();if(m&&style().water){m.specularMap=t;m.needsUpdate=true;}
      }catch(e){especularTex=false;}};
      im.onerror=()=>{especularTex=false;};
      im.src=GLOBE_TEX.agua;
    }catch(e){}
  }
  function applyLights(){
    if(!world||!world.lights)return;
    try{
      const ls=world.lights(); if(!ls||!ls.length)return;
      const s=style(), k=(opts.relief||0)/100;
      ls.forEach(l=>{
        if(l.isDirectionalLight)l.intensity=s.img?(.75+k*.75):.5;
        else if(l.isAmbientLight)l.intensity=s.img?(1.25-k*.4):1.1;
      });
    }catch(e){}
    if(updLight)updLight();
  }

  function init(){
    if(!available||world) return;
    ensureStars();
    host=$('#globe-host');
    if(!host){host=el('div',{id:'globe-host','aria-hidden':'true'});$('#main').appendChild(host);}
    chips=chipData();
    world=window.Globe({rendererConfig:{antialias:true}})(host)
      .backgroundColor('rgba(0,0,0,0)')
      .showGlobe(true)
      .showAtmosphere(true).atmosphereColor(style().atmos).atmosphereAltitude(style().atmosAlt)
      .polygonsData(polyData())
      .polygonCapColor(capColor)
      .polygonSideColor(sideColor)
      .polygonStrokeColor(strokeColor)
      .polygonAltitude(polyAlt)
      .polygonsTransitionDuration(0)
      .polygonLabel(f=>isCtx(f)?'':`<div class="globe-tip"><b>${byId(f.properties.id)?.nombreES||''}</b><span>★ ${byId(f.properties.id)?.capitalPrincipal||''}</span></div>`)
      .onPolygonClick(f=>{if(isCtx(f))return;const c=byId(f.properties.id);if(c){selectCountry(c,true);if(opts.onSelect)opts.onSelect(c);}})
      .onPolygonHover(f=>{const act=f&&!isCtx(f);setHover(act?f.properties.id:null);if(host)host.style.cursor=act?'pointer':'grab';})
      .pathsData([]).pathPoints(d=>d.pts).pathPointLat(p=>p[0]).pathPointLng(p=>p[1])
      .pathColor(gridColor).pathStroke(d=>d.key?.42:null).pathPointAlt(()=>.02)
      .pathTransitionDuration(0).pathResolution(2)
      .htmlElementsData(chips).htmlLat('lat').htmlLng('lng')
      .htmlAltitude(d=>d.type==='pais'?.035:.02)
      .htmlElement(chipNode).htmlTransitionDuration(0)
      .htmlElementVisibilityModifier((n,vis)=>{n.classList.toggle('behind',!vis);})
      .pointsData([]).pointLat('lat').pointLng('lng').pointColor(()=>'#ffd166').pointAltitude(.014).pointRadius(.26)
      .pointLabel(d=>`<div class="globe-tip"><b>★ ${d.name}</b><span>capital de ${d.pais||''}</span></div>`)
      .onPointClick(d=>{const c=byId(d.id);if(c){selectCountry(c,true);if(opts.onSelect)opts.onSelect(c);}})
      .arcsData([]).arcColor(()=>['rgba(255,209,102,.15)','rgba(255,209,102,.95)']).arcAltitudeAutoScale(.35).arcStroke(.6).arcDashLength(.5).arcDashGap(.15).arcDashAnimateTime(1600)
      .ringsData([]).ringColor(()=>t=>`rgba(255,209,102,${1-t})`).ringMaxRadius(3.4).ringPropagationSpeed(2).ringRepeatPeriod(900)
      .labelsData([]);
    world.onZoom(pov=>{
      if(!pov)return;
      let cambio=false;
      if(typeof pov.altitude==='number'&&Math.abs(pov.altitude-camAlt)>=.04){camAlt=pov.altitude;cambio=true;}
      if(typeof pov.lng==='number'&&Math.abs(pov.lng-camLng)>=10){camLng=pov.lng;moverEtiquetasDeLinea();cambio=true;}
      if(cambio)refreshChips(); else queueDeclutter();
    });
    window.__globo=world;   // handle de diagnóstico (consola del navegador)
    wireLight();
    const ctr=world.controls();
    ctr.enableZoom=true; ctr.minDistance=140; ctr.maxDistance=620; ctr.enablePan=false;
    world.pointOfView({lat:8,lng:-75,altitude:2.0},0);
    camAlt=2.0;
    applyPrefs();
    refreshLayers();
    ro=new ResizeObserver(()=>resize()); ro.observe(host);
    window.addEventListener('resize',resize);
  }
  function resize(){if(world&&host&&host.clientWidth){world.width(host.clientWidth).height(host.clientHeight);queueDeclutter();}}
  function applyPrefs(){
    if(!world)return; const c=Store.cfg(); const reduce=A11y.reducedMotion();
    opts.world=c.mundo!==false; opts.grid=c.meridianos!==false; opts.gridStep=Number(c.meridianosPaso)||15;
    opts.gridNamed=c.lineasClave!==false; opts.relief=(c.relieve==null?60:Number(c.relieve));
    opts.flags=c.banderas!==false;
    const ctr=world.controls();
    ctr.autoRotate=!!(opts.rotate&&c.rotate&&!reduce&&!tourTimer);
    ctr.autoRotateSpeed=.45;
    const q=c.quality;
    let pr=window.devicePixelRatio||1;
    if(q==='baja')pr=1; else if(q==='equilibrada')pr=Math.min(pr,1.5); else if(q==='alta')pr=Math.min(pr,2);
    else pr=Math.min(pr,1.75);
    try{world.renderer().setPixelRatio(pr);}catch(e){}
    world.showAtmosphere(q!=='baja').atmosphereColor(style().atmos).atmosphereAltitude(style().atmosAlt);
    world.ringRepeatPeriod(reduce?1e7:900);
    applyTexture();
  }
  function refreshLayers(){
    if(!world)return;
    world.polygonsData(polyData())
      .polygonCapColor(capColor).polygonSideColor(sideColor)
      .polygonStrokeColor(strokeColor).polygonAltitude(polyAlt);
    world.pathsData(gridPaths()).pathColor(gridColor);
    world.pointsData(opts.capitals?COUNTRIES.map(c=>({lat:c.coordenadasCapital.lat,lng:c.coordenadasCapital.lng,name:c.capitalPrincipal,pais:c.nombreES,id:c.id})):[]);
    refreshChips();
  }
  function selectCountry(c,fly){
    selectedId=c?c.id:null;
    if(world){
      world.polygonCapColor(capColor).polygonAltitude(polyAlt);
      refreshChips();
      if(c){
        world.arcsData([{startLat:c.coordenadasPais.lat,startLng:c.coordenadasPais.lng,endLat:c.coordenadasCapital.lat,endLng:c.coordenadasCapital.lng}]);
        world.ringsData([{lat:c.coordenadasCapital.lat,lng:c.coordenadasCapital.lng}]);
        if(fly)flyTo(c);
      }else{world.arcsData([]).ringsData([]);}
    }
  }
  /* Altitud de cámara según el tamaño real del país: Brasil se ve entero y
     Barbados se ve de cerca. Sin esto, las islas quedaban como un punto. */
  const BBOX={};
  function bboxOf(id){
    if(BBOX[id])return BBOX[id];
    const f=geo&&geo.features.find(x=>x.properties.id===id);
    if(!f||!f.geometry)return null;
    let minLat=90,maxLat=-90,minLng=180,maxLng=-180;
    const add=r=>{for(const pt of r){const lng=pt[0],lat=pt[1];
      if(lat<minLat)minLat=lat; if(lat>maxLat)maxLat=lat;
      if(lng<minLng)minLng=lng; if(lng>maxLng)maxLng=lng;}};
    const g=f.geometry;
    if(g.type==='Polygon')g.coordinates.forEach(add);
    else if(g.type==='MultiPolygon')g.coordinates.forEach(pol=>pol.forEach(add));
    else return null;
    return BBOX[id]={minLat,maxLat,minLng,maxLng};
  }
  function altitudeFor(c){
    const b=bboxOf(c.id); if(!b)return 1.3;
    const midLat=(b.minLat+b.maxLat)/2;
    const span=Math.max(b.maxLat-b.minLat,(b.maxLng-b.minLng)*Math.cos(midLat*Math.PI/180));
    return clamp(.045*span+.42,.55,1.9);
  }
  /* Encuadra país y capital juntos: el objetivo es el punto medio entre ambos. */
  function flyTo(c,alt,ms){
    if(!world)return;
    const cap=c.coordenadasCapital, pais=c.coordenadasPais;
    const a=alt||altitudeFor(c);
    const lat=(cap.lat+pais.lat)/2, lng=(cap.lng+pais.lng)/2;
    world.pointOfView({lat,lng,altitude:a},A11y.reducedMotion()?0:(ms==null?1100:ms));
    camAlt=a; refreshChips();
  }
  function overview(region){
    const povs={norte:{lat:45,lng:-100,altitude:1.75},central:{lat:14,lng:-86,altitude:1.15},
      caribe:{lat:18,lng:-73,altitude:1.2},sur:{lat:-20,lng:-60,altitude:1.8},todas:{lat:8,lng:-80,altitude:2.0}};
    const p=povs[region]||povs.todas;
    if(!world)return;
    world.pointOfView(p,A11y.reducedMotion()?0:1200); camAlt=p.altitude; refreshChips();
  }
  function setView(v){if(!GLOBE_VIEWS[v])v='relieve';opts.view=v;if(world){applyTexture();refreshLayers();}}
  function setCapitals(b){opts.capitals=b;refreshLayers();}
  function setLabels(b){opts.labels=b;refreshChips();}
  function setRotate(b){opts.rotate=b;applyPrefs();}
  function setMastery(b){opts.mastery=b;refreshLayers();}
  function setVisible(v){if(!world)return;try{v?world.resumeAnimation():world.pauseAnimation();}catch(e){}}
  function setWorldGeo(g){worldGeo=g;if(world)refreshLayers();}

  function mount(slot,o={}){
    if(!available||!slot)return false;
    Object.assign(opts,o);
    if(!world)init();
    if(!host)return false;
    slot.appendChild(host);        // host único y persistente: nunca se recrea el contexto WebGL
    host.style.display='block'; host.setAttribute('aria-hidden','false');
    setVisible(true); refreshLayers(); applyPrefs();
    requestAnimationFrame(()=>{resize();setTimeout(resize,120);});
    if(selectedId){const c=byId(selectedId);if(c)selectCountry(c,false);}
    return true;
  }
  function detach(){
    stopTour();
    // las marcas (arcos país→capital, líneas de comparación, anillos) son de la vista
    // que las pidió: se limpian al salir para no arrastrarlas a la siguiente
    if(world)world.arcsData([]).ringsData([]);
    if(!host)return;
    host.style.display='none'; host.setAttribute('aria-hidden','true');
    const m=$('#main'); if(m)m.appendChild(host);
    setVisible(false);
  }
  /* vuelo (1,1 s) + pausa para leer. `hold` es la pausa una vez que la cámara llegó. */
  function tour(list,{onStep,hold=4000,loop=false}={}){
    stopTour(); let i=0;
    const vuelo=A11y.reducedMotion()?0:1100;
    const step=()=>{
      if(i>=list.length){ if(loop){i=0;} else {stopTour();onStep&&onStep(null,-1);return;} }
      const c=list[i], idx=i; i++;
      setFocus(c.id); selectCountry(c,true);
      onStep&&onStep(c,idx,list.length);
      tourTimer=setTimeout(step,vuelo+hold);
    };
    step(); applyPrefs();
    return {stop:stopTour};
  }
  function stopTour(){
    if(tourTimer){clearTimeout(tourTimer);tourTimer=null;}
    if(focusId)setFocus(null);
    applyPrefs();
  }
  function compareArc(a,b){
    if(!world)return;
    world.arcsData([{startLat:a.coordenadasCapital.lat,startLng:a.coordenadasCapital.lng,endLat:b.coordenadasCapital.lat,endLng:b.coordenadasCapital.lng}]);
    world.ringsData([{lat:a.coordenadasCapital.lat,lng:a.coordenadasCapital.lng},{lat:b.coordenadasCapital.lat,lng:b.coordenadasCapital.lng}]);
    const mlat=(a.coordenadasCapital.lat+b.coordenadasCapital.lat)/2, mlng=(a.coordenadasCapital.lng+b.coordenadasCapital.lng)/2;
    world.pointOfView({lat:mlat,lng:mlng,altitude:2},A11y.reducedMotion()?0:1100); camAlt=2; refreshChips();
  }
  function setGeo(g){geo=g;if(world)refreshLayers();}
  function getSelected(){return selectedId?byId(selectedId):null;}
  function arcChain(ids){if(!world)return;const pts=ids.map(byId).filter(Boolean);const arcs=[];
    for(let i=0;i<pts.length-1;i++){arcs.push({startLat:pts[i].coordenadasCapital.lat,startLng:pts[i].coordenadasCapital.lng,endLat:pts[i+1].coordenadasCapital.lat,endLng:pts[i+1].coordenadasCapital.lng});}
    world.arcsData(arcs);}
  function clearMarks(){selectedId=null;hoverId=null;if(world){world.arcsData([]).ringsData([]);refreshLayers();}}
  return {available,init,mount,detach,setGeo,setWorldGeo,selectCountry,flyTo,overview,setView,setCapitals,setFocus,altitudeFor,
    setLabels,setRotate,setMastery,setVisible,applyPrefs,refreshLayers,tour,stopTour,compareArc,getSelected,
    arcChain,clearMarks,resize,set onSelect(fn){opts.onSelect=fn;},get selectedId(){return selectedId;},
    get view(){return opts.view;}};
})();

/* ============================================================
   Map2D — mapa SVG accesible (fallback y alternativa)
   ============================================================ */
const Map2D=(function(){
  let geo=null, B=null; const W=1000, PAD=16;
  function setGeo(g){geo=g;computeBounds();}
  function computeBounds(){
    let minLng=Infinity,maxLng=-Infinity,minLat=Infinity,maxLat=-Infinity;
    for(const f of geo.features){eachRing(f.geometry,r=>{for(const [lng,lat] of r){
      if(lng<minLng)minLng=lng;if(lng>maxLng)maxLng=lng;if(lat<minLat)minLat=lat;if(lat>maxLat)maxLat=lat;}});}
    const midLat=(minLat+maxLat)/2, kx=Math.cos(midLat*Math.PI/180);
    const pxR=(maxLng-minLng)*kx, pyR=(maxLat-minLat);
    const scale=(W-2*PAD)/pxR, H=pyR*scale+2*PAD;
    B={minLng,maxLng,minLat,maxLat,kx,scale,H};
  }
  function eachRing(geom,cb){
    if(!geom)return;
    if(geom.type==='Polygon')geom.coordinates.forEach(cb);
    else if(geom.type==='MultiPolygon')geom.coordinates.forEach(p=>p.forEach(cb));
  }
  function px(lng,lat){return [PAD+(lng-B.minLng)*B.kx*B.scale, PAD+(B.maxLat-lat)*B.scale];}
  function inv(x,y){return {lng:B.minLng+(x-PAD)/(B.kx*B.scale), lat:B.maxLat-(y-PAD)/B.scale};}
  function pathD(geom){
    let d='';
    eachRing(geom,ring=>{ring.forEach(([lng,lat],i)=>{const [x,y]=px(lng,lat);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);});d+='Z';});
    return d;
  }
  function render(container,o={}){
    const opt=Object.assign({onSelect:null,selectedId:null,mastery:false,capitals:true,labels:true,onLocationPick:null,interactive:true,region:'todas'},o);
    container.innerHTML='';
    const ns='http://www.w3.org/2000/svg';
    const svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class','map2d'); svg.setAttribute('viewBox',`0 0 ${W} ${B.H}`);
    svg.setAttribute('role','group'); svg.setAttribute('aria-label','Mapa 2D de América. Usá Tab para recorrer los países y Enter para seleccionar.');
    const feats=geo.features.filter(f=>opt.region==='todas'||f.properties.region===opt.region);
    const masteryMap={nuevo:'#3a4a63',aprendiendo:'#ffb454',practica:'#38bdf8',casi:'#a78bfa',dominado:'#34d399',repaso:'#fb7185'};
    feats.forEach(f=>{
      const id=f.properties.id, c=byId(id);
      const p=document.createElementNS(ns,'path');
      p.setAttribute('d',pathD(f.geometry));
      p.setAttribute('class','country '+f.properties.region+(opt.selectedId===id?' sel':''));
      p.dataset.id=id;
      if(opt.mastery)p.setAttribute('fill',masteryMap[SR.level(id)]);
      if(opt.interactive){
        p.setAttribute('tabindex','0'); p.setAttribute('role','button');
        p.setAttribute('aria-label',(c?c.nombreES:id)+' — capital '+(c?c.capitalPrincipal:''));
        p.addEventListener('click',()=>opt.onSelect&&opt.onSelect(c));
        p.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();opt.onSelect&&opt.onSelect(c);}});
      }else{p.setAttribute('aria-hidden','true');}
      svg.appendChild(p);
    });
    if(opt.capitals){
      feats.forEach(f=>{const c=byId(f.properties.id);const [x,y]=px(c.coordenadasCapital.lng,c.coordenadasCapital.lat);
        const ci=document.createElementNS(ns,'circle');ci.setAttribute('class','cap');ci.setAttribute('cx',x);ci.setAttribute('cy',y);ci.setAttribute('r',opt.selectedId===f.properties.id?4:2.4);ci.setAttribute('aria-hidden','true');ci.dataset.id=f.properties.id;svg.appendChild(ci);});
    }
    if(opt.labels){
      feats.filter(f=>['CAN','USA','MEX','BRA','ARG','COL','PER','BOL','VEN','CHL','GTM'].includes(f.properties.iso3)).forEach(f=>{
        const c=byId(f.properties.id);const [x,y]=px(c.coordenadasPais.lng,c.coordenadasPais.lat);
        const t=document.createElementNS(ns,'text');t.setAttribute('class','lbl');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('text-anchor','middle');t.setAttribute('aria-hidden','true');t.textContent=c.nombreES;svg.appendChild(t);});
    }
    if(opt.onLocationPick){
      svg.style.cursor='crosshair';
      svg.addEventListener('click',e=>{const pt=svg.getBoundingClientRect();
        const x=(e.clientX-pt.left)/pt.width*W, y=(e.clientY-pt.top)/pt.height*B.H;
        opt.onLocationPick(inv(x,y),{x,y,svg,ns});});
    }
    container.appendChild(svg);
    return {svg,
      select(id){$$('path.country',svg).forEach(p=>p.classList.toggle('sel',p.dataset.id===id));
        $$('circle.cap',svg).forEach(ci=>ci.setAttribute('r',ci.dataset.id===id?4:2.4));},
      marker(lat,lng,color){const [x,y]=px(lng,lat);const m=document.createElementNS(ns,'circle');m.setAttribute('cx',x);m.setAttribute('cy',y);m.setAttribute('r',5);m.setAttribute('fill',color||'#38bdf8');m.setAttribute('stroke','#fff');m.setAttribute('stroke-width','1');svg.appendChild(m);return m;}
    };
  }
  return {setGeo,render,px:(lng,lat)=>px(lng,lat)};
})();

/* Genera una silueta SVG normalizada de un país (para tarjetas y práctica) */
function siluetaSVG(country,size=200,color='var(--accent)'){
  const g=window.__GEO; if(!g)return '';
  const f=g.features.find(x=>x.properties.id===country.id); if(!f)return '';
  let minLng=Infinity,maxLng=-Infinity,minLat=Infinity,maxLat=-Infinity;
  const rings=[];
  const walk=geom=>{const add=r=>{rings.push(r);for(const [lng,lat] of r){if(lng<minLng)minLng=lng;if(lng>maxLng)maxLng=lng;if(lat<minLat)minLat=lat;if(lat>maxLat)maxLat=lat;}};
    if(geom.type==='Polygon')geom.coordinates.forEach(add);else geom.coordinates.forEach(p=>p.forEach(add));};
  walk(f.geometry);
  const midLat=(minLat+maxLat)/2,kx=Math.cos(midLat*Math.PI/180);
  const pxR=(maxLng-minLng)*kx||1,pyR=(maxLat-minLat)||1;
  const s=(size-16)/Math.max(pxR,pyR); const w=pxR*s+16,h=pyR*s+16;
  let d='';
  rings.forEach(r=>{r.forEach(([lng,lat],i)=>{const x=8+(lng-minLng)*kx*s,y=8+(maxLat-lat)*s;d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);});d+='Z';});
  return `<svg viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="${d}" fill="${color}" stroke="rgba(255,255,255,.35)" stroke-width="1"/></svg>`;
}

/* ============================================================
   Helpers de escenario y presentación
   ============================================================ */
function viewHead(kick,title,desc){
  return el('header',{class:'view-head'},
    kick?el('div',{class:'kick',text:kick}):null,
    el('h1',{text:title}),
    desc?el('p',{text:desc}):null);
}
function regionChips(current,onPick,{includeAll=true}={}){
  const wrap=el('div',{class:'pill-row',role:'group','aria-label':'Filtrar por región'});
  const items=includeAll?[['todas','Todas']]:[]; REGION_ORDER.forEach(r=>items.push([r,REGIONS[r].nombre]));
  items.forEach(([id,label])=>{
    const on=current===id;
    const b=el('button',{class:'chip'+(on?' on':''),type:'button','aria-pressed':String(on),onclick:()=>onPick(id)});
    if(id!=='todas')b.appendChild(el('span',{class:'dot',style:'background:'+REGIONS[id].hex}));
    b.appendChild(document.createTextNode(label));
    wrap.appendChild(b);
  });
  return wrap;
}
function mountStageInto(slot,{onSelect,region='todas',mastery=false,capitals,labels}={}){
  if(Globe.available){
    Globe.mount(slot,{onSelect,mastery});
    Globe.setView(Store.cfg().view);
    Globe.setCapitals(capitals!=null?capitals:Store.cfg().capitals);
    Globe.setLabels(labels!=null?labels:Store.cfg().labels);
    Globe.setMastery(mastery);
    return {type:'globe'};
  }
  const api=Map2D.render(slot,{onSelect,mastery,region,selectedId:Globe.selectedId,
    capitals:capitals!=null?capitals:true,labels:labels!=null?labels:true});
  return {type:'map',api};
}
function buildStage({region='todas',onSelect,mastery=false}={}){
  const stage=el('div',{id:'stage'});
  stage.appendChild(el('div',{class:'stage-stars','aria-hidden':'true'}));
  const slot=el('div',{'data-globe-slot':'',style:'position:absolute;inset:0;z-index:1'});
  stage.appendChild(slot);
  // leyenda de regiones
  const legend=el('div',{class:'stage-legend','aria-hidden':'true'});
  REGION_ORDER.forEach(r=>legend.appendChild(el('div',{class:'lg'},el('span',{class:'sw',style:'background:'+REGIONS[r].hex}),document.createTextNode(REGIONS[r].nombre))));
  stage.appendChild(legend);
  stage.appendChild(el('div',{class:'stage-hint','aria-hidden':'true',
    text:'Arrastrá para girar · rueda para acercar · tocá un país para su ficha'}));
  // cartel de recorrido: se lee de lejos, sin depender del sonido ni de las etiquetas
  const cap=el('div',{class:'stage-caption',hidden:true,'aria-hidden':'true'});
  stage.appendChild(cap);
  stage.__caption={
    set(c,i,n){
      cap.innerHTML='';
      cap.append(
        el('img',{src:c.bandera,alt:'',onerror:function(){this.style.display='none';}}),
        el('div',{class:'txt'},
          el('b',{text:c.nombreES}),
          el('span',{text:(c.tipoCapital==='dual'?'Capitales: Sucre (constitucional) · La Paz (gobierno)':'Capital: '+c.capitalPrincipal)})),
        (n?el('span',{class:'num',text:(i+1)+' / '+n}):null));
      cap.hidden=false;
    },
    clear(){cap.hidden=true;cap.innerHTML='';}
  };
  const mounted=mountStageInto(slot,{onSelect,region,mastery});
  stage.__slot=slot; stage.__mounted=mounted;
  if(mounted.type==='map'){legend.setAttribute('aria-hidden','false');}
  return stage;
}


function speakOr(text){
  if(!Store.cfg().sound){UI.toast('Activá el sonido','info','Usá el botón de sonido (arriba a la derecha) para escuchar la pronunciación');return;}
  Audio.resume();Audio.speak(text);
}

function kvRow(k,v){return el('div',{class:'kv'},el('span',{class:'k',text:k}),el('span',{class:'v',text:v}));}

/* ---------- Buscador con autocompletado ---------- */
function searchBox(onPick,placeholder='Buscar país o capital…'){
  const box=el('div',{class:'searchbox'});
  const input=el('input',{type:'search',placeholder,'aria-label':placeholder,autocomplete:'off',role:'combobox','aria-expanded':'false','aria-autocomplete':'list'});
  const list=el('div',{class:'autocomplete',role:'listbox',hidden:true});
  let idx=-1,matches=[];
  function close(){list.hidden=true;list.innerHTML='';input.setAttribute('aria-expanded','false');idx=-1;}
  function search(q){
    q=norm(q); if(!q){close();return;}
    matches=COUNTRIES.filter(c=>norm(c.nombreES).includes(q)||norm(c.capitalPrincipal).includes(q)||
      c.aliasPais.some(a=>norm(a).includes(q))||c.capitalesAceptadas.some(a=>norm(a).includes(q))).slice(0,8);
    list.innerHTML='';
    if(!matches.length){list.appendChild(el('button',{class:'muted',disabled:true,text:'Sin resultados'}));list.hidden=false;return;}
    matches.forEach((c,i)=>{
      list.appendChild(el('button',{type:'button',role:'option',onclick:()=>{pick(c);},onmouseenter:()=>setActive(i)},
        el('img',{src:c.bandera,alt:'',onerror:function(){this.style.visibility='hidden';}}),
        el('div',{},el('div',{style:'font-weight:600',text:c.nombreES}),el('small',{class:'muted',text:c.capitalPrincipal}))));
    });
    list.hidden=false;input.setAttribute('aria-expanded','true');idx=-1;
  }
  function setActive(i){idx=i;$$('button',list).forEach((b,k)=>b.classList.toggle('active',k===i));}
  function pick(c){input.value=c.nombreES;close();onPick(c);}
  input.addEventListener('input',()=>search(input.value));
  input.addEventListener('keydown',e=>{
    if(list.hidden)return;
    if(e.key==='ArrowDown'){e.preventDefault();setActive(clamp(idx+1,0,matches.length-1));}
    else if(e.key==='ArrowUp'){e.preventDefault();setActive(clamp(idx-1,0,matches.length-1));}
    else if(e.key==='Enter'){e.preventDefault();if(matches[idx])pick(matches[idx]);else if(matches[0])pick(matches[0]);}
    else if(e.key==='Escape')close();
  });
  const fuera=e=>{ if(!box.isConnected){document.removeEventListener('click',fuera);return;}
    if(!box.contains(e.target))close(); };
  document.addEventListener('click',fuera);
  box.append(input,list);
  return box;
}


/* ============================================================
   Quiz — generación de preguntas y distractores
   ============================================================ */
const CLASSIC_DISTRACTORS={ // ciudades NO capitales, tentadoras (se enseña por qué no)
  'canada':['Toronto','Montreal','Vancouver'],
  'estados-unidos':['Nueva York','Los Ángeles','Chicago'],
  'mexico':['Guadalajara','Monterrey','Cancún'],
  'brasil':['Río de Janeiro','São Paulo','Salvador'],
  'belice':['Ciudad de Belice','San Ignacio'],
  'ecuador':['Guayaquil','Cuenca'],
  'peru':['Cusco','Arequipa'],
  'bolivia':['Santa Cruz de la Sierra','Cochabamba'],
  'argentina':['Córdoba','Rosario'],
  'colombia':['Medellín','Cali','Cartagena'],
  'guatemala':['Quetzaltenango'],
  'venezuela':['Maracaibo','Valencia'],
  'chile':['Valparaíso','Concepción'],
};
const Quiz=(function(){
  function capOf(c){return c.capitalPrincipal;}
  function otherCaps(c,n,region){
    let pool=COUNTRIES.filter(x=>x.id!==c.id);
    let same=pool.filter(x=>x.regionPedagogica===(region&&region!=='todas'?region:c.regionPedagogica));
    let pick=shuffle(same).map(capOf);
    if(pick.length<n)pick=pick.concat(shuffle(pool.filter(x=>x.regionPedagogica!==c.regionPedagogica)).map(capOf));
    return uniq(pick).slice(0,n);
  }
  function otherCountries(c,n,region){
    let pool=COUNTRIES.filter(x=>x.id!==c.id);
    let same=pool.filter(x=>x.regionPedagogica===(region&&region!=='todas'?region:c.regionPedagogica));
    let pick=shuffle(same);
    if(pick.length<n)pick=pick.concat(shuffle(pool.filter(x=>x.regionPedagogica!==c.regionPedagogica)));
    return uniq(pick.map(x=>x.id)).slice(0,n).map(byId);
  }
  // Bolivia: elige subtipo y devuelve {q,answer,exclude,note}
  function boliviaCapital(){
    const constitucional=Math.random()<.5;
    return constitucional
      ? {label:'la capital constitucional de Bolivia',answer:'Sucre',exclude:'La Paz',note:'Sucre es la capital constitucional de Bolivia; La Paz es la sede del gobierno.'}
      : {label:'la sede de gobierno de Bolivia (Ejecutivo y Legislativo)',answer:'La Paz',exclude:'Sucre',note:'La Paz es la sede del gobierno; la capital constitucional es Sucre.'};
  }
  function buildMC(o){
    const {country:c,direction,optionCount=4,region}=o;
    let promptText,answer,options,media={},note='',accept=[];
    if(direction==='capital'){ // país -> capital
      if(c.id==='bolivia'){const b=boliviaCapital();
        promptText='¿Cuál es '+b.label+'?'; answer=b.answer; note=b.note;
        let ds=otherCaps(c,optionCount+1,region).filter(x=>x!==b.exclude&&x!==b.answer).slice(0,optionCount-1);
        options=shuffle([answer,...ds]);
      }else{
        promptText='¿Cuál es la capital de '+c.nombreES+'?'; answer=capOf(c);
        let classic=(CLASSIC_DISTRACTORS[c.id]||[]);
        let ds=uniq([...classic,...otherCaps(c,optionCount+2,region)]).filter(x=>x!==answer).slice(0,optionCount-1);
        options=shuffle([answer,...ds]);
      }
      accept=[answer];
    }else if(direction==='country'){ // capital -> país
      const capLabel=(c.id==='bolivia')?(Math.random()<.5?'Sucre':'La Paz'):capOf(c);
      promptText='¿De qué país es capital '+capLabel+'?'; answer=c.nombreES;
      let ds=otherCountries(c,optionCount-1,region).map(x=>x.nombreES);
      options=shuffle([answer,...ds]);
      accept=[answer]; if(c.id==='bolivia')note='Tanto Sucre como La Paz corresponden a Bolivia.';
    }else if(direction==='flag'){
      promptText='¿A qué país pertenece esta bandera?'; answer=c.nombreES; media.flag=c.bandera;
      let ds=otherCountries(c,optionCount-1,region).map(x=>x.nombreES);
      options=shuffle([answer,...ds]); accept=[answer];
    }else if(direction==='silhouette'){
      promptText='¿Qué país corresponde a esta silueta?'; answer=c.nombreES; media.silhouette=c.id;
      let ds=otherCountries(c,optionCount-1,region).map(x=>x.nombreES);
      options=shuffle([answer,...ds]); accept=[answer];
    }
    return {kind:'mc',countryId:c.id,promptText,answer,options,media,note,accept};
  }
  function buildText(o){
    const {country:c,direction}=o;
    let promptText,accept,answer,note='';
    if(direction==='capital'){
      if(c.id==='bolivia'){const b=boliviaCapital();promptText='Escribí '+b.label+':';answer=b.answer;accept=[b.answer];note=b.note;}
      else{promptText='Escribí la capital de '+c.nombreES+':';answer=capOf(c);accept=capitalAceptada(c);}
    }else{
      const capLabel=(c.id==='bolivia')?'La Paz o Sucre':capOf(c);
      promptText='Escribí el país cuya capital es '+capLabel+':';answer=c.nombreES;accept=paisAceptado(c);
    }
    return {kind:'text',countryId:c.id,promptText,answer,accept,note,media:{}};
  }
  function buildMap(o){
    const {country:c}=o;
    return {kind:'map',countryId:c.id,promptText:'Tocá '+c.nombreES+' en el mapa.',answer:c.nombreES,note:'',media:{}};
  }
  function buildLoc(o){
    const {country:c}=o;
    const capLabel=(c.id==='bolivia')?'La Paz (sede de gobierno)':c.capitalPrincipal;
    const target=(c.id==='bolivia')?{lat:-16.4897,lng:-68.1193}:c.coordenadasCapital;
    return {kind:'loc',countryId:c.id,promptText:'Tocá la ubicación aproximada de '+capLabel+'.',target,answer:capLabel,note:'',media:{}};
  }
  function buildQuestion(kind,opts){
    if(kind==='mc-capital')return buildMC({...opts,direction:'capital'});
    if(kind==='mc-country')return buildMC({...opts,direction:'country'});
    if(kind==='mc-flag')return buildMC({...opts,direction:'flag'});
    if(kind==='mc-silhouette')return buildMC({...opts,direction:'silhouette'});
    if(kind==='text-capital')return buildText({...opts,direction:'capital'});
    if(kind==='text-country')return buildText({...opts,direction:'country'});
    if(kind==='map-country')return buildMap(opts);
    if(kind==='loc-capital')return buildLoc(opts);
    return buildMC({...opts,direction:'capital'});
  }
  function pool(region,count,source){
    let base=inRegion(region);
    if(source==='fails')base=SR.dueList(base).length?SR.dueList(base):base;
    if(source==='daily'){const seed=hashStr(todayKey());base=seededPick(base,Math.min(count,base.length),seed);return base;}
    if(source==='adaptive')return SR.weightedPick(base,Math.min(count,base.length));
    return sample(base,Math.min(count,base.length));
  }
  function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function seededPick(arr,n,seed){let a=arr.slice(),out=[],s=seed;
    const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
    n=Math.min(n,a.length);for(let k=0;k<n;k++){out.push(a.splice(Math.floor(rnd()*a.length),1)[0]);}return out;}
  return {buildQuestion,pool,hashStr,seededPick};
})();
