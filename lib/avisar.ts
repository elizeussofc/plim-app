/**
 * Avisos e confirmações que funcionam em todo lugar.
 * Na web o Alert do React Native não faz nada, então os botões pareciam mortos.
 * avisar() mostra uma faixa na própria tela; confirmar() pergunta antes de apagar.
 */
import { Alert, Platform } from 'react-native';

export interface Aviso {
  id: number;
  titulo: string;
  texto?: string;
}

type Ouvinte = (aviso: Aviso) => void;
let ouvinte: Ouvinte | null = null;
let contador = 0;

/** Usado pelo componente <Avisos/> (um só, no layout raiz). */
export function ouvirAvisos(fn: Ouvinte | null) {
  ouvinte = fn;
}

/** Mostra um aviso curto. Emojis no título viram ícones de massinha. */
export function avisar(titulo: string, texto?: string) {
  if (ouvinte) ouvinte({ id: ++contador, titulo, texto });
  else Alert.alert(titulo, texto);
}

/** Pede confirmação antes de uma ação que não dá para desfazer. */
export function confirmar(titulo: string, texto: string, rotuloSim: string, aoConfirmar: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${titulo}\n\n${texto}`)) aoConfirmar();
    return;
  }
  Alert.alert(titulo, texto, [
    { text: 'Cancelar', style: 'cancel' },
    { text: rotuloSim, style: 'destructive', onPress: aoConfirmar },
  ]);
}
