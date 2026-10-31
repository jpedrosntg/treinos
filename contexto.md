# Contexto do projeto — Treinos

> **Instrução para a IA:** leia este arquivo antes de responder. Toda resposta que alterar
> o projeto deve trazer (1) os arquivos alterados **completos**, (2) explicação detalhada
> e (3) **este CONTEXTO.md atualizado e completo** no final.
> **Nunca presuma nem reconstrua arquivos que não recebeu completos.** Se faltar um arquivo ou ele vier incompleto, peça ao usuário antes de alterar.

**Última atualização:** 31/10/2026

---

## 1. Visão geral
- **O que é:** app web para registrar e executar treinos de musculação, com cronômetro de séries e descanso, histórico, análises, catálogo de exercícios, miniatura dos músculos por exercício, agenda semanal com dias de foco e janela de resumo ao salvar (com compartilhamento em imagem).
- **Público:** uso próprio no início. Depois, abrir para os alunos da esposa (personal trainer).
- **Usuários:** 5 hoje. Meta de 30 a 50.
- **Administrador:** só o Joao Pedro. Ele vê e edita o treino de todos os alunos (inclusive a agenda) e gerencia o catálogo.
- **Alunos:** podem editar o próprio treino, mas só com nomes do catálogo. Podem marcar exercícios como aquecimento e configurar a própria agenda.
- **Forma de uso:** site aberto no navegador. No iPhone, por um **atalho comum do Safari** na Tela de Início. **Não** é um app instalado (PWA), e isso é intencional.

## 2. Situação das funcionalidades
| Funcionalidade | Situação |
|---|---|
| Código do app dividido em 9 arquivos (`base`, `cadastro`, `treino`, `historico`, `analises`, `catalogo`, `musculos`, `backup`, `agenda`) | `musculos.js` novo, aguardando teste |
| Etapa 1: botão ⓘ, textos de dica removidos, notificações removidas | Funcionando |
| Agenda na aba Ajustes: resumo seg–dom, dias de foco, configurações recolhidas | Aguardando teste do visual azul sem datas |
| Janela ao salvar (check, dias de foco, resumo seg–dom) | Funcionando. Animação aprovada: não mexer |
| Janela ao salvar: checks azuis, círculos sem data, "Compartilhar" (PNG) | Aguardando teste |
| Cartão do exercício: miniatura dos músculos + nome + círculos | Novo em 31/10/2026, aguardando teste |
| Licenças e créditos (Ajustes, `#dlgLic`) | Novo em 31/10/2026, aguardando teste |
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
1. Testar os ajustes de 30–31/10/2026 (miniatura dos músculos, licenças, resumo azul, compartilhar).
2. Catálogo completo, com descrição e forma de execução (importação por JSON). O usuário não quer enviar o catálogo atual.
3. ~~Mostrar o grupo muscular de cada exercício na aba Treino~~ (feito com a miniatura, 31/10/2026).
4. Análise da evolução por grupo muscular (pode reaproveitar `MUSC_MAP`/`musc`).
5. Melhorar a análise com IA.
6. Perfil do aluno: dia de foco, meta, calorias a gastar etc.

## 4. Tecnologias e estrutura
- HTML, CSS e JavaScript puros, **sem framework e sem etapa de build**.
- Ícones: Lucide (CDN `unpkg.com/lucide@latest`, sem versão fixa).
- Gráfico radar: SVG gerado à mão no `analises.js`.
- **Miniatura dos músculos:** traçados SVG de `react-native-body-highlighter@3.1.3` (MIT), baixados de `cdn.jsdelivr.net/npm/react-native-body-highlighter@3.1.3/assets/bodyFront.ts` e `bodyBack.ts`, lidos como texto (regex, **sem eval**). O componente React Native **não** é usado (exigiria build).
- Imagem compartilhável: `<canvas>` desenhado à mão no `agenda.js`, Web Share API com arquivo; download como alternativa.
- Firebase SDK 12.4.0 por CDN (módulos ES): App, App Check, Auth, Firestore, AI.
- Tela ligada: API Screen Wake Lock (`navigator.wakeLock`). No iPhone, a partir do iOS 16.4.
- **Aparelhos que precisam funcionar:** iPhone, Android e computador.
- **Cache:** scripts e CSS com `?v=N` no `index.html` (atual: `v=7`). **Aumentar N a cada publicação.**

| Arquivo | Função |
|---|---|
| `index.html` | Telas, modais (exercício `#fAq`, catálogo, padronizar, `#dlgInfo`, `#dlgLic`, confirmar série, encerrar), aba Ajustes: perfil → `#agenda` → Tela ligada → Backup → Licenças e créditos → Conta; barra de navegação. Scripts: lucide → base → cadastro → treino → historico → analises → catalogo → musculos → backup → agenda → firebase.js (todos `?v=N`) |
| `base.js` | Estado global, auxiliares (`$`, `esc`, `mmss`, `novoId`, `normNome`, `serie`, `series`, `faixa`, `lista`, `info`, `feita`, `linhaTempo`, `divLabel`, `tagAq`, `ic`), ícones, `norm`, `setData`, `save`, `renderAll`, telas (`tela`, `ilha`, `renderNav`, `irAba`, `mudarAba`), `setTopo`, `sairDaSessao`, `irInicio`, `renderInicio` (→ `renderAgenda`) |
| `cadastro.js` | Divisão, `renderCad`, `iniciarDoCadastro`, `abrirExec`, modal do exercício (`del`, `lerSeries`, `gerarSeries`, `autoPeso`, `openForm`, `closeForm`, `saveForm`) |
| `treino.js` | Sessão (`resetSessao`, `iniciarSessao`, `atualizarPlano`, `encerrar` → `celebrar(div,id)`, `status`, `trocar`), `render` (cartão `.exrow`: `musc(e)` + `.exbody` com arrastar/nome/ⓘ/lápis/lixeira/círculos/tempos), `infoEx`, execução, arrastar, cronômetro |
| `historico.js` | `renderHist`, `delHist`, `togAq` |
| `analises.js` | `media`, `numReps`, `histEx`, `calcAnalise`/`window.dadosAnalise`, filtros, radar, `renderAnalise` |
| `catalogo.js` | `GRUPOS`, `catalogo`, `catAcha`, `avisoFora`, `setCatalogo`, `renderCatalogo`, campo Nome, modal do catálogo, `importarCat`, padronização |
| `musculos.js` | `MUSC_VER`, `MUSC_URL`, `MUSC_MAP`, `MUSC_OK`, `muscDados`, `muscCache`, `muscTentou`, `muscLer`, `muscBox`, `muscCarregar`, `musc` |
| `backup.js` | `ehMovel`, `baixar`, `compartilhar`, `exportar`, `exportarHist`, `importar` |
| `agenda.js` | Agenda (`SEMANA`, `MESES`, `agMes`, `agAberto`, `dk`, `diaSessao`, `diasFeitos`, `sequencia`, `semanaAtual`, `diasSemana`, `resumoSemana`, `avisoPlano`, `renderAgenda`, `togPlano`, `togExc`, `agNav`); janela (`celeFeita`, `celeBlob`, `celebrar`, `fecharCele`, `imgCele`, `compartilharCele`); tela ligada (`WKEY`, `wLock`, `wPed`, `telaLigada`, `atualizarWake`, `setTelaLigada`, `renderWakeUI`, `visibilitychange`) |
| `firebase.js` | Auth, Firestore, App Check, IA. Expõe funções em `window.*` |
| `style.css` | Tema escuro, mobile-first. Agenda/resumo/janela; `.exrow`, `.exbody`, `.musc` (`.p` azul, `.s` azul translúcido); `.lic` |

- O repositório tem **apenas** esses 12 arquivos. Não há manifest, ícone nem service worker.
- **Comunicação entre arquivos:** scripts comuns, globais compartilhadas. Chamadas protegidas: `window.renderAgenda&&`, `window.atualizarWake&&`, `window.renderWakeUI&&`, `window.celebrar`, `window.musc?`.
- Não declarar o mesmo nome global em dois arquivos.
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
- `aq` (opcional): aquecimento. Fica no histórico, fora das análises e da IA.
- No histórico, `series` = executado e `plan` = planejado (antigas sem `plan`).
- **Ordem cronológica** = posição em `hist`. Não ordenar pelo texto de `data`.
- `plano` e `excecoes` vão para a nuvem junto com `dados`.
- **Tela ligada:** `localStorage['treinos_tela']`, por aparelho.
- **Grupos do catálogo:** peito, costas, ombros, trapezio, biceps, triceps, pernas, gluteos, panturrilha, abdomen, antebraco (`GRUPOS`). Exercícios **não** guardam músculos: vêm do catálogo (`catAcha(name)` → `grupo`, `secundarios`).

### Miniatura dos músculos (`musculos.js`)
- `musc(e)`: busca o exercício no catálogo; sem catálogo → `''` (cartão normal). Primeira chamada dispara `muscCarregar()` (uma tentativa por carregamento da página); ao terminar, chama `render()` se estiver na aba Treino.
- `muscLer` separa o texto por `slug:` e pega os traçados `"M…"` (filtrados por `MUSC_OK`). `muscBox` calcula o `viewBox` com `getBBox()` fora da tela.
- `MUSC_MAP`: peito→chest; costas→upper-back, lower-back; ombros→deltoids; trapezio→trapezius; biceps; triceps; pernas→quadriceps, hamstring, adductors; gluteos→gluteal; panturrilha→calves; abdomen→abs, obliques; antebraco→forearm.
- Cores: principal `.p` = `--pri`; secundários `.s` = `#3b82f673`; demais `#2a2f3a`. HTML guardado em `muscCache` por `grupo|secundarios`.
- Tamanho: 64 px de altura (56 px em ≤360 px), frente + costas, à esquerda, centralizado. `pointer-events:none` (não atrapalha arrastar/toques).
- **Não confirmado:** existência de `assets/bodyBack.ts` na 3.1.3 (só `bodyFront.ts` foi verificado). Se faltar, aparece só a frente.

### Licenças (`index.html` → `#dlgLic`)
- Cartão "Licenças e créditos" em Ajustes abre `#dlgLic` (fecha no botão ou tocando fora).
- react-native-body-highlighter: MIT, "Copyright (c) 2022 ELABBASSI Hicham" — **verificado** (npm + LICENSE) em 31/10/2026; texto completo exibido.
- Lucide: ISC (partes do Feather, MIT) — texto inserido de memória, **conferir com o LICENSE oficial**.
- Firebase JS SDK: Apache-2.0 — só link para o texto completo; sem linha de copyright presumida.
- `react-native-svg` (dependência da biblioteca) **não** é usado.

### Agenda (`agenda.js` + `#agenda` na aba Ajustes)
- Cartão "Sua semana" (com treino ou histórico). Atualizado ao abrir Ajustes e pelo `renderInicio`.
- **Sempre visível:** dias de foco (`cseq`) e resumo seg–dom (`.csem.fixo`): letra em cima, círculo sem data; treinou = azul com ✓; planejado = contorno azul; exceção = cinza; hoje = contorno laranja.
- **Recolhido** em `<details class="agcfg">`: dias (`togPlano`), calendário (`agNav`, `togExc`), legenda. Calendário mantém datas e "Concluído" verde.
- **Dias de foco (`sequencia`)**: para no primeiro dia planejado, passado, sem treino e fora das exceções. Hoje nunca é falta. Retorna 0 se `plano` vazio.

### Janela ao salvar (`agenda.js`)
- `encerrar(true)` → `try{renderAll()} finally{celebrar(div,sid)}`; sem duplicação (`sessao` + `celeFeita`). Não aparece em "Não salvar".
- Check verde animado (**não mexer**), título, data, contador, resumo seg–dom, **Compartilhar** e **Fechar**.
- `imgCele` desenha PNG 1080×1350 em `celeBlob` ao abrir; `compartilharCele` usa `navigator.share({files})` ou baixa `treino-AAAA-MM-DD.png`.

### Tela ligada (`agenda.js`)
- `atualizarWake()` com opção ligada + treino em andamento + página visível. `renderWakeUI()` preenche `#fWake`/`#wakeInfo`.

### Cartão do exercício (aba Treino)
- Miniatura dos músculos + alça de arrastar, nome, ⓘ/lápis/lixeira, círculos (reps + kg) e tempos. Sem linha de resumo, etiqueta de aquecimento ou aviso fora do catálogo.

### Modal do exercício: séries (`cadastro.js`)
- `fSer` (`{p, w, r, wm}`), `gerarSeries()`, `lerSeries()`, `autoPeso(ev)`; nada é gravado até `saveForm` (`{w, r, p}`).

### Informações do exercício (`treino.js`)
- `infoEx(i)`: grupo principal, secundários, "Como executar", aviso fora do catálogo, etiqueta de aquecimento.

### Aquecimento
- `#fAq`; `tagAq(e)` (no ⓘ); `encerrar` leva `aq`; `togAq(k,n)`; `histEx()` ignora `aq`; `padLista` chave `nome|aq`.

### Nomes e catálogo
- `normNome`, `catAcha`, `#fnSug`, `#fnAviso` (`prepNome`), `saveForm` só aceita catálogo, `salvarCat` sem repetidos.
- `importarCat` (admin): `[{nome, grupo, secundarios?, descricao?}]` ou `{exercicios:[...]}`.
- Padronizar nomes (admin, sem treino em andamento): troca `name`, guarda `nomeOriginal`, chama `atualizarSessoes`.

### Backup (`backup.js`)
- `compartilhar(obj,nome)` no celular; `baixar()` no computador. `importar(inp)` com confirmação (`plano`/`excecoes`: não confirmado).

### Execução e confirmação de série (`treino.js`)
- Fases `serie` → `descanso` → … → `fim`. "Descanso" registra `done[div+i][j]={t,d:null,p,w}` e abre `dlgSerie` sem parar o cronômetro. "Voltar" desfaz. `atualizarPlano` em `encerrar(true)`.

### Histórico na nuvem (`firebase.js`)
- `treinos_teste/{uid}.dados` + `treinos_teste/{uid}/sessoes/{id}`; fila `localStorage['treinos_pend']`; `reenviarPendentes()`; `mesclar()` por `id`.

### Análises (`analises.js`)
- `histEx()` por nome, `feitas > 0`, sem `aq`. IA: 1ª × última. Radar: 3 últimas. Comparação: penúltima × última.

## 5. Firebase
- **Projeto:** `treinos-teste`, plano **Spark**. Sem Blaze.
- **authDomain:** `treinos-teste.firebaseapp.com`.
- **Login:** Google por popup, `signInWithRedirect` como alternativa; `setPersistence`.
- **Firestore:** `treinos_teste/{uid}` → `{ email, nome, dados, atualizado }`; `treinos_teste/{uid}/sessoes/{id}` → `{ dados, ts, tipo }`; `exercicios/{id}` → `{ nome, grupo, secundarios[], descricao, atualizado }`; `admins/{email}`.
- **App Check:** reCAPTCHA Enterprise. Modo obrigatório: não sei.
- **IA:** Firebase AI Logic, `gemini-2.5-flash`, JSON.
- **Domínios autorizados:** não confirmados (`jpedrosntg.github.io` precisa estar).

### Regras do Firestore (sem mudanças)
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

      match /sessoes/{sid} {
        allow read, write: if request.auth != null && (request.auth.uid == uid || isAdmin());
      }
    }

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
- Coleção nova exige regra nova no Console. Limite de 1 MB por documento.

## 6. Publicação
- **Repositório:** https://github.com/jpedrosntg/treinos — **GitHub Pages** `https://jpedrosntg.github.io/treinos/`.
- Upload pelo site do GitHub. Regras pelo Console.
- **Ajuste de 31/10/2026:** subir juntos `musculos.js` (novo), `treino.js`, `index.html` (`v=7`) e `style.css`.
- **A cada publicação:** aumentar `?v=N` (próximo: `v=8`).
- Testes não são feitos antes de publicar. Um amigo cuida do visual pelo GitHub.

## 7. Pendências conhecidas
- [ ] Testar a miniatura dos músculos (carregamento, cores, frente + costas, arrastar, telas estreitas).
- [ ] Confirmar o nome `assets/bodyBack.ts` na 3.1.3.
- [ ] Conferir o texto da licença do Lucide e fixar a versão do Lucide.
- [ ] Verificar se termos de reCAPTCHA/Google precisam de aviso no app (não incluído).
- [ ] Testar a janela de licenças.
- [ ] Testar resumo seg–dom azul sem datas e o botão Compartilhar (iPhone, Android, computador).
- [ ] (Opcional) "Concluído" do calendário mensal em azul.
- [ ] Testar agenda em Ajustes, cartão do exercício e tela ligada.
- [ ] Verificar se "Recomeçar do zero" (`cadastro.js`) apaga `plano`/`excecoes`.
- [ ] Verificar se `importar` (`backup.js`) mantém `plano`/`excecoes`.
- [ ] Testar preenchimento automático, atualização do planejado e aquecimento.
- [ ] Testar o backup nos três aparelhos.
- [ ] Publicar a regra `sessoes` no Console, se ainda não foi.
- [ ] Importar o catálogo completo por JSON.
- [ ] Testar campo Nome, padronização, fluxo da série, cópia de segurança, login no iPhone e Análises.
- [ ] Conferir domínios autorizados e modo do App Check.
- [ ] (Opcional) Estilizar checkboxes; renomear `autoPeso`; IA penúltima × última; `plan` × executado no histórico; mover texto "Sua evolução".
- [ ] (Futuro) Tirar o `hist` do campo `dados`.

## 8. Decisões e preferências
- Arquivos **sempre completos**, só os que mudaram. **Nunca presumir nem reconstruir** arquivos não recebidos.
- Código **dividido por área**; arquivo novo só para área nova (ex.: `musculos.js`).
- Explicações detalhadas, em linguagem simples. Preservar visual e funcionamento.
- Sem Blaze, sem PWA, sem sair do GitHub Pages, **sem notificações push**, **sem build**.
- Cartão do exercício: miniatura dos músculos + nome + círculos; detalhes no ⓘ.
- Código de terceiros: usar só dados (traçados), nunca executar código baixado; versão fixa; licença exibida em Ajustes.
- Sempre enviar este `CONTEXTO.md` atualizado.
- "Descanso" inicia na hora; confirmação nunca bloqueia o cronômetro.
- Histórico redundante (documento + `sessoes`). Nomes sempre do catálogo.
- Aquecimento no histórico, fora das análises. Executado vira o planejado.
- Agenda em Ajustes; resumo igual nas duas telas (azul, sem datas). Animação da janela aprovada: não alterar.
- Dias concluídos vêm do histórico; exceções não quebram dias de foco; hoje nunca é falta.
- Tela ligada por aparelho. Janela ao salvar uma vez por sessão; compartilhamento em PNG.
- Cache: `?v=N` incrementado a cada publicação.

## 9. Histórico de alterações
| Data | Alteração |
|---|---|
| — | Grupos secundários com seleção múltipla; login popup + redirect |
| 23/10/2026 | Criação deste arquivo; `index.html` sem modo app/manifest; regras registradas |
| 28/10/2026 | Análises refeitas; confirmação de série; histórico na nuvem (`sessoes`, fila, mesclagem) |
| 30/10/2026 | Catálogo (Trapézio, nome obrigatório, importação, padronização); backup; aquecimento; `atualizarPlano`; divisão em arquivos |
| 30/10/2026 | Etapas 1–3: ⓘ, agenda, sequência, tela ligada, janela ao salvar |
| 30/10/2026 | Agenda em Ajustes; cartão enxuto; `?v=5`. Resumo azul sem datas; Compartilhar PNG; `?v=6` |
| 31/10/2026 | `musculos.js` (miniatura dos músculos com traçados do react-native-body-highlighter 3.1.3, MIT); `treino.js` (`.exrow`/`.exbody` + `musc`); `index.html` (cartão e `#dlgLic` de licenças, script novo, `?v=7`); `style.css` (`.musc`, `.lic`). Regras sem mudanças |
