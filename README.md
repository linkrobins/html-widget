# Link Robins HTML Widget

A simple HTML widget for [Flarum 2.0](https://flarum.org), built as a widget for [`fof/forum-widgets-core`](https://packagist.org/packages/fof/forum-widgets-core). Same skeleton as [`linkrobins/shoutbox`](https://packagist.org/packages/linkrobins/shoutbox).

## What it does

Adds one configurable HTML widget to the FoF Forum Widgets placement editor. Admin sets:

- **Title** — optional, shown above the body
- **Icon** — FontAwesome class (e.g. `fas fa-bullhorn`)
- **HTML body** — rendered as HTML, sanitised before display
- **Allowed iframe hosts** — opt in to embeds from hosts you name

Drag and place it from the FoF Forum Widgets admin page like any other widget.

## Settings

Configured in **Admin → Extensions → Link Robins HTML Widget**, then placed from the FoF Forum Widgets page.

| Setting | Required | What it does |
|---|---|---|
| Title | no | Shown above the body. Leave blank for a widget with no header. |
| Icon class | no | A FontAwesome class rendered beside the title, e.g. `fas fa-bullhorn`. Leave blank for no icon. |
| HTML body | yes | Raw HTML, sanitised before display (see the security note below). |
| Allowed iframe hosts | no | One host per line. Iframes in the body survive only if their `src` is on this list. Blank removes every iframe. |
| Background color | no | The widget's background. Leave blank to follow your theme, which is what keeps it looking native in both light and dark mode. |

## How a change reaches readers

The body is not baked into the forum's boot payload. It is fetched from its own endpoint on demand, and only a short hash of the current settings rides along in the payload.

That hash is what makes an edit show up: changing any setting changes the hash, which changes the fetch URL, so a normal page reload picks up the new content. Readers do not need a hard refresh, and unchanged content still caches normally rather than being re-fetched on every page view.

## What it does NOT do

- One widget per forum, not a list of them. For several blocks of content, place several different widgets.
- No per-tag or per-page targeting — placement is whatever FoF Forum Widgets gives it.
- No Markdown. If you would rather write Markdown than HTML, use [`linkrobins/markdown-widget`](https://packagist.org/packages/linkrobins/markdown-widget) instead.

## Requirements

- Flarum **2.0** or later
- [`fof/forum-widgets-core`](https://packagist.org/packages/fof/forum-widgets-core) installed and enabled

The HTML sanitiser ([DOMPurify](https://github.com/cure53/DOMPurify)) is bundled into the extension — nothing is fetched from a CDN at runtime.

## Installation

```
composer require linkrobins/html-widget
php flarum cache:clear
```

In Flarum admin → **Extensions**, find **Link Robins HTML Widget** under the **Forum Widgets** category and enable it. Configure title/icon/body, then go to FoF Forum Widgets settings and place it where you want it.

## Embeds

Iframes are removed by default. To keep an embed, list the host it loads from under **Allowed iframe hosts**, one per line:

```
www.youtube.com
*.vimeo.com
```

A bare host matches exactly. A `*.` prefix matches any subdomain, so `*.vimeo.com` covers `player.vimeo.com` but not `vimeo.com` itself — list both if you need both. Only `http` and `https` embeds are ever kept, so a `javascript:` or `data:` frame is dropped whatever the list says, and `srcdoc` is never permitted because it carries its own HTML rather than a `src` to check.

## Security note

The HTML body is passed through [DOMPurify](https://github.com/cure53/DOMPurify) before display, so `<script>` tags, event-handler attributes and `javascript:` URLs are stripped, along with any iframe whose host you have not allowed.

Two things worth being clear about. The body is admin-only, so treat it like any other admin-controlled content. And the sanitising runs in the browser, which makes it a guard against pasting something you did not mean to rather than a security boundary — anyone able to edit this setting can already change the forum in bigger ways.

## License

MIT
