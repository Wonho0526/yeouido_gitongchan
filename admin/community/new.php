<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';
require __DIR__ . '/../includes/community.php';

$admin = require_login();

$errors = [];
$values = [
    'title' => '',
    'content' => '',
    'published_at' => date('Y-m-d'),
    'is_pinned' => false,
    'is_published' => true,
    'remove_cover' => false,
];

if (is_post()) {
    verify_csrf_or_403();

    $values = community_values_from_post();
    $errors = community_validate($values);

    $coverPath = null;
    try {
        $coverPath = save_uploaded_image($_FILES['cover_image'] ?? [], 'community', 'cover');
    } catch (RuntimeException $e) {
        $errors[] = $e->getMessage();
    }

    if (!$errors) {
        db()->prepare(
            'INSERT INTO community_posts (title, content, cover_image_path, is_pinned, is_published, published_at, created_by)
             VALUES (:title, :content, :cover, :pinned, :published, :published_at, :created_by)'
        )->execute([
            'title' => $values['title'],
            'content' => $values['content'],
            'cover' => $coverPath,
            'pinned' => $values['is_pinned'] ? 1 : 0,
            'published' => $values['is_published'] ? 1 : 0,
            'published_at' => $values['published_at'] . ' 00:00:00',
            'created_by' => $admin['id'],
        ]);
        flash_set('success', '게시글이 등록되었습니다.');
        redirect(admin_url('community/index.php'));
    }

    delete_uploaded_image($coverPath, 'community');
}

layout_header('새 게시글', $admin);
foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach;
community_render_form($values, null, '등록');
layout_footer();
