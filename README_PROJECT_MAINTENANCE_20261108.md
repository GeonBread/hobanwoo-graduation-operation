# Project-maintenance (source / media audit)

This ZIP contains only new maintenance tools and documentation. It does not overwrite the game's source code or delete any asset when applied through the patch runner.

## Run from Windows CMD

`RUN_PROJECT_MAINTENANCE.cmd`

The tool first inspects the current repository, previews conservative media relocations and cleanup candidates, and asks for `MOVE` and `DELETE` before making changes. It preserves quarantined originals under `.git/project-maintenance/` and uses `npm run lint` to check changes.

Manual commands:

```bat
node tools\project-maintenance\project_maintenance.cjs audit
node tools\project-maintenance\organize_media.cjs
node tools\project-maintenance\project_maintenance.cjs cleanup --code
node tools\project-maintenance\organize_media.cjs --apply
node tools\project-maintenance\project_maintenance.cjs cleanup --apply --code
```

For undo:

```bat
node tools\project-maintenance\project_maintenance.cjs restore
node tools\project-maintenance\organize_media.cjs --restore
```

See `docs/project-media-structure-audit-20261108.md` for verified facts, risk boundaries, and guidelines.
