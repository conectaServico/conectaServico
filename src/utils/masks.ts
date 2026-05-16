export const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/^(\d{5})(\d)/, '$1-$2') // Coloca hífen entre o quinto e o sexto dígitos
    .slice(0, 9); // Limita o tamanho máximo a 9 caracteres (12345-678)
};

export const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/^(\d{2})(\d)/g, '($1) $2') // Coloca parênteses em volta dos dois primeiros dígitos
    .replace(/(\d)(\d{4})$/, '$1-$2') // Coloca hífen entre o quarto e o quinto dígitos da segunda parte
    .slice(0, 15); // Limita o tamanho máximo a 15 caracteres ((11) 91234-5678)
};
