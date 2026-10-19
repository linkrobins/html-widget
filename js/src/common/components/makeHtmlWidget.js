import DOMPurify from 'dompurify';

// Attributes an embed needs to actually work once iframes are permitted.
// `srcdoc` is deliberately absent: it carries its own HTML document, so an
// iframe could smuggle arbitrary markup past the host allowlist with no `src`
// for us to check.
const IFRAME_ATTR = ['src', 'width', 'height', 'title', 'loading', 'referrerpolicy', 'allow', 'allowfullscreen', 'frameborder', 'sandbox'];

// Flarum sends `Referrer-Policy: same-origin`, so a cross-site frame gets no
// Referer at all, and YouTube refuses to play an embed without one (its
// "Error 153"). An allowed iframe with no policy of its own gets this one,
// which sends the forum's origin (never the page path) to a host the admin
// has listed. A policy the admin sets on the iframe is kept.
const IFRAME_REFERRER_POLICY = 'strict-origin-when-cross-origin';

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

// Content already fetched in this page load, keyed by request URL (which
// carries the settings revision), and requests still in flight. Both live for
// the page's lifetime only, so a full reload always asks again.
const contentCache = new Map();
const pending = new Map();

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
      this.data = { title: '', description: '', icon: '', body: '', backgroundColor: '' };

      // Cache-bust with the settings revision from the boot payload: when an
      // admin edits the widget the hash changes, so the URL changes and a normal
      // reload fetches fresh content instead of the browser's cached copy. When
      // nothing changed the URL is stable and the cached response is reused.
      const rev = (app.data && app.data['linkrobins-html-widget.rev']) || '';
      const base = app.forum.attribute('apiUrl') + '/linkrobins-html-widget';
      const url = rev ? base + '?v=' + encodeURIComponent(rev) : base;

      // The widget area is rebuilt on every page change, which creates a new
      // instance of this component. Reuse the content an earlier instance
      // already loaded, so the widget appears in the same frame instead of
      // vanishing until a request (even one the browser answers from cache)
      // comes back, which shifted the page layout on every navigation.
      if (contentCache.has(url)) {
        this.data = contentCache.get(url);
        this.loading = false;
        return;
      }

      if (!pending.has(url)) {
        pending.set(
          url,
          app
            .request({
              method: 'GET',
              url,
            })
            .then((data) => {
              if (data) contentCache.set(url, data);
              return data;
            })
            .finally(() => pending.delete(url))
        );
      }

      pending
        .get(url)
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
        // Plain links follow the contrasting text color too, with an underline
        // since they now share that color: the theme's link color is picked for
        // the theme's own background and was hard to read on a dark admin color.
        const vars = {
          '--lrhw-bg': bg,
          '--lrhw-fg': fg,
          '--lrhw-link': fg,
          '--lrhw-link-decoration': 'underline',
        };
        const decl = Object.keys(vars)
          .map((key) => key + ': ' + vars[key])
          .join('; ');
        const style = node.attrs.style;
        if (style == null) node.attrs.style = decl;
        else if (typeof style === 'string') node.attrs.style = style.replace(/;\s*$/, '') + '; ' + decl;
        else Object.assign(style, vars);
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

    description() {
      return this.data.description || '';
    }

    // The base header() renders icon, title and description together, but only
    // when title() is set. Keep it as the primary path so that markup stays
    // fof's own, and hand-build the no-title case so a description (with the
    // icon, if one is set) still gets a header instead of rendering nothing.
    header() {
      const base = super.header();
      if (base) return base;

      const iconName = this.icon();
      const description = this.description();
      if (!description) return null;

      return m(
        'div',
        { className: 'FofWidgets-Widget-title' },
        iconName ? m('span', { className: 'FofWidgets-Widget-title-icon' }, m('i', { className: iconName })) : null,
        m('div', { className: 'FofWidgets-Widget-title-desc' }, description)
      );
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
 * individually: anything whose `src` host is not on the list is dropped, and
 * a frame that stays gets a referrer policy if it has none. Both are DOMPurify
 * hooks rather than a second pass over the output, so a rejected frame never
 * reaches the returned markup. The hooks are removed again immediately,
 * because DOMPurify hooks are global to this bundle's instance and sanitising
 * is synchronous, so leaving them registered would apply them to unrelated
 * calls.
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

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'IFRAME' && !node.hasAttribute('referrerpolicy')) {
      node.setAttribute('referrerpolicy', IFRAME_REFERRER_POLICY);
    }
  });

  try {
    return DOMPurify.sanitize(body, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: IFRAME_ATTR,
    });
  } finally {
    DOMPurify.removeHook('uponSanitizeElement');
    DOMPurify.removeHook('afterSanitizeAttributes');
  }
}
