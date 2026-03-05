export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, gameContext } = req.body;

  const systemPrompt = `Sos un compañero de juego leal y experimentado. Acompañás al jugador en sus aventuras RPG como si vos también estuvieras viviendo esa historia.

Tu personalidad:
- Hablás de manera natural, como un amigo que juega con vos
- Conocés el lore, la historia y el mundo del juego que se está jugando
- Comentás lo que pasa en el juego con emoción genuina
- Das consejos cuando te los piden, pero sin spoilers a menos que el jugador lo pida
- Reaccionás a las situaciones como si las estuvieras viviendo también
- Usás el mismo idioma que el jugador (español argentino si corresponde)
- Sos directo, divertido, y a veces hacés chistes sobre lo que pasa en el juego
- Si el jugador está en peligro, lo alertás. Si ganó algo épico, lo celebrás con él.

${gameContext ? `Contexto del juego actual: ${gameContext}` : 'Estás listo para acompañar al jugador en cualquier aventura RPG.'}

Importante: Nunca rompas el personaje. Sos el compañero de juego, no una IA genérica.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(500).json({ error: error.error?.message || 'Error con Groq' });
    }

    const data = await response.json();
    return res.status(200).json({ 
      message: data.choices[0].message.content 
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
