import { StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import MessagesSquare from 'lucide-react-native/icons/messages-square';
import PencilLine from 'lucide-react-native/icons/pencil-line';
import Puzzle from 'lucide-react-native/icons/puzzle';
import Video from 'lucide-react-native/icons/video';
import Svg, { Circle, Path } from 'react-native-svg';

const icons = { back: ChevronLeft, bulb: Lightbulb, chat: MessagesSquare, pencil: PencilLine, matching: Puzzle, video: Video, completion: Check };
export function LearningIcon({ kind, rose = false, plain = false, size = 25, color }: {
  kind: keyof typeof icons; rose?: boolean; plain?: boolean; size?: number; color?: string;
}) {
  const Icon = icons[kind];
  const ink = color ?? (plain ? '#0062E9' : '#FFF');
  return <View accessible={false} pointerEvents="none" style={!plain && [s.halo, { backgroundColor: kind === 'completion' ? '#DDF5E9' : rose ? '#FFE4E9' : '#E0EEFF' }]}>
    <View style={!plain && [s.circle, { backgroundColor: kind === 'completion' ? '#11AB65' : rose ? '#F52A46' : '#1680FF' }]}>
      {kind === 'chat' ? <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2C5.8 2 2 5.8 2 10.7c0 2.7 1.2 4.8 3.3 6.4L4 22l5-2.7c1 .3 2 .4 3 .4 6.1 0 10-3.7 10-9S18.1 2 12 2Z" fill={ink} /><Circle cx="8" cy="10.5" r="1.3" fill={plain ? '#FFF' : rose ? '#F52A46' : '#1680FF'} /><Circle cx="15.5" cy="10.5" r="1.3" fill={plain ? '#FFF' : rose ? '#F52A46' : '#1680FF'} /></Svg>
        : kind === 'bulb' && !plain ? <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2a7 7 0 0 0-4.7 12.2C9 15.7 9 17 9 18h6c0-1 .1-2.3 1.7-3.8A7 7 0 0 0 12 2Z M9 20h6l-1.2 2h-3.6Z" fill={ink} /><Path d="M8 9a4 4 0 0 1 4-4" fill="none" stroke="#1680FF" strokeWidth="1.5" strokeLinecap="round" /></Svg>
          : <Icon size={size} strokeWidth={kind === 'completion' ? 3.8 : 2.3} color={ink} />}
    </View>
  </View>;
}
const s = StyleSheet.create({
  halo: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
