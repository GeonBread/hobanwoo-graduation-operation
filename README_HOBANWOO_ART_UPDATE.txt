호반우 대사별 일러스트 적용 — 446개 (2026-11-01)

적용 기준
- 기존 챕터 3 보스/맵 수정과 CH3_Fixes_V3 적용본을 기준으로 합니다.
- 새 전공 사격·보스 패턴 패치를 포함하는 ZIP이 아니라 호반우 일러스트 적용용 ZIP입니다.

적용 방법
1. 압축을 풀지 않습니다.
2. 프로젝트의 tools/chapter1_patch_runner/APPLY_PATCH.cmd 위로 이 ZIP을 드래그합니다.
3. 이전 잠금 파일 복구용 패치 프로그램을 그대로 사용합니다.

적용 결과
- 챕터 1: 165개 (전반부 87 / 후반부 78)
- 챕터 2: 152개
- 챕터 3: 129개
- 합계 446개를 현재 실제 장면과 대사 원문으로 대응시켰습니다.
- 대사 ID/줄 번호만으로 순서를 강제하지 않습니다. 같은 문장의 장면과 반복 순번을 구분합니다.
- 없는 문장은 추가하지 않으며, 현재 대사·다른 캐릭터 설정·기존 장면 연출을 유지합니다.
- PNG 25종을 영어 원본 파일명과 원본 바이트 그대로 추가했습니다.
- 원본 PNG를 자르거나 재인코딩하지 않고, 투명 캔버스 속 캐릭터 높이와 발 중심을 표시 단계에서 보정합니다.
- P05/P14 오열 그림의 대사 배정은 0개입니다. P25는 초상화용으로 보관하며 전신 대사에는 사용하지 않습니다.
- 웹/공유 폴더/카톡의 호반우 표시와 디그리온 첫 등장 시 호반우 숨김도 검증했습니다.
- 전체화면 대사 중 창 크기가 바뀌면 현재 대사 정보를 오버레이 갱신 함수에 전달하도록 수정했습니다.

검증
- 신규 매핑/배치/원본 보존 테스트 10개 통과.
- TypeScript 검사 및 프로덕션 빌드 통과.
- 실제 렌더러에서 446개 대사의 이미지 경로와 로딩, 발 기준점을 확인했습니다.
- 창 크기 변경과 웹/공유 폴더/카톡 위 표시 및 보스 등장 중 숨김 확인.
- 추가된 일러스트의 HTTP 오류와 검증 브라우저의 스크립트 오류 0개.
- 전체 회귀 테스트는 기존 과학탄 테스트가 실시간 발사 휴지 구간에 좌우되지 않도록
  테스트 전용 시계를 고정하여 240개를 검증했습니다. 게임의 사격 코드는 수정하지 않았습니다.

개발자용 재검증 (프로젝트 루트)
node --import tsx --test tests/story/hobanwooDialogueArt.test.ts
node --import tsx --import ./tests/story/stableWeaponClock.mjs --test tests/chapter3/*.test.ts tests/story/*.test.ts

매핑 자료를 수정한 경우 공유 런타임과 HTML 내 사본 갱신
node tools/build_hobanwoo_dialogue_art.mjs

검토 자료
- docs/hobanwoo_dialogue_art/Hobanwoo_Dialogue_Remapping_446.csv: 제공 원본 매핑표
- docs/hobanwoo_dialogue_art/Verification.json: 적용 건수와 PNG 원본 해시/검증 요약
- src/story/hobanwooDialogueArtData.json: 장면/대사별 적용 규칙 및 크기·발 기준점 자료
