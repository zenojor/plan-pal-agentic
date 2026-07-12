import classNames from 'classnames'

const nativeButtonBase = 'cursor-pointer rounded-[var(--animal-radius-pill)] border-2 text-sm font-bold tracking-[0.01em] transition disabled:cursor-not-allowed disabled:opacity-60'
const inputBase = 'min-w-0 rounded-[var(--animal-radius-pill)] border-[2.5px] border-animal-border bg-[#fffdf5] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)] outline-none transition hover:-translate-y-px hover:border-[var(--animal-border-hover)] focus:border-[var(--animal-focus-yellow)] focus:shadow-[0_3px_0_var(--animal-focus-yellow-d),0_0_0_3px_rgba(255,204,0,0.16)]'

export const appClasses = {
  shell: (isWorkspaceRoute: boolean) => classNames(
    'min-h-[100svh] bg-animal-bg',
    isWorkspaceRoute
      ? 'bg-animal-grid'
      : 'bg-[#fcfaf5] pb-10',
  ),
  topbar: classNames(
    'sticky top-0 z-50 border-b border-[rgba(196,184,158,0.38)]',
    'bg-[rgba(252,250,245,0.94)] px-[clamp(1rem,3vw,2.5rem)] backdrop-blur-[16px]',
  ),
  topbarInner: 'mx-auto flex min-h-[70px] w-full max-w-[1180px] items-center justify-between gap-4 max-[560px]:min-h-[62px] max-[560px]:gap-2',
  brand: 'inline-flex min-w-0 items-center gap-3.5 text-animal-text no-underline',
  brandMark: classNames(
    'grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#e9fff9] bg-animal-primary',
    'text-base font-black text-white shadow-[0_2px_0_var(--animal-primary-active)]',
    'transition hover:-translate-y-px max-[560px]:h-9 max-[560px]:w-9',
  ),
  brandCopy: 'grid min-w-0 gap-0.5 leading-none',
  brandTitle: 'text-[1.375rem] font-extrabold tracking-[-0.01em] text-animal-text max-[560px]:text-lg',
  brandTagline: 'text-xs font-semibold leading-4 text-[var(--animal-text-muted)] max-[520px]:hidden',
  topnav: 'flex shrink-0 items-center justify-end gap-2',
  topnavLink: (active = false) => classNames(
    'inline-flex min-h-10 items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-base font-bold text-animal-text no-underline transition',
    'hover:bg-[rgba(230,249,246,0.72)] active:translate-y-[1px] max-[560px]:text-sm max-[430px]:px-2',
    active
      ? 'bg-animal-primary-bg text-[var(--animal-primary-active)]'
      : 'bg-transparent',
  ),
  eyebrow: 'text-xs font-bold uppercase leading-4 tracking-[0.12em] text-[var(--animal-primary-active)]',
  errorText: 'm-0 text-sm font-semibold leading-5 text-[var(--animal-error)]',
  statusText: 'm-0 rounded-[16px] bg-[#fff8dd] px-3 py-2 text-sm font-semibold leading-6 text-animal-text-body',
}

export const homeClasses = {
  root: classNames(
    'mx-auto grid min-h-[calc(100svh-70px)] w-full max-w-[1180px] content-start gap-7 bg-transparent',
    'px-[clamp(1rem,3vw,2rem)] pb-[clamp(2rem,4vw,3.5rem)] pt-[clamp(2rem,4.5vw,4rem)] text-animal-text-body',
    'max-[560px]:min-h-[calc(100svh-62px)] max-[560px]:gap-6 max-[560px]:pt-7',
  ),
  launchPad: 'relative isolate grid w-full gap-4',
  heroMain: 'grid min-w-0 content-start gap-3.5',
  launchCopy: 'relative z-10 grid max-w-[720px] gap-1.5',
  launchTitle: 'm-0 flex items-center text-[clamp(2.15rem,4.2vw,3.5rem)] font-extrabold leading-[1.08] tracking-[-0.01em] text-animal-text',
  launchSparkles: 'relative -mt-3 ml-2 inline-flex h-10 w-10 shrink-0 text-[#f1b84b] max-[560px]:-mt-2 max-[560px]:ml-1 max-[560px]:h-8 max-[560px]:w-8',
  launchSparkleLarge: 'absolute bottom-0 left-0',
  launchSparkleSmall: 'absolute right-0 top-0',
  launchText: 'm-0 max-w-[680px] text-[clamp(0.9375rem,1.5vw,1.125rem)] font-medium leading-7 text-animal-text-body',
  inputStack: 'grid gap-4',
  promptLabel: 'relative z-10 grid gap-3.5',
  promptLabelText: 'sr-only',
  promptShell: classNames(
    'grid min-h-[206px] min-w-0 grid-rows-[1fr_auto] overflow-hidden rounded-[22px] border-2 border-[rgba(159,146,125,0.62)] bg-[#fffdf5]',
    'shadow-[0_3px_0_var(--animal-shadow-input),0_12px_24px_rgba(61,52,40,0.07)] transition',
    'focus-within:border-[var(--animal-focus-yellow)] focus-within:shadow-[0_3px_0_var(--animal-focus-yellow-d),0_12px_24px_rgba(61,52,40,0.08)]',
    'max-[560px]:min-h-[192px] max-[560px]:rounded-[20px]',
  ),
  textarea: classNames(
    'min-h-[128px] w-full min-w-0 resize-none border-0 bg-transparent px-5 py-4',
    'text-base font-medium leading-7 text-animal-text-body outline-none placeholder:font-normal placeholder:text-[#c8b79c] focus-visible:outline-none',
    'max-[560px]:min-h-[118px] max-[560px]:px-4 max-[560px]:py-3.5 max-[560px]:text-[0.9375rem] max-[560px]:leading-6',
  ),
  promptActions: classNames(
    'flex min-w-0 items-center justify-between gap-3 bg-transparent px-5 pb-4 pt-1.5',
    'max-[560px]:grid max-[560px]:grid-cols-2 max-[560px]:px-4 max-[560px]:pb-3.5',
  ),
  promptSuggestions: 'flex min-w-0 flex-wrap items-center gap-3 max-[560px]:gap-2',
  promptSuggestionLabel: 'sr-only',
  promptSuggestionButton: classNames(
    'inline-flex min-h-[38px] min-w-[118px] items-center justify-center rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.58)] bg-[#fffdf5] px-3.5 py-1 max-[560px]:min-h-9 max-[560px]:min-w-0',
    'text-sm font-semibold text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)] transition hover:-translate-y-px hover:border-[rgba(25,200,185,0.48)] hover:bg-animal-primary-bg hover:text-[var(--animal-primary-active)] active:translate-y-px active:shadow-none',
  ),
  promptSuggestionIcon: 'mr-2 shrink-0 text-[#8c7557]',
  actionMeta: 'flex min-w-0 flex-wrap items-center gap-2 max-[560px]:contents',
  primaryButton: classNames(
    nativeButtonBase,
    'planpal-primary-cta inline-flex min-h-[44px] min-w-[142px] shrink-0 items-center justify-center gap-2 border-[#2db6a7] bg-[#43c7b5] px-5 py-2 text-[0.9375rem]',
    'shadow-[0_3px_0_rgba(32,151,139,0.32)] hover:-translate-y-px hover:bg-[#52cebd] hover:shadow-[0_4px_0_rgba(32,151,139,0.34)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(32,151,139,0.38)] disabled:text-white disabled:opacity-100 max-[560px]:min-w-0 max-[560px]:w-full',
  ),
  quickToggleState: 'inline-flex min-h-[42px] min-w-[138px] shrink-0 items-center justify-center gap-2 rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.68)] bg-[#fffdf5] px-4 py-1.5 text-sm font-semibold text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)] transition hover:-translate-y-px hover:border-animal-primary hover:bg-animal-primary-bg hover:text-[var(--animal-primary-active)] active:translate-y-[2px] active:shadow-none max-[560px]:min-w-0 max-[560px]:w-full',
  quickBody: 'grid gap-3 rounded-[20px] bg-[rgba(247,243,223,0.72)] p-4',
  controlStrip: 'grid grid-cols-4 items-stretch gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1',
  range: 'grid min-w-0 gap-2 rounded-[16px] border border-[rgba(196,184,158,0.46)] bg-[#fffdf7] p-3 text-[0.8125rem] font-bold leading-5 text-animal-text-body',
  segmentedGroup: 'grid min-w-0 gap-2 rounded-[16px] border border-[rgba(196,184,158,0.46)] bg-[#fffdf7] p-3',
  segmentedLabel: 'text-xs font-bold leading-4 text-[var(--animal-text-muted)]',
  segmentedOptions: 'flex flex-wrap gap-1.5',
  segmentedButton: (active: boolean) => classNames(
    'min-h-8 rounded-[var(--animal-radius-pill)] border-2 px-3 text-xs font-bold transition hover:-translate-y-px active:translate-y-[2px]',
    active
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5] text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  inlineInput: (topic = false) => classNames(
    inputBase,
    'min-h-12 border-[2.5px] bg-[#fffdf7] px-4 text-sm font-medium shadow-[0_3px_0_var(--animal-shadow-input)]',
    topic
      ? 'min-[521px]:col-span-2'
      : 'min-[521px]:col-span-2 min-[901px]:col-span-1',
  ),
  quickSubmit: classNames(
    nativeButtonBase,
    'min-h-10 justify-self-end border-[rgba(25,200,185,0.62)] bg-animal-primary-bg px-4 py-2 text-[0.8125rem] text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)] hover:-translate-y-px active:translate-y-[2px] active:shadow-none max-[520px]:w-full',
  ),
  launchError: 'm-0 rounded-[18px] border-2 border-[#d46a4c] bg-[#ffe7dc] p-3 text-sm font-semibold leading-5 text-[#a43b24] shadow-[0_3px_0_#d46a4c]',
  recentRail: 'grid w-full border-t border-[rgba(196,184,158,0.34)] bg-transparent',
  recentHeading: 'flex min-h-[52px] items-center justify-between gap-3 border-b border-[rgba(196,184,158,0.34)] px-1 py-2.5',
  recentHeadingCopy: 'grid min-w-0 gap-1',
  recentHeadingTitle: 'text-[1.0625rem] font-bold leading-6 text-animal-text',
  recentHeadingDescription: 'm-0 text-xs font-medium leading-5 text-[var(--animal-text-muted)]',
  recentHeadingMeta: 'shrink-0 text-xs font-semibold text-[var(--animal-text-muted)]',
  recentList: 'grid',
  recentItem: classNames(
    'group relative min-h-[52px] border-b border-[rgba(196,184,158,0.3)] px-3 py-1.5',
    'transition hover:bg-[rgba(230,249,246,0.3)]',
  ),
  recentLink: 'grid min-h-[39px] min-w-0 grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-x-5 gap-y-1 text-animal-text-body no-underline max-[760px]:pr-11 max-[620px]:grid-cols-1',
  recentTitle: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9375rem] font-medium leading-5 text-animal-text',
  recentMeta: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium leading-5 text-[var(--animal-text-secondary)]',
  recentChevron: 'grid h-5 w-5 place-items-center text-[#8c7557] max-[760px]:hidden',
  recentDelete: classNames(
    nativeButtonBase,
    'pointer-events-none absolute right-2.5 top-1/2 min-h-8 -translate-y-1/2 border-transparent bg-[#fcfaf5] px-2.5 py-1 text-xs text-[var(--animal-text-muted)] opacity-0 transition',
    'group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100 hover:bg-[#ffe7dc] hover:text-[#a43b24]',
    'max-[760px]:pointer-events-auto max-[760px]:opacity-100',
  ),
  recentFooter: classNames(
    'group grid min-h-[54px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-b border-t-0 border-[rgba(196,184,158,0.32)]',
    'bg-transparent px-3 py-2 text-left text-animal-text-body transition hover:bg-[#fff8dd] active:translate-y-[1px]',
  ),
  recentFooterCopy: 'grid min-w-0 gap-0.5',
  recentFooterTitle: 'text-sm font-extrabold leading-5 text-animal-text',
  recentFooterHint: 'text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  recentFooterAction: classNames(
    'inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-[var(--animal-radius-pill)]',
    'border border-[rgba(196,184,158,0.52)] bg-[#fffdf5] px-3 py-1 text-xs font-bold text-animal-text',
    'shadow-[0_2px_0_var(--animal-shadow-input)] transition group-hover:-translate-y-px group-hover:border-[rgba(25,200,185,0.48)] group-hover:bg-animal-primary-bg',
  ),
  note: 'mx-auto my-0 w-full text-[0.8125rem] font-medium leading-5 text-[var(--animal-text-muted)]',
  progress: 'grid gap-3 rounded-[20px] border border-[rgba(25,200,185,0.3)] bg-[#f2fffb] p-4',
  progressTitle: 'text-sm font-extrabold leading-5 text-animal-text',
  progressList: 'm-0 grid list-none grid-cols-[repeat(3,minmax(0,1fr))] gap-2 p-0 max-[640px]:grid-cols-1',
  progressStep: (state: string) => classNames(
    'flex items-center gap-2 rounded-[16px] border-2 px-3 py-2 text-[0.8125rem] font-bold leading-5',
    state === 'done' && 'border-animal-green bg-[#ecffd9] text-[#3d6d17]',
    state === 'active' && 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)]',
    state === 'pending' && 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5] text-[var(--animal-text-muted)]',
  ),
  progressDot: (state: string) => classNames(
    'h-2.5 w-2.5 rounded-full',
    state === 'done' ? 'bg-animal-green' : state === 'active' ? 'bg-animal-primary' : 'bg-animal-border',
  ),
  progressHint: 'text-xs font-medium leading-5 text-[var(--animal-text-muted)]',
}

export const settingsClasses = {
  page: 'grid min-h-[calc(100svh-64px)] place-items-start justify-items-center bg-transparent px-[clamp(1rem,3vw,2.5rem)] py-[clamp(1.25rem,3vw,2.5rem)]',
  card: classNames(
    'grid w-full max-w-[1080px] gap-6 overflow-hidden rounded-[30px] border-2 border-animal-border',
    'bg-[#fffaf0] p-[clamp(1.1rem,3vw,2.25rem)] shadow-[0_6px_0_var(--animal-shadow-input),0_20px_44px_rgba(61,52,40,0.12)]',
  ),
  header: 'grid grid-cols-[64px_minmax(0,1fr)] items-center gap-4 max-[560px]:grid-cols-[52px_minmax(0,1fr)]',
  headerIcon: 'grid h-16 w-16 place-items-center rounded-[22px] border-2 border-[#fff4be] bg-[var(--animal-focus-yellow)] text-2xl font-black text-animal-text shadow-[0_5px_0_var(--animal-focus-yellow-d)] max-[560px]:h-13 max-[560px]:w-13',
  headerCopy: 'grid min-w-0 gap-1.5',
  title: 'm-0 text-[clamp(1.85rem,3.6vw,2.75rem)] font-black leading-tight text-animal-text',
  paragraph: 'm-0 max-w-[760px] text-sm font-medium leading-6 text-animal-text-body',
  layout: 'grid grid-cols-[minmax(250px,0.72fr)_minmax(0,1.28fr)] items-start gap-5 max-[820px]:grid-cols-1',
  sidebar: 'grid gap-4',
  hint: 'm-0 rounded-[20px] border border-[rgba(196,184,158,0.5)] bg-[#fff8dd] p-4 text-[0.8125rem] font-medium leading-6 text-[var(--animal-text-muted)]',
  summary: 'grid gap-1.5 rounded-[22px] border-2 border-[rgba(25,200,185,0.42)] bg-animal-primary-bg p-4 shadow-[0_3px_0_rgba(17,168,155,0.2)]',
  summaryTitle: 'text-sm font-extrabold leading-5 text-animal-text',
  summaryLine: 'min-w-0 [overflow-wrap:anywhere] text-xs font-medium leading-5 text-animal-text-body',
  dirty: 'justify-self-start rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-3 py-1.5 text-xs font-bold not-italic text-animal-text',
  formPanel: 'grid gap-5 rounded-[24px] border-2 border-[rgba(196,184,158,0.52)] bg-[#fffdf5] p-5 shadow-[0_3px_0_rgba(196,184,158,0.4)] max-[560px]:p-4',
  sectionHeading: 'grid gap-1',
  sectionTitle: 'text-base font-extrabold leading-6 text-animal-text',
  sectionText: 'm-0 text-xs font-medium leading-5 text-[var(--animal-text-muted)]',
  presetGrid: 'grid grid-cols-2 gap-3 max-[560px]:grid-cols-1',
  presetButton: (active: boolean) => classNames(
    'grid min-h-[112px] gap-1.5 rounded-[20px] border-2 p-4 text-left transition hover:-translate-y-px active:translate-y-[1px]',
    active
      ? 'border-[var(--animal-primary-active)] bg-animal-primary-bg shadow-[0_4px_0_var(--animal-primary-active)]'
      : 'border-animal-border bg-[#fffaf0] shadow-[0_3px_0_var(--animal-shadow-input)] hover:border-[rgba(25,200,185,0.5)]',
  ),
  fields: 'grid grid-cols-2 gap-4 max-[620px]:grid-cols-1',
  wideField: 'col-span-2 max-[620px]:col-span-1',
  label: 'grid gap-2 text-[0.8125rem] font-bold leading-5 text-animal-text-body',
  input: classNames(inputBase, 'min-h-12 px-4 text-sm font-medium'),
  buttonRow: 'flex flex-wrap gap-3 border-t-2 border-[rgba(196,184,158,0.28)] pt-5',
  button: classNames(nativeButtonBase, 'min-h-11 border-animal-primary bg-animal-primary px-5 py-2 text-white shadow-[0_4px_0_var(--animal-primary-active)] hover:-translate-y-px active:translate-y-[2px] active:shadow-[0_2px_0_var(--animal-primary-active)]'),
  secondaryButton: classNames(nativeButtonBase, 'min-h-11 border-animal-border bg-[#fffaf5] px-5 py-2 text-animal-text-body shadow-[0_4px_0_var(--animal-shadow-input)] hover:-translate-y-px hover:border-[rgba(25,200,185,0.52)] active:translate-y-[2px]'),
  dangerButton: classNames(nativeButtonBase, 'min-h-11 border-[#d46a4c] bg-[#ffe7dc] px-5 py-2 text-[#a43b24] shadow-[0_4px_0_#d46a4c] hover:-translate-y-px active:translate-y-[2px]'),
}

export const modalClasses = {
  backdrop: 'fixed inset-0 z-[100] grid place-items-center bg-[rgba(61,52,40,0.34)] p-4 backdrop-blur-sm',
  modal: classNames(
    'grid w-full max-w-[720px] max-h-[min(82svh,760px)] gap-4 overflow-auto',
    'rounded-[24px] border-2 border-animal-border bg-animal-bg-light p-5',
    'shadow-[0_8px_0_var(--animal-shadow-input),0_24px_60px_rgba(61,52,40,0.24)]',
  ),
  title: 'm-0 text-xl font-extrabold leading-tight text-animal-text',
  text: 'm-0 text-sm font-medium leading-6 text-animal-text-body',
  nodeList: 'grid gap-2',
  nodeItem: 'grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-2 rounded-[18px] bg-[#fffdf5] p-2 max-[640px]:grid-cols-[34px_minmax(0,1fr)]',
  nodeIndex: 'grid h-8 w-8 place-items-center rounded-full bg-animal-primary text-xs font-black text-white shadow-[0_2px_0_var(--animal-primary-active)]',
  nodeTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] font-extrabold text-animal-text',
  nodeMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-[var(--animal-text-muted)]',
  nodeStatus: 'rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2 py-1 text-xs font-bold text-animal-text',
  warningList: 'flex flex-wrap gap-2',
  warning: (state: string) => classNames(
    'rounded-[var(--animal-radius-pill)] border-2 px-2.5 py-1 text-xs font-bold',
    state === 'ok' && 'border-animal-green bg-[#ecffd9] text-[#3d6d17]',
    state === 'blocked' && 'border-[#d46a4c] bg-[#ffe7dc] text-[#a43b24]',
    state !== 'ok' && state !== 'blocked' && 'border-animal-border bg-[#fffdf5] text-animal-text-body',
  ),
  footer: 'flex flex-wrap justify-end gap-2',
}
