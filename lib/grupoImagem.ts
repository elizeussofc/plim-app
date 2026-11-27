import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface ImagemPronta {
  /** Pronta para mostrar: data:image/jpeg;base64,... */
  dataUri: string;
  base64: string;
  largura: number;
  altura: number;
}

/**
 * Abre a galeria e devolve a foto escolhida já reduzida e regravada em JPEG.
 * Regravar a imagem também tira os dados escondidos da câmera (como o lugar exato onde
 * a foto foi tirada): o que vai para o Grupo é só o que aparece na imagem.
 * Devolve null se a pessoa desistir.
 */
export async function escolherImagem(larguraMax = 1080): Promise<ImagemPronta | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (r.canceled || !r.assets?.length) return null;
  const foto = r.assets[0];
  const contexto = ImageManipulator.manipulate(foto.uri);
  if (!foto.width || foto.width > larguraMax) contexto.resize({ width: larguraMax });
  const imagem = await contexto.renderAsync();
  const salvo = await imagem.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
  if (!salvo.base64) return null;
  return { dataUri: `data:image/jpeg;base64,${salvo.base64}`, base64: salvo.base64, largura: salvo.width, altura: salvo.height };
}

/** Base64 para bytes, para enviar ao servidor. */
export function bytesDoBase64(base64: string): Uint8Array {
  const binario = globalThis.atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}
