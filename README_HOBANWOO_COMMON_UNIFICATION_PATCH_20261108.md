# V2 수정본 - TypeScript 중복 키 오류 해결 (2026-11-08)

**이 ZIP은 1차 통합 패치의 전체 교체본입니다.** 이전 ZIP에서 `src/story/chapter1/chapter1StoryAssetCatalog.ts`의 중복 `portrait_system.svg` 키 때문에 발생한 TS1117 오류를 해결했습니다. 기존 87개 원본 매핑 키는 그대로 보존했습니다. 챕터 3의 마지막 학기 연출에서 동적으로 만들던 `hobanwoo_pose_thinking.png` / `hobanwoo_pose_neutral.png` 파일 경로도 실제 긴 파일명으로 바꿨습니다.

**적용:** 이 ZIP 하나만 기존 프로젝트에 적용하면 됩니다. 이전 실패에서 패치 러너가 원상복구했으므로, 과거 ZIP을 다시 적용하지 마세요. 통합 패치를 정상 적용한 뒤 기존 자동 삭제 프로그램을 실행하시면 됩니다.

---

# Hobanwoo Common Illustration Unification Patch (2026-11-08)

적용 대상: 기존 프로젝트 루트에 그대로 덮어쓰기

## 변경 사항
- 챕터 1/2/3에서 짧은 이름의 호반우 일러스트 참조를 모두 긴 공통 파일명으로 교체했습니다.
- 챕터 1 전용 호반우 포즈 참조를 공통 `/assets/common/characters/hobanwoo/` 경로만 사용하도록 통일했습니다.
- 신규 3종 일러스트를 공통 폴더에 추가했습니다:
  - hobanwoo_pose_neutral_eyes_open_flat_brows_straight_mouth_arms_down.png
  - hobanwoo_pose_relaxed_neutral_eyes_open_softly_curved_brows_straight_mouth_arms_down.png
  - hobanwoo_pose_gentle_smile_eyes_open_softly_curved_brows_arms_down.png
- 챕터 2/3 기본 neutral 포즈는 `relaxed_neutral`을, brave 계열은 `gentle_smile`을 사용하도록 반영했습니다.
- portrait도 공통 긴 이름 `hobanwoo_portrait_eyes_open_soft_smile_hands_on_hips.png`로 통일했습니다.

## 수정 파일
- src/story/chapter1/chapter1StoryAssetCatalog.ts
- src/embedded/chapter2Story.html
- src/embedded/chapter3Story.html
- public/assets/common/characters/hobanwoo/*.png (신규 3종)

## 제거 대상 파일(프로젝트 원본에 남아 있으면 수동 삭제 권장)
- public/assets/common/characters/hobanwoo/hobanwoo_pose_angry.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_battle_ready.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_brave.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_combat.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_crying.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_dejected.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_earnest.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_excited.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_explaining.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_gloomy.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_happy.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_neutral.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_presenting.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_sad.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_shocked.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_shy.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_sleepy.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_surprised.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_thinking.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_uneasy.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_wary.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_wave.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_wink.png
- public/assets/common/characters/hobanwoo/hobanwoo_pose_worried.png
- public/assets/common/characters/hobanwoo/portrait_hobanwoo.png
- public/assets/chapter1/story/characters/hobanwoo_pose_cautious_resolve.png
- public/assets/chapter1/story/characters/hobanwoo_pose_confident_present.png
- public/assets/chapter1/story/characters/hobanwoo_pose_down.png
- public/assets/chapter1/story/characters/hobanwoo_pose_expressionless.png
- public/assets/chapter1/story/characters/hobanwoo_pose_fierce_battle.png
- public/assets/chapter1/story/characters/hobanwoo_pose_flustered.png
- public/assets/chapter1/story/characters/hobanwoo_pose_point.png
- public/assets/chapter1/story/characters/hobanwoo_pose_serious_brave.png
- public/assets/chapter1/story/characters/hobanwoo_pose_sparkle.png
- public/assets/chapter1/story/characters/hobanwoo_pose_troubled_crossed.png
- public/assets/chapter1/story/characters/portrait_hobanwoo.svg
- public/assets/chapter1/story/characters/character_hobanwoo.svg

## 비고
- 이 패치는 참조 경로를 공통 세트로 바꾸는 데 초점이 있습니다.
- 기존 짧은 이름 파일이 프로젝트에 남아 있어도 실제 스토리에서 더 이상 참조하지 않도록 수정했습니다.
