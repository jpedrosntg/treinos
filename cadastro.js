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
