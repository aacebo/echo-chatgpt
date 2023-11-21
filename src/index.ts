import { App, models } from '@aacebo/echo';
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
    event.body.chat.type === 'direct' &&
    event.body.chat.members.find(m => m.id == app.me.id) &&
    event.body.message.body.text
  ) {
    await app.api.chats.typing(event.body.chat.id);

    let messages = await app.api.messages.getByChatId(event.body.chat.id, {
      size: 3
    });

    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are a chat assistant chatting with someone.'
        },
        ...messages.filter(m => !!m.body.text).map(m => ({
          role: m.created_for.id === event.sent_by?.id ? 'user' : 'assistant',
          content: m.body.text!
        }) as OpenAI.ChatCompletionMessage).reverse()
      ]
    });

    let content = '';
    let message: models.Message | undefined = undefined;

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;

      if (delta) {
        content += delta;

        if (!message) {
          message = await app.api.messages.create(event.body.chat.id, {
            text: content
          });
        } else {
          message = await app.api.messages.update(message.id, {
            text: content
          });
        }
      }
    }
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

  if (messages.length > 0) {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are me, a user chatting with someone, and you should reply as if you were me.'
        },
        ...messages.filter(m => !!m.body.text).map(m => ({
          role: m.created_by.id === app.me.id ? 'assistant' : 'user',
          content: m.body.text!
        }) as OpenAI.ChatCompletionMessage).reverse()
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

app.shortcut('translate', async ({ message, user, ack }) => {
  if (message) {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `translate the text "${message.body.text}" to the language of code "${user.locale}"`
        }
      ]
    });

    let content = '';

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;

      if (delta) {
        content += delta;

        await app.api.messages.extend(message.id, {
          body: {
            type: 'container',
            child: {
              type: 'text',
              text: content
            }
          }
        });
      }
    }
  }

  ack();
});

app.start();
