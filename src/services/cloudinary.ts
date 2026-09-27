/**
 * Upload de imagens para questões via Cloudinary (plano gratuito).
 *
 * Usa "unsigned upload": o navegador da Admin envia o arquivo direto pro
 * Cloudinary, sem passar por nenhum servidor próprio e sem expor chave
 * secreta nenhuma no frontend — é seguro por design, desde que o Upload
 * Preset esteja configurado como "Unsigned" no painel do Cloudinary
 * (ver instruções de setup). Substitui o Firebase Storage, que passou a
 * exigir o plano pago (Blaze) mesmo dentro da cota gratuita.
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Envia um arquivo (ou blob de imagem colada via Ctrl+V) para o Cloudinary
 * e retorna a URL segura (https) para salvar no campo `imagemUrl` da Questao.
 */
export async function uploadImagemQuestao(arquivo: File | Blob): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary não configurado. Verifique NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME e NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET no .env.local."
    );
  }

  const formData = new FormData();
  formData.append("file", arquivo);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "questoes");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    const erro = await response.json().catch(() => null);
    throw new Error(erro?.error?.message ?? "Falha ao enviar a imagem. Tente novamente.");
  }

  const data = await response.json();
  return data.secure_url as string;
}
