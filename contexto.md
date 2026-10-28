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
| Login com Google (inclusive pelo atalho do iPhone) | Corrigido em 23/10/2026, aguardando teste |
| Histórico | Em ajuste |
| Análises: filtro de divisão, filtro de exercícios, radar dos 3 últimos treinos da divisão, comparação penúltima × última | Refeita em 28/10/2026, aguardando teste |
| Análise com IA (Gemini, só admin) | Em ajuste. Ainda compara a 1ª com a última sessão, com todas as divisões |
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
| `index.html` | Telas, modais e barra de navegação. Ordem dos scripts: lucide → app.js → firebase.js |
| `app.js` | Lógica do app: estado, treino, cronômetro, histórico, análises, catálogo, backup |
| `firebase.js` | Auth, Firestore, App Check, Functions, Messaging, IA. Expõe funções em `window.*` |
| `style.css` | Visual em tema escuro, mobile-first |

- O repositório tem **apenas** esses 4 arquivos. Não há manifest, ícone nem service worker.
- O `index.html` **não deve** ter `apple-mobile-web-app-capable` nem `mobile-web-app-capable`. Com essas linhas, o atalho do iPhone abre em modo app isolado e o login quebra.
- O `firebase.js` usa variáveis e funções globais do `app.js` (`data`, `sessao`, `ic`, `esc`, `setTopo`, `tela`, `setData`, `setCatalogo`, `resetSessao`, `stopTimer`, `sairDaSessao`). Por isso, **a ordem dos scripts não pode mudar**.

### Modelo de dados (`data` em app.js)
```js
{ divs:['A','B'], A:[exercicio], B:[...], C:[], D:[], E:[], hist:[sessao] }
exercicio = { name, sets, reps, weight, rest, series:[{p:reps, w:peso, r:descanso}] }
sessao    = { tipo:'A', data:'dd/mm/aaaa, hh:mm:ss', dur:seg, ex:[{...exercicio, feitas, tempos[], descansos[]}] }
```
- **Ordem cronológica:** é a posição em `hist`, porque as sessões são gravadas com `push`. Não ordenar pelo texto de `data`.
- **Grupos do catálogo** (podem mudar): peito, costas, ombros, biceps, triceps, pernas, gluteos, panturrilha, abdomen, antebraco. Ficam na constante `GRUPOS` do `app.js`.

### Análises (`app.js`)
- `histEx()`: agrupa o histórico por exercício, usando o nome em minúsculas como chave. Considera só ocorrências com `feitas > 0`.
- Métricas por ocorrência: `peso` (máximo), `reps` (média da meta cadastrada, não das reps realmente feitas), `series` (concluídas), `volume` (Σ peso×reps), `tSerie` (tempo médio por série), `tDesc` (descanso médio).
- `calcAnalise()` / `window.dadosAnalise`: dados para a IA. Mantém o formato antigo (1ª × última sessão, todas as divisões). O texto do pedido no `firebase.js` também descreve essa comparação. Para mudar a IA, é preciso alterar os dois arquivos.
- **Filtro de divisão:** `anDiv` guarda a divisão escolhida e `anSetDiv(d)` troca a divisão. Os botões usam o estilo `.tabs`, e o selecionado fica azul. Aparecem só as divisões com sessões no histórico. A divisão inicial é a do treino mais recente. Volta ao padrão no `setData`.
  - As sessões de cada exercício são limitadas às da divisão escolhida (`x.tipo===anDiv`). Os cálculos não mudam.
  - Um mesmo exercício em divisões diferentes é analisado separadamente em cada uma.
  - Divisão sem exercícios concluídos: aparece um aviso no lugar do gráfico.
- **Filtro de exercícios:** `anSel` guarda os exercícios marcados (`null` = todos), e a seleção se mantém ao trocar de divisão. `anKeys` = exercícios da divisão atual. Funções `anToggle(i)` e `anTodos(v)`; `anTodos` vale só para a divisão atual. Volta para "todos" no `setData`.
- **Radar** (`radar(ex,sel,div)`): usa as 3 sessões mais recentes da divisão que têm algum exercício marcado. Cores: azul = mais recente, vermelho = penúltima, verde = antepenúltima.
  - Métrica: volume (Σ peso×reps). Em exercícios sem carga, usa o total de reps (reps × séries).
  - Normalização: 100% = maior valor do exercício entre as sessões mostradas. Os valores reais aparecem numa lista abaixo do gráfico, da sessão mais antiga para a mais recente.
  - Exercício não feito em uma sessão: ponto no centro, bolinha vazada e "—" na lista.
  - Com menos de 3 exercícios marcados, o gráfico não é desenhado (aparece um aviso e a lista).
  - Com menos de 3 sessões na divisão, mostra as disponíveis e avisa quantas são.
- **Comparação detalhada:** penúltima × última ocorrência de cada exercício marcado, dentro da divisão. Exercícios com só 1 sessão aparecem como "sem histórico suficiente".
- O texto do cartão "Sua evolução" é substituído pelo `renderAnalise`, porque o `index.html` não foi alterado.
- O CSS do filtro (`.chips`, `.chip`) e do radar (`.radar`, `.leg`) fica no final do `style.css`.

## 5. Firebase
- **Projeto:** `treinos-teste`, plano **Spark** (gratuito). Não há intenção de migrar para o Blaze.
- **authDomain:** `treinos-teste.firebaseapp.com`.
- **Login:** Google por popup (`signInWithPopup`). Se o popup for bloqueado, usa `signInWithRedirect`. Usa `getAuth` + `setPersistence` (IndexedDB e, como alternativa, localStorage). **Não** usa `initializeAuth` nem `getRedirectResult`. No GitHub Pages, o redirect pode falhar no iPhone (ITP).
- **Firestore:**
  - `treinos_teste/{uid}` → `{ email, nome, dados: JSON.stringify(data), atualizado }`
  - `exercicios/{id}` → `{ nome, grupo, secundarios[], descricao, atualizado }`
  - `admins/{email}` → se o documento existir, o usuário é admin (criado só pelo Console)
- **App Check:** reCAPTCHA Enterprise. Modo de aplicação obrigatória: não sei.
- **IA:** Firebase AI Logic, `gemini-2.5-flash`, resposta em JSON.
- **Functions** (`agendarDescanso`/`cancelarDescanso`): não existem. O código de notificações no `firebase.js` está inativo.
- **Domínios autorizados:** não confirmados. `jpedrosntg.github.io` precisa estar na lista.

### Regras do Firestore (publicadas, confirmadas em 23/10/2026)
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
- **Ao criar uma coleção nova** (por exemplo, perfil ou subcoleção de sessões), é preciso adicionar a regra dela aqui e publicar no Console. Sem isso, o Firestore bloqueia o acesso.
- **Limite:** cada documento tem no máximo 1 MB. Hoje o histórico inteiro fica em `dados`. A longo prazo, mover as sessões para uma subcoleção.

## 6. Publicação
- **Repositório:** https://github.com/jpedrosntg/treinos
- **Hospedagem:** GitHub Pages, em `https://jpedrosntg.github.io/treinos/`. A decisão é **continuar no GitHub Pages**.
- **Como publica:** upload de arquivos pelo site do GitHub. As regras do Firestore são publicadas pelo Firebase Console.
- **Testes:** não são feitos antes de publicar.
- **Colaborador:** um amigo cuida do visual pelo GitHub.
- **Backup:** só a exportação em JSON feita pelo próprio app.

## 7. Pendências conhecidas
- [ ] Testar o login pelo novo atalho do iPhone. O atalho antigo precisa ser apagado e criado de novo.
- [ ] Testar a aba de Análises (filtro de divisão, filtro de exercícios, radar, sessões ausentes e comparação penúltima × última).
- [ ] Confirmar que a divisão e o filtro voltam ao padrão ao abrir o treino de outro aluno.
- [ ] (Opcional) Fazer a IA também comparar a penúltima com a última sessão e/ou usar a divisão escolhida (`calcAnalise` no `app.js` + texto do pedido no `firebase.js`).
- [ ] (Opcional) Mover o texto do cartão "Sua evolução" para o `index.html` e tirar a troca feita pelo JS.
- [ ] Remover o cartão "Aviso de fim do descanso" (Ajustes) e o código de notificações (`firebase.js`, além de `agendar`/`cancelar` no `app.js`). É preciso alterar os arquivos juntos. Hoje o cartão manda o usuário "instalar o app", o que está errado.
- [ ] Fixar a versão do Lucide em vez de `@latest`.
- [ ] Conferir no Console os domínios autorizados e o modo do App Check.
- [ ] Revisar histórico, catálogo e ajustes.
- [ ] (Futuro) Mover o histórico para uma subcoleção, por causa do limite de 1 MB.

## 8. Decisões e preferências
- Respostas com **arquivos sempre completos**, sem trechos nem reticências.
- **Explicações detalhadas** e em linguagem simples.
- Preservar o visual e o funcionamento existentes. Mudanças devem ser integradas ao código atual.
- Sem plano Blaze, sem PWA instalado, sem sair do GitHub Pages.
- Sempre enviar este `CONTEXTO.md` atualizado junto com as alterações.

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
| 28/10/2026 | Análises (`app.js`): adicionado o filtro de divisão (`anDiv`, `anSetDiv`). Radar, filtro de exercícios e comparação passaram a usar só as sessões da divisão escolhida. Cálculos e IA sem mudanças; `style.css` sem mudanças (reaproveita `.tabs`) |
