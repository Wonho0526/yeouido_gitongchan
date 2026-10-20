# 카카오톡 이미지 보관

2026-10-20 사용자 요청에 따라 미사용 이미지 113개(약 87.5MB)를 삭제하고, 카카오톡 이미지 6개는 이 폴더에 남겼습니다.

- `index.html`: 남겨 둔 사진 미리보기 및 검색.
- `목록.csv`, `manifest.json`: 카카오톡 이미지 6개의 원래 경로와 파일 정보.
- `deletion-log.json`: 삭제한 113개 파일의 경로·크기·SHA256 기록.
- `restore.ps1`: 남겨 둔 카카오톡 이미지 6개를 원래 위치로 복원합니다. 기존 파일은 덮어쓰지 않습니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\unused-images-review\2026-10-20\restore.ps1
```
