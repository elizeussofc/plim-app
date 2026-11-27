import Abas from '@/components/Abas';
import AvatarPalco from '@/components/AvatarPalco';
import AvatarPersonagem from '@/components/AvatarPersonagem';
import Icone from '@/components/Icone';
import { Botao, Cabecalho, Peca, Selo, Tela } from '@/components/plim';
import { Text } from '@/components/Texto';
import { OPCOES_PECA, OPCOES_RAIO, OPCOES_TENIS, normalizarAvatar, type AvatarConfig } from '@/lib/avatar';
import { LUGARES, faltam, pecasDe, situacaoDaPeca, vestir, type Lugar, type Peca as PecaDeRoupa } from '@/lib/roupas';
import { somPecaNova, somToque, somVestir } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { dizer } from '@/stores/falaStore';
import { usePaywallStore } from '@/stores/paywallStore';
import { useUserStore } from '@/stores/userStore';
import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

type Aba = Lugar | 'cores';
const ABAS: { id: Aba; nome: string }[] = [...LUGARES, { id: 'cores', nome: 'Cores' }];

function Cores({ titulo, opcoes, atual, aoEscolher }: { titulo: string; opcoes: string[]; atual: string; aoEscolher: (hex: string) => void }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>{titulo}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
        {opcoes.map((hex) => {
          const ativo = atual.toUpperCase() === hex.toUpperCase();
          return (
            <Pressable key={hex} onPress={() => aoEscolher(hex)} accessibilityRole="radio" accessibilityState={{ selected: ativo }} accessibilityLabel={`${titulo}: cor ${hex}`} hitSlop={4} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `#${hex}`, borderWidth: ativo ? 4 : 2, borderColor: ativo ? C.primary : C.border, alignItems: 'center', justifyContent: 'center' }}>
              {ativo && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.surface, borderWidth: 2, borderColor: C.primary }} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Guarda-roupa: chapéus, peças de pescoço e de costas para o avatar, compradas com as moedas do app. */
export default function GuardaRoupaScreen() {
  const profile = useUserStore((s) => s.profile);
  const updateAvatarConfig = useUserStore((s) => s.updateAvatarConfig);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const addMoedas = useUserStore((s) => s.addMoedas);
  const abrirPaywall = usePaywallStore((s) => s.abrir);
  const ehPro = profile.plano === 'pro';
  const cfg = useMemo(() => normalizarAvatar(profile.avatar_config), [profile.avatar_config]);
  const compradas = profile.preferencias.roupas ?? [];
  const parado = profile.preferencias.reduzir_animacoes || profile.preferencias.modo_baixo_estimulo;
  const [aba, setAba] = useState<Aba>('chapeu');
  /** Peça que a pessoa está só provando (ainda não é dela). Some ao sair da tela. */
  const [provando, setProvando] = useState<PecaDeRoupa | null>(null);

  const noPalco: AvatarConfig = provando ? { ...cfg, ...vestir(provando, { ...cfg, [provando.lugar]: '' }) } : cfg;
  const situacaoDaProva = provando ? situacaoDaPeca(provando, cfg, compradas, profile.moedas, ehPro) : null;

  function tocar(p: PecaDeRoupa) {
    const situacao = situacaoDaPeca(p, cfg, compradas, profile.moedas, ehPro);
    if (situacao === 'vestida' || situacao === 'minha') {
      setProvando(null);
      updateAvatarConfig(vestir(p, cfg));
      somVestir();
      if (situacao === 'minha') dizer('roupa_vestiu');
      return;
    }
    setProvando(provando?.id === p.id ? null : p);
    somToque();
    if (situacao === 'faltam-moedas' && provando?.id !== p.id) dizer('roupa_sem_moedas');
  }

  function comprar() {
    if (!provando || situacaoDaProva !== 'comprar') return;
    addMoedas(-provando.preco);
    updateProfile({ preferencias: { ...profile.preferencias, roupas: [...compradas, provando.id] } });
    updateAvatarConfig(vestir(provando, { ...cfg, [provando.lugar]: '' }));
    setProvando(null);
    somPecaNova();
    dizer('roupa_comprou');
  }

  function trocarAba(a: Aba) {
    setAba(a);
    setProvando(null);
  }

  return (
    <Tela espacoFinal={48}>
      <Cabecalho
        titulo="Guarda-roupa"
        icone="roupa-cabide"
        direita={(
          <View accessible accessibilityLabel={`${profile.moedas} moedas`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.goldSoft, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Icone nome="moeda" tamanho={22} />
            <Text style={{ fontFamily: F.displayX, fontSize: 16, color: C.gold }}>{profile.moedas}</Text>
          </View>
        )}
      />

      <Peca tinta="roxo" padding={0} estilo={{ marginBottom: 14, overflow: 'hidden' }}>
        <AvatarPalco config={noPalco} expressao={provando ? 'animado' : 'feliz'} altura={250} parado={parado} />
        {provando && (
          <View style={{ backgroundColor: C.surface, borderTopWidth: 2, borderColor: C.borderPrimary, padding: 14 }}>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: C.text }}>Provando: {provando.nome}</Text>
            {situacaoDaProva === 'comprar' && (
              <>
                <Text style={{ fontSize: 14, color: C.textSub, marginBottom: 10 }}>Custa {provando.preco} moedas. Você fica com {profile.moedas - provando.preco}.</Text>
                <Botao rotulo={`Comprar por ${provando.preco} moedas`} icone="moeda" cor="laranja" onPress={comprar} />
              </>
            )}
            {situacaoDaProva === 'faltam-moedas' && (
              <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>Custa {provando.preco} moedas e faltam {faltam(provando, profile.moedas)}. Sessão de foco, missão das trilhas e desafio da semana rendem moedas.</Text>
            )}
            {situacaoDaProva === 'pro' && (
              <>
                <Text style={{ fontSize: 14, color: C.textSub, marginBottom: 10 }}>Esta peça é de quem assina o Plim Pro. Não se compra com moedas.</Text>
                <Botao rotulo="Conhecer o Plim Pro" icone="coroa" cor="roxo" onPress={() => abrirPaywall(`${provando.nome} no guarda-roupa`)} />
              </>
            )}
          </View>
        )}
      </Peca>

      <Abas abas={ABAS} atual={aba} aoTrocar={trocarAba} />

      {aba !== 'cores' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {pecasDe(aba).map((p) => {
            const situacao = situacaoDaPeca(p, cfg, compradas, profile.moedas, ehPro);
            const vestida = situacao === 'vestida';
            const emProva = provando?.id === p.id;
            const legenda = vestida ? 'vestindo' : situacao === 'minha' ? 'toque para vestir' : situacao === 'pro' ? 'Plim Pro' : `${p.preco} moedas`;
            return (
              <Pressable
                key={p.id}
                onPress={() => tocar(p)}
                accessibilityRole="button"
                accessibilityState={{ selected: vestida }}
                accessibilityLabel={`${p.nome}: ${legenda}`}
                style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, alignItems: 'center', backgroundColor: vestida ? C.glass : C.surface, borderRadius: R.lg, borderWidth: vestida || emProva ? 3 : 2, borderBottomWidth: pressed ? 3 : 6, marginTop: pressed ? 3 : 0, borderColor: vestida ? C.primary : emProva ? C.accent : C.border, padding: 12 })}
              >
                {Platform.OS === 'web'
                  ? <AvatarPersonagem config={{ ...cfg, ...vestir(p, { ...cfg, [p.lugar]: '' }) }} expressao="feliz" size={92} />
                  : <Icone nome="roupa-cabide" tamanho={72} />}
                <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text, marginTop: 8, textAlign: 'center' }}>{p.nome}</Text>
                {situacao === 'pro'
                  ? <View style={{ marginTop: 4 }}><Selo texto="Pro" icone="coroa" tinta="ouro" /></View>
                  : situacao === 'comprar' || situacao === 'faltam-moedas'
                    ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Icone nome="moeda" tamanho={18} />
                        <Text style={{ fontFamily: F.bold, fontSize: 14, color: situacao === 'comprar' ? C.gold : C.textMuted }}>{p.preco}</Text>
                      </View>
                    )
                    : <Text style={{ fontFamily: F.bold, fontSize: 13, color: vestida ? C.primaryLight : C.textSub, marginTop: 4 }}>{legenda}</Text>}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          <Cores titulo="Cor do chapéu" opcoes={OPCOES_PECA} atual={cfg.corChapeu} aoEscolher={(h) => { updateAvatarConfig({ corChapeu: h }); somToque(); }} />
          <Cores titulo="Cor do cachecol, da mochila e da capa" opcoes={OPCOES_PECA} atual={cfg.corExtra} aoEscolher={(h) => { updateAvatarConfig({ corExtra: h }); somToque(); }} />
          <Cores titulo="Tênis" opcoes={OPCOES_TENIS} atual={cfg.corTenis} aoEscolher={(h) => { updateAvatarConfig({ corTenis: h }); somToque(); }} />
          <Cores titulo="Raio do moletom" opcoes={OPCOES_RAIO} atual={cfg.corRaio} aoEscolher={(h) => { updateAvatarConfig({ corRaio: h }); somToque(); }} />
          <Text style={{ fontSize: 13, color: C.textSub, lineHeight: 19 }}>Cabelo, pele, moletom e calça continuam em Perfil › Mudar visual. As cores são grátis.</Text>
        </>
      )}

      <Peca tinta="ouro" padding={14} estilo={{ marginTop: 20 }}>
        <Text style={{ fontFamily: F.display, fontSize: 16, color: C.text }}>De onde vêm as moedas</Text>
        <Text style={{ fontSize: 14, color: C.textSub, lineHeight: 20 }}>De usar o Plim: sessão de foco, missão cumprida nas trilhas, desafio da semana, despejo mental e treino completo. Não dá para comprar moeda com dinheiro.</Text>
      </Peca>
      {Platform.OS !== 'web' && <Text style={{ fontSize: 13, color: C.textSub, textAlign: 'center', marginTop: 12 }}>No celular o boneco ainda aparece como retrato fixo. As peças aparecem na versão web.</Text>}
    </Tela>
  );
}
