const GATEWAY_URL = import.meta.env.VITE_API_URL ||
  ((typeof window !== 'undefined' && window.location.port === '5174')
    ? 'http://localhost:3002'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002'));

export const DEFAULT_WA_GROUP_LINK = 'https://chat.whatsapp.com/H2uFKAw0TWu7hpGtFQrP80';
export const DEFAULT_WA_GROUP_CODE = 'H2uFKAw0TWu7hpGtFQrP80';

export async function checkGatewayStatus() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/wa/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Gateway server might not be running or offline
  }
  return {
    status: 'offline',
    isConnected: false,
    connectedPhone: null,
    qr: null
  };
}

export async function sendDirectMessage(phone, message) {
  const res = await fetch(`${GATEWAY_URL}/api/wa/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengirim pesan otomatis via Gateway.');
  }
  return data;
}

export async function sendGroupMessage(inviteCode, message) {
  const res = await fetch(`${GATEWAY_URL}/api/wa/send-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode, message })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengirim pesan otomatis ke grup WhatsApp.');
  }
  return data;
}

export async function sendBulkMessages(targets) {
  const res = await fetch(`${GATEWAY_URL}/api/wa/send-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targets })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengirim pesan massal via Gateway.');
  }
  return data;
}

export async function logoutGateway() {
  const res = await fetch(`${GATEWAY_URL}/api/wa/logout`, {
    method: 'POST'
  });
  return await res.json();
}
