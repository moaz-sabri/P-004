<?php
/** Shared request guards for the HTTP API. */

declare(strict_types=1);

function require_request_method(string $expected): void {
    $actual = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($actual !== strtoupper($expected)) {
        header('Allow: ' . strtoupper($expected));
        json_response(['success' => false, 'error' => 'Method not allowed'], 405);
    }
}

function require_json_request(int $maxBytes = 1048576): void {
    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > $maxBytes) {
        json_response(['success' => false, 'error' => 'حجم الطلب أكبر من المسموح.'], 413);
    }

    $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
    if ($contentType !== 'application/json') {
        json_response(['success' => false, 'error' => 'يجب إرسال البيانات بصيغة JSON.'], 415);
    }
}

function require_csrf(): void {
    // Bearer-authenticated clients are not exposed to Cookie CSRF.
    if (empty($_COOKIE['studio_auth'])) return;
    $cookieToken = (string)($_COOKIE['studio_csrf'] ?? '');
    $headerToken = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($cookieToken === '' || $headerToken === '' || !hash_equals($cookieToken, $headerToken)) {
        json_response(['success' => false, 'error' => 'رمز حماية الطلب غير صالح.'], 403);
    }
}

function require_non_empty_string(mixed $value, string $field, int $maxLength = 255): string {
    $value = is_string($value) ? trim($value) : '';
    if ($value === '' || mb_strlen($value) > $maxLength) {
        json_response(['success' => false, 'error' => "الحقل {$field} مطلوب أو يتجاوز الطول المسموح."], 400);
    }
    return $value;
}
