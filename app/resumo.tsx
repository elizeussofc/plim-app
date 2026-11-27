import AvatarPersonagem from '@/components/AvatarPersonagem';
import { TrancaPro } from '@/components/financas/pecas';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Botao, Cabecalho, Peca, Secao, Selo, Tela } from '@/components/plim';
import { Text } from '@/components/Texto';
import { ehAvisoDaIA, enviarMensagem } from '@/lib/anthropic';
import { hojeLocal } from '@/lib/dia';
import { montarResumo, periodo, tendencia, type DadosDaSemana } from '@/lib/resumo';
import { calcularStatusDia } from '@/lib/rotinaDia';
import { duracaoMin } from '@/lib/sono';
import { somResumo, somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { useAtividadeStore } from '@/stores/atividadeStore';
import { useCasaStore } from '@/stores/casaStore';
import { useEstudosStore } from '@/stores/estudosStore';
import { dizer } from '@/stores/falaStore';
import { useFinancasStore } from '@/stores/financasStore';
import { useGymStore } from '@/stores/gymStore';
import { useHumorStore } from '@/stores/humorStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useRotinaStore } from '@/stores/rotinaStore';
import { useSonoStore } from '@/stores/sonoStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

/** Resumo da semana: o que a pessoa fez nos últimos 7 dias, em todas as áreas do Plim, e por onde seguir. */
export default function ResumoScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const ehPro = profile.plano === 'pro';
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const tarefas = useRotinaStore((s) => s.tarefas);
  const historicoDias = useRotinaStore((s) => s.historicoDias);
  const atividade = useAtividadeStore((s) => s.dias);
  const leitura = useAtividadeStore((s) => s.leitura);
  const guardarLeitura = useAtividadeStore((s) => s.guardarLeitura);
  const humor = useHumorStore((s) => s.historico);
  const treinos = useGymStore((s) => s.treinos);
  const noites = useSonoStore((s) => s.noites);
  const perfilSono = useSonoStore((s) => s.perfil);
  const sessoes = useEstudosStore((s) => s.sessoes);
  const tarefasDeCasa = useCasaStore((s) => s.tarefas);
  const lancamentos = useFinancasStore((s) => s.lancamentos);
  const c1 = useAtividadeStore((s) => s.carregado);
  const c2 = useSonoStore((s) => s.carregado);
  const c3 = useEstudosStore((s) => s.carregado);
  const c4 = useCasaStore((s) => s.carregado);
  const c5 = useFinancasStore((s) => s.carregado);
  const c6 = useGymStore((s) => s.carregado);
  const prontos = c1 && c2 && c3 && c4 && c5 && c6;
  const hoje = hojeLocal();
  const [pedindo, setPedindo] = useState(false);
  /** Aviso no lugar da leitura (sem login, sem rede, limite do dia). Não é guardado. */
  const [aviso, setAviso] = useState<string | null>(null);
  const saudou = useRef(false);

  const resumo = useMemo(() => {
    const dados: DadosDaSemana = {
      hoje,
      rotina: tarefas.length ? { ...historicoDias, [hoje]: calcularStatusDia(tarefas) } : historicoDias,
      atividade,
      humor,
      treinos,
      noites: noites.map((n) => ({ data: n.data, minutos: duracaoMin(n.deitou, n.acordou), qualidade: n.qualidade })),
      metaDeSonoMin: perfilSono.horas * 60,
      estudos: sessoes.map((s) => ({ data: s.data, minutos: s.minutos })),
      casa: tarefasDeCasa.map((t) => t.ultima).filter((d): d is string => !!d),
      financas: lancamentos.map((l) => ({ data: l.data, tipo: l.tipo, valor: l.valor, categoria: l.categoria })),
    };
    return montarResumo(dados);
  }, [hoje, tarefas, historicoDias, atividade, humor, treinos, noites, perfilSono.horas, sessoes, tarefasDeCasa, lancamentos]);

  useEffect(() => {
    if (!prontos || saudou.current) return;
    saudou.current = true;
    somResumo();
    dizer(resumo.movimentada ? 'resumo_boa' : 'resumo_fraca');
  }, [prontos, resumo.movimentada]);

  async function pedirLeitura() {
    if (pedindo) return;
    setPedindo(true);
    somToque();
    setAviso(null);
    const texto = await enviarMensagem([{ role: 'user', content: resumo.paraAIA }]);
    if (ehAvisoDaIA(texto)) setAviso(texto); else guardarLeitura(hoje, texto);
    setPedindo(false);
  }

  if (!prontos) return <Tela><View /></Tela>;

  const leituraDeHoje = leitura?.ate === hoje ? leitura.texto : null;
  const vazio = resumo.areas.length === 0;

  return (
    <Tela espacoFinal={48}>
      <Cabecalho titulo="Resumo da semana" icone="resumo-carta" sub={periodo(resumo)} />

      <Peca tinta="roxo" estilo={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <AvatarPersonagem config={profile.avatar_config} expressao={resumo.movimentada ? 'animado' : 'feliz'} size={76} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>{vazio ? 'Seus últimos 7 dias' : 'O melhor da sua semana'}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text, lineHeight: 25 }}>{vazio ? 'Ainda não tem registro nesta semana.' : resumo.destaque ?? 'A semana teve registro.'}</Text>
          </View>
        </View>
        {vazio && <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20, marginTop: 10 }}>O resumo se monta sozinho com o que você faz no app: uma tarefa da rotina, uma sessão de foco, a noite anotada. Comece por uma coisa.</Text>}
      </Peca>

      {!vazio && (
        <>
          <Secao titulo="Seus números" direita={ehPro ? <Text style={{ fontSize: 12, color: C.textSub }}>seta = semana anterior</Text> : undefined} />
          <View style={{ gap: 8, marginBottom: 14 }}>
            {resumo.areas.map((a) => {
              const t = ehPro ? tendencia(a) : null;
              return (
                <Pressable key={a.id} onPress={() => router.push(a.rota as never)} accessibilityRole="button" accessibilityLabel={`${a.nome}: ${a.valor}${t ? `, ${t.seta === '=' ? 'igual à' : t.seta === '↑' ? 'acima da' : 'abaixo da'} semana anterior` : ''}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderBottomWidth: pressed ? 2 : 4, marginTop: pressed ? 2 : 0, borderColor: C.border, padding: 12, minHeight: 62 })}>
                  <Icone nome={a.icone as NomeIcone} tamanho={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>{a.nome}</Text>
                    <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text, lineHeight: 21 }}>{a.valor}</Text>
                  </View>
                  {t && <Text style={{ fontFamily: F.displayX, fontSize: 20, color: t.seta === '=' ? C.textMuted : t.boa ? C.success : C.accent }}>{t.seta}</Text>}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {resumo.semRegistro.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: C.textSub, marginBottom: 8 }}>Sem registro nesta semana:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {resumo.semRegistro.map((s) => (
              <Pressable key={s.id} onPress={() => router.push(s.rota as never)} accessibilityRole="button" accessibilityLabel={`Abrir ${s.nome}`} style={{ minHeight: 40, justifyContent: 'center', backgroundColor: C.surfaceHigh, borderRadius: R.pill, paddingHorizontal: 14 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>{s.nome}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Secao titulo="O que fazer com isso" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
      {ehPro ? (
        <>
          {resumo.atencao && (
            <Peca tinta="ouro" padding={14} estilo={{ marginBottom: 10 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Ponto de atenção</Text>
              <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>{resumo.atencao}</Text>
            </Peca>
          )}
          <Peca tinta="verde" estilo={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Conselho da semana</Text>
            <Text style={{ fontFamily: F.displayX, fontSize: 21, color: C.text }}>{resumo.conselho.titulo}</Text>
            <Text style={{ fontSize: 15, color: C.textSub, lineHeight: 22, marginBottom: 12 }}>{resumo.conselho.texto}</Text>
            <Botao rotulo={resumo.conselho.acao} cor="verde" pequeno onPress={() => router.push(resumo.conselho.rota as never)} />
          </Peca>

          <Peca estilo={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Icone nome="robo" tamanho={38} />
              <Text style={{ flex: 1, fontFamily: F.display, fontSize: 18, color: C.text }}>Leitura da Plim IA</Text>
            </View>
            {leituraDeHoje
              ? <Text style={{ fontSize: 15, color: C.text, lineHeight: 23 }}>{leituraDeHoje}</Text>
              : pedindo
                ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54 }}><ActivityIndicator color={C.primary} /><Text style={{ fontSize: 14, color: C.textSub }}>Lendo a sua semana…</Text></View>
                : (
                  <>
                    {aviso && <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20, marginBottom: 10 }}>{aviso}</Text>}
                    <Botao rotulo={aviso ? 'Tentar de novo' : 'Pedir a leitura da semana'} icone="robo" cor="suave" disabled={vazio} onPress={pedirLeitura} />
                  </>
                )}
            <Text style={{ fontSize: 12, color: C.textMuted, lineHeight: 17, marginTop: 10 }}>A Plim IA recebe só os números de rotina, foco, treino, sono, estudo, casa e humor. Nada de dinheiro sai do aparelho. Conta como uma mensagem do seu dia.</Text>
          </Peca>
        </>
      ) : (
        <TrancaPro titulo="Conselho da semana" texto="A comparação com a semana anterior, o ponto de atenção, um passo concreto e a leitura da Plim IA." aoTocar={() => abrirPaywall('Conselho da semana com a Plim IA')} />
      )}
    </Tela>
  );
}
