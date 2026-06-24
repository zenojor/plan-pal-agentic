import classNames from 'classnames'
import { workspacePrimitives } from './workspacePrimitives'

export const agentChatClasses = {
  root: 'flex min-h-0 flex-1 flex-col bg-[#fffaf0]',
  scroll: classNames(workspacePrimitives.scrollColumn, 'grid content-start gap-[0.76rem] p-[0.82rem] max-[760px]:p-[0.64rem]'),
  statusStrip: classNames(
    'grid gap-[0.54rem] rounded-[22px] border-2 border-[rgba(25,200,185,0.34)]',
    'bg-[#f2fffb] p-[0.68rem] shadow-[0_3px_0_rgba(17,168,155,0.3),0_10px_20px_rgba(61,52,40,0.06)]',
  ),
  statusMain: 'grid grid-cols-[40px_minmax(0,1fr)] items-center gap-[0.6rem]',
  statusIcon: 'inline-grid h-10 w-10 place-items-center rounded-[16px] border-2 border-[rgba(159,146,125,0.58)] bg-[#fff3c4] shadow-[0_3px_0_#dba90e]',
  statusTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.92rem] font-[850] leading-tight text-animal-text',
  statusMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.72rem] font-[700] text-[var(--animal-text-muted)]',
  statusChips: 'flex min-w-0 flex-wrap gap-[0.3rem]',
  statusChip: (primary = false) => classNames(
    'inline-flex min-h-[23px] max-w-full items-center rounded-[var(--animal-radius-pill)] px-[0.46rem] py-[0.12rem] text-[0.68rem] font-[800]',
    primary ? 'bg-animal-primary text-white' : 'bg-[#fffdf5] text-animal-text-body shadow-[inset_0_0_0_1px_rgba(196,184,158,0.42)]',
  ),
  emptyState: classNames(workspacePrimitives.emptyState, 'grid-cols-[34px_minmax(0,1fr)]'),
  emptyTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] font-[850] text-animal-text',
  emptyMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.76rem] font-[700] text-[var(--animal-text-muted)]',
  thread: 'grid max-w-full gap-[0.66rem]',
  turn: ({ role, receipt, hasAction }: { role: string; receipt?: boolean; hasAction?: boolean }) => classNames(
    'grid min-w-0 gap-[0.5rem]',
    role === 'user' ? 'justify-items-end' : 'justify-items-start',
    (receipt || hasAction) && 'w-full',
  ),
  bubble: ({ role, streaming, receipt }: { role: string; streaming?: boolean; receipt?: boolean }) => classNames(
    receipt
      ? 'inline-flex min-h-[28px] max-w-[min(92%,520px)] rounded-[18px] border-2 border-[rgba(25,200,185,0.36)] bg-[#eefbf8] px-[0.7rem] py-[0.4rem] text-[0.76rem] font-[820] leading-[1.35] text-[var(--animal-primary-active)] shadow-[0_2px_0_rgba(17,168,155,0.24)] max-[760px]:max-w-[94%] max-[420px]:max-w-full'
      : [
        'relative grid w-fit max-w-[min(92%,520px)] grid-cols-[30px_minmax(0,1fr)] gap-2.5',
        'rounded-[20px] border-2 px-[0.76rem] py-[0.64rem] text-[0.86rem] font-[700] leading-[1.56]',
        'shadow-[0_3px_0_var(--animal-shadow-input),0_10px_20px_rgba(61,52,40,0.06)] max-[760px]:max-w-[94%] max-[420px]:max-w-full max-[420px]:grid-cols-[26px_minmax(0,1fr)] max-[420px]:px-[0.62rem] max-[420px]:py-[0.56rem]',
        role === 'user'
          ? 'border-[rgba(25,200,185,0.52)] bg-animal-primary-bg text-[#0f4c46] shadow-[0_3px_0_rgba(17,168,155,0.44),0_10px_20px_rgba(61,52,40,0.05)]'
          : 'border-[rgba(196,184,158,0.72)] bg-[#fffdf5] text-animal-text-body',
        streaming && 'bg-[#fffbe8]',
      ],
  ),
  bubbleAvatar: (user = false) => classNames(
    'grid h-7 w-7 place-items-center rounded-full border-2 text-[0.74rem] font-[850] max-[420px]:h-6 max-[420px]:w-6 max-[420px]:text-[0.68rem]',
    user
      ? 'border-[rgba(25,200,185,0.42)] bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.58)] bg-[#fff3c4] text-animal-text shadow-[0_2px_0_#dba90e]',
  ),
  bubbleText: 'm-0 min-w-0 [overflow-wrap:anywhere]',
  actionAttachment: (floating = false) => classNames(
    'relative w-full min-w-0',
    floating ? 'pl-0' : 'pl-5 max-[420px]:pl-0',
    !floating && "before:content-[''] before:absolute before:left-[0.48rem] before:top-[0.22rem] before:bottom-[0.38rem] before:w-[4px] before:rounded-[var(--animal-radius-pill)] before:bg-[rgba(25,200,185,0.38)] before:shadow-[0_2px_0_rgba(17,168,155,0.24)] max-[420px]:before:hidden",
  ),
  pendingDock: classNames(
    'grid gap-[0.46rem] rounded-[22px] border-2 border-dashed border-[rgba(25,200,185,0.42)]',
    'bg-[#f2fffb] p-[0.62rem] shadow-[0_3px_0_rgba(17,168,155,0.2)]',
  ),
  pendingDockLabel: 'text-[0.7rem] font-[850] uppercase tracking-[0.08em] text-[var(--animal-primary-active)]',
  progressCard: classNames(workspacePrimitives.subtlePanel, 'w-full rounded-[20px] p-[0.62rem]'),
  progressItem: 'grid grid-cols-[14px_minmax(0,1fr)] gap-[0.42rem]',
  progressDot: (state: string) => classNames(
    'mt-[0.2rem] h-[11px] w-[11px] rounded-full',
    state === 'done' ? 'bg-animal-green' : state === 'error' ? 'bg-[var(--animal-error)]' : 'bg-animal-primary',
  ),
  progressTitle: 'block text-[0.76rem] font-[850] text-animal-text',
  progressMeta: 'block text-[0.68rem] font-[700] text-[var(--animal-text-muted)]',
  streamingPill: 'rounded-[18px] bg-[#fffbe8] px-[0.7rem] py-[0.62rem] text-[0.82rem] font-[850] text-animal-text-body',
  composer: classNames(
    'relative z-[2] grid grid-cols-1 items-center gap-[0.5rem]',
    'overflow-visible border-t-2 border-[rgba(196,184,158,0.42)] bg-[rgba(255,249,232,0.96)] p-[0.72rem]',
  ),
  contextAnchor: 'relative z-30 inline-flex min-w-0 max-w-full items-center gap-[0.28rem] overflow-visible max-[420px]:grid max-[420px]:grid-cols-[minmax(0,1fr)_auto]',
  contextTrigger: (active = false) => classNames(
    'grid min-h-10 max-w-[min(260px,100%)] min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-[0.3rem]',
    'rounded-[var(--animal-radius-pill)] border-2 px-[0.72rem] py-[0.34rem]',
    'text-left text-[0.82rem] font-[850] shadow-[0_3px_0_var(--animal-shadow-input)] transition hover:-translate-y-px active:translate-y-[2px]',
    active ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)] shadow-[0_3px_0_var(--animal-primary-active)]' : 'border-animal-border bg-[#fffdf5] text-animal-text-body',
  ),
  contextTriggerIcon: 'grid h-[1.35rem] w-[1.35rem] place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.8rem] font-[900] leading-none text-animal-text shadow-[0_2px_0_#dba90e]',
  contextTriggerText: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
  contextClear: 'grid h-[34px] w-[34px] flex-none place-items-center rounded-full border-2 border-animal-border bg-[#fffdf5] text-[1rem] font-[850] leading-none text-[var(--animal-text-muted)] shadow-[0_2px_0_var(--animal-shadow-input)] transition hover:-translate-y-px hover:border-animal-primary hover:text-[var(--animal-primary-active)]',
  contextMenu: classNames(
    'absolute bottom-[calc(100%+0.5rem)] left-0 z-50 grid w-[min(300px,calc(100vw-2rem))]',
    'max-h-[min(46vh,360px)] gap-[0.34rem] overflow-auto rounded-[20px]',
    'border-2 border-[rgba(196,184,158,0.86)] bg-[#fffdf5] p-[0.46rem]',
    'shadow-[0_5px_0_var(--animal-shadow-input),0_14px_28px_rgba(61,52,40,0.16)]',
    'max-[420px]:w-[calc(100vw-2rem)]',
  ),
  contextMenuItem: (active = false) => classNames(
    'grid min-w-0 gap-[0.1rem] rounded-[16px] border-2 p-[0.5rem_0.62rem] text-left',
    active
      ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)]'
      : 'border-transparent bg-[#f7f3df] text-animal-text-body hover:border-animal-primary hover:bg-animal-primary-bg hover:text-[var(--animal-primary-active)]',
  ),
  inputShell: 'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-[0.48rem] max-[420px]:grid-cols-1 [&_[class*="animal-input"]]:min-w-0 [&_input]:min-w-0 [&_[class*="animal-btn"]]:min-w-16',
  disabledReason: 'col-span-full m-0 mt-[-0.18rem] text-[0.72rem] font-[700] text-[var(--animal-text-muted)]',
  decisionTicket: 'w-full rounded-[20px] border-[rgba(159,146,125,0.68)] bg-[#fffdf5] p-[0.72rem_!important] shadow-[0_3px_0_var(--animal-shadow-input),0_10px_20px_rgba(61,52,40,0.07)]',
  decisionHeader: 'mb-[0.56rem] grid grid-cols-[40px_minmax(0,1fr)] gap-[0.62rem]',
  decisionHeaderTitle: 'block text-[0.88rem] font-[850] leading-tight text-animal-text',
  decisionHeaderText: 'm-0 line-clamp-2 text-[0.74rem] font-[700] leading-[1.35] text-[var(--animal-text-muted)]',
  activeQuery: 'm-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--animal-radius-pill)] border border-[rgba(25,200,185,0.34)] bg-animal-primary-bg px-2.5 py-1 text-[0.72rem] font-[800] text-[var(--animal-primary-active)]',
  choiceList: 'grid gap-[0.48rem]',
  choiceCard: 'grid min-w-0 gap-[0.4rem] rounded-[18px] border-2 border-[rgba(196,184,158,0.66)] bg-[#fffdf5] p-[0.64rem] text-left shadow-[0_3px_0_var(--animal-shadow-input)] transition hover:-translate-y-px hover:border-animal-primary hover:shadow-[0_4px_0_var(--animal-primary-active)] disabled:cursor-not-allowed disabled:opacity-60',
  serviceCard: (selected = false) => classNames(
    'grid min-w-0 gap-[0.42rem] rounded-[18px] border-2 p-[0.64rem]',
    selected
      ? 'border-animal-primary bg-animal-primary-bg shadow-[0_3px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fff8dd] shadow-[0_3px_0_var(--animal-shadow-input)]',
  ),
  cardTitle: 'min-w-0 [overflow-wrap:anywhere] text-[0.84rem] font-[850] leading-[1.26] text-animal-text',
  cardMeta: 'text-[0.7rem] font-[700] leading-[1.35] text-[var(--animal-text-muted)]',
  cardText: 'm-0 line-clamp-2 text-[0.74rem] font-[700] leading-[1.45] text-animal-text-body',
  placement: 'text-[0.7rem] font-[700] text-[var(--animal-text-muted)]',
  reasons: 'flex flex-wrap gap-[0.24rem] p-0 m-0',
  reason: 'list-none rounded-[var(--animal-radius-pill)] bg-[#f7f3df] px-[0.44rem] py-[0.1rem] text-[0.68rem] font-[700] text-[var(--animal-text-muted)]',
  footer: 'mt-[0.56rem] flex flex-wrap justify-end gap-2',
  candidateControl: 'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] gap-[0.46rem] pt-[0.16rem] max-[760px]:grid-cols-1',
  serviceActions: 'grid grid-cols-[30px_30px_30px_minmax(92px,auto)] items-center gap-[0.28rem]',
  serviceActionButton: 'min-h-[30px] rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.68)] bg-[#fffdf5] px-2 text-[0.72rem] font-[800] text-animal-text disabled:cursor-not-allowed disabled:opacity-50',
  quantity: 'grid h-[30px] min-w-[30px] place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.78rem] font-[850] text-animal-text',
  variantSummary: 'grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-[0.52rem] rounded-[16px] border-0 bg-transparent text-left',
  variantSummaryCopy: 'grid min-w-0 gap-0.5',
  variantKicker: 'text-[0.7rem] font-[850] text-[var(--animal-primary-active)]',
  variantToggle: 'rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2 py-1 text-[0.7rem] font-[850] text-animal-text',
  variantList: 'mt-[0.46rem] grid gap-[0.38rem]',
  variantOption: (active = false) => classNames(
    'grid gap-[0.32rem] rounded-[16px] border-2 p-[0.54rem] text-left shadow-[0_2px_0_var(--animal-shadow-input)] disabled:cursor-default',
    active ? 'border-animal-primary bg-animal-primary-bg' : 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5]',
  ),
}
