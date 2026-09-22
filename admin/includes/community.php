<?php

const COMMUNITY_TITLE_MAX = 200;
const COMMUNITY_CONTENT_MAX = 20000;

function community_values_from_post(): array
{
    return [
        'title' => post('title'),
        // Not post(): trimming would also eat intentional leading indentation on the first line.
        'content' => rtrim(str_replace("\r\n", "\n", (string) ($_POST['content'] ?? ''))),
        'published_at' => post('published_at'),
        'is_pinned' => isset($_POST['is_pinned']),
        'is_published' => isset($_POST['is_published']),
        'remove_cover' => isset($_POST['remove_cover']),
    ];
}

function community_validate(array $values): array
{
    $errors = [];
    $titleLength = mb_strlen($values['title']);
    if ($titleLength < 1 || $titleLength > COMMUNITY_TITLE_MAX) {
        $errors[] = '제목은 1~' . COMMUNITY_TITLE_MAX . '자여야 합니다.';
    }
    $contentLength = mb_strlen(trim($values['content']));
    if ($contentLength < 1 || mb_strlen($values['content']) > COMMUNITY_CONTENT_MAX) {
        $errors[] = '본문은 1~' . number_format(COMMUNITY_CONTENT_MAX) . '자여야 합니다.';
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $values['published_at'])
        || !checkdate((int) substr($values['published_at'], 5, 2), (int) substr($values['published_at'], 8, 2), (int) substr($values['published_at'], 0, 4))) {
        $errors[] = '게시일을 선택해주세요.';
    }
    return $errors;
}

function community_render_form(array $values, ?array $post, string $submitLabel): void
{
    ?>
<form method="post" enctype="multipart/form-data" class="community-form">
  <?= csrf_field() ?>
  <div class="form-row">
    <label for="title">제목</label>
    <input type="text" id="title" name="title" value="<?= h($values['title']) ?>" maxlength="<?= COMMUNITY_TITLE_MAX ?>" required>
  </div>
  <div class="form-row">
    <label for="content">본문</label>
    <textarea id="content" name="content" rows="16" maxlength="<?= COMMUNITY_CONTENT_MAX ?>" required><?= h($values['content']) ?></textarea>
    <p class="hint">줄바꿈은 그대로 표시됩니다. HTML 태그는 글자 그대로 보입니다.</p>
  </div>
  <div class="form-row">
    <label for="cover_image">대표 이미지 (선택, JPEG/PNG/WEBP, 5MB 이하)</label>
    <?php if ($post && $post['cover_image_path']): ?>
      <div><img src="<?= h(admin_url($post['cover_image_path'])) ?>" alt="" class="form-preview"></div>
      <div class="checkbox-row" style="margin:6px 0;">
        <input type="checkbox" id="remove_cover" name="remove_cover" <?= $values['remove_cover'] ? 'checked' : '' ?>>
        <label for="remove_cover" style="margin:0;font-weight:400;">대표 이미지 삭제</label>
      </div>
      <p class="hint">교체하려면 새 파일을 선택하세요 (비워두면 기존 이미지 유지)</p>
    <?php endif; ?>
    <input type="file" id="cover_image" name="cover_image" accept="image/jpeg,image/png,image/webp">
  </div>
  <div class="form-row">
    <label for="published_at">게시일</label>
    <input type="date" id="published_at" name="published_at" value="<?= h($values['published_at']) ?>" required>
    <p class="hint">미래 날짜로 지정하면 그 날부터 홈페이지에 노출됩니다.</p>
  </div>
  <div class="form-row checkbox-row">
    <input type="checkbox" id="is_pinned" name="is_pinned" <?= $values['is_pinned'] ? 'checked' : '' ?>>
    <label for="is_pinned" style="margin:0;font-weight:400;">공지로 상단 고정</label>
  </div>
  <div class="form-row checkbox-row">
    <input type="checkbox" id="is_published" name="is_published" <?= $values['is_published'] ? 'checked' : '' ?>>
    <label for="is_published" style="margin:0;font-weight:400;">홈페이지에 공개</label>
  </div>
  <div class="form-actions">
    <button type="submit" class="btn btn--primary"><?= h($submitLabel) ?></button>
    <a href="<?= h(admin_url('community/index.php')) ?>" class="btn">취소</a>
  </div>
</form>
<?php
}
