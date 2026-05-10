'use strict';

(function () {

    app.initializers.add('linkrobins/html-widget', function () {
        if (!app.widgets) return;

        var Component = flarum.reg.get('core', 'common/Component');
        if (!Component) return;

        class HtmlWidget extends Component {

            view() {
                var title = app.forum.attribute('linkrobinsHtmlWidgetTitle') || '';
                var icon  = app.forum.attribute('linkrobinsHtmlWidgetIcon')  || '';
                var body  = app.forum.attribute('linkrobinsHtmlWidgetBody')  || '';

                var titleNode = null;
                if (title || icon) {
                    var titleChildren = [];
                    if (icon) {
                        titleChildren.push(
                            m('span', { className: 'FofWidgets-Widget-title-icon' },
                                m('i', { className: icon }))
                        );
                    }
                    if (title) {
                        titleChildren.push(
                            m('span', { className: 'FofWidgets-Widget-title-label' }, title)
                        );
                    }
                    titleNode = m('div', { className: 'FofWidgets-Widget-title' }, titleChildren);
                }

                var contentNode = m('div', { className: 'FofWidgets-Widget-content' },
                    m.trust(body)
                );

                return m('div', { className: 'FofWidgets-Widget LinkRobinsHtmlWidget' },
                    titleNode,
                    contentNode
                );
            }
        }

        app.widgets.add({
            key:        'linkrobins-html-widget',
            component:  HtmlWidget,
            placement:  'start_top',
            isUnique:   true,
            isDisabled: false,
        }, 'linkrobins-html-widget');
    });

})();

module.exports = {};
