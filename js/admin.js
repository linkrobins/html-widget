'use strict';

(function () {

    app.initializers.add('linkrobins/html-widget', function () {

        if (app.widgets) {
            app.widgets.add({
                key:        'linkrobins-html-widget',
                component:  { view: function () { return null; } },
                placement:  'start_top',
                isUnique:   true,
                isDisabled: false,
            }, 'linkrobins-html-widget');
        }

        app.registry
            .for('linkrobins-html-widget')

            .registerSetting({
                setting:     'linkrobins-html-widget.title',
                type:        'text',
                label:       app.translator.trans('linkrobins-html-widget.admin.settings.title_label'),
                help:        app.translator.trans('linkrobins-html-widget.admin.settings.title_help'),
                placeholder: 'Welcome to our community!',
            })

            .registerSetting({
                setting:     'linkrobins-html-widget.icon',
                type:        'text',
                label:       app.translator.trans('linkrobins-html-widget.admin.settings.icon_label'),
                help:        app.translator.trans('linkrobins-html-widget.admin.settings.icon_help'),
                placeholder: 'fas fa-info-circle',
            })

            .registerSetting(function () {
                var page  = this;
                var value = page.setting('linkrobins-html-widget.body', '');

                return m('div', { className: 'Form-group' },
                    m('label', app.translator.trans('linkrobins-html-widget.admin.settings.body_label')),
                    m('textarea', {
                        className: 'FormControl',
                        rows:      14,
                        value:     value(),
                        oninput:   function (e) { value(e.target.value); },
                        placeholder: '<p>Hello, world!</p>',
                        style:     'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85rem;',
                    }),
                    m('p', { className: 'helpText' },
                        app.translator.trans('linkrobins-html-widget.admin.settings.body_help'))
                );
            }, 0, 'linkrobins-html-widget.body');

    });

})();

module.exports = {};
