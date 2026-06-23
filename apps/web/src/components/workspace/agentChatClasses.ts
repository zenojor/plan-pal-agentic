import classNames from 'classnames'
import { workspacePrimitives } from './workspacePrimitives'

export const agentChatClasses = {
  root: 'flex min-h-0 flex-1 flex-col bg-[#fffaf0]',
  scroll: classNames(workspacePrimitives.scrollColumn, 'grid content-start gap-[0.62rem] p-[0.72rem] max-[760px]:p-[0.6rem]'),
  statusStrip: classNames(
    'grid gap-[0.46rem] rounded-[18px] border-2 border-[rgba(25,200,185,0.34)]',
    'bg-[#f2fffb] p-[0.58rem] shadow-[0_2px_0_rgba(17,168,155,0.32)]',
  ),
  statusMain: 'grid grid-cols-[38px_minmax(0,1fr)] items-center gap-[0.52rem]',
  statusIcon: 'inline-grid h-[34px] w-[34px] place-items-center rounded-[14px] border-2 border-[rgba(196,184,158,0.76)] bg-[#fff3c4] shadow-[0_2px_0_#dba90e]',
  statusTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.96rem] font-[950] leading-tight text-animal-text',
  statusMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.74rem] font-[850] text-[var(--animal-text-muted)]',
  statusChips: 'flex min-w-0 flex-wrap gap-[0.3rem]',
  statusChip: (primary = false) => classNames(
    'inline-flex min-h-[23px] max-w-full items-center rounded-[var(--animal-radius-pill)] px-[0.46rem] py-[0.12rem] text-[0.68rem] font-[900]',
    primary ? 'bg-animal-primary text-white' : 'bg-[#fffdf5] text-animal-text-body shadow-[inset_0_0_0_1px_rgba(196,184,158,0.42)]',
  ),
  emptyState: classNames(workspacePrimitives.emptyState, 'grid-cols-[34px_minmax(0,1fr)]'),
  emptyTitle: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.9rem] font-[950] text-animal-text',
  emptyMeta: 'block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] font-[820] text-[var(--animal-text-muted)]',
  thread: 'grid max-w-full gap-[0.52rem]',
  turn: ({ role, receipt, hasAction }: { role: string; receipt?: boolean; hasAction?: boolean }) => classNames(
    'grid min-w-0 gap-[0.42rem]',
    role === 'user' ? 'justify-items-end' : 'justify-items-start',
    (receipt || hasAction) && 'w-full',
  ),
  bubble: ({ role, streaming, receipt }: { role: string; streaming?: boolean; receipt?: boolean }) => classNames(
    receipt
      ? 'inline-flex min-h-[26px] max-w-[min(92%,520px)] rounded-[18px] border-2 border-[rgba(25,200,185,0.36)] bg-[#eefbf8] px-[0.62rem] py-[0.36rem] text-[0.76rem] font-[810] leading-[1.35] text-[var(--animal-primary-active)] max-[760px]:max-w-[94%] max-[420px]:max-w-full'
      : [
        'relative grid w-fit max-w-[min(92%,520px)] grid-cols-[28px_minmax(0,1fr)] gap-2',
        'rounded-[18px] border-2 px-[0.72rem] py-[0.62rem] text-[0.88rem] font-[810] leading-[1.56]',
        'shadow-[0_2px_0_var(--animal-shadow-input)] max-[760px]:max-w-[94%] max-[420px]:max-w-full max-[420px]:grid-cols-[24px_minmax(0,1fr)] max-[420px]:px-[0.62rem] max-[420px]:py-[0.56rem]',
        role === 'user'
          ? 'border-[rgba(25,200,185,0.52)] bg-animal-primary-bg text-[#0f4c46] shadow-[0_2px_0_rgba(17,168,155,0.44)]'
          : 'border-[rgba(196,184,158,0.72)] bg-[#fffdf5] text-animal-text-body',
        streaming && 'bg-[#fffbe8]',
      ],
  ),
  bubbleAvatar: (user = false) => classNames(
    'grid h-7 w-7 place-items-center rounded-full border-2 text-[0.74rem] font-[950] max-[420px]:h-6 max-[420px]:w-6 max-[420px]:text-[0.68rem]',
    user
      ? 'border-[rgba(25,200,185,0.42)] bg-animal-primary text-white shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.58)] bg-[#fff3c4] text-animal-text shadow-[0_2px_0_#dba90e]',
  ),
  bubbleText: 'm-0 min-w-0 [overflow-wrap:anywhere]',
  actionAttachment: (floating = false) => classNames(
    'relative w-full min-w-0',
    floating ? 'pl-0' : 'pl-5 max-[420px]:pl-0',
    !floating && "before:content-[''] before:absolute before:left-[0.44rem] before:top-[0.28rem] before:bottom-[0.28rem] before:w-[3px] before:rounded-[var(--animal-radius-pill)] before:bg-[rgba(25,200,185,0.34)] max-[420px]:before:hidden",
  ),
  progressCard: classNames(workspacePrimitives.subtlePanel, 'w-full rounded-[18px] p-[0.54rem]'),
  progressItem: 'grid grid-cols-[14px_minmax(0,1fr)] gap-[0.42rem]',
  progressDot: (state: string) => classNames(
    'mt-[0.2rem] h-[11px] w-[11px] rounded-full',
    state === 'done' ? 'bg-animal-green' : state === 'error' ? 'bg-[var(--animal-error)]' : 'bg-animal-primary',
  ),
  progressTitle: 'block text-[0.76rem] font-[950] text-animal-text',
  progressMeta: 'block text-[0.68rem] font-[820] text-[var(--animal-text-muted)]',
  streamingPill: 'rounded-[18px] bg-[#fffbe8] px-[0.7rem] py-[0.62rem] text-[0.82rem] font-[850] text-animal-text-body',
  composer: classNames(
    'grid grid-cols-[minmax(126px,0.34fr)_minmax(0,1fr)] gap-[0.48rem] border-t-2 border-[rgba(196,184,158,0.42)]',
    'bg-[rgba(255,249,232,0.96)] p-[0.64rem] max-[760px]:grid-cols-1',
  ),
  contextAnchor: 'relative max-w-none max-[760px]:grid max-[760px]:grid-cols-[minmax(0,1fr)_auto]',
  contextTrigger: (active = false) => classNames(
    'flex min-h-[38px] w-full min-w-0 items-center gap-2 rounded-[18px] border-2 px-[0.58rem] py-[0.32rem]',
    'text-left text-[0.78rem] font-[900] shadow-[0_2px_0_var(--animal-shadow-input)] transition',
    active ? 'border-animal-primary bg-animal-primary-bg text-[var(--animal-primary-active)]' : 'border-animal-border bg-[#fffdf5] text-animal-text-body',
  ),
  contextTriggerIcon: 'grid h-5 w-5 place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.8rem] font-[950] text-animal-text',
  contextTriggerText: 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
  contextClear: 'grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-animal-border bg-[#fffdf5] text-[1rem] font-[950] text-animal-text shadow-[0_2px_0_var(--animal-shadow-input)]',
  contextMenu: 'absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 grid max-h-[260px] gap-1 overflow-auto rounded-[18px] border-2 border-animal-border bg-animal-bg-light p-2 shadow-[0_12px_28px_rgba(61,52,40,0.18)]',
  contextMenuItem: (active = false) => classNames(
    'grid gap-0.5 rounded-[14px] border-0 p-2 text-left',
    active ? 'bg-animal-primary-bg text-[var(--animal-primary-active)]' : 'bg-transparent text-animal-text-body hover:bg-[#fffdf5]',
  ),
  inputShell: 'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-[0.42rem] max-[760px]:grid-cols-1 [&_[class*="animal-input"]]:min-w-0 [&_input]:min-w-0 [&_[class*="animal-btn"]]:min-w-16',
  disabledReason: 'col-span-full m-0 mt-[-0.18rem] text-[0.72rem] font-[850] text-[var(--animal-text-muted)]',
  decisionTicket: 'w-full rounded-[18px] border-[rgba(196,184,158,0.72)] bg-[#fffdf5] p-[0.66rem_!important] shadow-[0_2px_0_var(--animal-shadow-input)]',
  decisionHeader: 'mb-[0.46rem] grid grid-cols-[34px_minmax(0,1fr)] gap-[0.52rem]',
  decisionHeaderTitle: 'block text-[0.92rem] font-[950] leading-tight text-animal-text',
  decisionHeaderText: 'm-0 line-clamp-2 text-[0.76rem] font-[800] leading-[1.35] text-[var(--animal-text-muted)]',
  activeQuery: 'm-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--animal-radius-pill)] border border-[rgba(25,200,185,0.34)] bg-animal-primary-bg px-2.5 py-1 text-[0.72rem] font-[900] text-[var(--animal-primary-active)]',
  choiceList: 'grid gap-[0.38rem]',
  choiceCard: 'grid min-w-0 gap-[0.32rem] rounded-[16px] border-2 border-[rgba(196,184,158,0.62)] bg-[#fffdf5] p-[0.54rem] text-left shadow-[0_2px_0_var(--animal-shadow-input)] transition hover:shadow-[0_3px_0_var(--animal-primary-active)] disabled:cursor-not-allowed disabled:opacity-60',
  serviceCard: (selected = false) => classNames(
    'grid min-w-0 gap-[0.32rem] rounded-[16px] border-2 p-[0.54rem]',
    selected
      ? 'border-animal-primary bg-animal-primary-bg shadow-[0_2px_0_var(--animal-primary-active)]'
      : 'border-[rgba(196,184,158,0.62)] bg-[#fff8dd] shadow-[0_2px_0_var(--animal-shadow-input)]',
  ),
  cardTitle: 'min-w-0 [overflow-wrap:anywhere] text-[0.86rem] font-[950] leading-[1.24] text-animal-text',
  cardMeta: 'text-[0.7rem] font-[820] leading-[1.35] text-[var(--animal-text-muted)]',
  cardText: 'm-0 line-clamp-2 text-[0.76rem] font-[800] leading-[1.45] text-animal-text-body',
  placement: 'text-[0.7rem] font-[820] text-[var(--animal-text-muted)]',
  reasons: 'flex flex-wrap gap-[0.24rem] p-0 m-0',
  reason: 'list-none rounded-[var(--animal-radius-pill)] bg-[#f7f3df] px-[0.44rem] py-[0.1rem] text-[0.68rem] font-[820] text-[var(--animal-text-muted)]',
  footer: 'mt-[0.46rem] flex flex-wrap justify-end gap-2',
  candidateControl: 'grid grid-cols-[auto_auto_minmax(0,1fr)_auto] gap-[0.36rem] pt-[0.08rem] max-[760px]:grid-cols-1',
  serviceActions: 'grid grid-cols-[30px_30px_30px_minmax(92px,auto)] items-center gap-[0.28rem]',
  serviceActionButton: 'min-h-[30px] rounded-[var(--animal-radius-pill)] border-2 border-[rgba(196,184,158,0.68)] bg-[#fffdf5] px-2 text-[0.72rem] font-[920] text-animal-text disabled:cursor-not-allowed disabled:opacity-50',
  quantity: 'grid h-[30px] min-w-[30px] place-items-center rounded-full bg-[var(--animal-focus-yellow)] text-[0.78rem] font-[950] text-animal-text',
  variantSummary: 'grid w-full grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-[0.52rem] rounded-[16px] border-0 bg-transparent text-left',
  variantSummaryCopy: 'grid min-w-0 gap-0.5',
  variantKicker: 'text-[0.7rem] font-[950] text-[var(--animal-primary-active)]',
  variantToggle: 'rounded-[var(--animal-radius-pill)] bg-[#fff3c4] px-2 py-1 text-[0.7rem] font-[950] text-animal-text',
  variantList: 'mt-[0.46rem] grid gap-[0.38rem]',
  variantOption: (active = false) => classNames(
    'grid gap-[0.32rem] rounded-[16px] border-2 p-[0.54rem] text-left shadow-[0_2px_0_var(--animal-shadow-input)] disabled:cursor-default',
    active ? 'border-animal-primary bg-animal-primary-bg' : 'border-[rgba(196,184,158,0.62)] bg-[#fffdf5]',
  ),
}
