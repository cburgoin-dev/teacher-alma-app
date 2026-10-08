import type { CalendarResponse, WeekState } from './types';

export const weekdays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const stateLabels: Record<WeekState, string> = {
  LEARNED: 'Aprendiste', PROTECTED: 'Protegido', REPAIRED: 'Reparado', BROKEN: 'Racha rota', NONE: 'Sin actividad',
};
const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const monthTitle = (month: string) => `${months[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;
// UTC is used only for calendar arithmetic on date-only keys, never device-time conversion.
export const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export function shiftMonth(month: string, offset: number) {
  const date = new Date(month + '-01T00:00:00Z'); date.setUTCMonth(date.getUTCMonth() + offset);
  return dateKey(date).slice(0, 7);
}
export const learningDaysLabel = (count: number) => `${count} ${count === 1 ? 'día' : 'días'} de aprendizaje`;
export function dayLabel(date: string, state: WeekState, today: string) {
  return `${date}${date === today ? ', Hoy' : ''}: ${date > today ? 'Día futuro' : stateLabels[state]}`;
}
export function calendarGrid(data: CalendarResponse) {
  const first = new Date(data.month + '-01T00:00:00Z');
  const offset = (first.getUTCDay() + 6) % 7;
  const end = new Date(first); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  const length = Math.ceil((offset + end.getUTCDate()) / 7) * 7;
  const events = new Map(data.days.map(day => [day.date, day.state]));
  return Array.from({ length }, (_, index) => {
    const d = new Date(first); d.setUTCDate(index - offset + 1); const date = dateKey(d);
    const inMonth = date.startsWith(data.month), future = date > data.today;
    const state: WeekState = inMonth && !future ? events.get(date) ?? 'NONE' : 'NONE';
    return { date, number: d.getUTCDate(), inMonth, future, today: date === data.today, state,
      joinLeft: state === 'LEARNED' && index % 7 > 0 && events.get(dateKey(new Date(d.getTime() - 86400000))) === 'LEARNED' && d.getUTCDate() > 1,
      joinRight: state === 'LEARNED' && index % 7 < 6 && date < data.today && d.getUTCDate() < end.getUTCDate() && events.get(dateKey(new Date(d.getTime() + 86400000))) === 'LEARNED' };
  });
}
