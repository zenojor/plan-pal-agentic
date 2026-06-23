import classNames from 'classnames'

export const workspaceShellClasses = {
  root: classNames(
    'flex h-[100svh] min-h-0 flex-col overflow-hidden bg-animal-bg bg-animal-grid',
    'max-[1080px]:pb-[74px]',
  ),
  planningHeader: classNames(
    'relative z-20 flex shrink-0 items-center justify-between gap-3 min-h-16',
    'border-b-2 border-[rgba(196,184,158,0.38)] bg-[rgba(248,248,240,0.92)]',
    'px-[clamp(1rem,3.3vw,2.5rem)] py-3 backdrop-blur-[14px]',
    'max-[760px]:gap-[0.58rem] max-[760px]:px-[0.72rem]',
  ),
  homeLink: classNames(
    'inline-flex min-h-9 flex-none items-center justify-center gap-[0.32rem]',
    'rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.72)]',
    'bg-animal-bg-light px-[0.78rem] py-[0.28rem] text-[0.86rem] font-[950]',
    'text-animal-text no-underline shadow-[0_3px_0_var(--animal-shadow-input)]',
    'transition hover:-translate-y-px hover:border-animal-primary hover:shadow-[0_4px_0_var(--animal-primary-active)]',
    'max-[760px]:h-[38px] max-[760px]:w-[38px] max-[760px]:p-0',
  ),
  homeLinkText: 'max-[760px]:sr-only',
  homeLinkArrow: 'inline-grid w-[1.1rem] place-items-center text-base leading-none',
  headerCopy: 'grid min-w-0 flex-1 gap-[0.18rem] mr-2',
  headerTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[1.18rem] font-[900] leading-[1.15] text-animal-text',
  headerSummary: classNames(
    'block max-w-[760px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem] font-[800] leading-[1.35] text-animal-text-body',
    'max-[1080px]:max-w-[62vw] max-[760px]:whitespace-normal',
  ),
  headerMeta: 'flex min-w-0 flex-wrap justify-end gap-[0.45rem] overflow-hidden max-[1080px]:hidden',
  headerMetaPill: (state?: 'ready' | 'blocked') => classNames(
    'inline-flex min-h-7 max-w-[210px] items-center overflow-hidden text-ellipsis whitespace-nowrap',
    'rounded-[var(--animal-radius-pill)] border-2 px-[0.72rem] py-[0.18rem] text-[0.75rem] font-[900]',
    state === 'ready'
      ? 'border-animal-green bg-[#ecffd9] text-[#3d6d17]'
      : state === 'blocked'
        ? 'border-[#d46a4c] bg-[#ffe7dc] text-[#a43b24]'
        : 'border-[rgba(196,184,158,0.58)] bg-animal-bg-light text-animal-text-body',
  ),
  headerConfirm: classNames(
    'hidden h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full',
    'border-2 border-animal-green bg-animal-green text-[0] text-transparent shadow-[0_3px_0_var(--animal-success-shadow)]',
    'disabled:cursor-not-allowed disabled:opacity-55 max-[1080px]:flex',
    "before:content-['✓'] before:text-[1.2rem] before:font-[900] before:leading-none before:text-white",
  ),
  notice: classNames(
    'mx-auto mt-2 w-[var(--workspace-board-width,min(1680px,calc(100%_-_108px)))] rounded-[var(--animal-radius)]',
    'border-2 border-animal-border bg-animal-bg-light px-[0.95rem] py-[0.62rem]',
    'text-[0.84rem] font-[850] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)]',
    'max-[1080px]:mt-[0.55rem] max-[1080px]:w-[calc(100%_-_1.3rem)]',
  ),
  mobileChat: classNames(
    'hidden max-[1080px]:mt-[0.65rem] max-[1080px]:mx-[0.65rem]',
    'max-[1080px]:flex max-[1080px]:min-h-[210px] max-[1080px]:max-h-[min(36svh,330px)]',
    'max-[1080px]:flex-[0_0_min(36svh,330px)] max-[1080px]:overflow-hidden',
    'max-[1080px]:rounded-[24px] max-[1080px]:border-2 max-[1080px]:border-[rgba(196,184,158,0.78)]',
    'max-[1080px]:bg-[var(--animal-bg-content)] max-[1080px]:shadow-[0_4px_0_var(--animal-shadow-input)]',
  ),
  desktopBoard: classNames(
    'grid flex-1 items-stretch gap-3.5 overflow-x-auto overflow-y-hidden',
    'mx-auto min-h-0 pt-3.5 pb-[76px]',
    '[scrollbar-color:var(--animal-border)_transparent] [scrollbar-width:thin]',
    '[grid-template-columns:repeat(var(--workspace-column-count,3),minmax(360px,1fr))]',
    '[width:var(--workspace-board-width,min(1680px,calc(100%_-_108px)))]',
    'max-[1080px]:hidden',
  ),
  mobileBoard: classNames(
    'hidden',
    'max-[1080px]:block max-[1080px]:w-full max-[1080px]:overflow-hidden',
    'max-[1080px]:px-[0.65rem] max-[1080px]:pt-[0.65rem] max-[1080px]:pb-0',
  ),
  columnHeader: classNames(
    'flex min-h-[72px] cursor-grab select-none items-center justify-between gap-4',
    'px-4 pt-[0.7rem] pb-[0.65rem] active:cursor-grabbing',
    'max-[1080px]:hidden',
  ),
  columnTitleLockup: 'flex min-w-0 items-center gap-3',
  columnIconPill: classNames(
    'inline-grid h-[46px] w-[46px] flex-none place-items-center',
    'rounded-[18px] border-2 border-[rgba(196,184,158,0.76)] bg-[#fff3c4]',
    'shadow-[0_3px_0_#dba90e]',
  ),
  columnDragPill: classNames(
    'inline-flex min-h-[21px] items-center rounded-[var(--animal-radius-pill)]',
    'bg-animal-primary-bg px-[0.52rem] py-[0.12rem]',
    'text-[0.7rem] font-[900] text-[var(--animal-primary-active)]',
  ),
  columnTitle: 'm-0 mt-[0.28rem] text-[1.18rem] font-[900] leading-[1.12] text-animal-text',
  columnHint: classNames(
    'mt-0.5 block max-w-96 overflow-hidden text-ellipsis whitespace-nowrap',
    'text-[0.8rem] font-[800] text-[var(--animal-text-secondary)]',
    'max-[760px]:whitespace-normal',
  ),
  columnClose: classNames(
    'grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[var(--animal-radius-pill)]',
    'border-2 border-animal-border bg-animal-bg-light p-0 text-[1.2rem]',
    'font-[900] leading-none text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)]',
    'transition hover:-translate-y-px hover:border-[var(--animal-border-hover)]',
  ),
  columnDragImage: classNames(
    'fixed -top-[999px] -left-[999px] inline-flex max-w-[220px] items-center gap-[0.42rem]',
    'overflow-hidden rounded-[var(--animal-radius-pill)] border-2 border-[rgba(25,200,185,0.56)]',
    'bg-[#fffaf0] px-[0.72rem] py-[0.52rem] text-[0.78rem] font-[900] leading-none',
    'text-animal-text shadow-[0_3px_0_rgba(17,168,155,0.28),0_10px_20px_rgba(61,52,40,0.12)]',
    'pointer-events-none text-ellipsis whitespace-nowrap',
  ),
  columnPicker: 'fixed right-[clamp(18px,4vw,42px)] top-1/2 z-[35] -translate-y-1/2 max-[1080px]:hidden',
  columnPickerMenu: classNames(
    'absolute right-[58px] top-1/2 flex min-w-[124px] -translate-y-1/2 flex-col gap-1',
    'rounded-[22px] border-2 border-animal-border bg-[#ffeea0] p-[0.62rem] shadow-[0_8px_20px_rgba(61,52,40,0.12)]',
  ),
  columnPickerMenuButton: 'flex min-h-[38px] items-center gap-2 whitespace-nowrap rounded-[14px] border-0 bg-transparent px-[0.9rem] py-[0.4rem] text-left font-[900] text-animal-text-body hover:bg-[rgba(255,249,232,0.8)]',
  columnPickerTrigger: classNames(
    'grid h-[42px] w-[42px] place-items-center rounded-[14px] border-2 border-animal-border',
    'bg-animal-bg-light text-[2rem] font-[900] leading-none text-animal-text-body',
    'shadow-[0_5px_0_var(--animal-shadow-input),0_12px_28px_rgba(61,52,40,0.16)] transition hover:-translate-y-px',
  ),
  mobileTabs: classNames(
    'hidden max-[1080px]:fixed max-[1080px]:inset-x-0 max-[1080px]:bottom-0 max-[1080px]:z-[60]',
    'max-[1080px]:flex max-[1080px]:justify-around max-[1080px]:gap-[0.4rem]',
    'max-[1080px]:border-t-2 max-[1080px]:border-[rgba(196,184,158,0.6)]',
    'max-[1080px]:bg-[rgba(255,249,232,0.96)] max-[1080px]:p-[0.65rem] max-[1080px]:backdrop-blur-[12px]',
  ),
  mobileTab: (active: boolean, closed: boolean) => classNames(
    'min-w-0 flex-1 rounded-[var(--animal-radius-pill)] border-2 px-[0.36rem] py-[0.54rem]',
    'text-[0.82rem] font-[900] transition disabled:cursor-not-allowed disabled:opacity-60',
    active
      ? 'border-animal-green bg-[#ecffd9] text-[#3d6d17] shadow-[0_3px_0_var(--animal-success-shadow)]'
      : closed
        ? 'border-[rgba(196,184,158,0.72)] bg-animal-bg-light text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)] opacity-70'
        : 'border-animal-border bg-[#fffdf5] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)]',
  ),
  desktopFooter: 'fixed bottom-[0.875rem] right-[clamp(18px,4vw,42px)] z-30 block max-[1080px]:hidden',
  desktopConfirmButton: '[&_[class*="animal-btn"]]:!border-[var(--animal-success)] [&_[class*="animal-btn"]]:!bg-[var(--animal-success)] [&_[class*="animal-btn"]]:!text-white [&_[class*="animal-btn"]]:!shadow-[0_5px_0_0_var(--animal-success-shadow)]',
}

export function workspaceColumnSlotClassName({
  isDragging,
  isDragOver,
}: {
  isDragging: boolean
  isDragOver: boolean
}) {
  return classNames(
    'relative isolate flex h-full min-h-0 min-w-0 flex-col rounded-[26px] animate-column-pop transition-opacity',
    isDragging && 'opacity-[0.62]',
    isDragOver && [
      "before:content-[''] before:absolute before:inset-0 before:z-[5] before:pointer-events-none",
      'before:rounded-[28px] before:border-[3px] before:border-[rgba(25,200,185,0.58)]',
      'before:shadow-[0_0_0_5px_rgba(230,249,246,0.54)]',
      "after:content-[''] after:absolute after:top-[0.24rem] after:right-5 after:left-5 after:z-[6]",
      'after:h-1.5 after:pointer-events-none after:rounded-[var(--animal-radius-pill)]',
      'after:bg-animal-primary after:shadow-[0_2px_0_var(--animal-primary-active)]',
    ],
  )
}

export function workspaceMobileColumnSlotClassName(isActive: boolean) {
  return classNames('hidden h-full min-h-0 flex-col', isActive && 'flex')
}

export function workspaceColumnPanelClassName(isDragOver = false) {
  return classNames(
    'flex min-h-0 flex-1 flex-col overflow-hidden border-2 bg-[#fffaf0]',
    'rounded-[var(--animal-radius-lg)] max-[1080px]:h-full max-[1080px]:rounded-[24px]',
    isDragOver
      ? 'border-[rgba(25,200,185,0.58)] shadow-[0_4px_0_rgba(17,168,155,0.22),0_12px_28px_rgba(61,52,40,0.09)]'
      : 'border-[rgba(196,184,158,0.78)] shadow-[0_4px_0_0_var(--animal-shadow-input),0_12px_28px_rgba(61,52,40,0.09)]',
  )
}
