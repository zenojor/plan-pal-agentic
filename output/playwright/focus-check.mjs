import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'file:///C:/Users/zeno/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright-core/index.mjs'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 900, height: 260 } })
const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})

await page.goto('http://127.0.0.1:5174', { waitUntil: 'networkidle' })
await page.evaluate(() => {
  document.body.innerHTML = `
    <main style="width:900px;min-height:260px;padding:28px 38px;background:var(--animal-bg);box-sizing:border-box">
      <section class="relative grid grid-cols-1 items-center gap-2 overflow-visible rounded-[22px] border-2 border-[rgba(196,184,158,0.62)] bg-[rgba(255,253,245,0.98)] p-2.5 shadow-[0_4px_0_var(--animal-shadow-input),0_-8px_24px_rgba(61,52,40,0.045)]">
        <header class="flex items-center justify-between gap-2">
          <span class="inline-flex items-center text-xs font-bold leading-4 text-animal-text">发送给 PlanPal</span>
          <button class="rounded-[var(--animal-radius-pill)] border-2 border-animal-border bg-[#fffdf5] px-3 py-1 text-xs font-bold">@ 全局计划</button>
        </header>
        <div class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <textarea aria-label="发送给 PlanPal 的消息" class="planpal-focus-managed min-h-[48px] max-h-[120px] w-full resize-none rounded-[18px] border-[2.5px] border-animal-border bg-[#fffdf5] px-3.5 py-[0.68rem] text-sm font-medium leading-[1.55] text-animal-text-body shadow-[0_3px_0_var(--animal-shadow-input)] transition placeholder:font-normal placeholder:text-[var(--animal-text-disabled)] hover:border-[var(--animal-border-hover)]" rows="1" placeholder="描述你想调整的内容，或直接说最终目标…"></textarea>
          <button disabled class="min-h-[48px] rounded-[18px] px-5 font-bold">发送</button>
        </div>
        <footer class="flex items-center justify-between gap-3 px-1 text-xs font-medium leading-4 text-[var(--animal-text-muted)]">
          <span>Enter 发送 · Shift+Enter 换行</span><span>0/2000</span>
        </footer>
      </section>
    </main>`
})
consoleErrors.length = 0

const textarea = page.getByLabel('发送给 PlanPal 的消息')
await page.waitForTimeout(200)
await page.keyboard.press('Tab')
await page.keyboard.press('Tab')
await page.waitForTimeout(300)
const readFocusStyle = () => textarea.evaluate((element) => {
  const style = getComputedStyle(element)
  return {
    active: document.activeElement === element,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    className: element.className,
    boxShadow: style.boxShadow,
    focusMatches: element.matches(':focus'),
    focusVisibleMatches: element.matches(':focus-visible'),
    outlineColor: style.outlineColor,
    outlineStyle: style.outlineStyle,
    outlineWidth: style.outlineWidth,
  }
})
const keyboardFocusStyle = await readFocusStyle()

await textarea.click()
await page.waitForTimeout(300)
const pointerFocusStyle = await readFocusStyle()

await page.screenshot({ path: 'output/playwright/focus-after.png', fullPage: true })
for (const [mode, focusStyle] of Object.entries({ keyboard: keyboardFocusStyle, pointer: pointerFocusStyle })) {
  if (!focusStyle.active || !focusStyle.focusMatches || !focusStyle.focusVisibleMatches) {
    throw new Error(`Expected ${mode} interaction to focus the textarea: ${JSON.stringify(focusStyle)}`)
  }
  if (focusStyle.outlineStyle !== 'none') {
    throw new Error(`Expected the managed ${mode} focus outline to be removed: ${JSON.stringify(focusStyle)}`)
  }
  if (focusStyle.borderColor !== 'rgb(255, 204, 0)') {
    throw new Error(`Expected the ${mode} component focus border to remain yellow: ${JSON.stringify(focusStyle)}`)
  }
}

await writeFile(
  'output/playwright/focus-check.json',
  `${JSON.stringify({ keyboardFocusStyle, pointerFocusStyle, consoleErrors }, null, 2)}\n`,
  'utf8',
)

const source = await readFile('C:/Users/zeno/AppData/Local/Temp/codex-clipboard-3cbca2a7-2ed5-4dd0-a41d-0b333990a294.png')
const implementation = await readFile('output/playwright/focus-after.png')
await page.setViewportSize({ width: 1812, height: 330 })
await page.setContent(`
  <style>
    body { margin: 0; background: #ebe7dc; font: 700 14px sans-serif; color: #493b2b; }
    main { display: grid; grid-template-columns: 872px 900px; gap: 16px; padding: 12px; }
    figure { margin: 0; display: grid; gap: 8px; align-content: start; }
    figcaption { padding-left: 4px; }
    img { display: block; max-width: 100%; background: white; }
  </style>
  <main>
    <figure><figcaption>修复前：组件边框 + 外层 outline</figcaption><img src="data:image/png;base64,${source.toString('base64')}"></figure>
    <figure><figcaption>修复后：单一组件焦点边框</figcaption><img src="data:image/png;base64,${implementation.toString('base64')}"></figure>
  </main>
`)
await page.screenshot({ path: 'output/playwright/focus-comparison.png', fullPage: true })
await browser.close()
