# SIA Time Analysis

이 문서는 `sia-time` 크롬 확장프로그램이 SIA groupware의 `인사/근태 > 근태현황 > 근무시간집계현황` 화면에서 어떻게 동작하는지 정리한 분석 문서다.

## 개요

이 프로그램의 핵심 역할은 SIA 근태 화면에 이미 존재하는 표 데이터를 읽어서, 별도의 팝오버 UI로 요약 정보를 보여주는 것이다.

주요 표시 항목은 다음과 같다.

- 총 근무일
- 남은 근무일
- 남은 재택근무
- 내 현황
- 요약
- 미달시간

핵심 구현은 [scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js) 에 들어 있다.

## 동작 구조

확장프로그램은 기존 SIA 페이지를 대체하지 않고, 현재 화면의 DOM을 읽어서 부가 정보를 계산한다.

구조는 대략 다음과 같다.

1. 사용자가 `근무시간집계현황` 메뉴에 들어간다.
2. 확장프로그램이 iframe 내부의 표 로딩이 끝날 때까지 기다린다.
3. `#grid2` 세부 현황 표와 `#grid3` 요약 표를 읽는다.
4. 필요한 값을 계산한다.
5. 우측 상단에 팝오버를 띄워 요약 정보를 보여준다.

이 흐름의 진입점은 [scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:330) 부근의 `openPopoverWhenReady()` 와 [scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:285) 의 `buildPopover()` 다.

## 데이터 소스

이 프로그램은 자체 DB나 백엔드를 쓰지 않는다. 계산에 필요한 값은 전부 현재 페이지의 HTML 표에서 읽어온다.

### 요약 표

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:112) 의 `summaryTableOrNull()` 은 SIA 화면의 `#grid3` 를 읽는다.

여기서 현재 쓰는 핵심 값은 `미달시간` 이다.

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:119) 의 `lackTimes()` 는:

1. 헤더에서 `미달시간` 컬럼의 위치를 찾고
2. 첫 번째 행의 `HH:MM` 값을 읽고
3. 시/분과 총 분(`totalLackMins`)으로 변환한다

중요한 점은, `미달시간`은 이 확장프로그램이 계산하지 않는다는 것이다. SIA 화면이 이미 계산해놓은 값을 그대로 파싱해서 사용한다.

### 세부 현황 표

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:106) 의 `detailTableOrNull()` 은 `#grid2` 를 읽는다.

이 표에서는 다음 데이터를 사용한다.

- `일자`
- `출근시간`
- `특이사항`

이 표를 기반으로 근무일 목록, 남은 근무일, 오늘 출근시간, 미래 특이사항 등을 계산한다.

## 주요 계산 규칙

### 근무일 판정

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:269) 의 `workingDayTrs()` 는 `일자` 셀에 빨간 글씨용 `span` 이 없는 행만 근무일로 본다.

즉 현재 구현은:

- 빨간 휴일 표기 행은 제외
- 일반 날짜 행은 근무일로 포함

이라는 간단한 DOM 규칙에 의존한다.

### 남은 근무일

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:280) 의 `remainingWorkingDayTrs()` 는 `오늘 포함 이후` 근무일만 남은 근무일로 본다.

기준은 자정으로 내린 오늘 날짜다.

즉:

- 오늘이 근무일이면 오늘도 포함
- 미래 평일도 포함
- 과거 날짜는 제외

### 총 남은 기본 근무시간

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:291) 의 `totalRemainingMins()` 는 다음 식을 쓴다.

```txt
남은 근무일 수 * 8시간
```

여기에는 아직 휴가, 반차, 출장 같은 특이사항이 반영되지 않는다. 말 그대로 기본 근무일 기준 총량이다.

### 특이사항 분 환산

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:18) 의 `convertSignificantToMins()` 가 문자열 기반으로 특이사항을 시간으로 바꾼다.

현재 규칙은 다음과 같다.

- `재택근무`, `연차`, `휴가`, `공가`, `병가`, `휴직`, `결혼`, `회갑`, `출산`, `사망`, `탈상`, `예비군`, `훈련소`, `기타` 는 8시간
- `반차`, `건강검진`, `백신접종`, `기타(반일)` 은 4시간
- `출장(09:00 ~ 18:00)` 같은 값은 시간 범위를 파싱해서 계산

출장 계산은 [scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:41) 의 `getBusinessTripMinutes()` 에서 처리한다.

현재 출장 계산 규칙은:

- `HH:MM ~ HH:MM` 패턴 파싱
- 시작~종료 차이 계산
- 12:00~13:00 겹치는 점심시간은 차감

예를 들어 `출장(09:00 ~ 18:00)` 은 `9시간 - 점심 1시간 = 8시간` 으로 계산된다.

## 내 현황 계산

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:240) 의 `getTotalSavingMins()` 가 `내 현황`의 원본 값이다.

현재 식은 다음과 같다.

```txt
내 현황 분 =
  남은 기본 근무시간
  - 미달시간
  - 미래 특이사항 차감분
```

코드로 쓰면:

```js
return totalRemainingMins() - lackTimes().totalLackMins - subtractedMinsInLackTime
```

여기서:

- `totalRemainingMins()` 는 `남은 근무일 * 8시간`
- `lackTimes().totalLackMins` 는 SIA 요약 표의 `미달시간`
- `subtractedMinsInLackTime` 은 미래 특이사항 중 별도로 차감할 시간

이다.

이 값이:

- 양수면 `저축`
- 음수면 `대출`

로 표시된다.

## 요약 문구 계산

[scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:185) 의 `summaryLabel()` 은 `내 현황`을 다시 이용해서 앞으로 하루에 몇 시간씩 근무하면 되는지 계산한다.

기본 식은:

```txt
(총 남은 기본 근무시간 - 내 현황) / 남은 근무일 수
```

이다.

마지막 근무일이면 별도 로직으로 오늘 몇 시 이후 퇴근 가능한지 계산한다.

## 출장 버그 분석

이번 분석에서 가장 중요했던 부분은 `출장`이 `내 현황`에 어떤 방식으로 반영되는지였다.

### 관찰된 사실

사용자가 제공한 HTML 샘플에서는 요약 표가 다음 관계를 그대로 만족했다.

```txt
소정근로 - 근무시간 - 유급휴가 - 연차 = 미달시간
```

예시 값:

- 소정근로: `171:00`
- 근무시간: `75:19`
- 유급휴가: `24:00`
- 연차: `04:00`
- 미달시간: `67:41`

즉:

```txt
171:00 - 75:19 - 24:00 - 04:00 = 67:41
```

이 식이 정확히 맞아떨어졌다.

### 의미

이 샘플 기준으로는:

- 미래 휴가류는 요약 표의 `유급휴가` 또는 `연차` 쪽에 선반영되는 것으로 보인다
- 반면 미래 `출장`은 `근무시간`, `유급휴가`, `연차` 어디에도 반영되지 않은 것으로 보인다

즉 `출장`은 SIA 원본 `미달시간`에 미리 반영되지 않는다고 해석하는 편이 자연스럽다.

### 내 현황과의 충돌

`내 현황`은 원래 `남은 근무일 * 8시간`에서 출발한다.

그래서 미래 특이사항이 있으면, 그 일정만큼 기본 근무시간을 차감해야 월말 기준 예상치가 맞아진다.

문제는 특이사항 종류마다 SIA 요약 표 반영 규칙이 다를 수 있다는 점이다.

- 휴가류는 요약 표가 이미 반영
- 출장은 요약 표가 미반영

이 상태에서 모든 특이사항을 동일하게 처리하면 특정 케이스에서 값이 어긋날 수 있다.

## 현재 코드의 보정 규칙

현재 코드는 [scripts/open-popover.js](/Users/hbim/dev/repositories/sia-time/scripts/open-popover.js:37) 의 `shouldSubtractSignificantFromLackTime()` 를 통해 미래 특이사항 차감 대상을 골라낸다.

현재 규칙은 다음과 같다.

```js
const shouldSubtractSignificantFromLackTime = (significant) => {
  return !significant.startsWith('출장')
}
```

즉:

- 미래 `출장`은 `subtractedMinsInLackTime` 에서 제외
- 미래 `휴가`, `반차`, `재택근무` 등은 계속 차감

현재 가정은 다음과 같다.

- 휴가류는 SIA `미달시간` 계산 체계에서 이미 선반영되므로 기존 로직을 유지
- 출장은 SIA `미달시간`에 선반영되지 않으므로 별도 차감에서 제외

## 예시 시나리오

사용자가 제공한 샘플 HTML 기준:

- 오늘: `2026-04-22`
- 남은 근무일: `7일`
- 남은 기본 근무시간: `56:00`
- SIA 미달시간: `67:41`
- 미래 특이사항: `출장` 2건

현재 규칙에서 미래 `출장`은 제외되므로 추가 차감은 `0:00` 이다.

결과:

```txt
56:00 - 67:41 = -11:41
```

즉 `내 현황`은 `11시간 41분 대출`이 된다.

## 유지보수 포인트

이 코드는 표의 텍스트와 DOM 구조에 강하게 의존한다. 따라서 다음 변화가 생기면 계산이 깨질 수 있다.

- `#grid2`, `#grid3` id 변경
- 컬럼명 `미달시간`, `특이사항`, `일자`, `출근시간` 변경
- 휴일 렌더링 방식 변경
- 특이사항 문자열 포맷 변경
- 출장 시간 문자열 포맷 변경

특히 특이사항 파싱은 텍스트 기반이므로, 업무 규칙이 늘어날수록 분기 관리가 필요하다.

## 향후 개선 아이디어

- 샘플 HTML 기반 테스트 스크립트 추가
- `미달시간`과 `내 현황` 계산 근거를 팝오버에 디버그 모드로 표시
- `출장`, `교육`, `외근` 같은 근태 항목별 반영 정책을 문서화

## 결론

이 확장프로그램은 SIA 화면의 원본 데이터를 직접 바꾸는 도구가 아니라, 화면에 이미 존재하는 요약 표와 세부 표를 해석해서 추가 정보를 보여주는 레이어다.

핵심 포인트는 두 가지다.

- `미달시간`은 SIA가 계산한 값을 그대로 사용한다
- `내 현황`은 남은 근무일 기준 기본 근무시간에 미래 특이사항 보정을 적용해 계산한다

이번 분석으로 확인된 것은, 미래 `출장`은 SIA 요약 표에 선반영되지 않는 반면 미래 휴가류는 선반영되는 것으로 보이며, 이 차이를 고려하지 않으면 `내 현황`이 어긋날 수 있다는 점이다.
