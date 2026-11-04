# 호반우의 졸업 대작전 - V8 폰트 통일 패치 (2026-11-04)

## 적용 범위
1. 챕터 3 디그리온 **보스전 대사 채팅**(`.encounter-voice p`)
   - 기존 `Degreeon Black Han`을 `Noto Sans KR`로 변경
   - 스토리 본문과 동일한 ExtraBold 800 적용
   - 대사 내용, 강조 효과, 대사 타이밍, 버튼, 전투 로직 유지
   - 디그리온 등장/각성 타이틀 및 클리어 제목의 특수 폰트는 유지

2. 챕터 1 프롤로그 **장소 텍스트**
   - `첨성대 코어`, `입학식`만 `Noto Sans KR` Black 900 적용
   - 텍스트 중앙 위치, 검정 반투명 그라데이션, 배경 연출, 페이드 타이밍 유지
   - 다른 챕터 및 캐릭터 대사에 영향 없음

## 포함 파일 (3개 소스)
- `src/game/chapter3/degreeon/encounterOverlay.css`
- `public/assets/common/styles/hobanwooTypography.css`
- `src/story/chapter1/prologue/prologueRuntime.js`

## 적용
- 기존 V7.1 패치까지 적용된 프로젝트에서 ZIP을 `APPLY_PATCH.cmd`로 적용
- 압축 해제하여 프로젝트 최상위에 상대경로 그대로 덮어씌워도 됩니다.

## 검증
- 프롤로그 JS `node --check` 통과
- 브라우저 계산 스타일: 보스전 대사 Noto Sans KR 800, 장소 2종 Noto Sans KR 900
- 디그리온 클리어 제목은 Degreeon Black Han 유지
- `git diff --check` / ZIP 무결성 검사 통과
