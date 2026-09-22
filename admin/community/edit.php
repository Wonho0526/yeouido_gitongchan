<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';
require __DIR__ . '/../includes/community.php';

$admin = require_login();

$id = (int) query_param('id');
$stmt = db()->prepare('SELECT * FROM community_posts WHERE id = :id');
$stmt->execute(['id' => $id]);
$post = $stmt->fetch();
if (!$post) {
    http_response_code(404);
    exit('게시글을 찾을 수 없습니다.');
}

$errors = [];
$values = [
    'title' => $post['title'],
    'content' => $post['content'],
    'published_at' => substr($post['published_at'], 0, 10),
    'is_pinned' => (bool) $post['is_pinned'],
    'is_published' => (bool) $post['is_published'],
    'remove_cover' => false,
];

if (is_post()) {
    verify_csrf_or_403();

    $values = community_values_from_post();
    $errors = community_validate($values);

    $newCoverPath = null;
    try {
        $newCoverPath = save_uploaded_image($_FILES['cover_image'] ?? [], 'community', 'cover');
    } catch (RuntimeException $e) {
        $errors[] = $e->getMessage();
    }

    if (!$errors) {
        // A newly uploaded file wins over the "remove" checkbox.
        $coverPath = $newCoverPath ?? ($values['remove_cover'] ? null : $post['cover_image_path']);

        db()->prepare(
            'UPDATE community_posts SET title = :title, content = :content, cover_image_path = :cover,
             is_pinned = :pinned, is_published = :published, published_at = :published_at
             WHERE id = :id'
        )->execute([
            'title' => $values['title'],
            'content' => $values['content'],
            'cover' => $coverPath,
            'pinned' => $values['is_pinned'] ? 1 : 0,
            'published' => $values['is_published'] ? 1 : 0,
            'published_at' => $values['published_at'] . ' 00:00:00',
            'id' => $id,
        ]);

        if ($post['cover_image_path'] && $coverPath !== $post['cover_image_path']) {
            delete_uploaded_image($post['cover_image_path'], 'community');
        }

        flash_set('success', '게시글이 수정되었습니다.');
        redirect(admin_url('community/index.php'));
    }

    delete_uploaded_image($newCoverPath, 'community');
}

layout_header('게시글 수정', $admin);
foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach;
community_render_form($values, $post, '저장');
layout_footer();
