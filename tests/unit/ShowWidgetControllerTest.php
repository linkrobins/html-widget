<?php

/*
 * This file is part of linkrobins/html-widget.
 *
 * For detailed copyright and license information, please view the
 * LICENSE file that was distributed with this source code.
 */

namespace LinkRobins\HtmlWidget\Tests\unit;

use Flarum\Settings\SettingsRepositoryInterface;
use Laminas\Diactoros\ServerRequest;
use LinkRobins\HtmlWidget\Api\Controller\ShowWidgetController;
use Mockery as m;
use Mockery\Adapter\Phpunit\MockeryTestCase;
use PHPUnit\Framework\Attributes\Test;

class ShowWidgetControllerTest extends MockeryTestCase
{
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
            'linkrobins-html-widget.icon' => 'fas fa-star',
            'linkrobins-html-widget.body' => '<p>Hello</p>',
            'linkrobins-html-widget.backgroundColor' => '#ff8800',
        ])->handle(new ServerRequest());

        $this->assertEquals(200, $response->getStatusCode());
        $this->assertEquals(
            ['title' => 'Welcome', 'icon' => 'fas fa-star', 'body' => '<p>Hello</p>', 'backgroundColor' => '#ff8800'],
            json_decode((string) $response->getBody(), true)
        );
    }

    #[Test]
    public function unset_settings_come_back_as_empty_strings(): void
    {
        $response = $this->controller([])->handle(new ServerRequest());

        $this->assertEquals(
            ['title' => '', 'icon' => '', 'body' => '', 'backgroundColor' => ''],
            json_decode((string) $response->getBody(), true)
        );
    }

    #[Test]
    public function the_response_is_publicly_cacheable_with_a_short_ttl(): void
    {
        $response = $this->controller([])->handle(new ServerRequest());

        // The endpoint serves the same public content to every visitor; the
        // short TTL keeps admin edits surfacing within minutes.
        $this->assertEquals(
            'public, max-age=300, stale-while-revalidate=60',
            $response->getHeaderLine('Cache-Control')
        );
    }
}
