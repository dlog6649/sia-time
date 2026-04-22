# sia-time repo

이 저장소는 `시아시간` 크롬 확장프로그램의 소스와 빌드 구성을 관리한다.

확장프로그램 사용자용 README 는 [public/README.md](/Users/hbim/dev/repositories/sia-time/public/README.md) 에 있다.

## 개발 구조

- `src/`: TypeScript 소스
- `public/`: 정적 자산과 확장프로그램 배포용 문서
- `dist/`: 빌드 결과물

크롬 확장프로그램은 `dist/` 폴더를 로드해서 사용한다.

## 빌드

```bash
pnpm install
pnpm build
```

## 타입 체크

```bash
pnpm type
```
