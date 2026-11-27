# Ligar o Grupo de verdade

O Grupo novo (posts com foto e lugar, stories, comentários, reações com emoji, visitas e Instagram)
já está no app. Enquanto o banco não for atualizado, ele funciona em **modo prévia**: o que a pessoa
publica fica só no aparelho dela. Para ligar o Grupo com outras pessoas, falta um passo no Supabase.

## O passo (uma vez só)

1. Abra o painel do Supabase do Plim e entre em **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/migrations/007_grupo.sql`, copie tudo e cole no editor.
4. Clique em **Run**. Deve aparecer "Success. No rows returned".

Pode rodar de novo sem medo: o arquivo foi feito para não quebrar na segunda vez.

## Como conferir

1. Entre no app com uma conta e abra a aba **Grupo**.
2. O aviso laranja "Prévia do Grupo" some e aparece o cartão "Você está só olhando", com o botão
   **Entrar no Grupo**.
3. Entre, publique uma foto e abra o app com outra conta: a publicação tem de aparecer lá.

## O que o banco garante sozinho

Estas regras ficam no servidor. Mesmo alguém mexendo no app por fora não passa por elas:

| Regra | Grátis | Pro |
| --- | --- | --- |
| Ler posts, stories e comentários | sim | sim |
| Publicar post e story, reagir com emoji | sim | sim |
| Comentar no próprio post | sim | sim |
| Comentar em post de outra pessoa | não | sim |
| Ver quantas pessoas visitaram o perfil | sim | sim |
| Ver quem visitou o perfil | não | sim |
| Ver o Instagram de quem cadastrou | não | sim |

Também no servidor: cada pessoa só publica e apaga em nome próprio, a imagem só entra na pasta de
quem enviou (até 3 MB, só JPG, PNG ou WebP), o story vence em 24 horas pela hora do servidor, o
e-mail nunca aparece, e ninguém vira Pro gravando o próprio perfil.

Essas regras têm teste: `npm run test:sql` sobe um Postgres de teste, aplica o arquivo 007 e tenta
furar cada uma delas.

## Moderação

Denúncias feitas no app caem na tabela `grupo_denuncias` (no painel: **Table Editor**). O app ainda
não tem tela de moderação: quem olha e apaga o conteúdo denunciado é você, pelo painel. Antes de
divulgar o Grupo para muita gente, vale combinar quem vai olhar essa tabela e com que frequência.
