export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text: rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: 'No text provided' });
  // Recortar a 300 caracteres para ahorrar créditos — las respuestas deben ser cortas
  const text = rawText.length > 300 ? rawText.slice(0, 297) + '...' : rawText;

  // Voice ID de Beto (argentino) — se puede cambiar
  const VOICE_ID = 'Vpv1YgvVd6CHIzOTiTt8'; // Voz peninsular medieval

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: err.detail?.message || 'Error ElevenLabs' });
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    return res.send(Buffer.from(audioBuffer));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
