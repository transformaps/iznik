<?php

require_once dirname(__FILE__) . '/../../include/config.php';
require_once(IZNIK_BASE . '/include/db.php');
require_once(IZNIK_BASE . '/include/utils.php');
require_once(IZNIK_BASE . '/include/user/User.php');

$dsn = "mysql:host={$dbconfig['host']};dbname=modtools;charset=utf8";

$dbhold = new PDO($dsn, $dbconfig['user'], $dbconfig['pass'], array(
    // PDO::ATTR_PERSISTENT => true, // Persistent connections seem to result in a leak - show status like 'Threads%'; shows an increasing number
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => FALSE
));

$u = new User($dbhr, $dbhm);

$mods = $dbhold->query("SELECT * FROM moderators;");
foreach ($mods as $mod) {
    $id = $u->findByEmail($mod['email']);

    if (!$id) {
        $id = $u->create(NULL, NULL, $mod['name']);
        $u->addEmail($mod['email']);
        $u->addLogin(User::LOGIN_YAHOO, $mod['yahooid']);
    }
}
