import { useEffect, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { BONECO_NOVO, chaveAvatar, normalizarAvatar, type AvatarConfig, type Expressao } from '@/lib/avatar';
import { retratoAvatar, retratoEmCache } from '@/lib/avatar3d';

export { avatarConfigPadrao } from '@/lib/avatar';
export type { AvatarConfig, Expressao } from '@/lib/avatar';

/** Retrato fixo, usado enquanto o 3D carrega e no celular. Com o boneco novo, é o retrato dele. */
const BUSTO_FIXO = BONECO_NOVO
  ? { curto: require('../assets/avatar/busto-curto-v2.webp'), coque: require('../assets/avatar/busto-coque-v2.webp') }
  : { curto: require('../assets/avatar/busto-curto.webp'), coque: require('../assets/avatar/busto-coque.webp') };

interface Props {
  config: AvatarConfig | unknown;
  expressao?: Expressao;
  size?: number;
}

/**
 * Retrato redondo do avatar 3D. Na web é desenhado a partir do boneco 3D com as cores e
 * peças escolhidas; enquanto o 3D carrega (ou no celular) mostra o retrato fixo do cabelo.
 */
export default function AvatarPersonagem({ config, expressao = 'feliz', size = 120 }: Props) {
  const cfg = useMemo(() => normalizarAvatar(config), [config]);
  const chave = chaveAvatar(cfg, expressao);
  const [retrato, setRetrato] = useState<string | undefined>(() => retratoEmCache(cfg, expressao, 'busto'));

  useEffect(() => {
    let vivo = true;
    retratoAvatar(cfg, expressao, 'busto')
      .then((url) => { if (vivo) setRetrato(url); })
      .catch(() => {}); // sem 3D: fica o retrato fixo
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: `#${cfg.fundo}` }}
      accessibilityRole="image"
      accessibilityLabel="Seu avatar"
    >
      <Image
        source={retrato ? { uri: retrato } : BUSTO_FIXO[cfg.cabelo]}
        style={{ width: size, height: size }}
        resizeMode="cover"
      />
    </View>
  );
}
