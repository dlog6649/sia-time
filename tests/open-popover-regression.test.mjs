import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { JSDOM } from 'jsdom'

const fixturePath = new URL('./fixtures/scratch_41.html', import.meta.url)
const rootScriptPath = new URL('../scripts/open-popover.js', import.meta.url)
const distScriptPath = new URL('../dist/scripts/open-popover.js', import.meta.url)
const popoverId = 'sia-time-popover-uxWd901md'
// The app uses the browser's local calendar, so keep the test date local too.
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

const installFixedDate = (window, now) => {
  const RealDate = window.Date

  class FixedDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(now.getTime())
        return
      }

      super(...args)
    }

    static now() {
      return now.getTime()
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

const setupWindow = async ({ now = fixedNow, configure = () => {} } = {}) => {
  const fixtureHtml = await readFile(fixturePath, 'utf8')
  const dom = new JSDOM('<!doctype html><html><body><div class="jstree-clicked"><span></span>근무시간집계현황</div><iframe id="_content"></iframe></body></html>', {
    runScripts: 'outside-only',
    url: 'https://gw.si-analytics.ai/gw/bizbox.do',
  })

  const { window } = dom
  installInnerTextShim(window)
  installFixedDate(window, now)

  const iframe = window.document.querySelector('#_content')
  const contentDocument = iframe?.contentDocument
  assert.ok(contentDocument, 'iframe contentDocument should exist')

  contentDocument.open()
  contentDocument.write(fixtureHtml)
  contentDocument.close()
  installInnerTextShim(iframe.contentWindow)
  ensureLoadingCount(contentDocument)
  configure(contentDocument)

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
    const text = cells[index + 1]?.textContent.trim() ?? ''
    rows.push({ title, content, text })
  }

  return rows
}

const runScript = async (scriptPath, options) => {
  const script = await readFile(scriptPath, 'utf8')
  const window = await setupWindow(options)

  try {
    window.eval(script)
    const popover = await waitForPopover(window)
    const rows = extractRows(popover)
    return {
      html: popover.outerHTML,
      rows,
      text: Object.fromEntries(rows.map(({ title, text }) => [title, text])),
    }
  } finally {
    window.close()
  }
}

const detailColumns = [
  '일자', '부서', '사원명', '근무유형', '근무계획', '출근시간', '퇴근시간',
  '점심휴게', '석식', '근태구분', '소정근로 인정시간', '대체근로', '특이사항',
]

const workingDay = (date, changes = {}) => ({
  일자: date,
  근무유형: '2026.04',
  근무계획: '08:00~22:00',
  점심휴게: '60분',
  ...changes,
})

const pastTrip = (changes = {}) => workingDay('2026-04-20', {
  특이사항: '출장(09:00 ~ 18:00)',
  ...changes,
})

const scenarioRows = (trip = pastTrip()) => [
  workingDay('2026-04-23'),
  workingDay('2026-04-22'),
  trip,
]

const runScenario = ({
  rows = scenarioRows(),
  lackTime = '20:00',
  missingColumns = [],
  columnOrder = detailColumns,
  formattedRows = false,
  now = fixedNow,
} = {}) => runScript(distScriptPath, {
  now,
  configure(document) {
    const columns = columnOrder.filter((column) => !missingColumns.includes(column))
    const header = document.createElement('tr')
    for (const column of columns) {
      const cell = document.createElement('th')
      cell.textContent = column
      header.appendChild(cell)
    }
    document.querySelector('#grid2 thead').replaceChildren(header)

    const body = document.querySelector('#grid2 tbody')
    body.replaceChildren()
    for (const day of rows) {
      const row = document.createElement('tr')
      for (const column of columns) {
        if (formattedRows) {
          row.appendChild(document.createTextNode('\n  '))
        }
        const cell = document.createElement('td')
        const text = day[column] ?? ''
        if (column === '일자' && day.holiday) {
          const span = document.createElement('span')
          span.style.color = 'red'
          span.textContent = text
          cell.appendChild(span)
        } else {
          cell.textContent = text
        }
        row.appendChild(cell)
      }
      if (formattedRows) {
        row.appendChild(document.createTextNode('\n'))
      }
      body.appendChild(row)
    }
    document.querySelector('#grid3 tbody tr').children[7].textContent = lackTime
  },
})

const assertUncorrected = (result) => {
  assert.equal(result.text['내 현황'], '4시간 대출했어요.')
  assert.equal(result.text['요약'], '앞으로 하루에 10시간씩 근무하면 돼요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 20시간 남았어요.')
}

test('built open-popover script matches the original fixture output', async () => {
  const [originalResult, builtResult] = await Promise.all([
    runScript(rootScriptPath),
    runScript(distScriptPath),
  ])

  assert.deepEqual(builtResult.rows, originalResult.rows)
  assert.equal(builtResult.html, originalResult.html)
  assert.equal(builtResult.text['내 현황'], '11시간 41분 대출했어요.')
  assert.equal(builtResult.text['요약'], '앞으로 하루에 9시간 40분씩 근무하면 돼요.')
})

test('a past pending trip without punches fills its missing eight hours in every summary', async () => {
  const result = await runScenario()
  assert.equal(result.text['내 현황'], '4시간 저축했어요.')
  assert.equal(result.text['요약'], '앞으로 하루에 6시간씩 근무하면 돼요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 12시간 남았어요.')
})

test('trip hours include earlier check-in and later check-out without an eight-hour cap', async () => {
  const result = await runScenario({ rows: scenarioRows(pastTrip({ 출근시간: '08:00', 퇴근시간: '19:00' })) })
  assert.equal(result.text['내 현황'], '6시간 저축했어요.')
  assert.equal(result.text['요약'], '앞으로 하루에 5시간씩 근무하면 돼요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 10시간 남았어요.')
})

test('trip boundaries extend shorter office punches and fill each missing punch independently', async (t) => {
  for (const [name, punches, status] of [
    ['both punches inside the trip', { 출근시간: '10:00', 퇴근시간: '17:00' }, '4시간 저축했어요.'],
    ['only an earlier check-in', { 출근시간: '08:00' }, '5시간 저축했어요.'],
    ['only a later check-out', { 퇴근시간: '19:00' }, '5시간 저축했어요.'],
  ]) {
    await t.test(name, async () => {
      const result = await runScenario({ rows: scenarioRows(pastTrip(punches)) })
      assert.equal(result.text['내 현황'], status)
    })
  }
})

test('the combined interval is clipped to 08:00–22:00 and lunch is deducted once', async () => {
  const result = await runScenario({ rows: scenarioRows(pastTrip({ 출근시간: '07:00', 퇴근시간: '23:00' })) })
  assert.equal(result.text['내 현황'], '9시간 저축했어요.')
  assert.equal(result.text['요약'], '앞으로 하루에 3시간 30분씩 근무하면 돼요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 7시간 남았어요.')
})

test('only the actual overlap with lunch is deducted', async () => {
  const result = await runScenario({ rows: scenarioRows(pastTrip({ 특이사항: '출장(11:30 ~ 12:30)' })) })
  assert.equal(result.text['내 현황'], '3시간 30분 대출했어요.')
  assert.equal(result.text['요약'], '앞으로 하루에 9시간 45분씩 근무하면 돼요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 19시간 30분 남았어요.')
})

test('already recognized work is subtracted from the trip correction', async () => {
  const result = await runScenario({
    rows: scenarioRows(pastTrip({ 출근시간: '08:00', 퇴근시간: '19:00', '소정근로 인정시간': '08:00' })),
  })
  assert.equal(result.text['내 현황'], '2시간 대출했어요.')
  assert.equal(result.text['요약'], '앞으로 하루에 9시간씩 근무하면 돼요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 18시간 남았어요.')
})

test('missing work from several past trip days is accumulated once per day', async () => {
  const result = await runScenario({
    rows: [
      workingDay('2026-04-23'),
      workingDay('2026-04-22'),
      pastTrip({ 일자: '2026-04-21', 출근시간: '08:00', 퇴근시간: '19:00' }),
      pastTrip({ '소정근로 인정시간': '00:00' }),
    ],
  })
  assert.equal(result.text['내 현황'], '14시간 저축했어요.')
  assert.equal(result.text['요약'], '앞으로 하루에 1시간씩 근무하면 돼요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 2시간 남았어요.')
})

test('recognized work equal to or greater than the combined interval is not credited again', async (t) => {
  for (const recognized of ['10:00', '11:00']) {
    await t.test(recognized, async () => {
      const result = await runScenario({
        rows: scenarioRows(pastTrip({ 출근시간: '08:00', 퇴근시간: '19:00', '소정근로 인정시간': recognized })),
      })
      assertUncorrected(result)
    })
  }
})

test('approval hands over to the official monthly total without changing displayed results', async () => {
  const [pending, approved] = await Promise.all([
    runScenario({ rows: scenarioRows(pastTrip({ 출근시간: '08:00', 퇴근시간: '19:00' })) }),
    runScenario({
      rows: scenarioRows(pastTrip({ 출근시간: '08:00', 퇴근시간: '19:00', 근태구분: '정상', '소정근로 인정시간': '10:00' })),
      lackTime: '10:00',
    }),
  ])
  assert.deepEqual(approved.text, pending.text)
})

test('approved trips and other attendance states are not recalculated', async (t) => {
  for (const attendance of ['정상', ' 정상 ', '지각', '조퇴']) {
    await t.test(attendance, async () => {
      const result = await runScenario({ rows: scenarioRows(pastTrip({ 근태구분: attendance })) })
      assertUncorrected(result)
    })
  }
})

test('today and future trips are not credited as completed work', async (t) => {
  for (const date of ['2026-04-22', '2026-04-23']) {
    await t.test(date, async () => {
      const rows = scenarioRows(workingDay('2026-04-20'))
      const trip = rows.find((row) => row.일자 === date)
      Object.assign(trip, { 특이사항: '출장(09:00 ~ 18:00)', 출근시간: '08:00', 퇴근시간: '19:00' })
      assertUncorrected(await runScenario({ rows }))
    })
  }
})

test('holiday trips do not receive a normal-workday correction', async () => {
  const result = await runScenario({ rows: scenarioRows(pastTrip({ 일자: '2026-04-19', holiday: true })) })
  assertUncorrected(result)
})

test('multiple trip entries on one day form one interval instead of double-counting', async () => {
  const result = await runScenario({
    rows: scenarioRows(pastTrip({ 특이사항: '출장(09:00 ~ 18:00)\n출장(09:00 ~ 18:00)' })),
  })
  assert.equal(result.text['내 현황'], '4시간 저축했어요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 12시간 남았어요.')
})

test('invalid nonempty trip, punch, or recognized-time data does not produce a guessed correction', async (t) => {
  const invalidCases = [
    ['reversed trip', { 특이사항: '출장(18:00 ~ 09:00)' }],
    ['invalid trip hour', { 특이사항: '출장(25:00 ~ 26:00)' }],
    ['invalid trip minute', { 특이사항: '출장(09:60 ~ 18:00)' }],
    ['unparseable trip', { 특이사항: '출장(09:00 - 18:00)' }],
    ['one malformed trip among several', { 특이사항: '출장(09:00 ~ 18:00)\n출장(시간 미정)' }],
    ['invalid check-in', { 출근시간: '8시' }],
    ['invalid check-out', { 퇴근시간: '25:00' }],
    ['check-out before check-in', { 출근시간: '19:00', 퇴근시간: '08:00' }],
    ['negative recognized time', { '소정근로 인정시간': '-01:00' }],
    ['unparseable recognized time', { '소정근로 인정시간': '미확인' }],
  ]
  for (const [name, values] of invalidCases) {
    await t.test(name, async () => {
      assertUncorrected(await runScenario({ rows: scenarioRows(pastTrip(values)) }))
    })
  }
})

test('missing required detail columns do not turn missing data into a trip correction', async (t) => {
  for (const column of ['근태구분', '소정근로 인정시간', '출근시간', '퇴근시간']) {
    await t.test(column, async () => {
      assertUncorrected(await runScenario({ missingColumns: [column] }))
    })
  }
})

test('detail values are found by column headers despite reordered columns and whitespace nodes', async () => {
  const result = await runScenario({
    columnOrder: [...detailColumns].reverse(),
    formattedRows: true,
  })
  assert.equal(result.text['내 현황'], '4시간 저축했어요.')
  assert.equal(result.text['요약'], '앞으로 하루에 6시간씩 근무하면 돼요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 12시간 남았어요.')
})

test('invalid calendar dates are not rolled forward into completed trip days', async () => {
  const result = await runScenario({
    now: new Date(2026, 4, 6, 9),
    rows: [
      workingDay('2026-05-07'),
      workingDay('2026-05-06'),
      pastTrip({ 일자: '2026-04-31' }),
    ],
  })
  assertUncorrected(result)
})

test('trip intervals wholly outside recognized hours add no work', async (t) => {
  for (const significant of ['출장(06:00 ~ 07:00)', '출장(23:00 ~ 23:30)']) {
    await t.test(significant, async () => {
      assertUncorrected(await runScenario({ rows: scenarioRows(pastTrip({ 특이사항: significant })) }))
    })
  }
})

test('a correction can create savings while remaining-time labels stop at zero', async () => {
  const result = await runScenario({ lackTime: '06:00' })
  assert.equal(result.text['내 현황'], '18시간 저축했어요.')
  assert.equal(result.text['요약'], '남은 근무시간이 없어요.')
  assert.equal(result.text['미달시간'], '남은 근무시간이 없어요.')
})

test('the last working day uses corrected lack time for its clock-out instruction', async () => {
  const result = await runScenario({
    now: new Date(2026, 3, 30, 9),
    rows: [workingDay('2026-04-30', { 출근시간: '09:00' }), pastTrip({ 일자: '2026-04-29' })],
    lackTime: '16:00',
  })
  assert.equal(result.text['내 현황'], '저축한 시간이 없어요.')
  assert.equal(result.text['요약'], '오늘은 이달의 마지막 근무일입니다.\n18:00 이후에 퇴근할 수 있어요.')
  assert.equal(result.text['미달시간'], '총 근무시간이 8시간 남았어요.')
})

test('negative corrected lack time never moves the last-day clock-out before check-in', async () => {
  const result = await runScenario({
    now: new Date(2026, 3, 30, 16),
    rows: [workingDay('2026-04-30', { 출근시간: '16:00' }), pastTrip({ 일자: '2026-04-29' })],
    lackTime: '02:00',
  })
  assert.equal(result.text['내 현황'], '14시간 저축했어요.')
  assert.equal(result.text['요약'], '오늘은 이달의 마지막 근무일입니다.\n16:00 이후에 퇴근할 수 있어요.')
  assert.equal(result.text['미달시간'], '남은 근무시간이 없어요.')
})
