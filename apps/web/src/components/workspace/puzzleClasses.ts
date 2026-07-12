import classNames from 'classnames'
import { workspacePrimitives } from './workspacePrimitives'

export const puzzleClasses = {
  root: classNames(workspacePrimitives.scrollColumn, 'grid content-start gap-3 p-3'),
  emptyCard: 'grid gap-2 rounded-[20px] border-2 border-dashed border-[rgba(196,184,158,0.78)] bg-[#fffdf5] p-4 text-center shadow-[0_3px_0_var(--animal-shadow-input)]',
  emptyTitle: 'm-0 text-base font-bold leading-5 text-animal-text',
  emptyText: 'm-0 text-[0.8125rem] font-medium leading-5 text-[var(--animal-text-muted)]',
  freeSlot: 'grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] border-2 border-dashed border-[rgba(25,200,185,0.48)] bg-[#f2fffb] p-3 shadow-[0_3px_0_rgba(17,168,155,0.18)] max-[640px]:grid-cols-[24px_minmax(0,1fr)]',
  freeLine: 'h-full min-h-[42px] w-1 rounded-[var(--animal-radius-pill)] bg-animal-primary',
  freeTitle: 'block text-sm font-bold leading-5 text-animal-text',
  freeText: 'm-0 text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  routeConnector: 'grid min-w-0 grid-cols-[72px_minmax(0,1fr)] items-stretch gap-[0.72rem] px-[0.1rem] py-[0.18rem] max-[520px]:grid-cols-[64px_minmax(0,1fr)]',
  routeRail: classNames(
    'relative grid min-h-[72px] place-items-center',
    'before:absolute before:inset-y-[-0.72rem] before:left-1/2 before:w-[3px] before:-translate-x-1/2',
    'before:rounded-[var(--animal-radius-pill)] before:bg-[rgba(196,184,158,0.42)]',
  ),
  routeDot: 'relative z-10 h-[18px] w-[18px] rounded-full border-[3px] border-[rgba(25,200,185,0.48)] bg-[#fffdf5] shadow-[0_2px_0_var(--animal-shadow-input)]',
  routeBody: classNames(
    'grid min-w-0 gap-2 rounded-[18px] border-2 border-[rgba(196,184,158,0.62)]',
    'bg-[#fffdf5] p-3 shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  routeMain: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5',
  routeBadge: 'inline-flex min-h-[24px] items-center rounded-[var(--animal-radius-pill)] bg-animal-primary-bg px-2.5 py-1 text-xs font-bold leading-none text-[var(--animal-primary-active)]',
  routeTitle: 'min-w-[10rem] flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold leading-5 text-animal-text',
  routeDetail: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  routeModes: 'flex min-w-0 flex-wrap gap-1.5',
  routeModeButton: (active = false) => classNames(
    'inline-flex min-h-9 min-w-[88px] items-center justify-center rounded-[var(--animal-radius-pill)]',
    'border-2 px-3 py-1.5 text-center text-xs font-bold leading-none transition duration-200 hover:-translate-y-px active:translate-y-[2px] disabled:cursor-default',
    active
      ? 'border-[rgba(25,200,185,0.72)] bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.7)] bg-[#fffdf5] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)] hover:border-[var(--animal-border-hover)]',
  ),
  ticket: ({
    selected,
    draggable,
    dragging,
    dragOver,
    locked,
  }: {
    selected: boolean
    draggable: boolean
    dragging: boolean
    dragOver: boolean
    locked: boolean
  }) => classNames(
    'relative grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-[22px] border-2 border-[rgba(196,184,158,0.62)] bg-[#fffdf5]',
    'overflow-visible p-3 text-left shadow-[0_3px_0_var(--animal-shadow-input)] transition duration-200 select-none',
    'max-[520px]:grid-cols-[64px_minmax(0,1fr)]',
    locked && !selected && 'bg-[#f0ece2]',
    selected && 'border-animal-primary bg-[#f2fffb] shadow-[0_3px_0_var(--animal-primary-active),0_0_0_4px_rgba(230,249,246,0.7)]',
    dragOver && [
      'border-t-[4px] border-t-[var(--animal-focus-yellow)] bg-[#fffce8]',
    ],
    dragging && 'scale-[0.985] opacity-55',
    draggable && 'cursor-grab hover:-translate-y-px hover:border-[var(--animal-border-hover)] hover:shadow-[0_4px_0_var(--animal-shadow-input),0_10px_20px_rgba(61,52,40,0.08)] active:cursor-grabbing',
  ),
  rail: 'grid content-start justify-items-center gap-2 text-center',
  railIndex: 'grid h-[42px] w-[42px] place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.8125rem] font-black text-animal-text shadow-[0_3px_0_#dba90e]',
  railTime: 'text-[0.8125rem] font-bold leading-4 text-animal-text',
  body: 'grid min-w-0 gap-2',
  heading: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2',
  phase: 'text-xs font-bold leading-4 text-[var(--animal-primary-active)]',
  title: 'm-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold leading-5 text-animal-text',
  lock: 'rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2 py-1 text-xs font-semibold leading-none text-animal-text-body',
  place: 'inline-flex max-w-full min-w-0 items-center gap-1.5 justify-self-start overflow-hidden border-0 border-b-2 border-[rgba(154,131,90,0.35)] bg-transparent p-0 text-left text-[0.8125rem] font-semibold leading-5 text-[#9a835a] text-ellipsis whitespace-nowrap transition hover:border-[rgba(17,168,155,0.45)] hover:text-[var(--animal-primary-active)]',
  reason: 'm-0 text-[0.8125rem] font-medium leading-[1.55] text-animal-text-body',
  chips: 'flex min-w-0 flex-wrap gap-1.5',
  chip: 'rounded-[var(--animal-radius-pill)] bg-animal-primary-bg px-2.5 py-1 text-xs font-semibold leading-none text-[var(--animal-primary-active)]',
  rewriteRow: 'grid grid-cols-[minmax(0,1fr)_auto] gap-2 max-[640px]:grid-cols-1',
  actions: 'flex flex-wrap gap-[0.34rem] [&_[class*="animal-btn"]]:min-w-[72px]',
  endDropZone: classNames(
    'grid min-h-[44px] place-items-center rounded-[20px] border-2 border-dashed border-[rgba(25,200,185,0.5)]',
    'bg-[#f2fffb] text-xs font-bold text-[var(--animal-primary-active)]',
  ),
}
