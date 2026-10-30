# Contexto do projeto — Treinos

> **Instrução para a IA:** leia este arquivo antes de responder. Toda resposta que alterar
> o projeto deve trazer (1) os arquivos alterados **completos**, (2) explicação detalhada
> e (3) **este CONTEXTO.md atualizado e completo** no final.

**Última atualização:** 30/10/2026

---

## 1. Visão geral
- **O que é:** app web para registrar e executar treinos de musculação, com cronômetro de séries e descanso, histórico, análises e catálogo de exercícios.
- **Público:** uso próprio no início. Depois, abrir para os alunos da esposa (personal trainer).
- **Usuários:** 5 hoje. Meta de 30 a 50.
- **Administrador:** só o Joao Pedro. Ele vê e edita o treino de todos os alunos e gerencia o catálogo.
- **Alunos:** podem editar o próprio treino, mas só com nomes do catálogo. Podem marcar exercícios como aquecimento (no treino e no histórico).
- **Forma de uso:** site aberto no navegador. No iPhone, por um **atalho comum do Safari** na Tela de Início. **Não** é um app instalado (PWA), e isso é intencional.

## 2. Situação das funcionalidades
| Funcionalidade | Situação |
|---|---|
| Cadastro de treino (divisões A a E, séries individuais) | Estável |
| Preenchimento automático das séries no modal (reps e descanso para as séries seguintes; peso da 1ª série) | Reps/descanso novos em 30/10/2026, aguardando teste |
| Nome do exercício obrigatório do catálogo (lista de sugestões) | Nova em 30/10/2026, aguardando teste |
| Exercício de aquecimento (`aq`): opção no modal, etiqueta, chama no histórico, fora das análises | Nova em 30/10/2026, aguardando teste |
| Execução: sessão, cronômetro, descanso, "ilha", desfazer, arrastar para reordenar | Estável |
| Confirmação de cada série (reps e carga), aberta junto com o descanso | Refeita em 28/10/2026, aguardando teste |
| Executado vira o planejado do próximo treino (`atualizarPlano`) | Nova em 30/10/2026, aguardando teste |
| Cópia de segurança do histórico (subcoleção `sessoes` + fila local) | Nova em 28/10/2026, aguardando teste |
| Login com Google (inclusive pelo atalho do iPhone) | Corrigido em 23/10/2026, aguardando teste |
| Histórico | Em ajuste. Grava os valores executados. Permite marcar/desmarcar aquecimento |
| Análises: filtro de divisão, filtro de exercícios, radar dos 3 últimos treinos da divisão, comparação penúltima × última | Refeita em 28/10/2026, aguardando teste. Ignora aquecimentos |
| Análise com IA (Gemini, só admin) | Em ajuste. Compara a 1ª com a última sessão, com todas as divisões. Ignora aquecimentos |
| Catálogo de exercícios (grupo principal + secundários, inclui Trapézio) | Em ajuste |
| Importar catálogo por JSON (admin) | Nova em 30/10/2026, aguardando teste |
| Padronizar nomes do treino e do histórico de um aluno (admin) | Nova em 30/10/2026, aguardando teste. Aquecimento não conflita com trabalho |
| Backup (exportar/importar JSON) | Corrigido em 30/10/2026 (não funcionava no computador), aguardando teste |
| Ajustes: perfil | Em ajuste |
| Notificações de descanso | **Desconsiderada.** Não funciona e não será implementada (exige plano Blaze) |

## 3. Roadmap (em ordem de prioridade)
1. Catálogo completo, com descrição e forma de execução de cada exercício (usar a importação por JSON).
2. Mostrar o grupo muscular principal de cada exercício na aba Treino.
3. Análise da evolução por grupo muscular.
4. Melhorar a análise com IA.
5. Perfil do aluno: dia de foco, meta, calorias a gastar etc.

## 4. Tecnologias e estrutura
- HTML, CSS e JavaScript puros, **sem framework e sem etapa de build**.
- Ícones: Lucide (CDN `unpkg.com/lucide@latest`, sem versão fixa).
- Gráfico radar: SVG gerado à mão no `app.js`, sem biblioteca.
- Firebase SDK 12.4.0, carregado por CDN (módulos ES).
- **Aparelhos que precisam funcionar:** iPhone, Android e computador.

| Arquivo | Função |
|---|---|
| `index.html` | Telas, modais (exercício com opção Aquecimento `#fAq`, catálogo, padronizar nomes, confirmar série, encerrar) e barra de navegação. `#fSeries` tem `oninput="autoPeso(event)"`. Ordem dos scripts: lucide → app.js → firebase.js |
| `app.js` | Lógica do app: estado, treino, preenchimento automático das séries, cronômetro, histórico, aquecimento, atualização do planejado, análises, catálogo, importação, padronização, backup |
| `firebase.js` | Auth, Firestore (incluindo a cópia das sessões e a importação do catálogo), App Check, Functions, Messaging, IA. Expõe funções em `window.*` |
| `style.css` | Visual em tema escuro, mobile-first |

- O repositório tem **apenas** esses 4 arquivos. Não há manifest, ícone nem service worker.
- O `index.html` **não deve** ter `apple-mobile-web-app-capable` nem `mobile-web-app-capable`. Com essas linhas, o atalho do iPhone abre em modo app isolado e o login quebra.
- O `firebase.js` usa variáveis e funções globais do `app.js` (`data`, `sessao`, `ic`, `esc`, `novoId`, `KEY`, `setTopo`, `tela`, `setData`, `setCatalogo`, `resetSessao`, `stopTimer`, `sairDaSessao`). Por isso, **a ordem dos scripts não pode mudar**.
- Funções do `firebase.js` usadas pelo `app.js`: `salvarNuvem`, `salvarSessao`, `atualizarSessoes`, `excluirSessao`, `salvarExercicio`, `excluirExercicio`, `importarCatalogo`, `souAdmin`, `notifAgendar`, `notifCancelar`, `atualizarNotifUI`, `renderPerfil`.

### Modelo de dados (`data` em app.js)
```js
{ divs:['A','B'], A:[exercicio], B:[...], C:[], D:[], E:[], hist:[sessao] }
exercicio = { name, sets, reps, weight, rest, series:[{p:reps, w:peso, r:descanso}], nomeOriginal?, aq? }
sessao    = { id, ts, tipo:'A', data:'dd/mm/aaaa, hh:mm:ss', dur:seg,
              ex:[{...exercicio, plan:[planejado], series:[executado], feitas, tempos[], descansos[]}] }
```
- **`id`:** código único da sessão, gerado por `novoId()`. **`ts`:** momento em que a sessão foi salva (`Date.now()`). Sessões antigas recebem `id` no primeiro carregamento, mas não têm `ts`.
- **`nomeOriginal`** (opcional): o primeiro nome que o exercício teve antes de ser trocado para o nome do catálogo (na edição ou na padronização). Nunca é sobrescrito.
- **`aq`** (opcional, `true`): exercício de aquecimento. Fica no histórico, mas não entra nas análises nem na IA. Quando é falso, o campo não é gravado.
- **No histórico,** `series` guarda os valores **executados** e `plan` guarda os planejados. Sessões antigas não têm `plan`, e nelas `series` = planejado.
- **Ordem cronológica:** é a posição em `hist`. Ao juntar as cópias, o app ordena por `ts` com ordenação estável, e as sessões sem `ts` ficam no início. Não ordenar pelo texto de `data`.
- **Grupos do catálogo** (podem mudar): peito, costas, ombros, trapezio, biceps, triceps, pernas, gluteos, panturrilha, abdomen, antebraco. Ficam na constante `GRUPOS` do `app.js`.

### Modal do exercício: séries (`app.js`)
- `fSer`: lista de trabalho das séries no modal (`{p, w, r, wm}`). `gerarSeries()` monta as linhas `.srow` com os campos `.p` (reps), `.w` (peso) e `.r` (descanso). Novas séries copiam a última. `lerSeries()` lê os campos sem perder outras propriedades (`...fSer[j]`).
- **`autoPeso(ev)`** (nome mantido por causa do `oninput` no `index.html`):
  - **Reps (`.p`) e descanso (`.r`):** o valor digitado na série *j* é copiado para **todas** as séries seguintes (*j+1* até a última), inclusive as que estão escondidas em `fSer` (quando o número de séries foi reduzido). As séries anteriores não mudam. Os dois campos são independentes e não alteram o peso.
  - **Peso (`.w`):** o da 1ª série vai para as seguintes que ainda não foram editadas à mão. A marca `wm` (peso manual) protege essas séries. `openForm` marca `wm` nas séries com peso diferente do da 1ª.
- Nada é gravado até o **Salvar** (`saveForm`), que grava só `{w, r, p}` em cada série.

### Aquecimento (`app.js` + `index.html`)
- **Modal do exercício:** checkbox `#fAq`. `openForm` preenche, `saveForm` grava `aq:true` se marcado.
- **`tagAq(e)`:** etiqueta "Aquecimento • fora das análises" nos cartões do Treino, do Cadastro e do Histórico.
- **`encerrar`:** copia o exercício com `...e`, então a sessão já leva o `aq`.
- **`togAq(k,n)`** (todos os usuários): botão de chama em cada exercício do card do histórico. Pede confirmação, só alterna o `aq`, salva o documento e chama `atualizarSessoes([h])`. Zera `anSel`.
- **`histEx()`** ignora `e.aq`. Com isso, o radar, a comparação e `calcAnalise` (IA) excluem aquecimentos.
- **`padLista`:** a chave de conflito é `nome normalizado + '|aq'` quando é aquecimento. Aquecimento e trabalho com o mesmo nome convivem. Dois exercícios do mesmo tipo com o mesmo nome continuam bloqueados.

### Nomes e catálogo (`app.js`)
- `normNome(s)`: tira acentos, deixa minúsculo e junta espaços. Serve para comparar nomes.
- `catAcha(nome)`: procura no catálogo pelo nome normalizado.
- **Campo Nome do modal de exercício:** lista de sugestões própria (`#fnSug`, até 8 itens), sem `datalist`. Mostra o aviso `#fnAviso`: verde se o nome está no catálogo, laranja se não está. `prepNome()` cria esses elementos se eles faltarem.
- **`saveForm`:** só salva se o nome estiver no catálogo (alunos e admin) e grava o nome com a escrita exata do catálogo. Com o catálogo vazio ou ainda carregando, não salva.
- **`avisoFora(e)`:** mostra "Fora do catálogo" nos cartões do treino e do cadastro.
- `setCatalogo` chama `renderAll()` para atualizar esses avisos.
- **`salvarCat`:** não aceita nome repetido no catálogo (comparando pelo nome normalizado).
- **Importar catálogo** (`importarCat`, botão `#bImpCat`, só admin): o arquivo é uma lista JSON `[{nome, grupo, secundarios?, descricao?}]` ou `{exercicios:[...]}`.
  - O grupo aceita a chave (`peito`) ou o nome (`Peito`).
  - Se o nome já existe, o exercício é atualizado, e os campos ausentes no arquivo continuam como estavam.
  - Itens inválidos ou repetidos no arquivo são ignorados.
  - O app pede confirmação antes de gravar e mostra quantos são novos, atualizados e ignorados.
- **Padronizar nomes** (`abrirPadronizar` / `aplicarPadronizar`, `#modalPad`, botão `#bPadr`, só admin): age no aluno que está aberto e não funciona com treino em andamento.
  - Lista os nomes do treino e do histórico que são diferentes do catálogo.
  - Diferença só de escrita: o nome do catálogo já vem marcado. Outros casos começam em "Não alterar" e mostram os mais parecidos primeiro (`parecidos`).
  - Só troca o `name` e guarda `nomeOriginal`. Séries, cargas, tempos e datas não mudam.
  - `padLista` não troca quando a troca juntaria dois exercícios diferentes (do mesmo tipo: trabalho ou aquecimento) no mesmo treino ou sessão, e avisa quais ficaram de fora, com a dica de marcar aquecimento.
  - Depois, salva o documento e chama `atualizarSessoes` com as sessões alteradas.

### Backup (`app.js`)
- `exportar()` (tudo), `exportarHist()` (só histórico) e o botão "Baixar backup antes" usam `compartilhar(obj,nome)`.
- **`compartilhar`:** no celular (`ehMovel()`), usa o menu de compartilhar se `navigator.canShare` aceitar arquivos. No computador, ou se compartilhar falhar, faz download direto com `baixar()` (link colocado na página, clicado e removido em seguida). Se o usuário cancelar (`AbortError`), nada acontece. Qualquer outro erro aparece em `alert`.
- **`importar(inp)`:** aceita arquivos com `A` ou `divs`. Se faltar `hist`, usa uma lista vazia. Não importa com treino em andamento. Pede confirmação mostrando o número de sessões e avisa quando termina. Erros de leitura também aparecem.

### Execução e confirmação de série (`app.js`)
- **Fases (`fase`):** `serie` → `descanso` → `serie`… Na última série: `serie` → `fim`.
- **Toque em "Descanso"** (fase `serie`):
  1. `guardar()` (para poder desfazer).
  2. Registra `done[div+i][j]={t,d:null,p,w}` com os valores **planejados**.
  3. Inicia o cronômetro de descanso **no mesmo toque**. Na última série, para o cronômetro e vai para `fim`.
  4. Abre o modal `dlgSerie` (`abrirSerie(i,j)`).
- **O modal não interfere no cronômetro.** `confirmarSerie()` só troca `p` e `w`. "Manter o planejado" (`fecharSerie()`) mantém o planejado. Na última série, os dois botões abrem o `dlgFim` em seguida.
- O modal mostra o planejado e a **série anterior** do mesmo exercício.
- **"Voltar"** desfaz o registro e fecha o modal.
- O descanso real (`d`) é gravado no "Próximo" ou ao encerrar durante o descanso.
- **Executado vira o próximo planejado** (`atualizarPlano(div)`, chamada em `encerrar(true)`):
  - Só roda ao **salvar** no histórico. "Não salvar" não altera o treino.
  - Roda **depois** de montar a sessão (`plan` = planejado original, `series` = executado) e **antes** do único `save()`.
  - Para cada série feita (`done`) com `p`/`w` diferentes do planejado, grava em `e.series[j]` as reps e a carga executadas. O descanso (`r`), as séries não feitas, `aq`, `nomeOriginal` e o nome não mudam.
  - Recalcula `reps`, `weight` e `rest` (campos antigos). A mensagem de encerramento mostra quantos exercícios foram atualizados.
  - Não mexe na subcoleção `sessoes`.

### Histórico na nuvem (`firebase.js`)
- **Documento principal:** `treinos_teste/{uid}.dados` (JSON completo, incluindo `hist`).
- **Cópia de segurança:** `treinos_teste/{uid}/sessoes/{id}` → `{ dados, ts, tipo }`. É gravada ao encerrar com "Salvar" (`salvarSessao`) e regravada depois da padronização e da marcação de aquecimento (`atualizarSessoes`).
- **Fila local** (`localStorage['treinos_pend']`): a sessão entra na fila antes do envio e só sai depois que o Firestore confirma. `reenviarPendentes()` roda no login.
- **`abrirUsuario`:** junta o documento e a subcoleção com `mesclar()` (sem duplicar, pelo `id`). As sessões que só existem na cópia voltam para o `hist`, e as que faltam na nuvem são enviadas. Se a leitura da subcoleção falhar, o app não tenta reenviar tudo.
- **`delHist`** apaga a sessão nos dois lugares (`excluirSessao`).
- Importar um backup substitui o `hist` do documento, mas as cópias continuam. Por isso, as sessões que não estão no backup voltam no próximo carregamento.

### Análises (`app.js`)
- `histEx()`: agrupa o histórico por exercício, usando o nome em minúsculas como chave. Considera só ocorrências com `feitas > 0` e **sem `aq`**. Depois da padronização, nomes antes diferentes passam a contar como um exercício só.
- Métricas: `peso` (máximo), `reps` (média), `series`, `volume` (Σ peso×reps), `tSerie`, `tDesc`.
- `calcAnalise()` / `window.dadosAnalise`: dados para a IA (1ª × última, todas as divisões).
- **Filtro de divisão** (`anDiv`, `anSetDiv`) e **filtro de exercícios** (`anSel`, `anKeys`, `anToggle`, `anTodos`) voltam ao padrão no `setData`. A padronização e o `togAq` também zeram o `anSel`.
- **Radar** (`radar(ex,sel,div)`): viewBox 400×340, as 3 sessões mais recentes da divisão. Nomes com quebra de linha (`quebra`). Métrica: volume, ou total de reps em exercícios sem carga. 100% = maior valor do exercício. Com menos de 3 exercícios, aparece um aviso.
- **Comparação detalhada:** penúltima × última ocorrência dentro da divisão.
- O texto do cartão "Sua evolução" é trocado pelo `renderAnalise`.

## 5. Firebase
- **Projeto:** `treinos-teste`, plano **Spark** (gratuito). Não há intenção de migrar para o Blaze.
- **authDomain:** `treinos-teste.firebaseapp.com`.
- **Login:** Google por popup, com `signInWithRedirect` se o popup for bloqueado. `getAuth` + `setPersistence` (IndexedDB e, como alternativa, localStorage). Não usa `initializeAuth` nem `getRedirectResult`.
- **Firestore:**
  - `treinos_teste/{uid}` → `{ email, nome, dados: JSON.stringify(data), atualizado }`
  - `treinos_teste/{uid}/sessoes/{id}` → `{ dados, ts, tipo }`
  - `exercicios/{id}` → `{ nome, grupo, secundarios[], descricao, atualizado }`. A importação usa `writeBatch` em blocos de 400.
  - `admins/{email}` → se o documento existir, o usuário é admin (criado só pelo Console)
- **App Check:** reCAPTCHA Enterprise. Modo de aplicação obrigatória: não sei.
- **IA:** Firebase AI Logic, `gemini-2.5-flash`, resposta em JSON.
- **Functions** (`agendarDescanso`/`cancelarDescanso`): não existem. O código de notificações está inativo.
- **Domínios autorizados:** não confirmados. `jpedrosntg.github.io` precisa estar na lista.

### Regras do Firestore (versão com `sessoes`; sem mudanças em 30/10/2026)
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
- **Ao criar uma coleção nova,** é preciso adicionar a regra dela aqui e publicar no Console.
- **Limite:** cada documento tem no máximo 1 MB. O histórico inteiro ainda fica em `dados`.

## 6. Publicação
- **Repositório:** https://github.com/jpedrosntg/treinos
- **Hospedagem:** GitHub Pages, em `https://jpedrosntg.github.io/treinos/`. A decisão é **continuar no GitHub Pages**.
- **Como publica:** upload de arquivos pelo site do GitHub. As regras do Firestore são publicadas pelo Console (**antes** de subir arquivos que dependem delas).
- **Os 4 arquivos de 30/10/2026 precisam subir juntos.** A correção do backup mudou só o `app.js`. O aquecimento mudou `app.js` + `index.html` (subir juntos). A atualização do planejado e o preenchimento automático de reps/descanso mudaram só o `app.js`.
- **Testes:** não são feitos antes de publicar.
- **Colaborador:** um amigo cuida do visual pelo GitHub.
- **Backup:** exportação em JSON pelo app + cópia automática das sessões em `sessoes`.

## 7. Pendências conhecidas
- [ ] Testar o preenchimento automático no modal: reps e descanso editados numa série vão para as seguintes (não para as anteriores), um não altera o outro nem o peso, o peso da 1ª série continua respeitando `wm`, e as séries escondidas recebem o valor ao aumentar o número de séries.
- [ ] Testar a atualização do planejado: mudar carga/reps no modal, salvar, conferir o cartão do treino (novo valor), o histórico (`plan` antigo × `series` executado) e a permanência após recarregar. Conferir que "Não salvar" não muda o treino.
- [ ] Testar o aquecimento: marcar no modal, etiqueta nos cartões, chama no histórico (marcar/desmarcar), conferir que sai das análises e que a padronização passa no caso "Puxada Frente" × aquecimento.
- [ ] (Opcional) Estilizar no `style.css` o checkbox `#fAq` e a chama do histórico.
- [ ] Testar o backup no computador (exportar tudo, só histórico, "Baixar backup antes" e importar). Se o importar não abrir a janela de arquivo, revisar o botão no `index.html`.
- [ ] Testar o backup no iPhone e no Android (menu de compartilhar).
- [ ] Publicar a regra nova (`sessoes`) no Console, se ainda não foi publicada.
- [ ] Importar o catálogo completo por JSON e conferir a contagem de novos, atualizados e ignorados.
- [ ] Testar o campo Nome: sugestões, aviso verde e laranja, bloqueio ao salvar com nome fora do catálogo, aviso "Fora do catálogo" nos cartões.
- [ ] Testar a padronização em um aluno: baixar o backup antes, aplicar, conferir histórico e análises, e conferir no Console as sessões atualizadas em `sessoes`.
- [ ] Testar o novo fluxo da série (descanso no toque, modal, Voltar, última série, valores executados no histórico).
- [ ] Testar a cópia de segurança (Console, treino sem internet, reabrir com internet).
- [ ] Testar o login pelo novo atalho do iPhone (apagar o atalho antigo e criar de novo).
- [ ] Testar a aba de Análises e confirmar que os filtros voltam ao padrão ao trocar de aluno.
- [ ] (Opcional) Renomear `autoPeso` para `autoSeries` (exige mudar o `oninput` no `index.html` junto).
- [ ] (Opcional) Fazer a IA comparar a penúltima com a última sessão e/ou usar a divisão escolhida.
- [ ] (Opcional) Mostrar no histórico a diferença entre o planejado (`plan`) e o executado.
- [ ] (Opcional) Mover o texto do cartão "Sua evolução" para o `index.html`.
- [ ] Remover o cartão "Aviso de fim do descanso" e o código de notificações (`firebase.js` + `agendar`/`cancelar` no `app.js`), alterando os arquivos juntos.
- [ ] Fixar a versão do Lucide em vez de `@latest`.
- [ ] Conferir no Console os domínios autorizados e o modo do App Check.
- [ ] Revisar histórico, catálogo e ajustes.
- [ ] (Futuro) Tirar o `hist` do campo `dados` e ler só da subcoleção `sessoes`.

## 8. Decisões e preferências
- Respostas com **arquivos sempre completos**, sem trechos nem reticências. O `app.js` vai **inteiro em um único bloco**, nunca dividido em partes.
- **Explicações detalhadas** e em linguagem simples.
- Preservar o visual e o funcionamento existentes.
- Sem plano Blaze, sem PWA instalado, sem sair do GitHub Pages.
- Sempre enviar este `CONTEXTO.md` atualizado junto com as alterações.
- O toque em "Descanso" inicia o descanso **na hora**. A confirmação nunca bloqueia nem atrasa o cronômetro.
- O histórico precisa ficar salvo de forma redundante (documento principal + `sessoes`).
- Nomes de exercícios vêm **sempre do catálogo**. Alterações no histórico só podem **trocar nomes ou a marcação de aquecimento**, nunca apagar ou substituir sessões, séries ou cargas.
- No computador, o backup **baixa direto**. O menu de compartilhar só é usado no celular.
- Aquecimento fica **no histórico**, mas **fora das análises**. Qualquer usuário pode marcar ou desmarcar.
- As reps e cargas **executadas** (confirmadas) numa sessão salva viram o **planejado do próximo treino**. O histórico mantém a distinção `plan` × `series`.
- No modal do exercício, editar as **reps** ou o **descanso** de uma série copia o valor para **todas as séries seguintes**, nunca para as anteriores. Os campos são independentes. O peso mantém a regra da 1ª série com proteção `wm`.

## 9. Histórico de alterações
| Data | Alteração |
|---|---|
| — | Grupos secundários do catálogo passaram a usar lista de seleção múltipla |
| — | Login: popup com redirect como alternativa e persistência por `setPersistence` |
| 23/10/2026 | Criação deste arquivo de contexto |
| 23/10/2026 | Removidas do `index.html` as linhas de modo app e de manifest |
| 23/10/2026 | Regras do Firestore confirmadas e registradas |
| 23/10/2026 | Revisão dos 4 arquivos: nenhum erro. Contexto corrigido |
| 28/10/2026 | Análises refeitas: filtro de exercícios, radar SVG e comparação penúltima × última |
| 28/10/2026 | Análises: filtro de divisão (`anDiv`, `anSetDiv`) |
| 28/10/2026 | Radar: nomes com quebra de linha e área ampliada (400×340) |
| 28/10/2026 | Confirmação de série: modal `dlgSerie`; histórico grava executado em `series` e planejado em `plan` |
| 28/10/2026 | Fluxo da série refeito: descanso no toque e confirmação sem interferir; fase `conf` removida |
| 28/10/2026 | Histórico na nuvem: `id`/`ts`, subcoleção `sessoes`, fila local, junção sem duplicar, exclusão nos dois lugares |
| 30/10/2026 | Catálogo (`app.js`, `index.html`, `style.css`, `firebase.js`): grupo Trapézio; nome do exercício obrigatório do catálogo com lista de sugestões; aviso "Fora do catálogo"; `nomeOriginal`; importação por JSON (`importarCatalogo`, `writeBatch`); padronização de nomes no treino e no histórico (`atualizarSessoes`); botão "Manter o planejado" direto no `index.html`. Regras sem mudanças |
| 30/10/2026 | Backup corrigido (só `app.js`): download direto no computador (`ehMovel`, `baixar`), compartilhar só no celular com download como alternativa, erros visíveis; `importar` com confirmação, aviso de conclusão e tratamento de erro de leitura |
| 30/10/2026 | Aquecimento (`app.js` + `index.html`): campo `aq`, checkbox `#fAq`, etiqueta `tagAq`, `togAq` no histórico (todos os usuários, com `atualizarSessoes`), `histEx` ignora aquecimento, `padLista` separa aquecimento de trabalho. Regras sem mudanças |
| 30/10/2026 | Executado vira o próximo planejado (só `app.js`): `atualizarPlano(div)` em `encerrar(true)`, depois de montar a sessão e antes do `save()`; mensagem com a quantidade de exercícios atualizados; `encerrar` passa a chamar `renderAll()`. Regras sem mudanças |
| 30/10/2026 | Preenchimento automático no modal (só `app.js`): `autoPeso` passa a copiar reps (`.p`) e descanso (`.r`) da série editada para todas as seguintes (inclusive as escondidas em `fSer`), sem mexer nas anteriores nem nos outros campos; regra do peso mantida. Regras sem mudanças |
