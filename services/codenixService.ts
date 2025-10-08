import { ACTIVEPIECES_WEBHOOK_URL } from '../constants';
import { CodenixServiceResponse } from '../types';

export const sendMessageToModel = async (prompt: string): Promise<CodenixServiceResponse> => {
  // A simplified, direct prompt to encourage the model to return raw code.
  const systemPrompt = `You are Nix 1.5, an expert AI web developer. Your single purpose is to generate code based on the user's request.
User's request: "${prompt}"
Respond ONLY with the raw code for the user's request. Do NOT add any conversational text, explanations, or markdown formatting.`;

  try {
    const response = await fetch(ACTIVEPIECES_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question: systemPrompt }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status: ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData && typeof rawData.answer === 'string') {
        return { success: true, message: rawData.answer.trim() };
    } else {
        return { success: true, message: "Received an empty or unexpected response from the model." };
    }

  } catch (error) {
    console.error('Error calling Codenix service:', error);
    return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred.',
    }
  }
};