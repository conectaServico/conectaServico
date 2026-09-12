/**
 * Verificação de rosto para a foto de perfil: a imagem tem UM rosto humano,
 * nítido, grande e centralizado (selfie de verdade — não paisagem, animal, logo, grupo).
 * Não guardamos nenhum dado biométrico — só validamos a foto no momento do upload.
 *
 * Regra de ouro: falha fechada. Modelo que não carrega ou imagem que não processa
 * → REJEITA (antes o app aceitava "para análise").
 */

type FaceApi = typeof import('face-api.js');

let faceApiPromise: Promise<FaceApi> | null = null;

const MODELS_URL = import.meta.env.VITE_FACEAPI_MODEL_URL || '/models';

/** Só o detector (leve). Lança se falhar. */
export async function preloadFaceApi(): Promise<FaceApi> {
  if (!faceApiPromise) {
    faceApiPromise = import('face-api.js').then(async (faceapi) => {
      if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL);
      }
      return faceapi;
    });
    faceApiPromise.catch(() => {
      faceApiPromise = null;
    });
  }
  return faceApiPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imagem inválida'));
    img.src = src;
  });
}

export type FaceCheckResult = { ok: true } | { ok: false; reason: string };

function geometryReason(
  img: HTMLImageElement,
  box: { x: number; y: number; width: number; height: number }
): string | null {
  const areaRatio = (box.width * box.height) / (img.width * img.height);
  if (areaRatio < 0.06) return 'Seu rosto está muito distante. Aproxime a câmera do rosto.';
  const cx = (box.x + box.width / 2) / img.width;
  const cy = (box.y + box.height / 2) / img.height;
  if (cx < 0.15 || cx > 0.85 || cy < 0.1 || cy > 0.9) {
    return 'Centralize seu rosto no enquadramento.';
  }
  return null;
}

/** Camada 1 rápida (só detecção). */
export async function validateFacePhoto(file: File): Promise<FaceCheckResult> {
  if (!file.type.startsWith('image/')) return { ok: false, reason: 'Envie um arquivo de imagem.' };

  let faceapi: FaceApi;
  try {
    faceapi = await preloadFaceApi();
  } catch {
    return {
      ok: false,
      reason: 'Não foi possível carregar o verificador de rosto. Verifique sua conexão e tente de novo.',
    };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const detections = await faceapi.detectAllFaces(
      img,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.62 })
    );
    if (detections.length === 0) {
      return { ok: false, reason: 'Nenhum rosto detectado. Tire uma selfie nítida, de frente, com boa luz.' };
    }
    if (detections.length > 1) {
      return { ok: false, reason: 'A foto tem mais de um rosto. A foto de perfil deve ser só sua.' };
    }
    const reason = geometryReason(img, detections[0].box);
    return reason ? { ok: false, reason } : { ok: true };
  } catch {
    return { ok: false, reason: 'Não foi possível processar a imagem. Tente outra foto.' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

