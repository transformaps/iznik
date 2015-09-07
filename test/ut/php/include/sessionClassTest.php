<?php

if (!defined('UT_DIR')) {
    define('UT_DIR', dirname(__FILE__) . '/../..');
}
require_once UT_DIR . '/IznikTest.php';
require_once(UT_DIR . '/../../include/config.php');
require_once(IZNIK_BASE . '/include/session/Session.php');
require_once(IZNIK_BASE . '/include/user/User.php');

/**
 * @backupGlobals disabled
 * @backupStaticAttributes disabled
 */
class sessionClassTest extends IznikTest {
    private $dbhr, $dbhm;

    protected function setUp() {
        parent::setUp ();

        global $dbhr, $dbhm;
        $this->dbhr = $dbhr;
        $this->dbhm = $dbhm;

        $dbhm->preExec("DELETE FROM users WHERE firstname = 'Test' AND lastname = 'User';");
        $_SESSION['id'] = NULL;
    }

    protected function tearDown() {
        parent::tearDown ();

        @session_destroy();
    }

    public function __construct() {
    }

    public function testBasic() {
        error_log(__METHOD__);

        # Logged out
        $me = whoAmI($this->dbhm, $this->dbhm);
        assertNull($me);

        $u = new User($this->dbhm, $this->dbhm);
        $id = $u->create('Test', 'User', NULL);

        $s = new Session($this->dbhm, $this->dbhm);
        $ret = $s->create($id);
        assertEquals($id, $ret['id']);

        # Verify it
        $ver = $s->verify($id, $ret['series'], $ret['token']);
        assertEquals($id, $ver['id']);
        assertNotEquals($ret['series'], $ver['series']);
        assertNotEquals($ret['token'], $ver['token']);

        assertNull($s->verify($id, $ret['series'] . 'z', $ret['token']));

        $me = whoAmI($this->dbhm, $this->dbhm);
        assertNull($me);

        # Now fake the login
        $_SESSION['id'] = $id;
        $me = whoAmI($this->dbhm, $this->dbhm);
        assertEquals($id, $me->getPrivate('id'));

        error_log(__METHOD__ . " end");
    }

    public function testMisc() {
        error_log(__METHOD__);

        # Can call this twice
        prepareSession($this->dbhm, $this->dbhm);
        prepareSession($this->dbhm, $this->dbhm);

        session_reopen();

        error_log(__METHOD__ . " end");
    }

    public function testCookie() {
        error_log(__METHOD__);

        $u = new User($this->dbhm, $this->dbhm);
        $id = $u->create('Test', 'User', NULL);

        $s = new Session($this->dbhm, $this->dbhm);
        $ret = $s->create($id);
        assertEquals($id, $ret['id']);

        # Cookie should log us in
        $_SESSION['id'] = NULL;
        $_COOKIE[COOKIE_NAME] = json_encode($ret);
        prepareSession($this->dbhm, $this->dbhm);
        assertTrue($_SESSION['logged_in']);
        assertEquals($id, $_SESSION['id']);

        # But not if the session has gone.
        $s->destroy($id);
        $_SESSION['logged_in'] = FALSE;
        prepareSession($this->dbhm, $this->dbhm);
        assertFalse($_SESSION['logged_in']);

        error_log(__METHOD__ . " end");
    }}
