import Icone from '@/components/Icone';
import { Almofada, Peca, PecaBotao, Secao, Selo, Tela } from '@/components/plim';
import { Text } from '@/components/Texto';
import { FERRAMENTAS, useAbrirFerramenta, type Ferramenta } from '@/lib/ferramentas';
import { C, F } from '@/lib/theme';
import { useUserStore } from '@/stores/userStore';
import { Image, View } from 'react-native';

const PRINCIPAIS: Ferramenta[] = [FERRAMENTAS.trilhas, FERRAMENTAS.despejo, FERRAMENTAS.foco, FERRAMENTAS.calma, FERRAMENTAS.ia];
/** O que o Pro tem de maior: cada um deixa experimentar antes de pedir a assinatura. */
const VIDA: Ferramenta[] = [FERRAMENTAS.gym, FERRAMENTAS.financas];
/** O dia a dia fora do trabalho: dormir, estudar, cuidar da casa, e o balanço de tudo. */
const DIA_A_DIA: Ferramenta[] = [FERRAMENTAS.resumo, FERRAMENTAS.sono, FERRAMENTAS.estudos, FERRAMENTAS.casa];
const EXTRAS: Ferramenta[] = [FERRAMENTAS.roupas, FERRAMENTAS.medicacao, FERRAMENTAS.historico, FERRAMENTAS.parceiro, FERRAMENTAS.ranking];

function Cartao({ f, ehPro, aoAbrir }: { f: Ferramenta; ehPro: boolean; aoAbrir: (f: Ferramenta) => void }) {
  const selo = ehPro ? undefined : f.pro ? 'Pro' : f.selo;
  return (
    <PecaBotao onPress={() => aoAbrir(f)} accessibilityLabel={`${f.titulo}. ${f.desc}${selo ? ` ${selo}.` : ''}`} padding={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Almofada icone={f.icone} tinta={f.tinta} tamanho={62} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: F.display, fontSize: 18, color: C.text }}>{f.titulo}</Text>
            {selo && <Selo texto={selo} icone="coroa" tinta="ouro" />}
          </View>
          <Text style={{ fontSize: 14, color: C.textSub, marginTop: 2, lineHeight: 20 }}>{f.desc}</Text>
        </View>
        <Text style={{ fontFamily: F.displayX, fontSize: 22, color: C.textMuted }}>›</Text>
      </View>
    </PecaBotao>
  );
}

/** Aba Plim: as ferramentas para quando a cabeça precisa de ajuda agora. */
export default function PlimScreen() {
  const abrir = useAbrirFerramenta();
  const ehPro = useUserStore((s) => s.profile.plano === 'pro');

  return (
    <Tela>
      {/* Abertura */}
      <Peca tinta="roxo" padding={0} estilo={{ marginBottom: 22, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, padding: 18, paddingRight: 4 }}>
            <Text accessibilityRole="header" style={{ fontFamily: F.displayX, fontSize: 26, color: C.text, lineHeight: 30 }}>Do que você precisa agora?</Text>
            <Text style={{ fontSize: 14, color: C.textSub, marginTop: 6, lineHeight: 20 }}>Não precisa fazer tudo. Escolha uma coisa.</Text>
          </View>
          <Image source={require('../../assets/cenas/foco.webp')} style={{ width: 132, height: 150, marginRight: 6 }} resizeMode="contain" accessible={false} />
        </View>
      </Peca>

      {/* Principais */}
      <View style={{ gap: 12, marginBottom: 24 }}>
        {PRINCIPAIS.map((f) => <Cartao key={f.rota} f={f} ehPro={ehPro} aoAbrir={abrir} />)}
      </View>

      {/* Corpo e bolso */}
      <Secao titulo="Corpo e bolso" />
      <View style={{ gap: 12, marginBottom: 24 }}>
        {VIDA.map((f) => <Cartao key={f.rota} f={f} ehPro={ehPro} aoAbrir={abrir} />)}
      </View>

      {/* Dia a dia */}
      <Secao titulo="Sua vida em dia" />
      <View style={{ gap: 12, marginBottom: 24 }}>
        {DIA_A_DIA.map((f) => <Cartao key={f.rota} f={f} ehPro={ehPro} aoAbrir={abrir} />)}
      </View>

      {/* Mais */}
      <Secao titulo="Mais ferramentas" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {EXTRAS.map((f) => (
          <PecaBotao
            key={f.rota}
            onPress={() => abrir(f)}
            accessibilityLabel={`${f.titulo}. ${f.desc}${f.pro && !ehPro ? ' Faz parte do Plim Pro.' : ''}`}
            estilo={{ flexBasis: '47%', flexGrow: 1, alignItems: 'center' }}
            padding={14}
          >
            <View>
              <Almofada icone={f.icone} tinta={f.tinta} tamanho={58} />
              {f.pro && !ehPro && (
                <View style={{ position: 'absolute', top: -8, right: -12 }}>
                  <Icone nome="coroa" tamanho={26} />
                </View>
              )}
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text, marginTop: 8 }}>{f.titulo}</Text>
            <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center' }}>{f.desc}</Text>
          </PecaBotao>
        ))}
      </View>
    </Tela>
  );
}
