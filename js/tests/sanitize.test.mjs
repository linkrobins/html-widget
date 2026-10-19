// Tests for the body sanitiser and the iframe host allowlist, run with Node's
// built-in test runner against the bundled DOMPurify in a jsdom window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// DOMPurify binds to `window` when its module is first evaluated, so the DOM
// has to exist before the widget module (and DOMPurify with it) is imported.
const { window } = new JSDOM('', { url: 'https://forum.example.com/' });
globalThis.window = window;

const { parseAllowedHosts, iframeSrcAllowed, sanitizeBody } = await import('../src/common/components/makeHtmlWidget.js');

const youtube = '<iframe src="https://www.youtube.com/embed/abc" width="560"></iframe>';

test('without an allowlist, scripts, handlers, javascript: URLs and iframes are removed', () => {
  const out = sanitizeBody(
    '<p onclick="x()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">a</a><img src="x.png" onerror="x()">' + youtube,
    []
  );

  assert.equal(out, '<p>Hi</p><a>a</a><img src="x.png">');
});

test('parseAllowedHosts trims, lowercases and drops blanks, comments, schemes and paths', () => {
  assert.deepEqual(parseAllowedHosts(' WWW.YouTube.com \n\n# comment\nhttps://player.vimeo.com/video/1\n*.example.org'), [
    'www.youtube.com',
    'player.vimeo.com',
    '*.example.org',
  ]);
  assert.deepEqual(parseAllowedHosts(''), []);
  assert.deepEqual(parseAllowedHosts(null), []);
});

test('an exact host matches only itself', () => {
  const hosts = ['www.youtube.com'];

  assert.equal(iframeSrcAllowed('https://www.youtube.com/embed/abc', hosts), true);
  assert.equal(iframeSrcAllowed('https://youtube.com/embed/abc', hosts), false);
  assert.equal(iframeSrcAllowed('https://www.youtube.com.evil.test/', hosts), false);
});

test('a wildcard matches subdomains but not the bare domain or a lookalike', () => {
  const hosts = ['*.vimeo.com'];

  assert.equal(iframeSrcAllowed('https://player.vimeo.com/video/1', hosts), true);
  assert.equal(iframeSrcAllowed('https://a.b.vimeo.com/', hosts), true);
  assert.equal(iframeSrcAllowed('https://vimeo.com/', hosts), false);
  assert.equal(iframeSrcAllowed('https://evilvimeo.com/', hosts), false);
});

test('only http and https frames are allowed, whatever the host', () => {
  const hosts = ['www.youtube.com'];

  assert.equal(iframeSrcAllowed('javascript:alert(1)', hosts), false);
  assert.equal(iframeSrcAllowed('data:text/html,<b>x</b>', hosts), false);
  assert.equal(iframeSrcAllowed('ftp://www.youtube.com/embed/abc', hosts), false);
  assert.equal(iframeSrcAllowed('ws://www.youtube.com/embed/abc', hosts), false);
  assert.equal(iframeSrcAllowed('http://www.youtube.com/embed/abc', hosts), true);
  assert.equal(iframeSrcAllowed('', hosts), false);
  assert.equal(iframeSrcAllowed('https://www.youtube.com/', []), false);
});

// An allowed frame with no referrer policy of its own gets this one.
const withPolicy = (frame) => frame.replace('></iframe>', ' referrerpolicy="strict-origin-when-cross-origin"></iframe>');

test('an allowed iframe is kept and an unlisted one is dropped', () => {
  const out = sanitizeBody(youtube + '<iframe src="https://evil.test/"></iframe><p>after</p>', ['www.youtube.com']);

  assert.equal(out, withPolicy(youtube) + '<p>after</p>');
});

test('an allowed iframe gets a referrer policy, unless it sets its own', () => {
  // Flarum's same-origin page policy would otherwise send no Referer, which
  // YouTube rejects with "Error 153".
  assert.equal(sanitizeBody(youtube, ['www.youtube.com']), withPolicy(youtube));

  const own = '<iframe src="https://www.youtube.com/embed/abc" referrerpolicy="no-referrer"></iframe>';
  assert.equal(sanitizeBody(own, ['www.youtube.com']), own);
});

test('srcdoc and event handlers are stripped from an allowed iframe', () => {
  // A plain srcdoc too: DOMPurify drops one that contains markup on its own,
  // so only a markup-free value shows whether the allowlist permits srcdoc.
  const out = sanitizeBody('<iframe src="https://www.youtube.com/embed/abc" srcdoc="hello" onload="x()"></iframe>', ['www.youtube.com']);

  assert.equal(out, withPolicy('<iframe src="https://www.youtube.com/embed/abc"></iframe>'));
});

test('the iframe hook does not leak into later calls', () => {
  const vimeo = '<iframe src="https://player.vimeo.com/video/1"></iframe>';

  sanitizeBody(youtube, ['www.youtube.com']);

  assert.equal(sanitizeBody(youtube + '<p>x</p>', []), '<p>x</p>');
  // A hook left behind by the first call would drop this frame, because its
  // host is not on the first call's list.
  assert.equal(sanitizeBody(vimeo, ['player.vimeo.com']), withPolicy(vimeo));
});
