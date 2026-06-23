import classNames from 'classnames'
import { workspacePrimitives } from './workspacePrimitives'

export const puzzleClasses = {
  root: classNames(workspacePrimitives.scrollColumn, 'grid content-start gap-[0.66rem] p-[0.82rem]'),
  emptyCard: 'grid gap-2 rounded-[18px] border-2 border-dashed border-[rgba(196,184,158,0.78)] bg-[#fffdf5] p-4 text-center',
  emptyTitle: 'm-0 text-[1rem] font-[950] text-animal-text',
  emptyText: 'm-0 text-[0.82rem] font-[820] text-[var(--animal-text-muted)]',
  freeSlot: 'grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border-2 border-dashed border-[rgba(25,200,185,0.48)] bg-[#f2fffb] p-3 max-[640px]:grid-cols-[24px_minmax(0,1fr)]',
  freeLine: 'h-full min-h-[42px] w-1 rounded-[var(--animal-radius-pill)] bg-animal-primary',
  freeTitle: 'block text-[0.9rem] font-[950] text-animal-text',
  freeText: 'm-0 text-[0.74rem] font-[820] text-[var(--animal-text-muted)]',
  routeConnector: 'grid gap-[0.32rem] rounded-[18px] border-2 border-[rgba(25,200,185,0.36)] bg-[#eefbf8] p-[0.66rem]',
  routeMain: 'flex min-w-0 items-center gap-2',
  routeBadge: 'rounded-[var(--animal-radius-pill)] bg-animal-primary px-2 py-1 text-[0.7rem] font-[950] text-white',
  routeTitle: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.86rem] font-[950] text-animal-text',
  routeDetail: 'text-[0.72rem] font-[830] text-[var(--animal-text-muted)]',
  routeModes: 'flex flex-wrap gap-[0.28rem]',
  routeModeButton: (active = false) => classNames(
    'rounded-[var(--animal-radius-pill)] border-2 px-2.5 py-1 text-[0.72rem] font-[920] transition disabled:cursor-default',
    active
      ? 'border-animal-primary bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.68)] bg-[#fffdf5] text-animal-text shadow-[0_2px_0_var(--animal-shadow-input)]',
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
    'grid min-w-0 grid-cols-[86px_minmax(0,1fr)] gap-3 rounded-[20px] border-2 bg-[#fffdf5]',
    'p-[0.82rem] text-left shadow-[0_4px_0_var(--animal-shadow-input),0_10px_24px_rgba(61,52,40,0.08)] transition',
    'max-[520px]:grid-cols-[64px_minmax(0,1fr)]',
    selected && 'border-animal-primary bg-animal-primary-bg shadow-[0_4px_0_var(--animal-primary-active)]',
    dragOver && 'border-[rgba(25,200,185,0.72)] shadow-[0_0_0_4px_rgba(230,249,246,0.72),0_4px_0_var(--animal-primary-active)]',
    dragging && 'opacity-60',
    draggable && 'cursor-grab active:cursor-grabbing',
    locked && 'bg-[#fffaf0]',
  ),
  rail: 'grid content-start justify-items-center gap-2 text-center',
  railIndex: 'grid h-[44px] w-[44px] place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.92rem] font-[950] text-animal-text shadow-[0_3px_0_var(--animal-focus-yellow-d)]',
  railTime: 'text-[0.78rem] font-[950] leading-[1.25] text-animal-text-body',
  body: 'grid min-w-0 gap-[0.45rem]',
  heading: 'grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2',
  phase: 'text-[0.74rem] font-[950] text-[var(--animal-primary-active)]',
  title: 'm-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[1rem] font-[950] text-animal-text',
  lock: 'rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2 py-1 text-[0.7rem] font-[950] text-animal-text',
  place: 'inline-flex min-w-0 items-center gap-1 justify-self-start rounded-[var(--animal-radius-pill)] border-0 bg-transparent p-0 text-[0.82rem] font-[900] text-animal-text-body underline-offset-2 hover:underline',
  reason: 'm-0 text-[0.78rem] font-[820] leading-[1.45] text-animal-text-body',
  chips: 'flex min-w-0 flex-wrap gap-[0.28rem]',
  chip: 'rounded-[var(--animal-radius-pill)] bg-animal-primary-bg px-2 py-1 text-[0.72rem] font-[900] text-[var(--animal-primary-active)]',
  rewriteRow: 'grid grid-cols-[minmax(0,1fr)_auto] gap-2 max-[640px]:grid-cols-1',
  actions: 'flex flex-wrap gap-[0.34rem] [&_[class*="animal-btn"]]:min-w-[72px]',
}
