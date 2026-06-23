import classNames from 'classnames'

export const workspacePrimitives = {
  scrollColumn: 'min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-color:var(--animal-border)_transparent] [scrollbar-width:thin]',
  columnGrid: 'grid content-start gap-[0.72rem] p-[0.82rem]',
  columnFlex: 'flex min-h-0 flex-1 flex-col',
  iconPillCompact: classNames(
    'inline-grid h-[38px] w-[38px] flex-none place-items-center rounded-[15px]',
    'border-2 border-[rgba(196,184,158,0.76)] bg-[#fff3c4] shadow-[0_3px_0_#dba90e]',
  ),
  headingRow: 'flex min-w-0 items-center gap-3',
  headingCopy: 'min-w-0',
  headingTitle: 'm-0 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.96rem] font-[950] leading-tight text-animal-text',
  headingSubtitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[820] text-[var(--animal-text-muted)]',
  sectionHeading: 'flex min-w-0 items-center justify-between gap-2 text-animal-text',
  sectionHeadingTitle: 'text-[0.88rem] font-[950]',
  sectionHeadingMeta: 'text-[0.72rem] font-[850] text-[var(--animal-text-muted)]',
  panelCard: classNames(
    'grid min-w-0 gap-[0.62rem] rounded-[18px] border-2 border-[rgba(196,184,158,0.72)]',
    'bg-[#fffdf5] p-[0.72rem] shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  subtlePanel: 'grid min-w-0 gap-[0.5rem] rounded-[18px] border-2 border-[rgba(25,200,185,0.24)] bg-[#f2fffb] p-[0.62rem]',
  emptyState: classNames(
    'grid min-w-0 grid-cols-[34px_minmax(0,1fr)] items-center gap-2 rounded-[18px]',
    'border-2 border-[rgba(196,184,158,0.5)] bg-[#fffdf5] p-3 text-[0.82rem]',
    'font-[850] text-[var(--animal-text-muted)]',
  ),
  chipRow: 'flex min-w-0 flex-wrap gap-[0.26rem]',
  chip: classNames(
    'inline-flex min-h-[22px] max-w-full items-center rounded-[var(--animal-radius-pill)]',
    'bg-animal-primary-bg px-[0.44rem] py-[0.12rem] text-[0.68rem] font-[900]',
    'text-[var(--animal-primary-active)]',
  ),
  chipAlt: 'bg-[#fff3c4] text-animal-text',
  factStrip: 'grid grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-[0.42rem]',
  factPill: 'grid min-w-0 gap-0.5 rounded-[16px] bg-animal-primary-bg p-2',
  factLabel: 'text-[0.66rem] font-[850] text-[var(--animal-text-muted)]',
  factValue: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] font-[950] text-animal-text',
  factList: 'grid gap-[0.38rem]',
  factRow: 'grid grid-cols-[72px_minmax(0,1fr)] gap-2 rounded-[14px] bg-[#fffaf0] p-2',
  factTerm: 'text-[0.7rem] font-[900] text-[var(--animal-text-muted)]',
  factDef: 'm-0 min-w-0 [overflow-wrap:anywhere] text-[0.78rem] font-[850] text-animal-text-body',
  note: 'm-0 text-[0.72rem] font-[820] leading-[1.45] text-[var(--animal-text-muted)]',
  directory: 'grid min-w-0 gap-[0.48rem] rounded-[18px] border-2 border-[rgba(196,184,158,0.56)] bg-[#fffdf5] p-[0.62rem]',
  list: 'grid gap-[0.38rem]',
  listItem: (active = false, locked = false) => classNames(
    'grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-2 rounded-[16px] border-2 p-2 text-left transition',
    active
      ? 'border-animal-primary bg-animal-primary-bg shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.58)] bg-[#fffdf5] shadow-[0_2px_0_var(--animal-shadow-input)]',
    locked && 'opacity-80',
  ),
  listIndex: 'grid h-8 w-8 place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.76rem] font-[950] text-animal-text shadow-[0_2px_0_var(--animal-focus-yellow-d)]',
  listTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem] font-[950] text-animal-text',
  listMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.7rem] font-[820] text-[var(--animal-text-muted)]',
  smallButton: (active = false) => classNames(
    'min-h-[30px] rounded-[var(--animal-radius-pill)] border-2 px-2.5 py-1 text-[0.72rem] font-[920] transition',
    active
      ? 'border-animal-primary bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.68)] bg-[#fffdf5] text-animal-text shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  routeModeButton: (active = false) => classNames(
    'grid min-w-0 gap-0.5 rounded-[var(--animal-radius-pill)] border-2 px-3 py-1.5 text-center transition disabled:cursor-default',
    active
      ? 'border-animal-primary bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.68)] bg-[#fffdf5] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  routeModeStrong: 'text-[0.76rem] font-[950] leading-tight',
  routeModeText: 'text-[0.68rem] font-[820] leading-tight',
  primaryActionPill: 'inline-flex justify-self-start rounded-[var(--animal-radius-pill)] bg-animal-primary px-2.5 py-1 text-[0.7rem] font-[950] text-white shadow-[0_2px_0_var(--animal-primary-active)]',
}

export function chipClassName(index = 0) {
  return classNames(workspacePrimitives.chip, index % 2 === 1 && workspacePrimitives.chipAlt)
}
