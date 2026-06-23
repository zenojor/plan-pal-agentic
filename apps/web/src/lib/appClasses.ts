import classNames from 'classnames'

const pillBase = 'inline-flex items-center justify-center rounded-[var(--animal-radius-pill)] border-2 font-[900] no-underline transition'
const nativeButtonBase = 'cursor-pointer rounded-[var(--animal-radius-pill)] border-2 font-[900] transition disabled:cursor-not-allowed disabled:opacity-60'
const inputBase = 'min-w-0 rounded-[18px] border-2 border-animal-border bg-[#fffdf5] text-animal-text-body outline-none transition focus:border-animal-primary focus:shadow-[0_0_0_3px_rgba(25,200,185,0.16)]'

export const appClasses = {
  shell: (isWorkspaceRoute: boolean) => classNames(
    'min-h-[100svh]',
    isWorkspaceRoute ? 'bg-animal-bg' : 'bg-animal-bg bg-animal-grid',
  ),
  topbar: classNames(
    'sticky top-0 z-50 flex items-center justify-between gap-4',
    'border-b-2 border-[rgba(196,184,158,0.5)] bg-[rgba(255,249,232,0.94)]',
    'px-[clamp(1rem,3vw,2rem)] py-[0.78rem] backdrop-blur-[14px]',
    'max-[760px]:flex-wrap',
  ),
  brand: 'inline-flex items-center gap-[0.65rem] text-animal-text no-underline font-[900]',
  brandMark: classNames(
    'grid h-9 w-9 place-items-center rounded-full bg-animal-primary',
    'text-white shadow-[0_3px_0_var(--animal-primary-active)]',
  ),
  topnav: 'flex flex-wrap items-center justify-end gap-2',
  topnavLink: (active = false) => classNames(
    'rounded-[var(--animal-radius-pill)] px-3 py-1.5 text-sm font-[900] text-animal-text no-underline transition',
    active && 'bg-animal-primary-bg text-[var(--animal-primary-active)]',
  ),
  eyebrow: 'text-[0.72rem] font-[950] uppercase tracking-[0.08em] text-[var(--animal-primary-active)]',
  errorText: 'm-0 text-[0.84rem] font-[850] text-[var(--animal-error)]',
  statusText: 'm-0 text-[0.84rem] font-[850] text-animal-text-body',
}

export const homeClasses = {
  root: classNames(
    'grid min-h-[100svh] content-start gap-4 bg-animal-bg bg-animal-grid',
    'px-[clamp(1rem,4vw,3rem)] py-4 text-animal-text-body',
  ),
  topbar: 'flex min-w-0 items-center justify-between gap-3',
  brand: classNames(
    'inline-flex min-h-10 items-center gap-2 rounded-[var(--animal-radius-pill)]',
    'border-2 border-[rgba(196,184,158,0.72)] bg-animal-bg-light px-3 py-1.5',
    'font-[950] text-animal-text no-underline shadow-[0_3px_0_var(--animal-shadow-input)]',
  ),
  brandMark: 'grid h-7 w-7 place-items-center rounded-full bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]',
  modelLink: (ready: boolean) => classNames(
    pillBase,
    'min-h-10 max-w-[52vw] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-1.5 text-[0.78rem]',
    ready
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_3px_0_var(--animal-primary-active)]'
      : 'border-animal-border bg-animal-bg-light text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)]',
  ),
  launchPad: classNames(
    'grid gap-4 rounded-[28px] border-2 border-[rgba(196,184,158,0.74)]',
    'bg-[rgba(255,249,232,0.94)] p-[clamp(1rem,3vw,2rem)] shadow-[0_5px_0_var(--animal-shadow-input),0_16px_36px_rgba(61,52,40,0.12)]',
  ),
  launchCopy: 'grid max-w-[760px] gap-2',
  launchTitle: 'm-0 text-[clamp(2rem,6vw,4.8rem)] font-[950] leading-[0.98] text-animal-text',
  launchText: 'm-0 max-w-[680px] text-[clamp(0.95rem,1.5vw,1.16rem)] font-[800] leading-[1.55] text-animal-text-body',
  inputStack: 'grid gap-3',
  textarea: classNames(
    inputBase,
    'min-h-[132px] resize-y p-4 text-[1rem] font-[820] leading-[1.6]',
  ),
  quickPanel: (open: boolean) => classNames(
    'grid gap-3 rounded-[22px] border-2 border-[rgba(196,184,158,0.62)] bg-[#fffdf5] p-2',
    open && 'border-animal-primary bg-animal-primary-bg',
  ),
  quickToggle: classNames(
    'flex w-full items-center justify-between gap-3 rounded-[18px] border-0 bg-transparent p-2 text-left',
    'cursor-pointer text-animal-text-body',
  ),
  quickToggleCopy: 'grid min-w-0 gap-0.5',
  quickToggleTitle: 'text-[0.9rem] font-[950] text-animal-text',
  quickToggleHint: 'text-[0.74rem] font-[820] text-[var(--animal-text-muted)]',
  quickToggleState: 'shrink-0 rounded-[var(--animal-radius-pill)] bg-animal-primary px-3 py-1 text-[0.72rem] font-[950] text-white',
  quickBody: 'grid gap-3',
  controlStrip: 'grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2',
  range: 'grid min-w-0 gap-1 rounded-[16px] bg-[#fffaf0] p-2 text-[0.78rem] font-[850] text-animal-text-body',
  segmentedGroup: 'grid min-w-0 gap-1 rounded-[16px] bg-[#fffaf0] p-2',
  segmentedLabel: 'text-[0.72rem] font-[900] text-[var(--animal-text-muted)]',
  segmentedOptions: 'grid grid-cols-3 gap-1',
  segmentedButton: (active: boolean) => classNames(
    'min-h-8 rounded-[var(--animal-radius-pill)] border-2 px-2 text-[0.76rem] font-[900] transition',
    active
      ? 'border-animal-primary bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5] text-animal-text-body',
  ),
  inlineInput: (topic = false) => classNames(inputBase, 'min-h-[42px] px-3 text-[0.84rem] font-[850]', topic && 'md:col-span-2'),
  quickSubmit: classNames(
    nativeButtonBase,
    'justify-self-start border-animal-primary bg-animal-primary px-4 py-2 text-white shadow-[0_3px_0_var(--animal-primary-active)]',
  ),
  actionRow: 'flex flex-wrap gap-2',
  primaryButton: classNames(
    nativeButtonBase,
    'border-animal-primary bg-animal-primary px-5 py-2.5 text-white shadow-[0_4px_0_var(--animal-primary-active)]',
  ),
  launchError: 'rounded-[18px] border-2 border-[#d46a4c] bg-[#ffe7dc] p-3 text-[#a43b24]',
  promptRail: classNames(
    'grid gap-2 rounded-[24px] border-2 border-[rgba(196,184,158,0.58)] bg-[rgba(255,249,232,0.82)] p-3',
    'md:grid-cols-[auto_repeat(4,minmax(0,1fr))] md:items-stretch',
  ),
  promptRailLabel: 'self-center text-[0.78rem] font-[950] text-[var(--animal-text-muted)]',
  promptButton: classNames(
    'grid min-w-0 gap-1 rounded-[18px] border-2 border-[rgba(196,184,158,0.62)] bg-[#fffdf5] p-3 text-left',
    'font-[900] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)] transition hover:-translate-y-px',
  ),
  promptButtonTitle: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.86rem] font-[950] text-animal-text',
  promptButtonSummary: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[820] text-[var(--animal-text-muted)]',
  recentRail: 'grid gap-2 rounded-[24px] border-2 border-[rgba(196,184,158,0.58)] bg-[#fffdf5] p-3',
  recentHeading: 'flex items-center justify-between gap-2',
  recentHeadingTitle: 'text-[0.9rem] font-[950] text-animal-text',
  recentHeadingMeta: 'text-[0.72rem] font-[850] text-[var(--animal-text-muted)]',
  recentList: 'grid gap-2',
  recentItem: 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[16px] bg-[#fffaf0] p-2',
  recentLink: 'grid min-w-0 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-baseline gap-2 text-animal-text-body no-underline max-[760px]:grid-cols-1',
  recentTitle: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.86rem] font-[950] text-animal-text',
  recentMeta: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[830] text-[var(--animal-text-muted)]',
  recentDelete: classNames(nativeButtonBase, 'min-h-[30px] border-animal-border bg-[#fffdf5] px-2.5 py-1 text-[0.72rem] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]'),
  note: 'm-0 text-[0.78rem] font-[820] text-[var(--animal-text-muted)]',
  progress: 'grid gap-2 rounded-[20px] border-2 border-[rgba(25,200,185,0.34)] bg-[#f2fffb] p-3',
  progressTitle: 'text-[0.9rem] font-[950] text-animal-text',
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
  page: 'grid min-h-[calc(100svh-70px)] place-items-start justify-items-center bg-animal-bg bg-animal-grid px-4 py-6',
  card: classNames(
    'grid w-full max-w-[760px] gap-3 rounded-[var(--animal-radius-lg)] border-2 border-animal-border',
    'bg-animal-bg-light p-[clamp(1rem,3vw,2rem)] shadow-[0_5px_0_var(--animal-shadow-input),0_12px_28px_rgba(61,52,40,0.14)]',
  ),
  title: 'm-0 text-[clamp(1.8rem,4vw,3rem)] font-[950] leading-tight text-animal-text',
  paragraph: 'm-0 text-[0.92rem] font-[800] leading-[1.55] text-animal-text-body',
  hint: 'rounded-[18px] bg-[#fffdf5] p-3 text-[0.84rem] font-[820] text-[var(--animal-text-muted)]',
  summary: 'grid gap-1 rounded-[18px] border-2 border-[rgba(196,184,158,0.56)] bg-[#fffdf5] p-3',
  summaryTitle: 'text-[0.9rem] font-[950] text-animal-text',
  summaryLine: 'min-w-0 [overflow-wrap:anywhere] text-[0.78rem] font-[820] text-animal-text-body',
  dirty: 'justify-self-start rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2.5 py-1 text-[0.72rem] font-[950] text-animal-text',
  presetGrid: 'grid grid-cols-2 gap-3 max-[640px]:grid-cols-1',
  presetButton: (active: boolean) => classNames(
    'grid min-h-[112px] gap-1 rounded-[var(--animal-radius)] border-2 p-3 text-left shadow-[0_3px_0_var(--animal-shadow-input)] transition hover:-translate-y-px',
    active
      ? 'border-[var(--animal-primary-active)] bg-animal-primary-bg shadow-[0_3px_0_var(--animal-primary-active)]'
      : 'border-animal-border bg-[#fffdf5]',
  ),
  label: 'grid gap-1 text-[0.78rem] font-[900] text-animal-text-body',
  input: classNames(inputBase, 'min-h-10 px-3 text-[0.88rem] font-[850]'),
  buttonRow: 'flex flex-wrap gap-2',
  button: classNames(nativeButtonBase, 'border-animal-primary bg-animal-primary px-4 py-2 text-white shadow-[0_3px_0_var(--animal-primary-active)]'),
  secondaryButton: classNames(nativeButtonBase, 'border-animal-border bg-[#fffdf5] px-4 py-2 text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)]'),
  dangerButton: classNames(nativeButtonBase, 'border-[#d46a4c] bg-[#ffe7dc] px-4 py-2 text-[#a43b24] shadow-[0_3px_0_#d46a4c]'),
}

export const modalClasses = {
  backdrop: 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(61,52,40,0.34)] p-4 backdrop-blur-sm',
  modal: classNames(
    'grid w-full max-w-[720px] max-h-[min(82svh,760px)] gap-4 overflow-auto',
    'rounded-[28px] border-2 border-animal-border bg-animal-bg-light p-5',
    'shadow-[0_8px_0_var(--animal-shadow-input),0_24px_60px_rgba(61,52,40,0.24)]',
  ),
  title: 'm-0 text-[1.35rem] font-[950] leading-tight text-animal-text',
  text: 'm-0 text-[0.88rem] font-[820] leading-[1.55] text-animal-text-body',
  nodeList: 'grid gap-2',
  nodeItem: 'grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 rounded-[18px] bg-[#fffdf5] p-2 max-[640px]:grid-cols-[34px_minmax(0,1fr)]',
  nodeIndex: 'grid h-8 w-8 place-items-center rounded-full bg-animal-primary text-[0.78rem] font-[950] text-white shadow-[0_2px_0_var(--animal-primary-active)]',
  nodeTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.84rem] font-[950] text-animal-text',
  nodeMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[820] text-[var(--animal-text-muted)]',
  nodeStatus: 'rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2 py-1 text-[0.7rem] font-[950] text-animal-text',
  warningList: 'flex flex-wrap gap-2',
  warning: (state: string) => classNames(
    'rounded-[var(--animal-radius-pill)] border-2 px-2.5 py-1 text-[0.72rem] font-[900]',
    state === 'ok' && 'border-animal-green bg-[#ecffd9] text-[#3d6d17]',
    state === 'blocked' && 'border-[#d46a4c] bg-[#ffe7dc] text-[#a43b24]',
    state !== 'ok' && state !== 'blocked' && 'border-animal-border bg-[#fffdf5] text-animal-text-body',
  ),
  footer: 'flex flex-wrap justify-end gap-2',
}
