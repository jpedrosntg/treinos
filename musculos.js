// ===== Miniatura dos grupos musculares (aba Treino) =====
// Usa só os traçados SVG do react-native-body-highlighter (MIT, © 2022 ELABBASSI Hicham).
// O arquivo .ts é lido como texto: nada dele é executado.
const MUSC_VER='3.1.3';
const MUSC_URL=l=>`https://cdn.jsdelivr.net/npm/react-native-body-highlighter@${MUSC_VER}/assets/${l}.ts`;
// Grupo do catálogo → músculos (slugs) da biblioteca
const MUSC_MAP={peito:['chest'],costas:['upper-back','lower-back'],ombros:['deltoids'],trapezio:['trapezius'],
  biceps:['biceps'],triceps:['triceps'],pernas:['quadriceps','hamstring','adductors'],gluteos:['gluteal'],
  panturrilha:['calves'],abdomen:['abs','obliques'],antebraco:['forearm']};
let muscDados=null, muscCache={}, muscTentou=false;
const MUSC_OK=/^[\d\s.,eE+\-MmLlHhVvCcSsQqTtAaZz]+$/; // só comandos de traçado SVG
// Extrai [{s: slug, p: [traçados]}] do texto do arquivo
function muscLer(txt){
  const out=[];
  (txt||'').split(/slug\s*:\s*/).slice(1).forEach(b=>{
    const m=/^["']([\w-]+)["']/.exec(b); if(!m) return;
    const p=(b.match(/["']M[^"']+["']/g)||[]).map(x=>x.slice(1,-1)).filter(d=>MUSC_OK.test(d));
    if(p.length) out.push({s:m[1],p});
  });
  return out;
}
// Calcula o enquadramento (viewBox) desenhando uma vez fora da tela
function muscBox(partes){
  const ns='http://www.w3.org/2000/svg', s=document.createElementNS(ns,'svg'), g=document.createElementNS(ns,'g');
  s.setAttribute('style','position:absolute;width:0;height:0;visibility:hidden');
  g.innerHTML=partes.map(x=>x.p.map(d=>`<path d="${d}"/>`).join('')).join('');
  s.appendChild(g); document.body.appendChild(s);
  const b=g.getBBox(); s.remove();
  return `${b.x-4} ${b.y-4} ${b.width+8} ${b.height+8}`;
}
async function muscCarregar(){
  if(muscTentou) return; muscTentou=true;
  try{
    const txt=await Promise.all(['bodyFront','bodyBack'].map(l=>
      fetch(MUSC_URL(l)).then(r=>{ if(!r.ok) console.warn('Músculos: '+l+' HTTP '+r.status); return r.ok?r.text():''; })
        .catch(e=>{ console.warn('Músculos: falha ao baixar '+l,e); return ''; })));
    const lados=txt.map(muscLer).filter(p=>p.length).map(p=>({p,vb:muscBox(p)}));
    if(!lados.length){ muscTentou=false; return console.warn('Músculos: desenho não carregado'); }
    muscDados=lados; muscCache={};
    render(); // redesenha os cartões já com a miniatura
  }catch(e){ muscTentou=false; console.warn('Músculos: erro',e); }
}
// HTML da miniatura de um exercício ('' se não estiver no catálogo)
function musc(e){
  const c=window.catAcha&&catAcha(e.name); if(!c) return '';
  if(!muscDados){ muscCarregar(); return ''; }
  const sec=c.secundarios||[], k=c.grupo+'|'+sec.join(','); if(muscCache[k]) return muscCache[k];
  const pri=new Set(MUSC_MAP[c.grupo]||[]), ss=new Set(sec.flatMap(g=>MUSC_MAP[g]||[]));
  const cl=s=>pri.has(s)?' class="p"':ss.has(s)?' class="s"':'';
  const nome=GRUPOS[c.grupo]||c.grupo;
  return muscCache[k]=`<div class="musc" role="img" aria-label="Músculos: ${esc(nome)}">${muscDados.map(l=>
    `<svg viewBox="${l.vb}" aria-hidden="true">${l.p.map(x=>`<g${cl(x.s)}>${x.p.map(d=>`<path d="${d}"/>`).join('')}</g>`).join('')}</svg>`).join('')}</div>`;
}
