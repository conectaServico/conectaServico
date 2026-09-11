import { useEffect, useRef } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Chamado quando o campo chega a 6 dígitos (digitação, colagem ou autofill). */
  onComplete?: (code: string) => void;
  /** true depois que o SMS foi enviado — habilita o autofill via WebOTP API. */
  active?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Campo de código SMS de 6 dígitos. `autocomplete="one-time-code"` (sugestão do
 * teclado no iOS) + WebOTP API (`navigator.credentials.get`) para preencher sozinho
 * no Android/Chrome. Chama `onComplete` uma vez quando o código fica completo.
 */
const OtpInput = ({ value, onChange, onComplete, active = true, disabled, className }: OtpInputProps) => {
  const completedFor = useRef('');

  const setCode = (raw: string) => onChange(raw.replace(/\D/g, '').slice(0, 6));

  // Dispara `onComplete` uma vez por código completo.
  useEffect(() => {
    if (value.length === 6 && completedFor.current !== value) {
      completedFor.current = value;
      onComplete?.(value);
    }
    if (value.length < 6) completedFor.current = '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Autofill via WebOTP (Android/Chrome, só em https).
  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined' || !('OTPCredential' in window)) return;
    const ac = new AbortController();
    navigator.credentials
      .get({
        otp: { transport: ['sms'] },
        signal: ac.signal,
      } as CredentialRequestOptions & { otp: { transport: string[] } })
      .then((cred) => {
        const otp = (cred as (Credential & { code?: string }) | null)?.code;
        if (otp) setCode(otp);
      })
      .catch(() => undefined);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      name="otp"
      id="otp"
      pattern="[0-9]*"
      maxLength={6}
      autoFocus
      disabled={disabled}
      className={
        className ||
        'w-full p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-primary focus:border-transparent tracking-[0.5em] text-center font-bold text-lg'
      }
      placeholder="000000"
      value={value}
      onChange={(e) => setCode(e.target.value)}
    />
  );
};

export default OtpInput;
