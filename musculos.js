// ===== Miniatura dos grupos musculares (aba Treino) =====
// Usa só os traçados SVG do react-native-body-highlighter (MIT, © 2022 ELABBASSI Hicham).
// O arquivo .ts é lido como texto: nada dele é executado.
const MUSC_VER='3.1.3';
const MUSC_URL=l=>`https://cdn.jsdelivr.net/npm/react-native-body-highlighter@${MUSC_VER}/assets/${l}.ts`;
const MUSC_MAP={peito:['chest'],costas:['upper-back','lower-back'],ombros:['deltoids'],trapezio:['trapezius'],
  biceps:['biceps'],triceps:['triceps'],pernas:['quadriceps','hamstring','adductors'],gluteos:['gluteal'],
  panturrilha:['calves'],abdomen:['abs','obliques'],antebraco:['forearm']};
let muscDados=null, muscCache={}, muscTentou=false, muscEspera=null, muscTentativas=0;
const MUSC_OK=/^[\d\s.,eE+\-MmLlHhVvCcSsQqTtAaZz]+$/;
function muscLer(txt){
  const out=[];
  (txt||'').split(/slug\s*:\s*/).slice(1).forEach(b=>{
    const m=/^["']([\w-]+)["']/.exec(b); if(!m) return;
    const p=(b.match(/["']M[^"']+["']/g)||[]).map(x=>x.slice(1,-1)).filter(d=>MUSC_OK.test(d));
    if(p.length) out.push({s:m[1],p});
  });
  return out;
}
// União de retângulos {x,y,r,b}
const muscUni=(a,b)=>!a?b:{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),r:Math.max(a.r,b.r),b:Math.max(a.b,b.b)};
// Calcula o viewBox do corpo inteiro e o retângulo de cada músculo (slug)
function muscBox(partes){
  const ns='http://www.w3.org/2000/svg', s=document.createElementNS(ns,'svg'), g=document.createElementNS(ns,'g');
  s.setAttribute('style','position:absolute;width:0;height:0;visibility:hidden');
  s.appendChild(g); document.body.appendChild(s);
  const gs=partes.map(x=>{ const e=document.createElementNS(ns,'g'); e.innerHTML=x.p.map(d=>`<path d="${d}"/>`).join(''); g.appendChild(e); return e; });
  const b=g.getBBox(), bx={};
  partes.forEach((x,n)=>{ const r=gs[n].getBBox(); if(r.width||r.height) bx[x.s]=muscUni(bx[x.s],{x:r.x,y:r.y,r:r.x+r.width,b:r.y+r.height}); });
  s.remove();
  return {vb:`${b.x-4} ${b.y-4} ${b.width+8} ${b.height+8}`,bx,H:b.height};
}
// Recorte com foco nos músculos principais deste lado; null = grupo não aparece neste lado
function muscVb(l,slugs){
  let u=null; slugs.forEach(s=>{ if(l.bx[s]) u=muscUni(u,l.bx[s]); });
  if(!u) return null;
  let w=(u.r-u.x)*1.3, h=Math.max((u.b-u.y)*1.3,l.H*.35);
  const cx=(u.x+u.r)/2, cy=(u.y+u.b)/2;
  if(w<h*.6) w=h*.6; if(h<w/1.2) h=w/1.2;
  return `${(cx-w/2).toFixed(1)} ${(cy-h/2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
}
// Redesenha a aba Treino sem nunca quebrar o app
function muscRedesenhar(){ try{ render(); }catch(e){ console.warn('Músculos: render',e); } }
// Catálogo ainda não chegou: tenta redesenhar de novo (1 s, no máximo 15 vezes)
function muscAguardar(){
  if(muscEspera||muscTentativas>=15) return;
  muscEspera=setTimeout(()=>{ muscEspera=null; muscTentativas++; muscCache={}; muscRedesenhar(); },1000);
}
async function muscCarregar(){
  if(muscTentou) return; muscTentou=true;
  try{
    const txt=await Promise.all(['bodyFront','bodyBack'].map(l=>
      fetch(MUSC_URL(l)).then(r=>{ if(!r.ok) console.warn('Músculos: '+l+' HTTP '+r.status); return r.ok?r.text():''; })
        .catch(e=>{ console.warn('Músculos: falha ao baixar '+l,e); return ''; })));
    const lados=txt.map(muscLer).filter(p=>p.length).map(p=>({p,...muscBox(p)}));
    if(!lados.length){ muscTentou=false; return console.warn('Músculos: desenho não carregado'); }
    muscDados=lados; muscCache={};
    muscRedesenhar();
  }catch(e){ muscTentou=false; console.warn('Músculos: erro',e); }
}
function musc(e){
  if(!muscDados){ muscCarregar(); return ''; }
  const c=typeof catAcha==='function'&&catAcha(e.name);
  if(!c){ muscAguardar(); return ''; }
  const sec=c.secundarios||[], k=c.grupo+'|'+sec.join(','); if(muscCache[k]) return muscCache[k];
  const pri=new Set(MUSC_MAP[c.grupo]||[]), ss=new Set(sec.flatMap(g=>MUSC_MAP[g]||[]));
  const cl=s=>pri.has(s)?' class="p"':ss.has(s)?' class="s"':'';
  const nome=GRUPOS[c.grupo]||c.grupo;
  // Só os lados onde o grupo principal aparece, com zoom nele; sem correspondência → corpo inteiro
  const vbs=muscDados.map(l=>muscVb(l,pri)), foco=vbs.some(Boolean);
  return muscCache[k]=`<div class="musc" role="img" aria-label="Músculos: ${esc(nome)}">${muscDados.map((l,n)=>
    foco&&!vbs[n]?'':`<svg viewBox="${foco?vbs[n]:l.vb}" aria-hidden="true">${l.p.map(x=>`<g${cl(x.s)}>${x.p.map(d=>`<path d="${d}"/>`).join('')}</g>`).join('')}</svg>`).join('')}</div>`;
}
// Quando o catálogo chegar da nuvem, redesenha os cartões (funciona se setCatalogo for "function")
try{
  if(typeof setCatalogo==='function'){
    const muscSetCatOrig=setCatalogo;
    window.setCatalogo=function(...a){ const r=muscSetCatOrig.apply(this,a); muscCache={}; if(muscDados) muscRedesenhar(); return r; };
  }
}catch(e){ console.warn('Músculos: setCatalogo',e); }
// Baixa o desenho logo ao abrir, sem esperar o catálogo
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',muscCarregar); else muscCarregar();
