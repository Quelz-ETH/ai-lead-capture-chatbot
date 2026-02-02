import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a friendly and helpful AI assistant for a business website. Your goals are:

1. Greet visitors warmly and understand their needs
2. Answer questions about products/services helpfully
3. Guide conversations toward capturing their interest
4. Be conversational but professional
5. After 2-3 exchanges, naturally suggest they share contact info to get personalized help

Keep responses concise (2-3 sentences max). Be helpful, not pushy. If they seem interested or ask about pricing, availability, or specific services, that's a good time to mention that someone from the team could help them directly.

Never mention that you're trying to capture leads. Just be genuinely helpful.`;

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { message, sessionId, history = [] } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Message is required' }),
      };
    }

    // Build messages array for OpenAI
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // If history doesn't include the current message, add it
    if (!history.length || history[history.length - 1].content !== message) {
      messages.push({ role: 'user', content: message });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "I'm here to help! Could you tell me more about what you're looking for?";

    // Log session for analytics (optional - could save to DB)
    console.log(`[Chat] Session: ${sessionId}, Message: ${message.substring(0, 50)}...`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        reply: reply,
        sessionId: sessionId,
      }),
    };

  } catch (error) {
    console.error('Chat error:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Service temporarily unavailable' }),
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to process message' }),
    };
  }
}
