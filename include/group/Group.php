<?php

require_once(IZNIK_BASE . '/include/utils.php');
require_once(IZNIK_BASE . '/include/misc/Entity.php');

class Group extends Entity
{
    /** @var  $dbhm LoggedPDO */
    var $publicatts = array('id', 'nameshort', 'namefull', 'nameabbr', 'namedisplay', 'settings', 'type', 'logo',
        'onyahoo');

    const GROUP_REUSE = 'Reuse';
    const GROUP_FREEGLE = 'Freegle';
    const GROUP_OTHER = 'Other';

    /** @var  $log Log */
    private $log;

    function __construct(LoggedPDO $dbhr, LoggedPDO $dbhm, $id = NULL)
    {
        $this->fetch($dbhr, $dbhm, $id, 'groups', 'group', $this->publicatts);

        $this->log = new Log($dbhr, $dbhm);
    }

    public function create($shortname, $type) {
        try {
            $rc = $this->dbhm->preExec("INSERT INTO groups (nameshort, type) VALUES (?, ?)", [$shortname, $type]);
            $id = $this->dbhm->lastInsertId();
        } catch (Exception $e) {
            $id = NULL;
            $rc = 0;
        }

        if ($rc && $id) {
            $this->fetch($this->dbhr, $this->dbhm, $id, 'groups', 'group', $this->publicatts);
            $this->log->log([
                'type' => Log::TYPE_GROUP,
                'subtype' => Log::SUBTYPE_CREATED,
                'group' => $id,
                'text' => $shortname
            ]);

            return($id);
        } else {
            return(NULL);
        }
    }

    public function delete() {
        $rc = $this->dbhm->preExec("DELETE FROM groups WHERE id = ?;", [$this->id]);
        if ($rc) {
            $this->log->log([
                'type' => Log::TYPE_GROUP,
                'subtype' => Log::SUBTYPE_DELETED,
                'group' => $this->id
            ]);
        }

        return($rc);
    }

    public function findByShortName($name) {
        $groups = $this->dbhr->preQuery("SELECT id FROM groups WHERE nameshort LIKE ?;",
            [$name]);
        foreach ($groups as $group) {
            return($group['id']);
        }

        return(NULL);
    }

    public function getWorkCounts() {
        $ret = [
            'pending' => $this->dbhr->preQuery("SELECT COUNT(*) AS count FROM messages_pending WHERE groupid = ?;", [
                $this->id
            ])[0]['count'],
            'spam' => $this->dbhr->preQuery("SELECT COUNT(*) AS count FROM messages_spam WHERE groupid = ?;", [
                $this->id
            ])[0]['count'],
        ];

        return($ret);
    }

    public function getPublic() {
        $atts = parent::getPublic();

        # Add in derived properties.
        $atts['namedisplay'] = $atts['namefull'] ? $atts['namefull'] : $atts['nameshort'];

        return($atts);
    }

    public function correlate($collections, $messages) {
        # Check whether any of the messages in $messages are not present on the server or vice-versa.
        $missingonserver = [];
        $supplied = [];
        $missingonclient = [];
        $cs = [];

        # First find messages which are missing on the server, i.e. present in $messages but not
        # present in any of $collections.
        foreach ($collections as $collection)
        {
            $c = new Collection($this->dbhr, $this->dbhm, $collection);
            $cs[] = $c;
        }

        foreach ($messages as $message) {
            $supplied[$message['email'] . $message['date']] = true;

            $missing = true;

            foreach ($cs as $c) {
                if ($c->find($message['email'], $this->id, $message['date'])) {
                    $missing = false;
                }
            }

            if ($missing) {
                $missingonserver[] = $message;
            }
        }

        # Now find messages which are missing on the client, i.e. present in $collections but not present in
        # $messages.
        foreach ($cs as $c) {
            error_log("Check " . $c->getCollection());
            $ourmsgs = $this->dbhr->preQuery(
                "SELECT id, fromaddr, subject, date FROM " . $c->getCollection() . " WHERE groupid = ?;",
                [
                    $this->id
                ]
            );

            foreach ($ourmsgs as $msg) {
                $key = $msg['fromaddr'] . ISODate($msg['date']);
                if (!array_key_exists($key, $supplied)) {
                    $missingonclient[] = [
                        'id' => $msg['id'],
                        'email' => $msg['fromaddr'],
                        'subject' => $msg['subject'],
                        'collection' => $c->getCollection(),
                        'date' => ISODate($msg['date'])
                    ];
                }
            }
        }

        return([$missingonserver, $missingonclient]);
    }
}