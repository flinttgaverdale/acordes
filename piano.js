/* Piano: inversiones estrictas para tríadas y séptimas;
   voicings útiles y omisiones explícitas para extensiones y jazz. */
"use strict";
let instrument="guitar";
let savedPianoSelection=null;
const GUITAR_QUALITIES=["maj","min","7","maj7","m7","dim","sus2","sus4","m7b5"];
const PIANO_EXTRA_GROUPS=[
 {label:"Extensiones",options:[["add9","add9"],["9","9"],["maj9","maj9"],["m9","m9"],["11","11"],["maj11","maj11"],["m11","m11"],["13","13"],["maj13","maj13"],["m13","m13"]]},
 {label:"Jazz y alterados",options:[["6/9","6/9"],["m6/9","m6/9"],["9sus4","9sus4"],["7b9","7♭9"],["7#9","7♯9"],["7#11","7♯11"],["maj7#11","maj7♯11"],["7b13","7♭13"],["7b5","7♭5"],["7#5","7♯5"],["mM7","m(maj7)"],["dim7","dim7"]]}
];
const PIANO_DEFINITIONS={
 "add9":[0,4,7,14],
 "9":[0,4,7,10,14], "maj9":[0,4,7,11,14],"m9":[0,3,7,10,14],
 "11":[0,4,7,10,14,17],"maj11":[0,4,7,11,14,17],"m11":[0,3,7,10,14,17],
 "13":[0,4,7,10,14,17,21],"maj13":[0,4,7,11,14,17,21],"m13":[0,3,7,10,14,17,21],
 "6/9":[0,4,7,9,14],"m6/9":[0,3,7,9,14],
 "9sus4":[0,5,7,10,14],
 "7b9":[0,4,7,10,13],"7#9":[0,4,7,10,15],"7#11":[0,4,7,10,18],
 "maj7#11":[0,4,7,11,18],"7b13":[0,4,7,10,20],
 "7b5":[0,4,6,10],"7#5":[0,4,8,10]
};
const PIANO_CORE={
 "add9":[4,7,14], "9":[4,10,14],"maj9":[4,11,14],"m9":[3,10,14],
 "11":[10,14,17],"maj11":[11,14,17],"m11":[3,10,14,17],
 "13":[4,10,14,21],"maj13":[4,11,14,21],"m13":[3,10,14,21],
 "6/9":[4,9,14],"m6/9":[3,9,14],"9sus4":[5,10,14],
 "7b9":[4,10,13],"7#9":[4,10,15],"7#11":[4,10,18],
 "maj7#11":[4,11,18],"7b13":[4,10,20]
};
const PIANO_ENHARMONIC={
 "7b5":[0,4,6,10], "7#5":[0,4,8,10]
};
Object.keys(PIANO_DEFINITIONS).forEach(key=>{
  QUALITIES[key]={name:key,int:PIANO_DEFINITIONS[key].slice()};
  SUFFIX[key]=key;
});
function pianoIntervals(qual){
  return PIANO_DEFINITIONS[qual] || QUALITIES[qual].int.slice().map((v,i)=>{
    if(v===2&&i>=3)return 14;
    return v;
  });
}
function pianoDegree(interval,qual){
  if(qual==="dim7"&&interval===9)return 6;
  if(interval===0)return 0;
  if([1,2,13,14,15].includes(interval))return 1;
  if([3,4].includes(interval))return 2;
  if([5,17,18].includes(interval))return 3;
  if([6,7,8].includes(interval))return 4;
  if([9,20,21].includes(interval))return 5;
  if([10,11].includes(interval))return 6;
  return 0;
}
function pianoNoteSpelling(root,interval,qual){
  const rootLetter=LETTERS.indexOf(root[0]);
  const letter=LETTERS[(rootLetter+pianoDegree(interval,qual))%7];
  const target=mod12(PC[root]+interval),natural=NATURAL[letter];
  const d=mod12(target-natural);
  const accidental={0:"",1:"#",2:"##",10:"bb",11:"b"}[d];
  return letter+(accidental===undefined?"":accidental);
}
function pianoChordNames(chord){
  const list=pianoIntervals(chord.qual),map=new Map();
  list.forEach(int=>map.set(mod12(PC[chord.root]+int),pianoNoteSpelling(chord.root,int,chord.qual)));
  return map;
}
function pianoName(midi,map){
  const pc=mod12(midi),name=map.get(pc)||spell(pc,false);
  return name+(Math.floor(midi/12)-1);
}
function pianoVoicings(chord){
  const intervals=pianoIntervals(chord.qual),rootPc=PC[chord.root];
  const lowRoot=48+rootPc,highRoot=60+rootPc;
  const chordPcs=[...new Set(intervals.map(x=>mod12(rootPc+x)))];
  const extended=Object.prototype.hasOwnProperty.call(PIANO_CORE,chord.qual);
  if(!extended){
    const ints=[...new Set(intervals.map(x=>mod12(x)))].sort((a,b)=>a-b);
    return ints.map((_,i)=>{
      const rotated=ints.slice(i).concat(ints.slice(0,i).map(x=>x+12));
      const notes=rotated.map(x=>highRoot+x);
      return {
        title:["Fundamental","1.ª inversión","2.ª inversión","3.ª inversión"][i]||("Inversión "+i),
        bass:notes[0],left:[],right:notes,omitted:[],kind:"inversion"
      };
    });
  }
  const core=PIANO_CORE[chord.qual];
  const pitchClass=(x)=>mod12(rootPc+x);
  const sorted=[...new Set(core.map(pitchClass))].sort((a,b)=>a-b);
  function rightKeys(rotate){
    const order=sorted.slice(rotate).concat(sorted.slice(0,rotate).map(x=>x+12));
    let previous=-Infinity;
    return order.map(pc=>{
      let n=60+pc;
      while(n<=previous)n+=12;
      previous=n;
      return n;
    });
  }
  // Mano derecha compacta: los intervalos pueden reorganizarse dentro de una octava.
  // Rotar notas produce otras disposiciones, pero no se etiquetan como inversiones del acorde.
  const shell=core.find(x=>[10,11,9].includes(x)) ?? core[1];
  const shellMidi=lowRoot+shell;
  const leftRoot=[lowRoot];
  let variants=[
    {title:"Cerrado",left:leftRoot,right:rightKeys(0)},
    {title:"Abierto",left:leftRoot,right:rightKeys(1)},
    {title:"Bajo con 7.ª / 6.ª",left:[lowRoot,shellMidi],right:rightKeys(2).filter(n=>mod12(n)!==pitchClass(shell))}
  ];
  if(core.includes(3)||core.includes(4)){
    const third=core.find(x=>x===3||x===4);
    const thirdMidi=lowRoot+third;
    const lhShell=[thirdMidi,shellMidi].sort((a,b)=>a-b);
    const rh=core.filter(x=>x!==third&&x!==shell);
    const pcs=[...new Set(rh.map(pitchClass))].sort((a,b)=>a-b);
    let right=pcs.map(pc=>60+pc);
    while(right.length&&Math.min(...right)<=Math.max(...lhShell))right=right.map(n=>n+12);
    variants.push({title:"Sin fundamental · con bajista",left:lhShell,right});
  }else{
    variants.push({title:"Otra disposición",left:leftRoot,right:rightKeys(2)});
  }
  variants=variants.map(v=>{
    let right=v.right.slice();
    while(right.length&&Math.min(...right)<=Math.max(...v.left))right=right.map(n=>n+12);
    return {...v,right};
  });
  return variants.map(v=>{
    const present=new Set(v.left.concat(v.right).map(mod12));
    const omitted=intervals.filter(x=>!present.has(mod12(rootPc+x))).map(x=>pianoNoteSpelling(chord.root,x,chord.qual));
    return {...v,bass:Math.min(...v.left.concat(v.right)),omitted,kind:"voicing"};
  });
}
function pianoSvg(voice,names){
  const selected=new Map();
  voice.left.forEach(n=>selected.set(n,"left"));
  voice.right.forEach(n=>selected.set(n,"right"));
  const notes=[...selected.keys()];
  const lo=Math.floor(Math.min(...notes)/12)*12;
  const hi=Math.ceil((Math.max(...notes)+1)/12)*12-1;
  const whitePcs=[0,2,4,5,7,9,11],blackPcs=[1,3,6,8,10];
  const all=Array.from({length:hi-lo+1},(_,i)=>lo+i);
  const whites=all.filter(n=>whitePcs.includes(mod12(n)));
  const w=22,h=111,blackW=14,blackH=67;
  const xWhite=new Map(whites.map((n,i)=>[n,i*w]));
  let svg='<svg class="piano-svg" viewBox="0 0 '+(whites.length*w)+' '+h+'" role="img" aria-label="Teclado con notas '+notes.map(n=>pianoName(n,names)).join(", ")+'">';
  whites.forEach(n=>{
    const kind=selected.get(n),x=xWhite.get(n);
    const fill=kind==="left"?"#79aac5":kind==="right"?"#dfba7b":"#edece7";
    svg+='<rect x="'+(x+.5)+'" y="1" width="'+(w-1)+'" height="108" rx="2.5" fill="'+fill+'" stroke="#313b3d" stroke-width="1.3"/>';
    if(kind)svg+='<text x="'+(x+w/2)+'" y="99" fill="#1c2326" font-size="9" text-anchor="middle" font-weight="700">'+names.get(mod12(n))+'</text>';
  });
  all.filter(n=>blackPcs.includes(mod12(n))).forEach(n=>{
    const prev=n-1,pos=xWhite.get(prev);
    if(pos===undefined)return;
    const x=pos+w-blackW/2;
    const kind=selected.get(n);
    const fill=kind==="left"?"#518aa9":kind==="right"?"#c69b55":"#182125";
    svg+='<rect x="'+x+'" y="1" width="'+blackW+'" height="'+blackH+'" rx="2.6" fill="'+fill+'" stroke="#121819" stroke-width="1.5"/>';
    if(kind)svg+='<circle cx="'+(x+blackW/2)+'" cy="56" r="3.5" fill="#f3ede0"/>';
  });
  return svg+'</svg>';
}
function renderPiano(){
  const c=currentChord();
  const voices=pianoVoicings(c),names=pianoChordNames(c);
  const isInversions=voices[0]&&voices[0].kind==="inversion";
  document.getElementById("resultKind").textContent=isInversions?"Inversiones de ":"Voicings de ";
  document.getElementById("chosenChord").textContent=c.name;
  document.getElementById("notesLine").textContent=pianoIntervals(c.qual).map(x=>pianoNoteSpelling(c.root,x,c.qual)).join(" · ");
  document.getElementById("count").textContent=voices.length+" "+(isInversions?"posiciones":"voicings");
  document.getElementById("shapes").innerHTML=voices.map((v,i)=>{
    const left=v.left.map(n=>pianoName(n,names)).join(" · ");
    const right=v.right.map(n=>pianoName(n,names)).join(" · ");
    const bass=pianoName(v.bass,names);
    const notes=v.left.length?'<div class="piano-hand"><b>Izquierda</b> '+left+'</div><div class="piano-hand"><b>Derecha</b> '+right+'</div>':
      '<div class="piano-hand">Teclas: '+right+'</div>';
    const omitted=v.omitted.length?'<div class="piano-omitted">Omitidas en esta disposición: '+v.omitted.join(" · ")+'</div>':"";
    return '<article class="shape piano-card"><div class="head"><span class="cname">'+(i+1)+'. '+v.title+'</span><span class="pos">Bajo: '+bass+'</span></div>'+
      '<div class="piano-keyboard">'+pianoSvg(v,names)+'</div>'+notes+omitted+'</article>';
  }).join("");
}
function fillPianoQualities(){
  const select=document.getElementById("quality");
  const prev=select.value;
  select.innerHTML="";
  const simple=document.createElement("optgroup");simple.label="Básicos";
  GUITAR_QUALITIES.concat(["dim7","mM7","6","m6","aug"]).forEach(key=>{
    if(!QUALITIES[key])return;
    const o=document.createElement("option");o.value=key;o.textContent=key==="maj"?"Mayor":key==="min"?"Menor":key==="mM7"?"m(maj7)":key;
    simple.appendChild(o);
  });
  select.appendChild(simple);
  if(instrument==="piano"){
    PIANO_EXTRA_GROUPS.forEach(group=>{
      const optgroup=document.createElement("optgroup");optgroup.label=group.label;
      group.options.forEach(([key,label])=>{
        const o=document.createElement("option");o.value=key;o.textContent=label;optgroup.appendChild(o);
      });
      select.appendChild(optgroup);
    });
  }
  if([...select.options].some(o=>o.value===prev))select.value=prev;
}
const guitarResults=drawResults;
drawResults=function(){
  if(instrument==="piano")renderPiano();
  else guitarResults();
};
const guitarChords=drawChords;
drawChords=function(){
  guitarChords();
  document.getElementById("extraToggle").textContent=custom?
    "Volver a los acordes de la tonalidad":
    (instrument==="piano"?"Explorar 9 · 11 · 13 y jazz":"Elegir otro acorde");
};
function switchInstrument(next){
  if(next===instrument)return;
  const quality=document.getElementById("quality");
  if(instrument==="piano"&&custom)savedPianoSelection={root:document.getElementById("root").value,qual:quality.value};
  instrument=next;
  document.body.classList.toggle("is-piano",instrument==="piano");
  const piano=instrument==="piano";
  document.getElementById("guitarTab").classList.toggle("on",!piano);
  document.getElementById("pianoTab").classList.toggle("on",piano);
  document.getElementById("guitarTab").setAttribute("aria-selected",String(!piano));
  document.getElementById("pianoTab").setAttribute("aria-selected",String(piano));
  document.getElementById("tuningPanel").hidden=piano;
  document.getElementById("legendGuitar").hidden=piano;
  document.getElementById("legendPiano").hidden=!piano;
  document.getElementById("appSubtitle").textContent="Círculo de quintas · "+(piano?"Piano":"Guitarra");
  document.getElementById("footerText").textContent=piano?
    "Inversiones exactas y voicings de jazz: la quinta puede omitirse en acordes extendidos":
    "Posiciones calculadas según la afinación seleccionada";
  document.getElementById("tuningIndex").textContent="01";
  document.getElementById("keyIndex").textContent=piano?"01":"02";
  document.getElementById("chordIndex").textContent=piano?"02":"03";
  document.getElementById("resultIndex").textContent=piano?"03":"04";
  fillPianoQualities();
  if(!piano&&custom&&!GUITAR_QUALITIES.includes(quality.value)){
    quality.value="maj";custom=false;
  }
  if(piano&&savedPianoSelection){
    document.getElementById("root").value=savedPianoSelection.root;
    quality.value=savedPianoSelection.qual;
    custom=true;
  }
  document.getElementById("resultKind").textContent=piano?"Inversiones de ":"Posiciones de ";
  render();
}
document.getElementById("guitarTab").addEventListener("click",()=>switchInstrument("guitar"));
document.getElementById("pianoTab").addEventListener("click",()=>switchInstrument("piano"));
