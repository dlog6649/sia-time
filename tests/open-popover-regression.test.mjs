import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const workspaceRoot = '/Users/hbim/dev/repositories/sia-time'
const fixturePath = path.join(workspaceRoot, 'tests/fixtures/scratch_41.html')
const rootScriptPath = path.join(workspaceRoot, 'scripts/open-popover.js')
const distScriptPath = path.join(workspaceRoot, 'dist/scripts/open-popover.js')
const popoverId = 'sia-time-popover-uxWd901md'
const fixedNow = new Date('2026-04-22T09:00:00+09:00')

const installInnerTextShim = (window) => {
  if ('innerText' in window.HTMLElement.prototype) {
    return
  }

  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    configurable: true,
    get() {
      return this.textContent ?? ''
    },
    set(value) {
      this.textContent = value
    },
  })
}

const installFixedDate = (window) => {
  const RealDate = window.Date

  class FixedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedNow.getTime())
        return
      }

      super(...args)
    }

    static now() {
      return fixedNow.getTime()
    }
  }

  window.Date = FixedDate
}

const ensureLoadingCount = (contentDocument) => {
  const loadings = [...contentDocument.querySelectorAll('.PUDD-UI-loading')]
  for (const loading of loadings) {
    loading.style.display = 'none'
  }

  for (let index = loadings.length; index < 4; index += 1) {
    const loading = contentDocument.createElement('div')
    loading.className = 'PUDD-UI-loading'
    loading.style.display = 'none'
    contentDocument.body.appendChild(loading)
  }
}

const setupWindow = async () => {
  const fixtureHtml = await readFile(fixturePath, 'utf8')
  const dom = new JSDOM('<!doctype html><html><body><div class="jstree-clicked"><span></span>근무시간집계현황</div><iframe id="_content"></iframe></body></html>', {
    runScripts: 'outside-only',
    url: 'https://gw.si-analytics.ai/gw/bizbox.do',
  })

  const { window } = dom
  installInnerTextShim(window)
  installFixedDate(window)

  const iframe = window.document.querySelector('#_content')
  const contentDocument = iframe?.contentDocument
  assert.ok(contentDocument, 'iframe contentDocument should exist')

  contentDocument.open()
  contentDocument.write(fixtureHtml)
  contentDocument.close()
  ensureLoadingCount(contentDocument)

  return window
}

const waitForPopover = async (window) => {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 3000) {
    const popover = window.document.getElementById(popoverId)
    if (popover) {
      return popover
    }

    await new Promise((resolve) => window.setTimeout(resolve, 50))
  }

  throw new Error('popover was not rendered in time')
}

const extractRows = (popover) => {
  const cells = [...popover.querySelectorAll('main > div:last-child > div')]
  const rows = []

  for (let index = 0; index < cells.length; index += 2) {
    const title = cells[index]?.textContent?.trim() ?? ''
    const content = cells[index + 1]?.innerHTML.trim() ?? ''
    rows.push({ title, content })
  }

  return rows
}

const runScript = async (scriptPath) => {
  const [window, script] = await Promise.all([
    setupWindow(),
    readFile(scriptPath, 'utf8'),
  ])

  window.eval(script)
  const popover = await waitForPopover(window)

  return {
    html: popover.outerHTML,
    rows: extractRows(popover),
  }
}

test('built open-popover script matches the original fixture output', async () => {
  const [originalResult, builtResult] = await Promise.all([
    runScript(rootScriptPath),
    runScript(distScriptPath),
  ])

  assert.deepEqual(builtResult.rows, originalResult.rows)
  assert.equal(builtResult.html, originalResult.html)
})
