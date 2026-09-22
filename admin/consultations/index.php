<?php

require __DIR__ . '/../includes/bootstrap.php';
require_feature('consultations');
require __DIR__ . '/../includes/layout.php';

$admin = require_login();

$year = (int) query_param('year', date('Y'));
$month = (int) query_param('month', date('n'));
if ($month < 1 || $month > 12) {
    $month = (int) date('n');
}
$status = query_param('status', 'all');

$firstOfMonth = new DateTime(sprintf('%04d-%02d-01', $year, $month));
$gridStart = clone $firstOfMonth;
$leadingDays = (int) $firstOfMonth->format('w');
if ($leadingDays > 0) {
    $gridStart->modify("-{$leadingDays} days");
}
$lastOfMonth = (clone $firstOfMonth)->modify('last day of this month');
$gridEnd = clone $lastOfMonth;
$trailingDays = 6 - (int) $lastOfMonth->format('w');
if ($trailingDays > 0) {
    $gridEnd->modify("+{$trailingDays} days");
}

$where = ['date >= :start', 'date <= :end'];
$params = [
    'start' => $gridStart->format('Y-m-d 00:00:00'),
    'end' => $gridEnd->format('Y-m-d 23:59:59'),
];
if (in_array($status, ['상담전', '예약완료', '상담완료'], true)) {
    $where[] = 'status = :status';
    $params['status'] = $status;
}
$stmt = db()->prepare('SELECT * FROM consultations WHERE ' . implode(' AND ', $where) . ' ORDER BY date ASC');
$stmt->execute($params);

$byDate = [];
foreach ($stmt->fetchAll() as $row) {
    $key = substr($row['date'], 0, 10);
    $byDate[$key][] = $row;
}

$prev = (clone $firstOfMonth)->modify('-1 month');
$next = (clone $firstOfMonth)->modify('+1 month');
$today = new DateTime('today');

function cal_link(int $y, int $m, string $status): string
{
    return h(admin_url('consultations/index.php?' . http_build_query(['year' => $y, 'month' => $m, 'status' => $status])));
}

layout_header('상담 신청 관리', $admin);
?>
<div class="toolbar">
  <a href="<?= cal_link((int) $prev->format('Y'), (int) $prev->format('n'), $status) ?>" class="btn">← 이전달</a>
  <a href="<?= cal_link((int) $today->format('Y'), (int) $today->format('n'), $status) ?>" class="btn">오늘</a>
  <a href="<?= cal_link((int) $next->format('Y'), (int) $next->format('n'), $status) ?>" class="btn">다음달 →</a>
  <strong style="margin-left:8px;"><?= $year ?>년 <?= $month ?>월</strong>
  <span style="flex:1;"></span>
  <a href="<?= cal_link($year, $month, 'all') ?>" class="btn <?= $status === 'all' ? 'btn--primary' : '' ?>">전체</a>
  <a href="<?= cal_link($year, $month, '상담전') ?>" class="btn <?= $status === '상담전' ? 'btn--primary' : '' ?>">상담전</a>
  <a href="<?= cal_link($year, $month, '상담완료') ?>" class="btn <?= $status === '상담완료' ? 'btn--primary' : '' ?>">상담완료</a>
  <a href="<?= cal_link($year, $month, '예약완료') ?>" class="btn <?= $status === '예약완료' ? 'btn--primary' : '' ?>">예약완료</a>
</div>

<div class="table-scroll">
<table class="calendar">
  <thead>
    <tr><th>일</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th></tr>
  </thead>
  <tbody>
    <?php
    $cursor = clone $gridStart;
    while ($cursor <= $gridEnd) {
        echo '<tr>';
        for ($i = 0; $i < 7; $i++) {
            $key = $cursor->format('Y-m-d');
            $isOtherMonth = (int) $cursor->format('n') !== $month;
            echo '<td class="' . ($isOtherMonth ? 'is-other-month' : '') . '">';
            echo '<div class="day-num">' . (int) $cursor->format('j') . '</div>';
            foreach ($byDate[$key] ?? [] as $item) {
                $chipClass = match ($item['status']) {
                    '상담완료' => 'chip--done',
                    '예약완료' => 'chip--confirmed',
                    default => 'chip--pending',
                };
                $time = substr($item['date'], 11, 5);
                echo '<a class="chip ' . $chipClass . '" href="' . h(admin_url('consultations/detail.php?id=' . $item['id'])) . '">'
                    . h($time . ' ' . $item['name']) . '</a>';
            }
            echo '</td>';
            $cursor->modify('+1 day');
        }
        echo '</tr>';
    }
    ?>
  </tbody>
</table>
</div>
<?php
layout_footer();
