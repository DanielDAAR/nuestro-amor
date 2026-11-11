/* ══════════════════════════════════════
   HOME · pestaña "Inicio" (la carta)
   mensajes · caja · jardín · tarjetas ·
   foto · tu turno · init
   ══════════════════════════════════════ */

/* ══════════════════════════════════════
   MENSAJES PERSONALES
   ══════════════════════════════════════ */
const messages = [
  {emoji:'💗', title:'Eres mi persona favorita', desc:'No importa qué tan malo esté el día, tú eres lo mejor de él.'},
  {emoji:'😆', title:'Tu risa', desc:'Es mi sonido favorito. Puedo pasarme horas escuchándote reír.'},
  {emoji:'🌸', title:'Mi pausa bonita', desc:'En medio de todo el ruido, tú eres mi silencio tranquilo.'},
  {emoji:'🔭', title:'Sin buscar más', desc:'Ya no busco nada más. Ya te encontré a ti.'},
  {emoji:'👑', title:'Te elijo siempre', desc:'Antes que a cualquier cosa, antes que a cualquier día. Te elijo a ti.'},
  {emoji:'🎧', title:'Tu paciencia', desc:'Gracias por escucharme aunque hable de cosas que no entiendes.'},
  {emoji:'🏡', title:'Mi lugar', desc:'Dondequiera que estemos, contigo es donde quiero estar.'},
  {emoji:'🌙', title:'Siempre tú', desc:'No importa el día, la hora o el lugar. Siempre tú.'},
  {emoji:'🤝', title:'Mi equipo', desc:'Somos un equipo: tú, yo, y todo lo que nos falta por vivir.'},
  {emoji:'☀️', title:'Tu sonrisa', desc:'Es mi pantalla de inicio favorita. La vería cada mañana.'}
];

/* ══════════════════════════════════════
   TARJETAS DIVERTIDAS
   ══════════════════════════════════════ */
const funCards = [
  {e:'🍿', l:'Contigo hasta esperar<br>se hace corto'},
  {e:'🥑', l:'Somos el mismo<br>nivel de raro'},
  {e:'🎧', l:'Nuestra canción:<br>otra vez, porfa'},
  {e:'🐾', l:'Un peludito para<br>los dos'},
  {e:'🌙', l:'Desvelarnos<br>hablando de nada'},
  {e:'🥂', l:'Brindar por<br>seguir aquí'},
  {e:'💌', l:'Me sigues gustando<br>todos los días', wide:true}
];

/* ══════════════════════════════════════
   FLORES — crecen desde abajo
   ══════════════════════════════════════ */
function flowerSVG(p,c,s){
  return `<svg width="${s}" height="${s*1.8}" viewBox="0 0 60 108" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 108 Q28 70 30 40" stroke="#7fb894" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M30 80 Q14 74 12 62 Q26 62 30 74Z" fill="#a8d5ba"/>
    <path d="M30 66 Q46 60 48 48 Q34 48 30 60Z" fill="#8fc9a5"/>
    <g transform="translate(30,30)">
      <ellipse cx="0" cy="-13" rx="8" ry="13" fill="${p}"/>
      <ellipse cx="12" cy="-4" rx="8" ry="13" fill="${p}" transform="rotate(72)"/>
      <ellipse cx="7" cy="11" rx="8" ry="13" fill="${p}" transform="rotate(144)"/>
      <ellipse cx="-7" cy="11" rx="8" ry="13" fill="${p}" transform="rotate(216)"/>
      <ellipse cx="-12" cy="-4" rx="8" ry="13" fill="${p}" transform="rotate(288)"/>
      <circle cx="0" cy="0" r="8" fill="${c}"/>
      <circle cx="0" cy="0" r="4" fill="rgba(255,255,255,.55)"/>
    </g>
  </svg>`;
}

function buildGarden(){
  const g = document.getElementById('garden');
  const cols=[['#FD9BB3','#FFE066'],['#E8A0BF','#FFF3B0'],['#F7C6CE','#FFD5C2'],['#D4C5F0','#FFF3B0'],['#FFB3C6','#FFE066'],['#FADADD','#FFD5C2'],['#FF9AA2','#FFF3B0'],['#C9E8D8','#FFE066'],['#E6D7F1','#FFD5C2']];
  const n = innerWidth<400?7:9;
  for(let i=0;i<n;i++){
    const [p,c]=cols[i%cols.length];
    const s=34+Math.round(Math.random()*20);
    const el=document.createElement('div');
    el.className='flower';
    el.style.left=(4+i*(92/n)+Math.random()*4)+'%';
    el.style.transitionDelay=(i*.09)+'s';
    el.innerHTML=flowerSVG(p,c,s);
    g.appendChild(el);
  }
}

/* ══════════════════════════════════════
   INTERACCIÓN — caja de música
   ══════════════════════════════════════ */
const musicBox=document.getElementById('musicBox');
const boxArea=document.querySelector('.box-area');
const waxSeal=document.getElementById('waxSeal');
const sealHint=document.getElementById('sealHint');
const decoBow=document.getElementById('decoBow');
const flipCard=document.getElementById('flipCard');
const flipEmoji=document.getElementById('flipEmoji');
const flipTitle=document.getElementById('flipTitle');
const flipDesc=document.getElementById('flipDesc');
const btnMore=document.getElementById('btnMore');

let opened=false, idx=0;

function showMsg(i){
  const m=messages[i];
  flipEmoji.textContent=m.emoji;
  flipTitle.textContent=m.title;
  flipDesc.textContent=m.desc;
  flipCard.classList.remove('flipped');
}

function openBox(){
  if(opened) return;
  ensureAudio();
  haptic(waxSeal);
  sndUnlock();
  setTimeout(sndMelody,500);

  opened=true;
  musicBox.classList.add('opened');
  boxArea.classList.add('opened');
  decoBow.classList.add('opened');
  sealHint.textContent='Toca la carta para leer';

  setTimeout(showMsg.bind(null,idx),450);
  document.getElementById('garden').classList.add('grown');
  burst(innerWidth/2, innerHeight*.5, 8);
}

waxSeal.addEventListener('click', openBox);

flipCard.addEventListener('click',()=>{
  if(!opened) return;
  ensureAudio(); haptic(flipCard); sndFlip();
  flipCard.classList.toggle('flipped');
  const r=flipCard.getBoundingClientRect();
  burst(r.left+r.width/2, r.top+r.height/2, 4);
});
flipCard.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();flipCard.click();} });

btnMore.addEventListener('click',()=>{
  ensureAudio(); haptic(btnMore);
  idx=(idx+1)%messages.length;
  sndChime();
  flipCard.classList.remove('flipped');
  setTimeout(()=>showMsg(idx),350);
});

/* ── Tarjetas divertidas → abren sheet iOS ── */
const funExtras=[
  'Y no me importa: a tu lado el tiempo se va volando.',
  'Y por eso somos el mejor equipo.',
  'La pongo mil veces y no me canso.',
  'Tú eliges el nombre, yo ya tengo los elegidos.',
  'Esos son los mejores momentos: tú, yo y charla sin sentido.',
  'Por todo lo que viene. ¡Salud!',
  'Igual que el primer día, solo que ahora lo confirmo todos los días.'
];

function buildFun(){
  const grid=document.getElementById('funGrid');
  funCards.forEach((c,i)=>{
    const el=document.createElement('div');
    el.className='fun-card'+(c.wide?' wide':'');
    el.setAttribute('role','button');
    el.setAttribute('tabindex','0');
    el.innerHTML=`<div class="fun-emoji">${c.e}</div><div class="fun-label">${c.l}</div>`;
    const act=()=>{
      ensureAudio(); haptic(el); sndPop();
      const r=el.getBoundingClientRect();
      burst(r.left+r.width/2, r.top+r.height/2, 5);
      setTimeout(()=>openSheet(c.e+' '+c.l.replace(/<br>/g,' '), funExtras[i]||''),160);
    };
    el.addEventListener('click',act);
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();act();} });
    grid.appendChild(el);
  });
}

document.addEventListener('touchend',e=>{
  if(e.target.closest('button')||e.target.closest('.flip-card')||e.target.closest('.fun-card')) return;
  const t=e.changedTouches[0];
  ensureAudio();
  burst(t.clientX,t.clientY,3);
},{passive:true});

/* ── Flores cuando entran en viewport ── */
function observeGarden(){
  const g=document.getElementById('garden');
  new IntersectionObserver(en=>{en.forEach(x=>{if(x.isIntersecting)g.classList.add('grown');});},{threshold:.3}).observe(g);
}

/* ── Flores reaccionan al pasar el dedo ── */
function initFlowerTouch(){
  const g=document.getElementById('garden');
  const flowers=()=>g.querySelectorAll('.flower');
  let lastSway=0;

  function trySway(x,y){
    const now=Date.now();
    if(now-lastSway<260) return;           // evita activar todas de golpe
    const list=flowers();
    for(const f of list){
      const r=f.getBoundingClientRect();
      const cx=r.left+r.width/2;
      const cy=r.top+r.height/2;
      const dist=Math.hypot(x-cx,y-cy);
      if(dist<r.width*0.9+26 && !f.classList.contains('sway')){
        lastSway=now;
        f.classList.add('sway');
        setTimeout(()=>f.classList.remove('sway'),820);
        // suelta un pétalo
        if(Math.random()<.7) dropPetal(cx,r.top+8);
        break;
      }
    }
  }

  g.addEventListener('touchmove',e=>{
    const t=e.touches[0];
    trySway(t.clientX,t.clientY);
  },{passive:true});

  g.addEventListener('mousemove',e=>trySway(e.clientX,e.clientY));

  // toque simple también reacciona
  g.addEventListener('touchstart',e=>{
    const t=e.touches[0];
    trySway(t.clientX,t.clientY);
  },{passive:true});
}

/* ── Nuestra foto → lightbox ── */
function initPhoto(){
  const frame=document.getElementById('photoFrame');
  const lb=document.getElementById('lightbox');
  const close=document.getElementById('lightboxClose');
  if(!frame) return;
  const open=()=>{
    ensureAudio(); sndPop();
    const r=frame.getBoundingClientRect();
    burst(r.left+r.width/2, r.top+r.height/2, 5);
    lb.classList.add('on');
  };
  const shut=()=>lb.classList.remove('on');
  frame.addEventListener('click',open);
  close.addEventListener('click',shut);
  lb.addEventListener('click',e=>{ if(e.target===lb) shut(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') shut(); });
}

/* ═════════════════════════════════════════════
   TU TURNO — ella escribe, él recibe
   FIX FASE 0: el toast ya no promete WhatsApp;
   botón enviar nace disabled; estado disabled
   se restablece tras enviar.
   ═════════════════════════════════════════════ */
/* FASE 1: cada perfil guarda y comparte con su propia clave.
   Sin sesión todavía → se comporta como antes (Kitzya). */
function replyProfile(){
  try{
    const s = JSON.parse(localStorage.getItem('portal-session-v1') || 'null');
    if(s && s.profile) return s.profile;
  }catch(e){}
  return 'kitzya';
}
function replyKey(){
  return replyProfile() === 'daniel' ? 'daniel-reply-v1' : 'kitzya-reply-v1';
}
function replyShareTitle(){
  return replyProfile() === 'daniel' ? 'Para ti, Kitzya' : 'Para ti, Daniel';
}
const replyCard   = document.getElementById('replyLast');
const replyText   = document.getElementById('replyLastText');
const replyInput  = document.getElementById('replyInput');
const replyCount  = document.getElementById('replyCount');
const btnSend     = document.getElementById('btnSend');
const btnClear    = document.getElementById('replyClear');
const replyToast  = document.getElementById('replyToast');

function saveReply(text){
  try{ localStorage.setItem(replyKey(), JSON.stringify({text, at: Date.now()})); } catch(e){}
}
function loadReply(){
  try{ const raw = localStorage.getItem(replyKey()); if(!raw) return null; return JSON.parse(raw); }
  catch(e){ return null; }
}
function renderReply(){
  const r = loadReply();
  if(!r) return;
  replyCard.hidden = false;
  replyText.textContent = '«' + r.text + '»';
}
function clearReply(){
  try{ localStorage.removeItem(replyKey()); } catch(e){}
  replyCard.hidden = true;
}
function toastShow(el, text, ms=2600){
  if(text) el.textContent = text;
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(()=>{ el.hidden = true; }, ms);
}
async function sendReply(){
  const text = (replyInput.value || '').trim();
  if(!text) return;
  saveReply(text);                  // síncrono: no rompe el gesto de usuario de share()
  renderReply();
  replyInput.value = '';
  replyCount.textContent = '0/140';
  btnSend.disabled = true;          // FIX FASE 0: sin texto, botón deshabilitado
  if(typeof navigator.share === 'function'){
    try{ await navigator.share({ title: replyShareTitle(), text }); return; }
    catch(e){}                      // canceló o falló
  }
  try{
    await navigator.clipboard.writeText(text);
    toastShow(replyToast, 'Listo: quedó copiado. Ábrelo en WhatsApp y pégalo.');
  }
  catch(e){
    toastShow(replyToast, 'Tu respuesta quedó guardada en este teléfono.');
  }
}

replyInput.addEventListener('input', () => {
  const n = replyInput.value.length;
  replyCount.textContent = n + '/140';
  btnSend.disabled = n === 0;
});
btnClear.addEventListener('click', clearReply);
btnSend.addEventListener('click', sendReply);

/* ── Init ── */
buildGarden();
buildFun();
observeGarden();
initFlowerTouch();
initPhoto();
renderReply();
