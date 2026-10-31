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
