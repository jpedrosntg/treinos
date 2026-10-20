const KEY='treinos_v1';
const LETRAS=['A','B','C','D','E'];
const VAZIO=()=>({divs:[],A:[],B:[],C:[],D:[],E:[],hist:[]});
let data=VAZIO(), cur='A', done={}, edit=-1, formDiv='A';
let tStart=null, tAcc=0, pausado=false, target=60, tInt=null, beeped=false;
let pos={i:0,j:0}, fase='serie';
let sessao='nao', sIni=null, sInt=null, sMsg='', aba='treino', agendada=false, telaAtual='telaLogin';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const info=e=>`${e.sets}x${esc(e.reps)} • ${e.weight} kg • ${e.rest}s descanso`;
const feita=v=>v!=null;
const linhaTempo=(j,t,d)=>`S${j+1} ${mmss(t)}${d!=null?` <span class="d">• desc ${mmss(d)}</span>`:''}`;
function divLabel(n){ const l=LETRAS.slice(0,n); return l.length>1?l.slice(0,-1).join(', ')+' e '+l.at(-1):l[0]; }

function norm(d){
  const n=VAZIO(); if(!d||!(d.A||d.divs)) return n;
  LETRAS.forEach(l=>n[l]=Array.isArray(d[l])?d[l]:[]);
  n.hist=Array.isArray(d.hist)?d.hist:[];
  if(Array.isArray(d.divs)) n.divs=d.divs.filter(l=>LETRAS.includes(l));
  else { let u=-1; LETRAS.forEach((l,k)=>{ if(n[l].length) u=k; }); n.divs=LETRAS.slice(0,u+1); }
  return n;
}
function setData(d){
  data=norm(d); done={}; pos={i:0,j:0}; fase='serie'; resetSessao(); stopTimer(); cur=data.divs[0]||'A';
  const r=$('iaRes'); if(r) r.innerHTML='';
  renderAll();
}
function save(){ window.salvarNuvem && window.salvarNuvem(); }
function renderAll(){ render(); renderCad(); renderInicio(); }

// ===== Telas =====
const TELAS=['telaLogin','telaAdmin','telaInicio','telaDivisao','telaCadastro','app'];
function tela(t){
  telaAtual=t;
  TELAS.forEach(id=>$(id).style.display=id===t?(id==='telaLogin'?'flex':'block'):'none');
  if(t==='telaInicio') renderInicio();
  if(t==='telaCadastro') renderCad();
  if(t==='app') render();
  ilha(); renderNav(); scrollTo(0,0);
}
function ilha(){
  const v=sessao==='andamento'&&$('app').style.display==='block';
  $('ilha').classList.toggle('on',v); document.body.classList.toggle('ilhaOn',v);
}
function renderNav(){
  const logado=telaAtual!=='telaLogin';
  const sel=telaAtual==='app'?aba:telaAtual==='telaAdmin'?'':'treino';
  document.body.classList.toggle('navOn',logado);
  document.body.classList.toggle('timerOn',telaAtual==='app'&&aba==='treino'&&data.divs.length>0);
  document.querySelectorAll('#bnav button').forEach(b=>{
    const on=b.dataset.a===sel; b.classList.toggle('on',on);
    on?b.setAttribute('aria-current','page'):b.removeAttribute('aria-current');
  });
}
function irAba(a){
  if(a==='treino'&&!data.divs.length) return tela('telaInicio');
  if(telaAtual!=='app'){ if(!data.divs.includes(cur)) cur=data.divs[0]||'A'; tela('app'); }
  mudarAba(a);
}
function setTopo(txt,adm){
  document.querySelectorAll('.uinfo').forEach(e=>e.textContent=txt);
  document.querySelectorAll('.admOnly').forEach(e=>e.style.display=adm?'block':'none');
}
function sairDaSessao(){
  if(sessao==='andamento'&&!confirm('Há um treino em andamento. Sair vai descartá-lo sem salvar. Continuar?')) return false;
  resetSessao(); stopTimer(); fase='serie'; return true;
}
function irInicio(){ if(sairDaSessao()) tela('telaInicio'); }

function renderInicio(){
  $('listaTreinos').innerHTML=data.divs.length
    ?`<div class="aluno" onclick="abrirExec()"><div class="nm">📋 Treino ${divLabel(data.divs.length)}</div>
      <div class="info">${data.divs.map(l=>l+': '+data[l].length+' exercício(s)').join(' • ')}</div>
      <div class="info">Toque para abrir</div></div>`
    :'<div class="info">Nenhum treino cadastrado. Toque em "Cadastrar novo treino".</div>';
}

// ===== Cadastro =====
$('opcDiv').innerHTML=[1,2,3,4,5].map(n=>`<div class="aluno" onclick="escolherDiv(${n})"><div class="nm">${divLabel(n)}</div><div class="info">${n} divisão(ões)</div></div>`).join('');
function novoTreino(){ if(sairDaSessao()) tela('telaDivisao'); }
function escolherDiv(n){
  if(data.divs.some(l=>data[l].length)&&!confirm('Isso substituirá os exercícios do treino atual. O histórico será mantido. Continuar?')) return;
  LETRAS.forEach(l=>data[l]=[]); data.divs=LETRAS.slice(0,n);
  cur='A'; done={}; pos={i:0,j:0}; fase='serie'; resetSessao(); stopTimer(); save(); tela('telaCadastro');
}
function renderCad(){
  $('cadList').innerHTML=data.divs.map(l=>`<div class="card"><div class="nm">Treino ${l}</div>
    ${data[l].map((e,i)=>`<div class="top item"><div><div>${esc(e.name)}</div><div class="info">${info(e)}</div></div>
      <div style="white-space:nowrap"><button class="ic" onclick="openForm(${i},'${l}')">✏️</button><button class="ic" onclick="del(${i},'${l}')">🗑</button></div></div>`).join('')
      ||'<div class="info">Nenhum exercício ainda.</div>'}
    <button class="btn add" onclick="openForm(-1,'${l}')">+ Adicionar exercício no Treino ${l}</button></div>`).join('')
    ||'<div class="info">Nenhuma divisão escolhida.</div>';
  $('selDiv').innerHTML=[1,2,3,4,5].map(n=>`<option value="${n}" ${n==(data.divs.length||1)?'selected':''}>${divLabel(n)}</option>`).join('');
  $('bCadIni').textContent=sessao==='andamento'?'▶ Voltar ao treino em andamento':'▶ INICIAR TREINO';
}
function mudarDiv(limpar){
  const n=+$('selDiv').value, novas=LETRAS.slice(0,n);
  if(limpar){
    if(!confirm('Apagar TODOS os exercícios e recomeçar com a divisão '+divLabel(n)+'?\nO histórico será mantido.')) return;
    LETRAS.forEach(l=>data[l]=[]);
  } else {
    if(novas.join()===data.divs.join()) return alert('Essa já é a divisão atual.');
    const perdidas=data.divs.filter(l=>!novas.includes(l)&&data[l].length);
    if(perdidas.length&&!confirm('Os exercícios do(s) Treino(s) '+perdidas.join(', ')+' serão apagados. Continuar?')) return;
  }
  if(!sairDaSessao()) return;
  LETRAS.forEach(l=>{ if(!novas.includes(l)) data[l]=[]; });
  data.divs=novas; cur='A'; done={}; pos={i:0,j:0}; fase='serie';
  save(); renderAll();
}
function iniciarDoCadastro(){
  if(!data.divs.some(l=>data[l].length)) return alert('Cadastre ao menos um exercício.');
  if(sessao==='andamento') return abrirExec();
  if(!(data[cur]||[]).length) cur=data.divs.find(l=>data[l].length);
  abrirExec(); iniciarSessao();
}
function abrirExec(){
  if(!data.divs.length) return alert('Nenhum treino cadastrado.');
  if(!data.divs.includes(cur)) cur=data.divs[0];
  tela('app'); mudarAba('treino');
}
function mudarAba(a){
  aba=a; ['treino','hist','analise','backup'].forEach(x=>$('p_'+x).style.display=x===a?'block':'none');
  $('tituloApp').textContent=a==='hist'?'📜 Histórico':a==='analise'?'📈 Análises':a==='backup'?'⚙️ Ajustes':'🏋️ Meus Treinos';
  render(); renderNav();
  if(a==='backup'){ window.atualizarNotifUI&&atualizarNotifUI(); window.renderPerfil&&renderPerfil(); }
  scrollTo(0,0);
}

// ===== Sessão =====
function resetSessao(){ clearInterval(sInt); sessao='nao'; sIni=null; sMsg=''; }
function botaoSessao(){ sessao==='andamento'?$('dlgFim').classList.add('on'):iniciarSessao(); }
function iniciarSessao(){
  if(!(data[cur]||[]).length) return alert('Adicione exercícios ao Treino '+cur+' antes de iniciar.');
  Object.keys(done).filter(k=>k[0]===cur).forEach(k=>delete done[k]);
  pos={i:0,j:0}; fase='serie'; sessao='andamento'; sIni=Date.now();
  clearInterval(sInt); sInt=setInterval(status,1000);
  startTimer(); render();
}
function encerrar(salvar){
  $('dlgFim').classList.remove('on');
  if(fase==='descanso'){ const v=(done[cur+pos.i]||[])[pos.j]; if(v) v.d=Math.floor(decorrido()/1000); }
  if(salvar){
    const ex=data[cur].map((e,i)=>{ const d=done[cur+i]||[];
      return {...e,feitas:d.filter(feita).length,
        tempos:Array.from({length:e.sets},(_,j)=>feita(d[j])?d[j].t:null),
        descansos:Array.from({length:e.sets},(_,j)=>feita(d[j])&&d[j].d!=null?d[j].d:null)}; });
    data.hist.push({tipo:cur,data:new Date().toLocaleString('pt-BR'),dur:Math.round((Date.now()-sIni)/1000),ex});
    save();
  }
  Object.keys(done).filter(k=>k[0]===cur).forEach(k=>delete done[k]);
  pos={i:0,j:0}; fase='serie'; stopTimer(); clearInterval(sInt); sIni=null;
  sessao='encerrado'; sMsg=salvar?'✅ Treino encerrado e salvo no histórico.':'Treino encerrado sem salvar.';
  render();
}
function status(){
  const st=$('status'); st.className='status '+sessao;
  st.textContent=sessao==='andamento'?'🟢 Treino '+cur+' em andamento • '+mmss(Math.floor((Date.now()-sIni)/1000))
    :sessao==='encerrado'?sMsg+' Toque em INICIAR TREINO para uma nova sessão.'
    :'⚪ Treino não iniciado. Toque em INICIAR TREINO para começar.';
}
const aviso=()=>alert('Toque em "INICIAR TREINO" para começar a sessão.');

function trocar(t){
  if(t===cur) return;
  if(sessao==='andamento') return alert('Encerre o treino em andamento antes de trocar de divisão.');
  cur=t; pos={i:0,j:0}; fase='serie'; if(sessao==='encerrado') sessao='nao'; stopTimer(); render();
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
    for(let j=0;j<e.sets;j++) s+=`<span class="${feita(d[j])?'ok':''} ${on&&fase!=='fim'&&i==pos.i&&j==pos.j?'cur':''}">${j+1}</span>`;
    const tp=d.map((v,j)=>feita(v)?linhaTempo(j,v.t,v.d):null).filter(Boolean).join('<br>');
    return `<div class="card" data-i="${i}"><div class="top"><div style="display:flex;align-items:center">
      <span class="drag">☰</span><div><div class="nm">${esc(e.name)}</div>
      <div class="info">${info(e)}</div></div></div>
      <div style="white-space:nowrap"><button class="ic" onclick="openForm(${i})">✏️</button><button class="ic" onclick="del(${i})">🗑</button></div></div>
      <div class="ser">${s}</div>${tp?`<div class="tempos">⏱ ${tp}</div>`:''}</div>`;
  }).join('')||'<div class="info">Nenhum exercício no treino '+cur+'.</div>';

  const bs=$('bSessao'); bs.textContent=on?'■ ENCERRAR TREINO':'▶ INICIAR TREINO'; bs.classList.toggle('enc',on);
  $('timerBar').classList.toggle('off',!on);
  const b=$('bAcao');
  b.textContent=fase==='serie'?'⏱ Descanso':fase==='descanso'?'⏭ Próximo':'■ Encerrar';
  b.classList.toggle('prox',fase==='descanso');
  b.classList.toggle('fim',fase==='fim');
  $('bPausa').textContent=pausado?'▶ Retomar':'⏸ Pausar';
  status(); renderHist(); if(aba==='analise') renderAnalise(); tick(); ilha(); renderNav();
}

function ultimaSerie(){ const ex=data[cur]; return pos.i>=ex.length-1&&pos.j>=ex[pos.i].sets-1; }
function proxima(){ const ex=data[cur]; return pos.j+1<ex[pos.i].sets?{i:pos.i,j:pos.j+1}:{i:pos.i+1,j:0}; }
function acao(){
  if(sessao!=='andamento') return aviso();
  const ex=data[cur]; if(!ex.length) return;
  if(fase==='serie'){
    const k=cur+pos.i; done[k]=done[k]||[]; done[k][pos.j]={t:Math.floor(decorrido()/1000),d:null};
    if(ultimaSerie()){ stopTimer(); fase='fim'; render(); return alert('Última série concluída! Toque em "Encerrar" para finalizar.'); }
    target=+ex[pos.i].rest||60; fase='descanso'; startTimer(); agendar(target);
  } else if(fase==='descanso'){
    const v=(done[cur+pos.i]||[])[pos.j]; if(v) v.d=Math.floor(decorrido()/1000);
    pos=proxima(); fase='serie'; startTimer();
  } else return $('dlgFim').classList.add('on');
  render();
}

// ===== Notificação de descanso =====
function agendar(seg){
  if(!window.notifAgendar||seg<=0) return;
  const n=proxima(), e=data[cur][n.i];
  agendada=window.notifAgendar(seg, e?`Próximo: ${e.name} — série ${n.j+1}/${e.sets}`:'Bora para a próxima!');
}
function cancelar(){ if(agendada&&window.notifCancelar) window.notifCancelar(); agendada=false; }

// ===== Exercícios =====
function del(i,dv=cur){
  if(!confirm('Excluir exercício?')) return;
  data[dv].splice(i,1);
  const nd={};
  Object.keys(done).forEach(k=>{
    if(k[0]!==dv){ nd[k]=done[k]; return; }
    const n=+k.slice(1); if(n<i) nd[k]=done[k]; else if(n>i) nd[dv+(n-1)]=done[k];
  });
  done=nd;
  if(dv===cur){
    if(pos.i>i) pos.i--;
    else if(pos.i===i){ pos.j=0; fase='serie'; if(sessao==='andamento'&&data[cur].length) startTimer(); else stopTimer(); }
  }
  save(); renderAll();
}
function openForm(i=-1,dv=cur){
  edit=i; formDiv=dv; const e=i>=0?data[dv][i]:{name:'',sets:3,reps:12,weight:0,rest:60};
  $('ftitle').textContent=(i>=0?'Editar':'Novo')+' exercício — Treino '+dv;
  $('fn').value=e.name;$('fs').value=e.sets;$('fr').value=e.reps;$('fp').value=e.weight;$('fd').value=e.rest;
  $('modal').classList.add('on');
}
function closeForm(){ $('modal').classList.remove('on'); }
function saveForm(){
  const e={name:$('fn').value.trim()||'Exercício',sets:+$('fs').value||1,reps:$('fr').value,weight:+$('fp').value||0,rest:+$('fd').value||60};
  edit>=0?data[formDiv][edit]=e:data[formDiv].push(e);
  if(fase==='fim'&&formDiv===cur&&!ultimaSerie()){ pos=proxima(); fase='serie'; startTimer(); }
  save(); closeForm(); renderAll();
}

// ===== Histórico =====
function renderHist(){
  const ops=[...new Set([...data.divs,...data.hist.map(h=>h.tipo)])].sort();
  const sel=$('fHist'), v=ops.includes(sel.value)?sel.value:'';
  sel.innerHTML='<option value="">Todas as divisões</option>'+ops.map(l=>`<option value="${esc(l)}">Treino ${esc(l)}</option>`).join('');
  sel.value=v;
  const it=data.hist.map((h,k)=>({h,k})).filter(o=>!v||o.h.tipo===v).reverse();
  $('hist').innerHTML=it.map(({h,k})=>`<div class="card"><div class="top"><div><b>Treino ${esc(h.tipo)}</b> — ${esc(h.data)}${h.dur?' • ⏳ '+mmss(h.dur):''}</div>
    <button class="ic" onclick="delHist(${k})">🗑</button></div>
    ${(h.ex||[]).map(e=>{ const tp=(e.tempos||[]).map((t,j)=>feita(t)?linhaTempo(j,t,(e.descansos||[])[j]):null).filter(Boolean).join('<br>');
      return `<div>• ${esc(e.name)}: ${e.feitas}/${e.sets} séries x${esc(e.reps)} @ ${e.weight}kg${tp?`<div class="tempos" style="margin:2px 0 0 12px">⏱ ${tp}</div>`:''}</div>`; }).join('')}</div>`).join('')
    ||`<div class="info">${data.hist.length?'Nenhum registro para o Treino '+esc(v)+'.':'Nenhum treino registrado ainda.'}</div>`;
}
function delHist(k){
  const h=data.hist[k];
  if(!h||!confirm(`Apagar definitivamente o registro do Treino ${h.tipo} de ${h.data}?\nEssa ação não pode ser desfeita.`)) return;
  data.hist.splice(k,1); save(); renderHist();
}

// ===== Análises =====
const media=a=>{ const v=(a||[]).filter(x=>x!=null); return v.length?Math.round(v.reduce((s,x)=>s+x,0)/v.length):null; };
const numReps=r=>{ const m=String(r??'').match(/\d+(\.\d+)?/g); if(!m) return null; const n=m.map(Number); return n.reduce((a,b)=>a+b,0)/n.length; };
function calcAnalise(){
  const ex={}, div={};
  data.hist.forEach((h,k)=>{
    (div[h.tipo]=div[h.tipo]||[]).push({k,data:h.data,dur:h.dur||null});
    (h.ex||[]).forEach(e=>{
      if(!e.feitas) return;
      const nome=String(e.name||'').trim(), key=nome.toLowerCase(); if(!key) return;
      const r=numReps(e.reps), w=+e.weight||0;
      (ex[key]=ex[key]||{nome,s:[]}).s.push({k,data:h.data,tipo:h.tipo,peso:w,reps:r,series:e.feitas,
        volume:r!=null?Math.round(w*r*e.feitas):null,tSerie:media(e.tempos),tDesc:media(e.descansos)});
    });
  });
  const comp=[], insuf=[];
  Object.values(ex).forEach(o=>{
    if(o.s.length<2) return insuf.push(o.nome);
    comp.push({nome:o.nome,sessoes:o.s.length,tipos:[...new Set(o.s.map(x=>x.tipo))],ini:o.s[0],fim:o.s.at(-1)});
  });
  const divs=Object.entries(div).map(([tipo,s])=>({tipo,sessoes:s.length,ini:s[0],fim:s.at(-1)}));
  return {total:data.hist.length,divs,comp,insuf};
}
window.dadosAnalise=calcAnalise;
// [campo, rótulo, unidade, direção: 1 = maior é melhor, -1 = menor é melhor, 0 = neutro]
const METR=[['peso','Peso','kg',1],['reps','Repetições (meta)','',1],['series','Séries concluídas','',1],
  ['volume','Volume (peso×reps×séries)','kg',1],['tSerie','Tempo médio por série','t',0],['tDesc','Descanso médio','t',-1]];
function linhaComp(lbl,a,b,u,dir){
  if(a==null||b==null) return '';
  const f=v=>u==='t'?mmss(v):(Math.round(v*10)/10)+(u?' '+u:'');
  const d=b-a, c=!d||!dir?'eq':(d*dir>0?'up':'dn');
  const ic=!d?'＝':c==='eq'?'•':c==='up'?'▲':'▼';
  return `<div><span>${lbl}</span><b class="${c}">${f(a)} → ${f(b)} ${ic}</b></div>`;
}
function renderAnalise(){
  const a=calcAnalise(), box=$('anLista'), ok=a.comp.length>0;
  $('bIA').disabled=!ok;
  if(!ok){
    box.innerHTML=`<div class="card info">📉 Ainda não há dados suficientes para uma análise confiável. É preciso ter pelo menos <b>2 sessões salvas</b> com o mesmo exercício (há ${a.total} sessão(ões) no histórico).</div>`;
    return;
  }
  box.innerHTML=
    a.divs.map(d=>`<div class="card"><div class="nm">Treino ${esc(d.tipo)}</div>
      <div class="info">${d.sessoes} sessão(ões)${d.sessoes>1?` • ${esc(d.ini.data)} → ${esc(d.fim.data)}`:''}</div>
      ${d.sessoes>1?`<div class="kv">${linhaComp('Duração do treino',d.ini.dur,d.fim.dur,'t',0)}</div>`:'<div class="info">Sessões insuficientes para comparar este treino.</div>'}</div>`).join('')
    +'<h2>Exercícios</h2>'
    +a.comp.map(c=>`<div class="card"><div class="nm">${esc(c.nome)}</div>
      <div class="info">Treino ${c.tipos.map(esc).join(', ')} • ${c.sessoes} sessões<br>1ª: ${esc(c.ini.data)} → última: ${esc(c.fim.data)}</div>
      <div class="kv">${METR.map(([k,l,u,dir])=>linhaComp(l,c.ini[k],c.fim[k],u,dir)).join('')}</div></div>`).join('')
    +(a.insuf.length?`<div class="card info">Sem histórico suficiente (só 1 sessão): ${a.insuf.map(esc).join(', ')}.</div>`:'');
}

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
  save(); render();
}
document.addEventListener('pointerup',soltar);
document.addEventListener('pointercancel',soltar);

// ===== Backup =====
async function compartilhar(obj,nome){
  const file=new File([JSON.stringify(obj,null,2)],nome,{type:'application/json'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file]}); return; }catch(e){ return; } }
  const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=nome; a.click();
}
function hoje(){ return new Date().toISOString().slice(0,10); }
function exportar(){ compartilhar(data,'treinos-'+hoje()+'.json'); }
function exportarHist(){ compartilhar({hist:data.hist},'historico-'+hoje()+'.json'); }
function importar(inp){
  const f=inp.files[0]; if(!f) return;
  f.text().then(t=>{ try{ const d=JSON.parse(t); if(!(d.A||d.divs)||!d.hist) throw 0;
    if(confirm('Substituir dados atuais pelo backup?')){ setData(d); save(); } }catch(e){ alert('Arquivo inválido (use o arquivo de "Exportar tudo")'); } inp.value=''; });
}

// ===== Cronômetro =====
let actx;
function beep(){ try{ [0,.3,.6].forEach(t=>{const o=actx.createOscillator();o.frequency.value=880;o.connect(actx.destination);o.start(actx.currentTime+t);o.stop(actx.currentTime+t+.2);}); if(navigator.vibrate)navigator.vibrate(500);}catch(e){} }
const decorrido=()=>tAcc+(tStart?Date.now()-tStart:0);
function startTimer(){
  try{ actx=actx||new (window.AudioContext||window.webkitAudioContext)(); actx.resume(); }catch(e){}
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
  const e=(data[cur]||[])[pos.i];
  $('iNome').textContent=fase==='fim'?'Treino '+cur+' concluído 🎉':(e?e.name:'Treino '+cur);
  $('iSub').textContent=fase==='fim'?'Toque em Encerrar'
    :rest?(over?'Descanso excedido +'+mmss(s-target):'Descanso • faltam '+mmss(Math.max(0,target-s)))+(pausado?' • pausado':'')
    :(e?'Série '+(pos.j+1)+'/'+e.sets:'')+(pausado?' • pausado':'');
  const p=fase==='fim'?1:rest?Math.min(s/target,1):ativo?(s%60)/60:0, a=$('anel');
  a.style.strokeDashoffset=100.5*(1-p);
  a.style.stroke=fase==='fim'?'#22c55e':over?'#ef4444':rest?'#facc15':pausado?'#f59e0b':'#3b82f6';
  if(over&&!beeped&&tStart){ beeped=true; beep(); }
}
