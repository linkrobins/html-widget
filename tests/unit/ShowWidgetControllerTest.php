<?php

/*
 * This file is part of linkrobins/html-widget.
 *
 * For detailed copyright and license information, please view the
 * LICENSE file that was distributed with this source code.
 */

namespace LinkRobins\HtmlWidget\Tests\unit;

use Flarum\Http\RequestUtil;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\User;
use Laminas\Diactoros\ServerRequest;
use Psr\Http\Message\ServerRequestInterface;
use LinkRobins\HtmlWidget\Api\Controller\ShowWidgetController;
use Mockery as m;
use Mockery\Adapter\Phpunit\MockeryTestCase;
use PHPUnit\Framework\Attributes\Test;

class ShowWidgetControllerTest extends MockeryTestCase
{
    private function requestAs(bool $canViewForum = true, bool $guest = true): ServerRequestInterface
    {
        $actor = m::mock(User::class);
        $actor->shouldReceive('can')->with('viewForum')->andReturn($canViewForum);
        $actor->shouldReceive('isGuest')->andReturn($guest);

        return RequestUtil::withActor(new ServerRequest(), $actor);
    }

    private function controller(array $values): ShowWidgetController
    {
        $settings = m::mock(SettingsRepositoryInterface::class);
        $settings->shouldReceive('get')->andReturnUsing(
            fn (string $key, $default = null) => $values[$key] ?? $default
        );

        return new ShowWidgetController($settings);
    }

    #[Test]
    public function it_returns_the_configured_content(): void
    {
        $response = $this->controller([
            'linkrobins-html-widget.title' => 'Welcome',
            'linkrobins-html-widget.description' => 'Read first',
            'linkrobins-html-widget.icon' => 'fas fa-star',
            'linkrobins-html-widget.body' => '<p>Hello</p>',
            'linkrobins-html-widget.backgroundColor' => '#ff8800',
            'linkrobins-html-widget.allowedIframeHosts' => "www.youtube.com\n*.vimeo.com",
        ])->handle($this->requestAs());

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals(
            [
                'title' => 'Welcome',
                'description' => 'Read first',
                'icon' => 'fas fa-star',
                'body' => '<p>Hello</p>',
                'backgroundColor' => '#ff8800',
                'allowedIframeHosts' => "www.youtube.com\n*.vimeo.com",
            ],
            json_decode((string) $response->getBody(), true)
        );
    }

    #[Test]
    public function unset_settings_come_back_as_empty_strings(): void
    {
        $response = $this->controller([])->handle($this->requestAs());

        $this->assertEquals(
            ['title' => '', 'description' => '', 'icon' => '', 'body' => '', 'backgroundColor' => '', 'allowedIframeHosts' => ''],
            json_decode((string) $response->getBody(), true)
        );
    }

    #[Test]
    public function the_response_is_publicly_cacheable_with_a_short_ttl(): void
    {
        $response = $this->controller([])->handle($this->requestAs());

        // The endpoint serves the same public content to every visitor; the
        // short TTL keeps admin edits surfacing within minutes.
        $this->assertEquals(
            'public, max-age=300, stale-while-revalidate=60',
            $response->getHeaderLine('Cache-Control')
        );
    }

    #[Test]
    public function a_visitor_who_cannot_view_the_forum_gets_no_content(): void
    {
        $response = $this->controller([
            'linkrobins-html-widget.title' => 'Welcome',
            'linkrobins-html-widget.body' => '<p>Members only</p>',
        ])->handle($this->requestAs(canViewForum: false));

        $this->assertEquals(['hidden' => true], json_decode((string) $response->getBody(), true));
        $this->assertEquals('private, no-store', $response->getHeaderLine('Cache-Control'));
    }

    #[Test]
    public function a_logged_in_visitor_gets_a_privately_cached_copy(): void
    {
        $response = $this->controller([])->handle($this->requestAs(guest: false));

        $this->assertEquals(
            'private, max-age=300, stale-while-revalidate=60',
            $response->getHeaderLine('Cache-Control')
        );
    }
}
