# 호반우의 졸업 대작전 — 코드·미디어 구조 진단 (2026-11-08)

## 진단 기준과 한계

- 검토 기준: 2026-11-07 17:02:16 (+09:00)의 AI_CONTEXT 소스 스냅샷과 프로젝트 파일 인덱스, 2026-11-08까지 제공된 후속 코드 패치.
- 파일 인덱스 기준 **175개 `src` 파일과 369개 `public/assets` 파일명**을 확인했지만, 최신 GitHub의 미디어 파일 **바이너리 전체는 제공받지 못했습니다**.
- 따라서 다음 결과는 소스/경로 구조 진단이며, 실제 삭제 여부는 제공하는 도구가 사용자의 **현 로컬 Git 프로젝트**에서 새로 계산합니다.
- `git ls-files`를 기준으로 추적 파일을 확인하고, 변경된 파일은 자동 삭제하지 않습니다.

## 권장 소유권 규칙

```text
src/
  App.tsx, main.tsx                 앱 라우팅/엔트리
  components/story/                챕터 스토리 UI와 연결
  story/chapter1/                  챕터 1 스토리/데이터/에셋 매핑
  embedded/                        Vite에서 URL로 내보내는 챕터 2/3 스토리/웨이브 HTML
  game/chapter1/                   챕터 1 전투 시스템
  game/chapter2/                   챕터 2 전투 시스템
  game/chapter3/                   챕터 3 전투 시스템
  game/render, player, enemies...  공통 엔진 기능

public/assets/
  common/                          챕터 간 공통 사용이 검증된 에셋
  audio/common/                    메뉴·여러 챕터에서 공유되는 오디오
  audio/chapter1..3/               해당 챕터 고유 오디오
  chapter1..3/story/               챕터 고유 스토리 배경/캐릭터/초상화/삽화/UI
  chapter1..3/combat/              챕터 고유 전투 맵/몬스터/탄/보스/UI
  runtime/                         빌드 스크립트로 생성되는 파일
```

**원칙:** 파일명을 기준으로 판단하지 않습니다. 실제 참조 파일, 호출 시점 및 동적 경로 생성 여부를 우선합니다. `common`은 무조건 챕터 폴더로 옮기는 대상이 아닙니다.

## 확인된 오인 가능 사례 — 자동 이동 금지

| 에셋/경로 | 실제 소스 근거 | 판단 |
|---|---|---|
| `common/backgrounds/chapter1_parallax_layer_*.png` | `src/game/chapter3/degreeon/originalChapter3.ts`에서도 참조 | 챕터 1 전용으로 단정 금지 |
| `audio/common/1phase...`, `2phase...`, `3phase...` | `src/game/AudioSystem.ts`가 직접 사용 | 공용 음악으로 유지 |
| `chapter3/combat/waves/ui/life_shield_*_ch1.png` | `src/embedded/chapter3Wave.html`, `originalChapter3.ts`에서 사용 | 이름의 `_ch1`은 구형 표기이나 사용 위치는 챕터 3 |
| `chapter2/combat/waves/enemies/` | `src/game/chapter3/degreeon/menuMonsterMix.ts`에서도 사용 | 챕터 3이 챕터 2 적을 재사용하는 기능이며, 오분류로 단정 불가 |
| `chapter2/story/legacy`와 `chapter3/story/legacy` | 해당 `src/embedded/chapter*Story.html`에서 배경·초상화·프레임 참조 | `legacy`라는 이름만 보고 삭제 금지 |
| `common/fonts/chapter3-final-boss-title.woff` | 동일 이름의 직접 사용은 소스 스냅샷에서 미발견; `bossFont.css`에는 별도의 인라인 폰트 포함 | 중복 가능성은 있지만 실제 미디어 파일을 검사하기 전에는 제거 확정 금지 |

## 리뷰 후 정리 가능한 소스 코드 (스냅샷에서 외부 import 미발견)

아래 5개 파일은 날짜별 SHA-256까지 잠가 두었습니다. **현재 로컬에서 내용이 변경됐거나, 외부 참조가 발견되면 자동 삭제 대상에서 제외됩니다.**

1. `src/components/DevSandbox.tsx`
2. `src/game/data/sandboxCatalog.ts` (`DevSandbox` 전용)
3. `src/components/ui/NotificationDialog.tsx`
4. `src/components/ui/notificationDialog.css` (`NotificationDialog` 전용)
5. `src/lib/utils.ts` (현재 코드에서의 `cn` import 미발견)

내부 로직(예: 실제 게임 엔진의 sandbox/debug 필드)이 완전히 불필요하다는 뜻은 아닙니다. 해당 모듈을 사용하지 않는다는 것과 엔진 내부 필드 사용 여부는 별개입니다.

## 큰 규모의 코드 정리: 자동 삭제하지 않는 항목

`src/embedded/chapter3Story.html`은 동일한 `STORY_CUSTOM_EFFECTS` 이름을 여러 번 할당한 효과가 **19종** 있습니다. 그중 `digrion-body-break`는 **9번** 할당됩니다(스냅샷 기준). 이 코드는 마지막 할당이 적용되지만, 이전 `<script>` 블록이 다른 초기화/이벤트까지 포함할 수 있어 **문자열 검색으로 전체 블록을 삭제하는 것은 위험**합니다.

마찬가지로 챕터 1 스토리 코드에는 인라인 런타임 문자열이 대량 포함돼 있으며, 단순히 '호출되지 않는 함수'처럼 보이더라도 브리지 이벤트나 시네마틱 전환 과정에서 사용될 수 있습니다. 이 작업은 챕터 1~3의 전체 스토리, 웨이브 및 보스의 자동 회귀 테스트 후 별도 리팩터링이 필요합니다.

## 실행 도구 및 삭제 기준

- `node tools/project-maintenance/project_maintenance.cjs audit`: 미디어와 소스를 실제 로컬 프로젝트에서 전수 검색하여 `.git/project-maintenance/reports/latest-audit.json`, `latest-summary.txt` 생성
- `node tools/project-maintenance/organize_media.cjs`: 확정 가능한 챕터 단일 소유 미디어만 이동 후보로 출력
- `node tools/project-maintenance/organize_media.cjs --apply`: 원본 경로의 **완전한 리터럴 URL**만 사용되고 다른 간접 참조가 없는 경우에 한하여 이동 및 소스 경로 치환. 기본적으로 미리보기
- `node tools/project-maintenance/project_maintenance.cjs cleanup --code`: 코드 후보까지 포함하여 삭제 예상 목록 출력
- `node tools/project-maintenance/project_maintenance.cjs cleanup --apply --code`: Git이 추적하고 미수정인, 명시적 코드/에셋 참조가 없는 후보만 원본을 격리한 후 `npm run lint` 실행. 오류 발생 시 원상복구
- `node tools/project-maintenance/project_maintenance.cjs restore`: 마지막 정리의 격리 파일 복구
- `node tools/project-maintenance/organize_media.cjs --restore`: 마지막 미디어 이동 및 소스 치환 복구. 이후 변경된 파일은 덮어쓰지 않음

**중요:** 미사용 판정은 정적 분석만으로 완전하지 않습니다. manifest·문자열 조합·런타임 `fetch`·에셋 이름 생성 등은 간접 참조일 수 있습니다. 소스/에셋 이름만으로 모든 미사용 파일을 안전하게 확정할 수 없으므로 오디오/폰트/일부 시나리오 에셋은 보고서 전용으로 남겨 둡니다.

## 변경 후 Git 및 동작 검증

CMD에서, 프로젝트 루트 기준:

```bat
npm run lint
npm run build
git status
git diff --check
git add -A -- src public tools/project-maintenance docs/project-media-structure-audit-20261108.md RUN_PROJECT_MAINTENANCE.cmd
git diff --cached --stat
git commit -m "refactor: audit and clean unused game resources"
git push origin dev/chapter3-integration
```

커밋 이전에 **각 챕터 스토리의 장면 전환, 호반우 이미지, BGM, 전투 웨이브, 보스 패턴 및 엔딩**을 직접 검사하세요.

백업/보고서는 `.git/project-maintenance/`에 생성되어 `git status`를 더럽히지 않습니다. 단, GitHub에는 올라가지 않으므로 로컬 `.git`을 삭제하지 마세요.
