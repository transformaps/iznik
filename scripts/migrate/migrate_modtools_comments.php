<?php

require_once dirname(__FILE__) . '/../../include/config.php';
require_once(IZNIK_BASE . '/include/db.php');
require_once(IZNIK_BASE . '/include/utils.php');
require_once(IZNIK_BASE . '/include/group/Group.php');
require_once(IZNIK_BASE . '/include/user/User.php');

$dsn = "mysql:host={$dbconfig['host']};dbname=modtools;charset=utf8";

$dbhold = new PDO($dsn, $dbconfig['user'], $dbconfig['pass'], array(
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => FALSE
));

$u = new User($dbhr, $dbhm);
$g = new Group($dbhr, $dbhm);

$dbhm->preExec("DELETE FROM users_comments;");

$oldusers = $dbhold->query("SELECT membercomments.*, groups.groupname, moderators.email AS modemail FROM membercomments INNER JOIN groups ON membercomments.groupid = groups.groupid INNER JOIN moderators ON membercomments.modid = moderators.uniqueid;");
$count = 0;
foreach ($oldusers as $user) {
    $modid = $u->findByEmail($user['modemail']);
    $id1 = $u->findByEmail($user['email']);
    $id2 = $u->findByYahooId($user['yahooid']);
    $id = $id1 ? $id1 : $id2;

    if (!$id) {
        #error_log("Unknown {$user['email']} {$user['yahooid']}, skip");
    } else {
        #error_log("Found $id for {$user['email']} {$user['yahooid']} on {$user['groupname']}");
        $u = new User($dbhr, $dbhm, $id);
        $mysqldate = date ("Y-m-d", strtotime($user['date']));
        $gid = $g->findByShortName($user['groupname']);

        if ($gid) {
            $user1 = trim($user['comment']) != '' ? $user['comment'] : NULL;
            $user2 = trim($user['user1']) != '' ? $user['user1'] : NULL;
            $user3 = trim($user['user2']) != '' ? $user['user2'] : NULL;
            $user4 = trim($user['user3']) != '' ? $user['user3'] : NULL;
            $user5 = trim($user['user4']) != '' ? $user['user4'] : NULL;
            $user6 = trim($user['user5']) != '' ? $user['user5'] : NULL;
            $user7 = trim($user['user6']) != '' ? $user['user6'] : NULL;
            $user8 = trim($user['user7']) != '' ? $user['user7'] : NULL;
            $user9 = trim($user['user8']) != '' ? $user['user8'] : NULL;
            $user10 = trim($user['user9']) != '' ? $user['user9'] : NULL;
            $user11 = trim($user['user10']) != '' ? $user['user10'] : NULL;

            $id = $u->addComment($gid,
                $user1,
                $user2,
                $user3,
                $user4,
                $user5,
                $user6,
                $user7,
                $user8,
                $user9,
                $user10,
                $user11,
                $modid,
                FALSE);

            if (!$id) {
                error_log("Add comment failed");
                error_log("Add comment failed " . var_export([$gid,
                $user1,
                $user2,
                $user3,
                $user4,
                $user5,
                $user6,
                $user7,
                $user8,
                $user9,
                $user10,
                $user11,
                $modid]), TRUE);
                exit(1);
            }

            $dbhm->preExec("UPDATE users_comments SET date = '$mysqldate' WHERE id = $id;");
        } else {
            error_log("Ignore comment for group {$user['groupname']}");
        }
    }

    $count++;
    if ($count % 1000 == 0) {
        error_log("...$count");
    }
}
