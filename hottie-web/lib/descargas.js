import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from './r2';

// Enlace de descarga de un producto de la tienda. Vive en la tabla
// product_files, que solo pueden leer el panel de admin y el servidor (con la
// Service Role Key): así nadie puede sacar el enlace de un kit sin pagarlo
// (antes estaba en la tabla products, que se puede leer públicamente).
//
// Si en vez de un enlace (https://...) se guarda el nombre de un archivo de
// R2, se manda un enlace firmado que vale 7 días (lo máximo que permite R2).
export async function enlaceDescargaProducto(supabase, productId) {
  if (!productId) return '';
  try {
    const { data } = await supabase.from('product_files').select('file_url').eq('product_id', productId).maybeSingle();
    const valor = String(data?.file_url || '').trim();
    if (!valor) return '';
    if (/^https?:\/\//i.test(valor)) return valor;
    return (await enlaceFirmadoR2(valor, 7 * 24 * 3600)) || '';
  } catch (e) {
    return '';
  }
}

// Enlace temporal a un archivo privado de R2 (segundos de validez).
export async function enlaceFirmadoR2(clave, segundos) {
  if (!process.env.R2_BUCKET_NAME || !clave) return null;
  try {
    const comando = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: clave });
    return await getSignedUrl(r2Client, comando, { expiresIn: segundos });
  } catch (e) {
    console.error('No se pudo firmar el enlace de R2:', clave, e.message);
    return null;
  }
}
