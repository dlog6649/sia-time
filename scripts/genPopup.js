(() => {
  const MINUTES_PER_HOUR = 60
  const WORKING_HOURS_PER_DAY = 8
  const HALF_WORKING_HOURS_PER_DAY = WORKING_HOURS_PER_DAY * .5

  const title = '시아시간'
  const popupId = `sia-time-popup-uxWd901md`
  const closeBtnId = `sia-time-popup-close-btn-Idn1Zdk3`
  // 매달 제공되는 재택근무일수
  const wfhCountPerMonth = 2

  const convertSignificantToMins = (significant) => {
    const dayRegexp =
      /(재택근무|연차|휴가|공가|병가|휴직|결혼|회갑|출산|사망|탈상|예비군|훈련소)/g
    if (dayRegexp.test(significant) || significant === '기타') {
      return WORKING_HOURS_PER_DAY * MINUTES_PER_HOUR
    }

    const halfDayRegexp = /(반차|건강검진|백신접종|기타\(반일\))/g
    if (halfDayRegexp.test(significant)) {
      return HALF_WORKING_HOURS_PER_DAY * MINUTES_PER_HOUR
    }

    if (significant.startsWith('출장')) {
      return getBusinessTripMinutes(significant)
    }

    return 0
  }

  const getBusinessTripMinutes = (text) => {
    const match = text.match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
    if (!match) return 0;

    const [, sh, sm, eh, em] = match.map(Number);
    const start = sh * MINUTES_PER_HOUR + sm;
    const end = eh * MINUTES_PER_HOUR + em;
    const duration = end - start;

    // 점심시간 12:00 ~ 13:00 빼기
    const lunchStart = 12 * MINUTES_PER_HOUR;
    const lunchEnd = 13 * MINUTES_PER_HOUR;
    const overlap = Math.max(0, Math.min(end, lunchEnd) - Math.max(start, lunchStart));

    return duration - overlap
  }

  const startOfToday = () => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }

  // 창립기념일 7/2
  const foundationDay = () => {
    const date = new Date()
    date.setMonth(6, 2)
    date.setHours(0, 0, 0, 0)
    return date
  }

  const timeText = (h, m) => {
    const hours = h > 0 ? `${h}시간` : ''
    const mins = m > 0 ? `${Math.round(m)}분` : ''
    return `${hours} ${mins}`.trim()
  }

  const dateText = () => {
    const date = currentPageDate()
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
  }

  const detailTableOrNull = () => {
    return document
      .querySelector('#_content')
      ?.contentDocument.querySelector('#grid2')
  }

  const summaryTableOrNull = () => {
    return document
      .querySelector('#_content')
      ?.contentDocument.querySelector('#grid3')
  }

  const lackTimes = () => {
    const summaryTable = summaryTableOrNull()
    const lackTimeIdx = [
      ...(summaryTable?.querySelector('thead')?.querySelectorAll('th') ?? []),
    ].findIndex((th) => th.innerText === '미달시간')
    const lackTimeTxt =
      summaryTable?.querySelector('tbody')?.querySelector('tr')?.childNodes[lackTimeIdx]
        ?.innerText ?? ''
    const [lackHours, lackMins] = lackTimeTxt.split(':').map(Number)

    return { lackMins: lackMins, lackHours: lackHours, totalLackMins: lackHours * MINUTES_PER_HOUR + lackMins }
  }

  const currentPageDate = () => {
    const detailTable = detailTableOrNull()
    const bodyTrs = [...(detailTable?.querySelector('tbody')?.querySelectorAll('tr') ?? [])]
    return new Date(bodyTrs[0]?.childNodes[dateIndex()]?.innerText)
  }

  const parseMinutes = (mins) => {
    return { hours: Math.floor(mins / MINUTES_PER_HOUR), minutes: mins % MINUTES_PER_HOUR }
  }

  const summaryText = () => {
    const remainingMins = totalRemainingMins() - getTotalSavingMins()
    const remainingMinsPerDay = Math.abs(remainingMins) / remainingWorkingDaysCount()
    const { hours, minutes } = parseMinutes(remainingMinsPerDay)
    return remainingWorkingDaysCount() === 0
      ? '이달의 근무가 끝났어요.'
      : remainingMins < 0
        ? '미달시간이 없어요.'
        : `앞으로 하루에 ${timeText(hours, minutes)}씩 근무하면 돼요.`
  }

  const myStatusText = () => {
    const totalSavingMins = getTotalSavingMins()
    const { hours, minutes } = parseMinutes(Math.abs(totalSavingMins))
    return totalSavingMins === 0
        ? '저축한 시간이 없어요.'
        : `${timeText(hours, minutes)} ${
          totalSavingMins < 0
            ? "<span style='color: #EF2B2A; font-weight: 700;'>대출</span>"
            : "<span style='color: #487AFF; font-weight: 700;'>저축</span>"
        }했어요.`
  }

  const getTotalSavingMins = () => {
    const subtractedMinsInLackTime = remainingWorkingDayTrs().reduce((acc, tr) => {
        const significants = tr.childNodes[significantIndex()]?.innerText.split('\n')
        const mins = significants.reduce((acc, sig) => acc + convertSignificantToMins(sig), 0)
        return acc + mins
      }, 0)

    return totalRemainingMins() - lackTimes().totalLackMins - subtractedMinsInLackTime
  }

  const remainingWorkingDayTrs = () => {
    return workingDayTrs().filter(
      (tr) => new Date(tr.childNodes[dateIndex()]?.innerText).getTime() >= startOfToday().getTime(),
    )
  }

  const remainingWorkingDaysCount = () => {
    return remainingWorkingDayTrs().length
  }

  const totalRemainingMins = () => {
    return remainingWorkingDaysCount() * WORKING_HOURS_PER_DAY * MINUTES_PER_HOUR
  }

  const usedWfhCount = () => {
    return workingDayTrs().filter(
      (tr) => tr.childNodes[significantIndex()]?.innerText === '재택근무',
    ).length
  }

  const significantIndex = () => {
    const detailTable = detailTableOrNull()
    const ths = [...(detailTable?.querySelector('thead')?.querySelectorAll('th') ?? [])]
    return ths.findIndex((th) => th.innerText === '특이사항')
  }

  const dateIndex = () => {
    const detailTable = detailTableOrNull()
    const ths = [...(detailTable?.querySelector('thead')?.querySelectorAll('th') ?? [])]
    return ths.findIndex((th) => th.innerText === '일자')
  }

  const workingDayTrs = () => {
    const detailTable = detailTableOrNull()
    const bodyTrs = [...(detailTable?.querySelector('tbody')?.querySelectorAll('tr') ?? [])]
    // 쉬는날은 빨간 글씨 부여를 위해 span으로 텍스트를 감싸서 firstElementChild가 있으므로 그게 없다면 근무일임
    return bodyTrs.filter((tr) => !tr.childNodes[dateIndex()]?.firstElementChild)
  }

  const totalWorkingDayCount = () => {
    return workingDayTrs().length
  }

  const lackTimeText = () => {
    const { lackHours, lackMins } = lackTimes()
    return `총 근무시간이 ${timeText(lackHours, lackMins)} 남았어요.`
  }

  const renderRow = ({ title, content }) => {
    return `<div style="background-color: #F5F5F5; display: flex; align-items: center; padding: 4px 8px; border-right: 1px solid #CCC; border-bottom: 1px solid #CCC;"
            >${title}</div>
            <div style="display: flex; align-items: center; padding: 4px 8px; color: #616161; border-right: 1px solid #CCC; border-bottom: 1px solid #CCC; white-space: pre-wrap; word-break: break-word;"
            >${content}</div>`
  }

  const clearOldPopup = () => {
    const oldPopup = document.getElementById(popupId)
    if (oldPopup) {
      document.body.removeChild(oldPopup)
    }
  }

  const genContent = () => {
    clearOldPopup()

    const popupEl = new DOMParser().parseFromString(
      `
      <div id="${popupId}" style="position: absolute; top: 24px; right: 24px; z-index: 100000;">
        <div
          style="
            width: 446px;
            border-radius: 8px;
            background-color: #FAFAFA;
            color: #222222;
            font-family: Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
            box-shadow: 0 12px 48px 16px rgba(0, 0, 0, 0.12), 0 9px 28px 0 rgba(0, 0, 0, 0.2), 0 6px 16px -8px rgba(0, 0, 0, 0.32);
          "
        >
          <header
            style="
              height: 44px;
              background-color: #E7F2FF;
              position: relative;
              display: flex;
              align-items: center;
              padding: 0 20px;
              border-bottom: 1px solid #E0E0E0;
              border-radius: 8px 8px 0 0;
            "
          >
            <h1 style="font-size: 18px; font-weight: 800; position: absolute; top: 14px;">${title}</h1>
            <button
              id="${closeBtnId}"
              style="
                position: absolute;
                top: 4px;
                right: 14px;
                width: 36px;
                height: 36px;
                background-color: transparent;
                border: none;
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#616161"/>
              </svg>
            </button>
          </header>
          <main style="padding: 12px 20px 18px; display: flex; flex-flow: column nowrap; gap: 6px;">
            <time style="display: flex; align-items: center; gap: 6px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16.6641 2.50065H15.8307V0.833984H14.1641V2.50065H5.83073V0.833984H4.16406V2.50065H3.33073C2.41406 2.50065 1.66406 3.25065 1.66406 4.16732V17.5006C1.66406 18.4173 2.41406 19.1673 3.33073 19.1673H16.6641C17.5807 19.1673 18.3307 18.4173 18.3307 17.5006V4.16732C18.3307 3.25065 17.5807 2.50065 16.6641 2.50065ZM16.6641 17.5006H3.33073V8.33398H16.6641V17.5006ZM16.6641 6.66732H3.33073V4.16732H16.6641V6.66732Z" fill="#487AFF"/>
              </svg>
              <div style="font-size: 18px; font-weight: 700; line-height: 28px;">${dateText()}</div>
            </time>
            <div style="display: grid; grid-auto-rows: minmax(32px, auto); grid-template-columns: 106px 1fr; border-top: 1px solid #CCC; border-left: 1px solid #CCC; font-size: 14px;">
              ${renderRow({ title: '총 근무일', content: `${totalWorkingDayCount()}일` })}
              ${renderRow({ title: '남은 근무일', content: `${remainingWorkingDaysCount()}일` })}
              ${renderRow({ title: '남은 재택근무', content: `${wfhCountPerMonth - usedWfhCount()}일` })}
              ${renderRow({ title: '내 현황', content: `${myStatusText()}` })}
              ${renderRow({ title: '요약', content: `${summaryText()}` })}
              ${renderRow({ title: '미달시간', content: `${lackTimeText()}` })}
              ${(() => {
                if (startOfToday().getTime() <= foundationDay().getTime()) {
                  return renderRow({ title: '창립기념일', content: 'SIA 창립기념일인 7월 2일은 쉬는 날이에요.' })
                }
                return ''
              })()}
            </div>
          </main>
        </div>
      </div>
    `,
      'text/html',
    )
    popupEl.getElementById(closeBtnId).addEventListener('click', clearOldPopup)

    document.body.appendChild(popupEl.body.firstChild)
  }

  const genPopupWhenReady = () => {
    const retry = 100
    let triedCount = 0
    const TOTAL_LOADING_UI_COUNT = 4

    const intervalId = setInterval(() => {
      if (triedCount === retry) {
        clearInterval(intervalId)
        return
      }

      const clickedMenu = document.body.querySelector('.jstree-clicked')?.lastChild?.data

      if (!clickedMenu) {
        triedCount++
        return
      }

      if (clickedMenu !== '근무시간집계현황') {
        clearOldPopup()
        clearInterval(intervalId)
        return
      }

      const loadings = [
        ...(document
          .querySelector('#_content')
          ?.contentDocument.querySelectorAll('.PUDD-UI-loading') ?? []),
      ]

      if (loadings.length !== TOTAL_LOADING_UI_COUNT || !loadings.every((l) => l.style.display === 'none')) {
        triedCount++
        return
      }

      const searchBtn = document
        .querySelector('#_content')
        ?.contentDocument.querySelector('#searchBtn')

      if (!searchBtn) {
        triedCount++
        return
      }

      searchBtn.removeEventListener('click', genPopupWhenReady)
      searchBtn.addEventListener('click', genPopupWhenReady)

      genContent()
      clearInterval(intervalId)
    }, 300)
  }

  genPopupWhenReady()
})()
