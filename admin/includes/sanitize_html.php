<?php

// Server-side HTML allowlist for 건강정보 post bodies.
//
// The public page renders these bodies with innerHTML, so this file is the only thing
// standing between a post and stored XSS. Nothing here trusts the editor: the toolbar in
// the browser is a convenience, and a hand-crafted POST gets the same treatment.
//
// The rule is allow-by-exception. An element not in SANITIZE_ELEMENTS is either dropped
// with its subtree (if it can execute or load) or unwrapped (if it is just layout), and an
// attribute not listed for its element is removed. Style declarations are re-built from
// scratch rather than filtered, so nothing from the input survives into the output string.

const SANITIZE_ELEMENTS = [
    'p' => ['style'],
    'br' => [],
    'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'u' => [], 's' => [],
    'span' => ['style'],
    'h2' => [], 'h3' => [],
    'ul' => [], 'ol' => [], 'li' => [],
    'blockquote' => [],
    'a' => ['href'],
    'img' => ['src', 'alt', 'width', 'height'],
    'figure' => [], 'figcaption' => [],
];

/** Dropped with everything inside them. These can execute, load, or capture input. */
const SANITIZE_DROP_SUBTREE = [
    'script', 'style', 'iframe', 'object', 'embed', 'applet', 'form', 'input', 'button',
    'select', 'option', 'textarea', 'label', 'link', 'meta', 'base', 'svg', 'math',
    'noscript', 'template', 'frame', 'frameset', 'audio', 'video', 'source', 'track',
];

/** Inline images must be files this admin stored itself — see save_uploaded_image(). */
const SANITIZE_IMG_SRC = '#^/uploads/community/[0-9a-f]{32}-[a-z0-9_-]+\.(?:jpg|png|webp)$#';

const SANITIZE_FONT_SIZE_MIN = 10;
const SANITIZE_FONT_SIZE_MAX = 48;

/**
 * Returns the sanitized HTML. Input is whatever the browser (or an attacker) submitted.
 * An empty or tagless input comes back as an empty string.
 */
function sanitize_post_html(string $html): string
{
    $html = trim($html);
    if ($html === '') {
        return '';
    }

    $doc = new DOMDocument();
    // The meta tag is what makes libxml read the bytes as UTF-8; without it Korean text is
    // mangled. LIBXML_NOERROR swallows the warnings malformed markup would otherwise raise.
    $previous = libxml_use_internal_errors(true);
    $loaded = $doc->loadHTML(
        '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">'
        . '<div data-sanitize-root="1">' . $html . '</div>',
        LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
    );
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    if (!$loaded) {
        return '';
    }

    $xpath = new DOMXPath($doc);
    $root = $xpath->query('//div[@data-sanitize-root="1"]')->item(0);
    if (!$root instanceof DOMElement) {
        return '';
    }

    sanitize_node_children($root);

    $out = '';
    foreach ($root->childNodes as $child) {
        $out .= $doc->saveHTML($child);
    }
    return trim($out);
}

/** True when the body carries no visible text and no image — used for "is this empty?". */
function post_html_is_empty(string $html): bool
{
    $withoutImages = preg_replace('/<img\b[^>]*>/i', 'x', $html) ?? $html;
    return trim(html_entity_decode(strip_tags($withoutImages), ENT_QUOTES, 'UTF-8')) === '';
}

/** Visible text length, for the "too long" check — markup should not eat the budget. */
function post_html_text_length(string $html): int
{
    return mb_strlen(trim(html_entity_decode(strip_tags($html), ENT_QUOTES, 'UTF-8')));
}

function sanitize_node_children(DOMElement $parent): void
{
    // Snapshot first: the loop moves and removes nodes, which would disturb a live NodeList.
    $children = iterator_to_array($parent->childNodes);
    foreach ($children as $node) {
        sanitize_node($node);
    }
}

function sanitize_node(DOMNode $node): void
{
    if ($node instanceof DOMText) {
        return; // Text is re-escaped on serialization, so it is already safe.
    }
    if ($node instanceof DOMComment || $node instanceof DOMProcessingInstruction) {
        $node->parentNode?->removeChild($node);
        return;
    }
    if (!$node instanceof DOMElement) {
        $node->parentNode?->removeChild($node);
        return;
    }

    $tag = strtolower($node->nodeName);

    if (in_array($tag, SANITIZE_DROP_SUBTREE, true)) {
        $node->parentNode?->removeChild($node);
        return;
    }

    if (!array_key_exists($tag, SANITIZE_ELEMENTS)) {
        sanitize_unwrap($node); // Keep the words, discard the wrapper.
        return;
    }

    sanitize_attributes($node, $tag);
    sanitize_node_children($node);
}

/** Replaces an element with its children, after sanitizing them. */
function sanitize_unwrap(DOMElement $node): void
{
    $parent = $node->parentNode;
    if ($parent === null) {
        return;
    }
    sanitize_node_children($node);
    while ($node->firstChild !== null) {
        $parent->insertBefore($node->firstChild, $node);
    }
    $parent->removeChild($node);
}

function sanitize_attributes(DOMElement $node, string $tag): void
{
    $allowed = SANITIZE_ELEMENTS[$tag];

    foreach (iterator_to_array($node->attributes) as $attr) {
        if (!in_array(strtolower($attr->nodeName), $allowed, true)) {
            $node->removeAttribute($attr->nodeName);
        }
    }

    if ($node->hasAttribute('style')) {
        $style = sanitize_style($node->getAttribute('style'), $tag);
        if ($style === '') {
            $node->removeAttribute('style');
        } else {
            $node->setAttribute('style', $style);
        }
    }

    if ($tag === 'a') {
        $href = sanitize_href($node->getAttribute('href'));
        if ($href === null) {
            $node->removeAttribute('href');
        } else {
            $node->setAttribute('href', $href);
            if (str_starts_with($href, 'http')) {
                $node->setAttribute('target', '_blank');
                $node->setAttribute('rel', 'noopener noreferrer');
            }
        }
    }

    if ($tag === 'img') {
        if (!preg_match(SANITIZE_IMG_SRC, $node->getAttribute('src'))) {
            $node->parentNode?->removeChild($node);
            return;
        }
        foreach (['width', 'height'] as $dim) {
            if ($node->hasAttribute($dim) && !preg_match('/^\d{1,4}$/', $node->getAttribute($dim))) {
                $node->removeAttribute($dim);
            }
        }
        if (!$node->hasAttribute('alt')) {
            $node->setAttribute('alt', '');
        }
    }
}

/**
 * Rebuilds the style attribute from recognised declarations only. Because the output is
 * assembled from matched values rather than filtered from the input, constructs like
 * url(), expression() or escaped sequences cannot survive even in a mangled form.
 */
function sanitize_style(string $style, string $tag): string
{
    $allowedProps = $tag === 'span'
        ? ['color', 'background-color', 'font-size']
        : ['text-align'];

    $out = [];
    foreach (explode(';', $style) as $declaration) {
        $parts = explode(':', $declaration, 2);
        if (count($parts) !== 2) {
            continue;
        }
        $prop = strtolower(trim($parts[0]));
        $value = trim($parts[1]);

        if (!in_array($prop, $allowedProps, true)) {
            continue;
        }

        $clean = match ($prop) {
            'color', 'background-color' => sanitize_color($value),
            'font-size' => sanitize_font_size($value),
            'text-align' => in_array(strtolower($value), ['left', 'center', 'right'], true)
                ? strtolower($value)
                : null,
            default => null,
        };

        if ($clean !== null) {
            $out[] = $prop . ':' . $clean;
        }
    }
    return implode(';', $out);
}

function sanitize_color(string $value): ?string
{
    $value = strtolower(trim($value));
    if (preg_match('/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/', $value)) {
        return $value;
    }
    if (preg_match('/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/', $value, $m)) {
        foreach ([1, 2, 3] as $i) {
            if ((int) $m[$i] > 255) {
                return null;
            }
        }
        return sprintf('rgb(%d,%d,%d)', (int) $m[1], (int) $m[2], (int) $m[3]);
    }
    return null;
}

function sanitize_font_size(string $value): ?string
{
    if (!preg_match('/^(\d{1,3})(?:\.\d+)?px$/', strtolower(trim($value)), $m)) {
        return null;
    }
    $px = (int) $m[1];
    if ($px < SANITIZE_FONT_SIZE_MIN || $px > SANITIZE_FONT_SIZE_MAX) {
        return null;
    }
    return $px . 'px';
}

function sanitize_href(string $href): ?string
{
    $href = trim($href);
    // Control characters are how "java\0script:" style payloads slip past naive prefix checks.
    if ($href === '' || preg_match('/[\x00-\x1F\x7F]/', $href)) {
        return null;
    }
    if (preg_match('#^https?://[^\s"\'<>]+$#i', $href)) {
        return $href;
    }
    if (preg_match('/^mailto:[^\s"\'<>]+$/i', $href)) {
        return $href;
    }
    if (preg_match('#^/[^\s"\'<>]*$#', $href)) {
        return $href; // Same-site link.
    }
    return null;
}
