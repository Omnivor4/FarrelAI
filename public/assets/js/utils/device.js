const DEVICE_STORAGE_KEY = 'farrel_device_id';

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!deviceId) {
    if (crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    }
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }
  return deviceId;
}

export function detectPlatform() {
  const userAgent = navigator.userAgent || '';
  let os = 'Unknown OS';
  let browser = 'Browser';

  if (/Windows/i.test(userAgent)) os = 'Windows PC';
  else if (/iPhone/i.test(userAgent)) os = 'iPhone';
  else if (/iPad/i.test(userAgent)) os = 'iPad';
  else if (/Android/i.test(userAgent)) os = 'Android Phone';
  else if (/Macintosh|Mac OS/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux';

  if (/Edg/i.test(userAgent)) browser = 'Edge';
  else if (/Chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/Safari/i.test(userAgent)) browser = 'Safari';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';

  return `${os} (${browser})`;
}
