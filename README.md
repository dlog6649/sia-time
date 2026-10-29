# sia-time repo

이 저장소는 `시아시간` 크롬 확장프로그램의 소스와 빌드 구성을 관리한다.

확장프로그램 사용자용 README 는 [public/README.md](/Users/hbim/dev/repositories/sia-time/public/README.md) 에 있다.

## 개발 구조

- `src/`: TypeScript 소스
- `public/`: 정적 자산과 확장프로그램 배포용 문서
- `dist/`: 빌드 결과물

크롬 확장프로그램은 `dist/` 폴더를 로드해서 사용한다.

## 근태 계산 문서

- [그룹웨어 동작과 계산 규칙](docs/GROUPWARE_BEHAVIOR.md): 확인 근거, 출장 보정 제외 이유, 기안 상태와 집계 시점에 관한 확인 범위
- [기술 분석](docs/SIA_TIME_ANALYSIS.md): 표 데이터와 주요 함수의 동작 구조

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

빌드 후 기존 샘플 출력과 미승인 출장 보완의 회귀 테스트를 실행한다. 계산 규칙과 검증 범위는 위 근태 계산 문서를 참고한다.
