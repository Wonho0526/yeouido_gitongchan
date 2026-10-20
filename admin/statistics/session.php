<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';
require __DIR__ . '/../includes/ip_intel.php';

$admin = require_role('MASTER');

$sessionId = query_param('session_id');
$stmt = db()->prepare(
    "SELECT s.*, si.site_name
     FROM sessions s
     JOIN sites si ON si.id = s.site_id
     WHERE s.session_id = :sid"
);
$stmt->execute(['sid' => $sessionId]);
$session = $stmt->fetch();

if (!$session) {
    flash_set('error', '세션을 찾을 수 없습니다.');
    redirect(admin_url('statistics/index.php'));
}

$pvStmt = db()->prepare(
    'SELECT page_url, page_title, sequence, entered_at, left_at, duration
     FROM page_views WHERE session_id = :sid ORDER BY sequence ASC'
);
$pvStmt->execute(['sid' => $sessionId]);
$pageViews = $pvStmt->fetchAll();

$evStmt = db()->prepare(
    'SELECT event_name, event_category, page_url, created_at
     FROM events WHERE session_id = :sid ORDER BY created_at ASC'
);
$evStmt->execute(['sid' => $sessionId]);
$events = $evStmt->fetchAll();

// 이 세션의 IP가 어떤 회선에서 왔는지(역DNS 기반). 한 건뿐이라 여기서 바로 조회한다.
$ipInfo = $session['ip_address'] ? (ip_intel_lookup([$session['ip_address']])[$session['ip_address']] ?? null) : null;

function fmt_time(?string $value): string
{
    return $value ? substr($value, 11, 8) : '-';
}
function fmt_duration(?int $seconds): string
{
    if ($seconds === null) {
        return '-';
    }
    $m = intdiv($seconds, 60);
    $s = $seconds % 60;
    return $m > 0 ? "{$m}분 {$s}초" : "{$s}초";
}

layout_header('세션 상세', $admin);
?>
<p><a href="<?= h(admin_url('statistics/index.php')) ?>">&larr; 방문통계로 돌아가기</a></p>

<div class="stats-panel">
  <table class="kv-table">
    <tr><th>세션 ID</th><td><code><?= h($session['session_id']) ?></code></td></tr>
    <tr><th>사이트</th><td><?= h($session['site_name']) ?></td></tr>
    <tr><th>유입경로</th><td><?= h($session['referrer_source']) ?><?= $session['referrer_url'] ? ' (' . h($session['referrer_url']) . ')' : '' ?></td></tr>
    <?php if ($session['utm_source'] || $session['utm_campaign']): ?>
    <tr><th>UTM</th><td>
      source=<?= h($session['utm_source'] ?: '-') ?>,
      medium=<?= h($session['utm_medium'] ?: '-') ?>,
      campaign=<?= h($session['utm_campaign'] ?: '-') ?>,
      term=<?= h($session['utm_term'] ?: '-') ?>,
      content=<?= h($session['utm_content'] ?: '-') ?>
    </td></tr>
    <?php endif; ?>
    <tr><th>방문자 유형</th><td>
      <?php if ($session['is_bot']): ?>
        <span class="badge badge--pending">봇<?= $session['bot_name'] ? ' · ' . h($session['bot_name']) : '' ?></span>
      <?php else: ?>
        <span class="badge badge--on">사람</span>
      <?php endif; ?>
    </td></tr>
    <tr><th>기기 / OS / 브라우저</th><td><?= h($session['device']) ?> / <?= h($session['os']) ?> / <?= h($session['browser']) ?></td></tr>
    <tr><th>접속 IP</th><td>
      <code><?= h($session['ip_address'] ?: '-') ?></code>
      <?php if ($ipInfo): ?>
        <span class="ip-net ip-net--<?= h($ipInfo['networkCode']) ?>"><?= h($ipInfo['networkLabel']) ?></span>
        <?php if ($ipInfo['botVerified']): ?>
          <span class="ip-net ip-net--verified">역DNS 확인됨 · <?= h($ipInfo['botVerified']) ?></span>
        <?php elseif ($session['is_bot'] && $session['bot_name'] && in_array($session['bot_name'], array_keys(ip_verifiable_bots()), true)): ?>
          <span class="ip-net ip-net--warn">봇 확인 실패</span>
        <?php endif; ?>
        <?php if ($ipInfo['hostname']): ?>
          <span class="ip-host">역DNS: <code><?= h($ipInfo['hostname']) ?></code></span>
        <?php endif; ?>
      <?php endif; ?>
    </td></tr>
    <tr><th>User-Agent</th><td><code class="ua-text"><?= h($session['user_agent'] ?: '-') ?></code></td></tr>
    <tr><th>시작 시각</th><td><?= h($session['started_at']) ?></td></tr>
  </table>
</div>

<div class="stats-panel">
  <h2>페이지 이동 경로</h2>
  <ol class="path-timeline">
    <?php foreach ($pageViews as $pv): ?>
    <li>
      <span class="path-timeline__time"><?= fmt_time($pv['entered_at']) ?></span>
      <span class="path-timeline__page"><?= h($pv['page_title'] ?: $pv['page_url']) ?></span>
      <?php if (is_safe_link_url((string) $pv['page_url'])): ?>
      <a class="path-timeline__url" href="<?= h($pv['page_url']) ?>" target="_blank" rel="noopener noreferrer"><?= h($pv['page_url']) ?></a>
      <?php else: ?>
      <span class="path-timeline__url"><?= h($pv['page_url']) ?></span>
      <?php endif; ?>
      <span class="path-timeline__duration">체류 <?= fmt_duration($pv['duration'] !== null ? (int) $pv['duration'] : null) ?></span>
    </li>
    <?php endforeach; ?>
    <li class="path-timeline__exit">
      <span class="path-timeline__time"><?= fmt_time($session['ended_at']) ?></span>
      <span class="path-timeline__page">이탈</span>
    </li>
  </ol>
</div>

<?php if ($events): ?>
<div class="stats-panel">
  <h2>이벤트</h2>
  <div class="table-scroll">
    <table>
      <thead><tr><th>시각</th><th>이벤트</th><th>카테고리</th><th>페이지</th></tr></thead>
      <tbody>
        <?php foreach ($events as $ev): ?>
        <tr>
          <td><?= fmt_time($ev['created_at']) ?></td>
          <td><?= h($ev['event_name']) ?></td>
          <td><?= h($ev['event_category'] ?: '-') ?></td>
          <td class="truncate" title="<?= h($ev['page_url']) ?>"><?= h($ev['page_url']) ?></td>
        </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>
<?php endif; ?>
<?php
layout_footer();
