import { CampoTexto, CampoValor, Folha, Linha, Opcoes, TrancaPro } from '@/components/financas/pecas';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Barra, Botao, Peca, Secao, Selo } from '@/components/plim';
import { Text } from '@/components/Texto';
import { avisar, confirmar } from '@/lib/avisar';
import { hojeLocal } from '@/lib/dia';
import {
  CATEGORIA_POR_ID, GRATIS, NOME_DO_BALDE, alvoDaReserva, brl, categoriasDe, comparar503020, lerValor, mesDe, mesVizinho, mesesDeReserva,
  mesesParaChegar, nomeDoMes, planoDaMeta, resumoDoMes, situacaoDoTeto, type Meta,
} from '@/lib/financas';
import { somMeta, somMoeda, somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { dizer } from '@/stores/falaStore';
import { useFinancasStore } from '@/stores/financasStore';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

const emTexto = (centavos: number) => (centavos ? String(centavos / 100).replace('.', ',') : '');
const PRAZOS = [{ id: 0, nome: 'Sem prazo' }, { id: 3, nome: '3 meses' }, { id: 6, nome: '6 meses' }, { id: 12, nome: '1 ano' }, { id: 24, nome: '2 anos' }];

/** Aba Planos: reserva de emergência, metas, teto por categoria e o 50-30-20. */
export default function AbaPlanos({ ehPro, aoPedirPro }: { ehPro: boolean; aoPedirPro: (motivo: string) => void }) {
  const { lancamentos, metas, tetos, perfil, salvarMeta, apagarMeta, guardar, definirTeto, definirPerfil } = useFinancasStore();
  const hoje = hojeLocal();
  const mes = mesDe(hoje);
  const resumo = useMemo(() => resumoDoMes(lancamentos, mes), [lancamentos, mes]);
  const reserva = metas.find((m) => m.reserva);
  const outras = metas.filter((m) => !m.reserva);

  // Reserva
  const [formReserva, setFormReserva] = useState(false);
  const [essencial, setEssencial] = useState('');
  // Meta
  const [formMeta, setFormMeta] = useState<Meta | 'nova' | null>(null);
  const [nome, setNome] = useState('');
  const [alvo, setAlvo] = useState('');
  const [prazo, setPrazo] = useState(0);
  // Guardar
  const [guardando, setGuardando] = useState<Meta | null>(null);
  const [quanto, setQuanto] = useState('');
  const [tirar, setTirar] = useState(false);
  // Teto
  const [teto, setTeto] = useState<string | null>(null);
  const [valorTeto, setValorTeto] = useState('');

  const alvoReserva = alvoDaReserva(lerValor(essencial), perfil.renda, perfil.sustentaSozinho);

  function abrirReserva() {
    setEssencial(reserva ? emTexto(Math.round(reserva.alvo / mesesDeReserva(perfil.renda, perfil.sustentaSozinho))) : emTexto(resumo.porBalde.necessidades));
    setFormReserva(true);
  }

  function salvarReserva() {
    if (alvoReserva <= 0) return;
    salvarMeta({ nome: 'Reserva de emergência', alvo: alvoReserva, reserva: true }, reserva?.id);
    setFormReserva(false);
    somToque();
  }

  function novaMeta() {
    if (!ehPro && metas.length >= GRATIS.metas) { aoPedirPro('Metas sem limite'); return; }
    if (!reserva) { avisar('Primeiro, a reserva', 'A reserva de emergência vem antes das outras metas: é ela que impede um imprevisto de virar dívida.'); abrirReserva(); return; }
    setFormMeta('nova'); setNome(''); setAlvo(''); setPrazo(0);
  }

  function editarMeta(m: Meta) {
    if (m.reserva) { abrirReserva(); return; }
    setFormMeta(m); setNome(m.nome); setAlvo(emTexto(m.alvo)); setPrazo(0);
  }

  function salvarAMeta() {
    if (!formMeta || !nome.trim() || lerValor(alvo) <= 0) return;
    const antigo = formMeta === 'nova' ? undefined : formMeta.prazo;
    salvarMeta({ nome, alvo: lerValor(alvo), prazo: prazo > 0 ? mesVizinho(mes, prazo) : antigo }, formMeta === 'nova' ? undefined : formMeta.id);
    setFormMeta(null);
    somToque();
  }

  function confirmarGuardar() {
    if (!guardando) return;
    const centavos = lerValor(quanto);
    if (centavos <= 0) return;
    const bateu = guardar(guardando.id, tirar ? -centavos : centavos, hoje);
    setGuardando(null);
    if (bateu) { somMeta(); dizer('fin_meta'); } else if (!tirar) { somMoeda(); dizer('fin_aporte'); } else somToque();
  }

  function cartaoDaMeta(m: Meta) {
    const p = planoDaMeta(m, mes);
    return (
      <View key={m.id} style={{ backgroundColor: p.pronta ? C.successSoft : C.surface, borderRadius: R.lg, borderWidth: 2, borderBottomWidth: 5, borderColor: p.pronta ? '#A8E6C9' : C.border, padding: 14, marginBottom: 10 }}>
        <Pressable onPress={() => editarMeta(m)} accessibilityRole="button" accessibilityLabel={`${m.nome}: ${brl(m.guardado)} de ${brl(m.alvo)}. Toque para editar.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <Icone nome={(m.reserva ? 'fin-reserva' : 'fin-cofre') as NomeIcone} tamanho={42} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>{m.nome}</Text>
            <Text style={{ fontSize: 14, color: C.textSub }}>{brl(m.guardado, true)} de {brl(m.alvo, true)}</Text>
          </View>
          {p.pronta ? <Selo texto="pronta" icone="check" tinta="verde" /> : <Text style={{ fontFamily: F.displayX, fontSize: 18, color: C.primaryLight }}>{Math.round(p.parte * 100)}%</Text>}
        </Pressable>
        <Barra valor={p.parte} cor={p.pronta ? C.success : C.primary} />
        {!p.pronta && (
          <Text style={{ fontSize: 14, color: C.textSub, marginTop: 8, lineHeight: 20 }}>
            {p.porMes
              ? `Guardando ${brl(p.porMes, true)} por mês você chega em ${nomeDoMes(m.prazo!)}.`
              : `Faltam ${brl(p.falta, true)}. ${m.reserva ? 'Qualquer valor por mês já conta.' : 'Ponha um prazo para ver quanto guardar por mês.'}`}
          </Text>
        )}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Botao rotulo="Guardar" cor="verde" pequeno onPress={() => { setGuardando(m); setQuanto(''); setTirar(false); }} estilo={{ flex: 1 }} accessibilityLabel={`Guardar dinheiro em ${m.nome}`} />
          {m.guardado > 0 && <Botao rotulo="Tirar" cor="claro" pequeno onPress={() => { setGuardando(m); setQuanto(''); setTirar(true); }} accessibilityLabel={`Tirar dinheiro de ${m.nome}`} />}
        </View>
      </View>
    );
  }

  const linhas = comparar503020(resumo);
  const gastos = categoriasDe('gasto').filter((c) => c.id !== 'guardado');

  return (
    <>
      {/* Reserva */}
      <Secao titulo="Reserva de emergência" />
      {reserva ? cartaoDaMeta(reserva) : (
        <Peca tinta="roxo" estilo={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icone nome="fin-reserva" tamanho={52} />
            <Text style={{ flex: 1, fontSize: 15, color: C.text, lineHeight: 22 }}>É o dinheiro do imprevisto: a geladeira que quebra, um mês sem renda. Com ela, o aperto não vira dívida.</Text>
          </View>
          <Botao rotulo="Calcular a minha" onPress={abrirReserva} estilo={{ marginTop: 12 }} />
        </Peca>
      )}

      {/* Metas */}
      <Secao titulo="Suas metas" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{outras.length}</Text>} />
      {outras.map(cartaoDaMeta)}
      {ehPro || metas.length < GRATIS.metas
        ? <Botao rotulo="Nova meta" cor="suave" onPress={novaMeta} estilo={{ marginBottom: 20 }} />
        : <TrancaPro titulo="Metas para os seus sonhos" texto="Viagem, curso, entrada da casa: no Pro você cria quantas quiser e vê quanto guardar por mês." aoTocar={() => aoPedirPro('Metas sem limite')} />}

      {/* Teto por categoria */}
      <Secao titulo="Teto por categoria" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
      {ehPro ? (
        <Peca padding={14} estilo={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, color: C.textSub, marginBottom: 10, lineHeight: 20 }}>Diga quanto cada categoria pode gastar no mês. O Plim avisa aos 80% e quando passar.</Text>
          {gastos.map((c) => {
            const limite = tetos[c.id] ?? 0;
            const gasto = resumo.porCategoria[c.id] ?? 0;
            const s = situacaoDoTeto(gasto, limite);
            return (
              <Pressable key={c.id} onPress={() => { setTeto(c.id); setValorTeto(emTexto(limite)); }} accessibilityRole="button" accessibilityLabel={`${c.nome}: ${limite ? `${brl(gasto, true)} de ${brl(limite, true)}` : 'sem teto'}. Toque para definir.`} style={{ paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: limite ? 6 : 0 }}>
                  <Icone nome={c.icone as NomeIcone} tamanho={28} />
                  <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 15, color: C.text }}>{c.nome}</Text>
                  <Text style={{ fontSize: 14, color: s === 'estourou' ? C.accentDim : C.textSub, fontFamily: s === 'estourou' ? F.bold : F.regular }}>{limite ? `${brl(gasto, true)} de ${brl(limite, true)}` : 'definir'}</Text>
                </View>
                {limite > 0 && <Barra valor={gasto / limite} cor={s === 'estourou' ? C.accent : s === 'atencao' ? C.gold : C.success} altura={8} />}
              </Pressable>
            );
          })}
        </Peca>
      ) : (
        <TrancaPro titulo="Um teto para cada categoria" texto="Defina quanto mercado, lazer e as outras podem gastar. O Plim avisa antes de estourar." aoTocar={() => aoPedirPro('Teto de gasto por categoria')} />
      )}

      {/* 50-30-20 */}
      <Secao titulo="Plano 50-30-20" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
      {ehPro ? (
        <Peca padding={14}>
          <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20, marginBottom: 12 }}>
            Uma divisão simples da renda: metade para o que é necessário, 30% para o que dá prazer e 20% para o futuro (guardar e pagar dívida). É um ponto de partida, não uma lei.
          </Text>
          {resumo.ganhos <= 0
            ? <Text style={{ fontSize: 15, color: C.text }}>Anote o que entrou neste mês para ver a sua divisão.</Text>
            : linhas.map((x) => {
              const passou = x.balde !== 'futuro' && x.diferenca > 0;
              const faltou = x.balde === 'futuro' && x.diferenca < 0;
              return (
                <View key={x.balde} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text }}>{NOME_DO_BALDE[x.balde]} · {Math.round(x.parte * 100)}%</Text>
                    <Text style={{ fontSize: 14, color: C.textSub }}>{brl(x.real, true)} de {brl(x.ideal, true)}</Text>
                  </View>
                  <Barra valor={x.ideal > 0 ? x.real / x.ideal : 0} cor={passou ? C.accent : x.balde === 'futuro' ? C.success : C.primary} altura={10} />
                  {(passou || faltou) && <Text style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>{passou ? `${brl(x.diferenca, true)} acima do plano.` : `Faltam ${brl(-x.diferenca, true)} para os 20%.`}</Text>}
                </View>
              );
            })}
        </Peca>
      ) : (
        <TrancaPro titulo="Sua renda dividida em três" texto="Veja se necessidades, desejos e futuro estão no equilíbrio, com os seus números." aoTocar={() => aoPedirPro('Plano 50-30-20')} />
      )}

      {/* Reserva: cálculo */}
      <Folha titulo="Reserva de emergência" visivel={formReserva} aoFechar={() => setFormReserva(false)}>
        <CampoValor rotulo="Quanto custa um mês do essencial?" valor={essencial} aoMudar={setEssencial} dica="Moradia, mercado, contas, transporte e saúde." />
        <Opcoes rotulo="Sua renda" valor={perfil.renda} aoEscolher={(v) => definirPerfil({ renda: v })} opcoes={[{ id: 'fixa', nome: 'Fixa (salário)' }, { id: 'variavel', nome: 'Varia todo mês' }]} />
        <Opcoes rotulo="Mais alguém ajuda a pagar a casa?" valor={perfil.sustentaSozinho ? 'nao' : 'sim'} aoEscolher={(v) => definirPerfil({ sustentaSozinho: v === 'nao' })} opcoes={[{ id: 'sim', nome: 'Sim' }, { id: 'nao', nome: 'Não, só eu' }]} />
        <Peca tinta="roxo" padding={14} estilo={{ marginBottom: 14 }}>
          <Linha rotulo={`${mesesDeReserva(perfil.renda, perfil.sustentaSozinho)} meses do essencial`} valor={brl(alvoReserva, true)} forte />
          <Text style={{ fontSize: 13, color: C.textSub, marginTop: 6, lineHeight: 19 }}>
            Regra prática: 3 meses para renda fixa, 6 quando a renda varia ou a casa depende só de você. Guarde num lugar seguro e de onde dê para tirar no mesmo dia.
          </Text>
        </Peca>
        <Botao rotulo={reserva ? 'Atualizar a reserva' : 'Criar a reserva'} onPress={salvarReserva} disabled={alvoReserva <= 0} />
      </Folha>

      {/* Meta: criar e editar */}
      <Folha titulo={formMeta === 'nova' ? 'Nova meta' : 'Editar meta'} visivel={!!formMeta} aoFechar={() => setFormMeta(null)}>
        <CampoTexto rotulo="Para quê?" valor={nome} aoMudar={setNome} exemplo="Ex.: Viagem de férias" />
        <CampoValor rotulo="Quanto você precisa?" valor={alvo} aoMudar={setAlvo} />
        <Opcoes rotulo={formMeta && formMeta !== 'nova' && formMeta.prazo ? `Prazo (hoje: ${nomeDoMes(formMeta.prazo)})` : 'Prazo'} valor={prazo} aoEscolher={setPrazo} opcoes={PRAZOS} />
        {prazo > 0 && lerValor(alvo) > 0 && <Text style={{ fontSize: 14, color: C.textSub, marginBottom: 14 }}>Dá cerca de {brl(Math.ceil(lerValor(alvo) / prazo), true)} por mês.</Text>}
        <Botao rotulo="Guardar" onPress={salvarAMeta} disabled={!nome.trim() || lerValor(alvo) <= 0} />
        {formMeta && formMeta !== 'nova' && (
          <Botao rotulo="Apagar esta meta" cor="claro" pequeno estilo={{ marginTop: 10 }} onPress={() => { const m = formMeta; confirmar('Apagar a meta', `${m.nome} sai da lista. O que foi anotado no mês continua lá.`, 'Apagar', () => { apagarMeta(m.id); setFormMeta(null); }); }} />
        )}
      </Folha>

      {/* Guardar ou tirar */}
      <Folha titulo={guardando ? `${tirar ? 'Tirar de' : 'Guardar em'} ${guardando.nome}` : ''} visivel={!!guardando} aoFechar={() => setGuardando(null)}>
        <CampoValor rotulo={tirar ? 'Quanto você tirou?' : 'Quanto você guardou?'} valor={quanto} aoMudar={setQuanto} grande />
        {guardando && !tirar && lerValor(quanto) > 0 && guardando.alvo > guardando.guardado && (
          <Text style={{ fontSize: 14, color: C.textSub, marginBottom: 14, lineHeight: 20 }}>
            {lerValor(quanto) >= guardando.alvo - guardando.guardado
              ? 'Com isso a meta fica pronta!'
              : `Nesse ritmo por mês, faltam ${mesesParaChegar(guardando.alvo - guardando.guardado - lerValor(quanto), lerValor(quanto))} meses depois deste.`}
          </Text>
        )}
        <Text style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 19 }}>
          {tirar ? 'O valor volta para o saldo do mês.' : 'O Plim só anota. Lembre de mandar o dinheiro de verdade para onde ele vai ficar guardado.'}
        </Text>
        <Botao rotulo={tirar ? 'Anotar a retirada' : 'Anotar que guardei'} cor={tirar ? 'claro' : 'verde'} onPress={confirmarGuardar} disabled={lerValor(quanto) <= 0} />
      </Folha>

      {/* Teto */}
      <Folha titulo={teto ? `Teto de ${CATEGORIA_POR_ID[teto]?.nome ?? ''}` : ''} visivel={!!teto} aoFechar={() => setTeto(null)}>
        <CampoValor rotulo="Quanto pode gastar por mês?" valor={valorTeto} aoMudar={setValorTeto} grande dica={teto ? `Neste mês já foram ${brl(resumo.porCategoria[teto] ?? 0, true)}.` : undefined} />
        <Botao rotulo="Guardar" onPress={() => { if (teto) { definirTeto(teto, lerValor(valorTeto)); somToque(); } setTeto(null); }} />
        {teto && (tetos[teto] ?? 0) > 0 && <Botao rotulo="Tirar o teto" cor="claro" pequeno estilo={{ marginTop: 10 }} onPress={() => { definirTeto(teto, 0); setTeto(null); }} />}
      </Folha>
    </>
  );
}
