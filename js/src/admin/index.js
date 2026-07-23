import app from 'flarum/admin/app';
import ColorPreviewInput from 'flarum/common/components/ColorPreviewInput';
import registerWidget from '../common/registerWidget';

app.initializers.add('linkrobins-html-widget', () => {
  // Register the widget so it appears (and previews) in the Forum Widgets editor.
  registerWidget(app);

  app.registry
    .for('linkrobins-html-widget')

    .registerSetting({
      setting: 'linkrobins-html-widget.title',
      type: 'text',
      label: app.translator.trans('linkrobins-html-widget.admin.settings.title_label'),
      help: app.translator.trans('linkrobins-html-widget.admin.settings.title_help'),
      placeholder: app.translator.trans('linkrobins-html-widget.admin.settings.title_placeholder'),
    })

    .registerSetting({
      setting: 'linkrobins-html-widget.icon',
      type: 'text',
      label: app.translator.trans('linkrobins-html-widget.admin.settings.icon_label'),
      help: app.translator.trans('linkrobins-html-widget.admin.settings.icon_help'),
      placeholder: 'fas fa-info-circle',
    })

    .registerSetting(
      function () {
        const value = this.setting('linkrobins-html-widget.backgroundColor', '');

        return m(
          'div',
          { className: 'Form-group' },
          m('label', app.translator.trans('linkrobins-html-widget.admin.settings.background_label')),
          m(ColorPreviewInput, {
            value: value(),
            oninput: (e) => value(e.target.value),
            onchange: (e) => value(e.target.value),
            placeholder: '#ffffff',
          }),
          m('p', { className: 'helpText' }, app.translator.trans('linkrobins-html-widget.admin.settings.background_help'))
        );
      },
      5,
      'linkrobins-html-widget.backgroundColor'
    )

    .registerSetting(
      function () {
        const value = this.setting('linkrobins-html-widget.body', '');

        return m(
          'div',
          { className: 'Form-group' },
          m('label', app.translator.trans('linkrobins-html-widget.admin.settings.body_label')),
          m('textarea', {
            className: 'FormControl',
            rows: 14,
            value: value(),
            oninput: (e) => value(e.target.value),
            placeholder: '<p>Hello, world!</p>',
            style: 'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.85rem;',
          }),
          m('p', { className: 'helpText' }, app.translator.trans('linkrobins-html-widget.admin.settings.body_help'))
        );
      },
      0,
      'linkrobins-html-widget.body'
    );
});
