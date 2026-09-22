<?php

require __DIR__ . '/../includes/bootstrap.php';
require_feature('kakao');
require __DIR__ . '/../includes/layout.php';
require __DIR__ . '/../includes/kakao.php';

$admin = require_role('MASTER');

if (is_post()) {
    verify_csrf_or_403();
    $action = post('action');
    if ($action === 'disconnect') {
        kakao_remove_connection(post('kakao_id'));
        flash_set('success', '연동을 해제했습니다.');
    } elseif ($action === 'test') {
        $ok = kakao_send_to_me('[테스트] 여의도기통찬의원 상담신청 알림이 정상적으로 연동되었습니다.');
        flash_set(
            $ok ? 'success' : 'error',
            $ok ? '연동된 계정으로 테스트 메시지를 보냈습니다. 카카오톡을 확인해주세요.' : '테스트 메시지 발송에 실패했습니다. 연동 상태를 확인해주세요.'
        );
    }
    redirect(admin_url('kakao/index.php'));
}

$config = kakao_config();
$connections = kakao_load_connections();

layout_header('카카오톡 알림 설정', $admin);
?>
<p>상담신청이 접수될 때마다 아래 연동된 <strong>모든</strong> 카카오 계정으로 "나에게 보내기" 알림을 보냅니다.
알림을 받아야 할 사람이 여러 명이면, 각자 자신의 카카오 계정으로 "카카오 계정 연동하기"를 한 번씩 눌러 추가하면 됩니다.</p>

<?php if (!$config): ?>
<div class="flash flash--error">
  config.php에 <code>kakao.rest_api_key</code>가 설정되어 있지 않습니다.
  <a href="https://developers.kakao.com" target="_blank" rel="noopener">카카오 디벨로퍼스</a>에서 앱을 만들고
  발급받은 REST API 키를 config.php의 <code>kakao</code> 항목에 입력해주세요.
</div>
<?php endif; ?>

<table style="max-width:640px;margin-bottom:20px;">
  <tbody>
    <tr>
      <th style="width:220px;">카카오 디벨로퍼스 Redirect URI</th>
      <td><code><?= h(kakao_redirect_uri_absolute()) ?></code><br>
        <small>카카오 디벨로퍼스 &gt; 앱 키 &gt; 카카오 로그인 리다이렉트 URI에 위 주소를 정확히 등록해야 합니다.</small></td>
    </tr>
  </tbody>
</table>

<table style="max-width:640px;margin-bottom:20px;">
  <thead>
    <tr><th style="text-align:left;">연동된 계정</th><th style="text-align:left;">연동일</th><th></th></tr>
  </thead>
  <tbody>
    <?php if (!$connections): ?>
    <tr><td colspan="3">연동된 계정이 없습니다.</td></tr>
    <?php endif; ?>
    <?php foreach ($connections as $kakaoId => $conn): ?>
    <tr>
      <td><?= h($conn['nickname'] ?? '(이름 없음)') ?></td>
      <td><?= h(date('Y-m-d H:i', $conn['connected_at'] ?? time())) ?></td>
      <td>
        <form method="post" style="display:inline;" onsubmit="return confirm('이 계정의 연동을 해제하시겠습니까? 해제하면 이 계정으로는 더 이상 알림이 오지 않습니다.');">
          <?= csrf_field() ?>
          <input type="hidden" name="action" value="disconnect">
          <input type="hidden" name="kakao_id" value="<?= h((string) $kakaoId) ?>">
          <button type="submit" class="btn btn--danger btn--small">연동 해제</button>
        </form>
      </td>
    </tr>
    <?php endforeach; ?>
  </tbody>
</table>

<div class="toolbar">
<?php if ($config): ?>
  <a class="btn btn--primary" href="<?= h(kakao_authorize_url()) ?>">카카오 계정 연동하기</a>
  <small style="margin-left:8px;">이미 이 브라우저에 다른 계정으로 로그인되어 있다면, 새 계정을 추가하기 전에 카카오톡에서 먼저 로그아웃하거나 시크릿창을 이용해주세요.</small>
<?php endif; ?>
<?php if ($connections): ?>
  <form method="post" style="display:inline;">
    <?= csrf_field() ?>
    <input type="hidden" name="action" value="test">
    <button type="submit" class="btn">전체 테스트 발송</button>
  </form>
<?php endif; ?>
</div>
<?php
layout_footer();
