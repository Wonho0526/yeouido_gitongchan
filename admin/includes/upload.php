<?php

const UPLOAD_ROOT = __DIR__ . '/../uploads';
const UPLOAD_BUCKETS = ['popups', 'community'];
const IMAGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

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

    $filename = bin2hex(random_bytes(16)) . '-' . $variant . '.' . $ext;

    if (!move_uploaded_file($file['tmp_name'], $dir . '/' . $filename)) {
        throw new RuntimeException('이미지 저장에 실패했습니다.');
    }

    return '/uploads/' . $bucket . '/' . $filename;
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
