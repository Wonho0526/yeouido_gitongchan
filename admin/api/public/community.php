<?php

// Public endpoint for the '기가 통하는 커뮤니티' board on the static site.
//   GET ?page=N       -> pinned notices + one page of regular posts (list view)
//   GET ?id=N         -> one post with its neighbours, and counts the view
// Only published posts whose publish date has arrived are ever returned.

require __DIR__ . '/../../includes/db.php';
require __DIR__ . '/../../includes/helpers.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const COMMUNITY_PUBLIC_PER_PAGE = 10;
const COMMUNITY_VISIBLE = 'is_published = 1 AND published_at <= NOW()';

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function image_url(?string $storedPath): ?string
{
    return $storedPath ? admin_url(ltrim($storedPath, '/')) : null;
}

function summarize(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'title' => $row['title'],
        'isPinned' => (bool) $row['is_pinned'],
        'publishedAt' => substr($row['published_at'], 0, 10),
        'viewCount' => (int) $row['view_count'],
        'hasImage' => $row['cover_image_path'] !== null,
    ];
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respond(405, ['error' => ['message' => '허용되지 않는 요청입니다.']]);
}

$listColumns = 'id, title, is_pinned, published_at, view_count, cover_image_path';

if (isset($_GET['id'])) {
    $id = (int) $_GET['id'];
    $stmt = db()->prepare('SELECT * FROM community_posts WHERE id = :id AND ' . COMMUNITY_VISIBLE);
    $stmt->execute(['id' => $id]);
    $post = $stmt->fetch();
    if (!$post) {
        respond(404, ['error' => ['message' => '게시글을 찾을 수 없습니다.']]);
    }

    db()->prepare('UPDATE community_posts SET view_count = view_count + 1 WHERE id = :id')->execute(['id' => $id]);

    // Neighbours follow the same order as the list: newest first, ties broken by id.
    $older = db()->prepare(
        "SELECT id, title FROM community_posts WHERE " . COMMUNITY_VISIBLE . "
         AND (published_at < :at OR (published_at = :at2 AND id < :id))
         ORDER BY published_at DESC, id DESC LIMIT 1"
    );
    $older->execute(['at' => $post['published_at'], 'at2' => $post['published_at'], 'id' => $id]);
    $newer = db()->prepare(
        "SELECT id, title FROM community_posts WHERE " . COMMUNITY_VISIBLE . "
         AND (published_at > :at OR (published_at = :at2 AND id > :id))
         ORDER BY published_at ASC, id ASC LIMIT 1"
    );
    $newer->execute(['at' => $post['published_at'], 'at2' => $post['published_at'], 'id' => $id]);

    $neighbour = static fn ($row) => $row ? ['id' => (int) $row['id'], 'title' => $row['title']] : null;

    respond(200, ['data' => [
        'post' => summarize($post) + [
            'content' => $post['content'],
            'imageUrl' => image_url($post['cover_image_path']),
            'viewCount' => (int) $post['view_count'] + 1,
        ],
        'older' => $neighbour($older->fetch()),
        'newer' => $neighbour($newer->fetch()),
    ]]);
}

$page = max(1, (int) ($_GET['page'] ?? 1));

$pinned = db()->query(
    "SELECT $listColumns FROM community_posts WHERE " . COMMUNITY_VISIBLE . " AND is_pinned = 1
     ORDER BY published_at DESC, id DESC"
)->fetchAll();

$total = (int) db()->query(
    "SELECT COUNT(*) FROM community_posts WHERE " . COMMUNITY_VISIBLE . " AND is_pinned = 0"
)->fetchColumn();
$totalPages = max(1, (int) ceil($total / COMMUNITY_PUBLIC_PER_PAGE));
$page = min($page, $totalPages);
$offset = ($page - 1) * COMMUNITY_PUBLIC_PER_PAGE;

$items = db()->query(
    "SELECT $listColumns FROM community_posts WHERE " . COMMUNITY_VISIBLE . " AND is_pinned = 0
     ORDER BY published_at DESC, id DESC
     LIMIT " . COMMUNITY_PUBLIC_PER_PAGE . " OFFSET $offset"
)->fetchAll();

respond(200, ['data' => [
    'pinned' => array_map('summarize', $pinned),
    'items' => array_map('summarize', $items),
    'page' => $page,
    'totalPages' => $totalPages,
    'total' => $total,
    // Lets the page number rows as boards usually do (highest number = newest).
    'firstNumber' => $total - $offset,
]]);
