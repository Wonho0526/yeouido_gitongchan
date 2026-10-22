<?php

// '건강정보' 게시판의 RSS 2.0 피드. 네이버 서치어드바이저의 RSS 제출란에 넣는다.
//
//   https://여의도기통찬.com/rss.php
//
// 게시판은 PHP와 MySQL이 있는 카페24에서만 돌아간다. GitHub Pages 쪽에는 이 파일을
// 올리지 않는다(_config.yml 의 exclude). 관리자 영역(/admin/)은 robots.txt 로 막혀 있어
// 크롤러가 읽지 못하므로, 피드는 웹 루트에 둔다.

require __DIR__ . '/admin/includes/db.php';
require __DIR__ . '/admin/includes/helpers.php';

date_default_timezone_set('Asia/Seoul');

// canonical·sitemap 과 같은 호스트를 쓴다. 한글 도메인은 퓨니코드로 적는다.
const SITE_URL = 'https://xn--ok0bu9hnyrvkbwwl58i.com';
const FEED_LIMIT = 30;

/** 글 본문에서 요약문을 만든다. 본문은 HTML일 수도, 평문일 수도 있다. */
function excerpt(string $content, int $length = 200): string
{
    $text = html_entity_decode(strip_tags($content), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    // 깨진 UTF-8이 섞이면 /u 패턴이 null을 돌려준다. 그때는 원문을 그대로 쓴다.
    $text = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    if (mb_strlen($text, 'UTF-8') <= $length) {
        return $text;
    }
    return mb_substr($text, 0, $length, 'UTF-8') . '…';
}

/** 표지 이미지의 실제 형식과 크기. enclosure 는 둘 다 요구한다. */
function enclosure(string $storedPath): ?array
{
    $relative = ltrim($storedPath, '/');
    $file = __DIR__ . '/admin/' . $relative;
    if (!is_file($file)) {
        return null;
    }
    $types = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
        'gif' => 'image/gif', 'webp' => 'image/webp', 'avif' => 'image/avif',
    ];
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (!isset($types[$extension])) {
        return null;
    }
    return [
        'url' => SITE_URL . '/admin/' . $relative,
        'type' => $types[$extension],
        'length' => (string) (filesize($file) ?: 0),
    ];
}

try {
    $stmt = db()->prepare(
        'SELECT id, title, content, cover_image_path, published_at, updated_at
         FROM community_posts
         WHERE is_published = 1 AND published_at <= NOW()
         ORDER BY published_at DESC, id DESC
         LIMIT ' . FEED_LIMIT
    );
    $stmt->execute();
    $posts = $stmt->fetchAll();
} catch (Throwable $e) {
    // 503이면 수집기가 나중에 다시 가져간다. 500으로 끊어 피드가 버려지는 것보다 낫다.
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    header('Retry-After: 3600');
    exit('피드를 만들 수 없습니다.');
}

$latest = $posts[0]['published_at'] ?? null;
$buildDate = date(DATE_RSS, $latest ? strtotime($latest) : time());

header('Content-Type: application/rss+xml; charset=utf-8');
header('Cache-Control: public, max-age=1800');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>여의도기통찬의원 건강정보</title>
    <link><?= SITE_URL ?>/sub/community.html</link>
    <description>여의도기통찬의원이 전하는 건강정보입니다. 통증과 회복, 생활 속 관리에 도움이 되는 이야기를 모았습니다.</description>
    <language>ko</language>
    <lastBuildDate><?= $buildDate ?></lastBuildDate>
    <generator>yeouido-gitongchan</generator>
    <atom:link href="<?= SITE_URL ?>/rss.php" rel="self" type="application/rss+xml" />
<?php foreach ($posts as $post):
    $url = SITE_URL . '/sub/community.html?id=' . (int) $post['id'];
    $image = $post['cover_image_path'] ? enclosure($post['cover_image_path']) : null;
?>
    <item>
      <title><?= h($post['title']) ?></title>
      <link><?= h($url) ?></link>
      <guid isPermaLink="true"><?= h($url) ?></guid>
      <pubDate><?= date(DATE_RSS, strtotime($post['published_at'])) ?></pubDate>
      <description><?= h(excerpt($post['content'])) ?></description>
<?php if ($image): ?>
      <enclosure url="<?= h($image['url']) ?>" type="<?= h($image['type']) ?>" length="<?= h($image['length']) ?>" />
<?php endif; ?>
    </item>
<?php endforeach; ?>
  </channel>
</rss>
