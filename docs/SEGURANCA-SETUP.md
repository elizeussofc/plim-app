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

## 2. Funções do servidor — PUBLICADAS em 27/11/2026

As funções `plim-ia` e `revenuecat-webhook` foram publicadas pelo editor do painel
(Edge Functions > Deploy a new function > Via Editor), com o código de `supabase/functions/`.
Para atualizar uma delas: abra a função no painel, aba Code, cole o arquivo novo e publique.

As duas se recusam a funcionar sem a chave delas (respondem `{"erro":"config"}`). Faltam os
segredos, que só o dono das contas tem. No painel: Edge Functions > Secrets > Add new secret.

| Nome do segredo | Valor | Para quê |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | chave nova criada em console.anthropic.com | a Plim IA responder |
| `REVENUECAT_WEBHOOK_AUTH` | uma senha longa inventada por você | quem paga virar Pro |

Não mexer: na `revenuecat-webhook`, a opção "Verify JWT with legacy secret" fica DESLIGADA
(o RevenueCat manda a própria senha, não um login do app). A `plim-ia` confere o login no código.

Para 2027: as funções leem `SUPABASE_SERVICE_ROLE_KEY`, que é a chave antiga do Supabase.
Ela será aposentada no início de 2027; antes disso, trocar por `SUPABASE_SECRET_KEYS`.

## 3. Trocar a chave da Anthropic

A chave antiga esteve embutida no app, então considere que ela vazou.

1. Em console.anthropic.com, crie uma chave nova, cole como `ANTHROPIC_API_KEY` (passo 2) e apague a antiga.
2. Na Vercel não há mais a variável `EXPO_PUBLIC_ANTHROPIC_KEY` (conferido em 27/11). Se existir no EAS, apague.

Depois disso, peça para remover o bloco "MODO DE TRANSIÇÃO" de `lib/anthropic.ts`.

## 4. Webhook do RevenueCat

No painel do RevenueCat > Integrations > Webhooks > New:

- URL: `https://afbwkdqubeffgosxufsc.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: o mesmo valor de `REVENUECAT_WEBHOOK_AUTH`

Use o botão de teste do RevenueCat: a resposta deve ser 200.

## E-mail de confirmação do cadastro — DECISÃO PENDENTE

O cadastro do app manda um e-mail de confirmação. O envio de e-mail que vem com o Supabase só
entrega para quem é da equipe do projeto e manda 2 e-mails por hora: serve para teste, não para
público. Enquanto isso não mudar, só o dono consegue criar conta pelo app.

Duas saídas, no painel > Authentication:

- ligar um serviço de e-mail próprio (Emails > SMTP Settings; ex.: Resend, Brevo), ou
- desligar a confirmação por e-mail (Sign In / Providers > Email > Confirm email). Mais simples,
  mas qualquer e-mail inventado cria conta e a recuperação de senha continua sem funcionar.

O endereço do site (`https://plim-app.vercel.app`) já está em Authentication > URL Configuration.

## 5. Chave iOS do RevenueCat

A chave iOS no código é de teste (`test_...`). Antes de enviar para a App Store,
crie a variável `EXPO_PUBLIC_RC_KEY_IOS` com a chave `appl_...` do RevenueCat.

## Limites da Plim IA

Definidos em `supabase/functions/plim-ia/index.ts`:
grátis 10 mensagens por dia, Pro 150 por dia. A IA agora exige login.
