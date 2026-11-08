# 호반우의 졸업 대작전

Vite + React + TypeScript 게임입니다. 기존 public/assets의 미디어를 함께 유지합니다.

```bat
npm ci
npm run dev
npm run lint
npm run build
npm run preview
```

- 웹 배포에는 `dist/`의 내용만 올립니다. 소스·node_modules·Git 폴더는 업로드하지 않습니다.
- `scripts/build/`의 두 생성기는 스토리 효과와 패럴랙스를 만들기 위해 필요합니다.
- 폰트 라이선스는 `public/licenses/`와 에셋 옆 고지에 있으며 빌드 결과에도 포함됩니다.
- 온라인 순위표를 사용할 때는 기존 Supabase 함수·스키마와 VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY 또는 VITE_SUPABASE_ANON_KEY 설정이 필요합니다.
