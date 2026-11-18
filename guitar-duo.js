/* Acordes · dos guitarras. Afinaciones de 6.ª a 1.ª.
   Cada pareja cubre el acorde completo sin añadir alturas ajenas.
   En CGDGGD las cuerdas 3 y 2 son G3 (unísono), no dos octavas. */
"use strict";
const DUO_OPEN_MIDI={
  standard:[40,45,50,55,59,64],
  openD:[38,45,50,54,57,62],
  dadgad:[38,45,50,55,57,62],
  cgdggd:[36,43,50,55,55,62]
};
let guitarView="duo";

/* Open D — Jeffrey Kunde / Ian McIntosh, Progressions: Alternate Tunings.
   PDF pp. 7–10. Transcripciones contrastadas contra D A D F# A D.
   Algunas formas del libro son parciales: no se tratan como triadas completas. */
const OPEN_D_REFERENCE={
 "2:maj":[[0,0,0,0,0,0],[0,0,4,3,5,0]],
 "7:maj":[[0,2,0,1,2,0],[5,5,5,5,5,5],[-1,10,9,8,-1,0]],
 "9:maj":[[7,7,7,7,7,7]],
 "11:min":[[-1,-1,0,0,2,0],[-1,-1,4,5,5,4],[-1,-1,9,8,9,9]],
 "4:min":[[-1,-1,2,1,2,2],[-1,-1,5,5,7,5],[-1,7,5,5,7,-1],[-1,-1,9,10,10,9]],
 "6:min":[[-1,-1,4,3,4,4],[-1,-1,7,7,9,7],[-1,9,7,7,9,-1],[-1,-1,11,12,12,11]]
};
/* Adaptaciones sin las notas duplicadas más graves, para que la segunda guitarra
   aporte color. El cifrado describe las notas tocadas, no el acorde seleccionado. */
const OPEN_D_COLORS={
 "2:maj":[
  {f:[-1,-1,2,0,0,0],name:"D(add9)",pcs:[2,4,6,9],page:10,tip:"Mi como novena, sin duplicar el bajo."},
  {f:[-1,-1,7,8,7,0],name:"D(sus2)",pcs:[2,4,9],page:10,tip:"Segunda suspendida y voces superiores abiertas."},
  {f:[-1,-1,0,3,0,0],name:"D5",pcs:[2,9],page:8,tip:"Quinta abierta; la guitarra principal conserva la tercera."}
 ],
 "7:maj":[
  {f:[-1,2,-1,1,0,0],name:"G(add9)/B",pcs:[2,7,9,11],page:8,tip:"La novena La resuena al aire."},
  {f:[-1,-1,5,5,0,0],name:"G(add9)",pcs:[2,7,9,11],page:8,tip:"Registro medio y dos cuerdas al aire."}
 ],
 "9:maj":[
  {f:[-1,-1,2,3,0,0],name:"Asus4",pcs:[2,4,9],page:8,tip:"El Re suspendido contrasta con el Do# de la guitarra base."},
  {f:[-1,7,7,7,0,0],name:"A(add11)/E",pcs:[1,2,4,9],page:8,tip:"A mayor con Re al aire como cuarta añadida."}
 ],
 "11:min":[
  {f:[-1,2,-1,0,0,0],name:"Bm7",pcs:[2,6,9,11],page:8,tip:"La séptima La amplía el Si menor."}
 ],
 "4:min":[
  {f:[-1,2,2,1,0,0],name:"Em7(add11)/B",pcs:[2,4,7,9,11],page:10,tip:"La y Re al aire sobre Mi menor."},
  {f:[-1,2,2,1,2,0],name:"Em7/B",pcs:[2,4,7,11],page:10,tip:"Séptima menor abierta, con la tercera Sol."}
 ],
 "6:min":[
  {f:[-1,4,4,3,0,0],name:"F#m(add♭6)/C#",pcs:[1,2,6,9],page:10,tip:"El Re al aire aporta una sexta menor."}
 ]
};
function openDShape(f,wanted,extras={}){
 const pitches=f.flatMap((n,i)=>n<0?[]:[DUO_OPEN_MIDI.openD[i]+n]).sort((a,b)=>a-b);
 const pcs=[...new Set(pitches.map(mod12))].sort((a,b)=>a-b);
 const required=(extras.expected||wanted).slice().sort((a,b)=>a-b);
 if(!pitches.length||pcs.join(",")!==required.join(","))return null;
 const pressed=f.filter(n=>n>0),lo=pressed.length?Math.min(...pressed):0,hi=pressed.length?Math.max(...pressed):0;
 const grip=describeGrip(f);if(grip.fingers>4||hi-lo>4)return null;
 const duplicates=pitches.length-new Set(pitches).size;
 return {frets:f.slice(),pitches,pcs,mask:wanted.reduce((m,n,i)=>m|(pcs.includes(n)?1<<i:0),0),
  score:pitches.length*3+f.filter(n=>n===0).length*2+pcs.length*4-grip.fingers*3-hi*.65-duplicates*7,
  stringCount:pitches.length,openCount:f.filter(n=>n===0).length,
  bassMidi:pitches[0],topMidi:pitches[pitches.length-1],avgMidi:pitches.reduce((a,b)=>a+b,0)/pitches.length,
  bassPc:mod12(pitches[0]),rootBass:mod12(pitches[0])===extras.rootPc,duplicates,
  minF:lo,maxF:hi,...extras};
}
function openDStandards(rootPc,qual,tns,wanted){
 if(duoTuningKey(tns)!=="openD")return [];
 return (OPEN_D_REFERENCE[rootPc+":"+qual]||[])
  .map(f=>openDShape(f,wanted,{rootPc})).filter(Boolean)
  .filter(s=>s.mask===(1<<wanted.length)-1);
}
function openDColors(rootPc,qual,tns,wanted){
 if(duoTuningKey(tns)!=="openD")return [];
 return (OPEN_D_COLORS[rootPc+":"+qual]||[])
   .map(o=>openDShape(o.f,wanted,{rootPc,expected:o.pcs,bookName:o.name,
     bookPage:o.page,bookTip:o.tip})).filter(Boolean);
}
/* En modo solista conservamos cuatro zonas, priorizando los ejemplos válidos. */
const standardPickBest=pickBest;
pickBest=function(shapes){
 const c=currentChord(),rootPc=pcOf(c.root);
 if(duoTuningKey(tuning)!=="openD")return standardPickBest(shapes);
 const wanted=[...new Set(QUALITIES[c.qual].int.map(n=>mod12(rootPc+n)))];
 const book=openDStandards(rootPc,c.qual,tuning,wanted);
 if(!book.length)return standardPickBest(shapes);
 const normal=standardPickBest(shapes),chosen=[];
 const different=s=>!chosen.some(x=>x.frets.join(",")===s.frets.join(","));
 for(const [lo,hi] of [[0,2],[3,5],[6,9],[10,16]]){
  const s=book.find(v=>v.minF>=lo&&v.minF<=hi&&different(v))||
    normal.find(v=>v.minF>=lo&&v.minF<=hi&&different(v));
  if(s)chosen.push(s);
 }
 for(const s of book.concat(normal))if(chosen.length<4&&different(s))chosen.push(s);
 return chosen.slice(0,4).sort((a,b)=>a.minF-b.minF);
};

function duoPitchLabel(midi,root){
  return spell(mod12(midi),root.includes("b"))+(Math.floor(midi/12)-1);
}
function duoCandidates(rootPc,quality,tns){
  const wanted=[...new Set(QUALITIES[quality].int.map(i=>mod12(rootPc+i)))];
  const openKey=Object.keys(TUNINGS).find(k=>TUNINGS[k].notes.every((n,i)=>n===tns[i]));
  if(!openKey)return {wanted,shapes:[]};
  const bases=DUO_OPEN_MIDI[openKey],parts=tns.map(pcOf),shapes=new Map();
  for(let start=1;start<=13;start++){
    const opts=parts.map(p=>{
      const values=[-1];
      if(wanted.includes(p))values.push(0); // bordones, también con acordes agudos
      for(let fret=start;fret<=Math.min(start+3,16);fret++){
        if(wanted.includes(mod12(p+fret)))values.push(fret);
      }
      return values;
    });
    const frets=Array(6).fill(-1);
    function visit(i,mask,count,started,ended){
      if(count>6)return;
      if(i===6){
        if(count<2||mask.toString(2).replace(/0/g,"").length<2)return;
        const pressed=frets.filter(f=>f>0);
        const lo=pressed.length?Math.min(...pressed):0;
        const hi=pressed.length?Math.max(...pressed):0;
        if(hi-lo>3)return;
        const grip=describeGrip(frets);
        if(grip.fingers>4)return;
        const pitches=frets.flatMap((f,j)=>f<0?[]:[bases[j]+f]).sort((a,b)=>a-b);
        const duplicates=pitches.length-new Set(pitches).size;
        const pcs=[...new Set(pitches.map(mod12))];
        const bassMidi=pitches[0],topMidi=pitches[pitches.length-1];
        const rootBass=mod12(bassMidi)===rootPc;
        const openCount=frets.filter(f=>f===0).length;
        const score=count*3+openCount*2+pcs.length*4
          -grip.fingers*3-(hi-lo)*2-hi*.65
          -grip.changes*.8-grip.barres.length
          -duplicates*7;
        const sig=frets.join(",");
        if(!shapes.has(sig))shapes.set(sig,{
          frets:frets.slice(),pitches,pcs,mask,score,rootBass,
          bassMidi,topMidi,avgMidi:pitches.reduce((a,b)=>a+b,0)/pitches.length,
          minF:lo,maxF:hi,stringCount:count,openCount,duplicates
        });
        return;
      }
      for(const fret of opts[i]){
        if(fret>=0&&ended)continue;
        frets[i]=fret;
        if(fret<0)visit(i+1,mask,count,started,started||ended);
        else visit(i+1,mask|(1<<wanted.indexOf(mod12(parts[i]+fret))),count+1,true,false);
      }
    }
    visit(0,0,0,false,false);
  }
  return {wanted,shapes:[...shapes.values()]};
}

/* Un arreglo empieza por una base completa y reconocible, no una raíz recortada.
   Las digitaciones conocidas se validan por las notas efectivas. */
const DUO_FAMILIAR={
 standard:{"0:maj":[-1,3,2,0,1,0],"7:maj":[3,2,0,0,0,3],"2:maj":[-1,-1,0,2,3,2],
 "9:maj":[-1,0,2,2,2,0],"4:maj":[0,2,2,1,0,0],"5:maj":[1,3,3,2,1,1],
 "9:min":[-1,0,2,2,1,0],"4:min":[0,2,2,0,0,0],"2:min":[-1,-1,0,2,3,1],
 "11:min":[-1,2,4,4,3,2],"0:maj7":[-1,3,2,0,0,0],
 "9:m7":[-1,0,2,0,1,0],"7:7":[3,2,0,0,0,1],"2:7":[-1,-1,0,2,1,2]},
 cgdggd:{"0:maj":[0,0,2,0,0,2],"7:maj":[-1,0,0,0,4,0],
 "2:maj":[2,2,0,2,2,4],"9:min":[-1,2,2,2,5,2],
 "0:maj7":[0,0,2,0,4,2],"2:min":[2,2,0,2,2,3],
 "9:m7":[-1,2,2,0,5,2]}
};
function duoTuningKey(tns){
 return Object.keys(TUNINGS).find(k=>TUNINGS[k].notes.every((n,i)=>n===tns[i]));
}
function duoBaseScore(s){
 return s.score*.65+(s.rootBass?48:0)+(s.stringCount>=5?16:0)+s.stringCount*4
 +s.openCount*4+(s.maxF<=5?22:0)-s.maxF*2.3
 -(s.bassMidi>=53?13:0)-s.duplicates*2;
}
function duoPickBase(rootPc,quality,tns,all){
 const complete=(1<<all.wanted.length)-1;
 const valid=all.shapes.filter(s=>s.mask===complete&&s.bassMidi<=59);
 const enough=valid.filter(s=>s.stringCount>=4);
 const pool=enough.length?enough:valid.filter(s=>s.stringCount>=3);
 if(!pool.length)return null;
 const fromBook=openDStandards(rootPc,quality,tns,all.wanted);
 for(const source of fromBook){
  const match=pool.find(v=>v.frets.join(",")===source.frets.join(","));
  if(match)return match;
 }
 const target=DUO_FAMILIAR[duoTuningKey(tns)]?.[rootPc+":"+quality];
 if(target){
  const exact=pool.find(s=>s.frets.every((f,i)=>f===target[i]));
  if(exact)return exact;
 }
 return pool.slice().sort((a,b)=>duoBaseScore(b)-duoBaseScore(a))[0];
}
function duoLeadScore(base,lead,wanted){
 const shared=lead.pitches.filter(p=>base.pitches.includes(p)).length;
 const upper=lead.pitches.filter(n=>n>base.topMidi).length;
 const avgDelta=lead.avgMidi-base.avgMidi;
 const openUpper=lead.frets.slice(3).filter(f=>f===0).length;
 return lead.score*.58+lead.stringCount*5+(lead.stringCount>=3?13:0)
 +lead.pcs.length*6+(lead.pcs.length===wanted.length?9:0)
 +openUpper*7
 +Math.min(18,Math.max(0,avgDelta))*1.15
 +Math.min(3,upper)*5
 -shared*9-lead.duplicates*9
 -Math.max(0,53-lead.bassMidi)*1.5
 -Math.max(0,lead.maxF-9)*3
 -(lead.topMidi<=base.topMidi?14:0);
}
function duoLeadStyle(base,lead,wanted){
 if(lead.openCount>0&&lead.frets.slice(3).includes(0))return "Resonancia al aire";
 if(lead.pcs.length===wanted.length&&!lead.rootBass)return "Inversión completa";
 if(lead.topMidi>=base.topMidi+5)return "Registro superior";
 if(lead.pcs.length===wanted.length)return "Acorde completo";
 return "Voces de apoyo";
}
function duoPairings(rootPc,quality,tns,maxPairs=3){
 const all=duoCandidates(rootPc,quality,tns);
 const base=duoPickBase(rootPc,quality,tns,all);
 if(!base)return [];
 let leads=all.shapes.filter(s=>s!==base&&s.stringCount>=3&&s.stringCount<=4
   &&s.topMidi>=60&&s.avgMidi>=base.avgMidi+4
   &&s.bassMidi>=50&&s.topMidi>=base.topMidi-2);
 if(!leads.length)leads=all.shapes.filter(s=>s!==base&&s.stringCount>=2&&s.stringCount<=4&&s.bassMidi>=50);
 // En Open D priorizamos posiciones accesibles antes que saltos al traste 15.
 if(duoTuningKey(tns)==="openD"){
   const reachable=leads.filter(s=>s.maxF<=12);
   if(reachable.length>=3)leads=reachable;
 }
 const books=openDColors(rootPc,quality,tns,all.wanted);
 const scored=books.map((lead,i)=>({base,lead,
   score:duoLeadScore(base,lead,all.wanted)+90-i*4,style:"Color · "+lead.bookName}))
  .concat(leads.map(lead=>({base,lead,score:duoLeadScore(base,lead,all.wanted),
    style:duoLeadStyle(base,lead,all.wanted)})))
  .sort((a,b)=>b.score-a.score);
 const selected=[],styles=new Set();
 if(maxPairs<=3){
  for(let pass=0;pass<2;pass++)for(const pair of scored){
   if(selected.some(p=>p.lead.frets.join(",")===pair.lead.frets.join(",")))continue;
   if(pass===0&&styles.has(pair.style))continue;
   if(selected.some(p=>{
    const diff=p.lead.frets.filter((f,i)=>f!==pair.lead.frets[i]).length;
    return diff<2&&Math.abs(p.lead.topMidi-pair.lead.topMidi)<3&&
      !(p.lead.bookName&&pair.lead.bookName&&p.lead.bookName!==pair.lead.bookName);
   }))continue;
   selected.push(pair);styles.add(pair.style);
   if(selected.length===maxPairs)return selected;
  }
 }else{
  // La conducción mantiene la misma base: solo decide cómo mover la otra guitarra.
  const zones=new Map();
  for(const pair of scored){
   const zone=Math.floor(pair.lead.minF/3);
   if((zones.get(zone)||0)>=Math.ceil(maxPairs/3))continue;
   selected.push(pair);zones.set(zone,(zones.get(zone)||0)+1);
   if(selected.length===maxPairs)break;
  }
 }
 return selected;
}
/* UI: modo solista existente intacto, modo dúo separado de Piano. */
function duoPositionText(s){
  const positive=s.frets.filter(f=>f>0);
  if(!positive.length)return "al aire";
  const min=Math.min(...positive),max=Math.max(...positive);
  return min===max?"traste "+min:"trastes "+min+"–"+max;
}
function duoCard(s,role,chord){
  const notes=[...new Set(s.pitches)].map(n=>duoPitchLabel(n,chord.root)).join(" · ");
  const tab=s.frets.map(f=>f<0?"×":f).join(" · ");
  const roleName=s.bookName?role+" · "+s.bookName:role;
  return '<article class="shape"><div class="head"><span class="cname">'+roleName+'</span>'+
    '<span class="pos">'+duoPositionText(s)+'</span></div>'+
    '<div class="diagwrap">'+svgDiagram(s,tuning)+'</div>'+
    '<div class="duo-notes">'+notes+'</div>'+
    '<div class="duo-frets" aria-label="Trastes de sexta a primera">'+tab+'</div></article>';
}
const guitarAndPianoDrawResults=drawResults;
drawResults=function(){
  const switcher=document.getElementById("duoSwitch");
  const pairsEl=document.getElementById("duoPairs");
  const soloEl=document.getElementById("shapes");
  if(instrument==="piano"){
    switcher.hidden=true;pairsEl.hidden=true;soloEl.hidden=false;
    guitarAndPianoDrawResults();
    return;
  }
  const duo=guitarView==="duo";
  switcher.hidden=false;
  document.getElementById("soloView").classList.toggle("on",!duo);
  document.getElementById("duoView").classList.toggle("on",duo);
  document.getElementById("soloView").setAttribute("aria-pressed",String(!duo));
  document.getElementById("duoView").setAttribute("aria-pressed",String(duo));
  pairsEl.hidden=!duo;soloEl.hidden=duo;
  if(!duo){
    document.getElementById("resultKind").textContent="Posiciones de ";
    guitarAndPianoDrawResults();
    return;
  }
  const c=currentChord(),pairs=duoPairings(pcOf(c.root),c.qual,tuning);
  document.getElementById("resultKind").textContent="Dos guitarras · ";
  document.getElementById("chosenChord").textContent=c.name;
  document.getElementById("notesLine").textContent=
    QUALITIES[c.qual].int.map(i=>spell(mod12(pcOf(c.root)+i),c.root.includes("b"))).join(" · ");
  document.getElementById("count").textContent=pairs.length+" alternativa"+(pairs.length===1?"":"s");

  if(!pairs.length){
    pairsEl.innerHTML='<div id="empty">No se ha encontrado una base completa y acompañamientos cómodos en esta afinación.</div>';
    return;
  }
  const base=pairs[0].base;
  const captions={
    "Resonancia al aire":"Una cuerda abierta añade profundidad y prolonga la resonancia.",
    "Inversión completa":"Otra disposición del acorde, con una nota diferente en el bajo de esta guitarra.",
    "Registro superior":"Lleva las voces hacia los agudos para ampliar el conjunto.",
    "Acorde completo":"Otra posición completa en un registro complementario.",
    "Voces de apoyo":"Refuerza algunas notas: la guitarra base conserva el acorde entero."
  };
  pairsEl.innerHTML='<div class="duo-main">'+
    '<div class="duo-part-title"><strong>Guitarra 1 · Base</strong><span>Acorde completo</span></div>'+
    '<div class="duo-main-card">'+duoCard(base,"Posición habitual",c)+'</div>'+
    '<p class="duo-hint">Posición principal, sin retirar ninguna nota del acorde.</p>'+
    '</div>'+
    '<div class="duo-options-title"><strong>Guitarra 2 · Acompañamiento</strong>'+
      '<span>Elige otra sonoridad</span></div>'+
    '<div class="duo-alternatives">'+pairs.map((p,i)=>{
      return '<div class="duo-alt"><div class="duo-alt-head">'+
        '<strong>'+(i+1)+'. '+p.style+'</strong></div>'+
        duoCard(p.lead,"Acompañamiento",c)+
        '<p class="duo-hint">'+(p.lead.bookTip||captions[p.style]||"Otra voz complementaria.")+'</p>'+
        (p.lead.bookPage?'<p class="duo-source">Open D · PDF pág. '+p.lead.bookPage+' · adaptación</p>':'')+'</div>';
    }).join("")+'</div>';

};
document.getElementById("soloView").addEventListener("click",()=>{
  guitarView="solo";drawResults();
});
document.getElementById("duoView").addEventListener("click",()=>{
  guitarView="duo";drawResults();
});
drawResults();
