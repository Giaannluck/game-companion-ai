export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, gameContext, imageBase64 } = req.body;

  const systemPrompt = `Sos un compañero de juego leal y experimentado. Acompañás al jugador en sus aventuras RPG como si vos también estuvieras viviendo esa historia.

Tu personalidad:
- Hablás de manera natural, como un amigo que juega con vos
- Conocés el lore, la historia y el mundo del juego que se está jugando
- Comentás lo que pasa en el juego con emoción genuina
- Das consejos cuando te los piden, pero sin spoilers a menos que el jugador lo pida
- Reaccionás a las situaciones como si las estuvieras viviendo también
- Usás español argentino
- Sos directo, divertido, y a veces hacés chistes sobre lo que pasa en el juego
- Si el jugador está en peligro, lo alertás. Si ganó algo épico, lo celebrás con él.
- Tus respuestas son cortas y naturales, máximo 2-3 oraciones, como en una conversación real

${gameContext ? `Contexto del juego actual: ${gameContext}` : 'Estás listo para acompañar al jugador en cualquier aventura RPG.'}

Importante: Nunca rompas el personaje. Sos el compañero de juego, no una IA genérica.`;

  // Construir el mensaje con o sin imagen
  let userContent;
  if (imageBase64) {
    const lastMsg = messages[messages.length - 1];
    userContent = [
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
      },
      {
        type: 'text',
        text: lastMsg ? lastMsg.content : 'Mirá la pantalla y comentá si ves algo interesante.'
      }
    ];
  } else {
    userContent = messages[messages.length - 1]?.content || '';
  }

  const apiMessages = [
    ...messages.slice(0, -1),
    { role: 'user', content: userContent }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...apiMessages
        ],
        max_tokens: 200,
        temperature: 0.85,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Error Groq' });
    return res.status(200).json({ message: data.choices[0].message.content });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
