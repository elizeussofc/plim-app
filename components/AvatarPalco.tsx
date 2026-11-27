import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { chaveAvatar, normalizarAvatar, type AvatarConfig, type Expressao } from '@/lib/avatar';
import { criarPalco, type Palco } from '@/lib/avatar3d';
import { C } from '@/lib/theme';

const BUSTO_FIXO = {
  curto: require('../assets/avatar/busto-curto.webp'),
  coque: require('../assets/avatar/busto-coque.webp'),
} as const;

interface Props {
  config: AvatarConfig | unknown;
  expressao?: Expressao;
  altura?: number;
  /** Sem movimento sozinho (preferência "reduzir animações"). */
  parado?: boolean;
}

/**
 * Palco do avatar de corpo inteiro. Na web é o boneco 3D ao vivo: arraste para girar,
 * toque para ele acenar. No celular (ou se o 3D falhar) mostra o retrato fixo.
 */
export default function AvatarPalco({ config, expressao = 'feliz', altura = 280, parado = false }: Props) {
  const cfg = useMemo(() => normalizarAvatar(config), [config]);
  const chave = chaveAvatar(cfg, expressao);
  const caixa = useRef<View>(null);
  const palco = useRef<Palco | null>(null);
  const [vivo, setVivo] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || !caixa.current) return;
    let cancelado = false;
    criarPalco(caixa.current as unknown as HTMLElement, cfg, expressao, parado)
      .then((p) => {
        if (cancelado) { p.destruir(); return; }
        palco.current = p;
        setVivo(true);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
      palco.current?.destruir();
      palco.current = null;
      setVivo(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parado]);

  useEffect(() => {
    palco.current?.atualizar(cfg, expressao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, vivo]);

  return (
    <View style={{ height: altura, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* chão do palco */}
      <View style={{ position: 'absolute', bottom: 6, width: altura * 0.62, height: altura * 0.13, borderRadius: 999, backgroundColor: `#${cfg.fundo}` }} />
      <View style={{ position: 'absolute', bottom: altura * 0.035, width: altura * 0.34, height: altura * 0.045, borderRadius: 999, backgroundColor: C.text, opacity: 0.1 }} />
      <View
        ref={caixa}
        style={{ width: '100%', height: altura, maxWidth: altura * 0.95 }}
        accessibilityRole="image"
        accessibilityLabel="Seu avatar de corpo inteiro. Arraste para girar, toque para acenar."
      />
      {!vivo && (
        <View style={{ position: 'absolute', bottom: altura * 0.12, width: altura * 0.62, height: altura * 0.62, borderRadius: 999, overflow: 'hidden', backgroundColor: `#${cfg.fundo}` }}>
          <Image source={BUSTO_FIXO[cfg.cabelo]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      )}
    </View>
  );
}
