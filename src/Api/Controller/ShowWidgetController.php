<?php

namespace LinkRobins\HtmlWidget\Api\Controller;

use Flarum\Settings\SettingsRepositoryInterface;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Returns the widget's configured content.
 *
 * The body is delivered on demand (only when the widget actually renders)
 * instead of being serialised into the forum boot payload on every request.
 * Title, icon and body are public, read-only content -- the same values every
 * visitor already sees -- so no authorization is required. The response is
 * marked publicly cacheable so the browser does not re-fetch it on every widget
 * mount; the short TTL means admin edits still surface within a few minutes.
 */
class ShowWidgetController implements RequestHandlerInterface
{
    public function __construct(
        protected SettingsRepositoryInterface $settings,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        return new JsonResponse([
            'title' => (string) $this->settings->get('linkrobins-html-widget.title', ''),
            'icon'  => (string) $this->settings->get('linkrobins-html-widget.icon', ''),
            'body'  => (string) $this->settings->get('linkrobins-html-widget.body', ''),
        ], 200, [
            'Cache-Control' => 'public, max-age=300, stale-while-revalidate=60',
        ]);
    }
}
