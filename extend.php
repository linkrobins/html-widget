<?php

use Flarum\Extend;
use Flarum\Frontend\Document;
use Flarum\Settings\SettingsRepositoryInterface;
use LinkRobins\HtmlWidget\Api\Controller\ShowWidgetController;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less')
        // A short revision hash of the widget's settings, injected into the boot
        // payload so the frontend can cache-bust the content request. The body
        // itself is NOT serialised here (it stays behind the on-demand endpoint);
        // only this ~12-char hash rides along, so a settings change changes the
        // fetch URL and a normal reload shows the new content without a hard
        // refresh, while unchanged content still caches.
        ->content(function (Document $document) {
            $settings = resolve(SettingsRepositoryInterface::class);
            $document->payload['linkrobins-html-widget.rev'] = substr(sha1(
                $settings->get('linkrobins-html-widget.title', '') . '|' .
                $settings->get('linkrobins-html-widget.icon', '') . '|' .
                $settings->get('linkrobins-html-widget.body', '') . '|' .
                $settings->get('linkrobins-html-widget.backgroundColor', '')
            ), 0, 12);
        }),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/dist/admin.js'),

    new Extend\Locales(__DIR__ . '/locale'),

    // Widget content is fetched on demand from this endpoint when the widget
    // renders, rather than serialised into the forum payload on every request.
    (new Extend\Routes('api'))
        ->get('/linkrobins-html-widget', 'linkrobins-html-widget.show', ShowWidgetController::class),

    (new Extend\Settings())
        ->default('linkrobins-html-widget.title', '')
        ->default('linkrobins-html-widget.icon',  '')
        ->default('linkrobins-html-widget.body',  '')
        ->default('linkrobins-html-widget.backgroundColor', ''),
];
