<?php

namespace LinkRobins\HtmlWidget\Api\Controller;

use Flarum\Http\RequestUtil;
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
 *
 * The content is shown to anyone who can view the forum. On a private forum
 * (guests without "View forum"), a visitor who can't view it gets `hidden`
 * and no content, so the widget stays as private as the discussions.
 *
 * Caching follows from that. A guest's copy is the same for every guest, so
 * it is publicly cacheable; a logged-in visitor's copy is cached by their own
 * browser only, so a shared cache can never hand one visitor's answer to
 * another. The short TTL means admin edits still surface within a few
 * minutes.
 */
class ShowWidgetController implements RequestHandlerInterface
{
    public function __construct(
        protected SettingsRepositoryInterface $settings,
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);

        if (! $actor->can('viewForum')) {
            return new JsonResponse(['hidden' => true], 200, [
                'Cache-Control' => 'private, no-store',
            ]);
        }

        return new JsonResponse([
            'title'           => (string) $this->settings->get('linkrobins-html-widget.title', ''),
            'description'     => (string) $this->settings->get('linkrobins-html-widget.description', ''),
            'icon'            => (string) $this->settings->get('linkrobins-html-widget.icon', ''),
            'body'            => (string) $this->settings->get('linkrobins-html-widget.body', ''),
            'backgroundColor' => (string) $this->settings->get('linkrobins-html-widget.backgroundColor', ''),
            'allowedIframeHosts' => (string) $this->settings->get('linkrobins-html-widget.allowedIframeHosts', ''),
        ], 200, [
            'Cache-Control' => ($actor->isGuest() ? 'public' : 'private').', max-age=300, stale-while-revalidate=60',
        ]);
    }
}
