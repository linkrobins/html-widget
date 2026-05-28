import app from 'flarum/forum/app';
import registerWidget from '../common/registerWidget';

app.initializers.add('linkrobins-html-widget', () => {
  registerWidget(app);
});
