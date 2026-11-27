# Plim — ativar a segurança da IA e do plano Pro

O código já está pronto. Os passos 0 e 1 já foram feitos; faltam os passos 2 a 5, que dependem das contas do dono.
Enquanto eles não forem feitos, o app continua funcionando como antes (modo de transição).

## 0. Projeto do Supabase — FEITO em 27/11/2026

O projeto antigo foi apagado. O app agora usa o projeto novo `Plim_project`
(`https://afbwkdqubeffgosxufsc.supabase.co`). O endereço e a chave pública já estão no
`.env.local` e nas variáveis de produção da Vercel (`EXPO_PUBLIC_SUPABASE_URL` e
`EXPO_PUBLIC_SUPABASE_ANON_KEY`; a chave é a "publishable", que pode ficar no app).

## 1. Banco de dados — FEITO em 27/11/2026

O arquivo `supabase/BANCO-NOVO.sql` (todas as migrations, da 001 à 008) foi rodado no SQL Editor.
Ele só serve para um projeto vazio e roda uma vez.

Daqui para a frente, mudança de banco entra como migration nova em `supabase/migrations/`,
é somada em `tools/juntar-sql.mjs` e vai para o SQL Editor pelo arquivo
`supabase/ATUALIZAR-BANCO.sql` (da 005 em diante; pode rodar mais de uma vez).

Atenção em tabela nova: desde 30/05/2026 o Supabase não libera mais tabela nova para o app
sozinho. Toda tabela precisa de três coisas na migration: `grant` para quem vai usar,
`enable row level security` e as regras (`create policy`). Sem o `grant`, o app recebe o erro
42501. O que está liberado hoje fica em `008_liberacoes_do_app.sql` e é conferido por
`npm run test:sql`.

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
