import AvatarPersonagem from '@/components/AvatarPersonagem';
import Icone from '@/components/Icone';
import { Botao, Cabecalho, Peca, PecaBotao, Vazio } from '@/components/plim';
import { Text } from '@/components/Texto';
import { contar, tempoRelativo, type Visita } from '@/lib/grupo';
import * as api from '@/lib/grupoApi';
import { C, F } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useGrupoStore } from '@/stores/grupoStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Quem visitou o seu perfil. O número é de todo mundo; a lista de nomes é do Pro. */
export default function VisitasScreen() {
  const router = useRouter();
  const eu = useAuthStore((s) => s.session?.user?.id ?? null);
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const { modo, participa, discreto, carregar } = useGrupoStore();
  const [total, setTotal] = useState<number | null>(null);
  const [lista, setLista] = useState<Visita[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falhou, setFalhou] = useState(false);

  useEffect(() => { if (modo === 'carregando') void carregar(); }, [modo, carregar]);

  useEffect(() => {
    if (modo === 'carregando') return;
    if (modo !== 'online' || !eu || !participa) { setCarregando(false); return; }
    let vivo = true;
    setCarregando(true);
    Promise.all([api.totalDeVisitas(), ehPro && !discreto ? api.quemVisitou(eu) : Promise.resolve([] as Visita[])])
      .then(([n, quem]) => { if (vivo) { setTotal(n); setLista(quem); setFalhou(false); } })
      .catch(() => { if (vivo) setFalhou(true); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [modo, eu, participa, ehPro, discreto]);

  const agora = Date.now();
  const fora = modo !== 'online' || !eu || !participa;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ maxWidth: 480, width: '100%', alignSelf: 'center' }} contentContainerStyle={{ padding: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Cabecalho titulo="Quem visitou você" icone="parceria" sub="Últimos 30 dias" />

        {carregando && <ActivityIndicator color={C.primary} style={{ marginTop: 60 }} />}

        {!carregando && fora && (
          <Vazio titulo="Isso é do Grupo com outras pessoas" texto="As visitas aparecem aqui quando você estiver no Grupo de verdade, com a sua conta.">
            <Botao rotulo="Ir para o Grupo" pequeno onPress={() => router.replace('/(tabs)/comunidade')} estilo={{ marginTop: 12 }} />
          </Vazio>
        )}

        {!carregando && !fora && falhou && <Vazio titulo="Não deu para carregar" texto="Confira a internet e tente de novo." />}

        {!carregando && !fora && !falhou && (
          <>
            <Peca tinta="roxo" estilo={{ marginBottom: 16, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.displayX, fontSize: 48, color: C.text }}>{total ?? 0}</Text>
              <Text style={{ fontSize: 15, color: C.textSub, textAlign: 'center' }}>{(total ?? 0) === 1 ? 'pessoa passou pelo seu perfil' : 'pessoas passaram pelo seu perfil'}</Text>
            </Peca>

            {discreto && (
              <Peca tinta="azul" padding={14} estilo={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>Você está em modo discreto: suas visitas não ficam registradas e, em troca, a lista de quem visitou você fica escondida. Dá para mudar no Perfil.</Text>
              </Peca>
            )}

            {!ehPro && (
              <PecaBotao tinta="ouro" padding={14} onPress={() => abrirPaywall('Ver quem visitou seu perfil')} accessibilityLabel="Ver quem visitou seu perfil faz parte do Plim Pro">
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Icone nome="coroa" tamanho={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>Veja quem foi</Text>
                    <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>No Pro você vê o nome e o boneco de quem visitou, e o Instagram de quem cadastrou.</Text>
                  </View>
                </View>
              </PecaBotao>
            )}

            {ehPro && !discreto && lista.length === 0 && <Vazio titulo="Ninguém por enquanto" texto="Publicar e reagir no Grupo ajuda as pessoas a encontrarem você." />}

            {ehPro && !discreto && lista.map((v) => (
              <PecaBotao key={v.autor.id} padding={12} estilo={{ marginBottom: 10 }} onPress={() => router.push({ pathname: '/pessoa', params: { id: v.autor.id } } as never)} accessibilityLabel={`${v.autor.apelido}, visitou ${tempoRelativo(v.vistoEm, agora)}. Ver o perfil.`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <AvatarPersonagem config={v.autor.avatar} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>{v.autor.apelido}</Text>
                    <Text style={{ fontSize: 13, color: C.textSub }}>{tempoRelativo(v.vistoEm, agora)}</Text>
                  </View>
                  <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>›</Text>
                </View>
              </PecaBotao>
            ))}

            {ehPro && !discreto && lista.length > 0 && (
              <Text style={{ fontSize: 13, color: C.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 19 }}>
                {contar(lista.length, 'pessoa', 'pessoas')} na lista. Quem está em modo discreto não aparece aqui.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
