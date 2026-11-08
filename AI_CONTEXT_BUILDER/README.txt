Hobanwoo Graduation Operation - AI Context Builder v2.0
======================================================

[Installation]
Extract the ZIP into the GAME PROJECT ROOT, with its folder structure intact:

  hobanwoo-graduation-operation/
  |-- AI_CONTEXT_BUILDER/
  |   |-- MAKE_AI_CONTEXT.bat
  |   |-- make_ai_context.ps1
  |   `-- README.txt
  |-- package.json
  |-- src/
  `-- public/

Double-click AI_CONTEXT_BUILDER\MAKE_AI_CONTEXT.bat.
Do not paste the contents of the BAT file directly into an interactive CMD prompt.

[Outputs]
Two timestamped outputs are saved next to the project folder (outside Git):
  hobanwoo-graduation-operation-AI_CONTEXT-YYYYMMDD-HHMMSS.zip
  hobanwoo-graduation-operation-PROJECT_FILE_INDEX-YYYYMMDD-HHMMSS.txt

[AI_CONTEXT ZIP]
Contains project code, configuration, tests, documentation and metadata.
Binary media contents are NOT included (no PNG/JPG/WebP/audio/video/fonts).
ZIP metadata in __CHAT_CONTEXT__:
  00_START_MESSAGE.txt         - source snapshot usage guidance
  01_GIT_STATE.txt             - current Git branch, HEAD and status
  02_INCLUDED_FILES.txt        - all source files actually packed
  03_PROJECT_FILE_INDEX.txt    - full project file index
  04_MEDIA_MANIFEST.csv        - media file path, byte size, modification UTC, optional SHA256
  AI_CONTEXT_MANIFEST.json     - summary of counts and policy

[Improvements in v2.0]
- Excludes supabase/.temp and other generated/temp directories.
- Blocks .npmrc, .yarnrc.yml, .pypirc, .netrc and key filenames.
- Does not follow folder symlinks / junctions outside the project.
- Adds metadata for media files so changes and suspected duplicates can be reviewed.
- Media hash calculation is optional. In make_ai_context.ps1, set:
    $IncludeMediaSha256 = $true
  to compute accurate SHA256 for every image/audio/font/video file. This can
  substantially increase runtime if the project contains very large assets.
- Keeps the same double-click workflow and output names as the previous version.

[Important limitations]
- Media binary files are NOT stored in the ZIP. To inspect/edit images, provide
  specific PNG/JPG/etc. files separately.
- Security filtering is based on file/folder NAMES, not the contents of source
  code or JSON. Examine code for pasted credentials or tokens before sharing.
- The file index lists filenames (including local-only filenames); it does not
  contain their bytes, except files separately included in the source ZIP.
- Neither ZIP creation nor media metadata generation moves or deletes game files.
- Historical README_*.md files are retained for project patch context.

[Compatibility]
Runs with built-in Windows PowerShell 5.1 and Windows CMD.
The tool may be placed inside AI_CONTEXT_BUILDER, in another subfolder under the
project, or in the legacy location next to the project folder.
