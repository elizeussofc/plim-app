# Finanças do Plim: de onde vem o que o app ensina

Conferido em 27/11/2026. O módulo é **educativo**: ajuda a anotar, lembrar e planejar. Ele não
indica produto, instituição nem promete rendimento, e não acessa banco nenhum.

## Fatos usados no app e a fonte de cada um

| O que o app diz | Fonte | Confiança |
| --- | --- | --- |
| Gastar menos do que entra é a "regra de ouro"; o orçamento tem quatro etapas (planejar, registrar, agrupar, avaliar) | Banco Central, *Caderno de Educação Financeira: Gestão de Finanças Pessoais*, versão 2026, módulo 2 | Alta |
| A reserva de emergência deve ficar onde há **liquidez** e **baixo risco**; transferência automática no dia do pagamento ajuda a formar | Mesmo caderno do Banco Central, módulos 5 e 6 | Alta |
| Tamanho da reserva: 3 meses do essencial (renda fixa) ou 6 (renda variável ou casa dependendo de uma pessoa só) | **Regra prática de mercado.** O caderno do Banco Central não dá número. Materiais de terceiros falam de 3 a 12 meses | Média: o app chama de "regra prática", não de norma |
| FGC cobre até R$ 250 mil por CPF por instituição ou conglomerado, com teto de R$ 1 milhão a cada 4 anos; cobre conta, poupança, CDB, LCI, LCA | FGC, material de apoio (dez/2025) e relatório semestral de 2026 | Alta |
| Juros do rotativo e do parcelamento da fatura do cartão não passam de 100% do valor original da dívida, desde 3/1/2024 | Resolução CMN 5.112, de 26/12/2023, e Lei 14.690/2023 (Desenrola). Páginas da Fazenda, Secom e Caixa | Alta para a regra; não conferi se houve alteração depois de 2024 |
| Portabilidade de dívida do cartão para outra instituição | Resolução CMN 5.112, vale desde 1/7/2024 | Alta |
| Divisão 50-30-20 (necessidades, desejos, futuro) | Regra popularizada por Elizabeth Warren e Amelia Tyagi no livro *All Your Worth* (2005) | É um ponto de partida conhecido, não uma norma. O app diz isso |
| Avalanche (juro maior primeiro) paga menos juros; bola de neve (menor dívida primeiro) quita uma dívida antes | Matemática da simulação, coberta por teste em `tests/financas.test.mjs` | Alta |

## O que o app faz de propósito

- **Não recomenda investimento.** Cita Tesouro Selic e CDB de liquidez diária como *exemplos* do
  que costuma atender aos dois critérios da reserva. Recomendação individual de investimento é
  atividade regulada pela CVM (analista e consultor de valores mobiliários).
- **O simulador usa taxas redondas de exemplo** (0%, 6%, 10%, 14% ao ano), sem imposto e sem
  inflação, e diz isso na tela. Não mostra a taxa do dia de nenhum produto.
- **Os dados ficam só no aparelho.** Nada de lançamento, conta, meta ou dívida vai para o
  servidor. O lado ruim: limpar os dados do navegador ou trocar de aparelho apaga tudo. Ainda
  não existe exportar nem cópia de segurança.
- **O tom das dicas fala do dinheiro, nunca da pessoa.** Há um teste que barra palavras de bronca.

## Antes de divulgar como produto pago

1. Pedir a um planejador financeiro certificado (CFP) ou consultor CVM que leia os textos da aba
   "Crescer". Eu conferi os fatos em fontes oficiais, mas não sou profissional da área.
2. Revisar uma vez por ano os números que mudam por decisão de governo: limite do FGC e regras
   do cartão.

## Fontes

- Banco Central do Brasil, Caderno de Educação Financeira (2026):
  https://www.bcb.gov.br/content/cidadaniafinanceira/documentos_cidadania/Cuidando_do_seu_dinheiro_Gestao_de_Financas_Pessoais/caderno_cidadania_financeira.pdf
- FGC, material de apoio ao atendimento:
  https://www.fgc.org.br/documents/d/guest/fgc_material-de-apoio-ao-atendimento
- Ministério da Fazenda, teto de juros do cartão:
  https://www.gov.br/fazenda/pt-br/assuntos/noticias/2023/dezembro/novo-teto-dos-juros-do-cartao-de-credito-comeca-a-valer-em-janeiro-diz-haddad
- Secom, novo teto do cartão em vigor:
  https://www.gov.br/secom/pt-br/acompanhe-a-secom/noticias/2024/01/novo-teto-de-juros-do-cartao-de-credito-passa-a-valer-a-partir-desta-quarta
- Caixa, rotativo do cartão de crédito (Resolução CMN 5.112):
  https://www.caixa.gov.br/voce/cartoes/credito/rotativo/paginas/default.aspx
