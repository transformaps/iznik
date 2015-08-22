<?php

if (!defined('UT_DIR')) {
    define('UT_DIR', dirname(__FILE__) . '/../..');
}
require_once UT_DIR . '/IznikTest.php';
require_once BASE_DIR . '/include/message/IncomingMessage.php';

/**
 * @backupGlobals disabled
 * @backupStaticAttributes disabled
 */
class IncomingMessageTest extends IznikTest {
    private $dbhr, $dbhm;

    protected function setUp() {
        parent::setUp ();

        global $dbhr, $dbhm;
        $this->dbhr = $dbhr;
        $this->dbhm = $dbhm;
    }

    protected function tearDown() {
        parent::tearDown ();
    }

    public function __construct() {
    }

    public function testBasic() {
        error_log(__METHOD__);

        $msg = file_get_contents('msgs/basic');
        $m = new IncomingMessage($this->dbhr, $this->dbhm);
        $m->parse($msg);
        assertEquals('Basic test', $m->getSubject());
        assertEquals('Edward Hibbert', $m->getFrom()[0]['display']);
        assertEquals('edward@ehibbert.org.uk', $m->getFrom()[0]['address']);
        assertEquals('freegleplayground@yahoogroups.com', $m->getTo()[0]['address']);
        assertEquals('Hey.', $m->getText());
        assertEquals("<HTML><HEAD>
<STYLE id=eMClientCss>
blockquote.cite { margin-left: 5px; margin-right: 0px; padding-left: 10px; padding-right:0px; border-left: 1px solid #cccccc }
blockquote.cite2 {margin-left: 5px; margin-right: 0px; padding-left: 10px; padding-right:0px; border-left: 1px solid #cccccc; margin-top: 3px; padding-top: 0px; }
.plain pre, .plain tt { font-family: monospace; font-size: 100%; font-weight: normal; font-style: normal; white-space: pre-wrap; }
a img { border: 0px; }body {font-family: Tahoma;font-size: 12pt;}
.plain pre, .plain tt {font-family: Tahoma;font-size: 12pt;}</STYLE>
</HEAD>
<BODY>Hey.</BODY></HTML>", $m->getHtml());
        assertEquals(0, count($m->getAttachments()));

        error_log(__METHOD__ . " end");
    }

    public function testAttachment() {
        error_log(__METHOD__);

        $msg = file_get_contents('msgs/attachment');
        $m = new IncomingMessage($this->dbhr, $this->dbhm);
        $m->parse($msg);
        $atts = $m->getAttachments();
        assertEquals(2, count($atts));
        assertEquals('g4g220x194.png', $atts[0]->getFilename());
        assertEquals('image/png', $atts[0]->getContentType());
        assertEquals('g4g160.png', $atts[1]->getFilename());
        assertEquals('image/png', $atts[1]->getContentType());

        error_log(__METHOD__ . " end");
    }
}

