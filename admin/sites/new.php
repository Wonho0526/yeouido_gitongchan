<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

$admin = require_role('MASTER');

$errors = [];
$values = ['site_id' => '', 'site_name' => '', 'domains' => ''];

if (is_post()) {
    verify_csrf_or_403();

    $values['site_id'] = strtoupper(post('site_id'));
    $values['site_name'] = post('name');
    $values['domains'] = post('domains');
    $domains = parse_domains_input($values['domains']);

    if (!preg_match('/^[A-Z0-9_]{3,50}$/', $values['site_id'])) {
        $errors[] = 'Site ID는 영문 대문자/숫자/밑줄 3~50자여야 합니다 (예: SITE_GOODMAN).';
    }
    if (mb_strlen($values['site_name']) < 1 || mb_strlen($values['site_name']) > 100) {
        $errors[] = '사이트명은 1~100자여야 합니다.';
    }
    if (!$domains) {
        $errors[] = '허용 도메인을 한 줄에 하나씩 최소 1개 입력해주세요 (예: goodmanclinic.co.kr).';
    }

    if (!$errors) {
        $pdo = db();
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare('INSERT INTO sites (site_id, site_name) VALUES (:sid, :name)');
            $stmt->execute(['sid' => $values['site_id'], 'name' => $values['site_name']]);
            $newId = (int) $pdo->lastInsertId();

            $domainStmt = $pdo->prepare('INSERT INTO site_domains (site_id, domain) VALUES (:site, :domain)');
            foreach ($domains as $domain) {
                $domainStmt->execute(['site' => $newId, 'domain' => $domain]);
            }
            $pdo->commit();

            flash_set('success', '사이트가 등록되었습니다.');
            redirect(admin_url('sites/index.php'));
        } catch (PDOException $e) {
            $pdo->rollBack();
            if ($e->getCode() === '23000') {
                $errors[] = '이미 사용 중인 Site ID입니다.';
            } else {
                throw $e;
            }
        }
    }
}

layout_header('새 사이트 등록', $admin);
?>
<?php foreach ($errors as $error): ?>
  <p class="form-error"><?= h($error) ?></p>
<?php endforeach; ?>
<form method="post">
  <?= csrf_field() ?>
  <div class="form-row">
    <label for="site_id">Site ID</label>
    <input type="text" id="site_id" name="site_id" value="<?= h($values['site_id']) ?>" required>
    <p class="hint">tracker.js의 data-site-id 값. 생성 후 변경할 수 없습니다 (예: SITE_GOODMAN).</p>
  </div>
  <div class="form-row">
    <label for="name">사이트명</label>
    <input type="text" id="name" name="name" value="<?= h($values['site_name']) ?>" required>
  </div>
  <div class="form-row">
    <label for="domains">허용 도메인</label>
    <textarea id="domains" name="domains" rows="4" placeholder="goodmanclinic.co.kr&#10;www.goodmanclinic.co.kr"><?= h($values['domains']) ?></textarea>
    <p class="hint">한 줄에 하나씩. 여기 등록된 도메인에서 온 요청만 방문 데이터가 저장됩니다.</p>
  </div>
  <div class="form-actions">
    <button type="submit" class="btn btn--primary">등록</button>
    <a href="<?= h(admin_url('sites/index.php')) ?>" class="btn">취소</a>
  </div>
</form>
<?php
layout_footer();
