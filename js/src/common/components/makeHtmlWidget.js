import DOMPurify from 'dompurify';

// Attributes an embed needs to actually work once iframes are permitted.
// `srcdoc` is deliberately absent: it carries its own HTML document, so an
// iframe could smuggle arbitrary markup past the host allowlist with no `src`
// for us to check.
const IFRAME_ATTR = ['src', 'width', 'height', 'title', 'loading', 'referrerpolicy', 'allow', 'allowfullscreen', 'frameborder', 'sandbox'];

/**
 * Parse the admin's newline-separated host allowlist.
 *
 * Blank lines and `#` comments are ignored. An entry may be a bare host
 * (`www.youtube.com`) or a subdomain wildcard (`*.youtube.com`), which matches
 * any subdomain but not the bare domain itself.
 */
export function parseAllowedHosts(raw) {
  return String(raw || '')
    .split(/[\r\n,]+/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean);
}

/**
 * Is this iframe `src` allowed?
 *
 * Only http(s) is accepted, so `javascript:` and `data:` URLs cannot slip
 * through even if a browser would otherwise honour them in a frame.
 */
export function iframeSrcAllowed(src, allowedHosts) {
  if (!allowedHosts.length) return false;

  let url;
  try {
    url = new URL(String(src || ''), window.location.href);
  } catch (e) {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();

  // For `*.example.com` the leading star is dropped and the remaining
  // `.example.com` is matched as a suffix. Keeping the dot is what stops
  // `evilexample.com` matching, and it also means the bare `example.com` does
  // not match its own wildcard, so list both if you need both.
  return allowedHosts.some((allowed) => (allowed.startsWith('*.') ? host.endsWith(allowed.slice(1)) : host === allowed));
}

// Pick a readable text color (near-black or white) for an admin-chosen
// background. Once a solid background is set the card no longer follows the
// theme, so its text must contrast with that fixed color rather than the
// light/dark theme. Uses the YIQ perceived-brightness approximation.
function readableTextColor(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#111111' : '#ffffff';
}

/**
 * Builds the HTML widget class.
 *
 * The fof Widget base class is passed in (resolved at initializer time, not at
 * module load) so the class isn't defined against an `ext:` binding that may
 * not be registered yet during cross-bundle load -- which previously left the
 * component undefined and crashed fof's renderer.
 *
 * - DOMPurify is bundled into the build (no CDN at runtime).
 * - The admin-supplied HTML is always sanitised before reaching m.trust(),
 *   stripping <script> tags, event handlers, javascript: URLs and other unsafe
 *   markup.
 * - Content is fetched on demand when the widget mounts, so it is not
 *   serialised into the forum payload on every request.
 */
export default function makeHtmlWidget(Widget) {
  return class HtmlWidget extends Widget {
    oninit(vnode) {
      super.oninit(vnode);

      this.loading = true;
      this.data = { title: '', icon: '', body: '', backgroundColor: '' };

      // Cache-bust with the settings revision from the boot payload: when an
      // admin edits the widget the hash changes, so the URL changes and a normal
      // reload fetches fresh content instead of the browser's cached copy. When
      // nothing changed the URL is stable and the cached response is reused.
      const rev = (app.data && app.data['linkrobins-html-widget.rev']) || '';
      const base = app.forum.attribute('apiUrl') + '/linkrobins-html-widget';
      const url = rev ? base + '?v=' + encodeURIComponent(rev) : base;

      app
        .request({
          method: 'GET',
          url,
        })
        .then((data) => {
          if (data) this.data = data;
          this.loading = false;
          m.redraw();
        })
        .catch((e) => {
          this.loading = false;
          console.error('[linkrobins/html-widget] failed to load content:', e);
          m.redraw();
        });
    }

    view(vnode) {
      // Don't render the widget shell until the content has loaded, to avoid a
      // flash of an empty widget while the request is in flight.
      if (this.loading) return null;

      const node = super.view(vnode);

      // Optional admin background color, applied as CSS custom properties the
      // widget card's content box derives its background and (auto-contrasting)
      // text color from (see forum.less). The regex is a guard since this lands
      // in an inline style; the fof root vnode carries our LinkRobinsHtmlWidget
      // class, so the properties inherit down to .FofWidgets-Widget-content.
      const bg = this.data.backgroundColor || '';
      if (node && node.attrs && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(bg)) {
        const fg = readableTextColor(bg);
        const decl = '--lrhw-bg: ' + bg + '; --lrhw-fg: ' + fg;
        const style = node.attrs.style;
        if (style == null) node.attrs.style = decl;
        else if (typeof style === 'string') node.attrs.style = style.replace(/;\s*$/, '') + '; ' + decl;
        else {
          style['--lrhw-bg'] = bg;
          style['--lrhw-fg'] = fg;
        }
      }

      return node;
    }

    className() {
      return 'LinkRobinsHtmlWidget';
    }

    icon() {
      return this.data.icon || '';
    }

    title() {
      return this.data.title || '';
    }

    content() {
      const body = this.data.body || '';
      if (!body) return null;
      return m.trust(this.renderBody(body));
    }

    renderBody(body) {
      // Sanitising runs on every redraw, so memoise it: the body only changes
      // when an admin edits it, and re-parsing identical HTML each redraw is
      // wasted work. The allowlist is part of the cache key because changing it
      // changes the output for an unchanged body.
      const hosts = this.data.allowedIframeHosts || '';
      const key = hosts + '\u0000' + body;

      if (this._bodyCache !== key) {
        try {
          this._bodyHtml = sanitizeBody(body, parseAllowedHosts(hosts));
        } catch (e) {
          console.error('[linkrobins/html-widget] sanitise failed:', e);
          this._bodyHtml = '';
        }
        this._bodyCache = key;
      }
      return this._bodyHtml;
    }
  };
}

/**
 * Sanitise the admin's HTML, optionally permitting iframes from named hosts.
 *
 * With no allowlist configured this is DOMPurify's default behaviour, which
 * strips iframes along with scripts, event handlers and `javascript:` URLs.
 *
 * With an allowlist, iframes are permitted through DOMPurify and then checked
 * individually: anything whose `src` host is not on the list is dropped. The
 * check is a DOMPurify hook rather than a second pass over the output, so a
 * rejected frame never reaches the returned markup. The hook is removed again
 * immediately, because DOMPurify hooks are global to this bundle's instance and
 * sanitising is synchronous, so leaving it registered would apply it to
 * unrelated calls.
 */
export function sanitizeBody(body, allowedHosts) {
  if (!allowedHosts.length) {
    return DOMPurify.sanitize(body);
  }

  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'iframe') return;

    // getAttribute is guarded: DOMPurify passes text nodes through this hook
    // too, and those have no attribute methods.
    const src = typeof node.getAttribute === 'function' ? node.getAttribute('src') : null;

    if (!iframeSrcAllowed(src, allowedHosts)) {
      node.parentNode?.removeChild(node);
    }
  });

  try {
    return DOMPurify.sanitize(body, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: IFRAME_ATTR,
    });
  } finally {
    DOMPurify.removeHook('uponSanitizeElement');
  }
}
