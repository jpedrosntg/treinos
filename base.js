const KEY='treinos_v1';
const LETRAS=['A','B','C','D','E'];
const VAZIO=()=>({divs:[],A:[],B:[],C:[],D:[],E:[],hist:[],plano:[],excecoes:[]});
let data=VAZIO(), cur='A', done={}, edit=-1, formDiv='A', fSer=[], pilha=[];
let tStart=null, tAcc=0, pausado=false, target=60, tInt=null, beeped=false;
let pos={i:0,j:0}, fase='serie', pend=null;
let sessao='nao', sIni=null, sInt=null, sMsg='', aba='treino', telaAtual='telaLogin';
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
  // Agenda: dias da semana planejados (0 = domingo) e datas de exceção (AAAA-MM-DD)
  if(Array.isArray(d.plano)) n.plano=[...new Set(d.plano.filter(x=>Number.isInteger(x)&&x>=0&&x<=6))].sort((a,b)=>a-b);
  if(Array.isArray(d.excecoes)) n.excecoes=[...new Set(d.excecoes.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)))].sort();
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
const TITULOS={treino:['dumbbell','Meus Treinos'],hist:['history','Histórico'],analise:['trending-up','Análises'],catalogo:['book-open','Catálogo'],backup:['settings','Ajustes']};
function mudarAba(a){
  aba=a; ['treino','hist','analise','catalogo','backup'].forEach(x=>$('p_'+x).style.display=x===a?'block':'none');
  const [i,t]=TITULOS[a]||TITULOS.treino; $('tituloApp').innerHTML=ic(i)+t;
  render(); renderNav();
  if(a==='catalogo') renderCatalogo();
  if(a==='backup'){ window.renderWakeUI&&renderWakeUI(); window.renderPerfil&&renderPerfil(); }
  scrollTo(0,0);
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
  window.renderAgenda&&renderAgenda();
}
