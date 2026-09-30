import type { ChatTarget } from './conversationScroll';
import type { LayoutChangeEvent } from 'react-native';
import { ChatBubble, TypingBubble } from './ChatMotion';
import { useConversationReveal } from './useConversationReveal';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Button } from '../courses/components/ui';
import { AudioButton } from '../lessons/components/AudioButton';
import { cellsFor, crosswordLayout, entryNumber, readEntry, editEntryDraft } from './crossword';
import type { Answer, Conversation, Crossword } from './types';
import { challengeStyles as s } from './styles';
export function ConversationView({ content, disabled, busy = false, submit, onRootLayout, onTarget, onFollow }: { onRootLayout?: (event: LayoutChangeEvent) => void; onTarget?: (target: ChatTarget) => void; onFollow?: () => void; content: Conversation; disabled: boolean; busy?: boolean; submit: (answer: Answer) => void }) {
  const closing = useRef(false);
  const [cursor, setCursor] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const steps = content.steps.filter(step => step.kind === 'CHOICE');
  const active = steps[cursor];
  const boundary = active ? content.steps.findIndex(step => step.id === active.id) : content.steps.length;
  const reveal = useConversationReveal(content, boundary);
  const blocked = disabled || reveal.pending;
  const send = () => {
    if (blocked || closing.current) return;
    closing.current = true;
    submit({ choices: Object.entries(choices).map(([stepId, optionId]) => ({ stepId, optionId })) });
  };
  const advance = () => {
    if (blocked || closing.current) return;
    onFollow?.();
    if (cursor === steps.length - 1) {
      setCursor(steps.length);
    } else setCursor(cursor + 1);
  };
  const targetLayout = (order: number) => (event: LayoutChangeEvent) => onTarget?.({ ...event.nativeEvent.layout, order, reduced: reveal.reduced });
  return <View style={s.stack} onLayout={onRootLayout}>
    {content.scenario ? <Text style={s.body}>{content.scenario}</Text> : null}
    <Text style={s.body}>Elige cómo responder en cada turno.</Text>
    {content.steps.slice(0, reveal.visible).map((step, index) => step.kind === 'MESSAGE' ? <View key={step.id} style={s.chatRow} onLayout={index === reveal.visible - 1 ? targetLayout(reveal.visible * 4) : undefined}>
      <View style={s.avatar}><Text style={s.avatarText}>{content.participants.find(p => p.id === step.speakerId)?.name.slice(0, 1)}</Text></View>
      <ChatBubble enter={!reveal.reduced && reveal.latest === step.id}><Text style={s.speaker}>{content.participants.find(p => p.id === step.speakerId)?.name}</Text><Text style={s.chatText}>{step.text}</Text><AudioButton audioUrl={step.audioUrl} /></ChatBubble>
    </View> : <View key={step.id} onLayout={index === reveal.visible - 1 ? targetLayout(reveal.visible * 4) : undefined}><ChatBubble reply enter={!reveal.reduced && reveal.latest === step.id}><Text style={s.chatText}>{step.options.find(o => o.id === choices[step.id])?.text ?? 'Sin respuesta'}</Text></ChatBubble></View>)}
    {reveal.typing ? <View key={`typing-${reveal.visible}`} onLayout={targetLayout(reveal.visible * 4 + 2)}><TypingBubble name={content.participants.find(p => p.id === reveal.typing)?.name} /></View> : null}
    {!reveal.pending ? <View key={`turn-${cursor}`} style={s.card} onLayout={targetLayout(reveal.visible * 4 + 3)}>
      {active ? <>
        <Text style={s.heading}>{active.prompt || 'Elige tu respuesta'}</Text>
        <Text style={s.caption}>Turno {cursor + 1} de {steps.length}</Text>
        {active.options.map(option => {
          const selected = choices[active.id] === option.id;
          return <Pressable key={option.id} disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} onPress={() => setChoices(previous => ({ ...previous, [active.id]: option.id }))} style={[s.option, selected && s.selected]}>
            <View accessible={false} style={[s.radio, selected && s.radioSelected]}>{selected ? <View style={s.radioDot} /> : null}</View>
            <Text style={[s.optionText, selected && s.optionTextSelected]}>{option.text}</Text>
          </Pressable>;
        })}
        <Button title="Continuar" disabled={disabled} busy={busy} onPress={advance} />
      </> : <Button title="Continuar al crucigrama" disabled={disabled} busy={busy} onPress={send} />}
    </View> : null}
  </View>;
}
export function CrosswordView({ content, disabled, busy = false, submit }: { content: Crossword; disabled: boolean; busy?: boolean; submit: (answer: Answer) => void }) {
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const layout = crosswordLayout(content.entries, width);
  const cellSize = { width: layout.cellSize, height: layout.cellSize };
  const [cells, setCells] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(content.entries[0]?.id);
  const [draft, setDraft] = useState('');
  const selectEntry = (id: string) => {
    const next = content.entries.find(item => item.id === id);
    if (!next || id === selected) return;
    setSelected(id);
    setDraft('');
  };
  const entry = content.entries.find(e => e.id === selected);
  const selectedCells = entry ? cellsFor(entry) : [];
  const open = new Set(content.entries.flatMap(cellsFor));
  return <View style={s.card}>
    <Text style={s.heading}>Mini crucigrama</Text><Text style={s.body}>Elige una pista y completa la palabra.</Text>
    <View style={s.grid} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? <View>{Array.from({ length: layout.rows }, (_, rowIndex) => <View key={rowIndex} style={{ flexDirection: 'row' }}>{Array.from({ length: layout.columns }, (_, columnIndex) => {
        const row = rowIndex + layout.row, column = columnIndex + layout.column;
        const cell = `${row}:${column}`;
        const starting = content.entries.findIndex(e => e.row === row && e.column === column);
        return open.has(cell) ? <Pressable key={cell} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: selectedCells.includes(cell), disabled }} accessibilityLabel={`Fila ${row + 1}, columna ${column + 1}: ${cells[cell] || 'vacía'}`} onPress={() => { const matches = content.entries.filter(e => cellsFor(e).includes(cell)); selectEntry((matches.find(e => e.id !== selected) ?? matches[0]).id); }} style={[s.cell, cellSize, selectedCells.includes(cell) && s.selected]}>{starting >= 0 ? <Text allowFontScaling={false} style={[s.cellNumber, { fontSize: layout.cellSize * .25 }]}>{entryNumber(content.entries, content.entries[starting])}</Text> : null}<Text allowFontScaling={false} style={[s.letter, { fontSize: layout.cellSize * .5, marginTop: layout.cellSize * .1 }]}>{cells[cell]}</Text></Pressable> : <View key={cell} pointerEvents="none" accessible={false} style={cellSize} />;
      })}</View>)}</View> : null}
    </View>
    {entry ? <View style={s.compact}><Text style={[s.body, s.clueSelected]}>{entryNumber(content.entries, entry)}. {entry.clue} ({entry.length}) · {entry.direction === 'ACROSS' ? 'Horizontal' : 'Vertical'}</Text>
      <TextInput accessibilityLabel={`Respuesta: ${entry.clue}, ${entry.length} letras`} editable={!disabled} value={draft} autoCapitalize="characters" autoCorrect={false} spellCheck={false} maxLength={entry.length} placeholder="Escribe aquí" style={s.input} onChangeText={text => { setCells(previous => editEntryDraft(previous, entry, text, draft)); setDraft(text.normalize('NFC').toUpperCase()); }} />
    </View> : null}
    <View style={s.clueColumns}>{(['ACROSS', 'DOWN'] as const).map(direction => <View key={direction} style={[s.clueColumn, { minWidth: Math.min(width, 130 * fontScale) }]}><Text style={s.clueHeading}>{direction === 'ACROSS' ? 'Horizontales' : 'Verticales'}</Text>{content.entries.filter(e => e.direction === direction).map(e => <Pressable accessibilityRole="button" accessibilityState={{ selected: e.id === selected, disabled }} key={e.id} disabled={disabled} onPress={() => selectEntry(e.id)} style={[s.clue, e.id === selected && s.selected]}><Text style={[s.body, e.id === selected && s.clueSelected]}>{entryNumber(content.entries, e)}. {e.clue} ({e.length})</Text></Pressable>)}</View>)}</View>
    <Button title="Continuar" disabled={disabled} busy={busy} onPress={() => submit({ entries: content.entries.map(e => ({ entryId: e.id, text: readEntry(cells, e) })) })} />
  </View>;
}
