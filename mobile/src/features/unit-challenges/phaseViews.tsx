import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Button } from '../courses/components/ui';
import { AudioButton } from '../lessons/components/AudioButton';
import { cellsFor, entryNumber, readEntry, writeEntry } from './crossword';
import type { Answer, Conversation, Crossword } from './types';
import { challengeStyles as s } from './styles';
export function AssessmentNote() { return <Text style={s.note}>Sin pistas · Sin corrección inmediata</Text>; }
export function ConversationView({ content, disabled, submit }: { content: Conversation; disabled: boolean; submit: (answer: Answer) => void }) {
  const [cursor, setCursor] = useState(0);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const steps = content.steps.filter(step => step.kind === 'CHOICE');
  const active = steps[cursor];
  const boundary = active ? content.steps.findIndex(step => step.id === active.id) : content.steps.length;
  return <View style={s.stack}>
    {content.scenario ? <Text style={s.body}>{content.scenario}</Text> : null}
    <Text style={s.body}>Elige cómo responder en cada turno.</Text>
    {content.steps.slice(0, boundary).map(step => step.kind === 'MESSAGE' ? <View key={step.id} style={s.chatRow}>
      <View style={s.avatar}><Text style={s.avatarText}>{content.participants.find(p => p.id === step.speakerId)?.name.slice(0, 1)}</Text></View>
      <View style={s.bubble}><Text style={s.speaker}>{content.participants.find(p => p.id === step.speakerId)?.name}</Text><Text style={s.chatText}>{step.text}</Text><AudioButton audioUrl={step.audioUrl} /></View>
    </View> : <View key={step.id} style={[s.bubble, s.reply]}><Text style={s.chatText}>{step.options.find(o => o.id === choices[step.id])?.text ?? 'Sin respuesta'}</Text></View>)}
    <View style={s.card}>
      {active ? <>
        <Text style={s.heading}>{active.prompt || 'Elige tu respuesta'}</Text>
        <Text style={s.caption}>Turno {cursor + 1} de {steps.length}</Text>
        {active.options.map(option => <Pressable key={option.id} disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: choices[active.id] === option.id, disabled }} onPress={() => setChoices(previous => ({ ...previous, [active.id]: option.id }))} style={[s.option, choices[active.id] === option.id && s.selected]}><Text style={s.optionText}>{option.text}</Text></Pressable>)}
        <Button title={choices[active.id] ? 'Continuar' : 'Continuar sin responder'} disabled={disabled} onPress={() => setCursor(cursor + 1)} />
        {choices[active.id] ? <Button title="Dejar sin respuesta" tone="blue" disabled={disabled} onPress={() => setChoices(previous => { const next = { ...previous }; delete next[active.id]; return next; })} /> : null}
      </> : <><Text style={s.heading}>Conversación lista para enviar</Text><Text style={s.body}>Puedes revisar tus respuestas antes de enviar la fase.</Text><Button title="Enviar conversación" disabled={disabled} onPress={() => submit({ choices: Object.entries(choices).map(([stepId, optionId]) => ({ stepId, optionId })) })} /></>}
      {cursor > 0 ? <Button title="Revisar turno anterior" tone="blue" disabled={disabled} onPress={() => setCursor(cursor - 1)} /> : null}
      <AssessmentNote />
    </View>
  </View>;
}
export function CrosswordView({ content, disabled, submit }: { content: Crossword; disabled: boolean; submit: (answer: Answer) => void }) {
  const { fontScale } = useWindowDimensions();
  const cellSize = { width: Math.max(44, 44 * fontScale), height: Math.max(48, 48 * fontScale) };
  const [cells, setCells] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(content.entries[0]?.id);
  const entry = content.entries.find(e => e.id === selected);
  const selectedCells = entry ? cellsFor(entry) : [];
  const open = new Set(content.entries.flatMap(cellsFor));
  return <View style={s.card}>
    <Text style={s.heading}>Mini crucigrama</Text><Text style={s.body}>Selecciona una pista y escribe la palabra. Las letras compartidas se actualizan en ambas direcciones.</Text>
    <ScrollView horizontal contentContainerStyle={{ paddingVertical: 8 }}>
      <View>{Array.from({ length: content.height }, (_, row) => <View key={row} style={{ flexDirection: 'row' }}>{Array.from({ length: content.width }, (_, column) => {
        const cell = `${row}:${column}`;
        const starting = content.entries.findIndex(e => e.row === row && e.column === column);
        return open.has(cell) ? <Pressable key={cell} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Fila ${row + 1}, columna ${column + 1}: ${cells[cell] || 'vacía'}`} onPress={() => { const matches = content.entries.filter(e => cellsFor(e).includes(cell)); setSelected((matches.find(e => e.id !== selected) ?? matches[0]).id); }} style={[s.cell, cellSize, selectedCells.includes(cell) && s.selected]}>{starting >= 0 ? <Text style={s.cellNumber}>{entryNumber(content.entries, content.entries[starting])}</Text> : null}<Text style={s.letter}>{cells[cell]}</Text></Pressable> : <View key={cell} style={[s.cell, cellSize, s.blocked]} />;
      })}</View>)}</View>
    </ScrollView>
    {entry ? <View style={s.stack}><Text style={s.heading}>{entryNumber(content.entries, entry)}. {entry.clue} ({entry.length})</Text>
      <TextInput accessibilityLabel={`Respuesta: ${entry.clue}, ${entry.length} letras`} editable={!disabled} value={readEntry(cells, entry)} autoCapitalize="characters" autoCorrect={false} spellCheck={false} maxLength={entry.length} placeholder="Escribe aquí" style={s.input} onChangeText={text => setCells(previous => writeEntry(previous, entry, text))} />
    </View> : null}
    {(['ACROSS', 'DOWN'] as const).map(direction => <View key={direction} style={s.stack}><Text style={s.heading}>{direction === 'ACROSS' ? 'Horizontales' : 'Verticales'}</Text>{content.entries.filter(e => e.direction === direction).map(e => <Pressable accessibilityRole="button" accessibilityState={{ selected: e.id === selected }} key={e.id} disabled={disabled} onPress={() => setSelected(e.id)} style={[s.clue, e.id === selected && s.selected]}><Text style={s.body}>{entryNumber(content.entries, e)}. {e.clue} ({e.length})</Text></Pressable>)}</View>)}
    <AssessmentNote />
    <Button title="Enviar crucigrama" disabled={disabled} onPress={() => submit({ entries: content.entries.map(e => ({ entryId: e.id, text: readEntry(cells, e) })) })} />
  </View>;
}
