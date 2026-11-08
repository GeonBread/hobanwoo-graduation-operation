# 호반우의 졸업 대작전

> 졸업까지 무사히 도착할 수 있을까요?
>
> **경북대학교 캠퍼스**를 무대로 펼쳐지는 스토리형 세로 스크롤 슈팅 게임입니다.

## 🎮 게임 소개

평범하던 캠퍼스의 학사 시스템에 정체불명의 오염이 퍼지기 시작합니다. 학생증 인증은 실패하고, 강의실 안내는 뒤엉키며, 공지사항은 끝없이 쏟아집니다.

이 혼란 속에서 주인공 **호반우**는 캠퍼스를 가로막는 적들과 맞서며 졸업을 향한 여정을 이어갑니다. 이야기를 따라가며 다양한 슈팅 스테이지와 보스전을 경험해 보세요.

### 주요 특징

- **스토리와 슈팅의 결합:** 대화와 이벤트 장면을 감상하고 세로 스크롤 전투에 도전합니다.
- **캠퍼스를 배경으로 한 이야기:** 익숙한 대학 생활의 풍경을 게임 속 사건과 적으로 재해석했습니다.
- **다양한 적과 보스전:** 스테이지마다 다른 공격 패턴과 연출이 등장합니다.
- **챕터별로 이어지는 여정:** 신입생 시절부터 졸업을 향한 도전까지 이야기가 펼쳐집니다.

## 🚀 게임 실행 방법

게임은 별도 설치 프로그램 대신 **웹브라우저에서 실행**하는 형태입니다. 처음 실행할 때는 Node.js와 npm이 필요합니다.

### 준비물

- [Node.js](https://nodejs.org/) **LTS 버전** (npm 포함)
- Chrome, Edge 등 최신 웹브라우저
- Windows 기준 아래 실행 방법 사용

### 방법 A — GitHub에서 ZIP으로 다운로드하기

1. 저장소 상단의 **Code → Download ZIP**을 누릅니다.
2. 다운로드한 ZIP 파일의 압축을 해제합니다.
3. 압축을 푼 프로젝트 폴더를 엽니다. (`package.json`이 보이는 위치)
4. 파일 탐색기 주소 표시줄에 `cmd`를 입력하고 Enter를 눌러 명령 프롬프트를 엽니다.
5. 다음 명령어를 **한 줄씩** 실행합니다.

```cmd
npm.cmd install
npm.cmd run dev
```

터미널에 다음 주소가 표시되면 브라우저로 접속하세요.

**http://localhost:3000/**

> 게임을 종료하려면 CMD 창에서 `Ctrl + C`를 누른 뒤, 종료를 묻는 메시지가 나오면 `Y`를 입력하세요.

### 방법 B — Git으로 다운로드하기

Git이 설치된 경우 다음 명령어로 프로젝트를 받을 수 있습니다.

```cmd
git clone https://github.com/GeonBread/hobanwoo-graduation-operation.git
cd hobanwoo-graduation-operation
npm.cmd install
npm.cmd run dev
```

> 저장소 주소는 GitHub에서 이름을 `hobanwoo-graduation-operation`으로 변경한 이후의 주소입니다.

## 🔧 개발자용 명령어

프로젝트 폴더에서 다음 명령어를 사용합니다.

| 명령어 | 설명 |
| --- | --- |
| `npm.cmd run dev` | 로컬 개발 서버 실행 (`http://localhost:3000/`) |
| `npm.cmd run lint` | TypeScript 검사 |
| `npm.cmd run build` | 배포용 빌드 생성 (`dist/`) |

### 주요 폴더

| 폴더 | 내용 |
| --- | --- |
| `src/` | 게임 화면, 스토리, 전투 로직 |
| `public/` | 이미지 등 게임 리소스 |
| `tools/chapter1_patch_runner/` | 개발 중 ZIP 패치 적용 도구 |
| `AI_CONTEXT_BUILDER/` | AI 작업용 프로젝트 컨텍스트 생성 도구 |

`tools/chapter1_patch_runner/`와 `AI_CONTEXT_BUILDER/`는 **개발·유지보수용 도구**로, 일반적인 게임 플레이에는 필요하지 않습니다.

## 🛠️ 개발 정보

- **장르:** 스토리형 세로 스크롤 슈팅
- **기술:** React · TypeScript · Vite
- **제작:** GeonBread

이 프로젝트는 개발 및 배포 준비 과정에서 내용이 변경될 수 있습니다.
