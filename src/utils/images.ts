import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';

/**
 * Redimensiona/compacta uma imagem no cliente antes do upload.
 * Fotos de celular chegam a 3–8 MB; aqui caem para ~100–400 KB, dentro do limite
 * de 8 MB das regras de Storage e muito mais rápidas de subir/baixar.
 */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; quality?: number } = {}
): Promise<Blob> {
  const { maxDim = 1280, quality = 0.8 } = opts;
  if (!file.type.startsWith('image/')) return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = dataUrl;
  });

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  return blob && blob.size < file.size ? blob : file;
}

/**
 * Compacta e sobe uma lista de imagens, devolvendo as URLs de download na ordem.
 * `pathPrefix` ex.: `requestPhotos/<uid>/<requestId>` ou `chatImages/<uid>`.
 */
export async function uploadImages(files: File[], pathPrefix: string): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const blob = await compressImage(files[i]);
    const name = `${Date.now()}_${i}.jpg`;
    const storageRef = ref(storage, `${pathPrefix}/${name}`);
    const snap = await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    urls.push(await getDownloadURL(snap.ref));
  }
  return urls;
}

/** Sobe uma única imagem e devolve a URL. */
export async function uploadImage(file: File, pathPrefix: string): Promise<string> {
  const [url] = await uploadImages([file], pathPrefix);
  return url;
}
