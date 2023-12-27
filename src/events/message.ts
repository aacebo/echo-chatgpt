import { App, Event, models } from '@aacebo/echo';
import { OpenAI } from 'openai';

export function message(app: App, openai: OpenAI) {
  return async ({ event, ack }: { event: Event<'message'>, ack: () => void }) => {
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
  };
}
