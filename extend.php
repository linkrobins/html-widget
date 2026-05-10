<?php

use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__ . '/js/forum.js')
        ->css(__DIR__ . '/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__ . '/js/admin.js'),

    new Extend\Locales(__DIR__ . '/locale'),

    (new Extend\Settings())
        ->default('linkrobins-html-widget.title', '')
        ->default('linkrobins-html-widget.icon',  '')
        ->default('linkrobins-html-widget.body',  '')
        ->serializeToForum('linkrobinsHtmlWidgetTitle', 'linkrobins-html-widget.title')
        ->serializeToForum('linkrobinsHtmlWidgetIcon',  'linkrobins-html-widget.icon')
        ->serializeToForum('linkrobinsHtmlWidgetBody',  'linkrobins-html-widget.body'),
];
