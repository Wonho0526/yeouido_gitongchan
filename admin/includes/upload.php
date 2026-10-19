<?php

const UPLOAD_ROOT = __DIR__ . '/../uploads';
const UPLOAD_BUCKETS = ['popups', 'community'];
const IMAGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Longest edge kept per bucket, in pixels. Popups render at ~420 CSS px and post images at
 * ~800, so these already cover a 2x display; anything larger is bytes every visitor pays
 * for and nobody sees. Admins keep uploading straight from the camera or the designer.
 */
const IMAGE_MAX_EDGE = ['popups' => 1200, 'community' => 1600];
const IMAGE_WEBP_QUALITY = 82;

/** Fraction of memory_limit a single decode may claim. The rest is for PHP itself. */
const IMAGE_MEMORY_BUDGET = 0.6;

/**
 * Validates and stores an uploaded image in one of UPLOAD_BUCKETS. Returns the DB-stored
 * path (relative to the admin app, e.g. "/uploads/community/xxxx-cover.jpg") on success.
 * Returns null if no file was submitted (caller decides whether that's an error).
 * Throws RuntimeException with a user-facing Korean message on validation failure.
 */
function save_uploaded_image(array $file, string $bucket, string $variant): ?string
{
    if (!in_array($bucket, UPLOAD_BUCKETS, true)) {
        throw new LogicException("Unknown upload bucket: $bucket");
    }
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
        return null;
    }
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('이미지 업로드에 실패했습니다.');
    }
    if ($file['size'] > IMAGE_MAX_UPLOAD_BYTES) {
        throw new RuntimeException('이미지 파일은 5MB 이하만 업로드할 수 있습니다.');
    }

    $bytes = (string) file_get_contents($file['tmp_name']);
    $ext = detect_image_extension($bytes);
    if ($ext === null) {
        throw new RuntimeException('JPEG, PNG, WEBP 형식의 이미지만 업로드할 수 있습니다.');
    }

    $dir = UPLOAD_ROOT . '/' . $bucket;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    $stem = bin2hex(random_bytes(16)) . '-' . $variant;

    $resized = store_resized_image($file['tmp_name'], $dir, $stem, $bucket);
    if ($resized !== null) {
        return '/uploads/' . $bucket . '/' . $resized;
    }

    // Already small enough, or the server could not re-encode it — keep the original.
    $filename = $stem . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $filename)) {
        throw new RuntimeException('이미지 저장에 실패했습니다.');
    }

    return '/uploads/' . $bucket . '/' . $filename;
}

/**
 * Scales an oversized upload down to the bucket's limit and writes it as WebP, which is
 * what shrinks a 3MB photographic PNG to a couple of hundred KB. Returns the new filename,
 * or null when the image is already small enough or GD cannot handle it — the caller then
 * stores the original, so a missing or failing GD degrades to today's behaviour.
 *
 * Throws only when the image is too large to decode safely: better a clear message than
 * an out-of-memory fatal that leaves the admin staring at a blank page.
 */
function store_resized_image(string $tmpPath, string $dir, string $stem, string $bucket): ?string
{
    $info = @getimagesize($tmpPath);
    if ($info === false) {
        return null;
    }
    [$width, $height] = $info;
    $maxEdge = IMAGE_MAX_EDGE[$bucket] ?? 1600;

    if ($width <= $maxEdge && $height <= $maxEdge) {
        return null;
    }

    $filename = $stem . '.webp';

    // Imagick decodes outside PHP's memory_limit, so it handles the 30-40 megapixel files
    // that come straight out of a designer's export without any budgeting on our side.
    if (extension_loaded('imagick')) {
        $done = resize_with_imagick($tmpPath, $dir . '/' . $filename, $maxEdge);
        if ($done) {
            return $filename;
        }
    }

    return resize_with_gd($tmpPath, $dir . '/' . $filename, $width, $height, $maxEdge)
        ? $filename
        : null;
}

function resize_with_imagick(string $tmpPath, string $destPath, int $maxEdge): bool
{
    try {
        $im = new Imagick();
        $im->readImage($tmpPath);
        $im->setImageOrientation($im->getImageOrientation()); // keep EXIF rotation honest
        $im->thumbnailImage($maxEdge, $maxEdge, true); // bestfit: never upscales, keeps ratio
        $im->setImageFormat('webp');
        $im->setImageCompressionQuality(IMAGE_WEBP_QUALITY);
        $im->stripImage(); // drop EXIF/GPS before the file becomes public
        $written = $im->writeImage($destPath);
        $im->clear();
        return (bool) $written;
    } catch (Throwable) {
        return false;
    }
}

function resize_with_gd(string $tmpPath, string $destPath, int $width, int $height, int $maxEdge): bool
{
    if (!function_exists('imagescale') || !function_exists('imagewebp')) {
        return false;
    }

    // GD holds a decoded image as 4 bytes per pixel; the scaled copy needs its own buffer.
    $needed = $width * $height * 4;
    $budget = (int) (image_memory_limit_bytes() * IMAGE_MEMORY_BUDGET) - memory_get_usage(true);
    if ($needed > $budget) {
        throw new RuntimeException(sprintf(
            '이미지 해상도가 너무 큽니다 (%d×%d). 긴 변을 %dpx 이하로 줄여서 다시 올려주세요.',
            $width,
            $height,
            $maxEdge
        ));
    }

    $source = @imagecreatefromstring((string) file_get_contents($tmpPath));
    if ($source === false) {
        return false;
    }

    $scaled = imagescale(
        $source,
        $width >= $height ? $maxEdge : (int) round($maxEdge * $width / $height),
        $width >= $height ? -1 : $maxEdge
    );
    imagedestroy($source);
    if ($scaled === false) {
        return false;
    }

    // WebP carries alpha, so a transparent PNG survives the conversion.
    imagealphablending($scaled, false);
    imagesavealpha($scaled, true);

    $written = imagewebp($scaled, $destPath, IMAGE_WEBP_QUALITY);
    imagedestroy($scaled);

    return (bool) $written;
}

function image_memory_limit_bytes(): int
{
    $raw = trim((string) ini_get('memory_limit'));
    if ($raw === '' || $raw === '-1') {
        return 512 * 1024 * 1024; // No limit set; assume something sane rather than unlimited.
    }
    $unit = strtolower(substr($raw, -1));
    $value = (int) $raw;
    return match ($unit) {
        'g' => $value * 1024 * 1024 * 1024,
        'm' => $value * 1024 * 1024,
        'k' => $value * 1024,
        default => $value,
    };
}

/** Sniffs magic bytes; never trusts client-supplied MIME type or filename extension. */
function detect_image_extension(string $bytes): ?string
{
    if (str_starts_with($bytes, "\xFF\xD8\xFF")) {
        return 'jpg';
    }
    if (str_starts_with($bytes, "\x89PNG\x0D\x0A\x1A\x0A")) {
        return 'png';
    }
    if (str_starts_with($bytes, 'RIFF') && substr($bytes, 8, 4) === 'WEBP') {
        return 'webp';
    }
    return null;
}

/**
 * $storedPath is a DB value like "/uploads/community/xxxx.jpg". The bucket is passed by the
 * caller and the filename re-derived with basename(), so a tampered DB value can't reach
 * outside the bucket's folder.
 */
function delete_uploaded_image(?string $storedPath, string $bucket): void
{
    if (!$storedPath || !in_array($bucket, UPLOAD_BUCKETS, true)) {
        return;
    }
    $path = UPLOAD_ROOT . '/' . $bucket . '/' . basename($storedPath);
    if (is_file($path)) {
        unlink($path);
    }
}

function save_popup_image(array $file, string $variant): ?string
{
    return save_uploaded_image($file, 'popups', $variant);
}

function delete_popup_image(?string $storedPath): void
{
    delete_uploaded_image($storedPath, 'popups');
}
