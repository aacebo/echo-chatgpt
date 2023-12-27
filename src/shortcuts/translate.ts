import { App, models } from '@aacebo/echo';
import { OpenAI } from 'openai';

export function translate(app: App, openai: OpenAI) {
  return async ({ message, user, ack }: { message: models.Message | null, user: models.User, ack: () => void }) => {
    if (!message?.body.text) {
      return ack();
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      stream: true,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `translate the text "${message.body.text}" to the language of IETF code "${user.locale}"`
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
              type: 'markdown',
              text: `> ${content}`
            }
          }
        });
      }
    }

    ack();
  };
}
