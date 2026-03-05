export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const contentType = req.headers['content-type'] || '';
  const boundary = contentType.split('boundary=')[1];
  if (!boundary) return res.status(400).json({ error: 'No boundary' });

  // Extraer el archivo del multipart
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

  if (!audioBuffer) return res.status(400).json({ error: 'No audio data' });

  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'es');
    formData.append('response_format', 'json');

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Error Whisper' });
    return res.status(200).json({ transcript: data.text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
