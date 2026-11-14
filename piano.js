/* Piano · Solo acordes básicos e inversiones completas.
   Se han eliminado las tensiones 9, 11, 13 y todos los voicings
   parciales/alterados, manteniendo la guitarra sin cambios. */
"use strict";
let instrument="guitar";
let savedPianoSelection=null;
const GUITAR_QUALITIES=["maj","min","7","maj7","m7","dim","sus2","sus4","m7b5"];
const PIANO_CHOICES=[
  ["maj","Mayor"],["min","Menor"],["7","7"],
  ["maj7","Maj7"],["sus2","sus2"],["sus4","sus4"]
];
function pianoIntervals(qual){
  if(!Object.prototype.hasOwnProperty.call(QUALITIES,qual))throw Error("Acorde desconocido: "+qual);
  return QUALITIES[qual].int.slice();
}
function pianoDegree(interval,qual){
  if(qual==="dim7"&&interval===9)return 6;
  if(interval===0)return 0;
  if([1,2].includes(interval))return 1;
  if([3,4].includes(interval))return 2;
  if(interval===5)return 3;
  if([6,7,8].includes(interval))return 4;
  if(interval===9)return 5;
  if([10,11].includes(interval))return 6;
  throw Error("Intervalo no admitido en piano básico: "+interval);
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
  const map=new Map();
  pianoIntervals(chord.qual).forEach(int=>
    map.set(mod12(PC[chord.root]+int),pianoNoteSpelling(chord.root,int,chord.qual))
  );
  return map;
}
function pianoName(midi,names){
  return (names.get(mod12(midi))||spell(mod12(midi),false))+(Math.floor(midi/12)-1);
}
function pianoVoicings(chord){
  const rootPc=PC[chord.root];
  const pitchClasses=[...new Set(pianoIntervals(chord.qual).map(mod12))].sort((a,b)=>a-b);
  return pitchClasses.map((_,i)=>{
    const rotated=pitchClasses.slice(i).concat(pitchClasses.slice(0,i).map(n=>n+12));
    const right=rotated.map(n=>60+rootPc+n);
    return {
      title:i===0?"Fundamental":i+".ª inversión",
      bass:right[0],left:[],right,omitted:[],kind:"inversion"
    };
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
  const c=currentChord(),names=pianoChordNames(c);
  const voices=pianoVoicings(c);
  document.getElementById("resultKind").textContent="Inversiones de ";
  document.getElementById("chosenChord").textContent=c.name;
  document.getElementById("notesLine").textContent=pianoIntervals(c.qual).map(
    x=>pianoNoteSpelling(c.root,x,c.qual)
  ).join(" · ");
  document.getElementById("count").textContent=voices.length+" posiciones";
  document.getElementById("shapes").innerHTML=voices.map((v,i)=>{
    const bass=names.get(mod12(v.bass));
    const symbol=c.name+(i===0?"":"/"+bass);
    const pitches=v.right.map(n=>pianoName(n,names)).join(" · ");
    return '<article class="shape piano-card"><div class="head">'+
      '<span class="cname">'+(i+1)+'. '+symbol+'</span>'+
      '<span class="pos">'+v.title+'</span></div>'+
      '<div class="piano-keyboard">'+pianoSvg(v,names)+'</div>'+
      '<div class="piano-hand">Notas: '+pitches+'</div></article>';
  }).join("");
}
function fillPianoQualities(){
  const select=document.getElementById("quality");
  const prev=select.value;
  select.innerHTML="";
  if(instrument==="piano"){
    for(const [key,label] of PIANO_CHOICES){
      const o=document.createElement("option");
      o.value=key;o.textContent=label;select.appendChild(o);
    }
  }else{
    for(const key of GUITAR_QUALITIES){
      const o=document.createElement("option");
      o.value=key;o.textContent=QUALITIES[key].name;
      select.appendChild(o);
    }
  }
  const allowed=[...select.options].map(o=>o.value);
  select.value=allowed.includes(prev)?prev:(instrument==="piano"?"9":"maj");
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
    "Volver a los acordes de la tonalidad":"Elegir otro acorde";
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
    "Acordes básicos e inversiones completas, con todas sus notas":
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
    quality.value=[...quality.options].some(o=>o.value===savedPianoSelection.qual)?
      savedPianoSelection.qual:"maj";
    custom=true;
  }
  document.getElementById("resultKind").textContent=piano?"Inversiones de ":"Posiciones de ";
  render();
}
document.getElementById("guitarTab").addEventListener("click",()=>switchInstrument("guitar"));
document.getElementById("pianoTab").addEventListener("click",()=>switchInstrument("piano"));
