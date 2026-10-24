export async function sendChatMessage({ message, history = [], deviceId, platform, signal }) {
  const timeoutMs = 20000;
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);

  const activeSignal = signal
    ? (typeof AbortSignal?.any === 'function' ? AbortSignal.any([signal, timeoutController.signal]) : signal)
    : timeoutController.signal;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        history,
        deviceId,
        platform
      }),
      signal: activeSignal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.error || `HTTP error ${response.status}`);
      error.status = response.status;
      error.quotaExhausted = Boolean(data.quotaExhausted || response.status === 429);
      throw error;
    }

    return data;
  } catch (err) {
    if (timeoutController.signal.aborted && !signal?.aborted) {
      const timeoutErr = new Error('koneksi agak lambat nih, coba kirim ulang ya bro.');
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
