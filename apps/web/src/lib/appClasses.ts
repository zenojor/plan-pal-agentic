import classNames from 'classnames'

const nativeButtonBase = 'cursor-pointer rounded-[var(--animal-radius-pill)] border-2 text-sm font-bold tracking-[0.01em] transition disabled:cursor-not-allowed disabled:opacity-60'
const inputBase = 'min-w-0 rounded-[var(--animal-radius-pill)] border-[2.5px] border-animal-border bg-[#fffdf5] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)] outline-none transition hover:-translate-y-px hover:border-[var(--animal-border-hover)] focus:border-[var(--animal-focus-yellow)] focus:shadow-[0_3px_0_var(--animal-focus-yellow-d),0_0_0_3px_rgba(255,204,0,0.16)]'

export const appClasses = {
  shell: (isWorkspaceRoute: boolean, isHomeRoute = false) => classNames(
    'min-h-[100svh] bg-animal-bg',
    isWorkspaceRoute
      ? 'bg-animal-grid'
      : isHomeRoute
        ? 'bg-animal-bg'
        : 'bg-[#fcfaf5] pb-10',
  ),
  homeTopbar: 'pointer-events-none absolute inset-x-0 top-0 z-40 px-[clamp(1rem,3vw,2.5rem)]',
  homeTopbarInner: 'mx-auto grid min-h-[96px] w-full max-w-[1180px] grid-cols-[1fr_auto_1fr] items-start pt-6 max-[560px]:min-h-[80px] max-[560px]:grid-cols-[1fr_auto] max-[560px]:pt-4',
  homeBrand: classNames(
    'pointer-events-auto col-start-2 inline-flex min-h-[48px] items-center gap-3 rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.58)]',
    'bg-[rgba(255,253,245,0.92)] px-4 py-2 text-animal-text no-underline shadow-[0_3px_0_rgba(212,201,180,0.72)] backdrop-blur-[10px]',
    'transition hover:-translate-y-px hover:border-[rgba(168,152,120,0.8)] hover:shadow-[0_4px_0_rgba(212,201,180,0.8)] active:translate-y-[2px] active:shadow-[0_1px_0_rgba(212,201,180,0.7)]',
    'max-[560px]:col-start-1 max-[560px]:justify-self-start max-[560px]:gap-2.5 max-[560px]:px-3.5',
  ),
  homeBrandDivider: 'h-6 w-0.5 rounded-full bg-[rgba(196,184,158,0.62)]',
  homeBrandTag: 'text-sm font-bold text-[var(--animal-text-secondary)] max-[390px]:hidden',
  homeSettings: classNames(
    'pointer-events-auto col-start-3 row-start-1 inline-flex min-h-[44px] items-center justify-center justify-self-end gap-2 rounded-[var(--animal-radius-pill)]',
    'border-2 border-transparent bg-transparent px-3.5 py-2 text-sm font-bold text-animal-text no-underline transition',
    'hover:-translate-y-px hover:border-[rgba(196,184,158,0.56)] hover:bg-[rgba(255,253,245,0.82)] hover:shadow-[0_3px_0_rgba(212,201,180,0.64)] active:translate-y-[2px] active:shadow-none',
    'max-[560px]:col-start-2 max-[560px]:px-2.5 max-[460px]:[&>span]:hidden',
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
    'planpal-home-root relative isolate grid min-h-[100svh] w-full content-start overflow-hidden text-animal-text-body',
    'px-[clamp(1rem,3vw,2rem)] pb-[clamp(5rem,10vw,8rem)]',
  ),
  landscape: 'planpal-home-landscape pointer-events-none absolute inset-x-0 bottom-0 z-0',
  launchPad: classNames(
    'relative z-10 mx-auto grid w-full max-w-[920px] justify-items-center gap-6',
    'pb-[clamp(5rem,10vh,8rem)] pt-[clamp(9rem,20vh,13rem)]',
    'max-[700px]:gap-5 max-[700px]:pt-[7.5rem]',
  ),
  heroMain: 'grid w-full max-w-[860px] min-w-0 content-start gap-4',
  launchCopy: 'relative z-10 grid justify-items-center gap-2 text-center',
  heroMascot: classNames(
    'mb-1 grid h-14 w-14 place-items-center rounded-full border-2 border-[#f2bf42] bg-[#ffd262]',
    'text-xl font-black text-animal-text shadow-[0_5px_0_#e2ad26] motion-safe:animate-[planpal-bob_3.2s_ease-in-out_infinite]',
    'max-[560px]:h-12 max-[560px]:w-12 max-[560px]:text-lg',
  ),
  launchTitle: 'm-0 text-[clamp(2.5rem,5.3vw,4.5rem)] font-black leading-[1.08] tracking-[-0.035em] text-animal-text max-[560px]:text-[clamp(2.3rem,11vw,3.25rem)]',
  launchSparkles: 'relative -mt-3 ml-2 inline-flex h-10 w-10 shrink-0 text-[#f1b84b] max-[560px]:hidden',
  launchSparkleLarge: 'absolute bottom-0 left-0',
  launchSparkleSmall: 'absolute right-0 top-0',
  launchText: 'm-0 max-w-[680px] text-[clamp(0.9375rem,1.5vw,1.075rem)] font-semibold leading-7 text-[var(--animal-text-muted)]',
  inputStack: 'grid gap-5',
  promptLabel: 'relative z-10 grid gap-4',
  promptLabelText: 'sr-only',
  promptShell: classNames(
    'grid min-h-[190px] min-w-0 grid-rows-[1fr_auto] overflow-hidden rounded-[28px] border-[2.5px] border-[rgba(159,146,125,0.7)] bg-[var(--animal-bg-content)]',
    'shadow-[0_8px_0_rgba(212,201,180,0.92),0_20px_42px_rgba(61,52,40,0.13)] transition-[border-color,box-shadow,transform] duration-300',
    'hover:-translate-y-px hover:border-[rgba(168,152,120,0.9)] hover:shadow-[0_9px_0_rgba(212,201,180,0.95),0_24px_48px_rgba(61,52,40,0.14)]',
    'focus-within:translate-y-0 focus-within:border-[var(--animal-focus-yellow)] focus-within:shadow-[0_6px_0_var(--animal-focus-yellow-d),0_0_0_4px_rgba(255,204,0,0.13),0_22px_44px_rgba(61,52,40,0.12)]',
    'max-[560px]:min-h-[210px] max-[560px]:rounded-[24px]',
  ),
  textarea: classNames(
    'min-h-[118px] w-full min-w-0 resize-none border-0 bg-transparent px-7 py-5',
    'text-[1.0625rem] font-semibold leading-7 text-animal-text-body outline-none placeholder:font-semibold placeholder:text-[#aa9a80] focus-visible:outline-none',
    'max-[560px]:min-h-[132px] max-[560px]:px-5 max-[560px]:py-4 max-[560px]:text-base max-[560px]:leading-6',
  ),
  promptActions: classNames(
    'grid min-w-0 grid-cols-[auto_1fr_auto] items-center gap-4 bg-transparent px-6 pb-5 pt-1',
    'max-[640px]:grid-cols-[1fr_auto] max-[640px]:gap-3 max-[640px]:px-5 max-[640px]:pb-4',
  ),
  promptSuggestions: 'mx-auto flex max-w-[760px] min-w-0 flex-wrap items-center justify-center gap-3 max-[560px]:gap-2',
  promptSuggestionLabel: 'sr-only',
  promptSuggestionButton: classNames(
    'inline-flex min-h-[40px] max-w-[230px] items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.8)] bg-[rgba(255,253,245,0.88)] px-4 py-1.5',
    'text-sm font-bold text-animal-text-body shadow-[0_3px_0_rgba(212,201,180,0.84)] transition hover:-translate-y-px hover:border-[rgba(25,200,185,0.6)] hover:bg-animal-primary-bg hover:text-[var(--animal-primary-active)] active:translate-y-[2px] active:shadow-none',
    'max-[560px]:min-h-9 max-[560px]:max-w-full max-[560px]:px-3 max-[560px]:text-[0.8125rem]',
  ),
  promptSuggestionIcon: 'mr-2 shrink-0 text-[#8c7557]',
  actionMeta: 'flex min-w-0 flex-wrap items-center gap-2',
  connectionMeta: 'justify-self-end text-xs font-bold text-[var(--animal-text-secondary)] max-[640px]:col-span-2 max-[640px]:row-start-2 max-[640px]:justify-self-center',
  primaryButton: classNames(
    nativeButtonBase,
    'inline-flex min-h-[46px] min-w-[126px] shrink-0 items-center justify-center gap-2 border-[#f0bd3d] bg-[#ffd969] px-5 py-2 text-[0.9375rem] text-animal-text',
    'shadow-[0_5px_0_#dca92c] hover:-translate-y-px hover:bg-[#ffe07d] hover:shadow-[0_6px_0_#dca92c] active:translate-y-[3px] active:shadow-[0_2px_0_#dca92c]',
    'disabled:border-[#eee4c7] disabled:bg-[#fff9e8] disabled:text-[#c4b89e] disabled:shadow-[0_3px_0_#ded3bd] disabled:opacity-100 max-[560px]:min-w-[112px]',
  ),
  quickToggleState: classNames(
    'inline-flex min-h-[44px] min-w-[126px] shrink-0 items-center justify-center gap-2 rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.82)]',
    'bg-[#fffdf5] px-4 py-1.5 text-sm font-bold text-animal-text-body shadow-[0_4px_0_var(--animal-shadow-input)] transition',
    'hover:-translate-y-px hover:border-animal-primary hover:bg-animal-primary-bg hover:text-[var(--animal-primary-active)] hover:shadow-[0_5px_0_var(--animal-shadow-input)] active:translate-y-[3px] active:shadow-[0_1px_0_var(--animal-shadow-input)]',
  ),
  quickBackdrop: 'planpal-quick-backdrop fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[rgba(61,52,40,0.38)] p-5 backdrop-blur-[3px] max-[560px]:items-end max-[560px]:p-0',
  quickDialog: classNames(
    'planpal-quick-dialog relative grid max-h-[calc(100svh-40px)] w-full max-w-[880px] overflow-y-auto rounded-[30px] border-2 border-[rgba(196,184,158,0.88)]',
    'bg-[#fffdf6] shadow-[0_9px_0_rgba(212,201,180,0.94),0_28px_70px_rgba(61,52,40,0.28)]',
    'max-[560px]:max-h-[92svh] max-[560px]:rounded-b-none max-[560px]:rounded-t-[28px] max-[560px]:border-b-0',
  ),
  quickHeader: 'planpal-quick-header relative grid gap-1 border-b-2 border-[rgba(196,184,158,0.44)] px-[clamp(1.25rem,3vw,2rem)] pb-5 pt-5',
  quickBadge: 'w-fit rounded-[var(--animal-radius-pill)] border-2 border-[rgba(25,200,185,0.55)] bg-animal-primary-bg px-3 py-1 text-xs font-extrabold tracking-[0.03em] text-[var(--animal-primary-active)]',
  quickTitle: 'm-0 pr-14 text-[1.35rem] font-black leading-7 text-animal-text',
  quickDescription: 'm-0 pr-14 text-sm font-semibold leading-6 text-animal-text-body',
  quickClose: classNames(
    'absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border-2 border-[rgba(196,184,158,0.82)] bg-[#fffaf0]',
    'text-animal-text shadow-[0_4px_0_var(--animal-shadow-input)] transition hover:-translate-y-px hover:border-animal-primary hover:bg-animal-primary-bg active:translate-y-[3px] active:shadow-[0_1px_0_var(--animal-shadow-input)]',
  ),
  quickBody: 'grid gap-5 px-[clamp(1.25rem,3vw,2rem)] pb-6 pt-5',
  controlStrip: 'grid gap-5',
  range: 'grid min-w-0 gap-2 text-[0.8125rem] font-bold leading-5 text-animal-text-body',
  segmentedGroup: 'grid min-w-0 gap-2.5',
  segmentedLabel: 'planpal-field-label text-sm font-extrabold leading-5 text-animal-text',
  segmentedOptions: 'grid grid-cols-[repeat(var(--option-count),minmax(0,1fr))] gap-3 max-[560px]:grid-cols-2',
  segmentedButton: (active: boolean) => classNames(
    'min-h-[46px] rounded-[18px] border-2 px-3 text-sm font-extrabold transition hover:-translate-y-px active:translate-y-[3px]',
    active
      ? 'border-[var(--animal-primary-active)] bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_5px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.82)] bg-[#fffaf0] text-animal-text-body shadow-[0_5px_0_var(--animal-shadow-input)] hover:border-[rgba(25,200,185,0.55)]',
  ),
  inlineInput: (topic = false) => classNames(
    inputBase,
    'min-h-[48px] w-full border-[2.5px] bg-[var(--animal-bg-content)] px-4 text-sm font-semibold shadow-[0_4px_0_var(--animal-shadow-input)]',
    topic && 'min-[521px]:col-span-2',
  ),
  quickSubmit: classNames(
    nativeButtonBase,
    'min-h-[50px] w-full border-[#f0bd3d] bg-[#ffdc70] px-5 py-2 text-base text-animal-text shadow-[0_5px_0_#dca92c]',
    'hover:-translate-y-px hover:bg-[#ffe383] hover:shadow-[0_6px_0_#dca92c] active:translate-y-[3px] active:shadow-[0_2px_0_#dca92c]',
  ),
  timeControl: 'planpal-time-control relative grid gap-2 rounded-[24px] border-2 border-[rgba(196,184,158,0.82)] bg-[var(--animal-bg-content)] px-5 pb-4 pt-16 shadow-[0_5px_0_rgba(212,201,180,0.9)] max-[560px]:px-3',
  timeBubble: 'planpal-time-bubble absolute top-4 z-20 min-w-[154px] rounded-[var(--animal-radius-pill)] border-2 border-[rgba(25,200,185,0.52)] bg-animal-primary-bg px-4 py-1.5 text-center text-sm font-black text-animal-text shadow-[0_3px_0_rgba(17,168,155,0.38)]',
  timeRail: 'planpal-time-rail relative h-9',
  timeSelection: 'planpal-time-selection absolute top-[13px] h-3 rounded-[var(--animal-radius-pill)] bg-animal-primary shadow-[0_3px_0_var(--animal-primary-active)]',
  timeSlider: 'planpal-time-slider absolute inset-x-0 top-0 h-9 w-full',
  timeTicks: 'flex justify-between px-0.5 text-xs font-bold text-[var(--animal-text-secondary)]',
  timeTick: 'min-w-5 text-center first:text-left last:text-right',
  launchError: 'm-0 rounded-[18px] border-2 border-[#d46a4c] bg-[#ffe7dc] p-3 text-center text-sm font-semibold leading-5 text-[#a43b24] shadow-[0_3px_0_#d46a4c]',
  recentRail: classNames(
    'relative z-10 mx-auto mt-4 grid w-full max-w-[920px] overflow-hidden rounded-[26px] border-2 border-[rgba(196,184,158,0.64)]',
    'bg-[rgba(255,253,245,0.9)] shadow-[0_6px_0_rgba(212,201,180,0.78),0_18px_38px_rgba(61,52,40,0.1)] backdrop-blur-[8px]',
  ),
  recentHeading: 'flex min-h-[58px] items-center justify-between gap-3 border-b-2 border-[rgba(196,184,158,0.28)] px-5 py-3',
  recentHeadingCopy: 'grid min-w-0 gap-1',
  recentHeadingTitle: 'text-[1.0625rem] font-bold leading-6 text-animal-text',
  recentHeadingDescription: 'm-0 text-xs font-medium leading-5 text-[var(--animal-text-muted)]',
  recentHeadingMeta: 'shrink-0 text-xs font-semibold text-[var(--animal-text-muted)]',
  recentList: 'grid',
  recentItem: classNames(
    'group relative min-h-[56px] border-b border-[rgba(196,184,158,0.3)] px-5 py-2',
    'transition hover:bg-[rgba(230,249,246,0.46)]',
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
  note: 'mx-auto my-0 w-fit max-w-full rounded-[var(--animal-radius-pill)] bg-[rgba(255,253,245,0.76)] px-3 py-1.5 text-center text-[0.8125rem] font-semibold leading-5 text-[var(--animal-text-muted)] [&_a]:font-bold [&_a]:text-[var(--animal-primary-active)]',
  progress: 'grid gap-3 rounded-[22px] border-2 border-[rgba(25,200,185,0.34)] bg-[#f2fffb] p-4 shadow-[0_4px_0_rgba(17,168,155,0.22)]',
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
