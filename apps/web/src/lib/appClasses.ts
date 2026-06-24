import classNames from 'classnames'

const pillBase = 'inline-flex items-center justify-center rounded-[var(--animal-radius-pill)] border-2 font-[800] no-underline transition'
const nativeButtonBase = 'cursor-pointer rounded-[var(--animal-radius-pill)] border-2 font-[800] transition disabled:cursor-not-allowed disabled:opacity-60'
const inputBase = 'min-w-0 rounded-[var(--animal-radius-pill)] border-[2.5px] border-animal-border bg-[#fffdf5] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)] outline-none transition hover:border-[var(--animal-border-hover)] focus:border-[var(--animal-focus-yellow)] focus:shadow-[0_3px_0_var(--animal-focus-yellow-d),0_0_0_3px_rgba(255,204,0,0.16)]'

export const appClasses = {
  shell: (isWorkspaceRoute: boolean) => classNames(
    'min-h-[100svh] bg-animal-bg bg-animal-grid',
    isWorkspaceRoute ? '' : '',
  ),
  topbar: classNames(
    'sticky top-0 z-50 flex min-h-[62px] items-center justify-between gap-3',
    'border-b-2 border-[rgba(196,184,158,0.38)] bg-[rgba(248,248,240,0.92)]',
    'px-[clamp(1rem,3vw,2.4rem)] py-2.5 backdrop-blur-[14px]',
    'max-[760px]:flex-wrap',
  ),
  brand: 'inline-flex items-center gap-[0.75rem] text-animal-text no-underline font-[850] text-[1.05rem]',
  brandMark: classNames(
    'grid h-10 w-10 place-items-center rounded-full bg-animal-primary',
    'text-white shadow-[0_3px_0_var(--animal-primary-active)]',
  ),
  topnav: 'flex flex-wrap items-center justify-end gap-2',
  topnavLink: (active = false) => classNames(
    'rounded-[var(--animal-radius-pill)] border px-4 py-2 text-[0.82rem] font-[850] text-animal-text no-underline transition',
    active
      ? 'border-[rgba(25,200,185,0.36)] bg-[#f2fffb] text-[var(--animal-primary-active)] shadow-[0_2px_0_rgba(17,168,155,0.14)]'
      : 'border-[rgba(196,184,158,0.28)] bg-[rgba(255,253,245,0.72)] hover:border-[rgba(196,184,158,0.54)]',
  ),
  eyebrow: 'text-[0.7rem] font-[850] uppercase tracking-[0.08em] text-[var(--animal-primary-active)]',
  errorText: 'm-0 text-[0.84rem] font-[850] text-[var(--animal-error)]',
  statusText: 'm-0 text-[0.84rem] font-[850] text-animal-text-body',
}

export const homeClasses = {
  root: classNames(
    'mx-auto grid min-h-[calc(100svh-62px)] w-full max-w-[1360px] content-start gap-[0.76rem] bg-transparent',
    'px-[clamp(0.9rem,3.2vw,2.1rem)] py-[clamp(0.72rem,1.7vw,1.2rem)] text-animal-text-body',
  ),
  topbar: 'flex min-w-0 items-center justify-between gap-3',
  brand: classNames(
    'inline-flex min-h-10 items-center gap-2 rounded-[var(--animal-radius-pill)]',
    'border-2 border-[rgba(196,184,158,0.72)] bg-animal-bg-light px-3 py-1.5',
    'font-[850] text-animal-text no-underline shadow-[0_3px_0_var(--animal-shadow-input)]',
  ),
  brandMark: 'grid h-7 w-7 place-items-center rounded-full bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]',
  modelLink: (ready: boolean) => classNames(
    pillBase,
    'min-h-9 max-w-[62vw] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-1.5 text-[0.76rem]',
    ready
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)] hover:-translate-y-px active:translate-y-[2px]'
      : 'border-animal-border bg-animal-bg-light text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  launchPad: 'grid gap-[0.62rem] py-0',
  launchHeader: 'flex min-w-0 flex-wrap items-center justify-between gap-3',
  launchCopy: 'relative z-10 grid max-w-[760px] gap-[0.34rem]',
  launchTitle: 'm-0 text-[clamp(2.08rem,4.1vw,3.65rem)] font-[900] leading-[0.98] text-animal-text',
  launchText: 'm-0 max-w-[720px] text-[clamp(0.86rem,1vw,0.96rem)] font-[850] leading-[1.48] text-animal-text-body',
  inputStack: 'grid gap-[0.62rem]',
  promptLabel: 'relative z-10 grid gap-[0.32rem]',
  promptLabelText: 'text-[0.72rem] font-[850] text-animal-text-body',
  promptShell: classNames(
    'grid min-w-0 overflow-hidden rounded-[22px] border-2 border-[rgba(159,146,125,0.72)] bg-[#fffaf0]',
    'shadow-[0_3px_0_var(--animal-shadow-input),0_10px_22px_rgba(61,52,40,0.08)]',
  ),
  textarea: classNames(
    'min-h-[108px] w-full min-w-0 resize-y border-0 bg-transparent px-[1rem] py-[0.8rem]',
    'text-[0.93rem] font-[800] leading-[1.5] text-animal-text-body outline-none placeholder:text-[var(--animal-text-disabled)]',
  ),
  promptActions: classNames(
    'flex min-w-0 items-center justify-end gap-3 border-t-2 border-[rgba(196,184,158,0.28)]',
    'bg-[rgba(255,248,221,0.45)] px-[1rem] py-[0.54rem]',
  ),
  quickPanel: (open: boolean) => classNames(
    'relative grid min-w-0 content-start overflow-hidden border-2 bg-[#fffaf0]',
    'shadow-[0_3px_0_var(--animal-shadow-input),0_9px_18px_rgba(61,52,40,0.07)] transition',
    open
      ? 'gap-[0.7rem] rounded-[22px] border-[rgba(25,200,185,0.64)] bg-[#f2fffb] p-[0.72rem] shadow-[0_3px_0_rgba(17,168,155,0.26),0_10px_22px_rgba(61,52,40,0.08)]'
      : 'gap-0 rounded-[20px] border-[rgba(159,146,125,0.72)] p-[0.48rem]',
  ),
  quickToggle: classNames(
    'flex min-h-[42px] w-full items-center justify-between gap-2 rounded-[16px] border-0 bg-transparent px-1.5 py-1 text-left text-animal-text-body',
  ),
  quickToggleIcon: 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-animal-primary-bg text-[0.98rem] font-[900] text-[var(--animal-primary-active)] shadow-[0_2px_0_rgba(17,168,155,0.16)]',
  quickToggleCopy: 'grid min-w-0 flex-1 gap-0.5',
  quickToggleTitle: 'text-[0.84rem] font-[900] text-animal-text',
  quickToggleHint: 'line-clamp-1 text-[0.68rem] font-[850] leading-[1.28] text-[var(--animal-text-muted)]',
  quickToggleState: classNames(
    'group inline-flex min-h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--animal-radius-pill)]',
    'border-2 border-[rgba(196,184,158,0.66)] bg-[#fffdf5] px-3 py-1 text-[0.72rem] font-[900] text-animal-text',
    'shadow-[0_2px_0_var(--animal-shadow-input)] transition hover:-translate-y-px hover:border-[rgba(25,200,185,0.56)] hover:bg-animal-primary-bg active:translate-y-[1px] active:shadow-[0_1px_0_var(--animal-shadow-input)]',
  ),
  quickToggleStateLabel: 'text-[0.72rem] font-[900] max-[460px]:hidden',
  quickToggleChevron: (open: boolean) => classNames(
    'grid h-4 w-4 place-items-center text-[0.62rem] font-[900] leading-none text-[var(--animal-primary-active)] transition-transform',
    open && 'rotate-180',
  ),
  quickBody: 'grid gap-[0.65rem]',
  controlStrip: 'grid grid-cols-[repeat(auto-fit,minmax(156px,1fr))] items-stretch gap-[0.55rem]',
  range: 'grid min-w-0 gap-1 rounded-[19px] border-2 border-[rgba(159,146,125,0.6)] bg-[#fff8dd] p-2.5 text-[0.73rem] font-[850] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]',
  segmentedGroup: 'grid min-w-0 gap-1.5 rounded-[19px] border-2 border-[rgba(159,146,125,0.6)] bg-[#fff8dd] p-2.5 shadow-[0_2px_0_var(--animal-shadow-input)]',
  segmentedLabel: 'text-[0.68rem] font-[850] text-[var(--animal-text-muted)]',
  segmentedOptions: 'flex flex-wrap gap-1',
  segmentedButton: (active: boolean) => classNames(
    'min-h-8 rounded-[var(--animal-radius-pill)] border-2 px-2.5 text-[0.72rem] font-[850] transition hover:-translate-y-px active:translate-y-[2px]',
    active
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  inlineInput: (topic = false) => classNames(inputBase, 'min-h-[42px] border-[2.5px] bg-[#fffdf5] px-3 text-[0.82rem] font-[800] shadow-[0_3px_0_var(--animal-shadow-input)]', topic && 'min-[560px]:col-span-2'),
  quickSubmit: classNames(
    nativeButtonBase,
    'min-h-[38px] justify-self-start border-[rgba(25,200,185,0.72)] bg-animal-primary-bg px-4 py-2 text-[0.78rem] text-[var(--animal-primary-active)] shadow-[0_3px_0_var(--animal-primary-active)] hover:-translate-y-px active:translate-y-[2px]',
  ),
  primaryButton: classNames(
    nativeButtonBase,
    'inline-flex min-h-[38px] items-center gap-2 border-[#e8b336] bg-[#fff3c4] px-4 py-1.5 text-[0.84rem] text-animal-text shadow-[0_3px_0_#dba90e] hover:-translate-y-px active:translate-y-[2px]',
  ),
  launchError: 'rounded-[18px] border-2 border-[#d46a4c] bg-[#ffe7dc] p-3 text-[#a43b24] shadow-[0_3px_0_#d46a4c]',
  promptRail: classNames(
    'grid gap-[0.55rem] pt-0',
    'md:grid-cols-4 md:items-stretch',
  ),
  sectionHeading: 'flex min-w-0 items-center justify-between pl-1 md:col-span-4',
  sectionTitle: 'text-[0.9rem] font-[900] text-animal-text',
  promptButton: classNames(
    'grid min-w-0 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[18px] border-2 border-[rgba(159,146,125,0.72)] bg-[#fffaf0] p-2.5 text-left',
    'font-[850] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input),0_8px_18px_rgba(61,52,40,0.07)]',
    'transition hover:-translate-y-px hover:border-[rgba(25,200,185,0.64)] hover:shadow-[0_4px_0_var(--animal-primary-active),0_12px_26px_rgba(61,52,40,0.1)]',
  ),
  promptButtonIcon: classNames(
    'grid h-9 w-9 place-items-center rounded-full border-2 border-[rgba(219,169,14,0.45)]',
    'bg-[var(--animal-focus-yellow)] text-[0.76rem] font-[900] text-animal-text shadow-[0_3px_0_var(--animal-focus-yellow-d)]',
  ),
  promptButtonCopy: 'grid min-w-0 gap-1',
  promptButtonTitle: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.86rem] font-[850] text-animal-text',
  promptButtonSummary: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[820] text-[var(--animal-text-muted)]',
  promptButtonArrow: 'text-[1.25rem] font-[900] text-animal-text',
  recentRail: 'grid overflow-hidden rounded-[22px] border-2 border-[rgba(159,146,125,0.72)] bg-[#fffaf0] shadow-[0_3px_0_var(--animal-shadow-input),0_10px_22px_rgba(61,52,40,0.08)]',
  recentHeading: 'flex items-center justify-between gap-2 border-b-2 border-[rgba(196,184,158,0.38)] px-3.5 py-2',
  recentHeadingTitle: 'text-[0.9rem] font-[850] text-animal-text',
  recentHeadingMeta: 'text-[0.72rem] font-[850] text-[var(--animal-text-muted)]',
  recentList: 'grid',
  recentItem: 'grid grid-cols-[34px_minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b border-[rgba(196,184,158,0.38)] px-3.5 py-1.5 last:border-b-0 max-[760px]:grid-cols-[34px_minmax(0,1fr)_auto]',
  recentIcon: classNames(
    'grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-[rgba(219,169,14,0.42)]',
    'bg-[var(--animal-focus-yellow)] text-[0.7rem] font-[900] text-animal-text shadow-[0_2px_0_var(--animal-focus-yellow-d)]',
  ),
  recentLink: 'grid min-w-0 grid-cols-[minmax(0,1.5fr)_auto_minmax(120px,0.8fr)_auto] items-center gap-3 text-animal-text-body no-underline max-[900px]:grid-cols-1 max-[900px]:gap-1',
  recentTitle: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.86rem] font-[850] text-animal-text',
  recentType: 'justify-self-start rounded-[var(--animal-radius-pill)] bg-animal-primary-bg px-2.5 py-1 text-[0.68rem] font-[850] text-[var(--animal-primary-active)]',
  recentMeta: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[830] text-[var(--animal-text-muted)]',
  recentDelete: classNames(nativeButtonBase, 'min-h-[30px] border-[rgba(196,184,158,0.54)] bg-[#fffdf8] px-3 py-1 text-[0.72rem] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)] hover:-translate-y-px active:translate-y-[1px]'),
  recentMore: 'px-1 text-[0.8rem] font-[900] tracking-[0.08em] text-animal-text max-[760px]:hidden',
  recentEmpty: classNames(
    'grid min-h-[96px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3',
    'bg-[#fff8dd] max-[700px]:grid-cols-[42px_minmax(0,1fr)] max-[700px]:items-start',
  ),
  recentEmptyIcon: classNames(
    'grid h-9 w-9 place-items-center rounded-full border-2 border-[rgba(219,169,14,0.46)]',
    'bg-[var(--animal-focus-yellow)] text-[0.72rem] font-[900] text-animal-text shadow-[0_3px_0_var(--animal-focus-yellow-d)]',
  ),
  recentEmptyCopy: 'grid min-w-0 gap-1',
  recentEmptyTitle: 'text-[0.92rem] font-[900] text-animal-text',
  recentEmptyHint: 'max-w-[640px] text-[0.72rem] font-[850] leading-[1.45] text-[var(--animal-text-muted)]',
  recentEmptyAction: classNames(
    nativeButtonBase,
    'inline-flex min-h-[34px] shrink-0 items-center justify-center gap-1.5 border-[rgba(25,200,185,0.62)] bg-animal-primary-bg px-3.5 py-1 text-[0.76rem] text-[var(--animal-primary-active)]',
    'shadow-[0_3px_0_rgba(17,168,155,0.28)] hover:-translate-y-px active:translate-y-[1px] max-[700px]:col-start-2 max-[700px]:justify-self-start',
  ),
  recentFooter: classNames(
    'group grid min-h-[48px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-b-0 border-t-2 border-[rgba(196,184,158,0.38)]',
    'bg-[#fff8dd] px-3.5 py-2 text-left text-animal-text-body transition hover:bg-[#fff3c4] active:translate-y-[1px]',
    'max-[640px]:grid-cols-1 max-[640px]:justify-items-start',
  ),
  recentFooterCopy: 'grid min-w-0 gap-0.5',
  recentFooterTitle: 'text-[0.82rem] font-[900] text-animal-text',
  recentFooterHint: 'text-[0.68rem] font-[850] text-[var(--animal-text-muted)]',
  recentFooterAction: classNames(
    'inline-flex min-h-8 shrink-0 items-center justify-center gap-1.5 rounded-[var(--animal-radius-pill)]',
    'border-2 border-[rgba(196,184,158,0.66)] bg-[#fffdf5] px-3 py-1 text-[0.72rem] font-[900] text-animal-text',
    'shadow-[0_2px_0_var(--animal-shadow-input)] transition group-hover:-translate-y-px group-hover:border-[rgba(25,200,185,0.56)] group-hover:bg-animal-primary-bg',
  ),
  recentFooterIcon: classNames(
    'grid h-5 w-5 place-items-center rounded-full bg-[var(--animal-focus-yellow)]',
    'text-[0.62rem] font-[900] leading-none text-animal-text shadow-[0_2px_0_var(--animal-focus-yellow-d)]',
  ),
  note: 'm-0 text-[0.78rem] font-[820] text-[var(--animal-text-muted)]',
  progress: 'grid gap-2 rounded-[20px] border-2 border-[rgba(25,200,185,0.34)] bg-[#f2fffb] p-3',
  progressTitle: 'text-[0.88rem] font-[850] text-animal-text',
  progressList: 'grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2 p-0 m-0 list-none max-[640px]:grid-cols-1',
  progressStep: (state: string) => classNames(
    'flex items-center gap-2 rounded-[16px] border-2 px-3 py-2 text-[0.78rem] font-[900]',
    state === 'done' && 'border-animal-green bg-[#ecffd9] text-[#3d6d17]',
    state === 'active' && 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)]',
    state === 'pending' && 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5] text-[var(--animal-text-muted)]',
  ),
  progressDot: (state: string) => classNames(
    'h-2.5 w-2.5 rounded-full',
    state === 'done' ? 'bg-animal-green' : state === 'active' ? 'bg-animal-primary' : 'bg-animal-border',
  ),
  progressHint: 'text-[0.72rem] font-[820] text-[var(--animal-text-muted)]',
}

export const settingsClasses = {
  page: 'grid min-h-[calc(100svh-58px)] place-items-start justify-items-center bg-transparent px-4 py-6',
  card: classNames(
    'grid w-full max-w-[720px] gap-3 rounded-[24px] border-2 border-animal-border',
    'bg-animal-bg-light p-[clamp(1rem,2.4vw,1.6rem)] shadow-[0_4px_0_var(--animal-shadow-input),0_12px_26px_rgba(61,52,40,0.12)]',
  ),
  title: 'm-0 text-[clamp(1.6rem,3vw,2.35rem)] font-[850] leading-tight text-animal-text',
  paragraph: 'm-0 text-[0.9rem] font-[700] leading-[1.55] text-animal-text-body',
  hint: 'rounded-[18px] bg-[#fffdf5] p-3 text-[0.82rem] font-[700] text-[var(--animal-text-muted)]',
  summary: 'grid gap-1 rounded-[18px] border-2 border-[rgba(196,184,158,0.56)] bg-[#fffdf5] p-3',
  summaryTitle: 'text-[0.88rem] font-[850] text-animal-text',
  summaryLine: 'min-w-0 [overflow-wrap:anywhere] text-[0.76rem] font-[700] text-animal-text-body',
  dirty: 'justify-self-start rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2.5 py-1 text-[0.72rem] font-[850] text-animal-text',
  presetGrid: 'grid grid-cols-2 gap-3 max-[640px]:grid-cols-1',
  presetButton: (active: boolean) => classNames(
    'grid min-h-[104px] gap-1 rounded-[18px] border-2 p-3 text-left shadow-[0_3px_0_var(--animal-shadow-input)] transition hover:-translate-y-px',
    active
      ? 'border-[var(--animal-primary-active)] bg-animal-primary-bg shadow-[0_3px_0_var(--animal-primary-active)]'
      : 'border-animal-border bg-[#fffdf5]',
  ),
  label: 'grid gap-1 text-[0.78rem] font-[800] text-animal-text-body',
  input: classNames(inputBase, 'min-h-10 px-3 text-[0.86rem] font-[650]'),
  buttonRow: 'flex flex-wrap gap-2',
  button: classNames(nativeButtonBase, 'border-animal-primary bg-animal-primary px-4 py-2 text-white shadow-[0_3px_0_var(--animal-primary-active)] hover:-translate-y-px active:translate-y-[2px]'),
  secondaryButton: classNames(nativeButtonBase, 'border-animal-border bg-[#fffdf5] px-4 py-2 text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)] hover:-translate-y-px active:translate-y-[2px]'),
  dangerButton: classNames(nativeButtonBase, 'border-[#d46a4c] bg-[#ffe7dc] px-4 py-2 text-[#a43b24] shadow-[0_3px_0_#d46a4c] hover:-translate-y-px active:translate-y-[2px]'),
}

export const modalClasses = {
  backdrop: 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(61,52,40,0.34)] p-4 backdrop-blur-sm',
  modal: classNames(
    'grid w-full max-w-[720px] max-h-[min(82svh,760px)] gap-4 overflow-auto',
    'rounded-[24px] border-2 border-animal-border bg-animal-bg-light p-5',
    'shadow-[0_8px_0_var(--animal-shadow-input),0_24px_60px_rgba(61,52,40,0.24)]',
  ),
  title: 'm-0 text-[1.22rem] font-[850] leading-tight text-animal-text',
  text: 'm-0 text-[0.86rem] font-[700] leading-[1.55] text-animal-text-body',
  nodeList: 'grid gap-2',
  nodeItem: 'grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 rounded-[18px] bg-[#fffdf5] p-2 max-[640px]:grid-cols-[34px_minmax(0,1fr)]',
  nodeIndex: 'grid h-8 w-8 place-items-center rounded-full bg-animal-primary text-[0.78rem] font-[850] text-white shadow-[0_2px_0_var(--animal-primary-active)]',
  nodeTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.82rem] font-[850] text-animal-text',
  nodeMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.7rem] font-[700] text-[var(--animal-text-muted)]',
  nodeStatus: 'rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2 py-1 text-[0.7rem] font-[850] text-animal-text',
  warningList: 'flex flex-wrap gap-2',
  warning: (state: string) => classNames(
    'rounded-[var(--animal-radius-pill)] border-2 px-2.5 py-1 text-[0.72rem] font-[800]',
    state === 'ok' && 'border-animal-green bg-[#ecffd9] text-[#3d6d17]',
    state === 'blocked' && 'border-[#d46a4c] bg-[#ffe7dc] text-[#a43b24]',
    state !== 'ok' && state !== 'blocked' && 'border-animal-border bg-[#fffdf5] text-animal-text-body',
  ),
  footer: 'flex flex-wrap justify-end gap-2',
}
