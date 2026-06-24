import classNames from 'classnames'

const animalSurface = 'border-2 border-[rgba(159,146,125,0.68)] bg-[rgb(247,243,223)] shadow-[0_3px_0_var(--animal-shadow-input),0_10px_20px_rgba(61,52,40,0.07)]'
const animalSurfaceLight = 'border-2 border-[rgba(196,184,158,0.6)] bg-[#fffdf5] shadow-[0_2px_0_var(--animal-shadow-input)]'
const animalControl = 'rounded-[var(--animal-radius-pill)] border-2 font-[800] transition hover:-translate-y-px active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-55'

export const workspacePrimitives = {
  scrollColumn: 'min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-color:var(--animal-border)_transparent] [scrollbar-width:thin]',
  columnGrid: 'grid content-start gap-[0.72rem] p-[0.78rem] max-[760px]:gap-[0.62rem] max-[760px]:p-[0.66rem]',
  columnFlex: 'flex min-h-0 flex-1 flex-col',
  iconPillCompact: classNames(
    'inline-grid h-[36px] w-[36px] flex-none place-items-center rounded-[14px]',
    'border-2 border-[rgba(159,146,125,0.58)] bg-[#fff3c4]',
    'shadow-[0_3px_0_#dba90e,0_8px_16px_rgba(61,52,40,0.08)]',
  ),
  headingRow: 'flex min-w-0 items-center gap-3',
  headingCopy: 'min-w-0',
  headingTitle: 'm-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.95rem] font-[850] leading-tight text-animal-text',
  headingSubtitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[700] text-[var(--animal-text-muted)]',
  sectionHeading: 'flex min-w-0 items-center justify-between gap-2 text-animal-text',
  sectionHeadingTitle: 'text-[0.88rem] font-[850]',
  sectionHeadingMeta: 'text-[0.7rem] font-[750] text-[var(--animal-text-muted)]',
  panelCard: classNames(
    'grid min-w-0 gap-[0.62rem] rounded-[20px] p-[0.72rem]',
    animalSurfaceLight,
  ),
  offeringCard: (selected = false) => classNames(
    'grid min-w-0 gap-[0.58rem] rounded-[18px] border-2 p-[0.68rem]',
    selected
      ? 'border-animal-primary bg-animal-primary-bg shadow-[0_3px_0_var(--animal-primary-active),0_10px_20px_rgba(61,52,40,0.07)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fff8dd] shadow-[0_3px_0_var(--animal-shadow-input),0_10px_20px_rgba(61,52,40,0.06)]',
  ),
  subtlePanel: 'grid min-w-0 gap-[0.5rem] rounded-[18px] border-2 border-[rgba(25,200,185,0.34)] bg-[#f2fffb] p-[0.62rem] shadow-[0_2px_0_rgba(17,168,155,0.2)]',
  emptyState: classNames(
    'grid min-w-0 grid-cols-[38px_minmax(0,1fr)] items-center gap-3 rounded-[20px]',
    'border-2 border-dashed border-[rgba(196,184,158,0.7)] bg-[#fffdf5] p-3 text-[0.84rem]',
    'font-[750] text-[var(--animal-text-muted)]',
  ),
  chipRow: 'flex min-w-0 flex-wrap gap-[0.34rem]',
  chip: classNames(
    'inline-flex min-h-[24px] max-w-full items-center rounded-[var(--animal-radius-pill)]',
    'bg-animal-primary-bg px-[0.52rem] py-[0.14rem] text-[0.68rem] font-[800]',
    'text-[var(--animal-primary-active)]',
  ),
  chipAlt: 'bg-[#fff3c4] text-animal-text',
  factStrip: 'grid grid-cols-[repeat(auto-fit,minmax(94px,1fr))] gap-[0.5rem]',
  factPill: 'grid min-w-0 gap-0.5 rounded-[17px] border border-[rgba(25,200,185,0.18)] bg-animal-primary-bg p-2',
  factLabel: 'text-[0.66rem] font-[750] text-[var(--animal-text-muted)]',
  factValue: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] font-[850] text-animal-text',
  factList: 'grid gap-[0.46rem]',
  factRow: 'grid grid-cols-[76px_minmax(0,1fr)] gap-2 rounded-[16px] bg-[#fffaf0] p-2.5',
  factTerm: 'text-[0.68rem] font-[800] text-[var(--animal-text-muted)]',
  factDef: 'm-0 min-w-0 [overflow-wrap:anywhere] text-[0.76rem] font-[700] text-animal-text-body',
  note: 'm-0 text-[0.72rem] font-[700] leading-[1.48] text-[var(--animal-text-muted)]',
  directory: classNames('grid min-w-0 gap-[0.52rem] rounded-[20px] p-[0.68rem]', animalSurface),
  list: 'grid gap-[0.46rem]',
  listItem: (active = false, locked = false) => classNames(
    'grid min-w-0 grid-cols-[34px_minmax(0,1fr)] items-center gap-2.5 rounded-[17px] border-2 p-2.5 text-left transition',
    active
      ? 'border-animal-primary bg-animal-primary-bg shadow-[0_3px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5] shadow-[0_2px_0_var(--animal-shadow-input)]',
    locked && 'opacity-80',
  ),
  listIndex: 'grid h-[34px] w-[34px] place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.78rem] font-[850] text-animal-text shadow-[0_2px_0_var(--animal-focus-yellow-d)]',
  listTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem] font-[850] text-animal-text',
  listMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-[700] text-[var(--animal-text-muted)]',
  smallButton: (active = false) => classNames(
    animalControl,
    'min-h-[30px] px-2.5 py-[0.18rem] text-[0.7rem] leading-none',
    active
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.68)] bg-[#fffdf5] text-animal-text shadow-[0_3px_0_var(--animal-shadow-input)]',
  ),
  selectActionButton: classNames(
    'inline-flex min-h-[34px] min-w-[92px] items-center justify-center rounded-[var(--animal-radius-pill)]',
    'border-2 border-[rgba(25,200,185,0.72)] bg-animal-primary-bg px-3 py-[0.24rem]',
    'text-center text-[0.74rem] font-[850] leading-none text-[var(--animal-primary-active)]',
    'shadow-[0_2px_0_var(--animal-primary-active)] transition hover:-translate-y-px hover:bg-[#f2fffb] active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-55',
  ),
  routeModeGroup: 'flex min-w-0 flex-wrap gap-[0.36rem]',
  routeModeButton: (active = false) => classNames(
    'inline-flex min-h-[34px] min-w-[82px] items-center justify-center gap-[0.24rem] rounded-[var(--animal-radius-pill)]',
    'border-2 px-3 py-[0.24rem] text-center transition hover:-translate-y-px active:translate-y-[2px] disabled:cursor-default',
    active
      ? 'border-[rgba(25,200,185,0.72)] bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.7)] bg-[#fffdf5] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)] hover:border-[var(--animal-border-hover)]',
  ),
  routeModeStrong: 'text-[0.74rem] font-[850] leading-none',
  routeModeText: 'text-[0.66rem] font-[780] leading-none opacity-75',
  primaryActionPill: 'inline-flex justify-self-start rounded-[var(--animal-radius-pill)] bg-animal-primary px-2.5 py-1 text-[0.7rem] font-[850] text-white shadow-[0_3px_0_var(--animal-primary-active)]',
}

export function chipClassName(index = 0) {
  return classNames(workspacePrimitives.chip, index % 2 === 1 && workspacePrimitives.chipAlt)
}
