// ===== Análises =====
const media=a=>{ const v=(a||[]).filter(x=>x!=null); return v.length?Math.round(v.reduce((s,x)=>s+x,0)/v.length):null; };
const numReps=r=>{ const m=String(r??'').match(/\d+(\.\d+)?/g); if(!m) return null; const n=m.map(Number); return n.reduce((a,b)=>a+b,0)/n.length; };
// Agrupa o histórico por exercício (nome sem diferenciar maiúsculas). Aquecimentos (aq) ficam de fora.
// A ordem cronológica é a posição no histórico (k): sessões são gravadas em ordem com push.
function histEx(){
  const ex={};
  data.hist.forEach((h,k)=>{
    (h.ex||[]).forEach(e=>{
      if(!e.feitas||e.aq) return;
      const nome=String(e.name||'').trim(), key=nome.toLowerCase(); if(!key) return;
      const idx=(e.tempos||[]).map((t,j)=>feita(t)?j:-1).filter(j=>j>=0);
      const js=idx.length?idx:Array.from({length:e.feitas},(_,j)=>j);
      const ss=js.map(j=>serie(e,j)), ws=ss.map(s=>s.w), rs=ss.map(s=>numReps(s.p));
      const okR=rs.every(x=>x!=null);
      (ex[key]=ex[key]||{nome,s:[]}).s.push({k,data:h.data,tipo:h.tipo,peso:Math.max(...ws),
        reps:okR?Math.round(rs.reduce((a,b)=>a+b,0)/rs.length*10)/10:null,series:e.feitas,
        volume:okR?Math.round(ss.reduce((a,s,n)=>a+s.w*rs[n],0)):null,tSerie:media(e.tempos),tDesc:media(e.descansos)});
    });
  });
  return ex;
}
// Dados para a análise com IA (firebase.js). Formato mantido: 1ª × última sessão
function calcAnalise(){
  const ex=histEx(), div={};
  data.hist.forEach((h,k)=>(div[h.tipo]=div[h.tipo]||[]).push({k,data:h.data,dur:h.dur||null}));
  const comp=[], insuf=[];
  Object.values(ex).forEach(o=>{
    if(o.s.length<2) return insuf.push(o.nome);
    comp.push({nome:o.nome,sessoes:o.s.length,tipos:[...new Set(o.s.map(x=>x.tipo))],ini:o.s[0],fim:o.s.at(-1)});
  });
  const divs=Object.entries(div).map(([tipo,s])=>({tipo,sessoes:s.length,ini:s[0],fim:s.at(-1)}));
  return {total:data.hist.length,divs,comp,insuf};
}
window.dadosAnalise=calcAnalise;
const METR=[['peso','Peso máximo','kg',1],['reps','Repetições médias','',1],['series','Séries concluídas','',1],
  ['volume','Volume (Σ peso×reps)','kg',1],['tSerie','Tempo médio por série','t',0],['tDesc','Descanso médio','t',-1]];
function linhaComp(lbl,a,b,u,dir){
  if(a==null||b==null) return '';
  const f=v=>u==='t'?mmss(v):(Math.round(v*10)/10)+(u?' '+u:'');
  const d=b-a, c=!d||!dir?'eq':(d*dir>0?'up':'dn');
  const i=!d?'equal':c==='eq'?'minus':c==='up'?'arrow-up':'arrow-down';
  return `<div><span>${lbl}</span><b class="${c}">${f(a)} → ${f(b)} ${ic(i)}</b></div>`;
}

// Filtros: divisão (anDiv) e exercícios (anSel; null = todos selecionados)
let anSel=null, anKeys=[], anDiv=null;
function anSetDiv(d){ anDiv=d; renderAnalise(); }
function anToggle(i){ const k=anKeys[i]; if(!k) return; anSel.has(k)?anSel.delete(k):anSel.add(k); renderAnalise(); }
function anTodos(v){ anKeys.forEach(k=>v?anSel.add(k):anSel.delete(k)); renderAnalise(); }

// Métrica do radar: volume (Σ peso×reps). Exercícios sem carga (volume sempre 0) usam total de reps.
const usaVol=o=>o.s.some(x=>x.volume>0);
const metrica=(o,x)=>usaVol(o)?x.volume:(x.reps!=null?Math.round(x.reps*x.series):null);
const CORES=['#3b82f6','#f87171','#22c55e']; // mais recente, penúltimo, antepenúltimo
const rotulo=k=>{ const h=data.hist[k]; return 'Treino '+esc(h.tipo)+' — '+esc(String(h.data).split(',')[0]); };

// Quebra o nome em linhas de até "max" caracteres (máx. 3 linhas; a última termina com … se sobrar)
function quebra(t,max){
  const l=[]; let c='';
  String(t).split(/\s+/).filter(Boolean).forEach(w=>{
    while(w.length>max){ if(c){ l.push(c); c=''; } l.push(w.slice(0,max-1)+'-'); w=w.slice(max-1); }
    if(!c) c=w; else if((c+' '+w).length<=max) c+=' '+w; else { l.push(c); c=w; }
  });
  if(c) l.push(c);
  if(l.length>3){ l.length=3; l[2]=l[2].slice(0,max-1)+'…'; }
  return l;
}

function radar(ex,sel,div){
  // 3 sessões mais recentes que contêm algum exercício selecionado (mais recente primeiro)
  const ks=[...new Set(sel.flatMap(k=>ex[k].s.map(x=>x.k)))].sort((a,b)=>b-a).slice(0,3);
  const vals={};
  sel.forEach(k=>{ const o=ex[k], by=new Map(o.s.map(x=>[x.k,x])); vals[k]=ks.map(s=>by.has(s)?metrica(o,by.get(s)):null); });
  const pct=(k,j)=>{ const mx=Math.max(0,...vals[k].filter(v=>v!=null)), v=vals[k][j]; return v==null||!mx?0:v/mx*100; };

  let svg='';
  if(sel.length>=3){
    const N=sel.length, W=400, H=340, cx=200, cy=170, R=100, LH=13;
    const pt=(i,p)=>{ const a=-Math.PI/2+2*Math.PI*i/N; return [cx+R*p/100*Math.cos(a),cy+R*p/100*Math.sin(a)]; };
    const poly=f=>sel.map((k,i)=>pt(i,f(k,i)).map(n=>n.toFixed(1)).join(',')).join(' ');
    let g=[25,50,75,100].map(p=>`<polygon class="rg" points="${poly(()=>p)}"/>`).join('');
    g+=sel.map((_,i)=>{ const [x,y]=pt(i,100); return `<line class="rg" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
    g+=[25,50,75,100].map(p=>`<text class="pct" x="${cx+3}" y="${(cy-R*p/100+10).toFixed(1)}">${p}%</text>`).join('');
    // Rótulos com quebra de linha, conforme o espaço disponível em cada lado
    g+=sel.map((k,i)=>{ const [x,y]=pt(i,118);
      const an=x<cx-5?'end':x>cx+5?'start':'middle';
      const room=an==='middle'?130:an==='start'?W-x-4:x-4;
      const ls=quebra(ex[k].nome,Math.max(6,Math.floor(room/6.6)));
      const y0=y<cy-5?y-(ls.length-1)*LH:y>cy+5?y:y-(ls.length-1)*LH/2;
      return `<text x="${x.toFixed(1)}" y="${y0.toFixed(1)}" text-anchor="${an}" dominant-baseline="middle">${ls.map((s,n)=>`<tspan x="${x.toFixed(1)}"${n?` dy="${LH}"`:''}>${esc(s)}</tspan>`).join('')}</text>`; }).join('');
    // Do mais antigo para o mais recente, para o mais recente ficar por cima
    for(let j=ks.length-1;j>=0;j--){
      const c=CORES[j];
      g+=`<polygon points="${poly(k=>pct(k,j))}" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="2"/>`;
      g+=sel.map((k,i)=>{ const [x,y]=pt(i,pct(k,j)), falta=vals[k][j]==null;
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${falta?3:4}" fill="${falta?'#1a1d24':c}" stroke="${c}" stroke-width="2"/>`; }).join('');
    }
    svg=`<svg class="radar" viewBox="0 0 ${W} ${H}">${g}</svg>`;
  } else svg=`<div class="info">${ic('info')}Selecione 3 ou mais exercícios para ver o gráfico radar. Os valores estão abaixo.</div>`;

  const leg=`<div class="leg">${ks.map((k,j)=>`<div><span class="dot" style="background:${CORES[j]}"></span>${rotulo(k)}${j===0?' (mais recente)':''}</div>`).join('')}</div>`;
  const aviso=ks.length<3?`<div class="info">Há ${ks.length} sessão(ões) do Treino ${esc(div)} com esses exercícios. O gráfico mostra todas as disponíveis.</div>`:'';
  // Valores reais, do mais antigo para o mais recente
  const tab=`<div class="kv">${sel.map(k=>{ const o=ex[k], u=usaVol(o)?' kg':' reps';
    const v=[...vals[k]].reverse().map(x=>x==null?'—':x+u).join(' → ');
    return `<div><span>${esc(o.nome)}</span><b>${v}</b></div>`; }).join('')}</div>`;
  return `<div class="card"><div class="nm">${ic('radar')}Últimos treinos — Treino ${esc(div)}</div>
    <div class="info">Volume (Σ peso×reps) ou total de reps em exercícios sem carga. Em cada eixo, 100% = maior valor do exercício entre os treinos mostrados. "—" = não feito naquele treino.</div>
    ${svg}${leg}${aviso}${tab}</div>`;
}

function renderAnalise(){
  const desc=$('p_analise').querySelector('.card .info');
  if(desc) desc.textContent='Escolha a divisão e os exercícios. Compara o treino mais recente com o penúltimo. Aquecimentos não entram.';
  const todos=histEx(), box=$('anLista');
  $('bIA').disabled=!Object.values(todos).some(o=>o.s.length>1);
  if(!Object.keys(todos).length){
    anKeys=[];
    box.innerHTML=`<div class="card info">${ic('trending-down')}Ainda não há dados para análise. Salve pelo menos uma sessão no histórico (há ${data.hist.length} sessão(ões)).</div>`;
    return;
  }
  if(!anSel) anSel=new Set(Object.keys(todos));
  // Divisões com sessões no histórico; padrão = divisão do treino mais recente
  const divs=[...new Set(data.hist.map(h=>h.tipo).filter(Boolean))].sort();
  if(!divs.includes(anDiv)) anDiv=data.hist.at(-1)?.tipo||divs[0];
  const nSess=data.hist.filter(h=>h.tipo===anDiv).length;
  // Apenas sessões da divisão escolhida (cálculos inalterados)
  const ex={};
  Object.entries(todos).forEach(([k,o])=>{ const s=o.s.filter(x=>x.tipo===anDiv); if(s.length) ex[k]={nome:o.nome,s}; });
  anKeys=Object.keys(ex).sort((a,b)=>ex[a].nome.localeCompare(ex[b].nome));

  let h=`<div class="card"><div class="nm">${ic('layout-grid')}Divisão</div>
    <div class="tabs" style="margin:12px 0 0">${divs.map(d=>`<button class="${d===anDiv?'on':''}" onclick="anSetDiv('${esc(d)}')">${divs.length>3?esc(d):'Treino '+esc(d)}</button>`).join('')}</div>
    <div class="info">Mostrando o <b>Treino ${esc(anDiv)}</b> • ${nSess} sessão(ões)</div></div>`;
  if(!anKeys.length){ box.innerHTML=h+`<div class="card info">Nenhum exercício concluído nas sessões do Treino ${esc(anDiv)}.</div>`; return; }
  h+=`<div class="card"><div class="nm">${ic('list-filter')}Exercícios do Treino ${esc(anDiv)}</div>
    <div class="chips">${anKeys.map((k,i)=>`<button class="chip${anSel.has(k)?' on':''}" onclick="anToggle(${i})">${esc(ex[k].nome)}</button>`).join('')}</div>
    <div class="chips"><button class="chip lk" onclick="anTodos(true)">Todos</button><button class="chip lk" onclick="anTodos(false)">Nenhum</button></div></div>`;
  const sel=anKeys.filter(k=>anSel.has(k));
  if(!sel.length){ box.innerHTML=h+'<div class="card info">Selecione ao menos um exercício.</div>'; return; }
  h+=radar(ex,sel,anDiv);
  const comp=sel.filter(k=>ex[k].s.length>1), insuf=sel.filter(k=>ex[k].s.length<2);
  h+=`<h2>Exercícios — Treino ${esc(anDiv)}</h2>`
    +comp.map(k=>{ const o=ex[k], a=o.s.at(-2), b=o.s.at(-1);
      return `<div class="card"><div class="nm">${esc(o.nome)}</div>
      <div class="info">${o.s.length} sessões no Treino ${esc(anDiv)}<br>Penúltima: ${esc(a.data)} → última: ${esc(b.data)}</div>
      <div class="kv">${METR.map(([m,l,u,dir])=>linhaComp(l,a[m],b[m],u,dir)).join('')}</div></div>`; }).join('')
    +(insuf.length?`<div class="card info">Sem histórico suficiente no Treino ${esc(anDiv)} (só 1 sessão): ${insuf.map(k=>esc(ex[k].nome)).join(', ')}.</div>`:'');
  box.innerHTML=h;
}
