import { App, ShortcutHandlerArgs } from '@aacebo/echo';
import { OpenAI } from 'openai';

export function reply(app: App, openai: OpenAI) {
  return async ({ session_id, chat, message, ack }: ShortcutHandlerArgs['message']) => {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'You are me, a user chatting with someone, and you should reply as if you were me.'
        },
        {
          role: message.created_by.id === app.me.id ? 'assistant' : 'user',
          content: message.body.text || null
        }
      ]
    });

    let content = '';

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;

      if (delta) {
        content += delta;

        await app.api.views.chats.draft(session_id, chat.id, {
          text: content
        });
      }
    }

    ack();
  };
}
