const KEY='treinos_v1';
const LETRAS=['A','B','C','D','E'];
const VAZIO=()=>({divs:[],A:[],B:[],C:[],D:[],E:[],hist:[]});
let data=VAZIO(), cur='A', done={}, edit=-1, formDiv='A', fSer=[], pilha=[];
let tStart=null, tAcc=0, pausado=false, target=60, tInt=null, beeped=false;
let pos={i:0,j:0}, fase='serie';
let sessao='nao', sIni=null, sInt=null, sMsg='', aba='treino', agendada=false, telaAtual='telaLogin';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
// Série individual: w = peso, r = descanso, p = repetições (compatível com treinos antigos)
const serie=(e,j)=>{ const s=(e.series||[])[j]||{}; return {w:+(s.w??e.weight)||0, r:+(s.r??e.rest??60)||0, p:String(s.p??e.reps??'')}; };
const series=e=>Array.from({length:e.sets},(_,j)=>serie(e,j));
const faixa=a=>{ if(!a.length) return 0; const mn=Math.min(...a), mx=Math.max(...a); return mn===mx?mn:mn+'–'+mx; };
const lista=a=>a.every(x=>x===a[0])?(a[0]??''):a.join('/');
const info=e=>{ const s=series(e); return `${e.sets} séries • ${esc(lista(s.map(x=>x.p)))} reps • ${faixa(s.map(x=>x.w))} kg • ${faixa(s.map(x=>x.r))}s descanso`; };
const feita=v=>v!=null;
const linhaTempo=(j,t,d)=>`S${j+1} ${mmss(t)}${d!=null?` <span class="d">• desc ${mmss(d)}</span>`:''}`;
function divLabel(n){ const l=LETRAS.slice(0,n); return l.length>1?l.slice(0,-1).join(', ')+' e '+l.at(-1):l[0]; }

// ===== Ícones Lucide =====
const ic=(n,c='')=>`<i data-lucide="${n}"${c?` class="${c}"`:''}></i>`;
let icRaf=0;
function icons(){
  if(icRaf||!window.lucide) return;
  icRaf=requestAnimationFrame(()=>{ icRaf=0; if(document.querySelector('i[data-lucide]')) lucide.createIcons(); });
}
new MutationObserver(icons).observe(document.body,{childList:true,subtree:true});
icons();

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
function setTopo(txt,adm,icone){
  document.querySelectorAll('.uinfo').forEach(e=>e.innerHTML=txt?(icone?ic(icone):'')+esc(txt):'');
  document.querySelectorAll('.admOnly').forEach(e=>e.style.display=adm?(e.tagName==='BUTTON'?'flex':'block'):'none');
}
function sairDaSessao(){
  if(sessao==='andamento'&&!confirm('Há um treino em andamento. Sair vai descartá-lo sem salvar. Continuar?')) return false;
  resetSessao(); stopTimer(); fase='serie'; return true;
}
function irInicio(){ if(sairDaSessao()) tela('telaInicio'); }

function renderInicio(){
  $('listaTreinos').innerHTML=data.divs.length
    ?`<div class="aluno" onclick="abrirExec()"><div class="nm">${ic('clipboard-list')}Treino ${divLabel(data.divs.length)}</div>
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
      <div style="white-space:nowrap"><button class="ic" aria-label="Editar" onclick="openForm(${i},'${l}')">${ic('pencil')}</button><button class="ic" aria-label="Excluir" onclick="del(${i},'${l}')">${ic('trash-2')}</button></div></div>`).join('')
      ||'<div class="info">Nenhum exercício ainda.</div>'}
    <button class="btn add" onclick="openForm(-1,'${l}')">${ic('plus')}Adicionar exercício no Treino ${l}</button></div>`).join('')
    ||'<div class="info">Nenhuma divisão escolhida.</div>';
  $('selDiv').innerHTML=[1,2,3,4,5].map(n=>`<option value="${n}" ${n==(data.divs.length||1)?'selected':''}>${divLabel(n)}</option>`).join('');
  $('bCadIni').innerHTML=ic('play')+(sessao==='andamento'?'Voltar ao treino em andamento':'INICIAR TREINO');
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
const TITULOS={treino:['dumbbell','Meus Treinos'],hist:['history','Histórico'],analise:['trending-up','Análises'],catalogo:['book-open','Catálogo'],backup:['settings','Ajustes']};
function mudarAba(a){
  aba=a; ['treino','hist','analise','catalogo','backup'].forEach(x=>$('p_'+x).style.display=x===a?'block':'none');
  const [i,t]=TITULOS[a]||TITULOS.treino; $('tituloApp').innerHTML=ic(i)+t;
  render(); renderNav();
  if(a==='catalogo') renderCatalogo();
  if(a==='backup'){ window.atualizarNotifUI&&atualizarNotifUI(); window.renderPerfil&&renderPerfil(); }
  scrollTo(0,0);
}

// ===== Sessão =====
function resetSessao(){ clearInterval(sInt); sessao='nao'; sIni=null; sMsg=''; pilha=[]; }
function botaoSessao(){ sessao==='andamento'?$('dlgFim').classList.add('on'):iniciarSessao(); }
function iniciarSessao(){
  if(!(data[cur]||[]).length) return alert('Adicione exercícios ao Treino '+cur+' antes de iniciar.');
  Object.keys(done).filter(k=>k[0]===cur).forEach(k=>delete done[k]);
  pos={i:0,j:0}; fase='serie'; sessao='andamento'; sIni=Date.now(); pilha=[];
  clearInterval(sInt); sInt=setInterval(status,1000);
  startTimer(); render();
}
function encerrar(salvar){
  $('dlgFim').classList.remove('on');
  if(fase==='descanso'){ const v=(done[cur+pos.i]||[])[pos.j]; if(v) v.d=Math.floor(decorrido()/1000); }
  if(salvar){
    const ex=data[cur].map((e,i)=>{ const d=done[cur+i]||[];
      return {...e,series:series(e),feitas:d.filter(feita).length,
        tempos:Array.from({length:e.sets},(_,j)=>feita(d[j])?d[j].t:null),
        descansos:Array.from({length:e.sets},(_,j)=>feita(d[j])&&d[j].d!=null?d[j].d:null)}; });
    data.hist.push({tipo:cur,data:new Date().toLocaleString('pt-BR'),dur:Math.round((Date.now()-sIni)/1000),ex});
    save();
  }
  Object.keys(done).filter(k=>k[0]===cur).forEach(k=>delete done[k]);
  pos={i:0,j:0}; fase='serie'; stopTimer(); clearInterval(sInt); sIni=null; pilha=[];
  sessao='encerrado'; sMsg=salvar?ic('circle-check')+'Treino encerrado e salvo no histórico.':'Treino encerrado sem salvar.';
  render();
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
    for(let j=0;j<e.sets;j++){ const sj=serie(e,j);
      s+=`<span class="${feita(d[j])?'ok':''} ${on&&fase!=='fim'&&i==pos.i&&j==pos.j?'cur':''}">${esc(sj.p)||j+1}<small>${sj.w}kg</small></span>`; }
    const tp=d.map((v,j)=>feita(v)?linhaTempo(j,v.t,v.d):null).filter(Boolean).join('<br>');
    return `<div class="card" data-i="${i}"><div class="top"><div style="display:flex;align-items:center">
      <span class="drag">${ic('grip-vertical')}</span><div><div class="nm">${esc(e.name)}</div>
      <div class="info">${info(e)}</div></div></div>
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
function acao(){
  if(sessao!=='andamento') return aviso();
  const ex=data[cur]; if(!ex.length) return;
  if(fase==='serie'){
    guardar();
    const k=cur+pos.i; done[k]=done[k]||[]; done[k][pos.j]={t:Math.floor(decorrido()/1000),d:null};
    if(ultimaSerie()){ stopTimer(); fase='fim'; render(); return $('dlgFim').classList.add('on'); }
    const r=serie(ex[pos.i],pos.j).r; target=r>0?r:60; fase='descanso'; startTimer(); agendar(target);
  } else if(fase==='descanso'){
    guardar();
    const v=(done[cur+pos.i]||[])[pos.j]; if(v) v.d=Math.floor(decorrido()/1000);
    pos=proxima(); fase='serie'; startTimer();
  } else return $('dlgFim').classList.add('on');
  render();
}
function voltar(){
  if(sessao!=='andamento') return aviso();
  const s=pilha.pop(); if(!s) return;
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
    pilha=[];
    if(pos.i>i) pos.i--;
    else if(pos.i===i){ pos.j=0; fase='serie'; if(sessao==='andamento'&&data[cur].length) startTimer(); else stopTimer(); }
  }
  save(); renderAll();
}
// wm = peso editado manualmente (não é sobrescrito pelo preenchimento automático)
function lerSeries(){
  document.querySelectorAll('#fSeries .srow').forEach((r,j)=>{
    fSer[j]={...fSer[j], p:r.querySelector('.p').value.trim(),
      w:parseFloat(r.querySelector('.w').value), r:parseInt(r.querySelector('.r').value,10)};
  });
}
function gerarSeries(){
  lerSeries();
  const n=+$('fs').value, ok=Number.isInteger(n)&&n>=1&&n<=20;
  $('fs').classList.toggle('inv',!ok);
  $('fErr').textContent=ok?'':'Informe de 1 a 20 séries.';
  if(!ok) return;
  while(fSer.length<n) fSer.push({...(fSer.at(-1)||{w:0,r:60,p:'12'}),wm:false});
  $('fSeries').innerHTML=fSer.slice(0,n).map((s,j)=>`<div class="srow"><span>${j+1}</span>
    <input class="p" inputmode="text" placeholder="12" value="${esc(s.p)}">
    <input class="w" type="number" inputmode="decimal" step="0.5" min="0" value="${Number.isFinite(s.w)?s.w:''}">
    <input class="r" type="number" inputmode="numeric" min="0" value="${Number.isFinite(s.r)?s.r:''}"></div>`).join('');
}
// Peso da 1ª série replica nas seguintes que ainda não foram editadas à mão
function autoPeso(ev){
  const t=ev.target; if(!t.classList.contains('w')) return;
  const rows=[...document.querySelectorAll('#fSeries .srow')], j=rows.indexOf(t.closest('.srow'));
  if(j>0){ fSer[j]={...fSer[j],wm:true}; return; }
  rows.slice(1).forEach((r,k)=>{ if(!fSer[k+1]?.wm) r.querySelector('.w').value=t.value; });
  lerSeries();
}
function openForm(i=-1,dv=cur){
  edit=i; formDiv=dv; const e=i>=0?data[dv][i]:{name:'',sets:3,reps:'12',weight:0,rest:60};
  $('ftitle').textContent=(i>=0?'Editar':'Novo')+' exercício — Treino '+dv;
  $('fn').value=e.name; $('fs').value=e.sets;
  const s=series(e); fSer=s.map((x,j)=>({...x,wm:j>0&&x.w!==s[0].w}));
  $('fSeries').innerHTML=''; gerarSeries();
  $('modal').classList.add('on');
}
function closeForm(){ $('modal').classList.remove('on'); }
function saveForm(){
  const n=+$('fs').value;
  if(!(Number.isInteger(n)&&n>=1&&n<=20)) return $('fErr').textContent='Informe de 1 a 20 séries.';
  lerSeries();
  const ser=fSer.slice(0,n), bad=ser.findIndex(s=>numReps(s.p)==null||!(s.w>=0)||!(s.r>=0));
  if(bad>=0) return $('fErr').textContent=`Série ${bad+1}: informe as repetições (ex: 12 ou 10-12), e peso e descanso maiores ou iguais a 0.`;
  const sr=ser.map(({w,r,p})=>({w,r,p}));
  const e={name:$('fn').value.trim()||'Exercício',sets:n,reps:lista(sr.map(s=>s.p)),series:sr,weight:sr[0].w,rest:sr[0].r};
  edit>=0?data[formDiv][edit]=e:data[formDiv].push(e);
  if(formDiv===cur) pilha=[];
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
  $('hist').innerHTML=it.map(({h,k})=>`<div class="card"><div class="top"><div><b>Treino ${esc(h.tipo)}</b> — ${esc(h.data)}${h.dur?' • '+ic('clock')+mmss(h.dur):''}</div>
    <button class="ic" aria-label="Apagar" onclick="delHist(${k})">${ic('trash-2')}</button></div>
    ${(h.ex||[]).map(e=>{ const tp=(e.tempos||[]).map((t,j)=>feita(t)?linhaTempo(j,t,(e.descansos||[])[j]):null).filter(Boolean).join('<br>');
      const s=series(e);
      return `<div>• ${esc(e.name)}: ${e.feitas}/${e.sets} séries x${esc(lista(s.map(x=>x.p)))} @ ${faixa(s.map(x=>x.w))}kg${tp?`<div class="tempos" style="margin:2px 0 0 12px">${ic('timer')}${tp}</div>`:''}</div>`; }).join('')}</div>`).join('')
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
      const idx=(e.tempos||[]).map((t,j)=>feita(t)?j:-1).filter(j=>j>=0);
      const js=idx.length?idx:Array.from({length:e.feitas},(_,j)=>j);
      const ss=js.map(j=>serie(e,j)), ws=ss.map(s=>s.w), rs=ss.map(s=>numReps(s.p));
      const okR=rs.every(x=>x!=null);
      (ex[key]=ex[key]||{nome,s:[]}).s.push({k,data:h.data,tipo:h.tipo,peso:Math.max(...ws),
        reps:okR?Math.round(rs.reduce((a,b)=>a+b,0)/rs.length*10)/10:null,series:e.feitas,
        volume:okR?Math.round(ss.reduce((a,s,n)=>a+s.w*rs[n],0)):null,tSerie:media(e.tempos),tDesc:media(e.descansos)});
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
const METR=[['peso','Peso máximo','kg',1],['reps','Repetições médias (meta)','',1],['series','Séries concluídas','',1],
  ['volume','Volume (Σ peso×reps)','kg',1],['tSerie','Tempo médio por série','t',0],['tDesc','Descanso médio','t',-1]];
function linhaComp(lbl,a,b,u,dir){
  if(a==null||b==null) return '';
  const f=v=>u==='t'?mmss(v):(Math.round(v*10)/10)+(u?' '+u:'');
  const d=b-a, c=!d||!dir?'eq':(d*dir>0?'up':'dn');
  const i=!d?'equal':c==='eq'?'minus':c==='up'?'arrow-up':'arrow-down';
  return `<div><span>${lbl}</span><b class="${c}">${f(a)} → ${f(b)} ${ic(i)}</b></div>`;
}
function renderAnalise(){
  const a=calcAnalise(), box=$('anLista'), ok=a.comp.length>0;
  $('bIA').disabled=!ok;
  if(!ok){
    box.innerHTML=`<div class="card info">${ic('trending-down')}Ainda não há dados suficientes para uma análise confiável. É preciso ter pelo menos <b>2 sessões salvas</b> com o mesmo exercício (há ${a.total} sessão(ões) no histórico).</div>`;
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
  pilha=[];
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

// ===== Catálogo =====
const GRUPOS={peito:'Peito',costas:'Costas',ombros:'Ombros',biceps:'Bíceps',triceps:'Tríceps',pernas:'Pernas',gluteos:'Glúteos',panturrilha:'Panturrilha',abdomen:'Abdômen',antebraco:'Antebraço'};
const optGrupos=()=>Object.entries(GRUPOS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
let catalogo=[], catEdit=null;
function setCatalogo(l){ catalogo=l||[]; renderCatalogo(); }
function renderCatalogo(){
  const adm=!!window.souAdmin?.();
  $('bNovoCat').style.display=adm?'flex':'none';
  $('dlCat').innerHTML=catalogo.map(c=>`<option value="${esc(c.nome)}">`).join('');
  const sel=$('fGrupo'), g=sel.value, q=$('buscaCat').value.toLowerCase();
  sel.innerHTML='<option value="">Todos os grupos</option>'+optGrupos(); sel.value=g;
  const it=catalogo.filter(c=>(!g||c.grupo===g||c.secundarios.includes(g))&&c.nome.toLowerCase().includes(q));
  $('catLista').innerHTML=it.map(c=>`<div class="card"${adm?` onclick="abrirCat('${c.id}')" style="cursor:pointer"`:''}>
    <div class="nm">${esc(c.nome)}</div>
    <div class="info"><b>${GRUPOS[c.grupo]||esc(c.grupo)}</b>${c.secundarios.length?' • '+c.secundarios.map(s=>GRUPOS[s]||esc(s)).join(', '):''}</div>
    ${c.descricao?`<div class="info">${esc(c.descricao)}</div>`:''}</div>`).join('')
    ||'<div class="info">Nenhum exercício encontrado.</div>';
}
// Lista de grupos secundários (seleção múltipla)
const secSelecionados=()=>[...$('cSec').selectedOptions].map(o=>o.value);
function syncSec(){
  const g=$('cGrupo').value;
  [...$('cSec').options].forEach(o=>{ o.disabled=o.value===g; if(o.disabled) o.selected=false; });
  const n=secSelecionados().length;
  $('cSecInfo').textContent=n?n+' grupo(s) selecionado(s): '+secSelecionados().map(k=>GRUPOS[k]).join(', ')
    :'Toque para selecionar um ou mais grupos.';
}
// No computador: um clique marca/desmarca, sem precisar segurar Ctrl
$('cSec').addEventListener('mousedown',e=>{
  const o=e.target; if(o.tagName!=='OPTION'||o.disabled) return;
  e.preventDefault();
  const sc=$('cSec').scrollTop;
  o.selected=!o.selected;
  $('cSec').focus(); $('cSec').scrollTop=sc;
  syncSec();
});
$('cSec').addEventListener('change',syncSec);
function abrirCat(id){
  const c=catalogo.find(x=>x.id===id)||{nome:'',grupo:'peito',secundarios:[],descricao:''};
  catEdit=id||null;
  $('cTitle').textContent=id?'Editar exercício':'Novo exercício';
  $('cNome').value=c.nome; $('cDesc').value=c.descricao;
  $('cGrupo').innerHTML=optGrupos(); $('cGrupo').value=c.grupo;
  $('cSec').innerHTML=optGrupos();
  [...$('cSec').options].forEach(o=>o.selected=c.secundarios.includes(o.value));
  syncSec();
  $('cDel').style.display=id?'flex':'none'; $('cErr').textContent='';
  $('modalCat').classList.add('on');
}
async function salvarCat(){
  const g=$('cGrupo').value;
  const ex={nome:$('cNome').value.trim(),grupo:g,descricao:$('cDesc').value.trim(),
    secundarios:secSelecionados().filter(v=>v!==g)};
  if(!ex.nome) return $('cErr').textContent='Informe o nome.';
  try{ await window.salvarExercicio(ex,catEdit); $('modalCat').classList.remove('on'); }
  catch(e){ $('cErr').textContent='Erro: '+e.message; }
}
async function excluirCat(){
  if(!catEdit||!confirm('Excluir este exercício do catálogo?')) return;
  try{ await window.excluirExercicio(catEdit); $('modalCat').classList.remove('on'); }
  catch(e){ alert('Erro: '+e.message); }
}
