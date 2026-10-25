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
<form method="post" enctype="multipart/form-data" class="community-form write-form">
  <?= csrf_field() ?>
  <div class="write-draft" data-editor-draft role="region" aria-label="임시저장 안내" hidden></div>
  <div class="write-layout">
    <div class="write-paper">
      <div class="write-title">
        <label for="title" class="write-sr-only">제목</label>
        <input type="text" id="title" name="title" class="write-title__input" placeholder="제목" value="<?= h($values['title']) ?>" maxlength="<?= COMMUNITY_TITLE_MAX ?>" required>
      </div>
      <div class="write-body">
        <label for="content" class="write-sr-only">본문</label>
        <!-- data-draft-key keeps one browser draft per screen: the new-post form, or each post id. -->
        <div class="editor" data-editor data-upload-url="<?= h(admin_url('community/upload-image.php')) ?>" data-draft-key="<?= $post ? 'post-' . (int) $post['id'] : 'new' ?>">
          <div class="editor-toolbar" data-editor-toolbar role="toolbar" aria-label="본문 편집 도구"></div>
          <!-- community-post-body: the editing surface uses the public page's own body CSS
               (css/community.css, linked below), so what is typed looks like what is published. -->
          <div class="editor-area community-post-body" data-editor-area contenteditable="true" role="textbox" aria-multiline="true" aria-label="본문"></div>
          <div class="editor-statusbar">
            <div class="editor-uploads" data-editor-uploads hidden></div>
            <div class="editor-statusbar__row">
              <p class="editor-notice" data-editor-notice aria-live="polite"></p>
              <p class="editor-count" data-editor-count></p>
            </div>
          </div>
          <input type="file" data-editor-file accept="image/jpeg,image/png,image/webp" multiple hidden>
        </div>
        <!-- The editor mirrors itself into this field, which is what the server reads. Without
             JavaScript it stays a plain textarea and the post is saved as typed. -->
        <textarea id="content" name="content" rows="16" class="editor-source"><?= h($values['content']) ?></textarea>
        <p class="hint write-hint--editor">사진은 사진 버튼, 끌어다 놓기, 붙여넣기로 여러 장을 넣을 수 있습니다(한 장에 5MB 이하, JPEG, PNG, WEBP). 다른 곳에서 복사한 글은 서식 없이 글자만 붙습니다. 쓰는 동안 이 브라우저에 임시저장됩니다.</p>
        <p class="hint write-hint--plain">편집 도구를 불러오지 못해 기본 입력창으로 표시됩니다. 서식 없이 입력한 글은 줄바꿈이 그대로 보입니다.</p>
      </div>
    </div>
    <aside class="write-panel" aria-labelledby="write-panel-title">
      <h2 id="write-panel-title" class="write-panel__title">게시 설정</h2>
      <div class="write-panel__fields">
        <div class="write-panel__group">
          <div class="form-row">
            <label for="published_at">게시일</label>
            <input type="date" id="published_at" name="published_at" value="<?= h($values['published_at']) ?>" required>
            <p class="hint">미래 날짜로 지정하면 그 날부터 홈페이지에 노출됩니다.</p>
          </div>
          <div class="form-row checkbox-row">
            <input type="checkbox" id="is_published" name="is_published" <?= $values['is_published'] ? 'checked' : '' ?>>
            <label for="is_published">홈페이지에 공개</label>
          </div>
          <div class="form-row checkbox-row">
            <input type="checkbox" id="is_pinned" name="is_pinned" <?= $values['is_pinned'] ? 'checked' : '' ?>>
            <label for="is_pinned">공지로 상단 고정</label>
          </div>
        </div>
        <div class="write-panel__group">
          <div class="form-row">
            <label for="cover_image">대표 이미지</label>
            <?php if ($post && $post['cover_image_path']): ?>
              <img src="<?= h(admin_url($post['cover_image_path'])) ?>" alt="" class="form-preview write-panel__preview">
              <div class="checkbox-row write-panel__remove">
                <input type="checkbox" id="remove_cover" name="remove_cover" <?= $values['remove_cover'] ? 'checked' : '' ?>>
                <label for="remove_cover">대표 이미지 삭제</label>
              </div>
              <p class="hint">교체하려면 새 파일을 선택하세요 (비워두면 기존 이미지 유지)</p>
            <?php endif; ?>
            <input type="file" id="cover_image" name="cover_image" accept="image/jpeg,image/png,image/webp">
            <p class="hint">선택 사항입니다. JPEG, PNG, WEBP, 5MB 이하.</p>
          </div>
        </div>
      </div>
      <div class="write-panel__actions">
        <p class="form-error" data-editor-limit hidden></p>
        <button type="submit" class="btn btn--primary"><?= h($submitLabel) ?></button>
        <a href="<?= h(admin_url('community/index.php')) ?>" class="btn">취소</a>
      </div>
    </aside>
  </div>
</form>
<link rel="stylesheet" href="<?= h(admin_url('../css/community.css')) ?>">
<script src="<?= h(admin_url('assets/editor.js')) ?>" defer></script>
<?php
}
