// Enlace de descarga de un producto de la tienda. Vive en la tabla
// product_files, que solo pueden leer el panel de admin y el servidor (con la
// Service Role Key): así nadie puede sacar el enlace de un kit sin pagarlo
// (antes estaba en la tabla products, que se puede leer públicamente).
export async function enlaceDescargaProducto(supabase, productId) {
  if (!productId) return '';
  try {
    const { data } = await supabase.from('product_files').select('file_url').eq('product_id', productId).maybeSingle();
    return data?.file_url || '';
  } catch (e) {
    return '';
  }
}
