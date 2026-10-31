// ===== Agenda: dias de academia, check dos dias, dias de foco e exceções (aba Ajustes) =====
const SEMANA=['D','S','T','Q','Q','S','S'];
const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let agMes=new Date(); agMes.setDate(1);
let agAberto=false;   // configurações recolhidas por padrão
let celeFeita=null;   // id da última sessão comemorada (evita janela duplicada)
let celeBlob=null;    // imagem da janela pronta para compartilhar
// Data local no formato AAAA-MM-DD (comparável como texto)
const dk=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
// Dia de uma sessão do histórico: usa ts; nas antigas (sem ts), lê o texto "dd/mm/aaaa"
function diaSessao(s){
  if(s&&s.ts) return dk(new Date(s.ts));
  const m=/^(\d{2})\/(\d{2})\/(\d{4})/.exec((s&&s.data)||'');
  return m?m[3]+'-'+m[2]+'-'+m[1]:null;
}
const diasFeitos=()=>new Set((data.hist||[]).map(diaSessao).filter(Boolean));
// Dias de foco: conta os dias com treino voltando a partir de hoje.
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
// Dias da semana atual, de segunda a domingo
function semanaAtual(){
  const h=new Date(); h.setHours(0,0,0,0);
  const s=new Date(h); s.setDate(h.getDate()-(h.getDay()+6)%7);
  return Array.from({length:7},(_,i)=>{ const d=new Date(s); d.setDate(s.getDate()+i); return d; });
}
// Estado de cada dia da semana (usado na tela e na imagem compartilhada)
function diasSemana(f){
  const hoje=dk(new Date()), ex=new Set(data.excecoes);
  return semanaAtual().map(d=>{ const k=dk(d), ok=f.has(k);
    return {l:SEMANA[d.getDay()], ok, cl:ok?'feito':ex.has(k)?'exc':data.plano.includes(d.getDay())?'plan':'', hoje:k===hoje}; });
}
// Resumo semanal (Ajustes e janela ao salvar): só a letra do dia em cima e o círculo (check se treinou)
function resumoSemana(f,anim){
  return `<div class="csem${anim?'':' fixo'}">${diasSemana(f).map((d,n)=>
    `<div class="${d.cl}${d.hoje?' hoje':''}"${anim?` style="animation-delay:${(.6+n*.08).toFixed(2)}s"`:''}><small>${d.l}</small><span>${d.ok?ic('check'):''}</span></div>`
  ).join('')}</div>`;
}
const avisoPlano=()=>data.plano.length?'':`<div class="info aviso">${ic('triangle-alert')}Escolha os dias de academia para contar os dias de foco.</div>`;
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
    <div class="nm">${ic('calendar-check')}Sua semana</div>
    <div class="cseq">${ic('flame')}<b>${seq}</b><span>dia(s) de foco</span></div>
    ${avisoPlano()}
    ${resumoSemana(f,false)}
    <details class="agcfg"${agAberto?' open':''} ontoggle="agAberto=this.open">
      <summary>${ic('settings-2')}Configurar dias e feriados</summary>
      <label>Dias de academia</label>
      <div class="chips sem">${SEMANA.map((s,i)=>`<button class="chip${data.plano.includes(i)?' on':''}" onclick="togPlano(${i})">${s}</button>`).join('')}</div>
      <div class="top" style="margin-top:12px">
        <button class="ic" aria-label="Mês anterior" onclick="agNav(-1)">${ic('chevron-left')}</button>
        <div class="nm">${MESES[m]} ${y}</div>
        <button class="ic" aria-label="Próximo mês" onclick="agNav(1)">${ic('chevron-right')}</button>
      </div>
      <div class="cal">${c}</div>
      <div class="cleg"><span><i class="d feito"></i>Concluído</span><span><i class="d plan"></i>Planejado</span><span><i class="d falta"></i>Faltou</span><span><i class="d exc"></i>Feriado/exceção</span></div>
      <div class="info">Toque numa data para marcar ou desmarcar como feriado/exceção. Exceções não quebram os dias de foco.</div>
    </details>
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

// ===== Janela ao salvar o treino (criada aqui, sem mexer no index.html) =====
// id = id da sessão salva: a mesma sessão nunca abre a janela duas vezes
function celebrar(tipo,id){
  if(id&&celeFeita===id) return; celeFeita=id||null;
  let m=$('dlgCele');
  if(!m){
    m=document.createElement('div'); m.className='modal cele'; m.id='dlgCele';
    m.onclick=e=>{ if(e.target===m) fecharCele(); };
    document.body.appendChild(m);
  }
  const f=diasFeitos(), seq=sequencia(f);
  m.innerHTML=`<div class="box">
    <svg class="chk" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-15"/></svg>
    <div class="nm" style="justify-content:center">Treino ${esc(tipo)} concluído!</div>
    <div class="info">Dia ${new Date().toLocaleDateString('pt-BR')} marcado na sua semana.</div>
    <div class="cseq">${ic('flame')}<b id="celeN">0</b><span>dia(s) de foco</span></div>
    ${data.plano.length?'':`<div class="info aviso">${ic('triangle-alert')}Escolha os dias de academia em Ajustes para contar os dias de foco.</div>`}
    ${resumoSemana(f,true)}
    <button class="btn add" onclick="compartilharCele()">${ic('share-2')}Compartilhar</button>
    <button class="btn fin" onclick="fecharCele()">${ic('check')}Fechar</button>
  </div>`;
  m.classList.add('on');
  navigator.vibrate&&navigator.vibrate([30,60,30]);
  const el=$('celeN'), t0=performance.now()+500, dur=Math.min(1200,200+seq*80);
  const passo=t=>{ const p=Math.max(0,Math.min(1,(t-t0)/dur)); el.textContent=Math.round(seq*p);
    if(p<1&&m.classList.contains('on')) requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
  // Imagem gerada já na abertura: no iPhone, o compartilhar precisa sair direto do toque
  celeBlob=null;
  try{ imgCele(tipo,f,seq).toBlob(b=>celeBlob=b,'image/png'); }catch(e){ console.warn('Imagem:',e.message); }
}
function fecharCele(){ const m=$('dlgCele'); if(m) m.classList.remove('on'); }

// Desenha a tela de conclusão num canvas 1080×1350 (formato de post)
function imgCele(tipo,f,seq){
  const W=1080,H=1350,c=document.createElement('canvas'); c.width=W; c.height=H;
  const x=c.getContext('2d'), F='-apple-system,system-ui,sans-serif', AZ='#3b82f6';
  const ret=(px,py,w,h,r,cor)=>{ x.fillStyle=cor; x.beginPath(); x.roundRect?x.roundRect(px,py,w,h,r):x.rect(px,py,w,h); x.fill(); };
  const txt=(t,px,py,font,cor,al='center')=>{ x.font=font; x.fillStyle=cor; x.textAlign=al; x.fillText(t,px,py); };
  x.fillStyle='#0f1115'; x.fillRect(0,0,W,H);
  ret(60,60,W-120,H-120,56,'#1a1d24');
  // Check grande (verde, como na janela)
  const s=110/24, P=(a,b)=>[(a-26)*s+540,(b-26)*s+300];
  x.strokeStyle='#22c55e'; x.lineCap=x.lineJoin='round';
  x.lineWidth=14; x.beginPath(); x.arc(540,300,110,0,Math.PI*2); x.stroke();
  x.lineWidth=18; x.beginPath(); x.moveTo(...P(15,27)); x.lineTo(...P(22,34)); x.lineTo(...P(37,19)); x.stroke();
  txt('Treino '+tipo+' concluído!',540,520,`700 68px ${F}`,'#eeeeee');
  txt(new Date().toLocaleDateString('pt-BR'),540,585,`400 38px ${F}`,'#99aaaa');
  // Chama + dias de foco
  x.font=`800 170px ${F}`; const nw=x.measureText(String(seq)).width;
  x.font=`400 40px ${F}`; const tw=x.measureText('dia(s) de foco').width;
  let px=540-(96+24+nw+24+tw)/2;
  x.save(); x.translate(px,690); x.scale(4,4); x.strokeStyle='#f59e0b'; x.lineWidth=2;
  x.stroke(new Path2D('M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'));
  x.restore();
  txt(String(seq),px+120,800,`800 170px ${F}`,'#f59e0b','left');
  txt('dia(s) de foco',px+120+nw+24,800,`400 40px ${F}`,'#99aaaa','left');
  // Semana seg–dom
  diasSemana(f).forEach((d,i)=>{
    const cx=540+(i-3)*130, cy=1010;
    txt(d.l,cx,925,`600 36px ${F}`,'#99aaaa');
    x.beginPath(); x.arc(cx,cy,50,0,Math.PI*2);
    if(d.ok||d.cl==='exc'){ x.fillStyle=d.ok?AZ:'#374151'; x.fill(); }
    x.lineWidth=5; x.strokeStyle=d.ok?AZ:d.cl==='plan'?AZ:d.cl==='exc'?'#374151':'#2a2f3a'; x.stroke();
    if(d.hoje){ x.beginPath(); x.arc(cx,cy,59,0,Math.PI*2); x.lineWidth=5; x.strokeStyle='#f59e0b'; x.stroke(); }
    if(d.ok){ x.strokeStyle='#fff'; x.lineWidth=8; x.beginPath(); x.moveTo(cx-20,cy+2); x.lineTo(cx-6,cy+16); x.lineTo(cx+22,cy-14); x.stroke(); }
  });
  txt('Meus Treinos',540,1210,`600 34px ${F}`,'#6b7280');
  return c;
}
// Compartilha a imagem (celular) ou baixa o PNG (computador)
async function compartilharCele(){
  if(!celeBlob) return alert('Preparando a imagem. Tente de novo em instantes.');
  const nome='treino-'+dk(new Date())+'.png', arq=new File([celeBlob],nome,{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[arq]})){
    try{ await navigator.share({files:[arq],title:'Treino concluído'}); }catch(e){}
    return;
  }
  const u=URL.createObjectURL(celeBlob), a=document.createElement('a');
  a.href=u; a.download=nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),1000);
}

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
