import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const fixturePath = new URL('./fixtures/scratch_41.html', import.meta.url)
const rootScriptPath = new URL('../scripts/open-popover.js', import.meta.url)
const distScriptPath = new URL('../dist/scripts/open-popover.js', import.meta.url)
const popoverId = 'sia-time-popover-uxWd901md'
const fixedNow = new Date(2026, 3, 22, 9)

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
  installInnerTextShim(iframe.contentWindow)
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
  const rows = {}

  for (let index = 0; index < cells.length; index += 2) {
    rows[cells[index].textContent.trim()] = cells[index + 1].textContent.trim()
  }

  return rows
}

const runScript = async (scriptPath, verify) => {
  const [window, script] = await Promise.all([
    setupWindow(),
    readFile(scriptPath, 'utf8'),
  ])

  try {
    window.eval(script)
    const popover = await waitForPopover(window)
    return verify(window, popover)
  } finally {
    window.close()
  }
}

const selectOption = (window, select, value) => {
  select.value = value
  assert.equal(select.value, value)
  select.dispatchEvent(new window.Event('change', { bubbles: true }))
}

test('built popover preserves the monthly fixture output through weekly toggling', async () => {
  const monthly = await runScript(rootScriptPath, (_, popover) => extractRows(popover))
  assert.deepEqual(monthly, {
    '총 근무일': '22일',
    '남은 근무일': '7일',
    '남은 재택근무': '1일',
    '내 현황': '11시간 41분 대출했어요.',
    '요약': '앞으로 하루에 9시간 40분씩 근무하면 돼요.',
    '미달시간': '총 근무시간이 67시간 41분 남았어요.',
    '창립기념일': 'SIA 창립기념일인 7월 2일은 쉬는 날이에요.',
  })

  await runScript(distScriptPath, (window, popover) => {
    const period = window.document.getElementById(`${popoverId}-period`)
    assert.equal(period.value, 'month')
    assert.deepEqual(extractRows(popover), monthly)
    selectOption(window, period, 'week')
    assert.equal(extractRows(popover)['주간 목표'], '40시간')
    selectOption(window, period, 'month')
    assert.deepEqual(extractRows(popover), monthly)

    window.document.getElementById('sia-time-popover-close-btn-Idn1Zdk3').click()
    assert.equal(window.document.getElementById(popoverId), null)
  })
})

test('weekly view defaults to this week and clips a month boundary to the loaded dates', async () => {
  await runScript(distScriptPath, (window, popover) => {
    const period = window.document.getElementById(`${popoverId}-period`)
    const week = window.document.getElementById(`${popoverId}-week`)
    selectOption(window, period, 'week')
    assert.match(week.selectedOptions[0].textContent, /4\/20\s*~\s*4\/26/)
    assert.equal(extractRows(popover)['남은 근무일'], '3일')
    assert.equal(extractRows(popover)['미달시간'], '총 근무시간이 33시간 56분 남았어요.')

    const lastWeek = [...week.options].find((option) => /4\/27\s*~\s*4\/30/.test(option.textContent))
    assert.ok(lastWeek, 'April-only dates should be present in the last week')
    selectOption(window, week, lastWeek.value)
    assert.match(week.selectedOptions[0].textContent, /4월 조회 범위/)
    assert.equal(extractRows(popover)['총 근무일'], '4일')
    assert.equal(extractRows(popover)['주간 목표'], '32시간')
  })
})
