# Backlog de Jogos

App web para eu e meus amigos organizarmos nossos backlogs de jogos e decidirmos o que jogar com o pouco tempo livre que temos.

## Sobre mim (dono do projeto)
- Estou aprendendo a programar com o Claude Code. Explique de forma breve o que está fazendo e por quê, principalmente comandos de terminal, Git e conceitos novos.
- Uso Windows. Prefira comandos que funcionem no PowerShell / Git Bash.
- Responda em português do Brasil. Código, nomes de variáveis e commits em inglês.

## Stack
- **Next.js** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase**: banco Postgres + autenticação (login com e-mail por magic link e com Google)
- **RAWG API** (https://rawg.io/apidocs): busca de jogos, capas, plataformas, gêneros e tempo médio de jogo (`playtime`). Exibir o crédito "Dados por RAWG" com link, como os termos de uso pedem.
- **Steam Web API** (https://steamcommunity.com/dev): vincular a conta Steam (login OpenID oficial da Steam), importar a biblioteca e ler conquistas. `STEAM_API_KEY` só no servidor.
- **Vercel**: hospedagem, com deploy automático a cada push no GitHub

## Regras importantes
- **Nunca** exponha chaves no front-end. A `RAWG_API_KEY` só é usada no servidor (Route Handler ou Server Action).
- Segredos ficam em `.env.local`, que **não** vai para o Git. Manter um `.env.example` atualizado.
- Toda tabela do Supabase com **Row Level Security** ativado.
- Mobile-first: vou usar muito pelo celular.
- Trabalhar em passos pequenos. Ao terminar cada passo: rodar `npm run build` e `npm run lint`, me dizer como testar e sugerir uma mensagem de commit.

## Modelo de dados
`profiles`
- `id` (uuid, = auth.users.id), `username` (único), `display_name`, `avatar_url`, `created_at`
- `steam_id` (SteamID64, único, opcional): só o servidor grava, depois de confirmar o login na Steam

`backlog_items`
- `id`, `user_id` → profiles
- `rawg_id`, `title`, `cover_url`, `platforms` (text[]), `genres` (text[]), `release_year`, `avg_playtime_hours` (vindo da RAWG)
- `status`: `backlog` | `playing` | `finished` | `dropped`
- `priority`: 1 (alta), 2 (média) ou 3 (baixa)
- `rating` (1–10, opcional), `notes`
- `started_at`, `finished_at`, `created_at`, `updated_at`
- Único por (`user_id`, `rawg_id`)

RLS: qualquer usuário logado pode **ler** perfis e backlogs (para ver os amigos). Cada um só **cria, edita e apaga** os próprios itens.

## Funcionalidades (v1)
1. **Login** com magic link e Google. No primeiro acesso, escolher um `username`.
2. **Busca com capa automática**: campo de busca com debounce que consulta a RAWG pelo servidor e mostra capa, ano e plataformas. Um clique adiciona o jogo ao backlog.
3. **Meu backlog**: grade de capas com abas por status, filtro por plataforma e ordenação por prioridade, data ou duração. Mudar status, prioridade e nota direto no card.
4. **"O que jogo hoje?"**: eu informo
   - quanto tempo tenho (até 1h / 1 a 3h / fim de semana inteiro / quero começar algo longo)
   - meu humor (relaxar / desafio / boa história / jogar com amigos)

   O app sorteia entre os jogos com status `backlog` ou `playing`, usando como peso a prioridade, os gêneros compatíveis com o humor e a duração compatível com o tempo. Dá preferência a jogos `playing`, para eu terminar o que já comecei. Botão "outra sugestão".
5. **Amigos**: página pública `/u/[username]` (só leitura) com o backlog e o que a pessoa está jogando agora. Uma página com a lista de usuários.
6. **Estatísticas simples**: total no backlog, zerados no ano e horas estimadas para zerar o backlog inteiro.

## Fora do escopo por enquanto
Notificações e app nativo. PlayStation: decidir depois das fases da Steam (sem API oficial; só a opção de um único código NPSSO no servidor, como recurso experimental).

## Roteiro
- [x] Passo 1: criar o projeto Next.js, publicar no GitHub e na Vercel (uma página "Hello" no ar)
- [x] Passo 2: Supabase (tabelas, RLS, login)
- [x] Passo 3: busca na RAWG e adicionar ao backlog
- [x] Passo 4: tela do backlog com status e prioridade
- [x] Passo 5: "O que jogo hoje?"
- [x] Passo 6: perfis públicos dos amigos e estatísticas
- [x] Passo 7: vincular a conta Steam
- [x] Passo 8: importar a biblioteca da Steam para o backlog
- [x] Passo 9: conquistas da Steam no card e tela de conquistas por jogo
- [x] Passo 10: menu de navegação (barra inferior no celular, barra no topo no computador)
- [ ] Passo 11: comparar conquistas com os amigos
- [ ] Passo 12: (a decidir) troféus da PlayStation, experimental

## Pendências conhecidas
- **Magic link só funciona no mesmo navegador** em que foi pedido: o Supabase só libera editar os modelos de e-mail com SMTP próprio (ex.: Resend + domínio). Com SMTP, trocar o link dos modelos "Magic link" e "Confirm sign up" para `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email` (a rota `/auth/confirm` já aceita esse formato).
