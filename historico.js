// ===== Histórico =====
function renderHist(){
  const ops=[...new Set([...data.divs,...data.hist.map(h=>h.tipo)])].sort();
  const sel=$('fHist'), v=ops.includes(sel.value)?sel.value:'';
  sel.innerHTML='<option value="">Todas as divisões</option>'+ops.map(l=>`<option value="${esc(l)}">Treino ${esc(l)}</option>`).join('');
  sel.value=v;
  const it=data.hist.map((h,k)=>({h,k})).filter(o=>!v||o.h.tipo===v).reverse();
  $('hist').innerHTML=it.map(({h,k})=>`<div class="card"><div class="top"><div><b>Treino ${esc(h.tipo)}</b> — ${esc(h.data)}${h.dur?' • '+ic('clock')+mmss(h.dur):''}</div>
    <button class="ic" aria-label="Apagar" onclick="delHist(${k})">${ic('trash-2')}</button></div>
    ${(h.ex||[]).map((e,n)=>{ const tp=(e.tempos||[]).map((t,j)=>feita(t)?linhaTempo(j,t,(e.descansos||[])[j]):null).filter(Boolean).join('<br>');
      const s=series(e);
      return `<div class="top"><div>• ${esc(e.name)}: ${e.feitas}/${e.sets} séries x${esc(lista(s.map(x=>x.p)))} @ ${faixa(s.map(x=>x.w))}kg${tagAq(e)}${tp?`<div class="tempos" style="margin:2px 0 0 12px">${ic('timer')}${tp}</div>`:''}</div>
        <button class="ic" aria-label="${e.aq?'Desmarcar aquecimento':'Marcar como aquecimento'}" title="${e.aq?'Desmarcar aquecimento':'Marcar como aquecimento'}" onclick="togAq(${k},${n})" style="opacity:${e.aq?1:.45}">${ic('flame')}</button></div>`; }).join('')}</div>`).join('')
    ||`<div class="info">${data.hist.length?'Nenhum registro para o Treino '+esc(v)+'.':'Nenhum treino registrado ainda.'}</div>`;
}
function delHist(k){
  const h=data.hist[k];
  if(!h||!confirm(`Apagar definitivamente o registro do Treino ${h.tipo} de ${h.data}?\nEssa ação não pode ser desfeita.`)) return;
  data.hist.splice(k,1); save(); renderHist();
  if(h.id&&window.excluirSessao) window.excluirSessao(h.id);
}
// Marca/desmarca um exercício do histórico como aquecimento. Só muda "aq"; o resto fica igual.
function togAq(k,n){
  const h=data.hist[k], e=h&&(h.ex||[])[n]; if(!e) return;
  if(!confirm(e.aq?`Desmarcar "${e.name}" como aquecimento?\nEle volta a contar nas análises.`
    :`Marcar "${e.name}" como aquecimento?\nEle continua no histórico, mas sai das análises.`)) return;
  if(e.aq) delete e.aq; else e.aq=true;
  save(); window.atualizarSessoes&&window.atualizarSessoes([h]);
  anSel=null; render();
}
