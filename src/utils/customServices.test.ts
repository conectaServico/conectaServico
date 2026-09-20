import { describe, expect, it } from 'vitest';
import { cleanCustomServices, normalizeCustomService, MAX_CUSTOM_SERVICES } from './customServices';

describe('customServices', () => {
  it('normaliza espaços e corta em 60 letras', () => {
    expect(normalizeCustomService('  Instalação   de   portão  ')).toBe('Instalação de portão');
    expect(normalizeCustomService('a'.repeat(100))).toHaveLength(60);
  });

  it('remove repetidos (sem diferenciar maiúscula), textos curtos e valores que não são texto', () => {
    const out = cleanCustomServices(['Portão eletrônico', 'portão ELETRÔNICO', 'ab', 42, null, 'Câmeras de segurança']);
    expect(out).toEqual(['Portão eletrônico', 'Câmeras de segurança']);
  });

  it('respeita o limite de itens e aceita entrada inválida', () => {
    const many = Array.from({ length: 30 }, (_, i) => `Serviço número ${i}`);
    expect(cleanCustomServices(many)).toHaveLength(MAX_CUSTOM_SERVICES);
    expect(cleanCustomServices(undefined)).toEqual([]);
    expect(cleanCustomServices('texto solto')).toEqual([]);
  });
});
