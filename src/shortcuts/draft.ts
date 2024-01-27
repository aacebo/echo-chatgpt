import { App, ShortcutHandlerArgs } from '@aacebo/echo';
import { OpenAI } from 'openai';

export function draft(app: App, openai: OpenAI) {
  return async ({ session_id, chat, user, draft, ack }: ShortcutHandlerArgs['chat']) => {
    let messages = await app.api.messages.getByChatId(chat.id, {
      size: 10
    });

    messages = messages.filter(m => !!m.body.text);

    if (messages.length > 3) {
      messages = messages.slice(0, 3);
    }

    if (messages.length > 0) {
      const stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        stream: true,
        messages: [
          {
            role: 'system',
            content: draft
          },
          ...messages.reverse().map(m => ({
            role: m.created_for.id === user.id ? 'user' : 'assistant',
            content: m.body.text!
          }) as OpenAI.ChatCompletionMessage)
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
    }

    ack();
  };
}
