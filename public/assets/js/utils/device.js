const DEVICE_STORAGE_KEY = 'farrel_device_id';
const PLATFORM_STORAGE_KEY = 'farrel_device_platform';

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

function getIPhoneModel() {
  if (typeof window === 'undefined' || !window.screen) return 'iPhone';
  const width = Math.min(window.screen.width, window.screen.height);
  const height = Math.max(window.screen.width, window.screen.height);
  const dpr = window.devicePixelRatio || 1;

  if (width === 430 && height === 932) return 'iPhone 14 Pro Max / 15+ / 16+';
  if (width === 393 && height === 852) return 'iPhone 14 Pro / 15 / 16';
  if (width === 428 && height === 926) return 'iPhone 12/13 Pro Max / 14 Plus';
  if (width === 390 && height === 844) return 'iPhone 12 / 13 / 14';
  if (width === 375 && height === 812 && dpr === 3) return 'iPhone X / XS / 11 Pro / 13 mini';
  if (width === 414 && height === 896 && dpr === 3) return 'iPhone XS Max / 11 Pro Max';
  if (width === 414 && height === 896 && dpr === 2) return 'iPhone XR / 11';
  if (width === 375 && height === 667) return 'iPhone 7 / 8 / SE';
  if (width === 414 && height === 736) return 'iPhone Plus (7/8 Plus)';
  return 'iPhone';
}

function getBrowserName(userAgent) {
  if (/Edg/i.test(userAgent)) return 'Edge';
  if (/Chrome/i.test(userAgent)) return 'Chrome';
  if (/Safari/i.test(userAgent)) return 'Safari';
  if (/Firefox/i.test(userAgent)) return 'Firefox';
  return 'Browser';
}

function parseModelFromUA(userAgent) {
  const match = userAgent.match(/;\s*([^;]+?)\s+Build\//i);
  if (match && match[1]) {
    const raw = match[1].trim();
    if (!/Linux|Android|U;|arm|wv/i.test(raw)) {
      return raw;
    }
  }
  return null;
}

export function detectPlatform() {
  const cached = localStorage.getItem(PLATFORM_STORAGE_KEY);
  if (cached) return cached;

  const userAgent = navigator.userAgent || '';
  const browser = getBrowserName(userAgent);
  let os = 'Unknown OS';

  if (/iPhone/i.test(userAgent)) os = getIPhoneModel();
  else if (/iPad/i.test(userAgent)) os = 'iPad';
  else if (/Android/i.test(userAgent)) {
    const m = parseModelFromUA(userAgent);
    os = m ? `Android (${m})` : 'Android Phone';
  } else if (/Windows/i.test(userAgent)) os = 'Windows PC';
  else if (/Macintosh|Mac OS/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux PC';

  return `${os} (${browser})`;
}

export async function detectDetailedPlatform() {
  const userAgent = navigator.userAgent || '';
  const browser = getBrowserName(userAgent);

  let os = 'Unknown OS';
  let model = null;

  if (/iPhone/i.test(userAgent)) {
    os = getIPhoneModel();
  } else if (/iPad/i.test(userAgent)) {
    os = 'iPad';
  } else if (/Android/i.test(userAgent)) {
    model = parseModelFromUA(userAgent);

    if (navigator.userAgentData && typeof navigator.userAgentData.getHighEntropyValues === 'function') {
      try {
        const hint = await navigator.userAgentData.getHighEntropyValues(['model']);
        if (hint && hint.model && hint.model.trim().length > 0) {
          model = hint.model.trim();
        }
      } catch {}
    }

    if (model) {
      os = `Android (${model})`;
    } else {
      os = 'Android Phone';
    }
  } else if (/Windows/i.test(userAgent)) {
    os = 'Windows PC';
  } else if (/Macintosh|Mac OS/i.test(userAgent)) {
    os = 'macOS';
  } else if (/Linux/i.test(userAgent)) {
    os = 'Linux PC';
  }

  const result = `${os} (${browser})`;
  try {
    localStorage.setItem(PLATFORM_STORAGE_KEY, result);
  } catch {}
  return result;
}
