# Contexto do projeto — Treinos

> **Instrução para a IA:** leia este arquivo antes de responder. Toda resposta que alterar
> o projeto deve trazer (1) os arquivos alterados **completos**, (2) explicação detalhada
> e (3) **este CONTEXTO.md atualizado e completo** no final.
> **Nunca presuma nem reconstrua arquivos que não recebeu completos.** Se faltar um arquivo ou ele vier incompleto, peça ao usuário antes de alterar.

**Última atualização:** 30/10/2026

---

## 1. Visão geral
- **O que é:** app web para registrar e executar treinos de musculação, com cronômetro de séries e descanso, histórico, análises, catálogo de exercícios e agenda semanal com sequência.
- **Público:** uso próprio no início. Depois, abrir para os alunos da esposa (personal trainer).
- **Usuários:** 5 hoje. Meta de 30 a 50.
- **Administrador:** só o Joao Pedro. Ele vê e edita o treino de todos os alunos (inclusive a agenda) e gerencia o catálogo.
- **Alunos:** podem editar o próprio treino, mas só com nomes do catálogo. Podem marcar exercícios como aquecimento e configurar a própria agenda.
- **Forma de uso:** site aberto no navegador. No iPhone, por um **atalho comum do Safari** na Tela de Início. **Não** é um app instalado (PWA), e isso é intencional.

## 2. Situação das funcionalidades
| Funcionalidade | Situação |
|---|---|
| Código do app dividido em 8 arquivos (`base`, `cadastro`, `treino`, `historico`, `analises`, `catalogo`, `backup`, `agenda`) | `agenda.js` novo em 30/10/2026, aguardando teste |
| Etapa 1: botão ⓘ, textos de dica removidos, notificações removidas | Publicada e funcionando (30/10/2026) |
| Agenda (Início): dias de academia, calendário mensal com check automático, sequência, exceções | Nova em 30/10/2026, aguardando teste |
| Manter a tela ligada durante o treino (Ajustes, por aparelho) | Nova em 30/10/2026, aguardando teste |
| Cadastro de treino (divisões A a E, séries individuais) | Estável |
| Preenchimento automático das séries no modal | Aguardando teste |
| Nome do exercício obrigatório do catálogo | Aguardando teste |
| Exercício de aquecimento (`aq`) | Aguardando teste |
| Execução: sessão, cronômetro, descanso, "ilha", desfazer, arrastar | Estável |
| Confirmação de cada série, aberta junto com o descanso | Aguardando teste |
| Executado vira o planejado do próximo treino (`atualizarPlano`) | Aguardando teste |
| Cópia de segurança do histórico (subcoleção `sessoes` + fila local) | Aguardando teste |
| Login com Google (inclusive pelo atalho do iPhone) | Aguardando teste |
| Histórico | Em ajuste |
| Análises (filtros, radar, penúltima × última) | Aguardando teste. Ignora aquecimentos |
| Análise com IA (Gemini, só admin) | Em ajuste |
| Catálogo (grupo principal + secundários) | Em ajuste |
| Importar catálogo por JSON (admin) | Aguardando teste |
| Padronizar nomes (admin) | Aguardando teste |
| Backup (exportar/importar JSON) | Aguardando teste |
| Ajustes: perfil, tela ligada | Em ajuste |
| Notificações de descanso | **Removidas** em 30/10/2026. Não serão implementadas |

## 3. Roadmap (em ordem de prioridade)
1. **Pedidos em andamento (em etapas):**
   - ~~Etapa 1: textos informativos, botão de informações, remoção das notificações~~ (30/10/2026).
   - ~~Etapa 2: planejamento semanal, check nos dias, sequência, exceções, tela ligada~~ (30/10/2026, aguardando teste).
   - Etapa 3: janela animada ao salvar o treino, com o check do dia e a sequência atual (usar `diasFeitos()` e `sequencia()` do `agenda.js`).
2. Catálogo completo, com descrição e forma de execução (importação por JSON).
3. Mostrar o grupo muscular principal de cada exercício na aba Treino.
4. Análise da evolução por grupo muscular.
5. Melhorar a análise com IA.
6. Perfil do aluno: dia de foco, meta, calorias a gastar etc.

## 4. Tecnologias e estrutura
- HTML, CSS e JavaScript puros, **sem framework e sem etapa de build**.
- Ícones: Lucide (CDN `unpkg.com/lucide@latest`, sem versão fixa).
- Gráfico radar: SVG gerado à mão no `analises.js`.
- Firebase SDK 12.4.0 por CDN (módulos ES): App, App Check, Auth, Firestore, AI.
- Tela ligada: API Screen Wake Lock (`navigator.wakeLock`). No iPhone, a partir do iOS 16.4.
- **Aparelhos que precisam funcionar:** iPhone, Android e computador.

| Arquivo | Função |
|---|---|
| `index.html` | Telas, modais (exercício `#fAq`, catálogo, padronizar, informações `#dlgInfo`, confirmar série, encerrar), `#agenda` na tela Início, cartão "Tela ligada" (`#fWake`, `#wakeInfo`) nos Ajustes, barra de navegação. Ordem dos scripts: lucide → base → cadastro → treino → historico → analises → catalogo → backup → agenda → firebase.js |
| `base.js` | Estado global, auxiliares (`$`, `esc`, `mmss`, `novoId`, `normNome`, `serie`, `series`, `faixa`, `lista`, `info`, `feita`, `linhaTempo`, `divLabel`, `tagAq`, `ic`), ícones, `norm` (preserva `plano` e `excecoes`), `setData`, `save`, `renderAll`, telas (`tela`, `ilha`, `renderNav`, `irAba`, `mudarAba` → `renderWakeUI` nos Ajustes), `setTopo`, `sairDaSessao`, `irInicio`, `renderInicio` (→ `renderAgenda`) |
| `cadastro.js` | Divisão, `renderCad`, `iniciarDoCadastro`, `abrirExec`, modal do exercício (`del`, `lerSeries`, `gerarSeries`, `autoPeso`, `openForm`, `closeForm`, `saveForm`) |
| `treino.js` | Sessão (`resetSessao` → `atualizarWake`, `iniciarSessao`, `atualizarPlano`, `encerrar`, `status`, `trocar`), `render` (→ `atualizarWake`), `infoEx`, execução (`acao`, `abrirSerie`, `confirmarSerie`, `fecharSerie`, `voltar`), arrastar, cronômetro |
| `historico.js` | `renderHist`, `delHist`, `togAq` |
| `analises.js` | `media`, `numReps`, `histEx`, `calcAnalise`/`window.dadosAnalise`, filtros, radar, `renderAnalise` |
| `catalogo.js` | `GRUPOS`, `catalogo`, `catAcha`, `avisoFora`, `setCatalogo`, `renderCatalogo`, campo Nome, modal do catálogo, `importarCat`, padronização |
| `backup.js` | `ehMovel`, `baixar`, `compartilhar`, `exportar`, `exportarHist`, `importar` |
| `agenda.js` | `SEMANA`, `MESES`, `agMes`, `dk`, `diaSessao`, `diasFeitos`, `sequencia`, `renderAgenda`, `togPlano`, `togExc`, `agNav`; tela ligada: `WKEY`, `wLock`, `wPed`, `telaLigada`, `atualizarWake`, `setTelaLigada`, `renderWakeUI` e listener de `visibilitychange` |
| `firebase.js` | Auth, Firestore (cópia das sessões, importação do catálogo), App Check, IA. Expõe funções em `window.*` |
| `style.css` | Tema escuro, mobile-first. Inclui `.sem`, `.cal`, `.cleg` (agenda) |

- O repositório tem **apenas** esses 11 arquivos. Não há manifest, ícone nem service worker.
- **Comunicação entre arquivos:** scripts comuns (sem `type="module"`), com globais compartilhadas. Código que roda no carregamento só pode usar o que já foi definido antes. `base.js` vem primeiro. Chamadas de `base.js`/`treino.js` para o `agenda.js` são protegidas (`window.renderAgenda&&`, `window.atualizarWake&&`, `window.renderWakeUI&&`).
- Não declarar o mesmo nome global em dois arquivos.
- O `index.html` **não deve** ter `apple-mobile-web-app-capable` nem `mobile-web-app-capable`.
- O `firebase.js` usa globais do app (`data`, `sessao`, `ic`, `esc`, `novoId`, `KEY`, `setTopo`, `tela`, `setData`, `setCatalogo`, `resetSessao`, `stopTimer`, `sairDaSessao`) e **precisa ser carregado por último**.
- Funções do `firebase.js` usadas pelo app: `salvarNuvem`, `salvarSessao`, `atualizarSessoes`, `excluirSessao`, `salvarExercicio`, `excluirExercicio`, `importarCatalogo`, `souAdmin`, `renderPerfil`, `analisarIA`.

### Modelo de dados (`data` em base.js)
```js
{ divs:['A','B'], A:[exercicio], B:[...], C:[], D:[], E:[], hist:[sessao],
  plano:[1,3,5],                 // dias da semana de academia (0 = domingo … 6 = sábado)
  excecoes:['2026-11-02'] }      // datas (AAAA-MM-DD, horário local) que não quebram a sequência
exercicio = { name, sets, reps, weight, rest, series:[{p, w, r}], nomeOriginal?, aq? }
sessao    = { id, ts, tipo:'A', data:'dd/mm/aaaa, hh:mm:ss', dur:seg,
              ex:[{...exercicio, plan:[planejado], series:[executado], feitas, tempos[], descansos[]}] }
```
- `id` vem de `novoId()`. `ts` = `Date.now()` ao salvar (sessões antigas não têm).
- `nomeOriginal` (opcional): primeiro nome antes da troca para o do catálogo. Nunca é sobrescrito.
- `aq` (opcional, `true`): aquecimento. Fica no histórico, fora das análises e da IA.
- No histórico, `series` = executado e `plan` = planejado (antigas sem `plan`).
- **Ordem cronológica** = posição em `hist` (ordenação estável por `ts` ao mesclar). Não ordenar pelo texto de `data`.
- `plano` e `excecoes` são salvos na nuvem junto com `dados`. `norm` filtra valores inválidos e remove repetidos.
- **Tela ligada não fica em `data`:** fica em `localStorage['treinos_tela']` (`'1'`/`'0'`), por aparelho.
- **Grupos do catálogo:** peito, costas, ombros, trapezio, biceps, triceps, pernas, gluteos, panturrilha, abdomen, antebraco (`GRUPOS`).

### Agenda (`agenda.js` + `#agenda` na tela Início)
- O cartão aparece quando há treino ou histórico. É atualizado pelo `renderInicio` (que roda em `renderAll`, portanto também depois de salvar um treino).
- **Dias concluídos:** automáticos, derivados do histórico (`diaSessao`: dia local de `ts`; sem `ts`, lê "dd/mm/aaaa" de `data`). Não há marcação manual.
- **Sequência (`sequencia`)**: conta os dias com treino voltando a partir de hoje e para no primeiro dia planejado, já passado, sem treino e fora das exceções. Hoje nunca é falta. Dia não planejado com treino soma. Não olha antes do primeiro dia com treino. Retorna 0 se `plano` estiver vazio (o cartão mostra um aviso).
- **Calendário:** mês em `agMes` (setas `agNav`). Classes: `feito` (verde com ✓), `plan` (planejado futuro/hoje, azul), `falta` (planejado passado sem treino, a partir do 1º treino, vermelho), `exc` (cinza riscado), `hoje` (contorno laranja). Tocar numa data chama `togExc` (marca/desmarca exceção). `togPlano(i)` alterna o dia da semana. Os dois salvam (`save()`).

### Tela ligada (`agenda.js`)
- `atualizarWake()` pede `navigator.wakeLock.request('screen')` quando a opção está ligada, o treino está em andamento e a página está visível; libera nos outros casos. É chamada em `render()`, `resetSessao()`, `visibilitychange` e `setTelaLigada`.
- `renderWakeUI()` preenche `#fWake` e `#wakeInfo` (avisa se o navegador não oferece o recurso).

### Modal do exercício: séries (`cadastro.js`)
- `fSer`: lista de trabalho (`{p, w, r, wm}`). `gerarSeries()` monta `.srow` (`.p`, `.w`, `.r`). `lerSeries()` preserva propriedades.
- `autoPeso(ev)`: reps e descanso digitados na série *j* vão para todas as seguintes (inclusive escondidas); peso da 1ª vai para as seguintes sem `wm`.
- Nada é gravado até o `saveForm`, que grava `{w, r, p}`.

### Informações do exercício (`treino.js` + `index.html`)
- Botão ⓘ (`infoEx(i)`) antes do lápis. Funciona durante o treino, sem mexer no cronômetro. Mostra grupo principal, secundários e "Como executar" (`descricao`, `white-space:pre-line`). Fora do catálogo: aviso.

### Aquecimento
- `#fAq` no modal; `tagAq(e)`; `encerrar` leva `aq`; `togAq(k,n)` no histórico (confirmação, salva, `atualizarSessoes([h])`, zera `anSel`); `histEx()` ignora `aq`; `padLista` usa chave `nome|aq`.

### Nomes e catálogo
- `normNome` (`base.js`), `catAcha`, sugestões `#fnSug` e aviso `#fnAviso` (`prepNome`), `saveForm` só aceita nome do catálogo, `avisoFora`, `salvarCat` sem nomes repetidos.
- Importar catálogo (`importarCat`, só admin): `[{nome, grupo, secundarios?, descricao?}]` ou `{exercicios:[...]}`.
- Padronizar nomes (só admin, sem treino em andamento): troca `name`, guarda `nomeOriginal`, salva e chama `atualizarSessoes`.

### Backup (`backup.js`)
- `compartilhar(obj,nome)`: menu de compartilhar no celular; download direto no computador (`baixar()`).
- `importar(inp)`: aceita `A` ou `divs`; sem treino em andamento; com confirmação. (`plano`/`excecoes` do arquivo são lidos pelo `norm` se o `importar` usar `setData`; não confirmado.)

### Execução e confirmação de série (`treino.js`)
- Fases: `serie` → `descanso` → `serie`…; última: `serie` → `fim`.
- "Descanso" registra `done[div+i][j]={t,d:null,p,w}`, inicia o descanso no mesmo toque e abre `dlgSerie`. O modal não interfere no cronômetro.
- Faixa de status sem dicas extras. "Voltar" desfaz. `d` gravado no "Próximo" ou ao encerrar no descanso.
- `atualizarPlano(div)` em `encerrar(true)`: executado vira o próximo planejado.

### Histórico na nuvem (`firebase.js`)
- Documento `treinos_teste/{uid}.dados` (JSON completo) + cópia `treinos_teste/{uid}/sessoes/{id}` → `{dados, ts, tipo}`.
- Fila local `localStorage['treinos_pend']`; `reenviarPendentes()` no login; `mesclar()` por `id`; `delHist` apaga nos dois lugares.

### Análises (`analises.js`)
- `histEx()`: por nome, `feitas > 0`, sem `aq`. Métricas: `peso`, `reps`, `series`, `volume`, `tSerie`, `tDesc`.
- IA: 1ª × última, todas as divisões. Radar: 3 últimas da divisão. Comparação: penúltima × última.

## 5. Firebase
- **Projeto:** `treinos-teste`, plano **Spark**. Sem migração para o Blaze.
- **authDomain:** `treinos-teste.firebaseapp.com`.
- **Login:** Google por popup, com `signInWithRedirect` como alternativa; `setPersistence` (IndexedDB, depois localStorage).
- **Firestore:**
  - `treinos_teste/{uid}` → `{ email, nome, dados: JSON.stringify(data), atualizado }` (inclui `plano` e `excecoes`)
  - `treinos_teste/{uid}/sessoes/{id}` → `{ dados, ts, tipo }`
  - `exercicios/{id}` → `{ nome, grupo, secundarios[], descricao, atualizado }`
  - `admins/{email}` → existe = admin (criado só pelo Console)
- **App Check:** reCAPTCHA Enterprise. Modo de aplicação obrigatória: não sei.
- **IA:** Firebase AI Logic, `gemini-2.5-flash`, resposta em JSON.
- Messaging, Functions e VAPID removidos em 30/10/2026.
- **Domínios autorizados:** não confirmados. `jpedrosntg.github.io` precisa estar na lista.

### Regras do Firestore (sem mudanças em 30/10/2026)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.token.email));
    }

    match /admins/{email} {
      allow read: if request.auth != null && (request.auth.token.email == email || isAdmin());
      allow write: if false;
    }

    match /treinos_teste/{uid} {
      allow read, write: if request.auth != null && (request.auth.uid == uid || isAdmin());

      // Cópia de segurança de cada sessão do histórico
      match /sessoes/{sid} {
        allow read, write: if request.auth != null && (request.auth.uid == uid || isAdmin());
      }
    }

    // Catálogo: qualquer usuário logado lê; só o admin cria, edita ou exclui
    match /exercicios/{id} {
      allow read: if request.auth != null;
      allow create, update: if isAdmin()
        && request.resource.data.nome is string
        && request.resource.data.nome.size() > 0
        && request.resource.data.grupo is string
        && request.resource.data.secundarios is list
        && request.resource.data.descricao is string;
      allow delete: if isAdmin();
    }
  }
}
```
- Coleção nova exige regra nova publicada no Console.
- Limite de 1 MB por documento; o histórico inteiro ainda fica em `dados`.

## 6. Publicação
- **Repositório:** https://github.com/jpedrosntg/treinos
- **Hospedagem:** GitHub Pages, `https://jpedrosntg.github.io/treinos/`. Decisão: **continuar no GitHub Pages**.
- **Como publica:** upload pelo site do GitHub. Regras do Firestore pelo Console (antes dos arquivos que dependem delas).
- **Etapa 2 (30/10/2026):** subir **juntos** `agenda.js` (novo), `base.js`, `treino.js`, `index.html` e `style.css`. Recarregar depois.
- **Testes:** não são feitos antes de publicar.
- **Colaborador:** um amigo cuida do visual pelo GitHub.
- **Backup:** JSON pelo app + cópia automática em `sessoes`.

## 7. Pendências conhecidas
- [ ] Testar a Etapa 2: escolher dias, check automático (inclusive em sessões antigas), sequência (falta, exceção, dia fora do plano, hoje), troca de mês, recarregar a página, agenda de um aluno pelo admin.
- [ ] Testar a tela ligada no iPhone, no Android e no computador (liga só com treino em andamento; volta a valer depois de sair e voltar ao app; solta ao encerrar).
- [ ] Verificar se "Recomeçar do zero" (`cadastro.js`) apaga `plano`/`excecoes`. Se apagar, pedir o `cadastro.js` e preservar os campos.
- [ ] Verificar se `importar` (`backup.js`) mantém `plano`/`excecoes`.
- [ ] Testar o preenchimento automático no modal.
- [ ] Testar a atualização do planejado.
- [ ] Testar o aquecimento.
- [ ] (Opcional) Estilizar o checkbox `#fAq`, o `#fWake` e a chama do histórico.
- [ ] Testar o backup no computador, no iPhone e no Android.
- [ ] Publicar a regra `sessoes` no Console, se ainda não foi publicada.
- [ ] Importar o catálogo completo por JSON.
- [ ] Testar o campo Nome, a padronização, o fluxo da série, a cópia de segurança, o login pelo atalho do iPhone e as Análises.
- [ ] (Opcional) Renomear `autoPeso` para `autoSeries`.
- [ ] (Opcional) IA penúltima × última e/ou por divisão.
- [ ] (Opcional) Mostrar no histórico a diferença entre `plan` e executado.
- [ ] (Opcional) Mover o texto do cartão "Sua evolução" para o `index.html`.
- [ ] Fixar a versão do Lucide.
- [ ] Conferir domínios autorizados e modo do App Check.
- [ ] (Futuro) Tirar o `hist` do campo `dados` e ler só de `sessoes`.

## 8. Decisões e preferências
- Arquivos **sempre completos**, só os que mudaram.
- **Nunca presumir nem reconstruir** arquivos não recebidos completos.
- Código **dividido por área**. Arquivo novo só para área nova ou grande, atualizando a ordem dos scripts e este contexto (`agenda.js` criado na Etapa 2).
- Explicações detalhadas, em linguagem simples.
- Preservar visual e funcionamento existentes.
- Sem Blaze, sem PWA, sem sair do GitHub Pages, **sem notificações push**.
- Telas de treino sem dicas repetidas; informações do exercício no botão ⓘ.
- Sempre enviar este `CONTEXTO.md` atualizado.
- "Descanso" inicia o descanso na hora; a confirmação nunca bloqueia o cronômetro.
- Histórico salvo de forma redundante (documento + `sessoes`).
- Nomes sempre do catálogo. Alterações no histórico só trocam nomes ou aquecimento.
- Backup baixa direto no computador; compartilhar só no celular.
- Aquecimento no histórico, fora das análises.
- Executado vira o planejado do próximo treino.
- No modal, reps/descanso copiam para as séries seguintes; peso segue a regra da 1ª série com `wm`.
- **Dias concluídos vêm do histórico** (sem marcação manual). Exceções nunca quebram a sequência. Hoje nunca conta como falta.
- **Tela ligada é por aparelho** (`localStorage`) e só vale com treino em andamento.

## 9. Histórico de alterações
| Data | Alteração |
|---|---|
| — | Grupos secundários com seleção múltipla |
| — | Login: popup com redirect e `setPersistence` |
| 23/10/2026 | Criação deste arquivo; `index.html` sem modo app/manifest; regras registradas; revisão |
| 28/10/2026 | Análises refeitas (filtros, radar, penúltima × última) |
| 28/10/2026 | Confirmação de série (`dlgSerie`, `plan` × `series`); fluxo com descanso no toque |
| 28/10/2026 | Histórico na nuvem: `id`/`ts`, `sessoes`, fila local, mesclagem |
| 30/10/2026 | Catálogo: Trapézio, nome obrigatório, importação JSON, padronização |
| 30/10/2026 | Backup corrigido; aquecimento; `atualizarPlano`; preenchimento automático no modal |
| 30/10/2026 | `app.js` dividido em 7 arquivos. Testado e funcionando |
| 30/10/2026 | Etapa 1: botão ⓘ, textos removidos, notificações removidas. Funcionando |
| 30/10/2026 | Etapa 2: `agenda.js` (dias de academia, calendário com check automático, sequência, exceções, tela ligada com Wake Lock); `base.js` (`plano`/`excecoes` em `VAZIO`/`norm`, `renderAgenda` no `renderInicio`, `renderWakeUI` nos Ajustes, removidos `agendada` e `atualizarNotifUI`); `treino.js` (`atualizarWake` em `render`/`resetSessao`); `index.html` (`#agenda`, cartão Tela ligada, script `agenda.js`); `style.css` (`.sem`, `.cal`, `.cleg`). Regras sem mudanças |
