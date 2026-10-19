<?php

require_once __DIR__ . '/sanitize_html.php';

const COMMUNITY_TITLE_MAX = 200;
// Counted on the visible text, not the markup, so formatting never eats an author's budget.
const COMMUNITY_CONTENT_MAX = 20000;

function community_values_from_post(): array
{
    return [
        'title' => post('title'),
        // The body is rendered as HTML on the public page, so it is reduced to the allowlist
        // here, at the point it enters the system. What is stored is what will be served.
        'content' => sanitize_post_html(str_replace("\r\n", "\n", (string) ($_POST['content'] ?? ''))),
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
    if (post_html_is_empty($values['content'])) {
        $errors[] = '본문을 입력해주세요.';
    } elseif (post_html_text_length($values['content']) > COMMUNITY_CONTENT_MAX) {
        $errors[] = '본문은 ' . number_format(COMMUNITY_CONTENT_MAX) . '자 이하여야 합니다.';
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
    <div class="editor" data-editor data-upload-url="<?= h(admin_url('community/upload-image.php')) ?>">
      <div class="editor-toolbar" data-editor-toolbar></div>
      <div class="editor-area" data-editor-area contenteditable="true" role="textbox" aria-multiline="true" aria-label="본문"></div>
      <p class="editor-notice" data-editor-notice aria-live="polite"></p>
      <input type="file" data-editor-file accept="image/jpeg,image/png,image/webp" hidden>
    </div>
    <!-- The editor mirrors itself into this field, which is what the server reads. Without
         JavaScript it stays a plain textarea and the post is saved as typed. -->
    <textarea id="content" name="content" rows="16" class="editor-source"><?= h($values['content']) ?></textarea>
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
<script src="<?= h(admin_url('assets/editor.js')) ?>" defer></script>
<?php
}
