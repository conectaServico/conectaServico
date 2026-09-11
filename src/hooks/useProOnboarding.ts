import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';

export type OnboardingStepKey = 'photo' | 'services' | 'region' | 'document';

export type OnboardingStep = {
  key: OnboardingStepKey;
  label: string;
  hint: string;
  done: boolean;
  pending?: boolean; // enviado, aguardando análise (só para "document")
  to: string;
};

/**
 * Checklist de onboarding do profissional. O feed de pedidos (ProHome) só libera
 * quando os 4 passos estão OK: foto de perfil, serviços, região (coordenadas) e
 * documento enviado (KYC — o selo "verificado" ainda depende do admin).
 */
export function useProOnboarding() {
  const user = useUserStore((s) => s.user);
  const [validationStatus, setValidationStatus] = useState<
    'none' | 'pending' | 'approved' | 'rejected'
  >('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user?.id || user.role !== 'professional') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        if (user.verified) {
          if (active) setValidationStatus('approved');
        } else {
          const snap = await getDoc(doc(db, 'validations', user.id));
          const s = (snap.exists() ? snap.data()?.status : 'none') as typeof validationStatus;
          if (active) setValidationStatus(s || 'none');
        }
      } catch {
        if (active) setValidationStatus('none');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, user?.role, user?.verified]);

  const hasPhoto = !!user?.photo_url;
  const hasServices = (user?.services?.length ?? 0) > 0;
  const hasRegion =
    typeof user?.lat === 'number' || !!user?.uf || !!user?.cep || !!user?.city;
  const docDone = validationStatus === 'approved' || validationStatus === 'pending';

  const steps: OnboardingStep[] = [
    {
      key: 'photo',
      label: 'Foto de perfil',
      hint: 'Uma selfie nítida do seu rosto. Sem foto você não desbloqueia contatos.',
      done: hasPhoto,
      to: '/profile',
    },
    {
      key: 'services',
      label: 'Serviços que você presta',
      hint: 'Selecione suas especialidades para receber os pedidos certos.',
      done: hasServices,
      to: '/profile',
    },
    {
      key: 'region',
      label: 'Sua região e raio de atuação',
      hint: 'Informe seu CEP para ver só os pedidos perto de você.',
      done: hasRegion,
      to: '/profile',
    },
    {
      key: 'document',
      label: 'Documento de identidade',
      hint:
        validationStatus === 'rejected'
          ? 'Seus documentos foram recusados. Envie novamente.'
          : validationStatus === 'pending'
            ? 'Recebido — em análise pela nossa equipe.'
            : 'Envie RG ou CNH para liberar seu acesso e ganhar o selo verificado.',
      done: docDone,
      pending: validationStatus === 'pending',
      to: '/documents',
    },
  ];

  const complete = steps.every((s) => s.done);
  const doneCount = steps.filter((s) => s.done).length;
  // Passos que dá pra saber sem esperar o Firestore (evita flash do feed).
  const clearlyIncomplete = !hasPhoto || !hasServices || !hasRegion;

  return {
    steps,
    complete,
    loading,
    clearlyIncomplete,
    doneCount,
    total: steps.length,
    validationStatus,
  };
}
