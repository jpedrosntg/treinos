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
