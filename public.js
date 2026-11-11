
let options = [];
let config = {};
let lastTotal = 0;

const $ = id => document.getElementById(id);

// Obtener la opción seleccionada por su ID
const selected = id => {
  const element = $(id);
  if (!element) return null;

  return options.find(
    o => String(o.id) === element.value
  ) || null;
};

// Cargar configuración y opciones desde Supabase
async function load() {
  try {
    const [c, o] = await Promise.all([
      db.from('configuracion').select('*'),
      db.from('opciones_presupuesto')
        .select('*')
        .eq('activo', true)
        .order('orden')
    ]);

    if (c.error || o.error) {
      throw c.error || o.error;
    }

    config = Object.fromEntries(
      c.data.map(x => [x.clave, Number(x.valor)])
    );

    options = o.data || [];

    // Cargar tipos de vivienda y acabados
    for (const [cat, id] of [
      ['tipo_vivienda', 'tipo'],
      ['acabados', 'acabado']
    ]) {
      $(id).innerHTML = options
        .filter(x => x.categoria === cat)
        .map(x => `
          <option value="${x.id}">
            ${esc(x.nombre)}
          </option>
        `)
        .join('');
    }

    // Cargar extras
    $('extras').innerHTML = options
      .filter(x => x.categoria === 'extras')
      .map(x => `
        <label class="check">
          <input
            type="checkbox"
            value="${x.id}"
            class="extra"
          >
          ${esc(x.nombre)} · ${euros(x.valor)}
        </label>
      `)
      .join('');

    // Configurar límites de superficie
    $('area').min = config.superficie_minima || 1;
    $('area').max = config.superficie_maxima || 100000;

    // Escuchar cambios en el formulario
    document.querySelectorAll(
      '#area, #tipo, #acabado, .extra'
    ).forEach(element => {
      element.addEventListener('input', calculate);
      element.addEventListener('change', calculate);
    });

    // Primer cálculo
    calculate();

  } catch (error) {
    console.error('Error cargando precios:', error);

    show(
      'feedback',
      'No se pudieron cargar los precios. Revisa la configuración de Supabase.',
      true
    );
  }
}

// Calcular presupuesto aproximado
function calculate() {
  const area = Number($('area').value) || 0;

  const tipo = selected('tipo');
  const acabado = selected('acabado');

  if (!tipo || !acabado) {
    lastTotal = 0;
    $('total').textContent = '—';
    return;
  }

  const extras = Array.from(
    document.querySelectorAll('.extra:checked')
  )
    .map(element =>
      options.find(
        o => String(o.id) === element.value
      )
    )
    .filter(Boolean);

  const precioM2 = Number(config.precio_m2) || 0;

  const base = area * precioM2;

  const factorTipo = Number(tipo.valor);
  const factorAcabado = Number(acabado.valor);

  const extrasValue = extras.reduce(
    (sum, extra) => sum + Number(extra.valor),
    0
  );

  lastTotal = Math.round(
    (
      base * factorTipo * factorAcabado
      + extrasValue
    ) * 100
  ) / 100;

  // Actualizar el desglose visual
  $('base').textContent = euros(base);

  $('factorTipo').textContent =
    '× ' + factorTipo.toLocaleString('es-ES');

  $('factorAcabado').textContent =
    '× ' + factorAcabado.toLocaleString('es-ES');

  $('extrasTotal').textContent = euros(extrasValue);

  $('total').textContent = euros(lastTotal);
}

// Enviar solicitud
$('quoteForm').addEventListener('submit', async e => {
  e.preventDefault();

  const btn = $('sendBtn');
  const area = Number($('area').value);

  const superficieMinima =
    Number(config.superficie_minima) || 1;

  const superficieMaxima =
    Number(config.superficie_maxima) || 100000;

  // Validar superficie
  if (
    !Number.isFinite(area) ||
    area < superficieMinima ||
    area > superficieMaxima
  ) {
    show(
      'feedback',
      'La superficie está fuera de los límites permitidos.',
      true
    );
    return;
  }

  if (!selected('tipo') || !selected('acabado')) {
    show(
      'feedback',
      'Selecciona un tipo de vivienda y unos acabados.',
      true
    );
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const payload = {
    nombre: $('nombre').value.trim(),
    apellidos: $('apellidos').value.trim(),
    email: $('email').value.trim(),
    telefono: $('telefono').value.trim(),

    superficie_m2: area,

    tipo_id: Number($('tipo').value),
    acabado_id: Number($('acabado').value),

    extra_ids: Array.from(
      document.querySelectorAll('.extra:checked')
    ).map(element => Number(element.value)),

    provincia: $('provincia').value.trim(),
    localidad: $('localidad').value.trim(),
    comentarios: $('comentarios').value.trim()
  };

  try {
    const { data, error } = await db.rpc(
      'crear_solicitud_publica',
      { datos: payload }
    );

    if (error) {
      throw error;
    }

    show(
      'feedback',
      '¡Gracias! Hemos registrado tu solicitud. Referencia: ' + data
    );

    $('quoteForm').reset();

    calculate();

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });

  } catch (error) {
    console.error('Error enviando solicitud:', error);

    show(
      'feedback',
      'No se ha podido enviar la solicitud: ' + error.message,
      true
    );

  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar mi solicitud';
  }
});

// Inicializar
load();
