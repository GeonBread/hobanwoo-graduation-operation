# 챕터 2 수정 패치: story #63 마우스 정확도 + story #221 당황 일러스트

기준: 이전 챕터 2 수정/추가 패치가 반영된 chapter2Story.html

## 적용 방법

압축을 풀어 나오는 `src` 폴더를 기존 `sky-strike-retro-ace` 프로젝트 최상위 폴더에 덮어쓰십시오.
`src/embedded/chapter2Story.html` 파일 1개만 교체합니다. 기존 `public/assets`는 삭제하지 마십시오.

## story #63

- 기존 임의 포인터 이동과 별도로 시작되는 클릭/입력을 순차 처리하는 작업으로 교체
- 마우스가 도형 삽입 메뉴에 도착한 뒤 클릭하고, 실제 도형의 왼쪽 위에서 오른쪽 아래까지 드래그하여 도형을 작성
- 제목 상자, 세 도형 내부, 정렬 메뉴, 부제 상자 위치를 클릭한 이후 입력/정렬 수행
- 좌표 계산은 완성 크기의 도형 좌표와 표시창 스케일을 사용
- 브라우저 화면 검증: 클릭/드래그 18개 동작의 포인터 위치 모두 목표 요소 내부 확인

## story #221

- 문제 원인: story item의 `pose: flustered` 설정이 별도 대사별 PNG 규칙에 의해 P09 (윙크)로 덮어써졌음
- 일러스트 규칙 `CH2-093`을 P09에서 **P18**로 변경
- story #221 `rightImage`도 동일 파일 경로로 고정
- 사용 파일: `public/assets/common/characters/hobanwoo/hobanwoo_pose_flustered_raised_brows_slightly_open_mouth_palms_forward_sweat_drop.png`
- 이미지 자산은 소스 스냅샷에 포함되지 않았으며 본 패치에서도 추가/삭제하지 않음. 원본 프로젝트의 해당 이미지가 유지되어 있어야 합니다.

기존 다른 챕터 2 수정(공부 연출 #93/#194, 공학관 복도 카톡, 보스 등)은 그대로 유지합니다.
