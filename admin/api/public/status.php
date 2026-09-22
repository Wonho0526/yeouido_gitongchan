<?php

// Lets the static site tell whether this host actually runs the admin (PHP is executing
// here) or only serves files, as GitHub Pages and local static servers do. Deliberately
// touches neither the database nor config.php, so it answers even before setup.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

echo '{"admin":true}';
