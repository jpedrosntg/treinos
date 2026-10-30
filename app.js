const KEY='treinos_v1';
const LETRAS=['A','B','C','D','E'];
const VAZIO=()=>({divs:[],A:[],B:[],C:[],D:[],E:[],hist:[]});
let data=VAZIO(), cur='A', done={}, edit=-1, formDiv='A', fSer=[], pilha=[];
let tStart=null, tAcc=0, pausado=false, target=60, tInt=null, beeped=false;
let pos={i:0,j:0}, fase='serie', pend=null;
let sessao='nao', sIni=null, sInt=null, sMsg='', aba='treino', agendada=false, telaAtual='telaLogin';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
// Identificador único de sessão (usado também pelo firebase.js)
const novoId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
// Nome normalizado: sem acentos, minúsculo e com espaços simples (para comparar nomes)
const normNome=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
// Série individual: w = peso, r = descanso, p = repetições (compatível com treinos antigos)
const serie=(e,j)=>{ const s=(e.series||[])[j]||{}; return {w:+(s.w??e.weight)||0, r:+(s.r??e.rest??60)||0, p:String(s.p??e.reps??'')}; };
const series=e=>Array.from({length:e.sets},(_,j)=>serie(e,j));
const faixa=a=>{ if(!a.length) return 0; const mn=Math.min(...a), mx=Math.max(...a); return mn===mx?mn:mn+'–'+mx; };
const lista=a=>a.every(x=>x===a[0])?(a[0]??''):a.join('/');
const info=e=>{ const s=series(e); return `${e.sets} séries • ${esc(lista(s.map(x=>x.p)))} reps • ${faixa(s.map(x=>x.w))} kg • ${faixa(s.map(x=>x.r))}s descanso`; };
const feita=v=>v!=null;
const linhaTempo=(j,t,d)=>`S${j+1} ${mmss(t)}${d!=null?` <span class="d">• desc ${mmss(d)}</span>`:''}`;
function divLabel(n){ const l=LETRAS.slice(0,n); return l.length>1?l.slice(0,-1).join(', ')+' e '+l.at(-1):l[0]; }
// Etiqueta de aquecimento (exercício que fica no histórico, mas não entra nas análises)
const tagAq=e=>e&&e.aq?`<div class="info">${ic('flame')}Aquecimento • fora das análises</div>`:'';

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
  anSel=null; anDiv=null;
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
    ${data[l].map((e,i)=>`<div class="top item"><div><div>${esc(e.name)}</div><div class="info">${info(e)}</div>${tagAq(e)}${avisoFora(e)}</div>
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
// Preenchimento automático das séries no modal (chamado pelo oninput de #fSeries):
// • Repetições (.p) e descanso (.r): o valor digitado numa série vai para TODAS as séries seguintes.
//   As séries anteriores não mudam. Cada campo é independente e os outros dados da série ficam iguais.
// • Peso (.w): o da 1ª série vai para as seguintes que ainda não foram editadas à mão (wm).
function autoPeso(ev){
  const t=ev.target, row=t.closest('.srow'); if(!row) return;
  const rows=[...document.querySelectorAll('#fSeries .srow')], j=rows.indexOf(row); if(j<0) return;
  const campo=['p','r'].find(c=>t.classList.contains(c));
  if(campo){
    rows.slice(j+1).forEach(r=>{ r.querySelector('.'+campo).value=t.value; });
    lerSeries();
    // Séries escondidas (ao reduzir o número de séries) também recebem o valor
    const v=campo==='p'?t.value.trim():parseInt(t.value,10);
    for(let k=rows.length;k<fSer.length;k++) fSer[k]={...fSer[k],[campo]:v};
    return;
  }
  if(!t.classList.contains('w')) return;
  if(j>0){ fSer[j]={...fSer[j],wm:true}; return; }
  rows.slice(1).forEach((r,k)=>{ if(!fSer[k+1]?.wm) r.querySelector('.w').value=t.value; });
  lerSeries();
}
function openForm(i=-1,dv=cur){
  edit=i; formDiv=dv; const e=i>=0?data[dv][i]:{name:'',sets:3,reps:'12',weight:0,rest:60};
  $('ftitle').textContent=(i>=0?'Editar':'Novo')+' exercício — Treino '+dv;
  $('fn').value=e.name; $('fs').value=e.sets;
  const aq=$('fAq'); if(aq) aq.checked=!!e.aq;
  const s=series(e); fSer=s.map((x,j)=>({...x,wm:j>0&&x.w!==s[0].w}));
  $('fSeries').innerHTML=''; gerarSeries();
  const sg=$('fnSug'); if(sg) sg.style.display='none';
  avisoNome();
  $('modal').classList.add('on');
}
function closeForm(){ $('modal').classList.remove('on'); }
function saveForm(){
  const n=+$('fs').value;
  if(!(Number.isInteger(n)&&n>=1&&n<=20)) return $('fErr').textContent='Informe de 1 a 20 séries.';
  // Nome obrigatório do catálogo (alunos e admin)
  if(!catalogo.length) return $('fErr').textContent='O catálogo de exercícios está vazio ou ainda não carregou. Tente de novo em alguns segundos.';
  const c=catAcha($('fn').value);
  if(!c) return $('fErr').textContent='Escolha um nome da lista do catálogo para salvar.';
  lerSeries();
  const ser=fSer.slice(0,n), bad=ser.findIndex(s=>numReps(s.p)==null||!(s.w>=0)||!(s.r>=0));
  if(bad>=0) return $('fErr').textContent=`Série ${bad+1}: informe as repetições (ex: 12 ou 10-12), e peso e descanso maiores ou iguais a 0.`;
  const sr=ser.map(({w,r,p})=>({w,r,p}));
  const e={name:c.nome,sets:n,reps:lista(sr.map(s=>s.p)),series:sr,weight:sr[0].w,rest:sr[0].r};
  if($('fAq')?.checked) e.aq=true;
  // Guarda o nome antigo, se o exercício foi renomeado
  const ant=edit>=0?data[formDiv][edit]:null;
  if(ant){ const orig=ant.nomeOriginal??(ant.name!==c.nome?ant.name:null); if(orig!=null) e.nomeOriginal=orig; }
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
// Celular: menu de compartilhar (se disponível). Computador: download direto.
const ehMovel=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
function baixar(blob,nome){
  const u=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=u; a.download=nome; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ a.remove(); URL.revokeObjectURL(u); },2000);
}
async function compartilhar(obj,nome){
  let blob;
  try{ blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}); }
  catch(e){ return alert('Erro ao gerar o backup: '+e.message); }
  if(ehMovel()&&navigator.canShare){
    try{
      const file=new File([blob],nome,{type:'application/json'});
      if(navigator.canShare({files:[file]})){ await navigator.share({files:[file]}); return; }
    }catch(e){ if(e.name==='AbortError') return; } // cancelado pelo usuário
  }
  try{ baixar(blob,nome); }catch(e){ alert('Erro ao baixar o backup: '+e.message); }
}
function hoje(){ return new Date().toISOString().slice(0,10); }
function exportar(){ compartilhar(data,'treinos-'+hoje()+'.json'); }
function exportarHist(){ compartilhar({hist:data.hist},'historico-'+hoje()+'.json'); }
function importar(inp){
  const f=inp&&inp.files&&inp.files[0]; if(!f) return;
  f.text().then(t=>{
    inp.value='';
    let d;
    try{ d=JSON.parse(t); if(!d||!(d.A||d.divs)) throw 0; }
    catch(e){ return alert('Arquivo inválido (use o arquivo de "Exportar tudo").'); }
    if(!Array.isArray(d.hist)) d.hist=[];
    if(sessao==='andamento') return alert('Encerre o treino em andamento antes de importar.');
    if(!confirm(`Substituir dados atuais pelo backup?\n• ${d.hist.length} sessão(ões) no histórico`)) return;
    setData(d); save();
    alert('Backup importado.');
  }).catch(e=>{ inp.value=''; alert('Não foi possível ler o arquivo: '+e.message); });
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
const GRUPOS={peito:'Peito',costas:'Costas',ombros:'Ombros',trapezio:'Trapézio',biceps:'Bíceps',triceps:'Tríceps',pernas:'Pernas',gluteos:'Glúteos',panturrilha:'Panturrilha',abdomen:'Abdômen',antebraco:'Antebraço'};
const optGrupos=()=>Object.entries(GRUPOS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('');
let catalogo=[], catEdit=null;
// Procura no catálogo pelo nome (sem diferenciar maiúsculas, acentos e espaços)
const catAcha=n=>{ const k=normNome(n); return k?catalogo.find(c=>normNome(c.nome)===k)||null:null; };
// Aviso nos cartões: exercício com nome fora do catálogo
const avisoFora=e=>catalogo.length&&!catAcha(e.name)?`<div class="info aviso">${ic('triangle-alert')}Fora do catálogo — edite e escolha um nome da lista</div>`:'';
function setCatalogo(l){ catalogo=l||[]; renderCatalogo(); renderAll(); }
function renderCatalogo(){
  const adm=!!window.souAdmin?.();
  ['bNovoCat','bImpCat','bPadr'].forEach(id=>{ const b=$(id); if(b) b.style.display=adm?'flex':'none'; });
  const dl=$('dlCat'); if(dl) dl.innerHTML='';
  const sel=$('fGrupo'), g=sel.value, q=normNome($('buscaCat').value);
  sel.innerHTML='<option value="">Todos os grupos</option>'+optGrupos(); sel.value=g;
  const it=catalogo.filter(c=>(!g||c.grupo===g||c.secundarios.includes(g))&&normNome(c.nome).includes(q));
  $('catLista').innerHTML=it.map(c=>`<div class="card"${adm?` onclick="abrirCat('${c.id}')" style="cursor:pointer"`:''}>
    <div class="nm">${esc(c.nome)}</div>
    <div class="info"><b>${GRUPOS[c.grupo]||esc(c.grupo)}</b>${c.secundarios.length?' • '+c.secundarios.map(s=>GRUPOS[s]||esc(s)).join(', '):''}</div>
    ${c.descricao?`<div class="info">${esc(c.descricao)}</div>`:''}</div>`).join('')
    ||'<div class="info">Nenhum exercício encontrado.</div>';
}

// Campo "Nome" do exercício: lista de sugestões do catálogo (cria os elementos se faltarem)
(function prepNome(){
  const f=$('fn'); if(!f) return;
  f.removeAttribute('list'); f.setAttribute('autocomplete','off'); f.placeholder='Busque no catálogo (ex: Supino reto)';
  f.addEventListener('input',sugerir); f.addEventListener('focus',sugerir);
  if(!$('fnSug')){ const s=document.createElement('div'); s.id='fnSug'; s.className='sug'; s.style.display='none'; f.after(s); }
  if(!$('fnAviso')){ const a=document.createElement('div'); a.id='fnAviso'; a.className='info aviso'; $('fnSug').after(a); }
})();
function sugerir(){
  const box=$('fnSug'); if(!box) return;
  const q=normNome($('fn').value);
  const it=catalogo.filter(c=>!q||normNome(c.nome).includes(q)).slice(0,8);
  box.innerHTML=it.map(c=>`<button type="button" onclick="escolherNome('${c.id}')">${esc(c.nome)}<small>${esc(GRUPOS[c.grupo]||c.grupo)}</small></button>`).join('')
    ||`<div class="info">${catalogo.length?'Nenhum exercício do catálogo com esse nome.':'O catálogo está vazio.'}</div>`;
  box.style.display='block';
  avisoNome();
}
function escolherNome(id){
  const c=catalogo.find(x=>x.id===id); if(!c) return;
  $('fn').value=c.nome; $('fnSug').style.display='none'; $('fErr').textContent=''; avisoNome();
}
function avisoNome(){
  const a=$('fnAviso'); if(!a) return;
  const v=$('fn').value.trim(), c=catAcha(v);
  a.innerHTML=!v?'':c?ic('circle-check')+'Exercício do catálogo • '+esc(GRUPOS[c.grupo]||c.grupo)
    :ic('triangle-alert')+'Este nome não está no catálogo. Escolha um nome da lista para poder salvar.';
  a.classList.toggle('ok',!!c);
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
  const ex={nome:$('cNome').value.trim().replace(/\s+/g,' '),grupo:g,descricao:$('cDesc').value.trim(),
    secundarios:secSelecionados().filter(v=>v!==g)};
  if(!ex.nome) return $('cErr').textContent='Informe o nome.';
  const igual=catAcha(ex.nome);
  if(igual&&igual.id!==catEdit) return $('cErr').textContent='Já existe um exercício com esse nome no catálogo.';
  try{ await window.salvarExercicio(ex,catEdit); $('modalCat').classList.remove('on'); }
  catch(e){ $('cErr').textContent='Erro: '+e.message; }
}
async function excluirCat(){
  if(!catEdit||!confirm('Excluir este exercício do catálogo?')) return;
  try{ await window.excluirExercicio(catEdit); $('modalCat').classList.remove('on'); }
  catch(e){ alert('Erro: '+e.message); }
}

// ===== Importar catálogo (admin) =====
// Aceita uma lista JSON: [{"nome":"Supino reto","grupo":"peito","secundarios":["triceps"],"descricao":"..."}]
// Nome que já existe no catálogo é atualizado; campos ausentes no arquivo são mantidos.
const grupoKey=v=>{ const n=normNome(v); return n?Object.keys(GRUPOS).find(k=>k===n||normNome(GRUPOS[k])===n)||null:null; };
function importarCat(inp){
  const f=inp.files[0]; if(!f) return;
  f.text().then(async t=>{
    inp.value='';
    if(!window.souAdmin?.()) return alert('Recurso disponível apenas para o administrador.');
    if(!window.importarCatalogo) return alert('Atualize também o firebase.js para usar a importação.');
    let lista;
    try{ const d=JSON.parse(t); lista=Array.isArray(d)?d:d.exercicios; if(!Array.isArray(lista)) throw 0; }
    catch(e){ return alert('Arquivo inválido. Use uma lista em JSON, por exemplo:\n[{"nome":"Supino reto","grupo":"peito","secundarios":["triceps"],"descricao":"..."}]'); }
    const itens=[], erros=[], vistos=new Set();
    lista.forEach((x,n)=>{
      const nome=String(x?.nome||'').trim().replace(/\s+/g,' '), g=grupoKey(x?.grupo);
      if(!nome) return erros.push('Item '+(n+1)+': sem nome');
      if(!g) return erros.push(nome+': grupo "'+(x?.grupo??'')+'" inválido');
      const k=normNome(nome); if(vistos.has(k)) return erros.push(nome+': repetido no arquivo'); vistos.add(k);
      const ant=catAcha(nome);
      const secundarios=Array.isArray(x.secundarios)?[...new Set(x.secundarios.map(grupoKey).filter(s=>s&&s!==g))]
        :(ant?ant.secundarios.filter(s=>s!==g):[]);
      const descricao=typeof x.descricao==='string'?x.descricao.trim():(ant?.descricao||'');
      itens.push({id:ant?ant.id:null,ex:{nome,grupo:g,secundarios,descricao}});
    });
    const novos=itens.filter(x=>!x.id).length, atual=itens.length-novos;
    if(!itens.length) return alert('Nenhum exercício válido no arquivo.\n'+erros.slice(0,10).join('\n'));
    if(!confirm(`Importar catálogo?\n• ${novos} novo(s)\n• ${atual} atualizado(s) (nome já existia)\n• ${erros.length} ignorado(s)`
      +(erros.length?'\n\n'+erros.slice(0,10).join('\n')+(erros.length>10?'\n...':''):''))) return;
    try{ await window.importarCatalogo(itens); alert('Catálogo importado: '+novos+' novo(s) e '+atual+' atualizado(s).'); }
    catch(e){ alert('Erro na importação: '+e.message+'\nO que já foi gravado continua salvo. Pode importar o mesmo arquivo de novo.'); }
  });
}

// ===== Padronizar nomes (admin) =====
// Troca só o nome dos exercícios do treino e do histórico do aluno aberto.
// Guarda o nome antigo em "nomeOriginal". Nunca junta dois exercícios diferentes no mesmo treino ou sessão
// (aquecimento e exercício de trabalho com o mesmo nome podem conviver).
let padCand=[];
function contarNomes(){
  const m=new Map();
  const add=(e,tipo)=>{ const n=String(e?.name||'').trim(); if(!n) return; const k=normNome(n);
    const o=m.get(k)||{k,nome:n,treino:0,hist:0,cat:catAcha(n),dif:false};
    o[tipo]++; if(!o.cat||n!==o.cat.nome) o.dif=true; m.set(k,o); };
  LETRAS.forEach(l=>(data[l]||[]).forEach(e=>add(e,'treino')));
  data.hist.forEach(h=>(h.ex||[]).forEach(e=>add(e,'hist')));
  return [...m.values()];
}
const palavras=s=>normNome(s).split(' ').filter(w=>w.length>2);
function parecidos(n){
  const p=new Set(palavras(n));
  return catalogo.map(c=>({c,s:palavras(c.nome).filter(w=>p.has(w)).length})).filter(x=>x.s>0)
    .sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.c);
}
function abrirPadronizar(){
  if(!window.souAdmin?.()) return alert('Recurso disponível apenas para o administrador.');
  if(sessao==='andamento') return alert('Encerre o treino em andamento antes de padronizar os nomes.');
  if(!catalogo.length) return alert('O catálogo está vazio.');
  padCand=contarNomes().filter(o=>o.dif).sort((a,b)=>a.nome.localeCompare(b.nome));
  $('padLista').innerHTML=padCand.length?padCand.map((o,i)=>{
    const par=o.cat?[]:parecidos(o.nome);
    const op=c=>`<option value="${esc(c.id)}"${o.cat&&o.cat.id===c.id?' selected':''}>${esc(c.nome)}</option>`;
    return `<div class="padrow"><div><b>${esc(o.nome)}</b><div class="info">Treino atual: ${o.treino} • Histórico: ${o.hist}${o.cat?' • só muda a escrita':''}</div></div>
      <select data-i="${i}"><option value="">Não alterar</option>${par.length?`<optgroup label="Parecidos">${par.map(op).join('')}</optgroup><optgroup label="Catálogo">${catalogo.map(op).join('')}</optgroup>`:catalogo.map(op).join('')}</select></div>`;
  }).join(''):`<div class="info">${ic('circle-check')}Todos os nomes já estão iguais aos do catálogo.</div>`;
  $('padErr').textContent='';
  $('modalPad').classList.add('on');
}
// Aplica as trocas em uma lista (exercícios de um treino ou de uma sessão). Retorna quantos nomes mudaram.
// A chave de conflito inclui "aq": aquecimento e trabalho são grupos separados.
function padLista(arr,mapa,onde,conflitos){
  const nm=e=>String(e?.name||'').trim();
  const ch=(i,n)=>normNome(n)+(arr[i]&&arr[i].aq?'|aq':'');
  const fin=arr.map(e=>{ const n=nm(e); return n?(mapa.get(normNome(n))??n):n; });
  let mudou=true;
  while(mudou){
    mudou=false; const g=new Map();
    arr.forEach((e,i)=>{ if(!normNome(fin[i])) return; const k=ch(i,fin[i]); if(!g.has(k)) g.set(k,[]); g.get(k).push(i); });
    g.forEach(ix=>{
      if(new Set(ix.map(i=>ch(i,nm(arr[i])))).size<2) return;
      ix.forEach(i=>{ if(fin[i]!==nm(arr[i])){ fin[i]=nm(arr[i]); mudou=true; conflitos.add(onde+': '+nm(arr[i])); } });
    });
  }
  let n=0;
  arr.forEach((e,i)=>{ if(!e||!nm(e)||fin[i]===nm(e)) return; if(e.nomeOriginal==null) e.nomeOriginal=e.name; e.name=fin[i]; n++; });
  return n;
}
function aplicarPadronizar(){
  if(sessao==='andamento') return $('padErr').textContent='Encerre o treino em andamento antes.';
  const mapa=new Map();
  $('padLista').querySelectorAll('select').forEach(s=>{ const o=padCand[+s.dataset.i], c=catalogo.find(x=>x.id===s.value); if(o&&c) mapa.set(o.k,c.nome); });
  if(!mapa.size) return $('padErr').textContent='Nenhuma troca escolhida.';
  if(!confirm(`Trocar ${mapa.size} nome(s) no treino e no histórico deste aluno?\n\nSó o nome muda. Séries, cargas, tempos e datas ficam iguais, e o nome antigo fica guardado.\nRecomendado: toque em "Baixar backup antes" se ainda não fez.`)) return;
  const conflitos=new Set(); let nT=0, nH=0; const mud=[];
  LETRAS.forEach(l=>{ nT+=padLista(data[l]||[],mapa,'Treino '+l,conflitos); });
  data.hist.forEach(h=>{ const n=padLista(h.ex||[],mapa,'Histórico '+h.tipo+' '+String(h.data).split(',')[0],conflitos); if(n){ nH+=n; mud.push(h); } });
  if(nT||nH){ save(); if(mud.length&&window.atualizarSessoes) window.atualizarSessoes(mud); }
  $('modalPad').classList.remove('on');
  anSel=null; renderAll();
  alert(`Padronização concluída.\n• Treino: ${nT} nome(s) trocado(s)\n• Histórico: ${nH} nome(s) em ${mud.length} sessão(ões)`
    +(conflitos.size?`\n\nNão trocados para não juntar exercícios diferentes:\n${[...conflitos].slice(0,10).join('\n')}${conflitos.size>10?'\n...':''}\n\nDica: se um deles é aquecimento, marque-o no histórico (ícone de chama) e padronize de novo.`:''));
}
