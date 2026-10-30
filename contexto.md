# Contexto do projeto — Treinos

> **Instrução para a IA:** leia este arquivo antes de responder. Toda resposta que alterar
> o projeto deve trazer (1) os arquivos alterados **completos**, (2) explicação detalhada
> e (3) **este CONTEXTO.md atualizado e completo** no final.

**Última atualização:** 28/10/2026

---

## 1. Visão geral
- **O que é:** app web para registrar e executar treinos de musculação, com cronômetro de séries e descanso, histórico, análises e catálogo de exercícios.
- **Público:** uso próprio no início. Depois, abrir para os alunos da esposa (personal trainer).
- **Usuários:** 5 hoje. Meta de 30 a 50.
- **Administrador:** só o Joao Pedro. Ele vê e edita o treino de todos os alunos e gerencia o catálogo.
- **Alunos:** podem editar o próprio treino.
- **Forma de uso:** site aberto no navegador. No iPhone, por um **atalho comum do Safari** na Tela de Início. **Não** é um app instalado (PWA), e isso é intencional.

## 2. Situação das funcionalidades
| Funcionalidade | Situação |
|---|---|
| Cadastro de treino (divisões A a E, séries individuais) | Estável |
| Execução: sessão, cronômetro, descanso, "ilha", desfazer, arrastar para reordenar | Estável |
| Confirmação de cada série (reps e carga), aberta junto com o descanso | Refeita em 28/10/2026, aguardando teste |
| Cópia de segurança do histórico (subcoleção `sessoes` + fila local) | Nova em 28/10/2026, aguardando teste |
| Login com Google (inclusive pelo atalho do iPhone) | Corrigido em 23/10/2026, aguardando teste |
| Histórico | Em ajuste. Grava os valores executados |
| Análises: filtro de divisão, filtro de exercícios, radar dos 3 últimos treinos da divisão (nomes com quebra de linha), comparação penúltima × última | Refeita em 28/10/2026, aguardando teste |
| Análise com IA (Gemini, só admin) | Em ajuste. Compara a 1ª com a última sessão, com todas as divisões. O texto do pedido já trata "reps" como executadas |
| Catálogo de exercícios (grupo principal + secundários com seleção múltipla) | Em ajuste |
| Ajustes: perfil e backup | Em ajuste |
| Notificações de descanso | **Desconsiderada.** Não funciona e não será implementada (exige plano Blaze) |

## 3. Roadmap (em ordem de prioridade)
1. Catálogo completo, com descrição e forma de execução de cada exercício.
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
| `index.html` | Telas, modais (exercício, catálogo, confirmar série, encerrar) e barra de navegação. Ordem dos scripts: lucide → app.js → firebase.js |
| `app.js` | Lógica do app: estado, treino, cronômetro, histórico, análises, catálogo, backup |
| `firebase.js` | Auth, Firestore (incluindo a cópia das sessões), App Check, Functions, Messaging, IA. Expõe funções em `window.*` |
| `style.css` | Visual em tema escuro, mobile-first |

- O repositório tem **apenas** esses 4 arquivos. Não há manifest, ícone nem service worker.
- O `index.html` **não deve** ter `apple-mobile-web-app-capable` nem `mobile-web-app-capable`. Com essas linhas, o atalho do iPhone abre em modo app isolado e o login quebra.
- O `firebase.js` usa variáveis e funções globais do `app.js` (`data`, `sessao`, `ic`, `esc`, `novoId`, `KEY`, `setTopo`, `tela`, `setData`, `setCatalogo`, `resetSessao`, `stopTimer`, `sairDaSessao`). Por isso, **a ordem dos scripts não pode mudar**.

### Modelo de dados (`data` em app.js)
```js
{ divs:['A','B'], A:[exercicio], B:[...], C:[], D:[], E:[], hist:[sessao] }
exercicio = { name, sets, reps, weight, rest, series:[{p:reps, w:peso, r:descanso}] }
sessao    = { id, ts, tipo:'A', data:'dd/mm/aaaa, hh:mm:ss', dur:seg,
              ex:[{...exercicio, plan:[planejado], series:[executado], feitas, tempos[], descansos[]}] }
```
- **`id`:** código único da sessão, gerado por `novoId()`. **`ts`:** momento em que a sessão foi salva (`Date.now()`). Sessões antigas recebem `id` no primeiro carregamento, mas não têm `ts`.
- **No histórico,** `series` guarda os valores **executados** e `plan` guarda os planejados. Sessões antigas não têm `plan`, e nelas `series` = planejado.
- **Ordem cronológica:** é a posição em `hist`. Ao juntar as cópias, o app ordena por `ts` com ordenação estável, e as sessões sem `ts` ficam no início. Não ordenar pelo texto de `data`.
- **Grupos do catálogo** (podem mudar): peito, costas, ombros, biceps, triceps, pernas, gluteos, panturrilha, abdomen, antebraco. Ficam na constante `GRUPOS` do `app.js`.

### Execução e confirmação de série (`app.js`)
- **Fases (`fase`):** `serie` → `descanso` → `serie`… Na última série: `serie` → `fim`. A fase `conf` foi removida.
- **Toque em "Descanso"** (fase `serie`):
  1. `guardar()` (para poder desfazer).
  2. Registra `done[div+i][j]={t,d:null,p,w}` com os valores **planejados**.
  3. Inicia o cronômetro de descanso **no mesmo toque** (`startTimer` + `agendar`). Na última série, para o cronômetro e vai para `fim`.
  4. Abre o modal `dlgSerie` (`abrirSerie(i,j)`).
- **O modal não interfere no cronômetro.**
  - `confirmarSerie()` só troca `p` e `w` da série já registrada.
  - `fecharSerie()` (botão "Manter o planejado", texto definido pelo JS) mantém o planejado.
  - Na última série, os dois botões abrem o `dlgFim` em seguida.
- O modal mostra o planejado e a **série anterior** do mesmo exercício.
- **"Voltar"** desfaz o registro e fecha o modal.
- O descanso real (`d`) é gravado no "Próximo" ou ao encerrar durante o descanso.

### Histórico na nuvem (`firebase.js`)
- **Documento principal:** `treinos_teste/{uid}.dados` (JSON completo, incluindo `hist`).
- **Cópia de segurança:** `treinos_teste/{uid}/sessoes/{id}` → `{ dados: JSON da sessão, ts, tipo }`. É gravada uma vez, ao encerrar com "Salvar" (`window.salvarSessao`).
- **Fila local** (`localStorage['treinos_pend']`): a sessão entra na fila antes do envio e só sai depois que o Firestore confirma. `reenviarPendentes()` roda no login.
- **`abrirUsuario`:** lê o documento e a subcoleção e junta os dois com `mesclar()` (sem duplicar, pelo `id`).
  - Sessões que só existem na cópia voltam para o `hist`.
  - Sessões que faltam na nuvem são enviadas.
  - Se algo mudou, regrava o documento principal.
  - Se a leitura da subcoleção falhar, o app não tenta reenviar tudo.
- **`delHist`** apaga a sessão nos dois lugares (`window.excluirSessao`). Se a exclusão na nuvem falhar, a sessão volta no próximo carregamento.
- Importar um backup substitui o `hist` do documento, mas as cópias na subcoleção continuam. Por isso, as sessões que não estão no backup voltam no próximo carregamento.

### Análises (`app.js`)
- `histEx()`: agrupa o histórico por exercício, usando o nome em minúsculas como chave. Considera só ocorrências com `feitas > 0`.
- Métricas por ocorrência: `peso` (máximo), `reps` (média), `series` (concluídas), `volume` (Σ peso×reps), `tSerie` (tempo médio por série), `tDesc` (descanso médio).
  - As sessões novas usam os valores executados. As antigas usam a meta.
- `calcAnalise()` / `window.dadosAnalise`: dados para a IA (1ª × última sessão, todas as divisões).
- **Filtro de divisão:** `anDiv` guarda a divisão escolhida e `anSetDiv(d)` troca a divisão. Os botões usam o estilo `.tabs`, e o selecionado fica azul. Aparecem só as divisões com sessões no histórico. A divisão inicial é a do treino mais recente. Volta ao padrão no `setData`.
  - As sessões de cada exercício são limitadas às da divisão escolhida (`x.tipo===anDiv`). Os cálculos não mudam.
  - Um mesmo exercício em divisões diferentes é analisado separadamente em cada uma.
  - Divisão sem exercícios concluídos: aparece um aviso no lugar do gráfico.
- **Filtro de exercícios:** `anSel` guarda os exercícios marcados (`null` = todos), e a seleção se mantém ao trocar de divisão. `anKeys` = exercícios da divisão atual. Funções `anToggle(i)` e `anTodos(v)`; `anTodos` vale só para a divisão atual. Volta para "todos" no `setData`.
- **Radar** (`radar(ex,sel,div)`): `viewBox` de 400×340, centro (200,170), raio 100. Usa as 3 sessões mais recentes da divisão que têm algum exercício marcado. Cores: azul = mais recente, vermelho = penúltima, verde = antepenúltima.
  - **Nomes:** `quebra(texto,max)` divide o nome em até 3 linhas (`<tspan>`), com largura calculada pelo espaço livre de cada lado (cerca de 6,6 px por letra). Nomes de cima crescem para cima e nomes de baixo, para baixo.
  - Métrica: volume (Σ peso×reps). Em exercícios sem carga, usa o total de reps (reps × séries).
  - Normalização: 100% = maior valor do exercício entre as sessões mostradas. Os valores reais aparecem numa lista abaixo do gráfico, da sessão mais antiga para a mais recente.
  - Exercício não feito em uma sessão: ponto no centro, bolinha vazada e "—" na lista.
  - Com menos de 3 exercícios marcados, o gráfico não é desenhado (aparece um aviso e a lista).
  - Com menos de 3 sessões na divisão, mostra as disponíveis e avisa quantas são.
- **Comparação detalhada:** penúltima × última ocorrência de cada exercício marcado, dentro da divisão. Exercícios com só 1 sessão aparecem como "sem histórico suficiente".
- O texto do cartão "Sua evolução" é substituído pelo `renderAnalise`, porque o texto do `index.html` não foi alterado.
- O CSS do filtro (`.chips`, `.chip`) e do radar (`.radar`, `.leg`) fica no final do `style.css`.

## 5. Firebase
- **Projeto:** `treinos-teste`, plano **Spark** (gratuito). Não há intenção de migrar para o Blaze.
- **authDomain:** `treinos-teste.firebaseapp.com`.
- **Login:** Google por popup (`signInWithPopup`). Se o popup for bloqueado, usa `signInWithRedirect`. Usa `getAuth` + `setPersistence` (IndexedDB e, como alternativa, localStorage). **Não** usa `initializeAuth` nem `getRedirectResult`. No GitHub Pages, o redirect pode falhar no iPhone (ITP).
- **Firestore:**
  - `treinos_teste/{uid}` → `{ email, nome, dados: JSON.stringify(data), atualizado }`
  - `treinos_teste/{uid}/sessoes/{id}` → `{ dados: JSON da sessão, ts, tipo }`
  - `exercicios/{id}` → `{ nome, grupo, secundarios[], descricao, atualizado }`
  - `admins/{email}` → se o documento existir, o usuário é admin (criado só pelo Console)
- **App Check:** reCAPTCHA Enterprise. Modo de aplicação obrigatória: não sei.
- **IA:** Firebase AI Logic, `gemini-2.5-flash`, resposta em JSON.
- **Functions** (`agendarDescanso`/`cancelarDescanso`): não existem. O código de notificações no `firebase.js` está inativo.
- **Domínios autorizados:** não confirmados. `jpedrosntg.github.io` precisa estar na lista.

### Regras do Firestore (versão com `sessoes`, publicar em 28/10/2026)
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
- **Ao criar uma coleção nova** (por exemplo, perfil), é preciso adicionar a regra dela aqui e publicar no Console. Sem isso, o Firestore bloqueia o acesso.
- **Limite:** cada documento tem no máximo 1 MB. O histórico inteiro ainda fica em `dados`. A cópia em `sessoes` não tem esse problema. No futuro, o `hist` pode sair de `dados` e passar a ser lido só da subcoleção.

## 6. Publicação
- **Repositório:** https://github.com/jpedrosntg/treinos
- **Hospedagem:** GitHub Pages, em `https://jpedrosntg.github.io/treinos/`. A decisão é **continuar no GitHub Pages**.
- **Como publica:** upload de arquivos pelo site do GitHub. As regras do Firestore são publicadas pelo Firebase Console (**antes** de subir arquivos que dependem delas).
- **Testes:** não são feitos antes de publicar.
- **Colaborador:** um amigo cuida do visual pelo GitHub.
- **Backup:** exportação em JSON feita pelo próprio app + cópia automática das sessões em `sessoes`.

## 7. Pendências conhecidas
- [ ] Publicar a regra nova (`sessoes`) no Console.
- [ ] Testar o novo fluxo: o descanso começa no toque, o modal fica aberto com o cronômetro contando, Confirmar e Manter o planejado funcionam, o botão Voltar desfaz, a última série abre o encerramento e o histórico mostra os valores executados.
- [ ] Testar a cópia de segurança: conferir no Console os documentos em `treinos_teste/{uid}/sessoes` (inclusive as sessões antigas migradas), fazer um treino sem internet e reabrir o app com internet.
- [ ] Testar o login pelo novo atalho do iPhone. O atalho antigo precisa ser apagado e criado de novo.
- [ ] Testar a aba de Análises (filtro de divisão, filtro de exercícios, radar com nomes longos, sessões ausentes e comparação penúltima × última).
- [ ] Confirmar que a divisão e o filtro voltam ao padrão ao abrir o treino de outro aluno.
- [ ] (Opcional) Mudar o texto do botão do `dlgSerie` direto no `index.html` para "Manter o planejado" (hoje o JS troca o texto).
- [ ] (Opcional) Fazer a IA comparar a penúltima com a última sessão e/ou usar a divisão escolhida.
- [ ] (Opcional) Mostrar no histórico a diferença entre o planejado (`plan`) e o executado.
- [ ] (Opcional) Mover o texto do cartão "Sua evolução" para o `index.html` e tirar a troca feita pelo JS.
- [ ] Remover o cartão "Aviso de fim do descanso" (Ajustes) e o código de notificações (`firebase.js`, além de `agendar`/`cancelar` no `app.js`). É preciso alterar os arquivos juntos. Hoje o cartão manda o usuário "instalar o app", o que está errado.
- [ ] Fixar a versão do Lucide em vez de `@latest`.
- [ ] Conferir no Console os domínios autorizados e o modo do App Check.
- [ ] Revisar histórico, catálogo e ajustes.
- [ ] (Futuro) Tirar o `hist` do campo `dados` e ler só da subcoleção `sessoes`, por causa do limite de 1 MB.

## 8. Decisões e preferências
- Respostas com **arquivos sempre completos**, sem trechos nem reticências.
- **Explicações detalhadas** e em linguagem simples.
- Preservar o visual e o funcionamento existentes. Mudanças devem ser integradas ao código atual.
- Sem plano Blaze, sem PWA instalado, sem sair do GitHub Pages.
- Sempre enviar este `CONTEXTO.md` atualizado junto com as alterações.
- O toque em "Descanso" inicia o descanso **na hora**. A confirmação da série abre junto e nunca bloqueia, pausa ou atrasa o cronômetro.
- O histórico precisa ficar salvo no banco de forma redundante (documento principal + subcoleção `sessoes`).

## 9. Histórico de alterações
| Data | Alteração |
|---|---|
| — | Grupos secundários do catálogo passaram a usar lista de seleção múltipla (`index.html`, `app.js`) |
| — | Login: popup com redirect como alternativa e persistência por `setPersistence` (`firebase.js`) |
| 23/10/2026 | Criação deste arquivo de contexto |
| 23/10/2026 | Removidas do `index.html` as linhas de modo app e de manifest. O atalho do iPhone agora abre no Safari e o login funciona |
| 23/10/2026 | Regras do Firestore confirmadas e registradas, sem alterações |
| 23/10/2026 | Revisão dos 4 arquivos: nenhum erro. Contexto corrigido (login sem `initializeAuth`, formato da data, dependência entre os scripts) |
| 28/10/2026 | Análises refeitas (`app.js`, `style.css`): removido o comparativo das divisões (só tempo); adicionados o filtro de exercícios, o radar SVG dos 3 últimos treinos e a comparação detalhada penúltima × última. IA sem mudanças |
| 28/10/2026 | Análises (`app.js`): adicionado o filtro de divisão (`anDiv`, `anSetDiv`). Radar, filtro de exercícios e comparação passaram a usar só as sessões da divisão escolhida |
| 28/10/2026 | Radar (`app.js`): nomes com quebra de linha automática (`quebra`) e área do gráfico ampliada (400×340) |
| 28/10/2026 | Confirmação de série (`app.js`, `index.html`): modal `dlgSerie` com reps e carga editáveis; histórico grava os valores executados em `series` e o planejado em `plan` |
| 28/10/2026 | Fluxo da série refeito (`app.js`): o toque em "Descanso" registra a série e inicia o descanso na hora, e a confirmação abre junto sem interferir; fase `conf` removida; modal mostra a série anterior |
| 28/10/2026 | Histórico na nuvem (`app.js`, `firebase.js`, regras): sessões com `id`/`ts`, cópia em `treinos_teste/{uid}/sessoes`, fila local para envios que falharam, junção sem duplicar ao carregar e exclusão nos dois lugares. Texto da IA atualizado ("reps" executadas). `index.html` e `style.css` sem mudanças |
