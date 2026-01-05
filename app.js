const fmtCLP = (n) => {
  try {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
  } catch {
    return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
};

const waLink = (waNumber, text) => {
  const base = 'https://wa.me/' + waNumber.replace(/[^\d]/g, '');
  const msg = encodeURIComponent(text || '');
  return msg ? `${base}?text=${msg}` : base;
};

const icon = (name) => {
  const icons = {
    bed: '🛏️',
    bath: '🛁',
    area: '📐',
    park: '🚗',
    pin: '📍',
    bolt: '⚡',
    shield: '🛡️',
    doc: '📄',
    phone: '📞',
    mail: '✉️',
  };
  return icons[name] || '•';
};

const propCard = (p, type, office) => {
  const isSale = type === 'sale';
  const price = isSale ? fmtCLP(p.price_clp) : `${fmtCLP(p.price_clp_month)}/mes`;

  const msg = isSale
    ? `Hola, me interesa la propiedad ${p.id} (${p.title}) en ${p.location}. ¿Me compartes más info?`
    : `Hola, quiero consultar por arriendo ${p.id} (${p.title}) en ${p.location}. ¿Disponibilidad y requisitos?`;

  const details = p.details || {};
  const mini = [
    { k: 'bed', v: `${details.dorms ?? '—'}D` },
    { k: 'bath', v: `${details.baths ?? '—'}B` },
    { k: 'area', v: `${details.area_m2 ?? '—'} m²` },
    { k: 'park', v: `${details.parking ?? 0} est.` },
  ];

  const highlight = (p.highlights && p.highlights[0]) ? p.highlights[0] : 'Consultar detalles';
  return `
    <article class="card prop">
      <div class="img">
        <img loading="lazy" src="${p.image}" alt="${p.title} – ${p.location}">
        <div class="badge">${isSale ? 'Venta' : 'Arriendo'}</div>
      </div>
      <div class="body">
        <h3>${p.title}</h3>
        <div class="loc">${icon('pin')} ${p.location}</div>
        <div class="price">${price}</div>
        <div class="mini" aria-label="Detalles de la propiedad">
          ${mini.map(m => `<span>${icon(m.k)} ${m.v}</span>`).join('')}
        </div>
        <div class="small" style="margin-top:8px">${highlight}</div>
        <div class="actions">
          <a class="btn primary" href="${waLink(office.whatsapp, msg)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
          <button class="btn" data-copy="${p.id}">Copiar ID</button>
        </div>
      </div>
    </article>
  `;
};

const setText = (sel, val) => {
  const el = document.querySelector(sel);
  if (el) el.textContent = val;
};

const setHref = (sel, val) => {
  const el = document.querySelector(sel);
  if (el) el.setAttribute('href', val);
};

async function main(){
  const res = await fetch('./properties.json', { cache: 'no-store' });
  const data = await res.json();

  // Fill brand + contact
  setText('[data-brand]', data.office.brand);
  setText('[data-tagline]', data.office.tagline);
  setText('[data-hours]', data.office.hours);
  setText('[data-address]', data.office.address);
  setText('[data-phone]', data.office.phone_display);
  setText('[data-email]', data.office.email);

  setHref('[data-wa-cta]', waLink(data.office.whatsapp, 'Hola, quiero cotizar una tasación y plan de venta/arriendo.'));
  setHref('[data-wa-sticky]', waLink(data.office.whatsapp, 'Hola, vengo desde la web. ¿Me ayudas con una consulta?'));
  setHref('[data-phone-link]', 'tel:' + data.office.phone_display.replace(/\s/g,''));
  setHref('[data-email-link]', 'mailto:' + data.office.email);

  // Render properties
  const sales = document.querySelector('#salesGrid');
  const rentals = document.querySelector('#rentalsGrid');
  if (sales) sales.innerHTML = data.sales.map(p => propCard(p, 'sale', data.office)).join('');
  if (rentals) rentals.innerHTML = data.rentals.map(p => propCard(p, 'rent', data.office)).join('');

  // Copy ID buttons
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-copy]');
    if (!btn) return;
    const id = btn.getAttribute('data-copy');
    try {
      await navigator.clipboard.writeText(id);
      const old = btn.textContent;
      btn.textContent = '¡Copiado!';
      setTimeout(()=> btn.textContent = old, 1200);
    } catch {
      // Fallback: select + copy not possible in all contexts
      prompt('Copia el ID:', id);
    }
  });

  // Tabs
  const tabSale = document.querySelector('#tabSale');
  const tabRent = document.querySelector('#tabRent');
  const panelSale = document.querySelector('#panelSale');
  const panelRent = document.querySelector('#panelRent');

  const selectTab = (which) => {
    const isSale = which === 'sale';
    tabSale?.setAttribute('aria-selected', String(isSale));
    tabRent?.setAttribute('aria-selected', String(!isSale));
    panelSale?.toggleAttribute('hidden', !isSale);
    panelRent?.toggleAttribute('hidden', isSale);
  };

  tabSale?.addEventListener('click', () => selectTab('sale'));
  tabRent?.addEventListener('click', () => selectTab('rent'));

  // Default tab
  selectTab('sale');

  // Footer year + updated
  const year = new Date().getFullYear();
  setText('[data-year]', String(year));
  setText('[data-updated]', data.updated);
}

main().catch((err) => {
  console.error(err);
  const el = document.querySelector('#dataError');
  if (el) el.removeAttribute('hidden');
});
