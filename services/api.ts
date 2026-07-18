import { Message, ChatCompletionChunk } from '../types';

const API_BASE = 'https://gen.pollinations.ai';

interface CatalogModel {
  id?: unknown;
  supported_endpoints?: unknown;
  output_modalities?: unknown;
}

const getAuthHeaders = (apiKey: string): Record<string, string> => {
  if (!apiKey.startsWith('pk_')) {
    throw new Error('Add a browser-safe Pollinations pk_ key in Configuration.');
  }

  return { Authorization: `Bearer ${apiKey}` };
};

const requestError = async (response: Response): Promise<Error> => {
  if (response.status === 401) return new Error('Your Pollinations key is invalid or expired.');
  if (response.status === 402) return new Error('Your Pollinations key has no Pollen remaining or reached its budget.');
  if (response.status === 429) return new Error('Pollinations is rate limiting requests. Please retry shortly.');

  try {
    const body = await response.json();
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    return new Error(message || `Pollinations request failed (${response.status}).`);
  } catch {
    return new Error(`Pollinations request failed (${response.status}).`);
  }
};

export const fetchModels = async (apiKey = ''): Promise<{ textModels: string[] }> => {
  try {
    const response = await fetch(`${API_BASE}/v1/models`, {
      headers: apiKey ? getAuthHeaders(apiKey) : undefined,
    });
    if (!response.ok) throw await requestError(response);

    const payload = await response.json();
    const models: CatalogModel[] = Array.isArray(payload.data) ? payload.data : [];
    const textModels = models
      .filter(model => Array.isArray(model.supported_endpoints) && model.supported_endpoints.includes('/v1/chat/completions'))
      .filter(model => Array.isArray(model.output_modalities) && model.output_modalities.includes('text'))
      .map(model => model.id)
      .filter((id): id is string => typeof id === 'string');

    return { textModels: textModels.length ? textModels : ['openai'] };
  } catch (error) {
    console.error('Failed to fetch models', error);
    return { textModels: ['openai'] };
  }
};

export const generateChatTitle = async (userMessage: string, model: string, apiKey: string): Promise<string> => {
  if (!userMessage.trim()) return '';

  try {
    const response = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(apiKey),
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Generate a concise, 3-5 word title for this chat session. Do not use quotes. Return only the title.',
          },
          { role: 'user', content: userMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) return '';

    const data = await response.json();
    const title = data.choices?.[0]?.message?.content?.trim();
    return title ? title.replace(/^["']|["']$/g, '') : '';
  } catch (error) {
    console.error('Failed to generate title', error);
    return '';
  }
};

export const sendChatCompletion = async (
  messages: Message[],
  model: string,
  apiKey: string,
  onChunk: (content: string) => void,
  shouldStream = true,
): Promise<void> => {
  const apiMessages = messages.map(message => {
    if (message.images?.length) {
      return {
        role: message.role,
        content: [
          { type: 'text', text: message.content },
          ...message.images.map(image => ({ type: 'image_url', image_url: { url: image } })),
        ],
      };
    }

    return { role: message.role, content: message.content };
  });

  const response = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(apiKey),
    },
    body: JSON.stringify({ model, messages: apiMessages, stream: shouldStream }),
  });

  if (!response.ok) throw await requestError(response);

  if (!shouldStream) {
    const data = await response.json();
    onChunk(data.choices?.[0]?.message?.content || '');
    return;
  }

  if (!response.body) throw new Error('Pollinations returned no response body.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]' || !trimmedLine.startsWith('data: ')) continue;

        try {
          const data: ChatCompletionChunk = JSON.parse(trimmedLine.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch (error) {
          console.warn('Error parsing stream chunk', error);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};
