import AvatarPalco from '@/components/AvatarPalco';
import AvatarPersonagem from '@/components/AvatarPersonagem';
import { Text } from '@/components/Texto';
import {
  CHAPEUS, COSTAS, EXPRESSOES, OPCOES_BONECO, OPCOES_CALCA, OPCOES_ROSTO, PESCOCOS, OPCOES_COR_CABELO, OPCOES_MOLETOM, OPCOES_PELE, OPCOES_RAIO, OPCOES_TENIS,
  avatarConfigPadrao, type AvatarConfig, type Expressao,
} from '@/lib/avatar';
import { C, F } from '@/lib/theme';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

/** Só existe enquanto o boneco novo está em prova (EXPO_PUBLIC_BONECO=v2 no .env.local). */
const LIGADO = process.env.EXPO_PUBLIC_BONECO === 'v2';

const NOME: Record<Expressao, string> = {
  feliz: 'Feliz', neutro: 'Neutro', animado: 'Animado', orgulhoso: 'Orgulhoso',
  determinado: 'Determinado', triste: 'Triste', cansado: 'Cansado',
};

function Cores({ titulo, opcoes, atual, aoEscolher }: { titulo: string; opcoes: string[]; atual: string; aoEscolher: (hex: string) => void }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.text, marginBottom: 6 }}>{titulo}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {opcoes.map((hex) => {
          const ativo = atual.toUpperCase() === hex.toUpperCase();
          return (
            <Pressable key={hex} onPress={() => aoEscolher(hex)} accessibilityRole="radio" accessibilityState={{ selected: ativo }} accessibilityLabel={`${titulo}: cor ${hex}`}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: `#${hex}`, borderWidth: ativo ? 4 : 2, borderColor: ativo ? C.primary : C.border }} />
          );
        })}
      </View>
    </View>
  );
}

/** Bancada de prova do boneco novo: expressões, cores e os retratos pequenos. Não faz parte do app. */
export default function BonecoProva() {
  const [cfg, setCfg] = useState<AvatarConfig>({ ...avatarConfigPadrao });
  const [expr, setExpr] = useState<Expressao>('feliz');
  if (!LIGADO) return <Redirect href="/" />;
  const mudar = (parte: Partial<AvatarConfig>) => setCfg((c) => ({ ...c, ...parte }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 18, paddingBottom: 60, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Text style={{ fontFamily: F.display, fontSize: 24, color: C.text }}>Boneco novo (prova)</Text>
      <Text style={{ fontSize: 14, color: C.textSub, marginTop: 4, marginBottom: 6 }}>
        Arraste para girar. Toque nele para acenar. Ele respira e pisca sozinho.
      </Text>
      <AvatarPalco config={cfg} expressao={expr} altura={400} />

      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.text, marginTop: 10, marginBottom: 6 }}>Boneco</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        {OPCOES_BONECO.map((o) => (
          <Pressable key={o.id} onPress={() => mudar({ cabelo: o.id })} accessibilityRole="button" accessibilityLabel={`Boneco ${o.label}`}
            style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: o.id === cfg.cabelo ? C.primary : C.surface, borderWidth: 2, borderColor: o.id === cfg.cabelo ? C.primary : C.border }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: o.id === cfg.cabelo ? '#FFFFFF' : C.text }}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.text, marginTop: 10, marginBottom: 6 }}>Formato do rosto</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {OPCOES_ROSTO.map((o) => (
          <Pressable key={o.id} onPress={() => mudar({ rosto: o.id })} accessibilityRole="button" accessibilityLabel={`Rosto ${o.label}`}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: cfg.rosto === o.id ? C.primary : C.surface, borderWidth: 2, borderColor: cfg.rosto === o.id ? C.primary : C.border }}>
            <Text style={{ fontSize: 13, color: cfg.rosto === o.id ? '#FFFFFF' : C.text }}>{o.label}</Text>
          </Pressable>
        ))}
      </View>

      {([['Chapéu', 'chapeu', CHAPEUS], ['Pescoço', 'pescoco', PESCOCOS], ['Costas', 'costas', COSTAS]] as const).map(([titulo, campo, opcoes]) => (
        <View key={campo}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.text, marginTop: 10, marginBottom: 6 }}>{titulo}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['', ...opcoes].map((id) => (
              <Pressable key={id || 'nada'} onPress={() => mudar({ [campo]: id } as Partial<AvatarConfig>)} accessibilityRole="button" accessibilityLabel={`${titulo} ${id || 'nenhum'}`}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: cfg[campo] === id ? C.primary : C.surface, borderWidth: 2, borderColor: cfg[campo] === id ? C.primary : C.border }}>
                <Text style={{ fontSize: 13, color: cfg[campo] === id ? '#FFFFFF' : C.text }}>{id || 'nenhum'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        {(['oculos', 'fone'] as const).map((campo) => (
          <Pressable key={campo} onPress={() => mudar({ [campo]: !cfg[campo] } as Partial<AvatarConfig>)} accessibilityRole="button" accessibilityLabel={`Acessório ${campo}`}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: cfg[campo] ? C.primary : C.surface, borderWidth: 2, borderColor: cfg[campo] ? C.primary : C.border }}>
            <Text style={{ fontSize: 13, color: cfg[campo] ? '#FFFFFF' : C.text }}>{campo === 'oculos' ? 'óculos' : 'fone'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.text, marginTop: 10, marginBottom: 6 }}>Expressão</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {EXPRESSOES.map((e) => (
          <Pressable key={e} onPress={() => setExpr(e)} accessibilityRole="button" accessibilityLabel={`Expressão ${NOME[e]}`}
            style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: e === expr ? C.primary : C.surface, borderWidth: 2, borderColor: e === expr ? C.primary : C.border }}>
            <Text style={{ fontFamily: F.display, fontSize: 14, color: e === expr ? '#FFFFFF' : C.text }}>{NOME[e]}</Text>
          </Pressable>
        ))}
      </View>

      <Cores titulo="Tom de pele" opcoes={OPCOES_PELE} atual={cfg.pele} aoEscolher={(h) => mudar({ pele: h })} />
      <Cores titulo="Cor do cabelo" opcoes={OPCOES_COR_CABELO} atual={cfg.corCabelo} aoEscolher={(h) => mudar({ corCabelo: h })} />
      <Cores titulo="Moletom" opcoes={OPCOES_MOLETOM} atual={cfg.corMoletom} aoEscolher={(h) => mudar({ corMoletom: h })} />
      <Cores titulo="Raio e sola" opcoes={OPCOES_RAIO} atual={cfg.corRaio} aoEscolher={(h) => mudar({ corRaio: h })} />
      <Cores titulo="Calça" opcoes={OPCOES_CALCA} atual={cfg.corCalca} aoEscolher={(h) => mudar({ corCalca: h })} />
      <Cores titulo="Tênis" opcoes={OPCOES_TENIS} atual={cfg.corTenis} aoEscolher={(h) => mudar({ corTenis: h })} />

      <Text style={{ fontFamily: F.display, fontSize: 14, color: C.text, marginTop: 6, marginBottom: 8 }}>Retratos (como aparecem no resto do app)</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {EXPRESSOES.map((e) => (
          <View key={e} style={{ alignItems: 'center', width: 92 }}>
            <AvatarPersonagem config={cfg} expressao={e} size={88} />
            <Text style={{ fontSize: 12, color: C.textSub, marginTop: 4 }}>{NOME[e]}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
