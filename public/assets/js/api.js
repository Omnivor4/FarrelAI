export async function sendChatMessage({ message, history = [], deviceId, platform, signal }) {
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
    signal
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP error ${response.status}`);
    error.status = response.status;
    error.quotaExhausted = Boolean(data.quotaExhausted || response.status === 429);
    throw error;
  }

  return data;
}
