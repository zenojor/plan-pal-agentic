import classNames from 'classnames'

export const workspaceShellClasses = {
  root: classNames(
    'flex h-[100svh] min-h-0 w-full max-w-full flex-col overflow-hidden bg-animal-bg bg-animal-grid',
    'max-[1080px]:pb-[78px]',
  ),
  planningHeader: classNames(
    'relative z-20 flex min-h-[72px] shrink-0 items-center justify-between gap-4',
    'border-b-2 border-[rgba(196,184,158,0.48)] bg-[linear-gradient(135deg,rgba(255,253,245,0.96),rgba(242,255,251,0.94))]',
    'px-[clamp(1rem,3vw,2rem)] py-2.5 shadow-[0_4px_18px_rgba(61,52,40,0.08)] backdrop-blur-[14px]',
    'max-[760px]:min-h-[66px] max-[760px]:min-w-0 max-[760px]:gap-2 max-[760px]:px-3',
  ),
  homeLink: classNames(
    'inline-flex min-h-10 flex-none items-center justify-center gap-1.5',
    'rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.72)]',
    'bg-animal-bg-light px-3.5 py-1.5 text-sm font-bold',
    'text-animal-text no-underline shadow-[0_3px_0_var(--animal-shadow-input)]',
    'transition duration-200 hover:-translate-y-px hover:border-animal-primary hover:shadow-[0_4px_0_var(--animal-primary-active)] active:translate-y-[2px] active:shadow-[0_1px_0_var(--animal-shadow-input)]',
    'max-[760px]:h-10 max-[760px]:w-10 max-[760px]:p-0',
  ),
  homeLinkText: 'max-[760px]:sr-only',
  homeLinkArrow: 'inline-grid w-[1.1rem] place-items-center text-base leading-none',
  headerCopy: 'mr-2 grid min-w-0 flex-1 gap-0.5',
  headerEyebrow: 'text-xs font-bold uppercase leading-4 tracking-[0.09em] text-[var(--animal-primary-active)]',
  headerTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold leading-5 tracking-[0.01em] text-animal-text max-[760px]:text-base',
  headerSummary: classNames(
    'block max-w-[760px] overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] font-medium leading-5 text-animal-text-body',
    'max-[1080px]:max-w-[62vw] max-[760px]:whitespace-normal max-[520px]:line-clamp-2 max-[520px]:max-w-full max-[520px]:text-xs max-[520px]:leading-4',
  ),
  headerMeta: 'flex min-w-0 flex-wrap justify-end gap-2 overflow-hidden max-[1080px]:hidden',
  headerMetaPill: (state?: 'ready' | 'blocked') => classNames(
    'inline-flex min-h-8 max-w-[220px] items-center overflow-hidden text-ellipsis whitespace-nowrap',
    'rounded-[var(--animal-radius-pill)] border-2 px-3 py-1 text-xs font-semibold leading-none',
    state === 'ready'
      ? 'border-animal-green bg-[#ecffd9] text-[#3d6d17]'
      : state === 'blocked'
        ? 'border-[#d46a4c] bg-[#ffe7dc] text-[#a43b24]'
        : 'border-[rgba(196,184,158,0.58)] bg-animal-bg-light text-animal-text-body',
  ),
  headerConfirm: classNames(
    'hidden h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full',
    'border-2 border-animal-green bg-animal-green text-[1.15rem] font-black leading-none text-white shadow-[0_3px_0_var(--animal-success-shadow)]',
    'disabled:cursor-not-allowed disabled:opacity-55 max-[1080px]:flex',
  ),
  notice: classNames(
    'mx-auto mt-3 w-[var(--workspace-board-width,min(1680px,calc(100%_-_108px)))] rounded-[var(--animal-radius)]',
    'border-2 border-animal-border bg-animal-bg-light px-4 py-2.5',
    'text-[0.8125rem] font-semibold leading-5 text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)]',
    'max-[1080px]:mt-[0.55rem] max-[1080px]:w-[calc(100%_-_1.3rem)] max-[1080px]:shrink-0',
    'max-[520px]:px-3 max-[520px]:py-2 max-[520px]:text-xs max-[520px]:leading-4',
  ),
  mobileChat: classNames(
    'hidden max-[1080px]:mx-[0.65rem] max-[1080px]:mt-[0.65rem] max-[1080px]:min-w-0',
    'max-[1080px]:flex max-[1080px]:min-h-[230px] max-[1080px]:max-h-[min(40svh,360px)]',
    'max-[1080px]:flex-[0_0_min(40svh,360px)] max-[1080px]:overflow-hidden',
    'max-[1080px]:rounded-[24px] max-[1080px]:border-2 max-[1080px]:border-[rgba(159,146,125,0.72)]',
    'max-[1080px]:bg-[var(--animal-bg-content)] max-[1080px]:shadow-[0_4px_0_var(--animal-shadow-input),0_12px_24px_rgba(61,52,40,0.08)]',
  ),
  desktopBoard: classNames(
    'grid flex-1 items-stretch gap-4 overflow-x-auto overflow-y-hidden',
    'mx-auto min-h-0 pt-4 pb-[80px]',
    '[scrollbar-color:var(--animal-border)_transparent] [scrollbar-width:thin]',
    '[grid-template-columns:repeat(var(--workspace-column-count,3),minmax(356px,1fr))]',
    '[width:var(--workspace-board-width,min(1720px,calc(100%_-_96px)))]',
    'max-[1080px]:hidden',
  ),
  mobileBoard: classNames(
    'hidden',
    'max-[1080px]:flex max-[1080px]:min-h-0 max-[1080px]:min-w-0 max-[1080px]:w-full max-[1080px]:flex-1 max-[1080px]:flex-col max-[1080px]:overflow-hidden',
    'max-[1080px]:px-[0.65rem] max-[1080px]:pt-[0.65rem] max-[1080px]:pb-0',
  ),
  columnHeader: classNames(
    'mb-2 flex min-h-[68px] cursor-grab select-none items-center justify-between gap-3',
    'rounded-[22px] border-2 border-[rgba(159,146,125,0.58)] bg-[linear-gradient(135deg,#fffdf5,#fff8dd)]',
    'px-3.5 py-2.5 shadow-[0_3px_0_var(--animal-shadow-input),0_10px_20px_rgba(61,52,40,0.06)] active:cursor-grabbing',
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
    'bg-[#fffdf5] text-xs font-bold leading-none text-[var(--animal-text-muted)]',
    'shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  columnTitle: 'm-0 text-base font-bold leading-5 tracking-[0.01em] text-animal-text',
  columnHint: classNames(
    'mt-0.5 block max-w-96 overflow-hidden text-ellipsis whitespace-nowrap',
    'text-xs font-medium leading-4 text-[var(--animal-text-secondary)]',
    'max-[760px]:whitespace-normal',
  ),
  columnClose: classNames(
    'grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[var(--animal-radius-pill)]',
    'border-2 border-animal-border bg-animal-bg-light p-0 text-[1.2rem]',
    'font-bold leading-none text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]',
    'transition duration-200 hover:-translate-y-px hover:border-[var(--animal-border-hover)] active:translate-y-[2px] active:shadow-none',
  ),
  columnDragImage: classNames(
    'fixed -top-[999px] -left-[999px] inline-flex max-w-[220px] items-center gap-[0.42rem]',
    'overflow-hidden rounded-[var(--animal-radius-pill)] border-2 border-[rgba(25,200,185,0.56)]',
    'bg-[#fffaf0] px-3 py-2 text-xs font-black leading-none',
    'text-animal-text shadow-[0_3px_0_rgba(17,168,155,0.28),0_10px_20px_rgba(61,52,40,0.12)]',
    'pointer-events-none text-ellipsis whitespace-nowrap',
  ),
  columnPicker: 'fixed right-[clamp(18px,4vw,42px)] top-1/2 z-[35] -translate-y-1/2 max-[1080px]:hidden',
  columnPickerMenu: classNames(
    'absolute right-[58px] top-1/2 flex min-w-[136px] -translate-y-1/2 flex-col gap-1.5',
    'rounded-[22px] border-2 border-animal-border bg-[linear-gradient(145deg,#fffdf5,#fff3c4)] p-2 shadow-[0_4px_0_var(--animal-shadow-input),0_12px_24px_rgba(61,52,40,0.14)]',
  ),
  columnPickerMenuButton: 'flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[14px] border-0 bg-transparent px-3 py-2 text-left text-[0.8125rem] font-bold text-animal-text-body transition hover:bg-[rgba(255,255,255,0.72)]',
  columnPickerTrigger: classNames(
    'grid h-[42px] w-[42px] place-items-center rounded-[14px] border-2 border-animal-border',
    'bg-animal-bg-light text-animal-text-body',
    'shadow-[0_5px_0_var(--animal-shadow-input),0_12px_28px_rgba(61,52,40,0.16)] transition hover:-translate-y-px',
  ),
  columnPickerPlus: 'grid h-full w-full place-items-center text-[1.8rem] font-bold leading-none',
  mobileTabs: classNames(
    'hidden max-[1080px]:fixed max-[1080px]:inset-x-0 max-[1080px]:bottom-0 max-[1080px]:z-[60]',
    'max-[1080px]:flex max-[1080px]:justify-around max-[1080px]:gap-1.5',
    'max-[1080px]:border-t-2 max-[1080px]:border-[rgba(196,184,158,0.6)]',
    'max-[1080px]:bg-[rgba(255,249,232,0.96)] max-[1080px]:p-2.5 max-[1080px]:shadow-[0_-8px_24px_rgba(61,52,40,0.08)] max-[1080px]:backdrop-blur-[12px]',
  ),
  mobileTab: (active: boolean, closed: boolean) => classNames(
    'inline-flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] border-2 px-1.5 py-1.5',
    'text-xs font-bold leading-none transition duration-200 disabled:cursor-not-allowed disabled:opacity-60',
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
    'relative isolate flex h-full min-h-0 min-w-0 flex-col rounded-[24px] animate-column-pop transition duration-200',
    isDragging && 'scale-[0.985] opacity-[0.58]',
    isDragOver && 'bg-[rgba(230,249,246,0.42)] shadow-[inset_0_0_0_4px_rgba(25,200,185,0.22)]',
  )
}

export function workspaceMobileColumnSlotClassName(isActive: boolean) {
  return classNames(
    'h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden',
    isActive ? 'flex' : 'hidden',
  )
}

export function workspaceColumnPanelClassName(isDragOver = false) {
  return classNames(
    'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden border-2 bg-[rgba(255,250,240,0.92)]',
    'rounded-[22px] max-[1080px]:h-full max-[1080px]:rounded-[22px]',
    isDragOver
      ? 'border-[rgba(25,200,185,0.64)] bg-[#f2fffb] shadow-[0_3px_0_rgba(17,168,155,0.26),0_10px_22px_rgba(61,52,40,0.08)]'
      : 'border-[rgba(159,146,125,0.72)] shadow-[0_3px_0_0_var(--animal-shadow-input),0_10px_22px_rgba(61,52,40,0.08)]',
  )
}
