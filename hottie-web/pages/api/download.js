import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '@/lib/r2';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { file } = req.query;

  if (!file) {
    return res.status(400).json({ error: 'Archivo no especificado' });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: file,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 7200 });

    return res.redirect(307, signedUrl);
  } catch (error) {
    console.error('Error al generar la URL firmada:', error);
    return res.status(500).json({ error: 'Error al procesar la descarga' });
  }
}
