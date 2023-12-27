import { App, models } from '@aacebo/echo';
import { OpenAI } from 'openai';

export function reply(app: App, openai: OpenAI) {
  return async ({ message, ack }: { message: models.Message | null, ack: () => void }) => {
    if (!message) {
      return ack();
    }

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
    let newMessage: models.Message | undefined = undefined;

    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content;

      if (delta) {
        content += delta;

        if (!newMessage) {
          newMessage = await app.api.messages.reply(message.id, {
            text: content
          });
        } else {
          newMessage = await app.api.messages.update(newMessage.id, {
            text: content
          });
        }
      }
    }

    ack();
  };
}
