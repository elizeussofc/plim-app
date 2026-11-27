import { Image, View } from 'react-native';
import { Text } from '@/components/Texto';
import { C, F } from '@/lib/theme';

/** Imagens dos exercícios do Gym Plim: posição inicial à esquerda, final à direita. */
const IMAGENS: Record<string, number> = {
  'abdominal': require('../assets/gym/abdominal.webp'),
  'afundo': require('../assets/gym/afundo.webp'),
  'agachamento-barra': require('../assets/gym/agachamento-barra.webp'),
  'agachamento-goblet': require('../assets/gym/agachamento-goblet.webp'),
  'agachamento-livre': require('../assets/gym/agachamento-livre.webp'),
  'barra-fixa': require('../assets/gym/barra-fixa.webp'),
  'cadeira-extensora': require('../assets/gym/cadeira-extensora.webp'),
  'desenvolvimento': require('../assets/gym/desenvolvimento.webp'),
  'elevacao-lateral': require('../assets/gym/elevacao-lateral.webp'),
  'elevacao-pelvica': require('../assets/gym/elevacao-pelvica.webp'),
  'elevacao-pernas': require('../assets/gym/elevacao-pernas.webp'),
  'esteira': require('../assets/gym/esteira.webp'),
  'face-pull': require('../assets/gym/face-pull.webp'),
  'flexao': require('../assets/gym/flexao.webp'),
  'flexao-joelhos': require('../assets/gym/flexao-joelhos.webp'),
  'leg-press': require('../assets/gym/leg-press.webp'),
  'mesa-flexora': require('../assets/gym/mesa-flexora.webp'),
  'panturrilha': require('../assets/gym/panturrilha.webp'),
  'peck-deck': require('../assets/gym/peck-deck.webp'),
  'perdigueiro': require('../assets/gym/perdigueiro.webp'),
  'polichinelo': require('../assets/gym/polichinelo.webp'),
  'ponte-gluteo': require('../assets/gym/ponte-gluteo.webp'),
  'prancha': require('../assets/gym/prancha.webp'),
  'prancha-lateral': require('../assets/gym/prancha-lateral.webp'),
  'puxada-alta': require('../assets/gym/puxada-alta.webp'),
  'remada-baixa': require('../assets/gym/remada-baixa.webp'),
  'remada-curvada': require('../assets/gym/remada-curvada.webp'),
  'remada-unilateral': require('../assets/gym/remada-unilateral.webp'),
  'rosca-direta': require('../assets/gym/rosca-direta.webp'),
  'rosca-martelo': require('../assets/gym/rosca-martelo.webp'),
  'subida-banco': require('../assets/gym/subida-banco.webp'),
  'supino-inclinado': require('../assets/gym/supino-inclinado.webp'),
  'supino-reto': require('../assets/gym/supino-reto.webp'),
  'terra-romeno': require('../assets/gym/terra-romeno.webp'),
  'triceps-banco': require('../assets/gym/triceps-banco.webp'),
  'triceps-corda': require('../assets/gym/triceps-corda.webp'),
};

/** Mostra a imagem do exercício com as marcações "1 início" e "2 fim". */
export default function GymImagem({ id, nome, altura = 170, marcas = true }: { id: string; nome: string; altura?: number; marcas?: boolean }) {
  const fonte = IMAGENS[id];
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: C.border }}>
      {fonte ? (
        <Image
          source={fonte}
          style={{ width: '100%', height: altura }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={`${nome}: à esquerda a posição inicial, à direita a posição final`}
        />
      ) : <View style={{ height: altura }} />}
      {marcas && (
        <View style={{ flexDirection: 'row', borderTopWidth: 2, borderColor: C.surfaceHigh }}>
          <Text style={{ flex: 1, textAlign: 'center', paddingVertical: 5, fontFamily: F.bold, fontSize: 12, color: C.textSub }}>1 · início</Text>
          <Text style={{ flex: 1, textAlign: 'center', paddingVertical: 5, fontFamily: F.bold, fontSize: 12, color: C.textSub }}>2 · fim</Text>
        </View>
      )}
    </View>
  );
}

export const temImagem = (id: string) => id in IMAGENS;
