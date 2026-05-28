import DOMPurify from 'dompurify';

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
      this.data = { title: '', icon: '', body: '' };

      app
        .request({
          method: 'GET',
          url: app.forum.attribute('apiUrl') + '/linkrobins-html-widget',
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
      return super.view(vnode);
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
      try {
        return DOMPurify.sanitize(body);
      } catch (e) {
        console.error('[linkrobins/html-widget] sanitise failed:', e);
        return '';
      }
    }
  };
}
