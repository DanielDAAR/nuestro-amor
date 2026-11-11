/* ══════════════════════════════════════
   UI · primitivas compartidas
   guiño de consola · title · haptic ·
   sheet iOS · partículas · pétalos
   ══════════════════════════════════════ */

/* guiño dev: mensaje solo para quien abra la consola */
console.log('%c💕', 'font-size:48px');
console.log('%cPara ti, Kitzya', 'font-size:20px;font-weight:700;color:#FF375F');
console.log('%cSi estás leyendo esto, eres la persona más curiosa que conozco.\nY sí: hasta la consola la escribí pensando en ti.', 'font-size:13px;color:#8E4162;line-height:1.6');

/* cuando sale de la pestaña, el título la espera */
const realTitle = document.title;
document.addEventListener('visibilitychange', () => {
  document.title = document.hidden ? '🥺 vuelve' : realTitle;
});

/* Haptic-like (visual) — iOS no permite vibrate, usamos micro-escala */
function haptic(el){ if(!el) return; el.style.transition='transform .06s'; el.style.transform='scale(.97)'; setTimeout(()=>{el.style.transition='transform .2s cubic-bezier(.175,.885,.32,1.12)';el.style.transform='';},70); }

/* ── Sheet iOS (bottom sheet compartido) ── */
const sheet=document.getElementById('sheet');
const backdrop=document.getElementById('sheetBackdrop');
const sheetTitle=document.getElementById('sheetTitle');
const sheetSub=document.getElementById('sheetSub');

function openSheet(t,s){
  sheetTitle.textContent=t;
  sheetSub.textContent=s;
  backdrop.classList.add('on');
  sheet.classList.add('on');
}
function closeSheet(){ backdrop.classList.remove('on'); sheet.classList.remove('on'); }
backdrop.addEventListener('click', closeSheet);
sheet.addEventListener('click', e=>{ if(e.target===sheet) closeSheet(); });

/* ── Partículas ── */
function burst(x,y,n){
  const g=['💕','✨','🎀','🌸','💖','🌷','💗'];
  for(let i=0;i<n;i++){
    const p=document.createElement('div');
    p.className='pop';
    p.textContent=g[Math.floor(Math.random()*g.length)];
    p.style.left=(x+(Math.random()*60-30))+'px';
    p.style.top=(y+(Math.random()*30-15))+'px';
    document.body.appendChild(p);
    requestAnimationFrame(()=>{
      p.style.transform=`translate(${Math.random()*80-40}px,-${90+Math.random()*70}px) scale(${.6+Math.random()*.6})`;
      p.style.opacity='0';
    });
    setTimeout(()=>p.remove(),1400);
  }
}

/* ── Pétalo suelto ── */
function dropPetal(x,y){
  const p=document.createElement('div');
  p.className='petal';
  p.textContent=['🌸','🌷','💮','✨','🌺'][Math.floor(Math.random()*5)];
  p.style.left=x+'px';
  p.style.top=y+'px';
  document.body.appendChild(p);
  requestAnimationFrame(()=>{
    p.style.transform=`translate(${(Math.random()*70-35)}px,${70+Math.random()*60}px) rotate(${Math.random()*240-120}deg) scale(.7)`;
    p.style.opacity='0';
  });
  setTimeout(()=>p.remove(),1600);
}
