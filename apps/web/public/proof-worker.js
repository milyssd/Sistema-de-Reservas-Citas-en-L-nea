self.onmessage = async ({ data }) => {
  const { token, difficulty, expiresAt } = data;
  if (
    typeof token !== 'string' ||
    !Number.isInteger(difficulty) ||
    difficulty < 1 ||
    difficulty > 22
  ) {
    self.postMessage({ error: 'La verificación recibida no es válida.' });
    return;
  }
  const deadline = Math.min(Date.parse(expiresAt), Date.now() + 60000);
  const encoder = new TextEncoder();
  const zeroBytes = Math.floor(difficulty / 8);
  const remainingBits = difficulty % 8;
  for (let value = 0; value < Number.MAX_SAFE_INTEGER; value++) {
    if (value % 256 === 0 && Date.now() >= deadline) {
      self.postMessage({ error: 'La verificación venció. Vuelve a intentar tu reserva.' });
      return;
    }
    const nonce = String(value);
    const bytes = new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(`${token}:${nonce}`)),
    );
    let valid = true;
    for (let index = 0; index < zeroBytes; index++)
      if (bytes[index] !== 0) {
        valid = false;
        break;
      }
    if (valid && (!remainingBits || bytes[zeroBytes] < 1 << (8 - remainingBits))) {
      self.postMessage({ nonce });
      return;
    }
  }
};
