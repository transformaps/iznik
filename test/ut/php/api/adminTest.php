<?php

if (!defined('UT_DIR')) {
    define('UT_DIR', dirname(__FILE__) . '/../..');
}
require_once UT_DIR . '/IznikAPITestCase.php';
require_once IZNIK_BASE . '/include/user/User.php';
require_once IZNIK_BASE . '/include/group/Group.php';
require_once IZNIK_BASE . '/include/group/Alerts.php';

/**
 * @backupGlobals disabled
 * @backupStaticAttributes disabled
 */
class adminAPITest extends IznikAPITestCase
{
    public $dbhr, $dbhm;

    protected function setUp()
    {
        parent::setUp();

        /** @var LoggedPDO $dbhr */
        /** @var LoggedPDO $dbhm */
        global $dbhr, $dbhm;
        $this->dbhr = $dbhr;
        $this->dbhm = $dbhm;

        $dbhm->preExec("DELETE FROM admins WHERE subject LIKE 'UT %';");

        $u = User::get($this->dbhr, $this->dbhm);
        $this->uid = $u->create(NULL, NULL, 'Test User');
        $this->user = User::get($this->dbhr, $this->dbhm, $this->uid);
        assertGreaterThan(0, $this->user->addLogin(User::LOGIN_NATIVE, NULL, 'testpw'));

        $u = User::get($this->dbhr, $this->dbhm);
        $this->uid2 = $u->create(NULL, NULL, 'Test User');
        $this->user2 = User::get($this->dbhr, $this->dbhm, $this->uid2);
        assertGreaterThan(0, $this->user2->addLogin(User::LOGIN_NATIVE, NULL, 'testpw'));

        $g = Group::get($this->dbhr, $this->dbhm);
        $this->groupid = $g->create('testgroup', Group::GROUP_UT);
    }

    protected function tearDown()
    {
        parent::tearDown();
    }

    public function __construct()
    {
    }

    public function testBasic()
    {
        error_log(__METHOD__);

        $admindata = [
            'groupid' => $this->groupid,
            'subject' => 'UT Admin',
            'text' => 'Please ignore this - generated by Iznik UT'
        ];

        # Can't create logged out.
        $ret = $this->call('admin', 'POST', $admindata);
        assertEquals(1, $ret['ret']);

        # Or logged in as non-mod
        assertTrue($this->user->login('testpw'));
        $this->user->addMembership($this->groupid);
        $admindata['dup'] = 1;
        $ret = $this->call('admin', 'POST', $admindata);
        assertEquals(2, $ret['ret']);

        # Can create as mod
        $this->user->addMembership($this->groupid, User::ROLE_MODERATOR);
        $admindata['dup']++;
        $ret = $this->call('admin', 'POST', $admindata);
        assertEquals(0, $ret['ret']);
        $id = $ret['id'];

        # Should now be able to get it.
        $ret = $this->call('admin', 'GET', [ 'id' => $id ]);
        assertEquals(0, $ret['ret']);
        assertEquals($id, $ret['admin']['id']);

        foreach ($admindata as $key => $val) {
            if ($key != 'dup') {
                assertEquals($val, $ret['admin'][$key]);
            }
        }

        # And also get it via list.
        $ret = $this->call('admin', 'GET', [ 'groupid' => $this->groupid ]);
        assertEquals(0, $ret['ret']);
        assertEquals($id, $ret['admins'][0]['id']);

        # Now send - none to find, as we don't have an email on our domain.
        $a = new Admin($this->dbhr, $this->dbhm);
        assertEquals(0, $a->process($id));
        $this->dbhm->preExec("UPDATE admins SET complete = NULL WHERE id = $id");

        # Send again with an email present.
        $this->user->addEmail('test@blackhole.io', 1, TRUE);
        $email = 'ut-' . rand() . '@' . USER_DOMAIN;
        $this->user->addEmail($email, 0, FALSE);
        assertEquals(1, $a->process($id));

        # Fake error for coverage
        $this->user->addEmail('testblackhole.io', 1, TRUE);
        $this->dbhm->preExec("UPDATE admins SET complete = NULL WHERE id = $id");
        assertEquals(0, $a->process($id));

        error_log(__METHOD__ . " end");
    }
}
