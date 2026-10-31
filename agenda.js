// ===== Agenda: dias de academia, check dos dias, sequência e exceções =====
const SEMANA=['D','S','T','Q','Q','S','S'];
const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let agMes=new Date(); agMes.setDate(1);
// Data local no formato AAAA-MM-DD (comparável como texto)
const dk=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
// Dia de uma sessão do histórico: usa ts; nas antigas (sem ts), lê o texto "dd/mm/aaaa"
function diaSessao(s){
  if(s&&s.ts) return dk(new Date(s.ts));
  const m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec((s&&s.data)||'');
  return m?m[3]+'-'+m[2]+'-'+m[1]:null;
}
const diasFeitos=()=>new Set((data.hist||[]).map(diaSessao).filter(Boolean));
// Conta os dias com treino voltando a partir de hoje.
// Só termina num dia planejado, já passado, sem treino e que não é exceção. Hoje nunca conta como falta.
function sequencia(f){
  if(!data.plano.length||!f.size) return 0;
  const ex=new Set(data.excecoes), min=[...f].sort()[0], d=new Date(); let n=0;
  for(let k=0;k<3650;k++){
    const key=dk(d); if(key<min) break;
    if(f.has(key)) n++;
    else if(k>0&&data.plano.includes(d.getDay())&&!ex.has(key)) break;
    d.setDate(d.getDate()-1);
  }
  return n;
}
function renderAgenda(){
  const box=$('agenda'); if(!box) return;
  if(!data.divs.length&&!data.hist.length){ box.innerHTML=''; return; }
  const f=diasFeitos(), ex=new Set(data.excecoes), hoje=dk(new Date()), seq=sequencia(f), min=[...f].sort()[0]||hoje;
  const y=agMes.getFullYear(), m=agMes.getMonth(), ini=new Date(y,m,1).getDay(), tot=new Date(y,m+1,0).getDate();
  let c=SEMANA.map(s=>`<b>${s}</b>`).join('')+'<span></span>'.repeat(ini);
  for(let i=1;i<=tot;i++){
    const d=new Date(y,m,i), k=dk(d), pl=data.plano.includes(d.getDay());
    const cl=f.has(k)?'feito':ex.has(k)?'exc':pl&&k<hoje&&k>=min?'falta':pl&&k>=hoje?'plan':'';
    c+=`<button class="${cl}${k===hoje?' hoje':''}" onclick="togExc('${k}')">${f.has(k)?ic('check'):i}</button>`;
  }
  box.innerHTML=`<div class="card">
    <div class="nm">${ic('flame')}Sequência: ${seq} dia(s)</div>
    ${data.plano.length?'':`<div class="info aviso">${ic('triangle-alert')}Escolha os dias de academia para contar a sequência.</div>`}
    <label>Dias de academia</label>
    <div class="chips sem">${SEMANA.map((s,i)=>`<button class="chip${data.plano.includes(i)?' on':''}" onclick="togPlano(${i})">${s}</button>`).join('')}</div>
    <div class="top" style="margin-top:12px">
      <button class="ic" aria-label="Mês anterior" onclick="agNav(-1)">${ic('chevron-left')}</button>
      <div class="nm">${MESES[m]} ${y}</div>
      <button class="ic" aria-label="Próximo mês" onclick="agNav(1)">${ic('chevron-right')}</button>
    </div>
    <div class="cal">${c}</div>
    <div class="cleg"><span><i class="d feito"></i>Concluído</span><span><i class="d plan"></i>Planejado</span><span><i class="d falta"></i>Faltou</span><span><i class="d exc"></i>Exceção</span></div>
    <div class="info">Toque numa data para marcar ou desmarcar como exceção. Exceções não quebram a sequência.</div>
  </div>`;
}
function togPlano(i){
  const p=data.plano, n=p.indexOf(i);
  n>=0?p.splice(n,1):p.push(i); p.sort((a,b)=>a-b);
  save(); renderAgenda();
}
function togExc(k){
  const e=data.excecoes, n=e.indexOf(k);
  n>=0?e.splice(n,1):e.push(k); e.sort();
  save(); renderAgenda();
}
function agNav(n){ agMes=new Date(agMes.getFullYear(),agMes.getMonth()+n,1); renderAgenda(); }

// ===== Comemoração ao salvar o treino (janela criada aqui, sem mexer no index.html) =====
function celebrar(tipo){
  let m=$('dlgCele');
  if(!m){
    m=document.createElement('div'); m.className='modal cele'; m.id='dlgCele';
    m.onclick=e=>{ if(e.target===m) fecharCele(); };
    document.body.appendChild(m);
  }
  const f=diasFeitos(), seq=sequencia(f), hoje=new Date(), dias=[];
  for(let k=6;k>=0;k--){ const d=new Date(hoje); d.setDate(d.getDate()-k); dias.push(d); }
  m.innerHTML=`<div class="box">
    <svg class="chk" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-15"/></svg>
    <div class="nm" style="justify-content:center">Treino ${esc(tipo)} concluído!</div>
    <div class="info">Dia ${hoje.toLocaleDateString('pt-BR')} marcado no calendário.</div>
    <div class="cseq">${ic('flame')}<b id="celeN">0</b><span>dia(s) de sequência</span></div>
    ${data.plano.length?'':`<div class="info aviso">${ic('triangle-alert')}Escolha os dias de academia na tela Início para contar a sequência.</div>`}
    <div class="csem">${dias.map((d,n)=>{ const k=dk(d), ok=f.has(k);
      return `<div class="${ok?'feito':''}" style="animation-delay:${(.6+n*.08).toFixed(2)}s"><small>${SEMANA[d.getDay()]}</small><span>${ok?ic('check'):d.getDate()}</span></div>`; }).join('')}</div>
    <button class="btn fin" onclick="fecharCele()">${ic('check')}Fechar</button>
  </div>`;
  m.classList.add('on');
  navigator.vibrate&&navigator.vibrate([30,60,30]);
  // Contador da sequência subindo de 0 até o valor atual
  const el=$('celeN'), t0=performance.now()+500, dur=Math.min(1200,200+seq*80);
  const passo=t=>{ const p=Math.max(0,Math.min(1,(t-t0)/dur)); el.textContent=Math.round(seq*p);
    if(p<1&&m.classList.contains('on')) requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
}
function fecharCele(){ const m=$('dlgCele'); if(m) m.classList.remove('on'); }

// ===== Manter a tela ligada durante o treino (vale só para este aparelho) =====
const WKEY='treinos_tela';
let wLock=null, wPed=false;
const telaLigada=()=>{ try{ return localStorage.getItem(WKEY)==='1'; }catch(e){ return false; } };
async function atualizarWake(){
  if(!('wakeLock' in navigator)) return;
  const quer=()=>telaLigada()&&sessao==='andamento'&&document.visibilityState==='visible';
  if(quer()&&!wLock&&!wPed){
    wPed=true;
    try{
      const l=await navigator.wakeLock.request('screen');
      l.addEventListener('release',()=>{ if(wLock===l) wLock=null; });
      wLock=l;
    }catch(e){ console.warn('Tela ligada:',e.message); }
    finally{ wPed=false; }
    if(wLock&&!quer()){ const l=wLock; wLock=null; l.release().catch(()=>{}); }
  } else if(!quer()&&wLock){ const l=wLock; wLock=null; l.release().catch(()=>{}); }
}
document.addEventListener('visibilitychange',atualizarWake);
function setTelaLigada(v){ try{ localStorage.setItem(WKEY,v?'1':'0'); }catch(e){} atualizarWake(); renderWakeUI(); }
function renderWakeUI(){
  const c=$('fWake'); if(!c) return;
  c.checked=telaLigada();
  $('wakeInfo').textContent='wakeLock' in navigator
    ?'A tela não apaga enquanto um treino estiver em andamento. Vale só para este aparelho.'
    :'Este navegador não permite manter a tela ligada.';
}
