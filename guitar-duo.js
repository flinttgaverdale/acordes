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
      if(count>5)return;
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
function duoPairings(rootPc,quality,tns){
  const {wanted,shapes}=duoCandidates(rootPc,quality,tns);
  const all=(1<<wanted.length)-1;
  function shortlist(items,score,limit){
    return [[0,2],[3,5],[6,9],[10,16]].flatMap(([a,b])=>
      items.filter(s=>s.minF>=a&&s.minF<=b).sort((x,y)=>score(y)-score(x)).slice(0,limit));
  }
  const bases=shortlist(shapes.filter(s=>s.stringCount>=3&&s.bassMidi<=59),
    s=>s.score+(s.rootBass?19:0)+(s.bassMidi<=45?9:0)+s.pcs.length*5
      -s.maxF*.9-s.duplicates*4,22);
  const leads=shortlist(shapes.filter(s=>s.stringCount<=4&&s.topMidi>=62),
    s=>s.score+Math.min(20,Math.max(0,s.avgMidi-58))*.9
      +(s.stringCount===3?4:0)-s.duplicates*4,24);
  const ranked=[];
  for(const base of bases)for(const lead of leads){
    if(base===lead||(base.mask|lead.mask)!==all)continue;
    const delta=lead.avgMidi-base.avgMidi;
    if(delta<4)continue;
    const shared=lead.pitches.filter(p=>base.pitches.includes(p)).length;
    const missing=lead.pcs.filter(pc=>!base.pcs.includes(pc)).length;
    const span=Math.max(base.topMidi,lead.topMidi)-base.bassMidi;
    const score=base.score*.55+lead.score*.4
      +(base.rootBass?23:0)+(base.bassMidi<=45?10:0)
      +base.pcs.length*5+missing*7
      +Math.min(20,delta)*1.25+Math.min(36,span)*.3
      -shared*7-base.duplicates*6-lead.duplicates*4
      -(lead.bassMidi<base.topMidi-7?6:0)
      -(lead.topMidi<base.topMidi?12:0)
      -base.maxF*1.3-(base.maxF>=10?6:0)
      -(lead.maxF>=13?4:0);
    ranked.push({base,lead,score});
  }
  ranked.sort((a,b)=>b.score-a.score);
  const picked=[];
  for(const pair of ranked){
    if(picked.some(p=>p.base.frets.join(",")===pair.base.frets.join(",")
      ||p.lead.frets.join(",")===pair.lead.frets.join(",")))continue;
    if(picked.some(p=>Math.abs(p.base.minF-pair.base.minF)<2
      &&Math.abs(p.lead.minF-pair.lead.minF)<2))continue;
    picked.push(pair);
    if(picked.length===3)break;
  }
  return picked;
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
  return '<article class="shape"><div class="head"><span class="cname">'+role+'</span>'+
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
  if(!duo){guitarAndPianoDrawResults();return;}
  const c=currentChord(),pairs=duoPairings(pcOf(c.root),c.qual,tuning);
  document.getElementById("resultKind").textContent="Dos guitarras · ";
  document.getElementById("chosenChord").textContent=c.name;
  document.getElementById("notesLine").textContent=
    QUALITIES[c.qual].int.map(i=>spell(mod12(pcOf(c.root)+i),c.root.includes("b"))).join(" · ");
  document.getElementById("count").textContent=pairs.length+" combinaci"+(pairs.length===1?"ón":"ones");
  pairsEl.innerHTML=pairs.length?pairs.map((p,i)=>{
    const distinct=p.lead.pitches.filter(m=>!p.base.pitches.includes(m));
    const upper=[...new Set(distinct)].filter(m=>m>p.base.topMidi);
    const label=upper.length?"La segunda amplía el registro agudo.":"La segunda aporta otra distribución de voces.";
    return '<section class="duo-pair"><div class="duo-heading">'+
      '<strong>Combinación '+(i+1)+'</strong><span>Base + complemento</span></div>'+
      '<div class="duo-grid">'+duoCard(p.base,"Guitarra 1 · Base",c)+
      duoCard(p.lead,"Guitarra 2 · Voz superior",c)+'</div>'+
      '<p class="duo-hint">'+label+' Juntas completan '+c.name+'.</p></section>';
  }).join(""):'<div id="empty">No hay una pareja completa y cómoda. Prueba otra afinación o una sola guitarra.</div>';
};
document.getElementById("soloView").addEventListener("click",()=>{
  guitarView="solo";drawResults();
});
document.getElementById("duoView").addEventListener("click",()=>{
  guitarView="duo";drawResults();
});
drawResults();
