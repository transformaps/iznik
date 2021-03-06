<?php
# Rescale large images in message_attachments

require_once dirname(__FILE__) . '/../../include/config.php';
require_once(IZNIK_BASE . '/include/db.php');
require_once(IZNIK_BASE . '/include/utils.php');
require_once(IZNIK_BASE . '/include/chat/ChatMessage.php');

$chats = $dbhr->preQuery("SELECT id FROM chat_rooms;");

foreach ($chats as $chat) {
    $chatmsgs = $dbhr->preQuery("SELECT * FROM chat_messages WHERE chatid = ?;", [ $chat['id'] ]);

    $lastmsg = NULL;
    $lastid = NULL;
    foreach ($chatmsgs as $msg) {
        if ($lastmsg && $lastmsg == $msg['message']) {
            error_log("{$chat['id']} $lastid and {$msg['id']}");
            $dbhm->preExec("DELETE FROM chat_messages WHERE id = ?;", [ $msg['id'] ]);
        } else {
            $lastmsg = $msg['message'];
            $lastid = $msg['id'];
        }
    }
}
