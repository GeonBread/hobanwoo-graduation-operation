# 호반우 게임 프로젝트 정리 도구 - 실행 오류 수정판

**기존 게임 로직이나 에셋을 덮어쓰지 않는 정리 도구**입니다. 이 ZIP을 적용하는 것 자체로는 파일이 삭제되지 않습니다.

## 설치 방법

1. 프로젝트(`hobanwoo-graduation-operation`)에 기존 ZIP 패치 러너로 이 ZIP을 적용하거나, ZIP의 `tools/` 폴더와 `.cmd` 파일을 프로젝트 최상위에 그대로 압축 해제합니다.
2. 반드시 아래 두 파일이 보이는지 확인합니다.
   - `tools/project-maintenance/project_maintenance.cjs`
   - `tools/project-maintenance/organize_media.cjs`
3. 프로젝트 최상위의 `RUN_CLEANUP.cmd`를 **더블클릭**합니다. CMD 창에 배치파일 내용을 복사해서 한 줄씩 붙여넣지 마세요.
4. 자동으로 3가지 **읽기 전용 미리보기**가 실행됩니다.
5. 출력 보고서를 확인한 다음 `MOVE` 또는 `DELETE`를 정확히 입력했을 때만 파일 변경이 일어납니다. Enter는 건너뜁니다.
6. 실행 후 `git status`를 확인합니다. 자동 커밋/푸시는 하지 않습니다.

안전한 점검만 수행하고 싶으면 `RUN_AUDIT_ONLY.cmd`를 더블클릭하세요.

## CMD 수동 진단

프로젝트 최상위 폴더에서 다음 두 명령어로 설치 상태를 먼저 확인할 수 있습니다.

```bat
dir tools\project-maintenance\*.cjs
node tools\project-maintenance\project_maintenance.cjs audit
```

`Could not find module` 오류가 나오면 ZIP 압축을 프로젝트 최상위에 적용하지 않은 것입니다.

## 복구 (CMD)

```bat
node tools\project-maintenance\project_maintenance.cjs restore
node tools\project-maintenance\organize_media.cjs --restore
```

백업은 `.git/project-maintenance/`에 저장합니다. **Git 정리 명령(`git clean`, `git reset --hard`)으로 자동 복구되지 않으며, 필요한 경우 위 도구의 restore를 사용하세요.**

## 안전 범위

- 정적 참조 조사만으로 모든 미사용 파일을 단정하지 않습니다. 미디어가 동적으로 로딩되거나 특수한 구성 파일에서 간접 참조되면 보고서에만 후보로 표시될 수 있습니다.
- 최신 소스에 맞춰 참조 여부/추가 변경 여부를 확인합니다.
- 실제 삭제는 `DELETE`, 안전한 자산 재배치는 `MOVE` 입력이 있어야 합니다.
- 연출 중복이나 호출 구조가 복잡한 코드는 자동 삭제하지 않습니다.
- `npm run lint`가 실패하면 정리 도구가 오류를 보고하고, 도구별로 가능한 부분을 복구합니다.
- 패치 러너가 실제 적용 전에 요구하는 clean Git 상태와, 정리 프로그램이 실행된 이후 Git의 파일 삭제(`D`) 상태는 서로 다릅니다.

## 이전 오류 원인

- `%~dp0`는 CMD에 직접 붙여넣었을 때 작동하지 않습니다. `.cmd` 배치파일 안에서만 프로젝트 실행 경로로 처리됩니다.
- `MODULE_NOT_FOUND`는 `tools/project-maintenance/*.cjs` 파일이 실제 프로젝트 경로에 없기 때문입니다.
- `k is not recognized`는 명령 프롬프트에서 문자 `k`를 명령으로 입력해 발생한 메시지입니다. 프로그램 오류가 아닙니다.
