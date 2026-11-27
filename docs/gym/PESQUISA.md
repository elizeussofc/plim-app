# Gym Plim: base de pesquisa

Pesquisa feita em 27/11/2026 para o módulo de treino do Plim. Cada regra que o app usa está
aqui com a fonte. O código que aplica estas regras é `lib/gym.ts` (treino) e `lib/gymNutri.ts`
(alimentação).

**Como ler:** "confirmado" quer dizer que o número aparece no resumo do próprio artigo ou em
fonte oficial. "Secundário" quer dizer que só achei em resumos de terceiros e o número pode
variar; nesses casos o app usa o valor mais conservador.

## 1. O que o app assume sobre a pessoa

O Gym Plim é para **adultos saudáveis**. Antes do primeiro treino o app faz sete perguntas de
triagem (modelo PAR-Q). Um "sim" basta para o app recomendar conversar com um médico antes de
começar. Dor no peito ou tontura durante o programa: parar e procurar avaliação.

- Fonte: PAR-Q, versão em português usada por USP/CEPE (confirmado).
  https://www.cepe.usp.br/wp-content/uploads/PARQ-site-CEPE.pdf

O app **não substitui** profissional de Educação Física, nutricionista nem médico, e diz isso
na tela. No Brasil, prescrever treino individualizado é atividade de profissional registrado no
CREF, e prescrever dieta é privativo de nutricionista (CRN). Por isso o app entrega um plano
geral baseado em diretrizes públicas e orientação alimentar geral, sem cardápio com quantidades
fechadas nem meta de calorias.

## 2. Treino de força

### Diretriz principal: ACSM 2026

Currier BS, et al. *Resistance Training Prescription for Muscle Function, Hypertrophy, and
Physical Performance in Healthy Adults: An Overview of Reviews.* Med Sci Sports Exerc.
2026;58(4):851-872. Substitui a diretriz de 2009. Base: 137 revisões sistemáticas.

- https://pubmed.ncbi.nlm.nih.gov/41843416/
- https://doi.org/10.1249/MSS.0000000000003897

| Ponto | O que diz | Confiança | Como o app usa |
| --- | --- | --- | --- |
| O principal | Fazer qualquer treino de força, com progressão, já melhora força e massa. Mexer nos detalhes muda pouco. | confirmado | O plano é simples e prioriza a pessoa conseguir manter. |
| Força | Cargas altas (a partir de ~80% do máximo), pelo menos 2 sessões por semana, 2 a 3 séries. | secundário | Objetivo "força": 4 a 6 repetições nos exercícios grandes, só para quem não é iniciante. |
| Massa muscular | O que mais conta é o volume da semana, com referência de 10 ou mais séries por músculo. Carga leve ou pesada funciona se o esforço for alto. | secundário | Meta de séries por músculo por semana; faixa de 6 a 15 repetições. |
| Esforço | Parar com 2 a 3 repetições "sobrando". Não precisa ir até a falha. | secundário | Toda série tem a instrução "pare quando ainda desse para fazer 2 ou 3". |
| Progressão | Aumentar carga ou repetições aos poucos num programa constante. | secundário | Progressão dupla (item abaixo). |

### Volume e frequência

- Schoenfeld, Ogborn, Krieger (2017), J Sports Sci: mais séries por semana, mais ganho; 10 ou
  mais séries por músculo para o máximo, mas 4 ou menos já dão ganho relevante (confirmado no
  resumo). https://paulogentil.com/pdf/Dose-response%20relationship%20between%20weekly%20resistance%20training%20volume%20and%20increases%20in%20muscle%20mass%20-%20A%20systematic%20review%20and%20metaanalysis.pdf
- Schoenfeld, Ogborn, Krieger (2016), Sports Med: treinar cada músculo 2 vezes por semana foi
  melhor que 1 (confirmado). Análises posteriores mostram que, com o mesmo volume, a frequência
  pesa pouco (secundário). O app usa a frequência para **distribuir** o volume.
  https://www.researchgate.net/publication/301578131

**No app:** iniciante começa com 2 séries por exercício e 4 a 8 séries por músculo na semana;
intermediário mira 10 a 14; avançado, 12 a 18. O tempo disponível por treino limita o total.

### Quando aumentar a carga

- Regra "2 por 2" (NSCA, *Essentials of Strength Training and Conditioning*): se na última
  série a pessoa passa a meta em 2 repetições, em dois treinos seguidos, aumenta a carga
  (secundário). Diretriz ACSM de 2009: aumentar 2 a 10% quando passar a meta em 1 ou 2
  repetições (secundário).
- Progressão dupla: faixa de repetições fixa (ex.: 8 a 12); primeiro sobe as repetições até o
  topo da faixa em todas as séries, depois sobe a carga e volta para a base da faixa.

**No app:** bateu o topo da faixa em todas as séries → sugere subir a carga cerca de 5% (ou o
próximo halter) e voltar para a base. Ficou abaixo da base em dois treinos seguidos → sugere
baixar 5 a 10%. No meio → manter a carga e buscar uma repetição a mais.

### Descanso entre séries

Resumos do material da NSCA: 2 a 5 minutos para força; 30 a 90 segundos em treinos de volume
(secundário). **No app:** 2 minutos nos exercícios grandes (3 minutos no objetivo força) e
60 a 75 segundos nos exercícios de um músculo só. A pessoa pode pular o descanso.

### Quanto de atividade por semana

*Guia de Atividade Física para a População Brasileira* (Ministério da Saúde, 2021): adultos,
pelo menos 150 minutos de atividade moderada ou 75 de vigorosa por semana, e fortalecimento
muscular em **2 ou mais dias** (confirmado).
https://bvsms.saude.gov.br/bvs/publicacoes/guia_atividade_fisica_populacao_brasileira.pdf

**No app:** o mínimo que o plano aceita são 2 dias. Nos dias sem treino, o app sugere caminhada.

## 3. Alimentação

### Proteína

- ISSN, *Position Stand: protein and exercise* (Jäger et al., 2017): 1,4 a 2,0 g por kg por dia
  para a maioria de quem treina; 0,25 g/kg ou 20 a 40 g por refeição; refeições a cada 3 a 4
  horas (confirmado). https://link.springer.com/article/10.1186/s12970-017-0177-8
- ISSN, *Position Stand: nutrient timing* (Kerksick et al., 2017): 0,25 a 0,40 g/kg por dose; o
  total do dia importa mais que o horário; proteína até 2 horas depois do treino ajuda, e a
  refeição de antes muda o quanto isso pesa (confirmado).
  https://link.springer.com/article/10.1186/s12970-017-0189-4
- Morton et al. (2018), Br J Sports Med, 49 estudos: o ganho de massa para de crescer perto de
  1,6 g/kg/dia; 2,2 é o limite superior do intervalo de confiança, sugerido para quem quer o
  máximo (confirmado no resumo). https://www.ovid.com/00002412-201803150-00009

**No app:** meta diária de 1,6 a 2,2 g/kg e 20 a 40 g por refeição. Se a pessoa comeu até
cerca de 5 horas antes do fim do treino, o app não pressiona para comer correndo depois.

### Água

- ACSM, *Exercise and Fluid Replacement* (Sawka et al., 2007): 5 a 7 ml/kg umas 4 horas antes
  do exercício; durante, beber para não perder mais de 2% do peso; depois, cerca de 1,5 litro
  por kg perdido quando a reposição precisa ser rápida (confirmado). PMID 17277604.
- Água do dia: não achei número oficial por kg. O Guia Alimentar brasileiro orienta beber
  água ao longo do dia seguindo a sede. A regra de 30 a 35 ml/kg é prática comum de
  consultório, não diretriz.

**No app:** faixa de 30 a 35 ml/kg como ponto de partida, mais cerca de 500 ml por hora de
treino, com o aviso de que sede e cor da urina são o melhor guia.

### O que comer

*Guia Alimentar para a População Brasileira* (Ministério da Saúde, 2014). Regra de ouro:
"prefira sempre alimentos in natura ou minimamente processados e preparações culinárias a
alimentos ultraprocessados". Arroz com feijão é a base do prato brasileiro (confirmado).
https://bvsms.saude.gov.br/bvs/publicacoes/guia_alimentar_populacao_brasileira_2ed.pdf

**No app:** as sugestões de pré e pós-treino são comida de verdade (arroz, feijão, ovo,
frango, banana, aveia, iogurte). Suplemento aparece só como opção de praticidade.

Os gramas de proteína por porção são aproximados, com base na Tabela Brasileira de
Composição de Alimentos (TACO) e em rótulos. Servem para dar noção, não para cálculo clínico.

## 4. Limites desta pesquisa

- Li os resumos e as páginas oficiais, não o texto integral de todos os artigos. Os números
  da diretriz ACSM 2026 por objetivo vêm de resumos de terceiros.
- As instruções de execução dos exercícios são técnica padrão de musculação. Vale um
  profissional de Educação Física revisar o texto e as imagens antes de divulgar o módulo.
- Nada aqui trata gestantes, menores de 18, idosos frágeis ou pessoas com doença: o app
  manda essas pessoas para um profissional.
