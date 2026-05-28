<?php

use Flarum\Extend;
use LinkRobins\HtmlWidget\Api\Controller\ShowWidgetController;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/dist/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

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
        ->default('linkrobins-html-widget.body',  ''),
];
