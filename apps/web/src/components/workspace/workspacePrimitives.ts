import classNames from 'classnames'

const animalSurface = 'border-2 border-[rgba(159,146,125,0.62)] bg-[#fffaf0] shadow-[0_3px_0_var(--animal-shadow-input),0_12px_24px_rgba(61,52,40,0.08)]'
const animalSurfaceLight = 'border-2 border-[rgba(196,184,158,0.62)] bg-[#fffdf5] shadow-[0_3px_0_var(--animal-shadow-input),0_8px_18px_rgba(61,52,40,0.05)]'
const animalControl = 'rounded-[var(--animal-radius-pill)] border-2 font-bold transition duration-200 hover:-translate-y-px active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-55'

export const workspacePrimitives = {
  scrollColumn: 'min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-color:var(--animal-border)_transparent] [scrollbar-width:thin]',
  columnGrid: 'grid content-start gap-3 p-3 max-[760px]:gap-3 max-[760px]:p-3',
  columnFlex: 'flex min-h-0 flex-1 flex-col',
  iconPillCompact: classNames(
    'inline-grid h-10 w-10 flex-none place-items-center rounded-[16px]',
    'border-2 border-[rgba(159,146,125,0.58)] bg-[#fff3c4]',
    'shadow-[0_3px_0_#dba90e,0_8px_16px_rgba(61,52,40,0.08)]',
  ),
  headingRow: 'flex min-w-0 items-center gap-3',
  headingCopy: 'min-w-0',
  headingTitle: 'm-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold leading-5 tracking-[0.01em] text-animal-text',
  headingSubtitle: 'mt-0.5 block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  sectionHeading: 'flex min-w-0 items-center justify-between gap-2 text-animal-text',
  sectionHeadingTitle: 'text-sm font-bold leading-5 tracking-[0.01em]',
  sectionHeadingMeta: 'text-xs font-semibold leading-4 text-[var(--animal-text-muted)]',
  panelCard: classNames(
    'grid min-w-0 gap-3 rounded-[20px] p-3',
    animalSurfaceLight,
  ),
  offeringCard: (selected = false) => classNames(
    'grid min-w-0 gap-3 rounded-[18px] border-2 p-3 transition duration-200',
    selected
      ? 'border-animal-primary bg-animal-primary-bg shadow-[0_3px_0_var(--animal-primary-active),0_10px_20px_rgba(61,52,40,0.07)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fff8dd] shadow-[0_3px_0_var(--animal-shadow-input),0_10px_20px_rgba(61,52,40,0.06)] hover:-translate-y-px hover:border-[var(--animal-border-hover)] hover:shadow-[0_4px_0_var(--animal-shadow-input),0_12px_22px_rgba(61,52,40,0.08)]',
  ),
  subtlePanel: 'grid min-w-0 gap-2 rounded-[18px] border-2 border-[rgba(25,200,185,0.34)] bg-[#f2fffb] p-3 shadow-[0_2px_0_rgba(17,168,155,0.2)]',
  emptyState: classNames(
    'grid min-w-0 grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-[20px]',
    'border-2 border-dashed border-[rgba(196,184,158,0.72)] bg-[#fffdf5] p-4 text-sm',
    'font-medium leading-5 text-[var(--animal-text-muted)]',
  ),
  chipRow: 'flex min-w-0 flex-wrap gap-1.5',
  chip: classNames(
    'inline-flex min-h-[26px] max-w-full items-center rounded-[var(--animal-radius-pill)]',
    'bg-animal-primary-bg px-2.5 py-1 text-xs font-semibold leading-none',
    'text-[var(--animal-primary-active)]',
  ),
  chipAlt: 'bg-[#fff3c4] text-animal-text',
  factStrip: 'grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2',
  factPill: 'grid min-w-0 gap-1 rounded-[16px] border border-[rgba(25,200,185,0.2)] bg-animal-primary-bg p-2.5',
  factLabel: 'text-xs font-semibold leading-4 text-[var(--animal-text-muted)]',
  factValue: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] font-bold leading-5 text-animal-text',
  factList: 'grid gap-2',
  factRow: 'grid grid-cols-[76px_minmax(0,1fr)] items-start gap-3 rounded-[16px] bg-[#fffaf0] p-3',
  factTerm: 'text-xs font-semibold leading-5 text-[var(--animal-text-muted)]',
  factDef: 'm-0 min-w-0 [overflow-wrap:anywhere] text-[0.8125rem] font-medium leading-5 text-animal-text-body',
  note: 'm-0 text-[0.8125rem] font-medium leading-[1.55] text-[var(--animal-text-muted)]',
  directory: classNames('grid min-w-0 gap-3 rounded-[20px] p-3', animalSurface),
  list: 'grid gap-2',
  listItem: (active = false, locked = false) => classNames(
    'grid min-w-0 grid-cols-[36px_minmax(0,1fr)] items-center gap-3 rounded-[17px] border-2 p-2.5 text-left transition duration-200',
    active
      ? 'border-animal-primary bg-animal-primary-bg shadow-[0_3px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5] shadow-[0_2px_0_var(--animal-shadow-input)] hover:-translate-y-px hover:border-[var(--animal-border-hover)] hover:shadow-[0_3px_0_var(--animal-shadow-input)]',
    locked && 'opacity-80',
  ),
  listIndex: 'grid h-9 w-9 place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.8125rem] font-black leading-none text-animal-text shadow-[0_2px_0_var(--animal-focus-yellow-d)]',
  listTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold leading-5 text-animal-text',
  listMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  smallButton: (active = false) => classNames(
    animalControl,
    'min-h-8 min-w-8 px-2.5 py-1 text-xs leading-none',
    active
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.68)] bg-[#fffdf5] text-animal-text shadow-[0_3px_0_var(--animal-shadow-input)]',
  ),
  selectActionButton: classNames(
    'inline-flex min-h-9 min-w-[96px] items-center justify-center rounded-[var(--animal-radius-pill)]',
    'border-2 border-[rgba(25,200,185,0.72)] bg-animal-primary-bg px-3 py-1.5',
    'text-center text-xs font-bold leading-none text-[var(--animal-primary-active)]',
    'shadow-[0_3px_0_var(--animal-primary-active)] transition duration-200 hover:-translate-y-px hover:bg-[#f2fffb] hover:shadow-[0_4px_0_var(--animal-primary-active)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--animal-primary-active)] disabled:cursor-not-allowed disabled:opacity-55',
  ),
  routeModeGroup: 'flex min-w-0 flex-wrap gap-1.5',
  routeModeButton: (active = false) => classNames(
    'inline-flex min-h-9 min-w-[88px] items-center justify-center gap-1.5 rounded-[var(--animal-radius-pill)]',
    'border-2 px-3 py-1.5 text-center transition duration-200 hover:-translate-y-px active:translate-y-[2px] disabled:cursor-default',
    active
      ? 'border-[rgba(25,200,185,0.72)] bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.7)] bg-[#fffdf5] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)] hover:border-[var(--animal-border-hover)]',
  ),
  routeModeStrong: 'text-[0.8125rem] font-bold leading-none',
  routeModeText: 'text-xs font-medium leading-none opacity-80',
  primaryActionPill: 'inline-flex justify-self-start rounded-[var(--animal-radius-pill)] bg-animal-primary px-3 py-1.5 text-xs font-bold text-white shadow-[0_3px_0_var(--animal-primary-active)]',
}

export function chipClassName(index = 0) {
  return classNames(workspacePrimitives.chip, index % 2 === 1 && workspacePrimitives.chipAlt)
}
