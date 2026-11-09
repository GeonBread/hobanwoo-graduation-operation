# Chapter 2 game fixes — V1 (2026-11-09)

본 ZIP은 **실제 게임 프로젝트의 챕터 2 소스 5개**를 수정합니다.
다른 챕터, 기존 Git 상태, `public/assets/runtime/combatParallax.js`,
`src/embedded/chapter3Wave.html`은 변경하지 않습니다.

## 적용

1. ZIP을 압축 해제하세요.
2. `APPLY_CHAPTER2_V1.cmd`를 실행하세요.
3. `[SUCCESS] Chapter 2 patch applied`가 표시되면 게임 개발 서버를 종료하고 재실행하세요.
4. `Ctrl + Shift + R`로 브라우저를 강력 새로고침하세요.

개발 서버가 `npm run generate:story` 단계에서 실행되지 않을 경우,
같은 폴더의 `RUN_VITE_DIRECT.cmd`를 실행하면 기존 로컬 Vite를 직접 시작합니다.
이 파일은 프로젝트 패키지를 설치하거나 소스를 수정하지 않습니다.

## 반영 항목

1. 준호 대사에서 핸드폰 일러스트 `junho_avoid` 지정.
2. 모든 카톡 연출 진입 즉시 배우 이미지를 숨기고 이미지 `src` 제거; 지속형 카톡에서도 숨김.
3. 장소 카드 `도서관 신관 / 지하 1층 열람실` 두 줄로 의도적인 줄바꿈.
4. 사용자 요청 없음.
5. #104 PPT 작업 안내 문구 제거; 마우스 커서 외곽선 명도 강화.
6. #107·#108은 원래 동일 이미지 파일을 사용함을 확인(불필요한 변경 없음).
7. 스토리에서 전투 진입 시 웨이브 BGM 재시작/페이드 해제.
8. 챕터 2 HUD 아이콘 크기 보정; 일반 몬스터 사망 시 챕터 1과 동일한 16% 아이템 드롭.
   보스 지원 몬스터는 이미 일반 충돌 시스템에서 챕터 1 지원몹과 동일한 55% 드롭률이 설정되어 있으므로 중복 생성 없음.
9. 사망한 형광펜 몬스터의 흔적이 1.65초에 걸쳐 감소하면서 사라짐, 사망 후 흔적 추가 충돌 비활성화.
10. 일반 유령·포인터·잠수함은 화면 이탈 후 상단에서 재진입; W3/10/13/16/24는 예외 유지.
11. W11 갈라가형 몬스터는 완전히 화면에서 이탈하면 긴 화면 밖 대기를 생략하고 경로의 첫 화면 구간으로 복귀.
12. 정화 효과 원점을 캔버스 좌표에서 실제 전체 화면 오버레이 좌표로 보정.
13. #167 호반우 연한 중립 포즈 이미지 지정.
14. 모든 시험공부 연출의 좌상단 제목/문제 안내 박스 숨김.
15. 포털(#241)에서 핵심 오염원 BGM 3.6초 페이드아웃 후 보스 구역(#242) 도착 BGM 시작.
16. 보스 1페이즈 2000→3500 HP, 2페이즈 2200→3700 HP.
17. 보스 화면 밖 퇴장 후 1초 → 암전 1초 → 완전 암전 2초 → 스토리 페이드인 1초.
    발표 BGM 시작을 Story #313으로 이동.
18. 중간고사 서술형 답안 줄바꿈 및 글자 reveal 클리핑 방식 개선.

## 원본 백업과 안전 장치

패치를 시작하기 전에 5개 대상 파일 모두가 최초 AI_CONTEXT 소스의 SHA-256과
일치하는지 확인합니다. 일치하지 않으면 일부 파일도 수정하지 않고 중단합니다.
적용 전에 원본이 `Downloads/HOBANWOO_PATCH_BACKUPS/CHAPTER2_날짜시간/`에 저장됩니다.
GitHub 동기화, `git reset`, `git clean`, `git stash`는 실행되지 않습니다.

## 검증 범위

스토리 데이터 JSON (356개 항목) 파싱, HTML 내 JavaScript 구문 검사,
수정한 TypeScript 구문 검사 통과. Windows 실제 게임 플레이/렌더링 QA는 수행하지 못했습니다.

## GitHub 반영 (적용 성공 이후 선택)

git add src/embedded/chapter2Story.html src/components/story/Chapter2StoryExperience.tsx src/components/story/chapter2StoryExperience.css src/game/chapter2/chapter2WaveSystem.ts src/game/chapter2/chapter2BossOriginalRuntime.ts
git commit -m "Fix chapter 2 story and combat issues"
git push origin main

기존 `combatParallax.js`, `chapter3Wave.html` 로컬 변경은 위 `git add`에 포함하지 않습니다.
