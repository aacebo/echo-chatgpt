import { App, ShortcutHandlerArgs } from '@aacebo/echo';
import { OpenAI } from 'openai';

export function draft(app: App, openai: OpenAI) {
  return async ({ chat, user, ack }: ShortcutHandlerArgs) => {
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
  };
}
