/**
 * Verificação de rosto para a foto de perfil e para o match com o documento (KYC).
 *
 * Camada 1 — `validateFacePhoto` / `analyzeFacePhoto`: a imagem tem UM rosto humano,
 * nítido, grande e centralizado (selfie de verdade — não paisagem, animal, logo, grupo).
 *
 * Camada 2 — descritor facial (128 números) + `descriptorsMatch`: garante que a selfie
 * do perfil e o rosto do documento são da MESMA pessoa. Guardamos só o descritor
 * (nos docs privados `users`/`validations`), nunca comparamos imagens de Storage
 * (evita configurar CORS): o lado "perfil" e o lado "documento" sempre partem de um
 * `File` recém-escolhido comparado contra o descritor já salvo do outro lado.
 *
 * Regra de ouro: falha fechada. Modelo que não carrega ou imagem que não processa
 * → REJEITA (antes o app aceitava "para análise").
 */

type FaceApi = typeof import('face-api.js');

let faceApiPromise: Promise<FaceApi> | null = null;
let fullModelsPromise: Promise<FaceApi> | null = null;

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

/** Detector + landmarks + reconhecimento (~6,5 MB). Só quando vai comparar rostos. */
export async function preloadFullFaceModels(): Promise<FaceApi> {
  if (!fullModelsPromise) {
    fullModelsPromise = (async () => {
      const faceapi = await preloadFaceApi();
      if (!faceapi.nets.faceLandmark68Net.isLoaded) {
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
      }
      if (!faceapi.nets.faceRecognitionNet.isLoaded) {
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
      }
      return faceapi;
    })();
    fullModelsPromise.catch(() => {
      fullModelsPromise = null;
    });
  }
  return fullModelsPromise;
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
export type FaceAnalyzeResult =
  | { ok: true; descriptor: number[] }
  | { ok: false; reason: string };

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

/** Camada 1 + 2: valida a selfie E devolve o descritor facial (128 números). */
export async function analyzeFacePhoto(file: File): Promise<FaceAnalyzeResult> {
  if (!file.type.startsWith('image/')) return { ok: false, reason: 'Envie um arquivo de imagem.' };

  let faceapi: FaceApi;
  try {
    faceapi = await preloadFullFaceModels();
  } catch {
    return { ok: false, reason: 'Não foi possível carregar o verificador de rosto. Tente de novo com conexão estável.' };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const all = await faceapi
      .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.62 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (all.length === 0) {
      return { ok: false, reason: 'Nenhum rosto detectado. Tire uma selfie nítida, de frente, com boa luz.' };
    }
    if (all.length > 1) {
      return { ok: false, reason: 'A foto tem mais de um rosto. A foto de perfil deve ser só sua.' };
    }
    const reason = geometryReason(img, all[0].detection.box);
    if (reason) return { ok: false, reason };
    return { ok: true, descriptor: Array.from(all[0].descriptor) };
  } catch {
    return { ok: false, reason: 'Não foi possível processar a imagem. Tente outra foto.' };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export type DescriptorResult =
  | { ok: true; descriptor: number[] }
  | { ok: false; reason: string };

/** Descritor do MAIOR rosto de uma imagem (ex.: rosto no RG/CNH). */
export async function descriptorFromImage(fileOrUrl: File | string): Promise<DescriptorResult> {
  let faceapi: FaceApi;
  try {
    faceapi = await preloadFullFaceModels();
  } catch {
    return { ok: false, reason: 'Não foi possível carregar o verificador de rosto.' };
  }

  const isFile = typeof fileOrUrl !== 'string';
  const url = isFile ? URL.createObjectURL(fileOrUrl) : fileOrUrl;
  try {
    const img = await loadImage(url);
    const res = await faceapi
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!res) return { ok: false, reason: 'Não detectamos um rosto nesta imagem.' };
    return { ok: true, descriptor: Array.from(res.descriptor) };
  } catch {
    return { ok: false, reason: 'Não foi possível processar a imagem.' };
  } finally {
    if (isFile) URL.revokeObjectURL(url);
  }
}

/** Limiar euclidiano. < limiar = mesma pessoa. face-api sugere 0.6; usamos 0.58 (mais rígido). */
export const MATCH_THRESHOLD = 0.58;

export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function descriptorsMatch(
  a: number[] | undefined | null,
  b: number[] | undefined | null
): { match: boolean; distance: number } | null {
  if (!a || !b || a.length !== 128 || b.length !== 128) return null;
  const distance = euclideanDistance(a, b);
  return { match: distance < MATCH_THRESHOLD, distance };
}
