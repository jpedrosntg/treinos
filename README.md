# App Treinos — contexto do projeto

## Arquivos
- index.html → só HTML (telas, botões, modais). Carrega app.js e depois firebase.js (a ordem importa)
- style.css → todo o visual
- app.js → lógica local: telas, cadastro, sessão, cronômetro, histórico, arrastar, backup
- firebase.js → (module) login Google, Firestore, App Check (reCAPTCHA Enterprise), IA Gemini, notificações FCM
- firebase-messaging-sw.js → service worker das notificações em segundo plano
- Cloud Functions: agendarDescanso, cancelarDescanso

## Ligações entre arquivos
- firebase.js usa variáveis/funções do app.js: data, LETRAS, setData, tela, setTopo, sairDaSessao, resetSessao, stopTimer, sessao, KEY
- app.js chama funções do firebase.js via window: salvarNuvem, notifAgendar, notifCancelar, atualizarNotifUI, renderPerfil
- Mudou um id no index.html? Verifique app.js e firebase.js
- Mudou a config do Firebase? Atualize firebase.js E firebase-messaging-sw.js

## Hospedagem
GitHub Pages. Firebase project: treinos-teste
