(() => {
  const title = "시아시간"
  const popupId = "sia-time-popup-fj23CzEq"
  // 매달 제공되는 재택근무일수
  const wfhCountPerMonth = 2

  const convertSignificantToHours = (significant) => {
    const dayRegexp = /(재택근무|연차|휴가|공가|병가|휴직|결혼|회갑|출산|사망|탈상|예비군|훈련소)/g
    if (dayRegexp.test(significant) || significant === "기타") {
      return 8
    }

    const halfDayRegexp = /(반차|건강검진|백신접종|기타\(반일\))/g
    if (halfDayRegexp.test(significant)) {
      return 4
    }

    return 0
  }

  const genContent = () => {
    const oldPopup = document.getElementById(popupId)
    if (oldPopup) {
      document.body.removeChild(oldPopup)
    }

    const summaryTable = document.querySelector("#_content")?.contentDocument.querySelector("#grid3")
    const lackTimeIdx = [...(summaryTable?.querySelector("thead")?.querySelectorAll("th") ?? [])]
      .findIndex((th) => th.innerText === "미달시간")
    const lackTimeTxt = summaryTable?.querySelector("tbody")?.querySelector("tr")?.childNodes[lackTimeIdx]?.innerText ?? ""
    const [lackH, lackM] = lackTimeTxt.split(":").map(Number)
    const lackMins = lackH * 60 + lackM

    const detailTable = document.querySelector("#_content")?.contentDocument.querySelector("#grid2")
    const ths = [...(detailTable?.querySelector("thead")?.querySelectorAll("th") ?? [])]
    const dateIdx = ths.findIndex((th) => th.innerText === "일자")
    const significantIdx = ths.findIndex((th) => th.innerText === "특이사항")
    const bodyTrs = [...(detailTable?.querySelector("tbody")?.querySelectorAll("tr") ?? [])]
    const workingDayTrs = bodyTrs.filter((tr) => !tr.childNodes[dateIdx]?.firstElementChild)
    const totalWorkingDaysCount = workingDayTrs.length

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const remainingWorkingDayTrs = workingDayTrs.filter((tr) => new Date(tr.childNodes[dateIdx]?.innerText).getTime() >= startOfToday.getTime())

    const subtractedMinsInLackTime = remainingWorkingDayTrs.reduce((acc, tr) => {
      const significants = tr.childNodes[significantIdx]?.innerText.split("\n")
      const hours = significants.reduce((acc, sig) => (acc + convertSignificantToHours(sig)), 0)

      return acc + hours
    }, 0) * 60

    const remainingWorkingDaysCount = remainingWorkingDayTrs.length

    const usedWfhCount = workingDayTrs.filter((tr) => tr.childNodes[significantIdx]?.innerText === "재택근무").length
    const remainingWfhCount = wfhCountPerMonth - usedWfhCount

    const pageDate = new Date(bodyTrs[0]?.childNodes[dateIdx]?.innerText)
    const dateText = `${pageDate.getFullYear()}년 ${pageDate.getMonth() + 1}월`

    const totalRemainingMins = remainingWorkingDaysCount * 8 * 60

    const toTimeText = (h, m) => {
      const hours = h > 0 ? `${h}시간` : ""
      const mins = m > 0 ? `${m}분` : ""

      return `${hours} ${mins}`.trim()
    }

    const savingMins = totalRemainingMins - lackMins - subtractedMinsInLackTime
    const uSavingMins = Math.abs(savingMins)
    const savingH = parseInt(uSavingMins / 60)
    const savingM = uSavingMins % 60
    const myStatus =
      savingH + savingM === 0
        ? "저축한 시간이 없어요."
        : `${toTimeText(savingH, savingM)} ${
          savingMins < 0
            ? "<span style='color: #EF2B2A; font-weight: 700;'>대출</span>"
            : "<span style='color: #487AFF; font-weight: 700;'>저축</span>"
        }했어요.`

    const remainingMins = totalRemainingMins - savingMins
    const minsPerDay = Math.abs(remainingMins) / remainingWorkingDaysCount
    const summaryH = parseInt(minsPerDay / 60)
    const summaryM = Math.round(minsPerDay % 60)
    const summary =
      remainingWorkingDaysCount === 0
        ? "이달의 근무가 끝났어요."
        : remainingMins < 0
          ? "미달시간이 없어요."
          : `앞으로 하루에 ${toTimeText(summaryH, summaryM)}씩 근무하면 돼요.`

    const thProps = `style="background-color: #F5F5F5; display: flex; align-items: center; padding: 4px 8px; border-right: 1px solid #CCC; border-bottom: 1px solid #CCC;"`
    const tdProps = `style="display: flex; align-items: center; padding: 4px 8px; color: #616161; border-right: 1px solid #CCC; border-bottom: 1px solid #CCC; white-space: pre-wrap; word-break: break-word;"`

    const popupHtml = new DOMParser().parseFromString(`
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
            <div style="font-size: 18px; font-weight: 800;">${title}</div>
            <button
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
              onclick="(() => {
                const oldPopup = document.getElementById('${popupId}')
                if (oldPopup) {
                  document.body.removeChild(oldPopup)
                }
              })()"
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
              <div style="font-size: 18px; font-weight: 700; line-height: 28px;">${dateText}</div>
            </time>
            <div style="display: grid; grid-template-rows: repeat(6, minmax(32px, auto)); grid-template-columns: 106px 1fr; border-top: 1px solid #CCC; border-left: 1px solid #CCC; font-size: 14px;">
              <div ${thProps}>총 근무일</div><div ${tdProps}>${totalWorkingDaysCount}일</div>
              <div ${thProps}>남은 근무일</div><div ${tdProps}>${remainingWorkingDaysCount}일</div>
              <div ${thProps}>남은 재택근무</div><div ${tdProps}>${remainingWfhCount}일</div>
              <div ${thProps}>내 현황</div><div ${tdProps}>${myStatus}</div>
              <div ${thProps}>요약</div><div ${tdProps}>${summary}</div>
              <div ${thProps}>미달시간</div><div ${tdProps}>총 근무시간이 ${toTimeText(lackH, lackM)} 남았어요.</div>
            </div>
          </main>
        </div>
      </div>
    `, 'text/html')

    document.body.appendChild(popupHtml.body.firstChild)
  }

  const genPopupWhenReady = () => {
    const retry = 100
    let triedCount = 0

    const intervalId = setInterval(() => {
      if (triedCount === retry) {
        clearInterval(intervalId)
        return
      }

      const clickedMenu = document.body.querySelector(".jstree-clicked")?.lastChild?.data

      if (!clickedMenu) {
        triedCount++
        return
      }

      if (clickedMenu !== "근무시간집계현황") {
        const oldPopup = document.getElementById(popupId)
        if (oldPopup) {
          document.body.removeChild(oldPopup)
        }
        clearInterval(intervalId)
        return
      }

      const loadings = [...(document.querySelector("#_content")?.contentDocument.querySelectorAll(".PUDD-UI-loading") ?? [])]

      if (loadings.length !== 4 || !loadings.every((l) => l.style.display === "none")) {
        triedCount++
        return
      }

      const searchBtn = document.querySelector("#_content")?.contentDocument.querySelector("#searchBtn")

      if (!searchBtn) {
        triedCount++
        return
      }

      searchBtn.removeEventListener("click", genPopupWhenReady)
      searchBtn.addEventListener("click", genPopupWhenReady)

      genContent()
      clearInterval(intervalId)
    }, 300)
  }

  genPopupWhenReady()
})()
