import { Image, Platform, Pressable, View } from 'react-native';
import AvatarPersonagem from '@/components/AvatarPersonagem';
import { Text } from '@/components/Texto';
import {
  OPCOES_BONECO, OPCOES_CALCA, OPCOES_COR_CABELO, OPCOES_FUNDO, OPCOES_MOLETOM, OPCOES_PELE, avatarConfigPadrao, type AvatarConfig,
} from '@/lib/avatar';
import { somToque, somVestir } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';

/** Com o boneco novo em prova (só na web), os cartões mostram o retrato dele em vez da imagem fixa do antigo. */
const BONECO_NOVO = process.env.EXPO_PUBLIC_BONECO === 'v2' && Platform.OS === 'web';

const RETRATO = {
  curto: require('../assets/avatar/busto-curto.webp'),
  coque: require('../assets/avatar/busto-coque.webp'),
} as const;

/** Fileira de cores para escolher (pele, cabelo, roupa, fundo). */
export function Cores({ titulo, opcoes, atual, aoEscolher }: { titulo: string; opcoes: string[]; atual: string; aoEscolher: (hex: string) => void }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>{titulo}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {opcoes.map((hex) => {
          const ativo = atual.toUpperCase() === hex.toUpperCase();
          return (
            <Pressable
              key={hex}
              onPress={() => aoEscolher(hex)}
              accessibilityRole="radio"
              aria-checked={ativo}
              accessibilityState={{ checked: ativo }}
              accessibilityLabel={`${titulo}: cor ${hex}`}
              hitSlop={4}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `#${hex}`, borderWidth: ativo ? 4 : 2, borderColor: ativo ? C.primary : C.border, alignItems: 'center', justifyContent: 'center' }}
            >
              {ativo && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.surface, borderWidth: 2, borderColor: C.primary }} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Opcao({ ativo, rotulo, aoTocar }: { ativo: boolean; rotulo: string; aoTocar: () => void }) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: R.md,
        backgroundColor: ativo ? C.primary : C.surface,
        borderWidth: 2,
        borderBottomWidth: pressed ? 2 : 5,
        marginTop: pressed ? 3 : 0,
        borderColor: ativo ? C.primaryDim : C.border,
      })}
    >
      <Text style={{ fontFamily: F.display, fontSize: 15, color: ativo ? C.onPrimary : C.textSub }}>{rotulo}</Text>
    </Pressable>
  );
}

/** Cartão com o retrato do boneco masculino ou feminino. */
function CartaoBoneco({ id, rotulo, ativo, fundo, aoTocar }: { id: keyof typeof RETRATO; rotulo: string; ativo: boolean; fundo: string; aoTocar: () => void }) {
  return (
    <Pressable
      onPress={aoTocar}
      accessibilityRole="radio"
      aria-checked={ativo}
      accessibilityState={{ checked: ativo }}
      accessibilityLabel={`Boneco ${rotulo.toLowerCase()}`}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 10,
        borderRadius: R.lg,
        backgroundColor: ativo ? C.glass : C.surface,
        borderWidth: 2,
        borderBottomWidth: pressed ? 2 : 6,
        marginTop: pressed ? 4 : 0,
        borderColor: ativo ? C.primary : C.border,
      })}
    >
      {BONECO_NOVO ? (
        <AvatarPersonagem config={{ ...avatarConfigPadrao, cabelo: id, fundo }} size={84} />
      ) : (
        <View style={{ width: 84, height: 84, borderRadius: 42, overflow: 'hidden', backgroundColor: `#${fundo}` }}>
          <Image source={RETRATO[id]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      )}
      <Text style={{ fontFamily: F.display, fontSize: 16, color: ativo ? C.primaryLight : C.textSub, marginTop: 8 }}>{rotulo}</Text>
    </Pressable>
  );
}

/**
 * Todas as escolhas do visual do boneco: masculino ou feminino, cores e acessórios.
 * Usado no Perfil (dentro da folha "mudar visual") e na criação do boneco, logo depois
 * das perguntas de entrada.
 */
export default function EditorAvatar({ avatar, aoMudar }: { avatar: AvatarConfig; aoMudar: (parcial: Partial<AvatarConfig>) => void }) {
  const cor = (parcial: Partial<AvatarConfig>) => { aoMudar(parcial); somToque(); };

  return (
    <View>
      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>Boneco</Text>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
        {OPCOES_BONECO.map((op) => (
          <CartaoBoneco
            key={op.id}
            id={op.id}
            rotulo={op.label}
            ativo={avatar.cabelo === op.id}
            fundo={avatar.fundo}
            aoTocar={() => { if (avatar.cabelo !== op.id) { aoMudar({ cabelo: op.id }); somVestir(); } }}
          />
        ))}
      </View>

      <Cores titulo="Cor do cabelo" opcoes={OPCOES_COR_CABELO} atual={avatar.corCabelo} aoEscolher={(h) => cor({ corCabelo: h })} />
      <Cores titulo="Tom de pele" opcoes={OPCOES_PELE} atual={avatar.pele} aoEscolher={(h) => cor({ pele: h })} />
      <Cores titulo="Moletom" opcoes={OPCOES_MOLETOM} atual={avatar.corMoletom} aoEscolher={(h) => cor({ corMoletom: h })} />
      <Cores titulo="Calça" opcoes={OPCOES_CALCA} atual={avatar.corCalca} aoEscolher={(h) => cor({ corCalca: h })} />

      <Text style={{ fontFamily: F.display, fontSize: 15, color: C.text, marginBottom: 8 }}>Acessórios</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
        <Opcao ativo={avatar.oculos} rotulo="Óculos" aoTocar={() => cor({ oculos: !avatar.oculos })} />
        <Opcao ativo={avatar.fone} rotulo="Fone" aoTocar={() => cor({ fone: !avatar.fone })} />
      </View>

      <Cores titulo="Fundo do retrato" opcoes={OPCOES_FUNDO} atual={avatar.fundo} aoEscolher={(h) => cor({ fundo: h })} />
    </View>
  );
}
