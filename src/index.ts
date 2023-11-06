import { App } from '@aacebo/echo';
import OpenAI from 'openai';

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

app.shortcut('reply', async ({ message, user, ack }) => {
  if (message) {
    const messages = await app.api.messages.getByChatId(message.chat_id, {
      size: 3
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages[user.id] || []
    });


  }

  ack();
});

app.start();
