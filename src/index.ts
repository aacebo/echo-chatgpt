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

app.shortcut('reply', async ({ ack }) => {
  ack();
});

app.shortcut('draft', async ({ chat, user, draft, ack }) => {
  let messages = await app.api.messages.getByChatId(chat.id, {
    size: 3
  });

  messages = messages.filter(m => !!m.body.text);

  console.log(draft);

  if (messages.length > 0) {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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

    if (completion.choices.length > 0 && completion.choices[0].message.content) {
      await app.api.messages.createFor(user.name, chat.id, {
        text: completion.choices[0].message.content
      });
    }
  }

  ack();
});

app.start();
