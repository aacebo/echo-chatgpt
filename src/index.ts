import { App } from '@aacebo/echo';
import OpenAI from 'openai';

import * as events from './events';
import * as shortcuts from './shortcuts';

if (!process.env.CLIENT_ID) {
  throw new Error('`CLIENT_ID` is required');
}

if (!process.env.CLIENT_SECRET) {
  throw new Error('`CLIENT_SECRET` is required');
}

if (!process.env.OPENAI_API_KEY) {
  throw new Error('`OPENAI_API_KEY` is required')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET
});

app.event('message', events.message(app, openai));
app.shortcut('reply', shortcuts.reply(app, openai));
app.shortcut('draft', shortcuts.draft(app, openai));
app.shortcut('translate', shortcuts.translate(app, openai));
app.start();
