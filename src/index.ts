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

app.event('message', async ({ event, ack }) => {
  // if dm to app user
  if (
    event.body.chat.type == 'direct' &&
    event.body.chat.members.find(m => m.id == app.me.id) &&
    event.body.message.body.text
  ) {
    await app.api.messages.create(event.body.chat.id, {
      text: 'Hello, how can I help you?'
    });
  }

  ack();
});

app.shortcut('reply', async ({ ack }) => {
  ack();
});

app.shortcut('draft', async ({ chat, user, ack }) => {
  let messages = await app.api.messages.getByChatId(chat.id, {
    size: 3
  });

  messages = messages.filter(m => !!m.body.text);

  if (messages.length > 0) {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are me, a user chatting with someone, and you should reply as if you were me.'
        },
        ...messages.map(m => ({
          role: m.created_for.id === user.id ? 'assistant' : 'user',
          content: m.body.text!
        }) as OpenAI.ChatCompletionMessage)
      ]
    });

    let content = '';

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;

      if (delta) {
        content += delta;

        await app.api.views.chats.draft(user.name, chat.id, {
          text: content
        });
      }
    }
  }

  ack();
});

// app.shortcut('translate', async ({ message, user, ack }) => {
//   if (message) {

//   }

//   ack();
// });

app.start();
