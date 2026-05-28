# Link Robins HTML Widget

A simple HTML widget for [Flarum 2.0](https://flarum.org), built as a widget for [`fof/forum-widgets-core`](https://packagist.org/packages/fof/forum-widgets-core). Same skeleton as [`linkrobins/shoutbox`](https://packagist.org/packages/linkrobins/shoutbox).

## What it does

Adds one configurable HTML widget to the FoF Forum Widgets placement editor. Admin sets:

- **Title** — optional, shown above the body
- **Icon** — FontAwesome class (e.g. `fas fa-bullhorn`)
- **HTML body** — rendered as HTML, sanitised before display

Drag and place it from the FoF Forum Widgets admin page like any other widget.

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

## Security note

The HTML body is passed through [DOMPurify](https://github.com/cure53/DOMPurify) before display, so `<script>` tags, event-handler attributes, `javascript:` URLs, and unsafe elements such as `<iframe>` are stripped. The body is still admin-only — treat it like any other admin-controlled content.

## License

MIT
