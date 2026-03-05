export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const contentType = req.headers['content-type'] || '';
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return res.status(400).json({ error: 'No boundary' });

  const body = buffer.toString('binary');
  const parts = body.split('--' + boundary);
  let audioBuffer = null;
  let filename = 'audio.webm';

  for (const part of parts) {
    if (part.includes('Content-Disposition') && part.includes('filename')) {
      const match = part.match(/filename="([^"]+)"/);
      if (match) filename = match[1];
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const rawData = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));
        audioBuffer = Buffer.from(rawData, 'binary');
      }
    }
  }

  if (!audioBuffer || audioBuffer.length < 1000) {
    return res.status(400).json({ error: 'Audio demasiado corto o vacío' });
  }

  try {
    const formData = new FormData();
    // Mandar siempre como webm — es lo que Brave realmente graba
    // Detectar si es WAV o webm según el filename
    const isWav = filename.endsWith('.wav');
    const audioType = isWav ? 'audio/wav' : 'audio/webm';
    const blob = new Blob([audioBuffer], { type: audioType });
    formData.append('file', blob, isWav ? 'audio.wav' : 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'es');
    formData.append('response_format', 'verbose_json');
    formData.append('prompt', 'Conversación en español sobre videojuegos.');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Error Whisper' });
    
    // verbose_json devuelve más info — filtrar transcripciones de baja confianza
    const text = data.text?.trim();
    if (!text) return res.status(200).json({ transcript: '' });
    
    // Ignorar alucinaciones comunes de Whisper
    const hallucinations = [
      'gracias', 'subtítulos', 'suscríbete', 'hasta la próxima',
      'gracias por ver', 'gracias por ver el video', 'no olvides suscribirte',
      'like y suscríbete', 'nos vemos en el próximo', 'hasta el próximo video',
      'amara.org', 'subtitulado por', 'transcripción por', 'traducido por',
      'www.', '.com', 'youtube', 'twitch', 'instagram'
    ];
    const lower = text.toLowerCase();
    if (hallucinations.some(h => lower === h || lower === h + '.' || lower.includes(h))) {
      return res.status(200).json({ transcript: '' });
    }

    return res.status(200).json({ transcript: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
