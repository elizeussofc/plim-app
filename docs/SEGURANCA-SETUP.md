# Plim — ativar a segurança da IA e do plano Pro

O código já está pronto. Faltam 6 passos (do 0 ao 5) que só o dono das contas consegue fazer.
Enquanto eles não forem feitos, o app continua funcionando como antes (modo de transição).

## 0. Acordar o projeto do Supabase

Em 27/11/2026 o endereço do banco que o app usa não existia mais na internet
(conferido em dois servidores de DNS públicos). Sem ele não há login, cadastro, Grupo,
ranking nem Plim IA; o resto do app funciona porque guarda os dados no aparelho.

No painel do Supabase (supabase.com/dashboard), veja como o projeto do Plim aparece:

- **Pausado** (o plano grátis pausa projetos sem uso): clique em restaurar e espere ficar ativo.
- **Não aparece** (foi apagado): crie um projeto novo. Nesse caso, no passo 1, cole antes os
  arquivos `001_initial_schema.sql`, `003_ranking.sql` e `004_features.sql`, nessa ordem, e
  troque `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` na Vercel pelos do projeto novo.

## 1. Banco de dados (Supabase)

No painel do Supabase > SQL Editor, cole e rode o arquivo `supabase/ATUALIZAR-BANCO.sql`
inteiro. Ele junta as migrations 005, 006 e 007 e pode rodar mais de uma vez.

O que ele faz:

- cria as colunas do perfil que o app grava (sequência, conquistas, bio, Instagram). Sem elas,
  o perfil de quem está logado não é salvo na nuvem. A versão antiga desse arquivo tinha um
  comando que o Postgres recusa, então ele nunca rodou por inteiro;
- impede que o app marque o próprio usuário como Pro e cria o contador diário de mensagens da IA;
- cria as tabelas, as regras e o balde de imagens do Grupo (detalhes em `docs/GRUPO-SETUP.md`).

## 2. Publicar as duas funções do servidor

No terminal, dentro da pasta do projeto (precisa do Supabase CLI: `npm i -g supabase`):

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set ANTHROPIC_API_KEY=sua_chave_NOVA_da_anthropic
supabase secrets set REVENUECAT_WEBHOOK_AUTH=uma_senha_longa_inventada_por_voce
supabase functions deploy plim-ia
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

`SEU_PROJECT_REF` é o trecho da URL do projeto: `https://SEU_PROJECT_REF.supabase.co`.

## 3. Trocar a chave da Anthropic

A chave antiga esteve embutida no app, então considere que ela vazou.

1. Em console.anthropic.com, crie uma chave nova (é a que vai no passo 2) e apague a antiga.
2. Na Vercel (projeto plim-app) e no EAS, apague a variável `EXPO_PUBLIC_ANTHROPIC_KEY`.
3. Faça um novo deploy na Vercel.

Depois disso, peça para remover o bloco "MODO DE TRANSIÇÃO" de `lib/anthropic.ts`.

## 4. Webhook do RevenueCat

No painel do RevenueCat > Integrations > Webhooks > New:

- URL: `https://SEU_PROJECT_REF.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: o mesmo valor de `REVENUECAT_WEBHOOK_AUTH`

Use o botão de teste do RevenueCat: a resposta deve ser 200.

## 5. Chave iOS do RevenueCat

A chave iOS no código é de teste (`test_...`). Antes de enviar para a App Store,
crie a variável `EXPO_PUBLIC_RC_KEY_IOS` com a chave `appl_...` do RevenueCat.

## Limites da Plim IA

Definidos em `supabase/functions/plim-ia/index.ts`:
grátis 10 mensagens por dia, Pro 150 por dia. A IA agora exige login.
