import classNames from 'classnames'
import { workspacePrimitives } from './workspacePrimitives'

export const agentChatClasses = {
  root: classNames(
    'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden',
    'bg-[linear-gradient(180deg,#fffdf7_0%,#fff8e8_100%)]',
  ),
  scroll: classNames(
    workspacePrimitives.scrollColumn,
    'relative grid content-start gap-3.5 p-3.5 max-[760px]:gap-3 max-[760px]:p-3',
  ),
  statusStrip: classNames(
    'flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-[20px]',
    'border border-[rgba(159,146,125,0.28)] bg-[rgba(255,255,255,0.68)] px-3 py-2.5 backdrop-blur-sm',
    'shadow-[0_1px_0_rgba(196,184,158,0.48),0_8px_20px_rgba(61,52,40,0.045)]',
  ),
  statusMain: 'grid min-w-[180px] flex-1 grid-cols-[36px_minmax(0,1fr)] items-center gap-2.5',
  statusCopy: 'grid min-w-0 gap-px',
  statusIcon: classNames(
    'inline-grid h-9 w-9 place-items-center rounded-[14px] border-2 border-[rgba(159,146,125,0.42)]',
    'bg-[#fff3c4] shadow-[0_2px_0_#dba90e]',
  ),
  statusKicker: 'text-xs font-bold leading-4 tracking-[0.04em] text-[var(--animal-primary-active)]',
  statusTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold leading-5 text-animal-text',
  statusMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  statusChips: 'flex min-w-0 flex-wrap justify-end gap-1.5 max-[420px]:w-full max-[420px]:justify-start',
  statusChip: (primary = false) => classNames(
    'inline-flex min-h-6 max-w-full items-center rounded-[var(--animal-radius-pill)] border px-2 py-0.5',
    'text-xs font-semibold leading-4',
    primary
      ? "border-[rgba(25,200,185,0.34)] bg-animal-primary-bg text-[var(--animal-primary-active)] before:mr-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-animal-primary before:content-['']"
      : 'border-transparent bg-[#f7f3df] text-[var(--animal-text-muted)]',
  ),
  emptyPanel: classNames(
    'relative grid min-w-0 gap-3 overflow-hidden rounded-[24px] border-2 border-[rgba(196,184,158,0.58)]',
    'bg-[linear-gradient(145deg,#fffdf5_0%,#f2fffb_100%)] p-4',
    'shadow-[0_3px_0_var(--animal-shadow-input),0_12px_26px_rgba(61,52,40,0.06)] max-[420px]:p-3',
  ),
  emptyState: 'grid min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-3',
  emptyIcon: classNames(
    'grid h-12 w-12 place-items-center rounded-[18px] border-2 border-[rgba(159,146,125,0.46)]',
    'bg-[#fff3c4] shadow-[0_3px_0_#dba90e,0_8px_16px_rgba(61,52,40,0.07)]',
  ),
  emptyTitle: 'block min-w-0 text-base font-bold leading-5 text-animal-text',
  emptyMeta: 'mt-1 block min-w-0 text-[0.8125rem] font-medium leading-5 text-[var(--animal-text-muted)]',
  suggestionHeading: classNames(
    'flex items-center gap-2 text-xs font-bold leading-4 tracking-[0.03em] text-[var(--animal-text-muted)]',
    "after:h-px after:flex-1 after:bg-[rgba(196,184,158,0.5)] after:content-['']",
  ),
  suggestionList: 'grid gap-2',
  suggestionButton: classNames(
    'grid min-w-0 grid-cols-[26px_minmax(0,1fr)] items-center gap-2.5 rounded-[18px] border-2',
    'border-[rgba(196,184,158,0.52)] bg-[rgba(255,253,245,0.88)] px-3 py-2.5 text-left',
    'text-sm font-semibold leading-5 text-animal-text-body shadow-[0_2px_0_var(--animal-shadow-input)]',
    'transition duration-200 hover:-translate-y-px hover:border-animal-primary hover:bg-animal-primary-bg hover:shadow-[0_3px_0_var(--animal-primary-active)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-animal-primary active:translate-y-[2px] active:shadow-none',
  ),
  suggestionIcon: classNames(
    'grid h-[26px] w-[26px] place-items-center rounded-full bg-animal-primary-bg',
    'text-xs font-black text-[var(--animal-primary-active)] shadow-[inset_0_0_0_1px_rgba(25,200,185,0.22)]',
  ),
  thread: 'grid max-w-full gap-4 py-0.5',
  turn: ({ role, receipt, hasAction }: { role: string; receipt?: boolean; hasAction?: boolean }) => classNames(
    'grid min-w-0 gap-3',
    role === 'user' ? 'justify-items-end' : 'justify-items-start',
    (receipt || hasAction) && 'w-full',
  ),
  bubble: ({ role, streaming, receipt }: { role: string; streaming?: boolean; receipt?: boolean }) => classNames(
    receipt
      ? [
        'inline-flex min-h-7 max-w-[min(90%,560px)] items-center gap-1.5 rounded-[var(--animal-radius-pill)]',
        'bg-[rgba(25,200,185,0.08)] px-3 py-1 text-xs font-semibold leading-5 text-[var(--animal-text-muted)]',
        "before:text-[var(--animal-primary-active)] before:content-['✓'] max-[420px]:max-w-full",
      ]
      : [
        'relative grid w-fit max-w-[min(88%,560px)] grid-cols-[32px_minmax(0,1fr)] gap-3',
        'border-2 px-3.5 py-3 text-sm font-medium leading-[1.62] [letter-spacing:0.01em]',
        'max-[760px]:max-w-[94%] max-[420px]:max-w-[97%] max-[420px]:grid-cols-[28px_minmax(0,1fr)] max-[420px]:gap-2.5 max-[420px]:px-3 max-[420px]:py-2.5',
        role === 'user'
          ? 'rounded-[22px_22px_9px_22px] border-[rgba(25,200,185,0.46)] bg-[#e9faf6] text-[#315f59] shadow-[0_3px_0_rgba(17,168,155,0.34),0_10px_22px_rgba(61,52,40,0.045)]'
          : 'rounded-[22px_22px_22px_9px] border-[rgba(196,184,158,0.64)] bg-[rgba(255,253,245,0.96)] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input),0_10px_22px_rgba(61,52,40,0.055)]',
        streaming && 'border-[rgba(245,195,28,0.58)] bg-[#fff9dd] shadow-[0_3px_0_#dba90e,0_10px_22px_rgba(61,52,40,0.05)]',
      ],
  ),
  bubbleAvatar: (user = false) => classNames(
    'grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold max-[420px]:h-7 max-[420px]:w-7',
    user
      ? 'border-[rgba(17,168,155,0.48)] bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.58)] bg-[#fff3c4] text-animal-text shadow-[0_2px_0_#dba90e]',
  ),
  bubbleText: 'm-0 min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]',
  actionAttachment: (floating = false) => classNames(
    'relative w-full min-w-0',
    floating ? 'pl-0' : 'pl-6 max-[420px]:pl-0',
    !floating && "before:absolute before:bottom-1 before:left-2 before:top-1 before:w-0.5 before:rounded-[var(--animal-radius-pill)] before:bg-[rgba(25,200,185,0.34)] before:content-[''] max-[420px]:before:hidden",
  ),
  pendingDock: classNames(
    'grid gap-2 rounded-[22px] border-2 border-[rgba(25,200,185,0.34)]',
    'bg-[rgba(242,255,251,0.78)] p-3 shadow-[0_2px_0_rgba(17,168,155,0.2),0_10px_20px_rgba(61,52,40,0.045)]',
  ),
  pendingDockLabel: 'text-xs font-bold leading-4 tracking-[0.04em] text-[var(--animal-primary-active)]',
  progressCard: classNames(
    'grid w-full min-w-0 gap-2 rounded-[18px] border border-[rgba(25,200,185,0.24)]',
    'bg-[rgba(242,255,251,0.72)] p-3 shadow-[0_2px_0_rgba(17,168,155,0.14)]',
  ),
  progressItem: 'grid grid-cols-[12px_minmax(0,1fr)] gap-2',
  progressDot: (state: string) => classNames(
    'mt-1 h-2.5 w-2.5 rounded-full shadow-[0_1px_0_rgba(61,52,40,0.18)]',
    state === 'done' ? 'bg-animal-green' : state === 'error' ? 'bg-[var(--animal-error)]' : 'bg-animal-primary',
  ),
  progressTitle: 'block text-[0.8125rem] font-bold leading-5 text-animal-text',
  progressMeta: 'block text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  streamingPill: classNames(
    'inline-flex justify-self-start rounded-[var(--animal-radius-pill)] bg-[#fff9dd] px-3 py-2',
    'text-[0.8125rem] font-semibold leading-5 text-animal-text-body',
    "before:mr-2 before:mt-[0.42rem] before:h-2 before:w-2 before:rounded-full before:bg-animal-primary before:content-['']",
  ),
  scrollToLatest: classNames(
    'sticky bottom-2 z-20 justify-self-center rounded-[var(--animal-radius-pill)] border-2 border-animal-primary',
    'bg-[#fffdf5] px-3 py-1.5 text-xs font-bold text-[var(--animal-primary-active)]',
    'shadow-[0_3px_0_var(--animal-primary-active),0_8px_18px_rgba(61,52,40,0.12)] transition',
    'hover:-translate-y-px active:translate-y-[2px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-animal-primary',
  ),
  composer: classNames(
    'relative z-[2] m-3 mt-0 grid grid-cols-1 items-center gap-2 overflow-visible rounded-[22px]',
    'border-2 border-[rgba(196,184,158,0.62)] bg-[rgba(255,253,245,0.98)] p-2.5 backdrop-blur-md',
    'shadow-[0_4px_0_var(--animal-shadow-input),0_-8px_24px_rgba(61,52,40,0.045)]',
    'max-[760px]:m-2.5 max-[760px]:mt-0',
  ),
  composerHeader: 'flex min-w-0 flex-wrap items-center justify-between gap-1.5',
  composerLabel: classNames(
    'inline-flex items-center text-xs font-bold leading-4 text-animal-text',
    "before:mr-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-animal-primary before:shadow-[0_1px_0_var(--animal-primary-active)] before:content-['']",
  ),
  contextAnchor: classNames(
    'relative z-30 inline-flex min-w-0 max-w-[70%] items-center gap-1 overflow-visible',
    'max-[420px]:w-full max-[420px]:max-w-full',
  ),
  contextTrigger: (active = false) => classNames(
    'grid min-h-8 max-w-[min(220px,100%)] min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5',
    'rounded-[var(--animal-radius-pill)] border-2 px-2.5 py-0.5 text-left text-xs font-bold',
    'shadow-[0_2px_0_var(--animal-shadow-input)] transition hover:-translate-y-px active:translate-y-[2px] active:shadow-none max-[420px]:flex-1',
    active
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-animal-border bg-[#fffdf5] text-animal-text-body',
  ),
  contextTriggerIcon: 'grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.6875rem] font-black leading-none text-animal-text shadow-[0_1px_0_#dba90e]',
  contextTriggerText: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
  contextClear: classNames(
    'grid h-[30px] w-[30px] flex-none place-items-center rounded-full border-2 border-animal-border bg-[#fffdf5]',
    'text-base font-bold leading-none text-[var(--animal-text-muted)] shadow-[0_2px_0_var(--animal-shadow-input)] transition',
    'hover:-translate-y-px hover:border-animal-primary hover:text-[var(--animal-primary-active)] active:translate-y-[2px] active:shadow-none',
  ),
  contextMenu: classNames(
    'absolute bottom-[calc(100%+0.5rem)] right-0 z-50 grid w-[min(310px,calc(100vw-2rem))]',
    'max-h-[min(46vh,360px)] gap-1.5 overflow-auto rounded-[20px]',
    'border-2 border-[rgba(196,184,158,0.86)] bg-[#fffdf5] p-2',
    'shadow-[0_5px_0_var(--animal-shadow-input),0_14px_28px_rgba(61,52,40,0.16)]',
    'max-[420px]:w-[calc(100vw-2.25rem)]',
  ),
  contextMenuItem: (active = false) => classNames(
    'grid min-w-0 gap-0.5 rounded-[16px] border-2 px-3 py-2.5 text-left transition',
    active
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)]'
      : 'border-transparent bg-[#f7f3df] text-animal-text-body hover:border-animal-primary hover:bg-animal-primary-bg hover:text-[var(--animal-primary-active)]',
  ),
  inputShell: classNames(
    'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2',
    'max-[340px]:grid-cols-1 [&_[class*="animal-btn"]]:min-w-[72px] [&_[class*="animal-btn"]]:self-end max-[340px]:[&_[class*="animal-btn"]]:w-full',
  ),
  composerInput: classNames(
    'planpal-focus-managed min-h-[48px] max-h-[120px] w-full resize-none rounded-[18px] border-[2.5px] border-animal-border',
    'bg-[#fffdf5] px-3.5 py-[0.68rem] text-sm font-medium leading-[1.55] text-animal-text-body [letter-spacing:0.01em]',
    'shadow-[0_3px_0_var(--animal-shadow-input)] transition placeholder:font-normal placeholder:text-[var(--animal-text-disabled)]',
    'hover:border-[var(--animal-border-hover)]',
  ),
  composerMeta: 'flex min-w-0 items-center justify-between gap-3 px-1 text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  disabledReason: 'm-0 px-1 text-xs font-semibold leading-4 text-[var(--animal-error)]',
  decisionTicket: (destructive = false) => classNames(
    'w-full rounded-[22px] border-2 bg-[#fffdf5] !p-3 hover:!translate-y-0',
    'shadow-[0_3px_0_var(--animal-shadow-input),0_10px_20px_rgba(61,52,40,0.06)]',
    destructive
      ? 'border-[rgba(219,169,14,0.62)]'
      : 'border-[rgba(159,146,125,0.58)]',
  ),
  decisionHeader: 'grid grid-cols-[40px_minmax(0,1fr)] gap-2.5',
  decisionEyebrow: 'text-xs font-bold leading-4 tracking-[0.04em] text-[var(--animal-primary-active)]',
  decisionHeaderTitle: 'block text-sm font-bold leading-5 text-animal-text',
  decisionHeaderText: 'm-0 line-clamp-2 text-[0.8125rem] font-medium leading-5 text-[var(--animal-text-muted)]',
  activeQuery: classNames(
    'm-0 max-w-full rounded-[14px] border border-[rgba(25,200,185,0.3)] bg-animal-primary-bg px-2.5 py-1.5',
    'text-xs font-semibold leading-4 text-[var(--animal-primary-active)] [overflow-wrap:anywhere]',
  ),
  commandSummary: 'grid gap-2.5 rounded-[18px] border border-[rgba(196,184,158,0.5)] bg-[#fffaf0] p-2.5',
  impactText: 'm-0 text-[0.8125rem] font-medium leading-5 text-animal-text-body [overflow-wrap:anywhere]',
  choiceList: 'grid grid-cols-2 gap-2.5 max-[460px]:grid-cols-1',
  choiceCard: classNames(
    'grid min-w-0 gap-2 rounded-[18px] border-2 border-[rgba(196,184,158,0.58)] bg-[#fffdf5] p-3 text-left',
    'shadow-[0_3px_0_var(--animal-shadow-input)] transition hover:-translate-y-px hover:border-animal-primary hover:shadow-[0_4px_0_var(--animal-primary-active)]',
    'active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60',
  ),
  serviceCard: (selected = false) => classNames(
    'grid min-w-0 gap-1 rounded-[16px] border-2 p-2.5',
    selected
      ? 'border-animal-primary bg-animal-primary-bg shadow-[0_3px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.58)] bg-[#fff9e5] shadow-[0_3px_0_var(--animal-shadow-input)]',
  ),
  cardTitle: 'min-w-0 text-sm font-bold leading-5 text-animal-text [overflow-wrap:anywhere]',
  cardMeta: 'text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  cardText: 'm-0 line-clamp-2 text-[0.8125rem] font-medium leading-5 text-animal-text-body',
  placement: 'text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  reasons: 'm-0 flex flex-wrap gap-1.5 p-0',
  reason: 'list-none rounded-[var(--animal-radius-pill)] bg-[#f7f3df] px-2 py-1 text-xs font-medium leading-4 text-[var(--animal-text-muted)]',
  footer: 'flex flex-wrap justify-end gap-2 border-t border-[rgba(196,184,158,0.42)] pt-2.5',
  candidateControl: 'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] gap-2 pt-1 max-[760px]:grid-cols-1',
  serviceActions: 'grid grid-cols-[34px_34px_34px_minmax(96px,auto)] items-center gap-1.5 max-[380px]:grid-cols-[34px_34px_34px_1fr]',
  serviceActionButton: classNames(
    'min-h-[34px] rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.68)] bg-[#fffdf5] px-2',
    'text-xs font-bold text-animal-text shadow-[0_2px_0_var(--animal-shadow-input)] transition hover:-translate-y-px active:translate-y-[2px] active:shadow-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ),
  quantity: 'grid h-[34px] min-w-[34px] place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.8125rem] font-black text-animal-text shadow-[0_2px_0_var(--animal-focus-yellow-d)]',
  variantSummary: classNames(
    'grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[16px] border-0 bg-transparent p-1 text-left',
    'transition hover:bg-[rgba(25,200,185,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-animal-primary',
  ),
  variantSummaryCopy: 'grid min-w-0 gap-0.5',
  variantKicker: 'text-xs font-bold leading-4 text-[var(--animal-primary-active)]',
  variantToggle: 'rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2.5 py-1 text-xs font-bold text-animal-text',
  variantList: 'mt-2.5 grid gap-2',
  variantOption: (active = false) => classNames(
    'grid gap-2 rounded-[16px] border-2 p-3 text-left shadow-[0_2px_0_var(--animal-shadow-input)] transition disabled:cursor-default',
    active
      ? 'border-animal-primary bg-animal-primary-bg'
      : 'border-[rgba(196,184,158,0.58)] bg-[#fffdf5] hover:-translate-y-px hover:border-animal-primary hover:shadow-[0_3px_0_var(--animal-primary-active)] active:translate-y-[2px] active:shadow-none',
  ),
}
