/* ══════════════════════════════════════
   AUDIO — carillón de caja de música
   Web Audio API, sin archivos mp3
   ══════════════════════════════════════ */
const AC = window.AudioContext || window.webkitAudioContext;
let ctx=null, master=null;

function ensureAudio(){
  if(!ctx){
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .9;
    const delay = ctx.createDelay(); delay.delayTime.value = .12;
    const fb = ctx.createGain(); fb.gain.value = .16;
    const wet = ctx.createGain(); wet.gain.value = .2;
    master.connect(ctx.destination);
    master.connect(delay); delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(ctx.destination);
  }
  if(ctx.state==='suspended') ctx.resume();
}

function bell(freq,dur=.9,vol=.07,when=0){
  ensureAudio();
  const t = ctx.currentTime + when;
  const o1=ctx.createOscillator(); o1.type='sine'; o1.frequency.value=freq;
  const o2=ctx.createOscillator(); o2.type='sine'; o2.frequency.value=freq*2;
  const o3=ctx.createOscillator(); o3.type='sine'; o3.frequency.value=freq*3.01;
  const g1=ctx.createGain();
  g1.gain.setValueAtTime(0,t);
  g1.gain.linearRampToValueAtTime(vol,t+.006);
  g1.gain.exponentialRampToValueAtTime(vol*.5,t+.1);
  g1.gain.exponentialRampToValueAtTime(.0001,t+dur);
  const g2=ctx.createGain();
  g2.gain.setValueAtTime(0,t);
  g2.gain.linearRampToValueAtTime(vol*.35,t+.005);
  g2.gain.exponentialRampToValueAtTime(.0001,t+dur*.55);
  const g3=ctx.createGain();
  g3.gain.setValueAtTime(0,t);
  g3.gain.linearRampToValueAtTime(vol*.12,t+.004);
  g3.gain.exponentialRampToValueAtTime(.0001,t+dur*.35);
  o1.connect(g1);o2.connect(g2);o3.connect(g3);
  g1.connect(master);g2.connect(master);g3.connect(master);
  o1.start(t);o1.stop(t+dur);o2.start(t);o2.stop(t+dur);o3.start(t);o3.stop(t+dur);
}

function sndUnlock(){ bell(880,.4,.05,0); bell(1108,.4,.05,.09); bell(1318,.6,.06,.18); }
function sndMelody(){
  const n=[[523,.55],[587,.55],[659,.55],[587,.5],[523,.6],[494,.55],[440,.75],[494,.5],[523,.6],[659,.6],[587,.5],[523,.9]];
  let t=0; n.forEach(([f,d])=>{bell(f,d+.4,.055,t);t+=d;});
}
function sndFlip(){ bell(1046,.35,.04,0); bell(1318,.4,.04,.06); }
function sndChime(){ bell(1318,.5,.045,0); bell(1568,.6,.045,.1); }
function sndPop(){ bell(1568,.3,.035,0); bell(1975,.35,.03,.05); }
