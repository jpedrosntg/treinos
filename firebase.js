import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app-check.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-ai.js";

const firebaseConfig = {
  apiKey: "AIzaSyBExeZ9Vf2vwM2z_uWzNYZGOlZ34Befiig",
  authDomain: "treinos-teste.firebaseapp.com",
  projectId: "treinos-teste",
  storageBucket: "treinos-teste.firebasestorage.app",
  messagingSenderId: "846488130737",
  appId: "1:846488130737:web:36e06bff4eb998475a3e90"
};
const VAPID_KEY = 'BCf0WcCmzfJgVoul0i0OPiK67q_JqCEeSoD6ZF06KyHqNkWQqJ5tcZkRXcvWsr_QcAHborLxLEPo4LNalk-Yo-k';
const RECAPTCHA_KEY = '6LflcPctAAAAAHgYzAFnVC-lTLc5h42zmfpRGC4O';

const COLECAO = 'treinos_teste';
const app = initializeApp(firebaseConfig);

// App Check (antes de qualquer outro serviço)
if (location.hostname === 'localhost') self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_KEY),
  isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
const db = getFirestore(app);
const fns = getFunctions(app);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const modelo = getGenerativeModel(ai, {
  model: 'gemini-2.5-flash',
  generationConfig: { responseMimeType: 'application/json' }
});
const el = id => document.getElementById(id);
let usuario = null, alvo = null, alvoInfo = {}, ehAdmin = false, alunos = [];

// ===== IA: análise da evolução =====
window.analisarIA = async () => {
  const a = window.dadosAnalise();
  if (!a.comp.length) return alert('Ainda não há dados suficientes para uma análise confiável.');
  const b = el('bIA'), out = el('iaRes');
  b.disabled = true; b.textContent = '⏳ Analisando...';
  try {
    const prompt = `Você é um personal trainer analisando a evolução de um aluno de musculação.
Use EXCLUSIVAMENTE os dados abaixo. Cada exercício compara a primeira ("ini") e a última ("fim") sessão salva.
"reps" é a meta de repetições cadastrada (não as feitas); "series" são as séries concluídas; "volume" = peso×reps×séries;
"tSerie" e "tDesc" são médias em segundos; "dur" é a duração do treino em segundos.
Não invente números, causas ou conclusões. Se algo não puder ser concluído com esses dados, diga isso.
Em cada item, cite o exercício, os valores e as datas comparadas.
Responda SOMENTE com JSON: {"resumo":"texto curto","melhorou":["..."],"piorou":["..."],"observacoes":["..."]}
Dados: ${JSON.stringify(a)}`;
    const r = await modelo.generateContent(prompt);
    const d = JSON.parse(r.response.text());
    const lista = (t, v) => Array.isArray(v) && v.length
      ? `<div class="nm" style="margin-top:10px">${t}</div>` + v.map(x => `<div class="info">• ${esc(x)}</div>`).join('') : '';
    out.innerHTML = `<div class="card"><div class="nm">🤖 Análise da IA</div>
      <div class="info">${esc(d.resumo || '')}</div>
      ${lista('✅ Melhorou', d.melhorou)}${lista('⚠️ Piorou', d.piorou)}${lista('ℹ️ Observações', d.observacoes)}
      <div class="info" style="margin-top:10px;font-size:12px">Gerado por IA a partir do histórico. Confira os números abaixo.</div></div>`;
  } catch (e) {
    alert('Erro na análise: ' + e.message);
  } finally {
    b.disabled = false; b.textContent = '🤖 Analisar com IA';
  }
};

const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
window.entrar = () => (standalone ? signInWithRedirect : signInWithPopup)(auth, new GoogleAuthProvider())
  .catch(e => alert('Erro no login: ' + e.message));
window.sair = () => {
  if (sessao === 'andamento' && !confirm('Há um treino em andamento que será descartado. Sair mesmo assim?')) return;
  if (confirm('Sair da conta?')) { resetSessao(); stopTimer(); signOut(auth); }
};

// ===== PERFIL =====
window.renderPerfil = () => {
  const u = usuario; if (!u) return;
  const nome = u.displayName || 'Sem nome', ini = (nome[0] || '?').toUpperCase();
  el('pNome').textContent = nome;
  el('pEmail').textContent = u.email || '';
  const f = el('pFoto'); f.textContent = '';
  if (u.photoURL) {
    const img = new Image(); img.alt = ''; img.referrerPolicy = 'no-referrer';
    img.onerror = () => { f.textContent = ini; };
    img.src = u.photoURL; f.append(img);
  } else f.textContent = ini;
  const dt = s => s ? new Date(s).toLocaleString('pt-BR') : '—';
  const linhas = [
    ['Tipo de conta', ehAdmin ? '👑 Administrador' : 'Aluno'],
    ['Login via', 'Google'],
    ['E-mail verificado', u.emailVerified ? 'Sim' : 'Não'],
    ['Conta criada em', dt(u.metadata?.creationTime)],
    ['Último acesso', dt(u.metadata?.lastSignInTime)]
  ];
  if (alvo && alvo !== u.uid) linhas.push(['Editando treino de', alvoInfo.email || alvo]);
  const box = el('pDados'); box.innerHTML = '';
  linhas.forEach(([k, v]) => {
    const d = document.createElement('div'), s = document.createElement('span'), b = document.createElement('b');
    s.textContent = k; b.textContent = v; d.append(s, b); box.append(d);
  });
};

// ===== NOTIFICAÇÕES =====
const NKEY = 'notif_descanso';
const fAgendar = httpsCallable(fns, 'agendarDescanso', { timeout: 560000 });
const fCancelar = httpsCallable(fns, 'cancelarDescanso');
let fcmToken = null, idAtual = null;
const notifOn = () => localStorage.getItem(NKEY) === '1' && 'Notification' in window && Notification.permission === 'granted';

async function obterToken(pedir) {
  if (!(await isSupported()) || !('Notification' in window))
    throw new Error('Notificações não suportadas aqui. No iPhone: iOS 16.4+ e app instalado na Tela de Início.');
  const perm = pedir ? await Notification.requestPermission() : Notification.permission;
  if (perm !== 'granted') throw new Error('Permissão negada. Libere em Ajustes > Notificações > Treinos.');
  const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  fcmToken = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!fcmToken) throw new Error('Não foi possível obter o token de notificação.');
  return fcmToken;
}

window.atualizarNotifUI = () => {
  const on = notifOn(), b = el('bNotif');
  b.textContent = on ? '🔔 Notificações ativadas (toque para desativar)' : '🔕 Ativar notificações';
  b.classList.toggle('ativo', on);
  el('nInfo').textContent = on
    ? 'Você será avisado quando o descanso acabar, mesmo com a tela bloqueada.'
    : (!standalone && /iPhone|iPad/.test(navigator.userAgent)
      ? 'No iPhone, instale o app na Tela de Início (Compartilhar > Adicionar à Tela de Início) para ativar.'
      : 'Receba um aviso quando o descanso terminar, mesmo com a tela bloqueada.');
};

window.notifToggle = async () => {
  if (notifOn()) { localStorage.removeItem(NKEY); return atualizarNotifUI(); }
  try { await obterToken(true); localStorage.setItem(NKEY, '1'); }
  catch (e) { alert(e.message); localStorage.removeItem(NKEY); }
  atualizarNotifUI();
};

window.notifAgendar = (seg, corpo) => {
  if (!notifOn() || !usuario) return false;
  const id = idAtual = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  (fcmToken ? Promise.resolve(fcmToken) : obterToken(false))
    .then(token => fAgendar({ token, id, segundos: Math.round(seg), titulo: '⏰ Descanso terminou!', corpo }))
    .catch(e => console.warn('Notificação:', e.message));
  return true;
};

window.notifCancelar = () => {
  if (!idAtual || !usuario) return;
  const id = idAtual; idAtual = null;
  fCancelar({ id }).catch(() => {});
};

window.notifTeste = () => {
  if (!notifOn()) return alert('Ative as notificações primeiro.');
  window.notifAgendar(5, 'Teste OK! As notificações estão funcionando. 💪');
  alert('Bloqueie o celular agora. A notificação chega em ~5 segundos.');
};

window.salvarNuvem = async () => {
  if (!usuario || !alvo) return;
  try {
    await setDoc(doc(db, COLECAO, alvo), {
      email: alvoInfo.email || '', nome: alvoInfo.nome || '',
      dados: JSON.stringify(data), atualizado: Date.now()
    });
  } catch (e) { alert('Erro ao salvar: ' + e.message); }
};

async function abrirUsuario(uid) {
  const snap = await getDoc(doc(db, COLECAO, uid));
  if (snap.exists()) {
    const d = snap.data();
    alvoInfo = { email: d.email, nome: d.nome };
    setData(JSON.parse(d.dados || '{}'));
    return true;
  }
  return false;
}

// ===== ADMIN =====
async function carregarAlunos() {
  const lista = await getDocs(collection(db, COLECAO));
  alunos = lista.docs.map(d => ({ uid: d.id, ...d.data() }));
  alunos.sort((a, b) => (b.uid === usuario.uid) - (a.uid === usuario.uid) ||
    (a.nome || '').localeCompare(b.nome || ''));
  window.renderAlunos(el('buscaAluno').value);
}

window.renderAlunos = (filtro = '') => {
  const f = filtro.toLowerCase(), box = el('listaAlunos');
  box.innerHTML = '';
  alunos.filter(a => `${a.nome} ${a.email}`.toLowerCase().includes(f)).forEach(a => {
    const div = document.createElement('div');
    div.className = 'aluno' + (a.uid === usuario.uid ? ' eu' : '');
    const nm = document.createElement('div'); nm.className = 'nm';
    nm.textContent = (a.uid === usuario.uid ? '⭐ Meu treino — ' : '') + (a.nome || 'Sem nome');
    const em = document.createElement('div'); em.className = 'info';
    em.textContent = a.email || a.uid;
    div.append(nm, em);
    div.onclick = () => window.abrirTreino(a.uid);
    box.appendChild(div);
  });
  if (!box.children.length) box.innerHTML = '<div class="info">Nenhum aluno encontrado.</div>';
};

window.abrirTreino = async (uid) => {
  alvo = uid;
  try { await abrirUsuario(uid); } catch (e) { return alert('Erro: ' + e.message); }
  setTopo(uid === usuario.uid ? '☁️ ' + usuario.email : '👁 Editando treino de: ' + alvoInfo.email, ehAdmin);
  tela('telaInicio');
};

window.voltarAdmin = async () => {
  if (!sairDaSessao()) return;
  el('buscaAluno').value = '';
  try { await carregarAlunos(); } catch (e) { alert('Erro: ' + e.message); }
  tela('telaAdmin');
};

// ===== LOGIN =====
onAuthStateChanged(auth, async (u) => {
  usuario = u; ehAdmin = false;
  setTopo('', false);
  atualizarNotifUI();

  if (!u) {
    el('msgLogin').textContent = 'Entre para acessar seus treinos';
    el('btnLogin').style.display = 'block';
    setData(null); tela('telaLogin'); return;
  }

  el('msgLogin').textContent = 'Carregando...';
  el('btnLogin').style.display = 'none';
  tela('telaLogin');

  alvo = u.uid;
  alvoInfo = { email: u.email, nome: u.displayName || '' };

  try {
    const existe = await abrirUsuario(u.uid);
    alvoInfo = { email: u.email, nome: u.displayName || '' };
    if (!existe) setData(null);
    localStorage.removeItem(KEY);
    await window.salvarNuvem();
    const adm = await getDoc(doc(db, 'admins', u.email));
    ehAdmin = adm.exists();
  } catch (e) { alert('Erro ao acessar a nuvem: ' + e.message); }

  window.renderPerfil();
  if (notifOn()) obterToken(false).catch(() => {});

  if (ehAdmin) {
    try { await carregarAlunos(); } catch (e) { alert('Erro: ' + e.message); }
    tela('telaAdmin');
  } else {
    setTopo('☁️ ' + u.email, false);
    tela('telaInicio');
  }
});
