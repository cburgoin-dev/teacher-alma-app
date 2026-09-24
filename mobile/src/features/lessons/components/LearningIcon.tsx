import { StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import MessagesSquare from 'lucide-react-native/icons/messages-square';
import PencilLine from 'lucide-react-native/icons/pencil-line';
import Puzzle from 'lucide-react-native/icons/puzzle';
import Video from 'lucide-react-native/icons/video';

const icons = { back: ChevronLeft, bulb: Lightbulb, chat: MessagesSquare, pencil: PencilLine, matching: Puzzle, video: Video, completion: Check };
export function LearningIcon({ kind, rose = false, plain = false, size = 25, color }: {
  kind: keyof typeof icons; rose?: boolean; plain?: boolean; size?: number; color?: string;
}) {
  const Icon = icons[kind];
  return <View accessible={false} pointerEvents="none" style={!plain && [s.circle, { backgroundColor: rose ? '#FFE4E9' : '#DDEEFF' }]}>
    <Icon size={size} strokeWidth={2} color={color ?? (rose ? '#F52A46' : '#0062E9')} />
  </View>;
}
const s = StyleSheet.create({
  circle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
