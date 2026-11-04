# 호반우의 졸업 대작전 - 챕터 3 디그리온 보스전 V10 패치

## 변경 사항

1. **Shift 폭탄 입력 복구**
   - 좌/우 Shift로 스마트 폭탄 발동. 기존 X/B 입력은 유지.
   - 전투 버튼을 클릭해 키보드 포커스가 버튼에 남은 경우에도 Shift 입력 처리.
   - 폭탄이 실제 발동했을 때만 폭탄 효과음 재생.

2. **원거리 공격 지원몹 오마카세 등장**
   - 챕터 3 기존 적 에셋에서 `inspection_eye.png`(졸업 검수 아이), `file_carrier.png`(결재 파일 캐리어)만 사용.
   - 세 마리씩 혼합 조합으로 출현. 첫 등장 대기 6.5초, 이후 10.5~13초 간격(기존 챕터 2 보스 지원몹 주기).
   - 탄환 발사 공격만 사용하며, 몸통 충돌 판정은 기존 전투 시스템을 따름.
   - 기존 보스 일반 공격 구간에만 등장. 특수 패턴, 시네마틱 대사, 패턴 학습 전용 구간에는 등장하지 않음.

3. **챕터 2 보스 지원몹과 동일한 아이템 확률**
   - 지원몹을 **개별 처치할 때 55%** 확률로 아이템 1개 드롭.
   - 드롭된 아이템은 **회복 34%, 화력 강화 66%** 비율.
   - 스마트 폭탄으로 처치한 적에게도 동일한 드롭 로직 적용.
   - 아이템을 획득하면 체력 또는 플레이어 탄환 레벨이 실제로 증가.

## 변경 파일
- `src/components/story/Chapter3BossBattle.tsx`
- `src/game/chapter3/degreeon/bossSupport.ts` (신규)
- `src/game/chapter3/degreeon/core.ts`
- `src/game/chapter3/degreeon/engine.ts`
- `src/game/chapter3/degreeon/encounter.ts`
- `src/game/chapter3/degreeon/continuity.ts`
- `src/game/chapter3/degreeon/resources.ts`
- `src/game/chapter3/degreeon/render.ts`
- `tests/chapter3/bossSupport.test.ts` (신규 회귀 테스트)

## 설치
- V9 Starfall Circuit BGM 패치가 적용된 프로젝트에서 사용합니다.
- ZIP 압축을 풀고 프로젝트 루트에 상대 경로 그대로 덮어쓰거나 `APPLY_PATCH.cmd`에 ZIP을 드래그합니다.
- 별도 이미지/음원은 필요하지 않습니다. 기존 프로젝트의 챕터 3 전투 에셋을 재사용합니다.

## 확인
- Chapter 3 지원몹 관련 회귀 테스트 5종 통과.
- 패치 파일 Git 공백 검사 및 ZIP 무결성 검사 통과.
- 전체 이미지/의존성이 없는 별도 작업 환경이므로 실제 완성 게임의 전 구간 플레이 검증은 하지 못했습니다.
