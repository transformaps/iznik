<?php

require_once(IZNIK_BASE . '/include/utils.php');
require_once(IZNIK_BASE . '/include/misc/Entity.php');
require_once(IZNIK_BASE . '/include/group/Group.php');
require_once(IZNIK_BASE . '/include/group/CommunityEvent.php');

use Facebook\FacebookSession;
use Facebook\FacebookJavaScriptLoginHelper;
use Facebook\FacebookCanvasLoginHelper;
use Facebook\FacebookRequest;
use Facebook\FacebookRequestException;

class GroupFacebook {
    var $publicatts = ['name', 'token', 'authdate', 'valid', 'msgid', 'eventid', 'sharefrom', 'token', 'groupid', 'id' ];

    function __construct(LoggedPDO $dbhr, LoggedPDO $dbhm, $groupid = NULL)
    {
        $this->dbhr = $dbhr;
        $this->dbhm = $dbhm;
        $this->groupid = $groupid;

        foreach ($this->publicatts as $att) {
            $this->$att = NULL;
        }

        $groups = $this->dbhr->preQuery("SELECT * FROM groups_facebook WHERE groupid = ?;", [ $groupid ]);
        foreach ($groups as $group) {
            foreach ($this->publicatts as $att) {
                $this->$att = $group[$att];
            }
        }
    }

    /**
     * @param LoggedPDO $dbhm
     */
    public function setDbhm($dbhm)
    {
        $this->dbhm = $dbhm;
    }

    public function getPublic() {
        $ret = [];
        foreach ($this->publicatts as $att) {
            $ret[$att] = $this->$att;
        }

        return($ret);
    }

    public function findById($id) {
        $groups = $this->dbhr->preQuery("SELECT groupid FROM groups_facebook WHERE id = ?;", [ $id ]);
        return(count($groups) > 0 ? $groups[0]['groupid'] : NULL);
    }

    public function getFB() {
        $fb = new Facebook\Facebook([
            'app_id' => FBGRAFFITIAPP_ID,
            'app_secret' => FBGRAFFITIAPP_SECRET
        ]);

        return($fb);
    }

    public function set($token) {
        $this->dbhm->preExec("UPDATE groups_facebook SET token = ?, authdate = NOW(), valid = 1 WHERE groupid = ?;",
            [
                $token,
                $this->groupid
            ]);

        $this->token = $token;
    }

    public function shareFrom($forceshare = FALSE, $since = "yesterday") {
        $count = 0;
        $fb = $this->getFB();

        # Get posts we might want to share.  This returns only posts by the page itself.
        try {
            $ret = $fb->get($this->sharefrom . "/posts?since=$since&fields=id,link,message,type,caption,icon,name", $this->token);

            $posts = $ret->getDecodedBody();
            error_log("Posts " . var_export($posts, TRUE));

            foreach ($posts['data'] as $wallpost) {
                #error_log("Post " . var_export($wallpost, true));

                # Check if we've already shared this one.
                $sql = "SELECT * FROM groups_facebook_shares WHERE groupid = ? AND postid = ?;";
                $posteds = $this->dbhr->preQuery($sql, [ $this->groupid, $wallpost['id'] ]);

                if (count($posteds) == 0 || $forceshare) {
                    # Whether or not this worked, remember that we've tried, so that we don't try again.
                    #
                    # TODO should we handle transient errors better?
                    $this->dbhm->preExec("INSERT IGNORE INTO groups_facebook_shares (groupid, postid) VALUES (?,?);", [
                        $this->groupid,
                        $wallpost['id']
                    ]);

                    # Like the original post.
                    $res = $fb->post($wallpost['id'] . '/likes', [], $this->token);
                    #error_log("Like returned " . var_export($res, true));

                    # We want to share the post out with the existing details - but we need to remove the id, otherwise
                    # it's an invalid op.
                    unset($wallpost['id']);
                    $result = $fb->post($this->name . '/feed', $wallpost, $this->token);
                    #error_log("Post returned " . var_export($result, true));

                    if ($result->getHttpStatusCode() == 200) {
                        $count++;
                    }
                }
            }
        } catch (Exception $e) {
            error_log("Failed " . $e->getMessage() . " token " . $this->token);
            $code = $e->getCode();

            # These numbers come from FacebookResponseException.
            if ($code == 100 || $code == 102 || $code == 190) {
                $this->dbhm->preExec("UPDATE groups_facebook SET valid = 0, lasterrortime = NOW(), lasterror = ? WHERE groupid = ?;", [
                    $e->getMessage(),
                    $this->groupid
                ]);
            }
        }

        return($count);
    }
}