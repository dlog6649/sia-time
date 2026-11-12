# sia-time repo

이 저장소는 `시아시간` 크롬 확장프로그램의 소스와 빌드 구성을 관리한다.

확장프로그램 사용자용 안내는 [public/README.md](public/README.md)에 있다.

## 개발 구조

- `src/`: TypeScript 소스
- `public/`: 정적 자산과 확장프로그램 배포용 문서
- `dist/`: 빌드 결과물

크롬 확장프로그램은 `dist/` 폴더를 로드해서 사용한다.

## 근태 계산 문서

- [그룹웨어 동작과 계산 규칙](docs/GROUPWARE_BEHAVIOR.md)
- [기술 분석](docs/SIA_TIME_ANALYSIS.md)

## 빌드

```bash
pnpm install
pnpm build
```

## 타입 체크

```bash
pnpm type
```

## 테스트

```bash
pnpm test
```

확장프로그램을 빌드한 뒤 [보관 화면 회귀 테스트](tests/open-popover-regression.test.mjs)로 기존 월간 출력, 주간 보기 전환과 월 경계 집계를 검증한다.
