import { Text } from '@/components/Texto';
import { somToque } from '@/lib/sons';
import { C, F, R } from '@/lib/theme';
import { Pressable, View } from 'react-native';

/** Fileira de abas das telas internas (Sono, Estudos, Casa, Guarda-roupa). */
export default function Abas<T extends string>({ abas, atual, aoTrocar }: { abas: { id: T; nome: string }[]; atual: T; aoTrocar: (id: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 18 }} accessibilityRole="tablist">
      {abas.map((a) => {
        const ativo = atual === a.id;
        return (
          <Pressable
            key={a.id}
            onPress={() => { if (!ativo) { aoTrocar(a.id); somToque(); } }}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: R.md, backgroundColor: ativo ? C.primary : C.surface, borderWidth: 2, borderBottomWidth: 5, borderColor: ativo ? C.primaryDim : C.border }}
          >
            <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14, color: ativo ? C.onPrimary : C.textSub }}>{a.nome}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
