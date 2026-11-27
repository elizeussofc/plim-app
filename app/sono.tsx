import Abas from '@/components/Abas';
import { CampoTexto, Folha, Linha, Opcoes, TrancaPro } from '@/components/financas/pecas';
import Icone, { type NomeIcone } from '@/components/Icone';
import { Barra, Botao, Cabecalho, Peca, Secao, Selo, Tela, Vazio } from '@/components/plim';
import { Text } from '@/components/Texto';
import { confirmar } from '@/lib/avisar';
import { diasAntes, hojeLocal } from '@/lib/dia';
import { agendarLembreteDiario, cancelarLembrete } from '@/lib/notifications';
import {
  AVISO_SONO, DICAS_SONO, GRATIS_SONO, HORAS_POSSIVEIS, barrasDaSemana, duracaoDoRitual, duracaoMin, horaDeDeitar, horaDeDesligar,
  horasTexto, leituraDaNoite, leituraDoSono, lerHora, momentoDaNoite, noitesRecentes, resumoDoSono, type Noite, type PassoRitual,
} from '@/lib/sono';
import { somPassoSono, somSono, somToque } from '@/lib/sons';
import { C, F, R, TINTA } from '@/lib/theme';
import { dizer } from '@/stores/falaStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useSonoStore } from '@/stores/sonoStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

type Aba = 'hoje' | 'diario' | 'dicas';
const ABAS: { id: Aba; nome: string }[] = [{ id: 'hoje', nome: 'Hoje' }, { id: 'diario', nome: 'Diário' }, { id: 'dicas', nome: 'Dicas' }];
const NOTAS: { nota: Noite['qualidade']; icone: NomeIcone; nome: string }[] = [
  { nota: 1, icone: 'humor-1', nome: 'Péssima' }, { nota: 2, icone: 'humor-2', nome: 'Ruim' }, { nota: 3, icone: 'humor-3', nome: 'Mais ou menos' },
  { nota: 4, icone: 'humor-4', nome: 'Boa' }, { nota: 5, icone: 'humor-5', nome: 'Ótima' },
];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const diaDaSemana = (data: string) => { const [a, m, d] = data.split('-').map(Number); return DIAS_CURTOS[new Date(a, m - 1, d).getDay()]; };
const dataCurta = (data: string) => `${diaDaSemana(data)}, ${data.slice(8)}/${data.slice(5, 7)}`;
const minutosAgora = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

/** Sono: a hora de desligar, o ritual da noite e o diário de como a pessoa dormiu. */
export default function SonoScreen() {
  const carregado = useSonoStore((s) => s.carregado);
  const temDados = useSonoStore((s) => s.noites.length > 0 || s.metaDefinida);
  const apagarTudo = useSonoStore((s) => s.apagarTudo);
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const [aba, setAba] = useState<Aba>('hoje');

  if (!carregado) return <Tela><View /></Tela>;

  return (
    <Tela espacoFinal={48}>
      <Cabecalho titulo="Sono" icone="sono-cama" sub="Desligar na hora, acordar inteiro" />
      <Abas abas={ABAS} atual={aba} aoTrocar={setAba} />
      {aba === 'hoje' && <Hoje ehPro={ehPro} aoPedirPro={abrirPaywall} />}
      {aba === 'diario' && <Diario ehPro={ehPro} aoPedirPro={abrirPaywall} />}
      {aba === 'dicas' && <Dicas ehPro={ehPro} aoPedirPro={abrirPaywall} />}

      <View style={{ marginTop: 26, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 }}>🔒 O que você anota aqui fica só neste aparelho.</Text>
        {temDados && (
          <Pressable onPress={() => confirmar('Apagar o Sono', 'Meta, ritual e noites anotadas são apagados deste aparelho de vez.', 'Apagar tudo', apagarTudo)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontSize: 13, color: C.textSub, textDecorationLine: 'underline' }}>Apagar tudo do Sono</Text>
          </Pressable>
        )}
      </View>
    </Tela>
  );
}

interface PropsAba { ehPro: boolean; aoPedirPro: (motivo: string) => void }

// ───────────────────────── Hoje ─────────────────────────

function Hoje({ ehPro, aoPedirPro }: PropsAba) {
  const router = useRouter();
  const { perfil, metaDefinida, ritual, feitos, premiado, noites, lembrete, definirPerfil, alternarPasso, marcarPremiado, salvarPasso, apagarPasso, restaurarRitual, anotarNoite, definirLembrete } = useSonoStore();
  const addXp = useUserStore((s) => s.addXp);
  const hoje = hojeLocal();
  const [agora, setAgora] = useState(minutosAgora);
  const [folha, setFolha] = useState<'meta' | 'noite' | 'ritual' | null>(null);
  const [acordar, setAcordar] = useState(perfil.acordar);
  const [horas, setHoras] = useState(perfil.horas);
  const [deitou, setDeitou] = useState('');
  const [acordou, setAcordou] = useState('');
  const [nota, setNota] = useState<Noite['qualidade']>(3);
  const [passo, setPasso] = useState<PassoRitual | 'novo' | null>(null);
  const [nomePasso, setNomePasso] = useState('');
  const [minPasso, setMinPasso] = useState('5');

  useEffect(() => {
    const t = setInterval(() => setAgora(minutosAgora()), 30_000);
    return () => clearInterval(t);
  }, []);

  const deitar = horaDeDeitar(perfil);
  const desligar = horaDeDesligar(perfil, ritual);
  const momento = momentoDaNoite(agora, perfil, ritual);
  const marcados = feitos.data === hoje ? feitos.ids : [];
  const feitosAgora = ritual.filter((p) => marcados.includes(p.id)).length;
  const noiteDeHoje = noites.find((n) => n.data === hoje);
  const horaLida = lerHora(acordar);
  const deitouLido = lerHora(deitou);
  const acordouLido = lerHora(acordou);

  function salvarMeta() {
    if (!horaLida) return;
    const novo = { acordar: horaLida, horas };
    definirPerfil(novo);
    if (lembrete) agendarLembreteDiario('sono-desligar', 'Hora de começar a desligar para dormir bem.', horaDeDesligar(novo, ritual));
    setFolha(null);
    somToque();
    dizer('sono_meta');
  }

  function marcar(p: PassoRitual) {
    const completou = alternarPasso(p.id, hoje);
    if (completou) {
      somSono();
      dizer('sono_ritual');
      if (premiado !== hoje) { marcarPremiado(hoje); addXp(10); }
    } else somPassoSono();
  }

  function abrirNoite() {
    setDeitou(noiteDeHoje?.deitou ?? deitar);
    setAcordou(noiteDeHoje?.acordou ?? perfil.acordar);
    setNota(noiteDeHoje?.qualidade ?? 3);
    setFolha('noite');
  }

  function salvarNoite() {
    if (!deitouLido || !acordouLido) return;
    anotarNoite({ data: hoje, deitou: deitouLido, acordou: acordouLido, qualidade: nota });
    setFolha(null);
    somSono();
    const leitura = leituraDaNoite(duracaoMin(deitouLido, acordouLido), perfil);
    dizer(leitura === 'curta' || nota <= 2 ? 'sono_curta' : 'sono_boa');
  }

  function abrirPasso(p: PassoRitual | 'novo') {
    setPasso(p);
    setNomePasso(p === 'novo' ? '' : p.nome);
    setMinPasso(p === 'novo' ? '5' : String(p.minutos));
  }

  function salvarOPasso() {
    if (!passo || !nomePasso.trim()) return;
    salvarPasso({ nome: nomePasso, minutos: Number(minPasso) || 5, rota: passo === 'novo' ? undefined : passo.rota }, passo === 'novo' ? undefined : passo.id);
    setPasso(null);
    somToque();
  }

  async function alternarLembrete() {
    if (lembrete) { await cancelarLembrete('sono-desligar'); definirLembrete(false); return; }
    const id = await agendarLembreteDiario('sono-desligar', 'Hora de começar a desligar para dormir bem.', desligar);
    definirLembrete(!!id);
    somToque();
  }

  const fase = momento.fase === 'desligar'
    ? { titulo: 'Está na hora de desligar', texto: `Faltam ${horasTexto(momento.minutos)} para deitar. Comece pelo primeiro passo.`, tinta: 'laranja' as const }
    : momento.fase === 'passou'
      ? { titulo: 'Já passou da sua hora', texto: 'Sem bronca: faça só o passo mais fácil e deite.', tinta: 'ouro' as const }
      : { titulo: `Faltam ${horasTexto(momento.minutos)} para desligar`, texto: `Hoje você começa a desligar às ${desligar}.`, tinta: 'roxo' as const };

  return (
    <>
      <Peca tinta="roxo" estilo={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icone nome="lua" tamanho={54} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Para acordar às {perfil.acordar} dormindo {horasTexto(perfil.horas * 60)}</Text>
            <Text style={{ fontFamily: F.displayX, fontSize: 30, color: C.text }}>Deite às {deitar}</Text>
          </View>
        </View>
        <View style={{ marginTop: 10 }}>
          <Linha rotulo="Comece a desligar" valor={desligar} />
          <Linha rotulo="Ritual" valor={`${duracaoDoRitual(ritual)} min`} />
        </View>
        {!metaDefinida && <Text style={{ fontSize: 13, color: C.textSub, marginTop: 6 }}>Esta é uma sugestão. Ajuste para a sua vida.</Text>}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Botao rotulo={metaDefinida ? 'Mudar a meta' : 'Definir a minha meta'} cor={metaDefinida ? 'suave' : 'roxo'} pequeno onPress={() => { setAcordar(perfil.acordar); setHoras(perfil.horas); setFolha('meta'); }} />
          {Platform.OS !== 'web' && <Botao rotulo={lembrete ? 'Lembrete ligado' : 'Lembrar de desligar'} icone="sino" cor={lembrete ? 'verde' : 'claro'} pequeno onPress={alternarLembrete} />}
        </View>
      </Peca>

      <Peca tinta={fase.tinta} estilo={{ marginBottom: 20 }} padding={14}>
        <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>{fase.titulo}</Text>
        <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{fase.texto}</Text>
      </Peca>

      <Secao titulo="Ritual de desligar" direita={<Text style={{ fontSize: 13, color: C.textSub }}>{feitosAgora} de {ritual.length}</Text>} />
      <View style={{ marginBottom: 10 }}><Barra valor={ritual.length ? feitosAgora / ritual.length : 0} cor={C.primary} /></View>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {ritual.map((p) => {
          const feito = marcados.includes(p.id);
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: feito ? C.glass : C.surface, borderRadius: R.md, borderWidth: 2, borderBottomWidth: 4, borderColor: feito ? C.borderPrimary : C.border, paddingRight: 10 }}>
              <Pressable onPress={() => marcar(p)} accessibilityRole="checkbox" accessibilityState={{ checked: feito }} accessibilityLabel={`${p.nome}, ${p.minutos} minutos`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 56 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: feito ? C.primary : C.borderBright, backgroundColor: feito ? C.primary : C.surface, alignItems: 'center', justifyContent: 'center' }}>
                  {feito && <Text style={{ fontFamily: F.displayX, fontSize: 15, color: C.onPrimary }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text, textDecorationLine: feito ? 'line-through' : 'none' }}>{p.nome}</Text>
                  <Text style={{ fontSize: 13, color: C.textSub }}>{p.minutos} min</Text>
                </View>
              </Pressable>
              {p.rota && !feito && (
                <Pressable onPress={() => router.push(p.rota as never)} accessibilityRole="button" accessibilityLabel={`Abrir a ferramenta para: ${p.nome}`} hitSlop={6} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
                  <Text style={{ fontFamily: F.display, fontSize: 14, color: C.primaryLight }}>Abrir</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
      {ehPro
        ? <Botao rotulo="Montar o meu ritual" cor="claro" pequeno icone="sono-cha" onPress={() => setFolha('ritual')} estilo={{ marginBottom: 22 }} />
        : <TrancaPro titulo="Monte o seu ritual" texto="Troque, tire e crie passos do seu jeito, com o tempo de cada um." aoTocar={() => aoPedirPro('Ritual de sono do seu jeito')} />}

      <Secao titulo="Como foi a noite?" />
      {noiteDeHoje ? (
        <Peca estilo={{ marginBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icone nome={NOTAS[noiteDeHoje.qualidade - 1].icone} tamanho={46} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.displayX, fontSize: 24, color: C.text }}>{horasTexto(duracaoMin(noiteDeHoje.deitou, noiteDeHoje.acordou))}</Text>
              <Text style={{ fontSize: 14, color: C.textSub }}>Das {noiteDeHoje.deitou} às {noiteDeHoje.acordou} · {NOTAS[noiteDeHoje.qualidade - 1].nome.toLowerCase()}</Text>
            </View>
            <Botao rotulo="Corrigir" cor="claro" pequeno onPress={abrirNoite} />
          </View>
        </Peca>
      ) : (
        <Vazio titulo="Anote a noite que passou" texto="Leva dez segundos: a hora que deitou, a que acordou e como foi. Com alguns dias o Plim mostra o seu padrão.">
          <Botao rotulo="Anotar a noite" icone="sono-cama" onPress={abrirNoite} />
        </Vazio>
      )}

      {/* Meta */}
      <Folha titulo="Sua meta de sono" visivel={folha === 'meta'} aoFechar={() => setFolha(null)}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}><Icone nome="sono-despertador" tamanho={72} /></View>
        <CampoTexto rotulo="A que horas você precisa acordar?" valor={acordar} aoMudar={setAcordar} exemplo="07:00" max={5} />
        <Opcoes rotulo="Quantas horas quer dormir?" valor={horas} opcoes={HORAS_POSSIVEIS.map((h) => ({ id: h, nome: horasTexto(h * 60) }))} aoEscolher={setHoras} />
        <Text style={{ fontSize: 13, color: C.textSub, lineHeight: 19, marginBottom: 14 }}>Adultos precisam de 7 horas ou mais por noite. {horaLida ? `Com essa meta, você deita às ${horaDeDeitar({ acordar: horaLida, horas })}.` : 'Digite a hora assim: 07:00.'}</Text>
        <Botao rotulo="Guardar a meta" disabled={!horaLida} onPress={salvarMeta} />
      </Folha>

      {/* Noite */}
      <Folha titulo="A noite que passou" visivel={folha === 'noite'} aoFechar={() => setFolha(null)}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><CampoTexto rotulo="Deitou às" valor={deitou} aoMudar={setDeitou} exemplo="23:00" max={5} /></View>
          <View style={{ flex: 1 }}><CampoTexto rotulo="Acordou às" valor={acordou} aoMudar={setAcordou} exemplo="07:00" max={5} /></View>
        </View>
        <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub, marginBottom: 6 }}>Como foi?</Text>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }} accessibilityRole="radiogroup">
          {NOTAS.map((n) => {
            const ativo = nota === n.nota;
            return (
              <Pressable key={n.nota} onPress={() => setNota(n.nota)} accessibilityRole="radio" accessibilityState={{ selected: ativo }} accessibilityLabel={`Noite ${n.nome.toLowerCase()}`} style={{ flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, backgroundColor: ativo ? C.glass : C.surface, borderWidth: ativo ? 3 : 2, borderBottomWidth: 5, borderColor: ativo ? C.primary : C.border }}>
                <Icone nome={n.icone} tamanho={36} />
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 14, color: C.textSub, marginBottom: 14 }}>{deitouLido && acordouLido ? `Você dormiu ${horasTexto(duracaoMin(deitouLido, acordouLido))} · noite ${NOTAS[nota - 1].nome.toLowerCase()}.` : 'Digite as horas assim: 23:30.'}</Text>
        <Botao rotulo="Guardar a noite" disabled={!deitouLido || !acordouLido} onPress={salvarNoite} />
      </Folha>

      {/* Ritual (Pro) */}
      <Folha titulo={passo ? (passo === 'novo' ? 'Novo passo' : 'Mudar o passo') : 'Seu ritual'} visivel={folha === 'ritual'} aoFechar={() => { setFolha(null); setPasso(null); }}>
        {passo ? (
          <>
            <CampoTexto rotulo="O que você faz" valor={nomePasso} aoMudar={setNomePasso} exemplo="Ler dez páginas" max={50} />
            <CampoTexto rotulo="Quantos minutos leva" valor={minPasso} aoMudar={setMinPasso} numero max={2} />
            <Botao rotulo="Guardar o passo" disabled={!nomePasso.trim()} onPress={salvarOPasso} />
            {passo !== 'novo' && <Botao rotulo="Tirar do ritual" cor="claro" estilo={{ marginTop: 10 }} onPress={() => { apagarPasso(passo.id); setPasso(null); }} />}
            <Botao rotulo="Voltar" cor="suave" estilo={{ marginTop: 10 }} onPress={() => setPasso(null)} />
          </>
        ) : (
          <>
            <View style={{ gap: 8, marginBottom: 14 }}>
              {ritual.map((p) => (
                <Pressable key={p.id} onPress={() => abrirPasso(p)} accessibilityRole="button" accessibilityLabel={`Mudar o passo ${p.nome}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderBottomWidth: 4, borderColor: C.border, padding: 12, minHeight: 52 }}>
                  <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 15, color: C.text }}>{p.nome}</Text>
                  <Text style={{ fontSize: 13, color: C.textSub }}>{p.minutos} min</Text>
                  <Text style={{ fontFamily: F.displayX, fontSize: 20, color: C.textMuted }}>›</Text>
                </Pressable>
              ))}
            </View>
            <Botao rotulo="Criar um passo" icone="lapis" onPress={() => abrirPasso('novo')} />
            <Botao rotulo="Voltar ao ritual do Plim" cor="claro" estilo={{ marginTop: 10 }} onPress={() => confirmar('Voltar ao ritual do Plim', 'Os passos que você criou somem e o ritual original volta.', 'Voltar ao original', restaurarRitual)} />
          </>
        )}
      </Folha>
    </>
  );
}

// ───────────────────────── Diário ─────────────────────────

function Diario({ ehPro, aoPedirPro }: PropsAba) {
  const { noites, perfil, apagarNoite } = useSonoStore();
  const hoje = hojeLocal();
  const barras = useMemo(() => barrasDaSemana(noites, hoje), [noites, hoje]);
  const resumo = useMemo(() => resumoDoSono(noites, perfil, hoje), [noites, perfil, hoje]);
  const lista = useMemo(() => noitesRecentes(noites, hoje, ehPro ? 60 : GRATIS_SONO.diasDeHistorico), [noites, hoje, ehPro]);
  const achados = useMemo(() => leituraDoSono(noites, perfil, hoje), [noites, perfil, hoje]);
  const guardadas = noites.filter((n) => n.data < diasAntes(hoje, GRATIS_SONO.diasDeHistorico - 1)).length;
  const alvo = perfil.horas * 60;
  const TETO = 10 * 60;

  if (noites.length === 0) return <Vazio titulo="Seu diário começa na primeira noite" texto="Na aba Hoje, anote a hora que deitou e a que acordou. Aqui aparece a sua semana." />;

  return (
    <>
      <Peca estilo={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.textSub }}>Últimos 7 dias</Text>
        <Text style={{ fontFamily: F.displayX, fontSize: 28, color: C.text }}>{resumo.noites ? `${horasTexto(resumo.mediaMin)} por noite` : 'Sem noites anotadas'}</Text>
        <View style={{ height: 130, flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 14 }}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 20 + (alvo / TETO) * 100, borderTopWidth: 2, borderColor: C.borderPrimary, borderStyle: 'dashed' }} />
          {barras.map((b) => {
            const boa = b.minutos !== null && b.minutos >= alvo - 30;
            return (
              <View key={b.data} style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLabel={`${diaDaSemana(b.data)}: ${b.minutos === null ? 'não anotada' : horasTexto(b.minutos)}`}>
                <View style={{ width: '100%', height: b.minutos === null ? 6 : Math.max(8, (Math.min(b.minutos, TETO) / TETO) * 100), borderRadius: 8, backgroundColor: b.minutos === null ? C.track : boa ? C.primary : TINTA.laranja[1] }} />
                <Text style={{ fontSize: 12, color: b.data === hoje ? C.text : C.textSub, fontFamily: b.data === hoje ? F.bold : F.regular, marginTop: 4, height: 16 }}>{diaDaSemana(b.data)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>A linha tracejada é a sua meta de {horasTexto(alvo)}.</Text>
        {resumo.noites > 0 && (
          <View style={{ marginTop: 8 }}>
            <Linha rotulo="Noites na meta" valor={`${resumo.naMeta} de ${resumo.noites}`} />
            <Linha rotulo="Nota média" valor={String(resumo.mediaQualidade).replace('.', ',')} />
          </View>
        )}
      </Peca>

      <Secao titulo="O que as suas noites mostram" direita={!ehPro ? <Selo texto="Pro" icone="coroa" tinta="ouro" /> : undefined} />
      {ehPro ? (
        <View style={{ gap: 10, marginBottom: 20 }}>
          {achados.map((a) => (
            <Peca key={a.titulo} tinta={a.tom === 'bom' ? 'verde' : a.tom === 'atencao' ? 'ouro' : 'azul'} padding={14}>
              <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{a.titulo}</Text>
              <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{a.texto}</Text>
            </Peca>
          ))}
        </View>
      ) : (
        <TrancaPro titulo="A leitura do seu sono" texto="Se o seu horário é regular, quanto sono faltou e o que as noites boas têm em comum." aoTocar={() => aoPedirPro('A leitura do seu sono')} />
      )}

      <Secao titulo="Noites anotadas" />
      <View style={{ gap: 8 }}>
        {lista.map((n) => {
          const minutos = duracaoMin(n.deitou, n.acordou);
          return (
            <Pressable key={n.data} onLongPress={() => confirmar('Apagar esta noite', `A noite de ${dataCurta(n.data)} sai do diário.`, 'Apagar', () => apagarNoite(n.data))} accessibilityLabel={`${dataCurta(n.data)}: ${horasTexto(minutos)}, noite ${NOTAS[n.qualidade - 1].nome.toLowerCase()}. Segure para apagar.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 2, borderBottomWidth: 4, borderColor: C.border, padding: 12 }}>
              <Icone nome={NOTAS[n.qualidade - 1].icone} tamanho={34} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.bold, fontSize: 15, color: C.text }}>{dataCurta(n.data)}</Text>
                <Text style={{ fontSize: 13, color: C.textSub }}>Das {n.deitou} às {n.acordou}</Text>
              </View>
              <Text style={{ fontFamily: F.displayX, fontSize: 18, color: minutos >= alvo - 30 ? C.primaryLight : C.accent }}>{horasTexto(minutos)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>Segure uma noite para apagar.</Text>
      {!ehPro && guardadas > 0 && (
        <View style={{ marginTop: 12 }}>
          <TrancaPro titulo={`Mais ${guardadas} ${guardadas === 1 ? 'noite guardada' : 'noites guardadas'}`} texto="O grátis mostra os últimos 7 dias. No Pro você vê o histórico inteiro." aoTocar={() => aoPedirPro('Histórico completo do sono')} />
        </View>
      )}
    </>
  );
}

// ───────────────────────── Dicas ─────────────────────────

function Dicas({ ehPro, aoPedirPro }: PropsAba) {
  const visiveis = ehPro ? DICAS_SONO : DICAS_SONO.slice(0, GRATIS_SONO.dicas);
  return (
    <>
      <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 21, marginBottom: 14 }}>Hábitos recomendados por entidades de medicina do sono. Escolha um só para começar.</Text>
      <View style={{ gap: 10, marginBottom: 14 }}>
        {visiveis.map((d, i) => (
          <Peca key={d.id} padding={14}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.displayX, fontSize: 15, color: C.primaryLight }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{d.titulo}</Text>
                <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{d.texto}</Text>
              </View>
            </View>
          </Peca>
        ))}
      </View>
      {!ehPro && <TrancaPro titulo={`Mais ${DICAS_SONO.length - GRATIS_SONO.dicas} hábitos`} texto="Café, quarto, jantar, corpo e o que fazer quando o sono não vem." aoTocar={() => aoPedirPro('Todos os hábitos de sono')} />}
      <Peca tinta="azul" padding={14}>
        <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>{AVISO_SONO}</Text>
      </Peca>
    </>
  );
}
