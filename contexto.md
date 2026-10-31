# Contexto do projeto — Treinos

> **Instrução para a IA:** leia este arquivo antes de responder. Toda resposta que alterar
> o projeto deve trazer (1) os arquivos alterados **completos**, (2) explicação detalhada
> e (3) **este CONTEXTO.md atualizado e completo** no final.
> **Nunca presuma nem reconstrua arquivos que não recebeu completos.** Se faltar um arquivo ou ele vier incompleto, peça ao usuário antes de alterar.

**Última atualização:** 30/10/2026

---

## 1. Visão geral
- **O que é:** app web para registrar e executar treinos de musculação, com cronômetro de séries e descanso, histórico, análises, catálogo de exercícios, agenda semanal com dias de foco e janela de resumo ao salvar (com compartilhamento em imagem).
- **Público:** uso próprio no início. Depois, abrir para os alunos da esposa (personal trainer).
- **Usuários:** 5 hoje. Meta de 30 a 50.
- **Administrador:** só o Joao Pedro. Ele vê e edita o treino de todos os alunos (inclusive a agenda) e gerencia o catálogo.
- **Alunos:** podem editar o próprio treino, mas só com nomes do catálogo. Podem marcar exercícios como aquecimento e configurar a própria agenda.
- **Forma de uso:** site aberto no navegador. No iPhone, por um **atalho comum do Safari** na Tela de Início. **Não** é um app instalado (PWA), e isso é intencional.

## 2. Situação das funcionalidades
| Funcionalidade | Situação |
|---|---|
| Código do app dividido em 8 arquivos (`base`, `cadastro`, `treino`, `historico`, `analises`, `catalogo`, `backup`, `agenda`) | Funcionando |
| Etapa 1: botão ⓘ, textos de dica removidos, notificações removidas | Publicada e funcionando (30/10/2026) |
| Agenda na aba Ajustes: resumo seg–dom, dias de foco, configurações recolhidas | Aguardando teste do novo visual (azul, sem datas) |
| Janela ao salvar (check, dias de foco, resumo seg–dom) | **Funcionando** (testada 30/10/2026). Animação aprovada: não mexer |
| Janela ao salvar: checks azuis, círculos sem data, botão "Compartilhar" (imagem PNG) | Nova em 30/10/2026, aguardando teste |
| Cartão do exercício na aba Treino: só nome e círculos | Alterado em 30/10/2026, aguardando teste |
| Tela ligada (Ajustes, por aparelho) | Aguardando teste |
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
| Notificações de descanso (push) | **Removidas**. Não serão implementadas |

## 3. Roadmap (em ordem de prioridade)
1. Testar os ajustes de 30/10/2026 (resumo azul sem datas, compartilhar, cartão enxuto).
2. Catálogo completo, com descrição e forma de execução (importação por JSON). O usuário não quer enviar o catálogo atual.
3. Mostrar o grupo muscular principal de cada exercício na aba Treino (**atenção:** o usuário pediu cartão só com nome e círculos; confirmar antes).
4. Análise da evolução por grupo muscular.
5. Melhorar a análise com IA.
6. Perfil do aluno: dia de foco, meta, calorias a gastar etc.

## 4. Tecnologias e estrutura
- HTML, CSS e JavaScript puros, **sem framework e sem etapa de build**.
- Ícones: Lucide (CDN `unpkg.com/lucide@latest`, sem versão fixa).
- Gráfico radar: SVG gerado à mão no `analises.js`.
- Imagem compartilhável: `<canvas>` desenhado à mão no `agenda.js` (sem biblioteca), Web Share API com arquivo; download como alternativa.
- Firebase SDK 12.4.0 por CDN (módulos ES): App, App Check, Auth, Firestore, AI.
- Tela ligada: API Screen Wake Lock (`navigator.wakeLock`). No iPhone, a partir do iOS 16.4.
- **Aparelhos que precisam funcionar:** iPhone, Android e computador.
- **Cache:** scripts e CSS são carregados com `?v=N` no `index.html` (atual: `v=6`). **Aumentar N a cada publicação.**

| Arquivo | Função |
|---|---|
| `index.html` | Telas, modais (exercício `#fAq`, catálogo, padronizar, informações `#dlgInfo`, confirmar série, encerrar), aba Ajustes com perfil → `#agenda` → "Tela ligada" (`#fWake`, `#wakeInfo`) → Backup → Conta, barra de navegação. Ordem dos scripts: lucide → base → cadastro → treino → historico → analises → catalogo → backup → agenda → firebase.js (todos com `?v=N`) |
| `base.js` | Estado global, auxiliares (`$`, `esc`, `mmss`, `novoId`, `normNome`, `serie`, `series`, `faixa`, `lista`, `info`, `feita`, `linhaTempo`, `divLabel`, `tagAq`, `ic`), ícones, `norm` (preserva `plano` e `excecoes`), `setData`, `save`, `renderAll`, telas (`tela`, `ilha`, `renderNav`, `irAba`, `mudarAba` → em Ajustes chama `renderWakeUI`, `renderPerfil`, `renderAgenda`), `setTopo`, `sairDaSessao`, `irInicio`, `renderInicio` (→ `renderAgenda`) |
| `cadastro.js` | Divisão, `renderCad`, `iniciarDoCadastro`, `abrirExec`, modal do exercício (`del`, `lerSeries`, `gerarSeries`, `autoPeso`, `openForm`, `closeForm`, `saveForm`) |
| `treino.js` | Sessão (`resetSessao` → `atualizarWake`, `iniciarSessao`, `atualizarPlano`, `encerrar` → `celebrar(div,id)`, `status`, `trocar`), `render` (cartão: arrastar + nome + ⓘ/lápis/lixeira + círculos + tempos; → `atualizarWake`), `infoEx` (inclui `tagAq`), execução (`acao`, `abrirSerie`, `confirmarSerie`, `fecharSerie`, `voltar`), arrastar, cronômetro |
| `historico.js` | `renderHist`, `delHist`, `togAq` |
| `analises.js` | `media`, `numReps`, `histEx`, `calcAnalise`/`window.dadosAnalise`, filtros, radar, `renderAnalise` |
| `catalogo.js` | `GRUPOS`, `catalogo`, `catAcha`, `avisoFora`, `setCatalogo`, `renderCatalogo`, campo Nome, modal do catálogo, `importarCat`, padronização |
| `backup.js` | `ehMovel`, `baixar`, `compartilhar`, `exportar`, `exportarHist`, `importar` |
| `agenda.js` | `SEMANA`, `MESES`, `agMes`, `agAberto`, `celeFeita`, `celeBlob`, `dk`, `diaSessao`, `diasFeitos`, `sequencia`, `semanaAtual`, `diasSemana`, `resumoSemana`, `avisoPlano`, `renderAgenda`, `togPlano`, `togExc`, `agNav`; janela: `celebrar`, `fecharCele`, `imgCele`, `compartilharCele`; tela ligada: `WKEY`, `wLock`, `wPed`, `telaLigada`, `atualizarWake`, `setTelaLigada`, `renderWakeUI` e listener de `visibilitychange` |
| `firebase.js` | Auth, Firestore (cópia das sessões, importação do catálogo), App Check, IA. Expõe funções em `window.*` |
| `style.css` | Tema escuro, mobile-first. Agenda: `.agcfg`, `.sem`, `.cal`, `.cleg`; resumo: `.cseq`, `.csem` (+ `.fixo`, `.plan`, `.exc`, `.feito` azul, `.hoje`); janela: `.cele`, `.chk`; `prefers-reduced-motion` |

- O repositório tem **apenas** esses 11 arquivos. Não há manifest, ícone nem service worker.
- **Comunicação entre arquivos:** scripts comuns (sem `type="module"`), com globais compartilhadas. Código que roda no carregamento só pode usar o que já foi definido antes. `base.js` vem primeiro. Chamadas para o `agenda.js` são protegidas (`window.renderAgenda&&`, `window.atualizarWake&&`, `window.renderWakeUI&&`, `window.celebrar`).
- Não declarar o mesmo nome global em dois arquivos (o `agenda.js` **não** usa `compartilhar`/`baixar` do `backup.js`, que não foi revisado; tem o próprio `compartilharCele`).
- O `index.html` **não deve** ter `apple-mobile-web-app-capable` nem `mobile-web-app-capable`.
- O `firebase.js` usa globais do app (`data`, `sessao`, `ic`, `esc`, `novoId`, `KEY`, `setTopo`, `tela`, `setData`, `setCatalogo`, `resetSessao`, `stopTimer`, `sairDaSessao`) e **precisa ser carregado por último**.
- Funções do `firebase.js` usadas pelo app: `salvarNuvem`, `salvarSessao`, `atualizarSessoes`, `excluirSessao`, `salvarExercicio`, `excluirExercicio`, `importarCatalogo`, `souAdmin`, `renderPerfil`, `analisarIA`.

### Modelo de dados (`data` em base.js)
```js
{ divs:['A','B'], A:[exercicio], B:[...], C:[], D:[], E:[], hist:[sessao],
  plano:[1,3,5],                 // dias da semana de academia (0 = domingo … 6 = sábado)
  excecoes:['2026-11-02'] }      // feriados/exceções (AAAA-MM-DD, horário local)
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

### Agenda (`agenda.js` + `#agenda` na aba Ajustes)
- Cartão "Sua semana" (aparece quando há treino ou histórico). Atualizado ao abrir Ajustes (`mudarAba`) e pelo `renderInicio` (roda em `renderAll`).
- **Sempre visível:** dias de foco (`cseq`) e resumo seg–dom (`resumoSemana(f,false)`, `.csem.fixo`).
- **Resumo seg–dom (Ajustes e janela, mesmo visual):** letra do dia em cima (S T Q Q S S D); círculo **sem data**. Treinou = fundo **azul do app** (`--pri`) com ✓ branco; planejado = contorno azul; exceção = cinza preenchido; hoje = contorno laranja. Estado vem de `diasSemana(f)` (usado também na imagem).
- **Recolhido** em `<details class="agcfg">` ("Configurar dias e feriados"): chips dos dias (`togPlano`), calendário mensal (`agNav`, `togExc`), legenda. O calendário **continua com datas e "Concluído" verde** (não pedido mudar). Estado aberto/fechado em `agAberto`.
- **Dias concluídos:** automáticos, do histórico (`diaSessao`). Sem marcação manual.
- **Dias de foco (`sequencia`)**: conta dias com treino voltando a partir de hoje; para no primeiro dia planejado, passado, sem treino e fora das exceções. Hoje nunca é falta. Dia fora do plano com treino soma. Retorna 0 se `plano` vazio (aviso `avisoPlano`).

### Janela ao salvar (`agenda.js`)
- `encerrar(true)` grava a sessão, depois `try{renderAll()} finally{celebrar(div,sid)}`.
- `encerrar` ignora chamadas se `sessao!=='andamento'`; `celebrar` ignora o mesmo `id` (`celeFeita`). Não existe regra de "já treinou hoje". Não aparece em "Não salvar".
- Conteúdo: check SVG verde animado (**aprovado, não mexer**), "Treino X concluído!", data, chama + contador, aviso sem plano, resumo seg–dom animado, botões **Compartilhar** (`.btn.add`) e **Fechar** (`.btn.fin`). Vibra `[30,60,30]`. Fecha em `fecharCele()` (botão ou toque fora).
- **Compartilhar:** ao abrir a janela, `imgCele(tipo,f,seq)` desenha um canvas 1080×1350 (fundo, cartão, check verde, título, data, chama Lucide via `Path2D`, número de dias de foco, semana com as mesmas cores, rodapé "Meus Treinos") e guarda o PNG em `celeBlob`. `compartilharCele()` usa `navigator.share({files})` se `canShare`; senão baixa `treino-AAAA-MM-DD.png`. A imagem é gerada antes para o compartilhar sair direto do toque (exigência do Safari).

### Tela ligada (`agenda.js`)
- `atualizarWake()` pede `navigator.wakeLock.request('screen')` com opção ligada, treino em andamento e página visível; libera nos outros casos. Chamada em `render()`, `resetSessao()`, `visibilitychange` e `setTelaLigada`.
- `renderWakeUI()` preenche `#fWake` e `#wakeInfo`.

### Cartão do exercício (aba Treino)
- Só: alça de arrastar, nome, botões ⓘ/lápis/lixeira, círculos das séries (reps + kg) e tempos executados. **Sem** linha de resumo, etiqueta de aquecimento ou aviso fora do catálogo.

### Modal do exercício: séries (`cadastro.js`)
- `fSer`: lista de trabalho (`{p, w, r, wm}`). `gerarSeries()` monta `.srow`. `lerSeries()` preserva propriedades.
- `autoPeso(ev)`: reps e descanso da série *j* vão para as seguintes; peso da 1ª vai para as seguintes sem `wm`.
- Nada é gravado até o `saveForm`, que grava `{w, r, p}`.

### Informações do exercício (`treino.js`)
- `infoEx(i)`: grupo principal, secundários, "Como executar", aviso se fora do catálogo e etiqueta de aquecimento. Não mexe no cronômetro.

### Aquecimento
- `#fAq` no modal; `tagAq(e)` (no ⓘ); `encerrar` leva `aq`; `togAq(k,n)` no histórico; `histEx()` ignora `aq`; `padLista` usa chave `nome|aq`.

### Nomes e catálogo
- `normNome`, `catAcha`, sugestões `#fnSug`, aviso `#fnAviso` (`prepNome`), `saveForm` só aceita nome do catálogo, `avisoFora` (não usado mais no cartão), `salvarCat` sem nomes repetidos.
- Importar catálogo (`importarCat`, só admin): `[{nome, grupo, secundarios?, descricao?}]` ou `{exercicios:[...]}`.
- Padronizar nomes (só admin, sem treino em andamento): troca `name`, guarda `nomeOriginal`, salva e chama `atualizarSessoes`.

### Backup (`backup.js`)
- `compartilhar(obj,nome)`: compartilhar no celular; download no computador (`baixar()`).
- `importar(inp)`: aceita `A` ou `divs`; sem treino em andamento; com confirmação. (`plano`/`excecoes` mantidos só se usar `setData`; não confirmado.)

### Execução e confirmação de série (`treino.js`)
- Fases: `serie` → `descanso` → `serie`…; última: `serie` → `fim`.
- "Descanso" registra `done[div+i][j]={t,d:null,p,w}`, inicia o descanso e abre `dlgSerie`, sem interferir no cronômetro.
- "Voltar" desfaz. `d` gravado no "Próximo" ou ao encerrar no descanso.
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
- **Ajuste de 30/10/2026 (2º):** subir **juntos** `agenda.js`, `style.css` e `index.html` (`v=6`). Recarregar depois.
- **A cada publicação:** aumentar o `?v=N` no `index.html` (próximo: `v=7`).
- **Testes:** não são feitos antes de publicar.
- **Colaborador:** um amigo cuida do visual pelo GitHub.
- **Backup:** JSON pelo app + cópia automática em `sessoes`.

## 7. Pendências conhecidas
- [ ] Testar: resumo seg–dom azul e sem datas (Ajustes e janela).
- [ ] Testar: botão Compartilhar no iPhone, no Android (tela de compartilhar) e no computador (download do PNG); conferir a imagem.
- [ ] (Opcional) Passar o "Concluído" do calendário mensal para azul também.
- [ ] Testar: agenda em Ajustes (abrir/fechar configurações, feriados, troca de mês).
- [ ] Testar: cartão do exercício só com nome e círculos.
- [ ] Testar a tela ligada no iPhone, no Android e no computador.
- [ ] Verificar se "Recomeçar do zero" (`cadastro.js`) apaga `plano`/`excecoes`. Se apagar, pedir o `cadastro.js` e preservar os campos.
- [ ] Verificar se `importar` (`backup.js`) mantém `plano`/`excecoes`.
- [ ] Testar o preenchimento automático no modal, a atualização do planejado e o aquecimento.
- [ ] (Opcional) Estilizar os checkboxes `#fAq`, `#fWake` e a chama do histórico.
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
- Código **dividido por área**. Arquivo novo só para área nova ou grande, atualizando a ordem dos scripts e este contexto.
- Explicações detalhadas, em linguagem simples.
- Preservar visual e funcionamento existentes.
- Sem Blaze, sem PWA, sem sair do GitHub Pages, **sem notificações push**.
- Telas de treino enxutas: cartão do exercício **só com nome e círculos**; detalhes no ⓘ.
- Sempre enviar este `CONTEXTO.md` atualizado.
- "Descanso" inicia o descanso na hora; a confirmação nunca bloqueia o cronômetro.
- Histórico salvo de forma redundante (documento + `sessoes`).
- Nomes sempre do catálogo. Alterações no histórico só trocam nomes ou aquecimento.
- Backup baixa direto no computador; compartilhar só no celular.
- Aquecimento no histórico, fora das análises.
- Executado vira o planejado do próximo treino.
- No modal, reps/descanso copiam para as séries seguintes; peso segue a regra da 1ª série com `wm`.
- **Agenda fica em Ajustes**; visível só o resumo seg–dom + dias de foco; configurações recolhidas.
- **Resumo semanal igual nas duas telas:** letra em cima, círculo sem data, check em azul do app.
- **Animação da janela ao salvar aprovada:** não alterar.
- **Dias concluídos vêm do histórico**. Exceções/feriados nunca quebram os dias de foco. Hoje nunca conta como falta.
- **Tela ligada é por aparelho** (`localStorage`) e só vale com treino em andamento.
- **Janela ao salvar:** toda sessão salva, uma vez por sessão; respeita "reduzir movimento"; compartilhamento como imagem PNG.
- Cache: `?v=N` nos scripts/CSS, incrementado a cada publicação.

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
| 30/10/2026 | Etapa 2: `agenda.js` (agenda, sequência, exceções, tela ligada) |
| 30/10/2026 | Etapa 3: janela animada ao salvar (`celebrar`) |
| 30/10/2026 | Agenda movida para Ajustes; janela com resumo seg–dom e trava por sessão; cartão só com nome e círculos; `?v=5` |
| 30/10/2026 | Janela ao salvar testada e aprovada. Resumo seg–dom (Ajustes e janela): check azul, círculos sem data (`diasSemana`); botão Compartilhar com imagem PNG em canvas (`imgCele`, `compartilharCele`, `celeBlob`); `?v=6`. Arquivos: `agenda.js`, `style.css`, `index.html`. Regras sem mudanças |
