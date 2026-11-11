
const $ = id => document.getElementById(id);

let settings = [];
let opts = [];
let requests = [];

// ==========================================
// AUTENTICACION
// ==========================================


async function init() {
  const { data: { user }, error } = await db.auth.getUser();

  if (error || !user) {
    $('login').classList.remove('hide');
    $('dashboard').classList.add('hide');
    return;
  }

  $('login').classList.add('hide');
  $('dashboard').classList.remove('hide');

  await Promise.all([
    loadSettings(),
    loadOptions(),
    loadRequests()
  ]);
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  const { error } = await db.auth.signInWithPassword({
    email: $('loginEmail').value.trim(),
    password: $('loginPassword').value
  });

  if (error) {
    show(
      'loginMsg',
      'Credenciales incorrectas o acceso no permitido.',
      true
    );
    return;
  }

  await init();
});

$('logout').onclick = async () => {
  await db.auth.signOut();
  location.reload();
};

// ==========================================
// CONFIGURACION GENERAL
// ==========================================

async function loadSettings() {
  const { data, error } = await db
    .from('configuracion')
    .select('*')
    .order('id');

  if (error) {
    show('settingsMsg', error.message, true);
    return;
  }

  settings = data || [];

  $('settings').innerHTML = settings.map(s => `
    <div class="field">
      <label>
        ${esc(s.descripcion || s.clave)}
        <span class="muted">(${esc(s.clave)})</span>
      </label>

      <input
        data-setting="${s.id}"
        type="number"
        min="0"
        step="0.01"
        value="${Number(s.valor)}"
      >
    </div>
  `).join('');
}

$('saveSettings').onclick = async () => {
  for (const el of document.querySelectorAll('[data-setting]')) {
    const valor = Number(el.value);

    if (!Number.isFinite(valor) || valor < 0) {
      show('settingsMsg', 'Introduce valores válidos.', true);
      return;
    }

    const { error } = await db
      .from('configuracion')
      .update({
        valor,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', Number(el.dataset.setting));

    if (error) {
      show('settingsMsg', error.message, true);
      return;
    }
  }

  show('settingsMsg', 'Configuración guardada correctamente.');
};

// ==========================================
// OPCIONES Y MULTIPLICADORES
// ==========================================

async function loadOptions() {
  const { data, error } = await db
    .from('opciones_presupuesto')
    .select('*')
    .order('categoria')
    .order('orden');

  if (error) {
    show('optionsMsg', error.message, true);
    return;
  }

  opts = data || [];

  $('optionsRows').innerHTML = opts.map(o => `
    <tr data-row="${o.id}">
      <td>${esc(o.categoria)}</td>

      <td>
        <input
          class="name"
          value="${esc(o.nombre)}"
        >
      </td>

      <td>
        <select class="type">
          <option
            value="multiplicador"
            ${o.tipo_calculo === 'multiplicador' ? 'selected' : ''}
          >
            Multiplicador
          </option>

          <option
            value="fijo"
            ${o.tipo_calculo === 'fijo' ? 'selected' : ''}
          >
            Fijo
          </option>
        </select>
      </td>

      <td>
        <input
          class="value"
          type="number"
          min="0"
          step="0.01"
          value="${Number(o.valor)}"
        >
      </td>

      <td>
        <input
          class="active"
          type="checkbox"
          ${o.activo ? 'checked' : ''}
        >
      </td>

      <td>
        <button
          type="button"
          class="btn light"
          data-save="${o.id}"
        >
          Guardar
        </button>
      </td>
    </tr>
  `).join('');
}

$('optionsRows').onclick = async e => {
  const button = e.target.closest('[data-save]');
  if (!button) return;

  const id = Number(button.dataset.save);
  const tr = button.closest('tr');

  const nombre = tr.querySelector('.name').value.trim();
  const valor = Number(tr.querySelector('.value').value);

  if (!nombre || !Number.isFinite(valor) || valor < 0) {
    show('optionsMsg', 'Nombre o valor no válido.', true);
    return;
  }

  const { error } = await db
    .from('opciones_presupuesto')
    .update({
      nombre,
      tipo_calculo: tr.querySelector('.type').value,
      valor,
      activo: tr.querySelector('.active').checked
    })
    .eq('id', id);

  show(
    'optionsMsg',
    error ? error.message : 'Opción guardada correctamente.',
    !!error
  );

  if (!error) await loadOptions();
};

$('addOption').onsubmit = async e => {
  e.preventDefault();

  const nombre = $('newName').value.trim();
  const valor = Number($('newValue').value);

  if (!nombre || !Number.isFinite(valor) || valor < 0) {
    show('optionsMsg', 'Introduce valores válidos.', true);
    return;
  }

  const { error } = await db
    .from('opciones_presupuesto')
    .insert({
      categoria: $('newCategory').value,
      nombre,
      tipo_calculo: $('newType').value,
      valor,
      activo: true
    });

  show(
    'optionsMsg',
    error ? error.message : 'Opción añadida correctamente.',
    !!error
  );

  if (!error) {
    $('addOption').reset();
    await loadOptions();
  }
};

// ==========================================
// SOLICITUDES RECIBIDAS
// ==========================================

const estados = [
  'pendiente',
  'contactado',
  'en_estudio',
  'aceptado',
  'rechazado'
];

async function loadRequests() {
  const { data, error } = await db
    .from('solicitudes')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(200);

  if (error) {
    show('requestsMsg', error.message, true);
    return;
  }

  requests = data || [];

  $('requestsRows').innerHTML = requests.length
    ? requests.map(r => `
      <tr>
        <td>
          ${new Date(r.creado_en).toLocaleDateString('es-ES')}
        </td>

        <td>
          ${esc(r.nombre || '')}
          ${esc(r.apellidos || '')}
        </td>

        <td>
          ${esc(r.email || '')}
          <br>
          ${esc(r.telefono || '')}
        </td>

        <td>
          ${esc(r.superficie_m2)} m²
          <br>
          ${esc(r.tipo_vivienda || '')}
        </td>

        <td>
          ${euros(r.presupuesto_estimado)}
        </td>

        <td>
          <select data-status="${r.id}">
            ${estados.map(s => `
              <option
                value="${s}"
                ${s === r.estado ? 'selected' : ''}
              >
                ${s.replaceAll('_', ' ')}
              </option>
            `).join('')}
          </select>
        </td>

        <td>
          <button
            type="button"
            class="btn light"
            data-detail="${r.id}"
          >
            Ver detalles
          </button>
        </td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="7">
          Todavía no hay solicitudes.
        </td>
      </tr>
    `;
}

// ==========================================
// CAMBIAR ESTADO Y ABRIR DETALLES
// ==========================================

$('requestsRows').addEventListener('change', async e => {
  const select = e.target.closest('[data-status]');
  if (!select) return;

  const id = select.dataset.status;
  const nuevoEstado = select.value;

  const solicitud = requests.find(r => r.id === id);
  const estadoAnterior = solicitud?.estado;

  select.disabled = true;

  const { error } = await db
    .from('solicitudes')
    .update({ estado: nuevoEstado })
    .eq('id', id);

  select.disabled = false;

  if (error) {
    select.value = estadoAnterior || 'pendiente';
    show('requestsMsg', error.message, true);
    return;
  }

  if (solicitud) solicitud.estado = nuevoEstado;

  show('requestsMsg', 'Estado actualizado correctamente.');
});

$('requestsRows').addEventListener('click', e => {
  const button = e.target.closest('[data-detail]');
  if (!button) return;

  const solicitud = requests.find(
    r => r.id === button.dataset.detail
  );

  if (solicitud) {
    openRequestDetails(solicitud);
  }
});

$('refresh').onclick = loadRequests;

// ==========================================
// MODAL DE DETALLES
// ==========================================

function closeRequestDetails() {
  const modal = $('requestModal');

  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function openRequestDetails(r) {
  let modal = $('requestModal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'requestModal';
    modal.className = 'request-modal';

    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Detalles de la solicitud');

    modal.innerHTML = `
      <div class="request-modal-content">
        <div class="request-modal-header">
          <h2>Detalles de la solicitud</h2>

          <button
            type="button"
            class="request-modal-close"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        <div id="requestModalBody"></div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', e => {
      if (
        e.target === modal ||
        e.target.closest('.request-modal-close')
      ) {
        closeRequestDetails();
      }
    });
  }

  const d = r.desglose || {};

  const ubicacion = [
    r.localidad,
    r.provincia
  ].filter(Boolean).join(', ') || 'No indicada';

  $('requestModalBody').innerHTML = `
    <div class="request-detail-grid">

      <div>
        <span class="detail-label">Cliente</span>
        <strong>
          ${esc(r.nombre || '')}
          ${esc(r.apellidos || '')}
        </strong>
      </div>

      <div>
        <span class="detail-label">Correo electrónico</span>
        <strong>${esc(r.email || '')}</strong>
      </div>

      <div>
        <span class="detail-label">Teléfono</span>
        <strong>${esc(r.telefono || 'No indicado')}</strong>
      </div>

      <div>
        <span class="detail-label">Ubicación</span>
        <strong>${esc(ubicacion)}</strong>
      </div>

      <div>
        <span class="detail-label">Superficie</span>
        <strong>${esc(r.superficie_m2)} m²</strong>
      </div>

      <div>
        <span class="detail-label">Tipo de vivienda</span>
        <strong>${esc(r.tipo_vivienda || '')}</strong>
      </div>

      <div>
        <span class="detail-label">Acabados</span>
        <strong>${esc(r.acabados || '')}</strong>
      </div>

      <div>
        <span class="detail-label">Fecha de solicitud</span>
        <strong>
          ${new Date(r.creado_en).toLocaleDateString('es-ES')}
        </strong>
      </div>

    </div>

    <h3>Desglose del presupuesto</h3>

    <div class="request-breakdown">

      <div>
        <span>Precio por m²</span>
        <strong>${euros(d.precio_m2 ?? 0)}</strong>
      </div>

      <div>
        <span>Base de la vivienda</span>
        <strong>${euros(d.base ?? 0)}</strong>
      </div>

      <div>
        <span>Multiplicador vivienda</span>
        <strong>
          × ${esc(d.multiplicador_tipo ?? 1)}
        </strong>
      </div>

      <div>
        <span>Multiplicador acabados</span>
        <strong>
          × ${esc(d.multiplicador_acabados ?? 1)}
        </strong>
      </div>

      <div>
        <span>Extras</span>
        <strong>${euros(d.extras ?? 0)}</strong>
      </div>

      <div class="request-total">
        <span>Presupuesto estimado</span>
        <strong>${euros(r.presupuesto_estimado)}</strong>
      </div>

    </div>

    <h3>Comentarios</h3>

    <p class="request-comments">
      ${esc(r.comentarios || 'Sin comentarios')}
    </p>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  modal.querySelector('.request-modal-close').focus();
}

// Cerrar con Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeRequestDetails();
  }
});

// ==========================================
// INICIALIZAR
// ==========================================

init();
