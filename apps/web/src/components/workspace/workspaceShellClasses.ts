import classNames from 'classnames'

export const workspaceShellClasses = {
  root: classNames(
    'flex h-[100svh] min-h-0 flex-col overflow-hidden bg-animal-bg bg-animal-grid',
    'max-[1080px]:pb-[74px]',
  ),
  planningHeader: classNames(
    'relative z-20 flex min-h-[62px] shrink-0 items-center justify-between gap-3',
    'border-b-2 border-[rgba(196,184,158,0.38)] bg-[rgba(248,248,240,0.92)]',
    'px-[clamp(1rem,3vw,2rem)] py-2.5 backdrop-blur-[14px]',
    'max-[760px]:gap-[0.58rem] max-[760px]:px-[0.72rem]',
  ),
  homeLink: classNames(
    'inline-flex min-h-9 flex-none items-center justify-center gap-[0.32rem]',
    'rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.72)]',
    'bg-animal-bg-light px-[0.78rem] py-[0.28rem] text-[0.84rem] font-[800]',
    'text-animal-text no-underline shadow-[0_2px_0_var(--animal-shadow-input)]',
    'transition hover:-translate-y-px hover:border-animal-primary hover:shadow-[0_4px_0_var(--animal-primary-active)]',
    'max-[760px]:h-[38px] max-[760px]:w-[38px] max-[760px]:p-0',
  ),
  homeLinkText: 'max-[760px]:sr-only',
  homeLinkArrow: 'inline-grid w-[1.1rem] place-items-center text-base leading-none',
  headerCopy: 'grid min-w-0 flex-1 gap-[0.18rem] mr-2',
  headerTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[1.02rem] font-[850] leading-[1.15] text-animal-text',
  headerSummary: classNames(
    'block max-w-[760px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] font-[700] leading-[1.35] text-animal-text-body',
    'max-[1080px]:max-w-[62vw] max-[760px]:whitespace-normal',
  ),
  headerMeta: 'flex min-w-0 flex-wrap justify-end gap-[0.45rem] overflow-hidden max-[1080px]:hidden',
  headerMetaPill: (state?: 'ready' | 'blocked') => classNames(
    'inline-flex min-h-7 max-w-[210px] items-center overflow-hidden text-ellipsis whitespace-nowrap',
    'rounded-[var(--animal-radius-pill)] border-2 px-[0.66rem] py-[0.18rem] text-[0.72rem] font-[800]',
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
    'max-[1080px]:rounded-[24px] max-[1080px]:border-2 max-[1080px]:border-[rgba(159,146,125,0.72)]',
    'max-[1080px]:bg-[var(--animal-bg-content)] max-[1080px]:shadow-[0_4px_0_var(--animal-shadow-input),0_12px_24px_rgba(61,52,40,0.08)]',
  ),
  desktopBoard: classNames(
    'grid flex-1 items-stretch gap-3.5 overflow-x-auto overflow-y-hidden',
    'mx-auto min-h-0 pt-3.5 pb-[76px]',
    '[scrollbar-color:var(--animal-border)_transparent] [scrollbar-width:thin]',
    '[grid-template-columns:repeat(var(--workspace-column-count,3),minmax(356px,1fr))]',
    '[width:var(--workspace-board-width,min(1720px,calc(100%_-_96px)))]',
    'max-[1080px]:hidden',
  ),
  mobileBoard: classNames(
    'hidden',
    'max-[1080px]:block max-[1080px]:w-full max-[1080px]:overflow-hidden',
    'max-[1080px]:px-[0.65rem] max-[1080px]:pt-[0.65rem] max-[1080px]:pb-0',
  ),
  columnHeader: classNames(
    'flex min-h-[64px] cursor-grab select-none items-center justify-between gap-3',
    'px-3.5 pt-[0.62rem] pb-[0.55rem] active:cursor-grabbing',
    'max-[1080px]:hidden',
  ),
  columnTitleLockup: 'flex min-w-0 items-center gap-3',
  columnIconPill: classNames(
    'inline-grid h-[40px] w-[40px] flex-none place-items-center',
    'rounded-[16px] border-2 border-[rgba(159,146,125,0.58)] bg-[#fff3c4]',
    'shadow-[0_3px_0_#dba90e,0_8px_14px_rgba(61,52,40,0.08)]',
  ),
  columnDragPill: 'sr-only',
  columnTitleRow: 'flex min-w-0 items-center gap-2',
  columnDragHandle: classNames(
    'inline-grid h-6 w-6 flex-none place-items-center rounded-full border-2 border-[rgba(196,184,158,0.62)]',
    'bg-[#fffdf5] text-[0.78rem] font-[850] leading-none text-[var(--animal-text-muted)]',
    'shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  columnTitle: 'm-0 text-[1rem] font-[850] leading-[1.15] text-animal-text',
  columnHint: classNames(
    'mt-0.5 block max-w-96 overflow-hidden text-ellipsis whitespace-nowrap',
    'text-[0.74rem] font-[700] text-[var(--animal-text-secondary)]',
    'max-[760px]:whitespace-normal',
  ),
  columnClose: classNames(
    'grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[var(--animal-radius-pill)]',
    'border-2 border-animal-border bg-animal-bg-light p-0 text-[1.2rem]',
    'font-[850] leading-none text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]',
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
    'bg-animal-bg-light text-animal-text-body',
    'shadow-[0_5px_0_var(--animal-shadow-input),0_12px_28px_rgba(61,52,40,0.16)] transition hover:-translate-y-px',
  ),
  columnPickerPlus: 'grid h-full w-full place-items-center text-[1.8rem] font-[850] leading-none',
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
    'relative isolate flex h-full min-h-0 min-w-0 flex-col rounded-[24px] animate-column-pop transition',
    isDragging && 'scale-[0.985] opacity-[0.58]',
    isDragOver && 'bg-[rgba(230,249,246,0.42)] shadow-[inset_0_0_0_4px_rgba(25,200,185,0.22)]',
  )
}

export function workspaceMobileColumnSlotClassName(isActive: boolean) {
  return classNames('hidden h-full min-h-0 flex-col', isActive && 'flex')
}

export function workspaceColumnPanelClassName(isDragOver = false) {
  return classNames(
    'flex min-h-0 flex-1 flex-col overflow-hidden border-2 bg-[#fffaf0]',
    'rounded-[22px] max-[1080px]:h-full max-[1080px]:rounded-[22px]',
    isDragOver
      ? 'border-[rgba(25,200,185,0.64)] bg-[#f2fffb] shadow-[0_3px_0_rgba(17,168,155,0.26),0_10px_22px_rgba(61,52,40,0.08)]'
      : 'border-[rgba(159,146,125,0.72)] shadow-[0_3px_0_0_var(--animal-shadow-input),0_10px_22px_rgba(61,52,40,0.08)]',
  )
}
