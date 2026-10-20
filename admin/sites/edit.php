<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_role('MASTER');

$id = (int) query_param('id');
$stmt = db()->prepare('SELECT * FROM sites WHERE id = :id');
$stmt->execute(['id' => $id]);
$site = $stmt->fetch();
if (!$site) {
    flash_set('error', '사이트를 찾을 수 없습니다.');
    redirect(admin_url('sites/index.php'));
}

$domainRows = db()->prepare('SELECT domain FROM site_domains WHERE site_id = :id ORDER BY domain ASC');
$domainRows->execute(['id' => $id]);
$existingDomains = implode("\n", array_column($domainRows->fetchAll(), 'domain'));

$errors = [];
$values = ['site_name' => $site['site_name'], 'domains' => $existingDomains, 'is_active' => (bool) $site['is_active']];

if (is_post()) {
    verify_csrf_or_403();

    $values['site_name'] = post('name');
    $values['domains'] = post('domains');
    $values['is_active'] = post('is_active') === '1';
    $domains = parse_domains_input($values['domains']);

    if (mb_strlen($values['site_name']) < 1 || mb_strlen($values['site_name']) > 100) {
        $errors[] = '사이트명은 1~100자여야 합니다.';
    }
    if (!$domains) {
        $errors[] = '허용 도메인을 한 줄에 하나씩 최소 1개 입력해주세요.';
    }

    if (!$errors) {
        $pdo = db();
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE sites SET site_name = :name, is_active = :active WHERE id = :id')->execute([
            'name' => $values['site_name'],
            'active' => $values['is_active'] ? 1 : 0,
            'id' => $id,
        ]);
        $pdo->prepare('DELETE FROM site_domains WHERE site_id = :id')->execute(['id' => $id]);
        $domainStmt = $pdo->prepare('INSERT INTO site_domains (site_id, domain) VALUES (:site, :domain)');
        foreach ($domains as $domain) {
            $domainStmt->execute(['site' => $id, 'domain' => $domain]);
        }
        $pdo->commit();

        flash_set('success', '사이트 정보가 저장되었습니다.');
        redirect(admin_url('sites/index.php'));
    }
}

layout_header('사이트 수정 — ' . $site['site_name'], $admin);
?>
<?php foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach; ?>
<form method="post">
  <?= csrf_field() ?>
  <div class="form-row">
    <label>Site ID</label>
    <input type="text" value="<?= h($site['site_id']) ?>" disabled>
  </div>
  <div class="form-row">
    <label for="name">사이트명</label>
    <input type="text" id="name" name="name" value="<?= h($values['site_name']) ?>" required>
  </div>
  <div class="form-row">
    <label for="domains">허용 도메인</label>
    <textarea id="domains" name="domains" rows="4"><?= h($values['domains']) ?></textarea>
    <p class="hint">한 줄에 하나씩. 여기 등록된 도메인에서 온 요청만 방문 데이터가 저장됩니다.</p>
  </div>
  <div class="form-row">
    <label class="checkbox-row">
      <input type="checkbox" name="is_active" value="1" <?= $values['is_active'] ? 'checked' : '' ?>>
      활성 (비활성화하면 이 사이트의 tracker.js 요청이 모두 무시됩니다)
    </label>
  </div>
  <div class="form-actions">
    <button type="submit" class="btn btn--primary">저장</button>
    <a href="<?= h(admin_url('sites/index.php')) ?>" class="btn">취소</a>
  </div>
</form>
<?php
layout_footer();
