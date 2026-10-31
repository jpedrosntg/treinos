// ===== Sessão =====
function resetSessao(){ clearInterval(sInt); sessao='nao'; sIni=null; sMsg=''; pilha=[]; pend=null; const m=$('dlgSerie'); if(m) m.classList.remove('on'); }
function botaoSessao(){ sessao==='andamento'?$('dlgFim').classList.add('on'):iniciarSessao(); }
function iniciarSessao(){
  if(!(data[cur]||[]).length) return alert('Adicione exercícios ao Treino '+cur+' antes de iniciar.');
  Object.keys(done).filter(k=>k[0]===cur).forEach(k=>delete done[k]);
  pos={i:0,j:0}; fase='serie'; sessao='andamento'; sIni=Date.now(); pilha=[]; pend=null;
  clearInterval(sInt); sInt=setInterval(status,1000);
  startTimer(); render();
}
// Leva para o treino configurado as reps e cargas executadas (confirmadas) na sessão.
// Só muda séries feitas e com valores diferentes; o descanso (r) fica igual. Retorna quantos exercícios mudaram.
function atualizarPlano(div){
  let n=0;
  (data[div]||[]).forEach((e,i)=>{
    const d=done[div+i]||[], sr=series(e); let mud=false;
    sr.forEach((s,j)=>{ const v=d[j];
      if(!feita(v)||v.p==null) return;
      const p=String(v.p), w=+v.w;
      if(!Number.isFinite(w)||(p===s.p&&w===s.w)) return;
      s.p=p; s.w=w; mud=true; });
    if(mud){ e.series=sr; e.reps=lista(sr.map(s=>s.p)); e.weight=sr[0].w; e.rest=sr[0].r; n++; }
  });
  return n;
}
function encerrar(salvar){
  $('dlgFim').classList.remove('on');
  if(fase==='descanso'){ const v=(done[cur+pos.i]||[])[pos.j]; if(v) v.d=Math.floor(decorrido()/1000); }
  let nAt=0;
  if(salvar){
    // series = valores executados (confirmados); plan = valores planejados. "aq" vem junto com o exercício
    // A sessão é montada ANTES de atualizar o treino, para "plan" guardar o planejado original
    const ex=data[cur].map((e,i)=>{ const d=done[cur+i]||[], plan=series(e);
      return {...e,plan,series:plan.map((s,j)=>feita(d[j])&&d[j].p!=null?{...s,p:d[j].p,w:d[j].w}:s),
        feitas:d.filter(feita).length,
        tempos:Array.from({length:e.sets},(_,j)=>feita(d[j])?d[j].t:null),
        descansos:Array.from({length:e.sets},(_,j)=>feita(d[j])&&d[j].d!=null?d[j].d:null)}; });
    const s={id:novoId(),ts:Date.now(),tipo:cur,data:new Date().toLocaleString('pt-BR'),dur:Math.round((Date.now()-sIni)/1000),ex};
    data.hist.push(s);
    nAt=atualizarPlano(cur); // executado vira o planejado do próximo treino
    save();
    window.salvarSessao&&window.salvarSessao(s); // cópia de segurança (subcoleção "sessoes")
  }
  Object.keys(done).filter(k=>k[0]===cur).forEach(k=>delete done[k]);
  pos={i:0,j:0}; fase='serie'; stopTimer(); clearInterval(sInt); sIni=null; pilha=[]; pend=null;
  sessao='encerrado'; sMsg=salvar?ic('circle-check')+'Treino encerrado e salvo no histórico.'
    +(nAt?` ${nAt} exercício(s) atualizado(s) com as reps/cargas executadas para o próximo treino.`:''):'Treino encerrado sem salvar.';
  renderAll();
}
function status(){
  const st=$('status'); st.className='status '+sessao;
  st.innerHTML=sessao==='andamento'?ic('circle-dot')+'Treino '+cur+' em andamento • '+mmss(Math.floor((Date.now()-sIni)/1000))
    :sessao==='encerrado'?sMsg+' Toque em INICIAR TREINO para uma nova sessão.'
    :ic('circle')+'Treino não iniciado. Toque em INICIAR TREINO para começar.';
}
const aviso=()=>alert('Toque em "INICIAR TREINO" para começar a sessão.');

function trocar(t){
  if(t===cur) return;
  if(sessao==='andamento') return alert('Encerre o treino em andamento antes de trocar de divisão.');
  cur=t; pos={i:0,j:0}; fase='serie'; pilha=[]; if(sessao==='encerrado') sessao='nao'; stopTimer(); render();
}

function render(){
  if(!data.divs.includes(cur)) cur=data.divs[0]||'A';
  const ex=data[cur]||[], on=sessao==='andamento';
  if(pos.i>=ex.length) pos={i:0,j:0};
  if(ex[pos.i]&&pos.j>=ex[pos.i].sets) pos.j=ex[pos.i].sets-1;

  $('semTreino').style.display=data.divs.length?'none':'block';
  $('comTreino').style.display=data.divs.length?'block':'none';

  $('tabs').innerHTML=data.divs.map(t=>`<button class="${t==cur?'on':''}" onclick="trocar('${t}')">${data.divs.length>3?t:'Treino '+t}</button>`).join('');
  $('list').className=on?'':'bloq';
  $('list').innerHTML=ex.map((e,i)=>{
    const d=done[cur+i]||[]; let s='';
    for(let j=0;j<e.sets;j++){ const sj=serie(e,j), v=d[j], ok=feita(v);
      const rp=ok&&v.p!=null?v.p:sj.p, rw=ok&&v.w!=null?v.w:sj.w;
      s+=`<span class="${ok?'ok':''} ${on&&fase!=='fim'&&i==pos.i&&j==pos.j?'cur':''}">${esc(rp)||j+1}<small>${rw}kg</small></span>`; }
    const tp=d.map((v,j)=>feita(v)?linhaTempo(j,v.t,v.d):null).filter(Boolean).join('<br>');
    return `<div class="card" data-i="${i}"><div class="top"><div style="display:flex;align-items:center">
      <span class="drag">${ic('grip-vertical')}</span><div><div class="nm">${esc(e.name)}</div>
      <div class="info">${info(e)}</div>${tagAq(e)}${avisoFora(e)}</div></div>
      <div style="white-space:nowrap"><button class="ic" aria-label="Editar" onclick="openForm(${i})">${ic('pencil')}</button><button class="ic" aria-label="Excluir" onclick="del(${i})">${ic('trash-2')}</button></div></div>
      <div class="ser">${s}</div>${tp?`<div class="tempos">${ic('timer')}${tp}</div>`:''}</div>`;
  }).join('')||'<div class="info">Nenhum exercício no treino '+cur+'.</div>';

  const bs=$('bSessao'); bs.innerHTML=on?ic('square')+'ENCERRAR TREINO':ic('play')+'INICIAR TREINO'; bs.classList.toggle('enc',on);
  $('timerBar').classList.toggle('off',!on);
  const fim=fase==='fim'||(fase==='serie'&&ex.length>0&&ultimaSerie());
  const b=$('bAcao');
  b.innerHTML=fase==='descanso'?ic('skip-forward')+'Próximo':fim?ic('square')+'Encerrar':ic('timer')+'Descanso';
  b.classList.toggle('prox',fase==='descanso');
  b.classList.toggle('fim',fim);
  $('bVolta').disabled=!on||!pilha.length;
  $('bPausa').innerHTML=pausado?ic('play')+'Retomar':ic('pause')+'Pausar';
  status(); renderHist(); if(aba==='analise') renderAnalise(); tick(); ilha(); renderNav();
}

function ultimaSerie(){ const ex=data[cur]; return pos.i>=ex.length-1&&pos.j>=ex[pos.i].sets-1; }
function proxima(){ const ex=data[cur]; return pos.j+1<ex[pos.i].sets?{i:pos.i,j:pos.j+1}:{i:pos.i+1,j:0}; }
function guardar(){ pilha.push({pos:{...pos},fase,target,el:decorrido(),done:JSON.parse(JSON.stringify(done))}); }
// Fases: serie → descanso → serie ... ; última série: serie → fim.
// O toque em "Descanso" registra a série (valores planejados), inicia o descanso na hora
// e abre a confirmação por cima, sem interferir no cronômetro.
function acao(){
  if(sessao!=='andamento') return aviso();
  const ex=data[cur]; if(!ex.length) return;
  if(fase==='serie'){
    guardar();
    const e=ex[pos.i], s=serie(e,pos.j), k=cur+pos.i;
    done[k]=done[k]||[]; done[k][pos.j]={t:Math.floor(decorrido()/1000),d:null,p:s.p,w:s.w};
    if(ultimaSerie()){ stopTimer(); fase='fim'; }
    else { target=s.r>0?s.r:60; fase='descanso'; startTimer(); agendar(target); }
    render();
    return abrirSerie(pos.i,pos.j);
  } else if(fase==='descanso'){
    guardar();
    const v=(done[cur+pos.i]||[])[pos.j]; if(v) v.d=Math.floor(decorrido()/1000);
    pos=proxima(); fase='serie'; startTimer();
  } else return $('dlgFim').classList.add('on');
  render();
}
// Janela de confirmação da série já registrada (i = exercício, j = série)
function abrirSerie(i,j){
  const e=data[cur][i], s=serie(e,j), d=done[cur+i]||[], ant=j>0?d[j-1]:null;
  pend={k:cur+i,j,ult:fase==='fim'};
  $('sInfo').innerHTML=`${esc(e.name)} — série ${j+1}/${e.sets} • planejado: ${esc(s.p)} reps • ${s.w} kg`
    +(ant&&ant.p!=null?`<br>Série anterior: ${esc(ant.p)} reps • ${ant.w} kg`:'')
    +(pend.ult?'':'<br>O descanso já está contando.');
  $('sReps').value=s.p; $('sPeso').value=s.w; $('sErr').textContent='';
  const bc=$('dlgSerie').querySelector('.btn.add'); if(bc) bc.textContent='Manter o planejado';
  $('dlgSerie').classList.add('on');
}
function confirmarSerie(){
  if(!pend) return fecharSerie();
  const p=$('sReps').value.trim(), w=parseFloat($('sPeso').value);
  if(numReps(p)==null||!(w>=0)) return $('sErr').textContent='Informe as repetições (ex: 12) e a carga (0 ou mais).';
  const v=(done[pend.k]||[])[pend.j];
  if(v){ v.p=p; v.w=w; }
  fecharSerie();
}
// Fecha a janela. A série continua registrada (com os valores planejados, se não confirmou)
function fecharSerie(){
  const ult=pend&&pend.ult; pend=null;
  $('dlgSerie').classList.remove('on');
  render();
  if(ult&&sessao==='andamento'&&fase==='fim') $('dlgFim').classList.add('on');
}
function voltar(){
  if(sessao!=='andamento') return aviso();
  const s=pilha.pop(); if(!s) return;
  pend=null; $('dlgSerie').classList.remove('on');
  const extra=decorrido();
  cancelar(); clearInterval(tInt);
  done=s.done; pos=s.pos; fase=s.fase; target=s.target;
  tAcc=s.el+extra; beeped=fase==='descanso'&&tAcc>=target*1000;
  if(pausado) tStart=null;
  else {
    tStart=Date.now(); tInt=setInterval(tick,250);
    if(fase==='descanso') agendar(target-Math.floor(decorrido()/1000));
  }
  render();
}

// ===== Notificação de descanso =====
function agendar(seg){
  if(!window.notifAgendar||seg<=0) return;
  const n=proxima(), e=data[cur][n.i];
  const s=e?serie(e,n.j):null;
  agendada=window.notifAgendar(seg, e?`Próximo: ${e.name} — série ${n.j+1}/${e.sets} • ${s.p} reps • ${s.w} kg`:'Bora para a próxima!');
}
function cancelar(){ if(agendada&&window.notifCancelar) window.notifCancelar(); agendada=false; }

// ===== Arrastar para reordenar =====
let drag=null;
document.addEventListener('pointerdown',e=>{
  const h=e.target.closest('#list .drag'); if(!h) return;
  e.preventDefault();
  const card=h.closest('.card'), r=card.getBoundingClientRect();
  const ph=document.createElement('div'); ph.className='ph'; ph.style.height=r.height+'px';
  card.parentNode.insertBefore(ph,card);
  Object.assign(card.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',margin:0});
  card.classList.add('arr'); document.body.classList.add('arrastando');
  drag={card,ph,dy:e.clientY-r.top};
  navigator.vibrate&&navigator.vibrate(15);
});
document.addEventListener('pointermove',e=>{
  if(!drag) return; e.preventDefault();
  drag.card.style.top=(e.clientY-drag.dy)+'px';
  if(e.clientY<90) scrollBy(0,-12); else if(e.clientY>innerHeight-260) scrollBy(0,12);
  const outros=[...$('list').querySelectorAll('.card:not(.arr)')];
  let ref=null;
  for(const o of outros){ const r=o.getBoundingClientRect(); if(e.clientY<r.top+r.height/2){ ref=o; break; } }
  const atual=drag.ph.nextElementSibling===drag.card?drag.card.nextElementSibling:drag.ph.nextElementSibling;
  if(ref===atual||ref===drag.ph) return;
  const antes=new Map(outros.map(o=>[o,o.getBoundingClientRect().top]));
  $('list').insertBefore(drag.ph,ref);
  outros.forEach(o=>{ const d=antes.get(o)-o.getBoundingClientRect().top; if(!d) return;
    o.style.transition='none'; o.style.transform=`translateY(${d}px)`;
    requestAnimationFrame(()=>{ o.style.transition='transform .2s ease'; o.style.transform=''; }); });
  navigator.vibrate&&navigator.vibrate(5);
},{passive:false});
function soltar(){
  if(!drag) return;
  const {card,ph}=drag; drag=null;
  ph.replaceWith(card);
  card.classList.remove('arr'); card.removeAttribute('style'); document.body.classList.remove('arrastando');
  const ordem=[...$('list').querySelectorAll('.card')].map(c=>+c.dataset.i);
  const ex=data[cur], atual=ex[pos.i], nd={};
  ordem.forEach((old,n)=>{ if(done[cur+old]) nd[cur+n]=done[cur+old]; });
  Object.keys(done).filter(k=>k[0]===cur).forEach(k=>delete done[k]);
  Object.assign(done,nd);
  data[cur]=ordem.map(o=>ex[o]);
  pos.i=Math.max(0,data[cur].indexOf(atual));
  pilha=[];
  save(); render();
}
document.addEventListener('pointerup',soltar);
document.addEventListener('pointercancel',soltar);

// ===== Cronômetro (sem som) =====
const decorrido=()=>tAcc+(tStart?Date.now()-tStart:0);
function startTimer(){
  cancelar(); tAcc=0; pausado=false; tStart=Date.now(); beeped=false; clearInterval(tInt); tInt=setInterval(tick,250); tick();
}
function stopTimer(){ cancelar(); clearInterval(tInt); tStart=null; tAcc=0; pausado=false; tick(); }
function pausar(){
  if(sessao!=='andamento') return aviso();
  if(tStart){ tAcc+=Date.now()-tStart; tStart=null; pausado=true; clearInterval(tInt); cancelar(); }
  else if(pausado){
    tStart=Date.now(); pausado=false; clearInterval(tInt); tInt=setInterval(tick,250);
    if(fase==='descanso') agendar(target-Math.floor(decorrido()/1000));
  }
  else return;
  render();
}
function parar(){
  if(sessao!=='andamento') return aviso();
  if(fase==='fim') return;
  cancelar(); clearInterval(tInt); tStart=null; tAcc=0; pausado=true; beeped=false; render();
}
function tick(){
  const ativo=!!(tStart||pausado), s=Math.floor(decorrido()/1000);
  const rest=ativo&&fase==='descanso', over=rest&&s>=target;
  const x=$('iTm'); x.textContent=ativo?mmss(s):'00:00';
  x.classList.toggle('over',over); x.classList.toggle('desc',rest&&!over); x.classList.toggle('pause',pausado&&!rest);
  const e=(data[cur]||[])[pos.i], sj=e?serie(e,pos.j):null;
  $('iNome').innerHTML=fase==='fim'?'Treino '+cur+' concluído'+ic('party-popper'):esc(e?e.name:'Treino '+cur);
  $('iSub').textContent=fase==='fim'?'Toque em Encerrar'
    :rest?(over?'Descanso excedido +'+mmss(s-target):'Descanso • faltam '+mmss(Math.max(0,target-s)))+(pausado?' • pausado':'')
    :(e?'Série '+(pos.j+1)+'/'+e.sets+' • '+sj.p+' reps • '+sj.w+' kg':'')+(pausado?' • pausado':'');
  const p=fase==='fim'?1:rest?Math.min(s/target,1):ativo?(s%60)/60:0, a=$('anel');
  a.style.strokeDashoffset=100.5*(1-p);
  a.style.stroke=fase==='fim'?'#22c55e':over?'#ef4444':rest?'#facc15':pausado?'#f59e0b':'#3b82f6';
  if(over&&!beeped&&tStart){ beeped=true; navigator.vibrate&&navigator.vibrate(500); }
}
