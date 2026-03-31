const slotsEl = document.getElementById('slots');
const resultEl = document.getElementById('result');
const form = document.getElementById('reservation-form');
const countdownEl = document.getElementById('countdown');

let holdDeadline;

async function loadConfig() {
  const res = await fetch('/api/config');
  const config = await res.json();
  holdDeadline = new Date(config.holdDeadlineIso);
  document.getElementById('paynowUen').textContent = config.paynowUen;
  document.getElementById('paynowPrefix').textContent = config.paynowReferencePrefix;
}

function renderCountdown() {
  if (!holdDeadline) return;
  const diff = holdDeadline.getTime() - Date.now();
  if (diff <= 0) {
    countdownEl.textContent = 'Deadline passed.';
    return;
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  countdownEl.textContent = `${days}d ${hours}h ${minutes}m`;
}

async function loadSlots() {
  const res = await fetch('/api/slots');
  const data = await res.json();
  slotsEl.innerHTML = '';

  data.slots.forEach((slot) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = slot.number;
    btn.className = `slot ${slot.status}`;
    if (slot.status !== 'available') btn.disabled = true;
    btn.addEventListener('click', () => {
      document.getElementById('riderNumber').value = slot.number;
      form.scrollIntoView({ behavior: 'smooth' });
    });
    slotsEl.appendChild(btn);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  resultEl.textContent = 'Submitting...';

  const payload = {
    riderNumber: Number(document.getElementById('riderNumber').value),
    riderName: document.getElementById('riderName').value,
    phone: document.getElementById('phone').value,
    telegramHandle: document.getElementById('telegramHandle').value,
  };

  const res = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    resultEl.textContent = data.error || 'Reservation failed.';
    return;
  }

  resultEl.textContent = `Reserved. Reference: ${data.paynowReference}. Send payment proof on Telegram to confirm.`;
  await loadSlots();
  form.reset();
});

await loadConfig();
await loadSlots();
renderCountdown();
setInterval(renderCountdown, 60_000);
