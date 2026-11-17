/* Conducción entre dos acordes consecutivos en modo Dos guitarras.
   El usuario solo cambia de acorde en la rueda; no hay secuenciador ni audio. */
"use strict";
let motionLastChord={...currentChord()};
let motionTransition=null;
function motionUnique(pitches){return [...new Set(pitches)].sort((a,b)=>a-b);}
function motionCommon(from,to){
  const b=new Set(to.pitches);
  return motionUnique(from.pitches).filter(n=>b.has(n));
}
/* Alineamiento ordenado: las voces cercanas cuestan menos que los saltos.
   Permite omitir y agregar notas, porque cada voicing puede tener 2–5 voces. */
function motionAlignment(from,to){
  const a=motionUnique(from.pitches),b=motionUnique(to.pitches);
  const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=1;i<=a.length;i++)dp[i][0]=i*5;
  for(let j=1;j<=b.length;j++)dp[0][j]=j*5;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
    const diff=Math.abs(a[i-1]-b[j-1]);
    const move=diff<=4?diff:4+(diff-4)*1.7;
    dp[i][j]=Math.min(
      dp[i-1][j]+5,
      dp[i][j-1]+5,
      dp[i-1][j-1]+move
    );
  }
  return dp[a.length][b.length];
}
function motionPairCost(from,to){
  const commonBase=motionCommon(from.base,to.base);
  const commonLead=motionCommon(from.lead,to.lead);
  const bassMove=Math.abs(from.base.bassMidi-to.base.bassMidi);
  const topMove=Math.abs(from.lead.topMidi-to.lead.topMidi);
  const fretBase=Math.abs(from.base.minF-to.base.minF);
  const fretLead=Math.abs(from.lead.minF-to.lead.minF);
  const steadyBase=commonBase.length>0;
  const steadyLead=commonLead.length>0;
  const score=
    motionAlignment(from.base,to.base)*1.45+
    motionAlignment(from.lead,to.lead)*1.35+
    bassMove*1.25+topMove*1.6+
    fretBase*.85+fretLead*.75+
    Math.max(0,bassMove-5)*2+
    Math.max(0,topMove-5)*2-
    (commonBase.length+commonLead.length)*7-
    (steadyBase&&topMove>0&&topMove<=4?8:0)-
    (steadyLead&&bassMove>0&&bassMove<=4?4:0)-
    (from.score+to.score)*.045;
  return {score,commonBase,commonLead,bassMove,topMove,fretBase,fretLead};
}
function motionFindBest(first,second,tns){
  const origins=duoPairings(pcOf(first.root),first.qual,tns,28);
  const arrivals=duoPairings(pcOf(second.root),second.qual,tns,28);
  let best=null;
  for(const from of origins)for(const to of arrivals){
    const metric=motionPairCost(from,to);
    if(!best||metric.score<best.metric.score){
      best={from,to,metric};
    }
  }
  return best;
}
function motionSemitones(from,to,rootA,rootB){
  const diff=to-from;
  if(diff===0)return "Se conserva "+duoPitchLabel(to,rootB)+".";
  return duoPitchLabel(from,rootA)+" → "+duoPitchLabel(to,rootB)+
    " ("+Math.abs(diff)+" semitono"+(Math.abs(diff)===1?"":"s")+
    (diff>0?" arriba":" abajo")+").";
}
function motionExplain(selection,first,second){
  const {from,to,metric}=selection;
  const b=metric.commonBase.map(n=>duoPitchLabel(n,second.root));
  const l=metric.commonLead.map(n=>duoPitchLabel(n,second.root));
  const textA=b.length?
    "Guitarra 1: mantiene "+b.join(" y ")+". ":
    "Guitarra 1: cambia las notas. ";
  const textB=l.length?
    "Guitarra 2: mantiene "+l.join(" y ")+". ":
    "Guitarra 2: cambia las notas. ";
  const bass=motionSemitones(from.base.bassMidi,to.base.bassMidi,first.root,second.root);
  const upper=motionSemitones(from.lead.topMidi,to.lead.topMidi,first.root,second.root);
  return '<p class="motion-line"><strong>Notas comunes:</strong> '+textA+textB+'</p>'+
    '<p class="motion-line"><strong>Movimiento del bajo:</strong> '+bass+'</p>'+
    '<p class="motion-line"><strong>Voz superior:</strong> '+upper+'</p>';
}
function motionRender(){
  const panel=document.getElementById("motionPanel");
  const label=document.getElementById("motionLabel");
  const body=document.getElementById("motionBody");
  const visible=instrument==="guitar"&&guitarView==="duo"&&!!motionTransition;
  panel.hidden=!visible;
  if(!visible)return;
  const {from,to}=motionTransition;
  label.textContent=from.name+" → "+to.name;
  if(!panel.open)return; // el cálculo más pesado se ejecuta al expandir
  const best=motionFindBest(from,to,tuning);
  if(!best){
    body.innerHTML='<p class="duo-hint">No hay un enlace válido y cómodo para estos acordes en esta afinación.</p>';
    return;
  }
  const phase=(pair,chord,title)=>{
    return '<section class="motion-phase"><h3>'+title+' · '+chord.name+'</h3>'+
      '<div class="duo-grid">'+duoCard(pair.base,"Guitarra 1",chord)+
      duoCard(pair.lead,"Guitarra 2",chord)+'</div></section>';
  };
  body.innerHTML='<p class="motion-intro">Propuesta conjunta para pasar de un acorde al otro con movimientos cortos.</p>'+
    phase(best.from,from,"Antes")+
    '<div class="motion-direction" aria-hidden="true">↓</div>'+
    phase(best.to,to,"Después")+
    '<div class="motion-analysis">'+motionExplain(best,from,to)+'</div>'+
    '<p class="duo-hint">Las posiciones son sugerencias calculadas; prueba el enlace en el instrumento y ajusta el ritmo y la digitación.</p>';
}
const beforeMotionResults=drawResults;
drawResults=function(){
  if(instrument==="piano"){
    motionLastChord=null;
    motionTransition=null;
  }else{
    const chord={...currentChord()};
    if(motionLastChord&&(chord.root!==motionLastChord.root||
      chord.qual!==motionLastChord.qual)){
      motionTransition={from:motionLastChord,to:chord};
    }
    motionLastChord=chord;
  }
  beforeMotionResults();
  motionRender();
};
document.getElementById("motionPanel").addEventListener("toggle",motionRender);
motionRender();
