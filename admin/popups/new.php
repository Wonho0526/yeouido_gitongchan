<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_login();

$errors = [];
$values = [
    'title' => '',
    'link_url' => '',
    'link_target' => '_self',
    'start_date' => '',
    'end_date' => '',
    'is_active' => true,
];

if (is_post()) {
    verify_csrf_or_403();

    $values['title'] = post('title');
    $values['link_url'] = post('link_url');
    $values['link_target'] = post('link_target') === '_blank' ? '_blank' : '_self';
    $values['start_date'] = post('start_date');
    $values['end_date'] = post('end_date');
    $values['is_active'] = isset($_POST['is_active']);

    if (mb_strlen($values['title']) < 1 || mb_strlen($values['title']) > 100) {
        $errors[] = '제목은 1~100자여야 합니다.';
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $values['start_date']) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $values['end_date'])) {
        $errors[] = '시작일과 종료일을 선택해주세요.';
    } elseif ($values['end_date'] < $values['start_date']) {
        $errors[] = '종료일은 시작일보다 빠를 수 없습니다.';
    }
    if ($values['link_url'] !== '' && !is_safe_link_url($values['link_url'])) {
        $errors[] = '링크 URL은 "/"로 시작하거나 http(s):// 주소여야 합니다.';
    }

    $pcPath = null;
    $mobilePath = null;
    try {
        $pcPath = save_popup_image($_FILES['pc_image'] ?? [], 'pc');
        $mobilePath = save_popup_image($_FILES['mobile_image'] ?? [], 'mobile');
    } catch (RuntimeException $e) {
        $errors[] = $e->getMessage();
    }
    if (!$pcPath) {
        $errors[] = 'PC용 이미지를 업로드해주세요.';
    }

    if (!$errors) {
        $stmt = db()->prepare(
            'INSERT INTO popups (title, pc_image_path, mobile_image_path, link_url, link_target, start_date, end_date, is_active, display_order, created_by)
             VALUES (:title, :pc, :mobile, :link, :target, :start, :end, :active, :order, :created_by)'
        );
        $maxOrder = (int) db()->query('SELECT COALESCE(MAX(display_order), 0) FROM popups')->fetchColumn();
        $stmt->execute([
            'title' => $values['title'],
            'pc' => $pcPath,
            'mobile' => $mobilePath,
            'link' => $values['link_url'] !== '' ? $values['link_url'] : null,
            'target' => $values['link_target'],
            'start' => $values['start_date'] . ' 00:00:00',
            'end' => $values['end_date'] . ' 23:59:59',
            'active' => $values['is_active'] ? 1 : 0,
            'order' => $maxOrder + 1,
            'created_by' => $admin['id'],
        ]);
        flash_set('success', '팝업이 등록되었습니다.');
        redirect(admin_url('popups/index.php'));
    } else {
        if ($pcPath) {
            delete_popup_image($pcPath);
        }
        if ($mobilePath) {
            delete_popup_image($mobilePath);
        }
    }
}

layout_header('새 팝업', $admin);
?>
<?php foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach; ?>
<form method="post" enctype="multipart/form-data">
  <?= csrf_field() ?>
  <div class="form-row">
    <label for="title">제목</label>
    <input type="text" id="title" name="title" value="<?= h($values['title']) ?>" maxlength="100" required>
  </div>
  <div class="form-row">
    <label for="pc_image">PC용 이미지 (필수, JPEG/PNG/WEBP, 5MB 이하)</label>
    <input type="file" id="pc_image" name="pc_image" accept="image/jpeg,image/png,image/webp" required>
  </div>
  <div class="form-row">
    <label for="mobile_image">모바일용 이미지 (선택, 없으면 PC 이미지 사용)</label>
    <input type="file" id="mobile_image" name="mobile_image" accept="image/jpeg,image/png,image/webp">
  </div>
  <div class="form-row">
    <label for="link_url">링크 URL (선택)</label>
    <input type="text" id="link_url" name="link_url" value="<?= h($values['link_url']) ?>" placeholder="/sub/event.html 또는 https://...">
  </div>
  <div class="form-row">
    <label for="link_target">링크 열기 방식</label>
    <select id="link_target" name="link_target">
      <option value="_self" <?= $values['link_target'] === '_self' ? 'selected' : '' ?>>현재 창</option>
      <option value="_blank" <?= $values['link_target'] === '_blank' ? 'selected' : '' ?>>새 창</option>
    </select>
  </div>
  <div class="form-row">
    <label for="start_date">시작일</label>
    <input type="date" id="start_date" name="start_date" value="<?= h($values['start_date']) ?>" required>
  </div>
  <div class="form-row">
    <label for="end_date">종료일</label>
    <input type="date" id="end_date" name="end_date" value="<?= h($values['end_date']) ?>" required>
  </div>
  <div class="form-row checkbox-row">
    <input type="checkbox" id="is_active" name="is_active" <?= $values['is_active'] ? 'checked' : '' ?>>
    <label for="is_active" style="margin:0;font-weight:400;">활성화</label>
  </div>
  <div class="form-actions">
    <button type="submit" class="btn btn--primary">등록</button>
    <a href="<?= h(admin_url('popups/index.php')) ?>" class="btn">취소</a>
  </div>
</form>
<?php
layout_footer();
