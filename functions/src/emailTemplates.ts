/**
 * E-mails transacionais da Conecta Serviço (HTML com estilos inline e tabelas —
 * o único jeito que funciona bem em Gmail/Outlook/apps de celular). Imagens vêm
 * do próprio site (logo) e de uma foto pública; nenhum anexo.
 */
export const SITE_URL = 'https://conectaservicooficial.com.br';
export const SUPPORT_EMAIL = 'suporte@conectaservicooficial.com.br';

const BRAND = '#2563EB';
const LOGO_URL = `${SITE_URL}/logo.jpg`;
const HERO_URL =
  'https://images.unsplash.com/photo-1758876201450-cf77ab8b95bc?auto=format&fit=crop&crop=faces,focalpoint&fp-x=0.62&fp-y=0.3&w=1200&h=360&q=75';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Shell {
  preheader: string;
  title: string;
  intro: string;
  buttonLabel: string;
  link: string;
  note: string;
  hint: string;
}

function shell(p: Shell): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <tr><td style="padding:22px 28px 16px;background:#ffffff;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td><img src="${LOGO_URL}" width="44" height="44" alt="Conecta Serviço" style="display:block;border-radius:10px;border:0;"></td>
          <td style="padding-left:12px;font-size:20px;font-weight:800;color:#0f172a;">Conecta Serviço</td>
        </tr></table>
      </td></tr>
      <tr><td><img src="${HERO_URL}" width="600" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
      <tr><td style="padding:32px 28px 8px;">
        <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:#0f172a;">${esc(p.title)}</h1>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#475569;">${p.intro}</p>
      </td></tr>
      <tr><td align="center" style="padding:24px 28px;">
        <a href="${esc(p.link)}" style="display:inline-block;background:${BRAND};color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;padding:16px 34px;border-radius:14px;">${esc(p.buttonLabel)}</a>
      </td></tr>
      <tr><td style="padding:0 28px 8px;">
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#64748b;">${p.note}</p>
        <p style="margin:0 0 6px;font-size:13px;color:#94a3b8;">Se o botão não abrir, copie e cole este endereço no navegador:</p>
        <p style="margin:0 0 20px;font-size:12px;line-height:1.5;color:${BRAND};word-break:break-all;"><a href="${esc(p.link)}" style="color:${BRAND};">${esc(p.link)}</a></p>
        <div style="background:#f8fafc;border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.55;color:#64748b;">${p.hint}</div>
      </td></tr>
      <tr><td style="padding:24px 28px 30px;text-align:center;font-size:12px;line-height:1.6;color:#94a3b8;">
        Conecta Serviço · <a href="${SITE_URL}" style="color:#94a3b8;">conectaservicooficial.com.br</a><br>
        Precisa de ajuda? Responda este e-mail ou escreva para <a href="mailto:${SUPPORT_EMAIL}" style="color:#94a3b8;">${SUPPORT_EMAIL}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function passwordResetEmail(opts: { link: string; email: string }) {
  const subject = 'Crie uma nova senha na Conecta Serviço';
  const html = shell({
    preheader: 'Clique no botão para escolher uma nova senha. O link vale por 1 hora.',
    title: 'Vamos criar uma nova senha',
    intro: `Recebemos um pedido para redefinir a senha da conta <strong style="color:#0f172a;">${esc(opts.email)}</strong>. É rapidinho: clique no botão abaixo e escolha uma senha nova.`,
    buttonLabel: 'Criar nova senha',
    link: opts.link,
    note: 'Por segurança, este link vale por <strong>1 hora</strong> e só pode ser usado uma vez.',
    hint: '<strong style="color:#334155;">Não foi você?</strong> Pode ignorar este e-mail com tranquilidade — sua senha continua a mesma e ninguém consegue entrar na sua conta só com ele.',
  });
  const text = [
    'Vamos criar uma nova senha',
    '',
    `Recebemos um pedido para redefinir a senha da conta ${opts.email}.`,
    'Abra o link abaixo e escolha uma senha nova (vale por 1 hora e só pode ser usado uma vez):',
    '',
    opts.link,
    '',
    'Não foi você? Ignore este e-mail — sua senha continua a mesma.',
    '',
    `Conecta Serviço — ${SITE_URL} — ${SUPPORT_EMAIL}`,
  ].join('\n');
  return { subject, html, text };
}
