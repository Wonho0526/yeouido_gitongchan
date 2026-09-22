<?php

require __DIR__ . '/../includes/bootstrap.php';

require_login();

if (!is_post()) {
    redirect(admin_url('popups/index.php'));
}
verify_csrf_or_403();

$id = (int) post('id');
$dir = post('dir');
$return = post('return');

$stmt = db()->prepare('SELECT * FROM popups ORDER BY display_order ASC, id ASC');
$stmt->execute();
$popups = $stmt->fetchAll();

$index = null;
foreach ($popups as $i => $p) {
    if ((int) $p['id'] === $id) {
        $index = $i;
        break;
    }
}

if ($index !== null) {
    $swapWith = $dir === 'up' ? $index - 1 : $index + 1;
    if ($swapWith >= 0 && $swapWith < count($popups)) {
        $a = $popups[$index];
        $b = $popups[$swapWith];

        $pdo = db();
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE popups SET display_order = :order WHERE id = :id')
            ->execute(['order' => $b['display_order'], 'id' => $a['id']]);
        $pdo->prepare('UPDATE popups SET display_order = :order WHERE id = :id')
            ->execute(['order' => $a['display_order'], 'id' => $b['id']]);
        $pdo->commit();
    }
}

redirect(admin_url('popups/index.php' . ($return !== '' ? '?' . $return : '')));
