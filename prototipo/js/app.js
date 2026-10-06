(function () {
  var root = document.documentElement;

  /* ---------- Theme ---------- */
  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    document.querySelectorAll('[data-theme-btn]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.themeBtn === mode);
    });
  }
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var savedTheme = localStorage.getItem('siv_theme');
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

  function toggleTheme() {
    var current = root.getAttribute('data-theme');
    var next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    localStorage.setItem('siv_theme', next);
  }

  var themeToggle = document.getElementById('themeToggle');
  var loginThemeToggle = document.getElementById('loginThemeToggle');
  if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  if (loginThemeToggle) loginThemeToggle.addEventListener('click', toggleTheme);

  /* ---------- Toast ---------- */
  function toast(msg) {
    var stack = document.getElementById('toastStack');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .25s';
      setTimeout(function () { el.remove(); }, 250);
    }, 2600);
  }

  /* ---------- Sidebar nav / pages ---------- */
  document.querySelectorAll('.nav button[data-page]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.nav button[data-page]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var target = btn.dataset.page;
      document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
      var page = document.getElementById('page-' + target);
      if (page) { page.classList.add('active'); }
      document.querySelector('.content').scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.getElementById('sidebar').classList.remove('show');
    });
  });

  document.getElementById('menuBtn').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('show');
  });

  /* ---------- Modals ---------- */
  var overlay = document.getElementById('globalOverlay');
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.add('show');
    overlay.classList.add('show');
  }
  function closeAllModals() {
    document.querySelectorAll('.modal.show').forEach(function (m) { m.classList.remove('show'); });
    overlay.classList.remove('show');
  }
  document.querySelectorAll('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { openModal(btn.dataset.open); });
  });
  document.querySelectorAll('.modal .close, .modal .close-action').forEach(function (btn) {
    btn.addEventListener('click', closeAllModals);
  });
  overlay.addEventListener('click', function () { closeAllModals(); closeDrawer(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAllModals(); closeDrawer(); } });

  document.querySelectorAll('.demo-save').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeAllModals();
      toast(btn.dataset.toast || 'Guardado correctamente');
    });
  });

  /* salida-only fields on inventory modal */
  var movTipo = document.getElementById('movTipo');
  function syncSalida() {
    var show = movTipo.value === 'SALIDA';
    document.querySelectorAll('.salida-only').forEach(function (f) { f.classList.toggle('show', show); });
  }
  if (movTipo) { movTipo.addEventListener('change', syncSalida); syncSalida(); }

  /* ---------- Modal tabs (vehicle detail) ---------- */
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    tabs.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
      });
    });
  });

  /* =========================================================
   CRUD VEHÍCULOS
========================================================= */

  var vehicleTable =
    document.getElementById('vehicleTable');

  var vehicleBody =
    vehicleTable
      ? vehicleTable.querySelector('tbody')
      : null;

  var vSearch =
    document.getElementById('vehicleSearch');

  var vUnit =
    document.getElementById('vehicleUnitFilter');

  var vState =
    document.getElementById('vehicleStateFilter');


  var vehiculoForm =
    document.getElementById('vehiculoForm');

  var btnNuevoVehiculo =
    document.getElementById('btnNuevoVehiculo');

  var vehiculoModalTitulo =
    document.getElementById('vehiculoModalTitulo');

  var btnGuardarVehiculo =
    document.getElementById('btnGuardarVehiculo');

  var vehiculoPhotoGrid =
    document.getElementById('vehiculoPhotoGrid');

  var vehiculoFotoCount =
    document.getElementById('vehiculoFotoCount');

  var vehiculoFotoRequired =
    document.getElementById('vehiculoFotoRequired');

  var vehiculoFotoAyuda =
    document.getElementById('vehiculoFotoAyuda');

  var fotosVehiculoActual = {};

  var FOTO_CONFIG_VEHICULO = [
    { key: 'frontal', label: 'Frontal', hint: 'Vista completa desde el frente' },
    { key: 'trasero', label: 'Trasero', hint: 'Vista completa desde atrás' },
    { key: 'lateralIzquierdo', label: 'Lateral izquierdo', hint: 'Perfil completo del lado izquierdo' },
    { key: 'lateralDerecho', label: 'Lateral derecho', hint: 'Perfil completo del lado derecho' },
    { key: 'interior', label: 'Interior', hint: 'Cabina, tablero y asientos' },
    { key: 'motor', label: 'Motor', hint: 'Compartimiento del motor visible' },
    { key: 'chasis', label: 'Chasis', hint: 'Número o zona identificable del chasis' }
  ];

  var FOTO_CONFIG_MOTOCICLETA = [
    { key: 'frontal', label: 'Frontal', hint: 'Vista completa desde el frente' },
    { key: 'trasero', label: 'Trasero', hint: 'Vista completa desde atrás' },
    { key: 'lateralIzquierdo', label: 'Lateral izquierdo', hint: 'Perfil completo del lado izquierdo' },
    { key: 'lateralDerecho', label: 'Lateral derecho', hint: 'Perfil completo del lado derecho' },
    { key: 'motor', label: 'Motor', hint: 'Motor y zona mecánica principal' }
  ];


  var STORAGE_VEHICULOS =
    'siv_vehiculos';


  /* =========================================================
     CAMPOS
  ========================================================= */

  var camposVehiculo = {

    id:
      document.getElementById('vehiculoId'),

    placa:
      document.getElementById('vehiculoPlaca'),

    placaDnfr:
      document.getElementById('vehiculoPlacaDnfr'),

    tipo:
      document.getElementById('vehiculoTipo'),

    marca:
      document.getElementById('vehiculoMarca'),

    modelo:
      document.getElementById('vehiculoModelo'),

    anio:
      document.getElementById('vehiculoAnio'),

    chasis:
      document.getElementById('vehiculoChasis'),

    motor:
      document.getElementById('vehiculoMotor'),

    color:
      document.getElementById('vehiculoColor'),

    pais:
      document.getElementById('vehiculoPais'),

    fuente:
      document.getElementById('vehiculoFuente'),

    unidad:
      document.getElementById('vehiculoUnidad'),

    estado:
      document.getElementById('vehiculoEstado'),

    km:
      document.getElementById('vehiculoKm'),

    observaciones:
      document.getElementById('vehiculoObservaciones')

  };


  /* =========================================================
     DATOS
  ========================================================= */

  var vehiculos = [];


  /* =========================================================
     CAPTURAR VEHÍCULOS INICIALES DE LA TABLA
  ========================================================= */

  function obtenerVehiculosIniciales() {

    if (!vehicleBody) {
      return [];
    }

    return Array.from(
      vehicleBody.querySelectorAll('tr')
    ).map(function (row, index) {

      var columnas = row.children;

      return {

        id:
          'vehiculo-' + (index + 1),

        placa:
          columnas[0]
            ? columnas[0].textContent.trim()
            : '',

        placaDnfr:
          '',

        tipo:
          '',

        marca:
          columnas[1]
            ? columnas[1].textContent.trim()
            : '',

        modelo:
          columnas[2]
            ? columnas[2].textContent.trim()
            : '',

        anio:
          '',

        chasis:
          '',

        motor:
          '',

        color:
          '',

        pais:
          '',

        fuente:
          '',

        unidad:
          columnas[3]
            ? columnas[3].textContent.trim()
            : '',

        estado:
          row.dataset.state || 'Bueno',

        km:
          columnas[5]
            ? columnas[5]
              .textContent
              .trim()
              .replace(/\./g, '')
            : '0',

        observaciones:
          ''

      };

    });

  }


  /* =========================================================
     CARGAR LOCALSTORAGE
  ========================================================= */

  function cargarVehiculos() {

    var guardados =
      localStorage.getItem(
        STORAGE_VEHICULOS
      );

    if (guardados) {

      try {

        vehiculos =
          JSON.parse(guardados);

        return;

      }
      catch (error) {

        console.error(
          'Error leyendo vehículos:',
          error
        );

      }

    }


    vehiculos =
      obtenerVehiculosIniciales();

    guardarVehiculos();

  }


  /* =========================================================
     GUARDAR LOCALSTORAGE
  ========================================================= */

  function guardarVehiculos() {

    try {
      localStorage.setItem(
        STORAGE_VEHICULOS,
        JSON.stringify(vehiculos)
      );
      return true;
    } catch (error) {
      console.error('No se pudo guardar el prototipo localmente:', error);
      toast('Las fotografías exceden el almacenamiento local del navegador');
      return false;
    }

  }


  /* =========================================================
     FORMATEAR KILOMETRAJE
  ========================================================= */

  function formatearKm(valor) {

    var numero =
      Number(valor || 0);

    return numero.toLocaleString(
      'es-BO'
    );

  }


  /* =========================================================
     BADGE DE ESTADO
  ========================================================= */

  function claseEstado(estado) {

    if (
      estado === 'Inoperable'
    ) {
      return 'red';
    }

    if (
      estado === 'Regular' ||
      estado === 'En mantenimiento'
    ) {
      return 'orange';
    }

    return 'green';

  }


  /* =========================================================
     ESCAPAR HTML
  ========================================================= */

  function escaparHTML(valor) {

    return String(valor || '')

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#039;');

  }



  /* =========================================================
     REGISTRO FOTOGRÁFICO DE MOVILIDADES
  ========================================================= */

  function obtenerConfigFotosVehiculo() {
    var tipo = camposVehiculo.tipo ? camposVehiculo.tipo.value : '';
    return tipo === 'Motocicleta'
      ? FOTO_CONFIG_MOTOCICLETA
      : FOTO_CONFIG_VEHICULO;
  }

  function obtenerFotosRequeridas() {
    return obtenerConfigFotosVehiculo().map(function (foto) {
      return foto.key;
    });
  }

  function actualizarContadorFotos() {
    var config = obtenerConfigFotosVehiculo();
    var completadas = config.filter(function (foto) {
      return fotosVehiculoActual[foto.key] && fotosVehiculoActual[foto.key].dataUrl;
    }).length;

    if (vehiculoFotoCount) vehiculoFotoCount.textContent = completadas;
    if (vehiculoFotoRequired) vehiculoFotoRequired.textContent = config.length;

    if (vehiculoFotoAyuda) {
      vehiculoFotoAyuda.textContent = camposVehiculo.tipo && camposVehiculo.tipo.value === 'Motocicleta'
        ? 'Motocicleta: 5 fotografías obligatorias — frontal, trasero, ambos laterales y motor.'
        : 'Vehículo: 7 fotografías obligatorias — frontal, trasero, ambos laterales, interior, motor y chasis.';
    }
  }

  function renderFotoPlaceholder() {
    return `
      <div class="photo-slot-placeholder" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M4 7.5h3l1.4-2h7.2l1.4 2h3v11H4v-11Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
          <circle cx="12" cy="13" r="3.2" stroke="currentColor" stroke-width="1.7"/>
        </svg>
        <span>Sin fotografía</span>
      </div>`;
  }

  function renderFotosVehiculo() {
    if (!vehiculoPhotoGrid) return;

    var config = obtenerConfigFotosVehiculo();
    vehiculoPhotoGrid.innerHTML = '';

    config.forEach(function (foto, index) {
      var actual = fotosVehiculoActual[foto.key];
      var card = document.createElement('article');
      card.className = 'vehicle-photo-card' + (actual && actual.dataUrl ? ' has-photo' : '');
      card.dataset.photoKey = foto.key;

      var preview = actual && actual.dataUrl
        ? `<img src="${actual.dataUrl}" alt="Fotografía ${escaparHTML(foto.label)}" />`
        : renderFotoPlaceholder();

      card.innerHTML = `
        <div class="vehicle-photo-preview">
          ${preview}
          <span class="photo-slot-number">${String(index + 1).padStart(2, '0')}</span>
          ${actual && actual.dataUrl ? '<span class="photo-ready-badge">Cargada</span>' : ''}
        </div>
        <div class="vehicle-photo-meta">
          <div>
            <strong>${escaparHTML(foto.label)} <span>*</span></strong>
            <small>${escaparHTML(foto.hint)}</small>
          </div>
          <div class="vehicle-photo-actions">
            <label class="photo-upload-btn">
              <input class="vehicle-photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/*" data-photo-key="${foto.key}" />
              <span>${actual && actual.dataUrl ? 'Reemplazar' : 'Agregar foto'}</span>
            </label>
            ${actual && actual.dataUrl ? `<button type="button" class="photo-remove-btn" data-remove-photo="${foto.key}" aria-label="Eliminar fotografía ${escaparHTML(foto.label)}">Eliminar</button>` : ''}
          </div>
        </div>`;

      vehiculoPhotoGrid.appendChild(card);
    });

    actualizarContadorFotos();
  }

  function optimizarFoto(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function (event) {
        var image = new Image();
        image.onload = function () {
          var maxSide = 900;
          var scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));

          var ctx = canvas.getContext('2d');
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        image.onerror = function () { reject(new Error('No se pudo leer la imagen')); };
        image.src = event.target.result;
      };

      reader.onerror = function () { reject(new Error('No se pudo leer el archivo')); };
      reader.readAsDataURL(file);
    });
  }

  async function cargarFotoVehiculo(file, key) {
    if (!file || !key) return;

    if (!file.type || file.type.indexOf('image/') !== 0) {
      toast('Seleccione un archivo de imagen válido');
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast('La fotografía no debe superar 12 MB');
      return;
    }

    try {
      var dataUrl = await optimizarFoto(file);
      fotosVehiculoActual[key] = {
        dataUrl: dataUrl,
        nombre: file.name,
        actualizado: new Date().toISOString()
      };
      renderFotosVehiculo();
    } catch (error) {
      console.error(error);
      toast('No se pudo procesar la fotografía');
    }
  }

  function fotosFaltantesVehiculo() {
    var config = obtenerConfigFotosVehiculo();
    return config.filter(function (foto) {
      return !fotosVehiculoActual[foto.key] || !fotosVehiculoActual[foto.key].dataUrl;
    });
  }

  function fotosParaGuardar() {
    var permitidas = obtenerFotosRequeridas();
    var resultado = {};
    permitidas.forEach(function (key) {
      if (fotosVehiculoActual[key]) resultado[key] = fotosVehiculoActual[key];
    });
    return resultado;
  }

  function renderGaleriaVehiculo(vehiculo) {
    var tipoMoto = vehiculo.tipo === 'Motocicleta';
    var config = tipoMoto ? FOTO_CONFIG_MOTOCICLETA : FOTO_CONFIG_VEHICULO;
    var fotos = vehiculo.fotos || {};
    var disponibles = config.filter(function (foto) {
      return fotos[foto.key] && fotos[foto.key].dataUrl;
    });

    if (!disponibles.length) {
      return `
        <h4 style="margin-top:20px;">Registro fotográfico</h4>
        <div class="mini-card vehicle-no-photos">
          Este registro todavía no tiene fotografías asociadas.
        </div>`;
    }

    return `
      <h4 style="margin-top:20px;">Registro fotográfico</h4>
      <div class="vehicle-detail-photo-grid">
        ${disponibles.map(function (foto) {
          return `
            <figure class="vehicle-detail-photo">
              <img src="${fotos[foto.key].dataUrl}" alt="${escaparHTML(foto.label)}" />
              <figcaption>${escaparHTML(foto.label)}</figcaption>
            </figure>`;
        }).join('')}
      </div>`;
  }

  if (camposVehiculo.tipo) {
    camposVehiculo.tipo.addEventListener('change', renderFotosVehiculo);
  }

  if (vehiculoPhotoGrid) {
    vehiculoPhotoGrid.addEventListener('change', function (event) {
      var input = event.target.closest('.vehicle-photo-input');
      if (!input || !input.files || !input.files[0]) return;
      cargarFotoVehiculo(input.files[0], input.dataset.photoKey);
    });

    vehiculoPhotoGrid.addEventListener('click', function (event) {
      var removeBtn = event.target.closest('[data-remove-photo]');
      if (!removeBtn) return;
      delete fotosVehiculoActual[removeBtn.dataset.removePhoto];
      renderFotosVehiculo();
    });
  }

  /* =========================================================
     RENDERIZAR TABLA
  ========================================================= */

  function renderVehiculos() {

    if (!vehicleBody) {
      return;
    }


    vehicleBody.innerHTML = '';


    vehiculos.forEach(function (vehiculo) {

      var row =
        document.createElement('tr');


      row.dataset.id =
        vehiculo.id;

      row.dataset.unit =
        vehiculo.unidad;

      row.dataset.state =
        vehiculo.estado;


      row.innerHTML = `

      <td>
        <strong>
          ${escaparHTML(vehiculo.placa)}
        </strong>
      </td>

      <td>
        ${escaparHTML(vehiculo.marca)}
      </td>

      <td>
        ${escaparHTML(vehiculo.modelo)}
      </td>

      <td>
        ${escaparHTML(
        vehiculo.unidad || 'Sin asignar'
      )}
      </td>

      <td>

        <span class="badge ${claseEstado(vehiculo.estado)}">

          ${escaparHTML(vehiculo.estado)}

        </span>

      </td>

      <td>
        ${formatearKm(vehiculo.km)}
      </td>

      <td>

        <div class="vehicle-actions">

          <button
            type="button"
            class="btn soft vehicle-detail-btn"
            data-id="${vehiculo.id}"
          >
            Ver
          </button>

          <button
            type="button"
            class="btn vehicle-edit-btn"
            data-id="${vehiculo.id}"
          >
            Editar
          </button>

          <button
            type="button"
            class="btn danger vehicle-delete-btn"
            data-id="${vehiculo.id}"
          >
            Eliminar
          </button>

        </div>

      </td>

    `;


      vehicleBody.appendChild(row);

    });


    applyVehicleFilters();

  }


  /* =========================================================
     NUEVO VEHÍCULO
  ========================================================= */

  function nuevoVehiculo() {

    vehiculoForm.reset();

    camposVehiculo.id.value = '';

    camposVehiculo.estado.value =
      'Bueno';

    fotosVehiculoActual = {};
    renderFotosVehiculo();


    vehiculoModalTitulo.textContent =
      'Registrar vehículo';

    btnGuardarVehiculo.textContent =
      'Guardar vehículo';


    openModal(
      'vehiculoModal'
    );


    setTimeout(function () {

      camposVehiculo.placa.focus();

    }, 100);

  }


  /* =========================================================
     EDITAR VEHÍCULO
  ========================================================= */

  function editarVehiculo(id) {

    var vehiculo =
      vehiculos.find(function (v) {

        return v.id === id;

      });


    if (!vehiculo) {
      return;
    }


    camposVehiculo.id.value =
      vehiculo.id;

    camposVehiculo.placa.value =
      vehiculo.placa || '';

    camposVehiculo.placaDnfr.value =
      vehiculo.placaDnfr || '';

    camposVehiculo.tipo.value =
      vehiculo.tipo || '';

    camposVehiculo.marca.value =
      vehiculo.marca || '';

    camposVehiculo.modelo.value =
      vehiculo.modelo || '';

    camposVehiculo.anio.value =
      vehiculo.anio || '';

    camposVehiculo.chasis.value =
      vehiculo.chasis || '';

    camposVehiculo.motor.value =
      vehiculo.motor || '';

    camposVehiculo.color.value =
      vehiculo.color || '';

    camposVehiculo.pais.value =
      vehiculo.pais || '';

    camposVehiculo.fuente.value =
      vehiculo.fuente || '';

    camposVehiculo.unidad.value =
      vehiculo.unidad || '';

    camposVehiculo.estado.value =
      vehiculo.estado || 'Bueno';

    camposVehiculo.km.value =
      vehiculo.km || '';

    camposVehiculo.observaciones.value =
      vehiculo.observaciones || '';

    fotosVehiculoActual = Object.assign({}, vehiculo.fotos || {});
    renderFotosVehiculo();


    vehiculoModalTitulo.textContent =
      'Editar vehículo';

    btnGuardarVehiculo.textContent =
      'Guardar cambios';


    openModal(
      'vehiculoModal'
    );

  }


  /* =========================================================
     GUARDAR / ACTUALIZAR
  ========================================================= */

  function procesarVehiculo(event) {

    event.preventDefault();


    var id =
      camposVehiculo.id.value;


    var placa =
      camposVehiculo
        .placa
        .value
        .trim()
        .toUpperCase();


    var marca =
      camposVehiculo
        .marca
        .value
        .trim();


    var modelo =
      camposVehiculo
        .modelo
        .value
        .trim();


    if (
      !placa ||
      !marca ||
      !modelo ||
      !camposVehiculo.tipo.value
    ) {

      toast(
        'Complete los campos obligatorios'
      );

      return;

    }

    var fotosFaltantes = fotosFaltantesVehiculo();

    if (fotosFaltantes.length) {
      toast(
        'Faltan fotografías: ' + fotosFaltantes.map(function (foto) { return foto.label; }).join(', ')
      );
      if (vehiculoPhotoGrid) {
        vehiculoPhotoGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }


    /* Validar placa duplicada */

    var duplicado =
      vehiculos.some(function (v) {

        return (
          v.placa.toUpperCase() === placa &&
          v.id !== id
        );

      });


    if (duplicado) {

      toast(
        'Ya existe un vehículo con esa placa'
      );

      camposVehiculo.placa.focus();

      return;

    }


    var datos = {

      id:
        id || (
          'vehiculo-' +
          Date.now()
        ),

      placa:
        placa,

      placaDnfr:
        camposVehiculo
          .placaDnfr
          .value
          .trim()
          .toUpperCase(),

      tipo:
        camposVehiculo.tipo.value,

      marca:
        marca,

      modelo:
        modelo,

      anio:
        camposVehiculo.anio.value,

      chasis:
        camposVehiculo
          .chasis
          .value
          .trim()
          .toUpperCase(),

      motor:
        camposVehiculo
          .motor
          .value
          .trim()
          .toUpperCase(),

      color:
        camposVehiculo
          .color
          .value
          .trim(),

      pais:
        camposVehiculo
          .pais
          .value
          .trim(),

      fuente:
        camposVehiculo
          .fuente
          .value
          .trim(),

      unidad:
        camposVehiculo.unidad.value,

      estado:
        camposVehiculo.estado.value,

      km:
        camposVehiculo.km.value || '0',

      observaciones:
        camposVehiculo
          .observaciones
          .value
          .trim(),

      fotos:
        fotosParaGuardar()

    };


    /* UPDATE */

    if (id) {

      var indice =
        vehiculos.findIndex(
          function (v) {

            return v.id === id;

          }
        );


      if (indice !== -1) {

        vehiculos[indice] =
          datos;

      }


      toast(
        'Vehículo actualizado correctamente'
      );

    }

    /* CREATE */

    else {

      vehiculos.push(
        datos
      );


      toast(
        'Vehículo registrado correctamente'
      );

    }


    guardarVehiculos();

    renderVehiculos();

    closeAllModals();

  }


  /* =========================================================
     ELIMINAR
  ========================================================= */

  function eliminarVehiculo(id) {

    var vehiculo =
      vehiculos.find(function (v) {

        return v.id === id;

      });


    if (!vehiculo) {
      return;
    }


    var confirmar =
      window.confirm(
        '¿Está seguro de eliminar el vehículo ' +
        vehiculo.placa +
        '?'
      );


    if (!confirmar) {
      return;
    }


    vehiculos =
      vehiculos.filter(
        function (v) {

          return v.id !== id;

        }
      );


    guardarVehiculos();

    renderVehiculos();


    toast(
      'Vehículo eliminado correctamente'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function applyVehicleFilters() {

    if (
      !vehicleTable ||
      !vSearch ||
      !vUnit ||
      !vState
    ) {
      return;
    }


    var q =
      vSearch
        .value
        .trim()
        .toLowerCase();

    var unit =
      vUnit.value;

    var state =
      vState.value;


    vehicleBody
      .querySelectorAll('tr')
      .forEach(function (row) {

        var text =
          row.textContent.toLowerCase();

        var okQ =
          !q ||
          text.indexOf(q) !== -1;

        var okUnit =
          !unit ||
          row.dataset.unit === unit;

        var okState =
          !state ||
          row.dataset.state === state;


        row.style.display =
          (
            okQ &&
            okUnit &&
            okState
          )
            ? ''
            : 'none';

      });

  }


  /* =========================================================
     EVENTOS CRUD
  ========================================================= */

  if (btnNuevoVehiculo) {

    btnNuevoVehiculo.addEventListener(
      'click',
      nuevoVehiculo
    );

  }


  if (vehiculoForm) {

    vehiculoForm.addEventListener(
      'submit',
      procesarVehiculo
    );

  }


  if (vehicleBody) {

    vehicleBody.addEventListener(
      'click',
      function (event) {

        var botonVer =
          event.target.closest(
            '.vehicle-detail-btn'
          );

        var botonEditar =
          event.target.closest(
            '.vehicle-edit-btn'
          );

        var botonEliminar =
          event.target.closest(
            '.vehicle-delete-btn'
          );


        if (botonVer) {

          verFichaVehiculo(
            botonVer.dataset.id
          );

          return;

        }


        if (botonEditar) {

          editarVehiculo(
            botonEditar.dataset.id
          );

          return;

        }


        if (botonEliminar) {

          eliminarVehiculo(
            botonEliminar.dataset.id
          );

        }

      }
    );

  }


  if (vSearch) {

    [
      vSearch,
      vUnit,
      vState
    ].forEach(function (elemento) {

      elemento.addEventListener(
        'input',
        applyVehicleFilters
      );

      elemento.addEventListener(
        'change',
        applyVehicleFilters
      );

    });

  }


  /* =========================================================
     READ - FICHA DEL VEHÍCULO
  ========================================================= */

  var drawer =
    document.getElementById(
      'vehicleDrawer'
    );


  var drawerData = {

    general:
      function (vehiculo) {

        return `

        <h4>Información general</h4>

        <div
          class="info-grid"
          style="grid-template-columns:1fr 1fr;"
        >

          <div class="info">
            <span>Placa</span>
            <strong>
              ${escaparHTML(vehiculo.placa)}
            </strong>
          </div>

          <div class="info">
            <span>Placa DNFR</span>
            <strong>
              ${escaparHTML(
          vehiculo.placaDnfr || '—'
        )}
            </strong>
          </div>

          <div class="info">
            <span>Tipo</span>
            <strong>
              ${escaparHTML(
          vehiculo.tipo || '—'
        )}
            </strong>
          </div>

          <div class="info">
            <span>Marca</span>
            <strong>
              ${escaparHTML(vehiculo.marca)}
            </strong>
          </div>

          <div class="info">
            <span>Modelo</span>
            <strong>
              ${escaparHTML(vehiculo.modelo)}
            </strong>
          </div>

          <div class="info">
            <span>Año</span>
            <strong>
              ${escaparHTML(
          vehiculo.anio || '—'
        )}
            </strong>
          </div>

          <div class="info">
            <span>Chasis</span>
            <strong>
              ${escaparHTML(
          vehiculo.chasis || '—'
        )}
            </strong>
          </div>

          <div class="info">
            <span>Motor</span>
            <strong>
              ${escaparHTML(
          vehiculo.motor || '—'
        )}
            </strong>
          </div>

          <div class="info">
            <span>Color</span>
            <strong>
              ${escaparHTML(
          vehiculo.color || '—'
        )}
            </strong>
          </div>

          <div class="info">
            <span>Unidad</span>
            <strong>
              ${escaparHTML(
          vehiculo.unidad ||
          'Sin asignar'
        )}
            </strong>
          </div>

          <div class="info">
            <span>Estado</span>
            <strong>
              ${escaparHTML(vehiculo.estado)}
            </strong>
          </div>

          <div class="info">
            <span>Último KM</span>
            <strong>
              ${formatearKm(vehiculo.km)}
            </strong>
          </div>

        </div>


        ${vehiculo.observaciones
            ? `

              <h4 style="margin-top:20px;">
                Observaciones
              </h4>

              <div class="mini-card">
                ${escaparHTML(
              vehiculo.observaciones
            )}
              </div>

            `
            : ''
          }

        ${renderGaleriaVehiculo(vehiculo)}

      `;

      },


    asignaciones:
      function () {

        return `
        <h4>Asignaciones</h4>
        <div class="mini-card">
          Información de asignaciones del vehículo.
        </div>
      `;

      },


    conductores:
      function () {

        return `
        <h4>Conductores asociados</h4>
        <div class="mini-card">
          Información de conductores asociados.
        </div>
      `;

      },


    recorridos:
      function () {

        return `
        <h4>Recorridos</h4>
        <div class="mini-card">
          Historial de recorridos del vehículo.
        </div>
      `;

      },


    combustible:
      function () {

        return `
        <h4>Combustible</h4>
        <div class="mini-card">
          Historial de abastecimientos.
        </div>
      `;

      },


    mantenimiento:
      function () {

        return `
        <h4>Mantenimiento</h4>
        <div class="mini-card">
          Historial de mantenimientos.
        </div>
      `;

      },


    documentos:
      function () {

        return `
        <h4>Documentación</h4>
        <div class="mini-card">
          Documentación asociada al vehículo.
        </div>
      `;

      },


    incidentes:
      function () {

        return `
        <h4>Incidentes</h4>
        <div class="mini-card">
          Incidentes registrados para el vehículo.
        </div>
      `;

      }

  };


  /* =========================================================
     ABRIR FICHA
  ========================================================= */

  function verFichaVehiculo(id) {

    var vehiculo =
      vehiculos.find(function (v) {

        return v.id === id;

      });


    if (
      !vehiculo ||
      !drawer
    ) {
      return;
    }


    drawer.dataset.vehicleId =
      vehiculo.id;


    document
      .getElementById('drawerTitle')
      .textContent =
      vehiculo.placa +
      ' · ' +
      vehiculo.marca +
      ' ' +
      vehiculo.modelo;


    document
      .getElementById('drawerSubtitle')
      .textContent =
      'Información centralizada e historial de la movilidad';


    drawer
      .querySelectorAll('.drawer-tab')
      .forEach(function (tab) {

        tab.classList.remove(
          'active'
        );

      });


    var tabGeneral =
      drawer.querySelector(
        '[data-drawer-tab="general"]'
      );


    if (tabGeneral) {

      tabGeneral.classList.add(
        'active'
      );

    }


    renderDrawerTab(
      'general',
      vehiculo
    );


    drawer.classList.add(
      'show'
    );

    overlay.classList.add(
      'show'
    );

  }


  /* =========================================================
     RENDER FICHA
  ========================================================= */

  function renderDrawerTab(
    tab,
    vehiculo
  ) {

    if (!vehiculo) {
      return;
    }


    var render =
      drawerData[tab];


    document
      .getElementById('drawerBody')
      .innerHTML =
      render
        ? render(vehiculo)
        : '';

  }


  /* =========================================================
     CERRAR FICHA
  ========================================================= */

  function closeDrawer() {

    if (drawer) {

      drawer.classList.remove(
        'show'
      );

    }

    overlay.classList.remove(
      'show'
    );

  }


  var drawerClose =
    document.getElementById(
      'drawerClose'
    );


  if (drawerClose) {

    drawerClose.addEventListener(
      'click',
      closeDrawer
    );

  }


  /* =========================================================
     TABS DE FICHA
  ========================================================= */

  if (drawer) {

    drawer
      .querySelectorAll('.drawer-tab')
      .forEach(function (tab) {

        tab.addEventListener(
          'click',
          function () {

            drawer
              .querySelectorAll(
                '.drawer-tab'
              )
              .forEach(function (t) {

                t.classList.remove(
                  'active'
                );

              });


            tab.classList.add(
              'active'
            );


            var id =
              drawer.dataset.vehicleId;


            var vehiculo =
              vehiculos.find(
                function (v) {

                  return v.id === id;

                }
              );


            if (!vehiculo) {
              return;
            }


            renderDrawerTab(
              tab.dataset.drawerTab,
              vehiculo
            );

          }
        );

      });

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarVehiculos();

  renderVehiculos();
  renderFotosVehiculo();

  /* =========================================================
   ASIGNACIONES DE UNIDAD
========================================================= */

  var STORAGE_ASIGNACIONES =
    'siv_asignaciones';


  var assignmentTable =
    document.getElementById(
      'assignmentTable'
    );

  var assignmentBody =
    document.getElementById(
      'assignmentTableBody'
    );

  var assignmentSearch =
    document.getElementById(
      'assignmentSearch'
    );

  var assignmentStatus =
    document.getElementById(
      'assignmentStatus'
    );


  var btnNuevaAsignacion =
    document.getElementById(
      'btnNuevaAsignacion'
    );


  var asignacionForm =
    document.getElementById(
      'asignacionForm'
    );

  var asignacionModalTitulo =
    document.getElementById(
      'asignacionModalTitulo'
    );

  var btnGuardarAsignacion =
    document.getElementById(
      'btnGuardarAsignacion'
    );


  var reasignacionForm =
    document.getElementById(
      'reasignacionForm'
    );


  /* =========================================================
     CAMPOS
  ========================================================= */

  var camposAsignacion = {

    id:
      document.getElementById(
        'asignacionId'
      ),

    vehiculo:
      document.getElementById(
        'asignacionVehiculo'
      ),

    unidad:
      document.getElementById(
        'asignacionUnidad'
      ),

    inicio:
      document.getElementById(
        'asignacionFechaInicio'
      ),

    fin:
      document.getElementById(
        'asignacionFechaFin'
      ),

    documento:
      document.getElementById(
        'asignacionDocumento'
      ),

    motivo:
      document.getElementById(
        'asignacionMotivo'
      ),

    observaciones:
      document.getElementById(
        'asignacionObservaciones'
      )

  };


  /* =========================================================
     DATOS INICIALES
  ========================================================= */

  var asignacionesIniciales = [

    {
      id: 'asignacion-1',

      vehiculoId: 'vehiculo-1',
      vehiculoPlaca: '6417-PBT',

      unidad: 'EPI 3',

      fechaInicio: '2026-06-01',
      fechaFin: '',

      motivo: 'Necesidad operativa',

      documento: 'ACT-041/2026',

      observaciones: ''
    },


    {
      id: 'asignacion-2',

      vehiculoId: 'vehiculo-2',
      vehiculoPlaca: '3821-ABC',

      unidad: 'UTOP',

      fechaInicio: '2026-01-12',
      fechaFin: '',

      motivo: 'Patrullaje preventivo',

      documento: 'ACT-008/2026',

      observaciones: ''
    },


    {
      id: 'asignacion-3',

      vehiculoId: 'vehiculo-3',
      vehiculoPlaca: '5510-XRT',

      unidad: 'EPI 2',

      fechaInicio: '2025-03-05',
      fechaFin: '2026-05-31',

      motivo: 'Reasignación',

      documento: 'ACT-119/2025',

      observaciones: ''
    }

  ];


  var asignaciones = [];


  /* =========================================================
     CARGAR ASIGNACIONES
  ========================================================= */

  function cargarAsignaciones() {

    var datos =
      localStorage.getItem(
        STORAGE_ASIGNACIONES
      );


    if (datos) {

      try {

        asignaciones =
          JSON.parse(datos);

        return;

      }
      catch (error) {

        console.error(
          'Error cargando asignaciones:',
          error
        );

      }

    }


    asignaciones =
      asignacionesIniciales.slice();


    guardarAsignaciones();

  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  function guardarAsignaciones() {

    localStorage.setItem(

      STORAGE_ASIGNACIONES,

      JSON.stringify(
        asignaciones
      )

    );

  }


  /* =========================================================
     OBTENER VEHÍCULOS
  ========================================================= */

  function obtenerVehiculosAsignacion() {

    var datos =
      localStorage.getItem(
        'siv_vehiculos'
      );


    if (datos) {

      try {

        var lista =
          JSON.parse(datos);

        if (
          Array.isArray(lista) &&
          lista.length
        ) {

          return lista;

        }

      }
      catch (error) {

        console.error(
          'Error cargando vehículos:',
          error
        );

      }

    }


    /*
     * Fallback por si todavía no existe
     * el CRUD de vehículos.
     */

    return [

      {
        id: 'vehiculo-1',
        placa: '6417-PBT',
        marca: 'Nissan',
        modelo: 'Frontier'
      },

      {
        id: 'vehiculo-2',
        placa: '3821-ABC',
        marca: 'Toyota',
        modelo: 'Hilux'
      },

      {
        id: 'vehiculo-3',
        placa: '5510-XRT',
        marca: 'Suzuki',
        modelo: 'Grand Vitara'
      },

      {
        id: 'vehiculo-4',
        placa: '2298-KLM',
        marca: 'Nissan',
        modelo: 'Patrol'
      },

      {
        id: 'vehiculo-5',
        placa: '7741-KZA',
        marca: 'Toyota',
        modelo: 'Corolla'
      }

    ];

  }


  /* =========================================================
     BUSCAR VEHÍCULO
  ========================================================= */

  function buscarVehiculoAsignacion(
    vehiculoId
  ) {

    return obtenerVehiculosAsignacion()
      .find(function (vehiculo) {

        return (
          vehiculo.id === vehiculoId
        );

      });

  }


  /* =========================================================
     NOMBRE DEL VEHÍCULO
  ========================================================= */

  function obtenerNombreVehiculo(
    asignacion
  ) {

    var vehiculo =
      buscarVehiculoAsignacion(
        asignacion.vehiculoId
      );


    if (vehiculo) {

      return (
        vehiculo.placa +
        ' · ' +
        vehiculo.marca +
        ' ' +
        vehiculo.modelo
      );

    }


    return (
      asignacion.vehiculoPlaca ||
      'Vehículo'
    );

  }


  /* =========================================================
     CARGAR SELECT DE VEHÍCULOS
  ========================================================= */

  function cargarSelectVehiculos() {

    if (
      !camposAsignacion.vehiculo
    ) {
      return;
    }


    var vehiculos =
      obtenerVehiculosAsignacion();


    camposAsignacion.vehiculo.innerHTML =
      '<option value="">Seleccionar vehículo</option>';


    vehiculos.forEach(
      function (vehiculo) {

        var option =
          document.createElement(
            'option'
          );


        option.value =
          vehiculo.id;


        option.textContent =
          vehiculo.placa +
          ' · ' +
          vehiculo.marca +
          ' ' +
          vehiculo.modelo;


        option.dataset.placa =
          vehiculo.placa;


        camposAsignacion
          .vehiculo
          .appendChild(option);

      }
    );

  }


  /* =========================================================
     ESTADO
  ========================================================= */

  function estadoAsignacion(
    asignacion
  ) {

    return asignacion.fechaFin
      ? 'HISTORICA'
      : 'ACTUAL';

  }


  /* =========================================================
     FORMATEAR FECHA
  ========================================================= */

  function formatearFechaAsignacion(
    fecha
  ) {

    if (!fecha) {
      return '—';
    }


    var partes =
      fecha.split('-');


    if (partes.length !== 3) {
      return fecha;
    }


    return (
      partes[2] +
      '/' +
      partes[1] +
      '/' +
      partes[0]
    );

  }


  /* =========================================================
     FECHA ACTUAL LOCAL
  ========================================================= */

  function fechaLocalActual() {

    var fecha =
      new Date();


    var anio =
      fecha.getFullYear();

    var mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    var dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');


    return (
      anio +
      '-' +
      mes +
      '-' +
      dia
    );

  }


  /* =========================================================
     ESCAPAR HTML
  ========================================================= */

  function escaparAsignacionHTML(
    valor
  ) {

    return String(
      valor || ''
    )

      .replace(
        /&/g,
        '&amp;'
      )

      .replace(
        /</g,
        '&lt;'
      )

      .replace(
        />/g,
        '&gt;'
      )

      .replace(
        /"/g,
        '&quot;'
      )

      .replace(
        /'/g,
        '&#039;'
      );

  }


  /* =========================================================
     RENDERIZAR TABLA
  ========================================================= */

  function renderAsignaciones() {

    if (!assignmentBody) {
      return;
    }


    assignmentBody.innerHTML =
      '';


    asignaciones.forEach(
      function (asignacion) {

        var estado =
          estadoAsignacion(
            asignacion
          );


        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          asignacion.id;

        row.dataset.status =
          estado;


        var acciones = `

        <div class="assignment-actions">

          <button
            type="button"
            class="btn soft assignment-view"
            data-id="${asignacion.id}"
          >
            Ver
          </button>

          <button
            type="button"
            class="btn assignment-edit"
            data-id="${asignacion.id}"
          >
            Corregir
          </button>

      `;


        /*
         * Solo una asignación vigente
         * puede ser reasignada.
         */

        if (estado === 'ACTUAL') {

          acciones += `

          <button
            type="button"
            class="btn reassign assignment-reassign"
            data-id="${asignacion.id}"
          >
            Reasignar
          </button>

        `;

        }


        acciones += '</div>';


        row.innerHTML = `

        <td>
          <strong>
            ${escaparAsignacionHTML(
          asignacion.vehiculoPlaca
        )}
          </strong>
        </td>

        <td>
          ${escaparAsignacionHTML(
          asignacion.unidad
        )}
        </td>

        <td>
          ${formatearFechaAsignacion(
          asignacion.fechaInicio
        )}
        </td>

        <td>
          ${formatearFechaAsignacion(
          asignacion.fechaFin
        )}
        </td>

        <td>
          ${escaparAsignacionHTML(
          asignacion.motivo || '—'
        )}
        </td>

        <td>
          ${escaparAsignacionHTML(
          asignacion.documento || '—'
        )}
        </td>

        <td>

          <span
            class="badge ${estado === 'ACTUAL'
            ? 'green'
            : 'orange'
          }"
          >

            ${estado === 'ACTUAL'
            ? 'Actual'
            : 'Histórica'
          }

          </span>

        </td>

        <td>
          ${acciones}
        </td>

      `;


        assignmentBody.appendChild(
          row
        );

      }
    );


    applyAssignmentFilters();

  }


  /* =========================================================
     NUEVA ASIGNACIÓN
  ========================================================= */

  function nuevaAsignacion() {

    asignacionForm.reset();


    camposAsignacion.id.value =
      '';


    camposAsignacion.vehiculo.disabled =
      false;

    camposAsignacion.unidad.disabled =
      false;


    camposAsignacion.inicio.value =
      fechaLocalActual();


    asignacionModalTitulo.textContent =
      'Nueva asignación';


    btnGuardarAsignacion.textContent =
      'Guardar asignación';


    cargarSelectVehiculos();


    openModal(
      'asignacionModal'
    );

  }


  /* =========================================================
     CORREGIR ASIGNACIÓN
  ========================================================= */

  function corregirAsignacion(id) {

    var asignacion =
      asignaciones.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!asignacion) {
      return;
    }


    cargarSelectVehiculos();


    camposAsignacion.id.value =
      asignacion.id;


    camposAsignacion.vehiculo.value =
      asignacion.vehiculoId;


    camposAsignacion.unidad.value =
      asignacion.unidad;


    camposAsignacion.inicio.value =
      asignacion.fechaInicio;


    camposAsignacion.fin.value =
      asignacion.fechaFin || '';


    camposAsignacion.documento.value =
      asignacion.documento || '';


    camposAsignacion.motivo.value =
      asignacion.motivo || '';


    camposAsignacion.observaciones.value =
      asignacion.observaciones || '';


    /*
     * En una corrección NO se cambia
     * vehículo ni unidad.
     */

    camposAsignacion.vehiculo.disabled =
      true;

    camposAsignacion.unidad.disabled =
      true;


    asignacionModalTitulo.textContent =
      'Corregir asignación';


    btnGuardarAsignacion.textContent =
      'Guardar corrección';


    openModal(
      'asignacionModal'
    );

  }


  /* =========================================================
     GUARDAR NUEVA / CORRECCIÓN
  ========================================================= */

  function procesarAsignacion(
    event
  ) {

    event.preventDefault();


    var id =
      camposAsignacion.id.value;


    var fechaInicio =
      camposAsignacion.inicio.value;


    var fechaFin =
      camposAsignacion.fin.value;


    /*
     * Validar fechas
     */

    if (
      fechaFin &&
      fechaFin < fechaInicio
    ) {

      toast(
        'La fecha de fin no puede ser anterior a la fecha de inicio'
      );

      return;

    }


    /*
     * CORRECCIÓN
     */

    if (id) {

      var indice =
        asignaciones.findIndex(
          function (item) {

            return item.id === id;

          }
        );


      if (indice === -1) {
        return;
      }


      var original =
        asignaciones[indice];


      /*
       * Si se convierte una asignación
       * histórica nuevamente en actual,
       * verificar que no exista otra actual.
       */

      if (!fechaFin) {

        var otraActual =
          asignaciones.some(
            function (item) {

              return (
                item.id !== id &&
                item.vehiculoId ===
                original.vehiculoId &&
                !item.fechaFin
              );

            }
          );


        if (otraActual) {

          toast(
            'El vehículo ya tiene otra asignación actual'
          );

          return;

        }

      }


      original.fechaInicio =
        fechaInicio;


      original.fechaFin =
        fechaFin;


      original.documento =
        camposAsignacion
          .documento
          .value
          .trim();


      original.motivo =
        camposAsignacion
          .motivo
          .value
          .trim();


      original.observaciones =
        camposAsignacion
          .observaciones
          .value
          .trim();


      guardarAsignaciones();

      sincronizarUnidadVehiculo(
        original.vehiculoId
      );

      renderAsignaciones();

      closeAllModals();


      toast(
        'Asignación corregida correctamente'
      );


      return;

    }


    /*
     * NUEVA ASIGNACIÓN
     */

    var vehiculoId =
      camposAsignacion.vehiculo.value;


    var unidad =
      camposAsignacion.unidad.value;


    if (
      !vehiculoId ||
      !unidad ||
      !fechaInicio
    ) {

      toast(
        'Complete los campos obligatorios'
      );

      return;

    }


    /*
     * No permitir dos asignaciones
     * actuales para el mismo vehículo.
     */

    if (!fechaFin) {

      var asignacionActual =
        asignaciones.find(
          function (item) {

            return (
              item.vehiculoId ===
              vehiculoId &&
              !item.fechaFin
            );

          }
        );


      if (asignacionActual) {

        toast(
          'El vehículo ya tiene una asignación actual. Use Reasignar.'
        );

        return;

      }

    }


    var vehiculo =
      buscarVehiculoAsignacion(
        vehiculoId
      );


    var nueva = {

      id:
        'asignacion-' +
        Date.now(),

      vehiculoId:
        vehiculoId,

      vehiculoPlaca:
        vehiculo
          ? vehiculo.placa
          : '',

      unidad:
        unidad,

      fechaInicio:
        fechaInicio,

      fechaFin:
        fechaFin,

      documento:
        camposAsignacion
          .documento
          .value
          .trim(),

      motivo:
        camposAsignacion
          .motivo
          .value
          .trim(),

      observaciones:
        camposAsignacion
          .observaciones
          .value
          .trim()

    };


    asignaciones.push(
      nueva
    );


    guardarAsignaciones();


    sincronizarUnidadVehiculo(
      vehiculoId
    );


    renderAsignaciones();

    closeAllModals();


    toast(
      'Asignación registrada correctamente'
    );

  }


  /* =========================================================
     VER DETALLE
  ========================================================= */

  function verAsignacion(id) {

    var asignacion =
      asignaciones.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!asignacion) {
      return;
    }


    document
      .getElementById(
        'detalleAsignacionVehiculo'
      )
      .textContent =
      obtenerNombreVehiculo(
        asignacion
      );


    document
      .getElementById(
        'detalleAsignacionUnidad'
      )
      .textContent =
      asignacion.unidad;


    document
      .getElementById(
        'detalleAsignacionInicio'
      )
      .textContent =
      formatearFechaAsignacion(
        asignacion.fechaInicio
      );


    document
      .getElementById(
        'detalleAsignacionFin'
      )
      .textContent =
      formatearFechaAsignacion(
        asignacion.fechaFin
      );


    document
      .getElementById(
        'detalleAsignacionDocumento'
      )
      .textContent =
      asignacion.documento ||
      '—';


    document
      .getElementById(
        'detalleAsignacionEstado'
      )
      .textContent =
      estadoAsignacion(
        asignacion
      ) === 'ACTUAL'
        ? 'Actual'
        : 'Histórica';


    document
      .getElementById(
        'detalleAsignacionMotivo'
      )
      .textContent =
      asignacion.motivo ||
      '—';


    document
      .getElementById(
        'detalleAsignacionObservaciones'
      )
      .textContent =
      asignacion.observaciones ||
      'Sin observaciones';


    openModal(
      'asignacionDetalleModal'
    );

  }


  /* =========================================================
     ABRIR REASIGNACIÓN
  ========================================================= */

  function abrirReasignacion(id) {

    var asignacion =
      asignaciones.find(
        function (item) {

          return item.id === id;

        }
      );


    if (
      !asignacion ||
      asignacion.fechaFin
    ) {
      return;
    }


    reasignacionForm.reset();


    document
      .getElementById(
        'reasignacionAsignacionId'
      )
      .value =
      asignacion.id;


    document
      .getElementById(
        'reasignacionVehiculo'
      )
      .value =
      obtenerNombreVehiculo(
        asignacion
      );


    document
      .getElementById(
        'reasignacionUnidadActual'
      )
      .value =
      asignacion.unidad;


    document
      .getElementById(
        'reasignacionFecha'
      )
      .value =
      fechaLocalActual();


    /*
     * Evitar que la unidad actual
     * quede seleccionada.
     */

    document
      .getElementById(
        'reasignacionNuevaUnidad'
      )
      .value =
      '';


    openModal(
      'reasignacionModal'
    );

  }


  /* =========================================================
     PROCESAR REASIGNACIÓN
  ========================================================= */

  function procesarReasignacion(
    event
  ) {

    event.preventDefault();


    var id =
      document
        .getElementById(
          'reasignacionAsignacionId'
        )
        .value;


    var nuevaUnidad =
      document
        .getElementById(
          'reasignacionNuevaUnidad'
        )
        .value;


    var fecha =
      document
        .getElementById(
          'reasignacionFecha'
        )
        .value;


    var asignacionActual =
      asignaciones.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!asignacionActual) {
      return;
    }


    if (
      !nuevaUnidad ||
      !fecha
    ) {

      toast(
        'Seleccione la nueva unidad y la fecha'
      );

      return;

    }


    if (
      nuevaUnidad ===
      asignacionActual.unidad
    ) {

      toast(
        'La nueva unidad debe ser diferente de la unidad actual'
      );

      return;

    }


    if (
      fecha <
      asignacionActual.fechaInicio
    ) {

      toast(
        'La fecha de reasignación no puede ser anterior al inicio de la asignación'
      );

      return;

    }


    /*
     * 1. CERRAR ASIGNACIÓN ANTERIOR
     */

    asignacionActual.fechaFin =
      fecha;


    /*
     * 2. CREAR NUEVA ASIGNACIÓN
     */

    var nuevaAsignacion = {

      id:
        'asignacion-' +
        Date.now(),

      vehiculoId:
        asignacionActual.vehiculoId,

      vehiculoPlaca:
        asignacionActual.vehiculoPlaca,

      unidad:
        nuevaUnidad,

      fechaInicio:
        fecha,

      fechaFin:
        '',

      documento:
        document
          .getElementById(
            'reasignacionDocumento'
          )
          .value
          .trim(),

      motivo:
        document
          .getElementById(
            'reasignacionMotivo'
          )
          .value
          .trim(),

      observaciones:
        document
          .getElementById(
            'reasignacionObservaciones'
          )
          .value
          .trim()

    };


    asignaciones.push(
      nuevaAsignacion
    );


    guardarAsignaciones();


    /*
     * Actualizar también la unidad
     * actual del vehículo.
     */

    sincronizarUnidadVehiculo(
      asignacionActual.vehiculoId
    );


    renderAsignaciones();

    closeAllModals();


    toast(
      'Vehículo reasignado correctamente'
    );

  }


  /* =========================================================
     SINCRONIZAR UNIDAD CON VEHÍCULOS
  ========================================================= */

  function sincronizarUnidadVehiculo(
    vehiculoId
  ) {

    var datos =
      localStorage.getItem(
        'siv_vehiculos'
      );


    if (!datos) {
      return;
    }


    try {

      var vehiculos =
        JSON.parse(datos);


      var vehiculo =
        vehiculos.find(
          function (item) {

            return item.id === vehiculoId;

          }
        );


      if (!vehiculo) {
        return;
      }


      /*
       * Buscar la asignación actual.
       */

      var actual =
        asignaciones.find(
          function (item) {

            return (
              item.vehiculoId ===
              vehiculoId &&
              !item.fechaFin
            );

          }
        );


      vehiculo.unidad =
        actual
          ? actual.unidad
          : '';


      localStorage.setItem(

        'siv_vehiculos',

        JSON.stringify(
          vehiculos
        )

      );

    }
    catch (error) {

      console.error(
        'Error sincronizando vehículo:',
        error
      );

    }

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function applyAssignmentFilters() {

    if (
      !assignmentBody
    ) {
      return;
    }


    var texto =
      assignmentSearch
        ? assignmentSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var estado =
      assignmentStatus
        ? assignmentStatus.value
        : '';


    assignmentBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =
            !texto ||
            row
              .textContent
              .toLowerCase()
              .indexOf(texto) !== -1;


          var coincideEstado =
            !estado ||
            row.dataset.status ===
            estado;


          row.style.display =
            (
              coincideTexto &&
              coincideEstado
            )
              ? ''
              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevaAsignacion) {

    btnNuevaAsignacion
      .addEventListener(
        'click',
        nuevaAsignacion
      );

  }


  if (asignacionForm) {

    asignacionForm
      .addEventListener(
        'submit',
        procesarAsignacion
      );

  }


  if (reasignacionForm) {

    reasignacionForm
      .addEventListener(
        'submit',
        procesarReasignacion
      );

  }


  /* Eventos dinámicos de tabla */

  if (assignmentBody) {

    assignmentBody
      .addEventListener(
        'click',
        function (event) {

          var ver =
            event.target.closest(
              '.assignment-view'
            );


          var editar =
            event.target.closest(
              '.assignment-edit'
            );


          var reasignar =
            event.target.closest(
              '.assignment-reassign'
            );


          if (ver) {

            verAsignacion(
              ver.dataset.id
            );

            return;

          }


          if (editar) {

            corregirAsignacion(
              editar.dataset.id
            );

            return;

          }


          if (reasignar) {

            abrirReasignacion(
              reasignar.dataset.id
            );

          }

        }
      );

  }


  /* Filtros */

  if (assignmentSearch) {

    assignmentSearch
      .addEventListener(
        'input',
        applyAssignmentFilters
      );

  }


  if (assignmentStatus) {

    assignmentStatus
      .addEventListener(
        'change',
        applyAssignmentFilters
      );

  }


  /* =========================================================
     INICIALIZACIÓN
  ========================================================= */

  cargarAsignaciones();

  cargarSelectVehiculos();

  renderAsignaciones();


  /* ---------- Report / export buttons ---------- */
  document.querySelectorAll('[data-report]').forEach(function (btn) {
    btn.addEventListener('click', function () { toast('Generando reporte...'); });
  });
  document.querySelectorAll('[data-toast]:not(.demo-save)').forEach(function (btn) {
    btn.addEventListener('click', function () { toast(btn.dataset.toast); });
  });

  /* ---------- Install banner / PWA ---------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBanner').classList.add('show');
  });
  function tryInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt = null;
    } else {
      toast('Usa el menú del navegador para instalar la aplicación');
    }
  }
  ['installTopBtn', 'installBannerBtn', 'installPageBtn'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', tryInstall);
  });

  /* ---------- Service worker (PWA offline) ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./service-worker.js').catch(function () { });
    });
  }

  /* ---------- Online / offline ---------- */
  function syncNet() {
    var pill = document.getElementById('netStatus');
    var box = document.getElementById('offlineBox');
    if (navigator.onLine) {
      pill.textContent = 'En línea';
      pill.classList.remove('offline');
      box.classList.remove('show');
    } else {
      pill.textContent = 'Sin conexión';
      pill.classList.add('offline');
      box.classList.add('show');
    }
  }
  window.addEventListener('online', syncNet);
  window.addEventListener('offline', syncNet);
  syncNet();

  /* ---------- Global search (dashboard convenience) ---------- */
  document.getElementById('globalSearch').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && this.value.trim()) {
      document.querySelector('.nav button[data-page="vehiculos"]').click();
      var vs = document.getElementById('vehicleSearch');
      vs.value = this.value;
      vs.dispatchEvent(new Event('input'));
    }
  });

  /* =========================================================
   CRUD CONDUCTORES
========================================================= */

  var STORAGE_CONDUCTORES = 'siv_conductores';

  var conductorTable =
    document.getElementById('conductorTable');

  var conductorBody =
    document.getElementById('conductorTableBody');

  var conductorSearch =
    document.getElementById('conductorSearch');

  var conductorUnitFilter =
    document.getElementById('conductorUnitFilter');

  var conductorStateFilter =
    document.getElementById('conductorStateFilter');

  var btnNuevoConductor =
    document.getElementById('btnNuevoConductor');

  var conductorForm =
    document.getElementById('conductorForm');

  var conductorModalTitulo =
    document.getElementById('conductorModalTitulo');

  var btnGuardarConductor =
    document.getElementById('btnGuardarConductor');


  /* =========================================================
     CAMPOS
  ========================================================= */

  var camposConductor = {

    id:
      document.getElementById('conductorId'),

    ci:
      document.getElementById('conductorCi'),

    grado:
      document.getElementById('conductorGrado'),

    nombres:
      document.getElementById('conductorNombres'),

    apellidos:
      document.getElementById('conductorApellidos'),

    licencia:
      document.getElementById('conductorLicencia'),

    categoria:
      document.getElementById('conductorCategoria'),

    vencimiento:
      document.getElementById('conductorVencimiento'),

    unidad:
      document.getElementById('conductorUnidad'),

    telefono:
      document.getElementById('conductorTelefono'),

    observaciones:
      document.getElementById('conductorObservaciones')

  };


  /* =========================================================
     DATOS INICIALES
  ========================================================= */

  var conductoresIniciales = [

    {
      id: 'conductor-1',
      ci: '1234567',
      grado: 'Sgto.',
      nombres: 'Juan',
      apellidos: 'Pérez',
      licencia: 'LIC-001',
      categoria: 'C',
      vencimiento: '2028-05-20',
      unidad: 'UTOP',
      telefono: '71234567',
      estado: 'ACTIVO',

      vehiculosAsociados: [
        '3821-ABC'
      ],

      observaciones: ''
    },

    {
      id: 'conductor-2',
      ci: '2345678',
      grado: 'Sgto.',
      nombres: 'Carlos',
      apellidos: 'Mamani',
      licencia: 'LIC-002',
      categoria: 'C',
      vencimiento: '2027-11-10',
      unidad: 'Rural',
      telefono: '72345678',
      estado: 'ACTIVO',

      vehiculosAsociados: [
        '6417-PBT'
      ],

      observaciones: ''
    },

    {
      id: 'conductor-3',
      ci: '3456789',
      grado: 'Tte.',
      nombres: 'Pedro',
      apellidos: 'López',
      licencia: 'LIC-003',
      categoria: 'B',
      vencimiento: '2029-02-15',
      unidad: 'FELCC',
      telefono: '73456789',
      estado: 'ACTIVO',

      vehiculosAsociados: [
        '5510-XRT'
      ],

      observaciones: ''
    }

  ];


  var conductores = [];


  /* =========================================================
     CARGAR CONDUCTORES
  ========================================================= */

  function cargarConductores() {

    var datos =
      localStorage.getItem(
        STORAGE_CONDUCTORES
      );


    if (datos) {

      try {

        var resultado =
          JSON.parse(datos);

        if (Array.isArray(resultado)) {

          conductores = resultado;

          return;

        }

      }
      catch (error) {

        console.error(
          'Error cargando conductores:',
          error
        );

      }

    }


    conductores =
      conductoresIniciales.map(
        function (conductor) {

          return {
            ...conductor,
            vehiculosAsociados:
              [
                ...(
                  conductor.vehiculosAsociados || []
                )
              ]
          };

        }
      );


    guardarConductores();

  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  function guardarConductores() {

    localStorage.setItem(

      STORAGE_CONDUCTORES,

      JSON.stringify(
        conductores
      )

    );

  }


  /* =========================================================
     ESCAPAR HTML
  ========================================================= */

  function escaparConductorHTML(valor) {

    return String(valor ?? '')

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#039;');

  }


  /* =========================================================
     NOMBRE COMPLETO
  ========================================================= */

  function nombreCompletoConductor(conductor) {

    return (
      (conductor.nombres || '') +
      ' ' +
      (conductor.apellidos || '')
    ).trim();

  }


  /* =========================================================
     FORMATEAR FECHA
  ========================================================= */

  function formatearFechaConductor(fecha) {

    if (!fecha) {
      return '—';
    }


    var partes =
      fecha.split('-');


    if (partes.length !== 3) {
      return fecha;
    }


    return (
      partes[2] +
      '/' +
      partes[1] +
      '/' +
      partes[0]
    );

  }


  /* =========================================================
     VEHÍCULOS ASOCIADOS
  ========================================================= */

  function textoVehiculosConductor(conductor) {

    if (
      !conductor.vehiculosAsociados ||
      conductor.vehiculosAsociados.length === 0
    ) {

      return '—';

    }


    return conductor
      .vehiculosAsociados
      .join(' · ');

  }


  /* =========================================================
     RENDERIZAR TABLA
  ========================================================= */

  function renderConductores() {

    if (!conductorBody) {
      return;
    }


    conductorBody.innerHTML = '';


    conductores.forEach(
      function (conductor) {

        var activo =
          conductor.estado === 'ACTIVO';


        var row =
          document.createElement('tr');


        row.dataset.id =
          conductor.id;

        row.dataset.unit =
          conductor.unidad || '';

        row.dataset.state =
          conductor.estado;


        row.innerHTML = `

        <td>
          <strong>
            ${escaparConductorHTML(conductor.ci)}
          </strong>
        </td>

        <td>
          ${escaparConductorHTML(
          nombreCompletoConductor(conductor)
        )}
        </td>

        <td>
          ${escaparConductorHTML(
          conductor.grado || '—'
        )}
        </td>

        <td>
          ${escaparConductorHTML(
          conductor.licencia || '—'
        )}
        </td>

        <td>
          ${escaparConductorHTML(
          conductor.unidad || 'Sin asignar'
        )}
        </td>

        <td>
          ${escaparConductorHTML(
          textoVehiculosConductor(conductor)
        )}
        </td>

        <td>

          <span
            class="badge ${activo
            ? 'green'
            : 'gray'
          }"
          >

            ${activo
            ? 'Activo'
            : 'Inactivo'
          }

          </span>

        </td>

        <td>

          <div class="conductor-actions">

            <button
              type="button"
              class="btn soft conductor-view"
              data-id="${conductor.id}"
            >
              Ver
            </button>

            <button
              type="button"
              class="btn conductor-edit"
              data-id="${conductor.id}"
            >
              Editar
            </button>

            ${activo

            ? `

                  <button
                    type="button"
                    class="btn deactivate conductor-toggle"
                    data-id="${conductor.id}"
                  >
                    Desactivar
                  </button>

                `

            : `

                  <button
                    type="button"
                    class="btn activate conductor-toggle"
                    data-id="${conductor.id}"
                  >
                    Activar
                  </button>

                `
          }

          </div>

        </td>

      `;


        conductorBody.appendChild(row);

      }
    );


    aplicarFiltrosConductores();

  }


  /* =========================================================
     NUEVO CONDUCTOR
  ========================================================= */

  function nuevoConductor() {

    if (!conductorForm) {
      return;
    }


    conductorForm.reset();


    camposConductor.id.value = '';


    /*
     * CI editable únicamente
     * cuando se crea el registro.
     */

    camposConductor.ci.readOnly =
      false;


    conductorModalTitulo.textContent =
      'Registrar conductor';


    btnGuardarConductor.textContent =
      'Guardar conductor';


    openModal(
      'conductorModal'
    );


    setTimeout(
      function () {

        camposConductor.ci.focus();

      },
      100
    );

  }


  /* =========================================================
     EDITAR CONDUCTOR
  ========================================================= */

  function editarConductor(id) {

    var conductor =
      conductores.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!conductor) {

      toast(
        'No se encontró el conductor'
      );

      return;

    }


    camposConductor.id.value =
      conductor.id;

    camposConductor.ci.value =
      conductor.ci || '';

    camposConductor.grado.value =
      conductor.grado || '';

    camposConductor.nombres.value =
      conductor.nombres || '';

    camposConductor.apellidos.value =
      conductor.apellidos || '';

    camposConductor.licencia.value =
      conductor.licencia || '';

    camposConductor.categoria.value =
      conductor.categoria || '';

    camposConductor.vencimiento.value =
      conductor.vencimiento || '';

    camposConductor.unidad.value =
      conductor.unidad || '';

    camposConductor.telefono.value =
      conductor.telefono || '';

    camposConductor.observaciones.value =
      conductor.observaciones || '';


    /*
     * El CI identifica al conductor.
     * No permitimos modificarlo directamente.
     */

    camposConductor.ci.readOnly =
      true;


    conductorModalTitulo.textContent =
      'Editar conductor';


    btnGuardarConductor.textContent =
      'Guardar cambios';


    openModal(
      'conductorModal'
    );

  }


  /* =========================================================
     VALIDAR CONDUCTOR
  ========================================================= */

  function validarConductor(
    id,
    ci,
    licencia,
    telefono
  ) {

    /*
     * CI
     */

    if (!/^\d+$/.test(ci)) {

      toast(
        'El CI debe contener solamente números'
      );

      camposConductor.ci.focus();

      return false;

    }


    /*
     * Teléfono
     */

    if (
      telefono &&
      !/^\d{8}$/.test(telefono)
    ) {

      toast(
        'El teléfono debe contener 8 dígitos'
      );

      camposConductor.telefono.focus();

      return false;

    }


    /*
     * CI duplicado
     */

    var existeCi =
      conductores.some(
        function (item) {

          return (
            item.ci === ci &&
            item.id !== id
          );

        }
      );


    if (existeCi) {

      toast(
        'Ya existe un conductor con ese CI'
      );

      camposConductor.ci.focus();

      return false;

    }


    /*
     * Licencia duplicada
     */

    if (licencia) {

      var existeLicencia =
        conductores.some(
          function (item) {

            return (
              String(
                item.licencia || ''
              ).toUpperCase() === licencia &&
              item.id !== id
            );

          }
        );


      if (existeLicencia) {

        toast(
          'Ese número de licencia ya está registrado'
        );

        camposConductor.licencia.focus();

        return false;

      }

    }


    return true;

  }


  /* =========================================================
     GUARDAR / ACTUALIZAR
  ========================================================= */

  function procesarConductor(event) {

    event.preventDefault();


    var id =
      camposConductor.id.value;


    var ci =
      camposConductor
        .ci
        .value
        .trim();


    var nombres =
      camposConductor
        .nombres
        .value
        .trim();


    var apellidos =
      camposConductor
        .apellidos
        .value
        .trim();


    var licencia =
      camposConductor
        .licencia
        .value
        .trim()
        .toUpperCase();


    var telefono =
      camposConductor
        .telefono
        .value
        .trim();


    if (
      !ci ||
      !nombres ||
      !apellidos
    ) {

      toast(
        'Complete los campos obligatorios'
      );

      return;

    }


    if (
      !validarConductor(
        id,
        ci,
        licencia,
        telefono
      )
    ) {

      return;

    }


    /* ========================================
       EDITAR
    ======================================== */

    if (id) {

      var indice =
        conductores.findIndex(
          function (item) {

            return item.id === id;

          }
        );


      if (indice === -1) {

        toast(
          'No se encontró el conductor'
        );

        return;

      }


      var anterior =
        conductores[indice];


      conductores[indice] = {

        id:
          anterior.id,

        /*
         * Conservamos el CI original.
         */

        ci:
          anterior.ci,

        grado:
          camposConductor.grado.value,

        nombres:
          nombres,

        apellidos:
          apellidos,

        licencia:
          licencia,

        categoria:
          camposConductor.categoria.value,

        vencimiento:
          camposConductor.vencimiento.value,

        unidad:
          camposConductor.unidad.value,

        telefono:
          telefono,

        estado:
          anterior.estado,

        /*
         * No modificamos las relaciones
         * vehiculares desde este formulario.
         */

        vehiculosAsociados:
          anterior.vehiculosAsociados || [],

        observaciones:
          camposConductor
            .observaciones
            .value
            .trim()

      };


      guardarConductores();

      renderConductores();

      closeAllModals();


      toast(
        'Conductor actualizado correctamente'
      );


      return;

    }


    /* ========================================
       CREAR
    ======================================== */

    var nuevo = {

      id:
        'conductor-' +
        Date.now(),

      ci:
        ci,

      grado:
        camposConductor.grado.value,

      nombres:
        nombres,

      apellidos:
        apellidos,

      licencia:
        licencia,

      categoria:
        camposConductor.categoria.value,

      vencimiento:
        camposConductor.vencimiento.value,

      unidad:
        camposConductor.unidad.value,

      telefono:
        telefono,

      estado:
        'ACTIVO',

      vehiculosAsociados:
        [],

      observaciones:
        camposConductor
          .observaciones
          .value
          .trim()

    };


    conductores.push(
      nuevo
    );


    guardarConductores();

    renderConductores();

    closeAllModals();


    toast(
      'Conductor registrado correctamente'
    );

  }


  /* =========================================================
     VER DETALLE
  ========================================================= */

  function verConductor(id) {

    var conductor =
      conductores.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!conductor) {
      return;
    }


    var detalleNombre =
      document.getElementById(
        'detalleConductorNombre'
      );

    var detalleSubtitulo =
      document.getElementById(
        'detalleConductorSubtitulo'
      );


    detalleNombre.textContent =
      nombreCompletoConductor(
        conductor
      );


    detalleSubtitulo.textContent =
      (
        conductor.grado ||
        'Sin grado'
      ) +
      ' · ' +
      (
        conductor.unidad ||
        'Sin unidad'
      );


    document
      .getElementById(
        'detalleConductorCi'
      )
      .textContent =
      conductor.ci;


    document
      .getElementById(
        'detalleConductorGrado'
      )
      .textContent =
      conductor.grado || '—';


    document
      .getElementById(
        'detalleConductorLicencia'
      )
      .textContent =
      conductor.licencia || '—';


    document
      .getElementById(
        'detalleConductorCategoria'
      )
      .textContent =
      conductor.categoria || '—';


    document
      .getElementById(
        'detalleConductorVencimiento'
      )
      .textContent =
      formatearFechaConductor(
        conductor.vencimiento
      );


    document
      .getElementById(
        'detalleConductorTelefono'
      )
      .textContent =
      conductor.telefono || '—';


    document
      .getElementById(
        'detalleConductorUnidad'
      )
      .textContent =
      conductor.unidad ||
      'Sin asignar';


    document
      .getElementById(
        'detalleConductorEstado'
      )
      .textContent =
      conductor.estado === 'ACTIVO'
        ? 'Activo'
        : 'Inactivo';


    document
      .getElementById(
        'detalleConductorObservaciones'
      )
      .textContent =
      conductor.observaciones ||
      'Sin observaciones';


    /* Vehículos asociados */

    var contenedorVehiculos =
      document.getElementById(
        'detalleConductorVehiculos'
      );


    contenedorVehiculos.innerHTML = '';


    if (
      conductor.vehiculosAsociados &&
      conductor.vehiculosAsociados.length
    ) {

      conductor
        .vehiculosAsociados
        .forEach(
          function (placa) {

            var chip =
              document.createElement('span');

            chip.className =
              'vehicle-chip';

            chip.textContent =
              placa;


            contenedorVehiculos
              .appendChild(chip);

          }
        );

    }
    else {

      contenedorVehiculos.textContent =
        'Sin vehículos asociados';

    }


    openModal(
      'conductorDetalleModal'
    );

  }


  /* =========================================================
     ACTIVAR / DESACTIVAR
  ========================================================= */

  function cambiarEstadoConductor(id) {

    var conductor =
      conductores.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!conductor) {
      return;
    }


    var estaActivo =
      conductor.estado === 'ACTIVO';


    var accion =
      estaActivo
        ? 'desactivar'
        : 'activar';


    var confirmar =
      window.confirm(
        '¿Está seguro de ' +
        accion +
        ' al conductor ' +
        nombreCompletoConductor(
          conductor
        ) +
        '?'
      );


    if (!confirmar) {
      return;
    }


    conductor.estado =
      estaActivo
        ? 'INACTIVO'
        : 'ACTIVO';


    guardarConductores();

    renderConductores();


    toast(
      estaActivo
        ? 'Conductor desactivado correctamente'
        : 'Conductor activado correctamente'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function aplicarFiltrosConductores() {

    if (!conductorBody) {
      return;
    }


    var texto =
      conductorSearch
        ? conductorSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var unidad =
      conductorUnitFilter
        ? conductorUnitFilter.value
        : '';


    var estado =
      conductorStateFilter
        ? conductorStateFilter.value
        : '';


    conductorBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =
            !texto ||
            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideUnidad =
            !unidad ||
            row.dataset.unit === unidad;


          var coincideEstado =
            !estado ||
            row.dataset.state === estado;


          row.style.display =
            (
              coincideTexto &&
              coincideUnidad &&
              coincideEstado
            )
              ? ''
              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevoConductor) {

    btnNuevoConductor
      .addEventListener(
        'click',
        nuevoConductor
      );

  }


  if (conductorForm) {

    conductorForm
      .addEventListener(
        'submit',
        procesarConductor
      );

  }


  if (conductorBody) {

    conductorBody
      .addEventListener(
        'click',
        function (event) {

          var botonVer =
            event.target.closest(
              '.conductor-view'
            );

          var botonEditar =
            event.target.closest(
              '.conductor-edit'
            );

          var botonEstado =
            event.target.closest(
              '.conductor-toggle'
            );


          if (botonVer) {

            verConductor(
              botonVer.dataset.id
            );

            return;

          }


          if (botonEditar) {

            editarConductor(
              botonEditar.dataset.id
            );

            return;

          }


          if (botonEstado) {

            cambiarEstadoConductor(
              botonEstado.dataset.id
            );

          }

        }
      );

  }


  /* Filtro por texto */

  if (conductorSearch) {

    conductorSearch.addEventListener(
      'input',
      aplicarFiltrosConductores
    );

  }


  /* Filtro por unidad */

  if (conductorUnitFilter) {

    conductorUnitFilter.addEventListener(
      'change',
      aplicarFiltrosConductores
    );

  }


  /* Filtro por estado */

  if (conductorStateFilter) {

    conductorStateFilter.addEventListener(
      'change',
      aplicarFiltrosConductores
    );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarConductores();

  renderConductores();


  /* =========================================================
   UNIDADES
========================================================= */

  var STORAGE_UNIDADES =
    'siv_unidades';

  var STORAGE_ENCARGADOS =
    'siv_encargados_unidad';


  var unitBody =
    document.getElementById(
      'unitTableBody'
    );

  var unitSearch =
    document.getElementById(
      'unitSearch'
    );

  var unitStateFilter =
    document.getElementById(
      'unitStateFilter'
    );


  var btnNuevaUnidad =
    document.getElementById(
      'btnNuevaUnidad'
    );

  var btnNuevoEncargado =
    document.getElementById(
      'btnNuevoEncargado'
    );


  var unidadForm =
    document.getElementById(
      'unidadForm'
    );

  var encargadoForm =
    document.getElementById(
      'encargadoForm'
    );


  /* =========================================================
     CAMPOS UNIDAD
  ========================================================= */

  var camposUnidad = {

    id:
      document.getElementById(
        'unidadId'
      ),

    codigo:
      document.getElementById(
        'unidadCodigo'
      ),

    nombre:
      document.getElementById(
        'unidadNombre'
      ),

    tipo:
      document.getElementById(
        'unidadTipo'
      ),

    superior:
      document.getElementById(
        'unidadSuperior'
      ),

    ubicacion:
      document.getElementById(
        'unidadUbicacion'
      ),

    estado:
      document.getElementById(
        'unidadEstado'
      )

  };


  /* =========================================================
     CAMPOS ENCARGADO
  ========================================================= */

  var camposEncargado = {

    unidad:
      document.getElementById(
        'encargadoUnidad'
      ),

    ci:
      document.getElementById(
        'encargadoCi'
      ),

    nombres:
      document.getElementById(
        'encargadoNombres'
      ),

    apellidos:
      document.getElementById(
        'encargadoApellidos'
      ),

    grado:
      document.getElementById(
        'encargadoGrado'
      ),

    telefono:
      document.getElementById(
        'encargadoTelefono'
      ),

    fechaDesde:
      document.getElementById(
        'encargadoFechaDesde'
      ),

    observaciones:
      document.getElementById(
        'encargadoObservaciones'
      )

  };


  /* =========================================================
     DATOS INICIALES
  ========================================================= */

  var unidadesIniciales = [

    {
      id: 'unidad-utop',
      codigo: 'UTOP',
      nombre: 'UTOP',
      tipo: 'Unidad operativa',
      superior: 'Comando Departamental',
      ubicacion: 'Oruro',
      estado: 'ACTIVA'
    },

    {
      id: 'unidad-rural',
      codigo: 'RURAL',
      nombre: 'Rural',
      tipo: 'Unidad operativa',
      superior: 'Comando Departamental',
      ubicacion: 'Rural',
      estado: 'ACTIVA'
    },

    {
      id: 'unidad-felcc',
      codigo: 'FELCC',
      nombre: 'FELCC',
      tipo: 'Unidad investigativa',
      superior: 'Comando Departamental',
      ubicacion: 'Oruro',
      estado: 'ACTIVA'
    },

    {
      id: 'unidad-epi1',
      codigo: 'EPI-01',
      nombre: 'EPI 1',
      tipo: 'Unidad operativa',
      superior: 'Comando Departamental',
      ubicacion: 'Oruro',
      estado: 'ACTIVA'
    },

    {
      id: 'unidad-epi2',
      codigo: 'EPI-02',
      nombre: 'EPI 2',
      tipo: 'Unidad operativa',
      superior: 'Comando Departamental',
      ubicacion: 'Oruro',
      estado: 'ACTIVA'
    },

    {
      id: 'unidad-epi3',
      codigo: 'EPI-03',
      nombre: 'EPI 3',
      tipo: 'Unidad operativa',
      superior: 'Comando Departamental',
      ubicacion: 'Oruro',
      estado: 'ACTIVA'
    },

    {
      id: 'unidad-felcv',
      codigo: 'FELCV',
      nombre: 'FELCV',
      tipo: 'Unidad especializada',
      superior: 'Comando Departamental',
      ubicacion: 'Oruro',
      estado: 'ACTIVA'
    },

    {
      id: 'unidad-transito',
      codigo: 'TRANSITO',
      nombre: 'Tránsito',
      tipo: 'Unidad operativa',
      superior: 'Comando Departamental',
      ubicacion: 'Oruro',
      estado: 'ACTIVA'
    },

    {
      id: 'unidad-rp110',
      codigo: 'RP-110',
      nombre: 'Radio Patrullas 110',
      tipo: 'Unidad operativa',
      superior: 'Comando Departamental',
      ubicacion: 'Oruro',
      estado: 'ACTIVA'
    }

  ];


  var encargadosIniciales = [

    {
      id: 'encargado-1',

      unidadId: 'unidad-utop',

      ci: '1234567',

      nombres: 'Juan',

      apellidos: 'Pérez',

      grado: 'Sargento',

      telefono: '71234567',

      fechaDesde: '2026-01-01',

      fechaHasta: '',

      observaciones: ''
    },


    {
      id: 'encargado-2',

      unidadId: 'unidad-rural',

      ci: '2345678',

      nombres: 'Carlos',

      apellidos: 'Mamani',

      grado: 'Sargento',

      telefono: '72345678',

      fechaDesde: '2026-02-15',

      fechaHasta: '',

      observaciones: ''
    },


    {
      id: 'encargado-3',

      unidadId: 'unidad-felcc',

      ci: '3456789',

      nombres: 'Pedro',

      apellidos: 'López',

      grado: 'Teniente',

      telefono: '73456789',

      fechaDesde: '2026-03-05',

      fechaHasta: '',

      observaciones: ''
    }

  ];


  var unidades = [];

  var encargadosUnidad = [];


  /* =========================================================
     CARGAR
  ========================================================= */

  function cargarUnidades() {

    var datos =
      localStorage.getItem(
        STORAGE_UNIDADES
      );


    if (datos) {

      try {

        unidades =
          JSON.parse(datos);

      }
      catch (error) {

        console.error(
          'Error cargando unidades:',
          error
        );

        unidades =
          unidadesIniciales.slice();

      }

    }
    else {

      unidades =
        unidadesIniciales.slice();

      guardarUnidades();

    }


    var datosEncargados =
      localStorage.getItem(
        STORAGE_ENCARGADOS
      );


    if (datosEncargados) {

      try {

        encargadosUnidad =
          JSON.parse(
            datosEncargados
          );

      }
      catch (error) {

        console.error(
          'Error cargando encargados:',
          error
        );

        encargadosUnidad =
          encargadosIniciales.slice();

      }

    }
    else {

      encargadosUnidad =
        encargadosIniciales.slice();

      guardarEncargados();

    }

  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  function guardarUnidades() {

    localStorage.setItem(

      STORAGE_UNIDADES,

      JSON.stringify(
        unidades
      )

    );

  }


  function guardarEncargados() {

    localStorage.setItem(

      STORAGE_ENCARGADOS,

      JSON.stringify(
        encargadosUnidad
      )

    );

  }


  /* =========================================================
     ESCAPAR HTML
  ========================================================= */

  function escaparUnidadHTML(valor) {

    return String(
      valor || ''
    )

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#039;');

  }


  /* =========================================================
     FECHA
  ========================================================= */

  function formatearFechaUnidad(fecha) {

    if (!fecha) {
      return '—';
    }


    var partes =
      fecha.split('-');


    if (partes.length !== 3) {
      return fecha;
    }


    return (
      partes[2] +
      '/' +
      partes[1] +
      '/' +
      partes[0]
    );

  }


  function fechaActualUnidad() {

    var fecha =
      new Date();


    var anio =
      fecha.getFullYear();

    var mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    var dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');


    return (
      anio +
      '-' +
      mes +
      '-' +
      dia
    );

  }


  /* =========================================================
     ENCARGADO ACTUAL
  ========================================================= */

  function obtenerEncargadoActual(
    unidadId
  ) {

    return encargadosUnidad.find(
      function (encargado) {

        return (
          encargado.unidadId ===
          unidadId &&
          !encargado.fechaHasta
        );

      }
    );

  }


  /* =========================================================
     NOMBRE ENCARGADO
  ========================================================= */

  function nombreEncargado(
    encargado
  ) {

    if (!encargado) {
      return 'Sin encargado';
    }


    return (
      (
        encargado.grado
          ? encargado.grado + ' '
          : ''
      ) +
      encargado.nombres +
      ' ' +
      encargado.apellidos
    ).trim();

  }


  /* =========================================================
     VEHÍCULOS DE LA UNIDAD
  ========================================================= */

  function contarVehiculosUnidad(
    nombreUnidad
  ) {

    var datos =
      localStorage.getItem(
        'siv_vehiculos'
      );


    if (!datos) {
      return 0;
    }


    try {

      var vehiculos =
        JSON.parse(datos);


      return vehiculos.filter(
        function (vehiculo) {

          return (
            vehiculo.unidad ===
            nombreUnidad
          );

        }
      ).length;

    }
    catch (error) {

      return 0;

    }

  }


  /* =========================================================
     RENDERIZAR TABLA
  ========================================================= */

  function renderUnidades() {

    if (!unitBody) {
      return;
    }


    unitBody.innerHTML =
      '';


    unidades.forEach(
      function (unidad) {

        var encargado =
          obtenerEncargadoActual(
            unidad.id
          );


        var activa =
          unidad.estado ===
          'ACTIVA';


        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          unidad.id;

        row.dataset.state =
          unidad.estado;


        row.innerHTML = `

        <td>
          <strong>
            ${escaparUnidadHTML(
          unidad.codigo
        )}
          </strong>
        </td>

        <td>
          ${escaparUnidadHTML(
          unidad.nombre
        )}
        </td>

        <td>
          ${escaparUnidadHTML(
          unidad.ubicacion || '—'
        )}
        </td>

        <td>
          ${escaparUnidadHTML(
          nombreEncargado(
            encargado
          )
        )}
        </td>

        <td>
          ${encargado
            ? formatearFechaUnidad(
              encargado.fechaDesde
            )
            : '—'
          }
        </td>

        <td>
          ${contarVehiculosUnidad(
            unidad.nombre
          )}
        </td>

        <td>

          <span
            class="badge ${activa
            ? 'green'
            : 'gray'
          }"
          >

            ${activa
            ? 'Activa'
            : 'Inactiva'
          }

          </span>

        </td>

        <td>

          <div class="unit-actions">

            <button
              type="button"
              class="btn soft unit-view"
              data-id="${unidad.id}"
            >
              Ver
            </button>

            <button
              type="button"
              class="btn unit-edit"
              data-id="${unidad.id}"
            >
              Editar
            </button>

            ${activa

            ? `

                  <button
                    type="button"
                    class="btn unit-manager unit-change-manager"
                    data-id="${unidad.id}"
                  >
                    Encargado
                  </button>

                  <button
                    type="button"
                    class="btn deactivate unit-toggle"
                    data-id="${unidad.id}"
                  >
                    Desactivar
                  </button>

                `

            : `

                  <button
                    type="button"
                    class="btn activate unit-toggle"
                    data-id="${unidad.id}"
                  >
                    Activar
                  </button>

                `
          }

          </div>

        </td>

      `;


        unitBody.appendChild(
          row
        );

      }
    );


    aplicarFiltrosUnidades();

  }


  /* =========================================================
     NUEVA UNIDAD
  ========================================================= */

  function nuevaUnidad() {

    unidadForm.reset();


    camposUnidad.id.value =
      '';


    camposUnidad.estado.value =
      'ACTIVA';


    document
      .getElementById(
        'unidadModalTitulo'
      )
      .textContent =
      'Registrar unidad';


    document
      .getElementById(
        'btnGuardarUnidad'
      )
      .textContent =
      'Guardar unidad';


    openModal(
      'unidadModal'
    );


    setTimeout(
      function () {

        camposUnidad.codigo.focus();

      },
      100
    );

  }


  /* =========================================================
     EDITAR UNIDAD
  ========================================================= */

  function editarUnidad(id) {

    var unidad =
      unidades.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!unidad) {
      return;
    }


    camposUnidad.id.value =
      unidad.id;

    camposUnidad.codigo.value =
      unidad.codigo || '';

    camposUnidad.nombre.value =
      unidad.nombre || '';

    camposUnidad.tipo.value =
      unidad.tipo || '';

    camposUnidad.superior.value =
      unidad.superior ||
      'Comando Departamental';

    camposUnidad.ubicacion.value =
      unidad.ubicacion || '';

    camposUnidad.estado.value =
      unidad.estado || 'ACTIVA';


    document
      .getElementById(
        'unidadModalTitulo'
      )
      .textContent =
      'Editar unidad';


    document
      .getElementById(
        'btnGuardarUnidad'
      )
      .textContent =
      'Guardar cambios';


    openModal(
      'unidadModal'
    );

  }


  /* =========================================================
     PROPAGAR CAMBIO DE NOMBRE
  ========================================================= */

  function propagarCambioNombreUnidad(
    anterior,
    nuevo
  ) {

    if (
      !anterior ||
      anterior === nuevo
    ) {
      return;
    }


    /* VEHÍCULOS */

    var datosVehiculos =
      localStorage.getItem(
        'siv_vehiculos'
      );


    if (datosVehiculos) {

      try {

        var vehiculos =
          JSON.parse(
            datosVehiculos
          );


        vehiculos.forEach(
          function (vehiculo) {

            if (
              vehiculo.unidad ===
              anterior
            ) {

              vehiculo.unidad =
                nuevo;

            }

          }
        );


        localStorage.setItem(

          'siv_vehiculos',

          JSON.stringify(
            vehiculos
          )

        );

      }
      catch (error) { }

    }


    /* ASIGNACIONES */

    var datosAsignaciones =
      localStorage.getItem(
        'siv_asignaciones'
      );


    if (datosAsignaciones) {

      try {

        var asignaciones =
          JSON.parse(
            datosAsignaciones
          );


        asignaciones.forEach(
          function (asignacion) {

            if (
              asignacion.unidad ===
              anterior
            ) {

              asignacion.unidad =
                nuevo;

            }

          }
        );


        localStorage.setItem(

          'siv_asignaciones',

          JSON.stringify(
            asignaciones
          )

        );

      }
      catch (error) { }

    }


    /* CONDUCTORES */

    var datosConductores =
      localStorage.getItem(
        'siv_conductores'
      );


    if (datosConductores) {

      try {

        var conductores =
          JSON.parse(
            datosConductores
          );


        conductores.forEach(
          function (conductor) {

            if (
              conductor.unidad ===
              anterior
            ) {

              conductor.unidad =
                nuevo;

            }

          }
        );


        localStorage.setItem(

          'siv_conductores',

          JSON.stringify(
            conductores
          )

        );

      }
      catch (error) { }

    }

  }


  /* =========================================================
     GUARDAR / ACTUALIZAR UNIDAD
  ========================================================= */

  function procesarUnidad(event) {

    event.preventDefault();


    var id =
      camposUnidad.id.value;


    var codigo =
      camposUnidad
        .codigo
        .value
        .trim()
        .toUpperCase();


    var nombre =
      camposUnidad
        .nombre
        .value
        .trim();


    if (
      !codigo ||
      !nombre
    ) {

      toast(
        'Complete los campos obligatorios'
      );

      return;

    }


    /* Código duplicado */

    var codigoDuplicado =
      unidades.some(
        function (unidad) {

          return (
            unidad.codigo.toUpperCase() ===
            codigo &&
            unidad.id !== id
          );

        }
      );


    if (codigoDuplicado) {

      toast(
        'Ya existe una unidad con ese código'
      );

      return;

    }


    /* Nombre duplicado */

    var nombreDuplicado =
      unidades.some(
        function (unidad) {

          return (
            unidad.nombre
              .toLowerCase() ===
            nombre.toLowerCase() &&
            unidad.id !== id
          );

        }
      );


    if (nombreDuplicado) {

      toast(
        'Ya existe una unidad con ese nombre'
      );

      return;

    }


    /* EDITAR */

    if (id) {

      var indice =
        unidades.findIndex(
          function (unidad) {

            return unidad.id === id;

          }
        );


      if (indice === -1) {
        return;
      }


      var anterior =
        unidades[indice];


      var nombreAnterior =
        anterior.nombre;


      unidades[indice] = {

        id:
          anterior.id,

        codigo:
          codigo,

        nombre:
          nombre,

        tipo:
          camposUnidad.tipo.value,

        superior:
          camposUnidad.superior.value,

        ubicacion:
          camposUnidad
            .ubicacion
            .value
            .trim(),

        estado:
          camposUnidad.estado.value

      };


      guardarUnidades();


      propagarCambioNombreUnidad(
        nombreAnterior,
        nombre
      );


      renderUnidades();

      sincronizarSelectsUnidades();

      closeAllModals();


      toast(
        'Unidad actualizada correctamente'
      );


      return;

    }


    /* CREAR */

    var nueva = {

      id:
        'unidad-' +
        Date.now(),

      codigo:
        codigo,

      nombre:
        nombre,

      tipo:
        camposUnidad.tipo.value,

      superior:
        camposUnidad.superior.value,

      ubicacion:
        camposUnidad
          .ubicacion
          .value
          .trim(),

      estado:
        camposUnidad.estado.value

    };


    unidades.push(
      nueva
    );


    guardarUnidades();

    renderUnidades();

    sincronizarSelectsUnidades();

    closeAllModals();


    toast(
      'Unidad registrada correctamente'
    );

  }


  /* =========================================================
     ACTIVAR / DESACTIVAR
  ========================================================= */

  function cambiarEstadoUnidad(id) {

    var unidad =
      unidades.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!unidad) {
      return;
    }


    var activa =
      unidad.estado ===
      'ACTIVA';


    /*
     * Una unidad con vehículos actuales
     * no puede ser desactivada.
     */

    if (
      activa &&
      contarVehiculosUnidad(
        unidad.nombre
      ) > 0
    ) {

      toast(
        'Reasigne los vehículos antes de desactivar esta unidad'
      );

      return;

    }


    var confirmar =
      window.confirm(
        '¿Está seguro de ' +
        (
          activa
            ? 'desactivar'
            : 'activar'
        ) +
        ' la unidad ' +
        unidad.nombre +
        '?'
      );


    if (!confirmar) {
      return;
    }


    unidad.estado =
      activa
        ? 'INACTIVA'
        : 'ACTIVA';


    guardarUnidades();

    renderUnidades();

    sincronizarSelectsUnidades();


    toast(
      activa
        ? 'Unidad desactivada correctamente'
        : 'Unidad activada correctamente'
    );

  }


  /* =========================================================
     SELECT DE UNIDADES
  ========================================================= */

  function cargarSelectEncargados() {

    if (!camposEncargado.unidad) {
      return;
    }


    var valorActual =
      camposEncargado.unidad.value;


    camposEncargado.unidad.innerHTML =
      '<option value="">Seleccionar unidad</option>';


    unidades
      .filter(
        function (unidad) {

          return (
            unidad.estado ===
            'ACTIVA'
          );

        }
      )
      .forEach(
        function (unidad) {

          var opcion =
            document.createElement(
              'option'
            );


          opcion.value =
            unidad.id;

          opcion.textContent =
            unidad.nombre;


          camposEncargado
            .unidad
            .appendChild(
              opcion
            );

        }
      );


    if (valorActual) {

      camposEncargado.unidad.value =
        valorActual;

    }

  }


  /* =========================================================
     SINCRONIZAR SELECTS DEL SISTEMA
  ========================================================= */

  function llenarSelectUnidad(
    id,
    textoInicial,
    soloActivas
  ) {

    var select =
      document.getElementById(id);


    if (!select) {
      return;
    }


    var valorActual =
      select.value;


    select.innerHTML =
      '<option value="">' +
      textoInicial +
      '</option>';


    unidades
      .filter(
        function (unidad) {

          return (
            !soloActivas ||
            unidad.estado === 'ACTIVA'
          );

        }
      )
      .forEach(
        function (unidad) {

          var opcion =
            document.createElement(
              'option'
            );


          opcion.value =
            unidad.nombre;

          opcion.textContent =
            unidad.nombre;


          select.appendChild(
            opcion
          );

        }
      );


    var existe =
      Array.from(
        select.options
      ).some(
        function (option) {

          return (
            option.value ===
            valorActual
          );

        }
      );


    if (existe) {

      select.value =
        valorActual;

    }

  }


  function sincronizarSelectsUnidades() {

    /*
     * Formularios:
     * solamente unidades activas.
     */

    llenarSelectUnidad(
      'vehiculoUnidad',
      'Sin asignar',
      true
    );

    llenarSelectUnidad(
      'asignacionUnidad',
      'Seleccionar unidad',
      true
    );

    llenarSelectUnidad(
      'reasignacionNuevaUnidad',
      'Seleccionar unidad',
      true
    );

    llenarSelectUnidad(
      'conductorUnidad',
      'Sin asignar',
      true
    );


    /*
     * Filtros:
     * mostrar también unidades inactivas.
     */

    llenarSelectUnidad(
      'vehicleUnitFilter',
      'Todas las unidades',
      false
    );

    llenarSelectUnidad(
      'conductorUnitFilter',
      'Todas las unidades',
      false
    );


    cargarSelectEncargados();

  }


  /* =========================================================
     NUEVO ENCARGADO
  ========================================================= */

  function nuevoEncargado(
    unidadId
  ) {

    encargadoForm.reset();


    cargarSelectEncargados();


    if (unidadId) {

      camposEncargado.unidad.value =
        unidadId;

    }


    camposEncargado.fechaDesde.value =
      fechaActualUnidad();


    openModal(
      'encargadoModal'
    );

  }


  /* =========================================================
     GUARDAR ENCARGADO
  ========================================================= */

  function procesarEncargado(
    event
  ) {

    event.preventDefault();


    var unidadId =
      camposEncargado.unidad.value;


    var ci =
      camposEncargado
        .ci
        .value
        .trim();


    var nombres =
      camposEncargado
        .nombres
        .value
        .trim();


    var apellidos =
      camposEncargado
        .apellidos
        .value
        .trim();


    var telefono =
      camposEncargado
        .telefono
        .value
        .trim();


    var fechaDesde =
      camposEncargado
        .fechaDesde
        .value;


    if (
      !unidadId ||
      !ci ||
      !nombres ||
      !apellidos ||
      !fechaDesde
    ) {

      toast(
        'Complete los campos obligatorios'
      );

      return;

    }


    if (!/^\d+$/.test(ci)) {

      toast(
        'El CI debe contener solamente números'
      );

      return;

    }


    if (
      telefono &&
      !/^\d{8}$/.test(telefono)
    ) {

      toast(
        'El teléfono debe contener 8 dígitos'
      );

      return;

    }


    var actual =
      obtenerEncargadoActual(
        unidadId
      );


    /*
     * Cerrar encargado anterior.
     */

    if (actual) {

      if (
        fechaDesde <
        actual.fechaDesde
      ) {

        toast(
          'La fecha del nuevo encargado no puede ser anterior al encargado actual'
        );

        return;

      }


      actual.fechaHasta =
        fechaDesde;

    }


    var nuevo = {

      id:
        'encargado-' +
        Date.now(),

      unidadId:
        unidadId,

      ci:
        ci,

      nombres:
        nombres,

      apellidos:
        apellidos,

      grado:
        camposEncargado
          .grado
          .value
          .trim(),

      telefono:
        telefono,

      fechaDesde:
        fechaDesde,

      fechaHasta:
        '',

      observaciones:
        camposEncargado
          .observaciones
          .value
          .trim()

    };


    encargadosUnidad.push(
      nuevo
    );


    guardarEncargados();

    renderUnidades();

    closeAllModals();


    toast(
      actual
        ? 'Encargado actualizado y periodo anterior cerrado'
        : 'Encargado registrado correctamente'
    );

  }


  /* =========================================================
     VER UNIDAD
  ========================================================= */

  function verUnidad(id) {

    var unidad =
      unidades.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!unidad) {
      return;
    }


    var encargado =
      obtenerEncargadoActual(
        unidad.id
      );


    document
      .getElementById(
        'detalleUnidadCodigo'
      )
      .textContent =
      unidad.codigo;


    document
      .getElementById(
        'detalleUnidadNombre'
      )
      .textContent =
      unidad.nombre;


    document
      .getElementById(
        'detalleUnidadTipo'
      )
      .textContent =
      unidad.tipo || '—';


    document
      .getElementById(
        'detalleUnidadSuperior'
      )
      .textContent =
      unidad.superior || '—';


    document
      .getElementById(
        'detalleUnidadUbicacion'
      )
      .textContent =
      unidad.ubicacion || '—';


    document
      .getElementById(
        'detalleUnidadEstado'
      )
      .textContent =
      unidad.estado === 'ACTIVA'
        ? 'Activa'
        : 'Inactiva';


    document
      .getElementById(
        'detalleUnidadVehiculos'
      )
      .textContent =
      contarVehiculosUnidad(
        unidad.nombre
      );


    document
      .getElementById(
        'detalleUnidadEncargado'
      )
      .textContent =
      nombreEncargado(
        encargado
      );


    /* Historial */

    var historialBody =
      document.getElementById(
        'unidadEncargadosHistorial'
      );


    historialBody.innerHTML =
      '';


    var historial =
      encargadosUnidad
        .filter(
          function (item) {

            return (
              item.unidadId ===
              unidad.id
            );

          }
        )
        .sort(
          function (a, b) {

            return b.fechaDesde
              .localeCompare(
                a.fechaDesde
              );

          }
        );


    if (!historial.length) {

      historialBody.innerHTML = `

      <tr>
        <td colspan="4">
          Sin historial de encargados
        </td>
      </tr>

    `;

    }
    else {

      historial.forEach(
        function (item) {

          var row =
            document.createElement(
              'tr'
            );


          row.innerHTML = `

          <td>
            ${escaparUnidadHTML(
            (
              item.nombres +
              ' ' +
              item.apellidos
            ).trim()
          )}
          </td>

          <td>
            ${escaparUnidadHTML(
            item.grado || '—'
          )}
          </td>

          <td>
            ${formatearFechaUnidad(
            item.fechaDesde
          )}
          </td>

          <td>
            ${formatearFechaUnidad(
            item.fechaHasta
          )}
          </td>

        `;


          historialBody.appendChild(
            row
          );

        }
      );

    }


    openModal(
      'unidadDetalleModal'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function aplicarFiltrosUnidades() {

    if (!unitBody) {
      return;
    }


    var texto =
      unitSearch
        ? unitSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var estado =
      unitStateFilter
        ? unitStateFilter.value
        : '';


    unitBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =
            !texto ||
            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideEstado =
            !estado ||
            row.dataset.state ===
            estado;


          row.style.display =
            (
              coincideTexto &&
              coincideEstado
            )
              ? ''
              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevaUnidad) {

    btnNuevaUnidad.addEventListener(
      'click',
      nuevaUnidad
    );

  }


  if (btnNuevoEncargado) {

    btnNuevoEncargado.addEventListener(
      'click',
      function () {

        nuevoEncargado('');

      }
    );

  }


  if (unidadForm) {

    unidadForm.addEventListener(
      'submit',
      procesarUnidad
    );

  }


  if (encargadoForm) {

    encargadoForm.addEventListener(
      'submit',
      procesarEncargado
    );

  }


  if (unitBody) {

    unitBody.addEventListener(
      'click',
      function (event) {

        var ver =
          event.target.closest(
            '.unit-view'
          );

        var editar =
          event.target.closest(
            '.unit-edit'
          );

        var encargado =
          event.target.closest(
            '.unit-change-manager'
          );

        var estado =
          event.target.closest(
            '.unit-toggle'
          );


        if (ver) {

          verUnidad(
            ver.dataset.id
          );

          return;

        }


        if (editar) {

          editarUnidad(
            editar.dataset.id
          );

          return;

        }


        if (encargado) {

          nuevoEncargado(
            encargado.dataset.id
          );

          return;

        }


        if (estado) {

          cambiarEstadoUnidad(
            estado.dataset.id
          );

        }

      }
    );

  }


  if (unitSearch) {

    unitSearch.addEventListener(
      'input',
      aplicarFiltrosUnidades
    );

  }


  if (unitStateFilter) {

    unitStateFilter.addEventListener(
      'change',
      aplicarFiltrosUnidades
    );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarUnidades();

  renderUnidades();

  sincronizarSelectsUnidades();

  /* =========================================================
   DOCUMENTACIÓN VEHICULAR
========================================================= */

  var STORAGE_DOCUMENTOS =
    'siv_documentos';

  var STORAGE_MOVIMIENTOS_DOCUMENTALES =
    'siv_movimientos_documentales';


  var documentos = [];

  var movimientosDocumentales = [];


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var documentBody =
    document.getElementById(
      'documentTableBody'
    );

  var documentMovementBody =
    document.getElementById(
      'documentMovementTableBody'
    );


  var documentSearch =
    document.getElementById(
      'documentSearch'
    );

  var documentTypeFilter =
    document.getElementById(
      'documentTypeFilter'
    );

  var documentStateFilter =
    document.getElementById(
      'documentStateFilter'
    );


  var movementSearch =
    document.getElementById(
      'documentMovementSearch'
    );

  var movementTypeFilter =
    document.getElementById(
      'documentMovementTypeFilter'
    );


  var documentoForm =
    document.getElementById(
      'documentoForm'
    );

  var documentMovementForm =
    document.getElementById(
      'documentMovementForm'
    );


  var btnRegistrarDocumento =
    document.getElementById(
      'btnRegistrarDocumento'
    );

  var btnRegistrarMovimiento =
    document.getElementById(
      'btnRegistrarMovimientoDocumento'
    );


  /* =========================================================
     CAMPOS DOCUMENTO
  ========================================================= */

  var camposDocumento = {

    id:
      document.getElementById(
        'documentoId'
      ),

    vehiculo:
      document.getElementById(
        'documentoVehiculo'
      ),

    tipo:
      document.getElementById(
        'documentoTipo'
      ),

    numero:
      document.getElementById(
        'documentoNumero'
      ),

    fecha:
      document.getElementById(
        'documentoFecha'
      ),

    referencia:
      document.getElementById(
        'documentoReferencia'
      ),

    observaciones:
      document.getElementById(
        'documentoObservaciones'
      )

  };


  /* =========================================================
     CAMPOS MOVIMIENTO
  ========================================================= */

  var camposMovimientoDocumento = {

    id:
      document.getElementById(
        'documentMovementId'
      ),

    tipo:
      document.getElementById(
        'documentMovementType'
      ),

    documento:
      document.getElementById(
        'documentMovementDocument'
      ),

    vehiculo:
      document.getElementById(
        'documentMovementVehicle'
      ),

    referencia:
      document.getElementById(
        'documentMovementReference'
      ),

    fecha:
      document.getElementById(
        'documentMovementDate'
      ),

    unidad:
      document.getElementById(
        'documentMovementUnit'
      ),

    persona:
      document.getElementById(
        'documentMovementPerson'
      ),

    grado:
      document.getElementById(
        'documentMovementRank'
      ),

    observaciones:
      document.getElementById(
        'documentMovementObservations'
      )

  };


  /* =========================================================
     DATOS INICIALES
  ========================================================= */

  var documentosIniciales = [

    {
      id: 'documento-1',
      vehiculoId: 'vehiculo-1',
      vehiculoPlaca: '6417-PBT',
      tipo: 'Ficha Kardex',
      numero: 'KDX-6417',
      fecha: '2026-01-03',
      referencia: 'Registro técnico',
      observaciones: '',
      estado: 'ACTIVO'
    },

    {
      id: 'documento-2',
      vehiculoId: 'vehiculo-1',
      vehiculoPlaca: '6417-PBT',
      tipo: 'Acta de entrega',
      numero: 'ACT-041/2026',
      fecha: '2026-06-01',
      referencia: 'Asignación EPI 3',
      observaciones: '',
      estado: 'ACTIVO'
    },

    {
      id: 'documento-3',
      vehiculoId: 'vehiculo-2',
      vehiculoPlaca: '3821-ABC',
      tipo: 'Informe técnico',
      numero: 'INF-088/2026',
      fecha: '2026-09-05',
      referencia: 'Mantenimiento',
      observaciones: '',
      estado: 'ACTIVO'
    },

    {
      id: 'documento-4',
      vehiculoId: 'vehiculo-1',
      vehiculoPlaca: '6417-PBT',
      tipo: 'RUAT',
      numero: '123456',
      fecha: '2026-01-03',
      referencia: 'Documento RUAT',
      observaciones: '',
      estado: 'ACTIVO'
    },

    {
      id: 'documento-5',
      vehiculoId: 'vehiculo-2',
      vehiculoPlaca: '3821-ABC',
      tipo: 'SOAT',
      numero: 'SOAT-2026-889',
      fecha: '2026-01-10',
      referencia: 'SOAT gestión 2026',
      observaciones: '',
      estado: 'ACTIVO'
    }

  ];


  var movimientosIniciales = [

    {
      id: 'mov-doc-1',

      documentoId: 'documento-4',

      tipo: 'ENTREGA',

      fecha: '2026-09-09T09:00',

      unidad: 'DIPROVE',

      persona: 'Carlos Mamani',

      grado: 'Sgto.',

      observaciones: '',

      estado: 'ACTIVO'
    },

    {
      id: 'mov-doc-2',

      documentoId: 'documento-5',

      tipo: 'ENTREGA',

      fecha: '2026-09-02T10:30',

      unidad: 'UTOP',

      persona: 'Pedro Quispe',

      grado: 'Tte.',

      observaciones: '',

      estado: 'ACTIVO'
    }

  ];


  /* =========================================================
     CARGAR
  ========================================================= */

  function cargarDocumentacionVehicular() {

    var datosDocumentos =
      localStorage.getItem(
        STORAGE_DOCUMENTOS
      );


    if (datosDocumentos) {

      try {

        documentos =
          JSON.parse(
            datosDocumentos
          );

      }
      catch (error) {

        console.error(
          'Error cargando documentos:',
          error
        );

        documentos =
          documentosIniciales.slice();

      }

    }
    else {

      documentos =
        documentosIniciales.slice();

      guardarDocumentos();

    }


    var datosMovimientos =
      localStorage.getItem(
        STORAGE_MOVIMIENTOS_DOCUMENTALES
      );


    if (datosMovimientos) {

      try {

        movimientosDocumentales =
          JSON.parse(
            datosMovimientos
          );

      }
      catch (error) {

        console.error(
          'Error cargando movimientos documentales:',
          error
        );

        movimientosDocumentales =
          movimientosIniciales.slice();

      }

    }
    else {

      movimientosDocumentales =
        movimientosIniciales.slice();

      guardarMovimientosDocumentales();

    }

  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  function guardarDocumentos() {

    localStorage.setItem(

      STORAGE_DOCUMENTOS,

      JSON.stringify(
        documentos
      )

    );

  }


  function guardarMovimientosDocumentales() {

    localStorage.setItem(

      STORAGE_MOVIMIENTOS_DOCUMENTALES,

      JSON.stringify(
        movimientosDocumentales
      )

    );

  }


  /* =========================================================
     HTML SEGURO
  ========================================================= */

  function escaparDocumentoHTML(valor) {

    return String(
      valor ?? ''
    )

      .replace(/&/g, '&amp;')

      .replace(/</g, '&lt;')

      .replace(/>/g, '&gt;')

      .replace(/"/g, '&quot;')

      .replace(/'/g, '&#039;');

  }


  /* =========================================================
     FECHAS
  ========================================================= */

  function formatearFechaDocumento(fecha) {

    if (!fecha) {
      return '—';
    }


    var soloFecha =
      fecha.substring(0, 10);


    var partes =
      soloFecha.split('-');


    if (partes.length !== 3) {
      return fecha;
    }


    return (
      partes[2] +
      '/' +
      partes[1] +
      '/' +
      partes[0]
    );

  }


  function formatearFechaHoraDocumento(fecha) {

    if (!fecha) {
      return '—';
    }


    var partes =
      fecha.split('T');


    var resultado =
      formatearFechaDocumento(
        partes[0]
      );


    if (partes[1]) {

      resultado +=
        ' ' +
        partes[1].substring(0, 5);

    }


    return resultado;

  }


  function fechaHoraLocalDocumento() {

    var fecha =
      new Date();


    var offset =
      fecha.getTimezoneOffset() *
      60000;


    return new Date(
      fecha.getTime() - offset
    )
      .toISOString()
      .slice(0, 16);

  }


  /* =========================================================
     VEHÍCULOS
  ========================================================= */

  function obtenerVehiculosDocumentacion() {

    var datos =
      localStorage.getItem(
        'siv_vehiculos'
      );


    if (datos) {

      try {

        var lista =
          JSON.parse(datos);


        if (Array.isArray(lista)) {
          return lista;
        }

      }
      catch (error) {

        console.error(
          'Error obteniendo vehículos:',
          error
        );

      }

    }


    return [];

  }


  function cargarSelectVehiculosDocumento() {

    if (!camposDocumento.vehiculo) {
      return;
    }


    var valorActual =
      camposDocumento.vehiculo.value;


    camposDocumento.vehiculo.innerHTML =
      '<option value="">Seleccionar vehículo</option>';


    obtenerVehiculosDocumentacion()
      .forEach(
        function (vehiculo) {

          var option =
            document.createElement(
              'option'
            );


          option.value =
            vehiculo.id;


          option.textContent =
            vehiculo.placa +
            ' · ' +
            vehiculo.marca +
            ' ' +
            vehiculo.modelo;


          option.dataset.placa =
            vehiculo.placa;


          camposDocumento
            .vehiculo
            .appendChild(
              option
            );

        }
      );


    if (valorActual) {

      camposDocumento.vehiculo.value =
        valorActual;

    }

  }


  /* =========================================================
     DOCUMENTO POR ID
  ========================================================= */

  function buscarDocumento(id) {

    return documentos.find(
      function (documento) {

        return documento.id === id;

      }
    );

  }


  /* =========================================================
     SELECT DOCUMENTOS
  ========================================================= */

  function cargarSelectDocumentosMovimiento() {

    if (!camposMovimientoDocumento.documento) {
      return;
    }


    var valorActual =
      camposMovimientoDocumento
        .documento
        .value;


    camposMovimientoDocumento
      .documento
      .innerHTML =
      '<option value="">Seleccionar documento</option>';


    documentos

      .filter(
        function (documento) {

          return (
            documento.estado ===
            'ACTIVO'
          );

        }
      )

      .forEach(
        function (documento) {

          var option =
            document.createElement(
              'option'
            );


          option.value =
            documento.id;


          option.textContent =
            documento.vehiculoPlaca +
            ' · ' +
            documento.tipo +
            (
              documento.numero
                ? ' · ' + documento.numero
                : ''
            );


          camposMovimientoDocumento
            .documento
            .appendChild(
              option
            );

        }
      );


    if (valorActual) {

      camposMovimientoDocumento
        .documento
        .value =
        valorActual;

    }

  }


  /* =========================================================
     SINCRONIZAR DOCUMENTO EN MOVIMIENTO
  ========================================================= */

  function sincronizarDocumentoMovimiento() {

    var documento =
      buscarDocumento(
        camposMovimientoDocumento
          .documento
          .value
      );


    if (!documento) {

      camposMovimientoDocumento
        .vehiculo
        .value =
        '';

      camposMovimientoDocumento
        .referencia
        .value =
        '';

      return;

    }


    camposMovimientoDocumento
      .vehiculo
      .value =
      documento.vehiculoPlaca;


    camposMovimientoDocumento
      .referencia
      .value =
      documento.numero ||
      documento.referencia ||
      '';

  }


  /* =========================================================
     RENDER DOCUMENTOS
  ========================================================= */

  function renderDocumentos() {

    if (!documentBody) {
      return;
    }


    documentBody.innerHTML = '';


    documentos.forEach(
      function (documento) {

        var activo =
          documento.estado ===
          'ACTIVO';


        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          documento.id;

        row.dataset.type =
          documento.tipo;

        row.dataset.state =
          documento.estado;


        row.innerHTML = `

        <td>
          <strong>
            ${escaparDocumentoHTML(
          documento.vehiculoPlaca
        )}
          </strong>
        </td>

        <td>
          ${escaparDocumentoHTML(
          documento.tipo
        )}
        </td>

        <td>
          ${escaparDocumentoHTML(
          documento.numero || '—'
        )}
        </td>

        <td>
          ${formatearFechaDocumento(
          documento.fecha
        )}
        </td>

        <td>
          ${escaparDocumentoHTML(
          documento.referencia || '—'
        )}
        </td>

        <td>

          <span
            class="badge ${activo
            ? 'green'
            : 'gray'
          }"
          >

            ${activo
            ? 'Activo'
            : 'Anulado'
          }

          </span>

        </td>

        <td>

          <div class="document-actions">

            <button
              type="button"
              class="btn soft document-view"
              data-id="${documento.id}"
            >
              Ver
            </button>

            <button
              type="button"
              class="btn document-edit"
              data-id="${documento.id}"
            >
              Editar
            </button>

            ${activo

            ? `

                  <button
                    type="button"
                    class="btn invalidate document-toggle"
                    data-id="${documento.id}"
                  >
                    Anular
                  </button>

                `

            : `

                  <button
                    type="button"
                    class="btn restore document-toggle"
                    data-id="${documento.id}"
                  >
                    Restaurar
                  </button>

                `
          }

          </div>

        </td>

      `;


        documentBody.appendChild(
          row
        );

      }
    );


    aplicarFiltrosDocumentos();

  }


  /* =========================================================
     RENDER MOVIMIENTOS
  ========================================================= */

  function renderMovimientosDocumentales() {

    if (!documentMovementBody) {
      return;
    }


    documentMovementBody.innerHTML = '';


    movimientosDocumentales.forEach(
      function (movimiento) {

        var documento =
          buscarDocumento(
            movimiento.documentoId
          );


        var activo =
          movimiento.estado ===
          'ACTIVO';


        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          movimiento.id;

        row.dataset.type =
          movimiento.tipo;

        row.dataset.state =
          movimiento.estado;


        row.innerHTML = `

        <td>
          ${formatearFechaHoraDocumento(
          movimiento.fecha
        )}
        </td>

        <td>

          <span
            class="badge ${movimiento.tipo === 'ENTREGA'
            ? 'orange'
            : 'green'
          }"
          >

            ${movimiento.tipo === 'ENTREGA'
            ? 'Entrega'
            : 'Recepción'
          }

          </span>

        </td>

        <td>
          ${escaparDocumentoHTML(
            documento
              ? documento.vehiculoPlaca
              : '—'
          )}
        </td>

        <td>
          ${escaparDocumentoHTML(
            documento
              ? documento.tipo
              : '—'
          )}
        </td>

        <td>
          ${escaparDocumentoHTML(
            documento
              ? documento.numero || '—'
              : '—'
          )}
        </td>

        <td>
          ${escaparDocumentoHTML(
            movimiento.unidad || '—'
          )}
        </td>

        <td>
          ${escaparDocumentoHTML(
            movimiento.persona +
            (
              movimiento.grado
                ? ' · ' +
                movimiento.grado
                : ''
            )
          )}
        </td>

        <td>

          <span
            class="badge ${activo
            ? 'green'
            : 'gray'
          }"
          >

            ${activo
            ? 'Vigente'
            : 'Anulado'
          }

          </span>

        </td>

        <td>

          <div class="document-movement-actions">

            <button
              type="button"
              class="btn movement-edit"
              data-id="${movimiento.id}"
            >
              Corregir
            </button>

            <button
              type="button"
              class="btn ${activo
            ? 'invalidate'
            : 'restore'
          } movement-toggle"
              data-id="${movimiento.id}"
            >

              ${activo
            ? 'Anular'
            : 'Restaurar'
          }

            </button>

          </div>

        </td>

      `;


        documentMovementBody
          .appendChild(row);

      }
    );


    aplicarFiltrosMovimientosDocumentales();

  }


  /* =========================================================
     INDICADORES
  ========================================================= */

  function actualizarResumenDocumentacion() {

    var vehiculosConDocumento =
      new Set(
        documentos

          .filter(
            function (documento) {

              return (
                documento.estado ===
                'ACTIVO'
              );

            }
          )

          .map(
            function (documento) {

              return documento.vehiculoId;

            }
          )
      );


    var activos =
      documentos.filter(
        function (documento) {

          return (
            documento.estado ===
            'ACTIVO'
          );

        }
      ).length;


    var movimientos =
      movimientosDocumentales.filter(
        function (movimiento) {

          return (
            movimiento.estado ===
            'ACTIVO'
          );

        }
      ).length;


    var elTotalExpedientes =
      document.getElementById('totalExpedientesDocumentales');
    if (elTotalExpedientes) {
      elTotalExpedientes.textContent =
        vehiculosConDocumento.size;
    }


    var elTotalActivos =
      document.getElementById('totalDocumentosActivos');
    if (elTotalActivos) {
      elTotalActivos.textContent =
        activos;
    }


    var elTotalMovimientos =
      document.getElementById('totalMovimientosDocumentales');
    if (elTotalMovimientos) {
      elTotalMovimientos.textContent =
        movimientos;
    }

  }


  /* =========================================================
     NUEVO DOCUMENTO
  ========================================================= */

  function nuevoDocumento() {

    documentoForm.reset();


    camposDocumento.id.value =
      '';


    cargarSelectVehiculosDocumento();


    document
      .getElementById(
        'documentoModalTitulo'
      )
      .textContent =
      'Registrar documento';


    document
      .getElementById(
        'btnGuardarDocumento'
      )
      .textContent =
      'Guardar documento';


    openModal(
      'documentoModal'
    );

  }


  /* =========================================================
     EDITAR DOCUMENTO
  ========================================================= */

  function editarDocumento(id) {

    var documento =
      buscarDocumento(id);


    if (!documento) {
      return;
    }


    cargarSelectVehiculosDocumento();


    camposDocumento.id.value =
      documento.id;


    camposDocumento.vehiculo.value =
      documento.vehiculoId;


    camposDocumento.tipo.value =
      documento.tipo;


    camposDocumento.numero.value =
      documento.numero || '';


    camposDocumento.fecha.value =
      documento.fecha || '';


    camposDocumento.referencia.value =
      documento.referencia || '';


    camposDocumento.observaciones.value =
      documento.observaciones || '';


    document
      .getElementById(
        'documentoModalTitulo'
      )
      .textContent =
      'Editar documento';


    document
      .getElementById(
        'btnGuardarDocumento'
      )
      .textContent =
      'Guardar cambios';


    openModal(
      'documentoModal'
    );

  }


  /* =========================================================
     GUARDAR DOCUMENTO
  ========================================================= */

  function procesarDocumento(event) {

    event.preventDefault();


    var id =
      camposDocumento.id.value;


    var vehiculoId =
      camposDocumento
        .vehiculo
        .value;


    var tipo =
      camposDocumento
        .tipo
        .value;


    var numero =
      camposDocumento
        .numero
        .value
        .trim()
        .toUpperCase();


    if (
      !vehiculoId ||
      !tipo
    ) {

      toast(
        'Seleccione el vehículo y el tipo de documento'
      );

      return;

    }


    var vehiculo =
      obtenerVehiculosDocumentacion()
        .find(
          function (item) {

            return (
              item.id ===
              vehiculoId
            );

          }
        );


    if (!vehiculo) {

      toast(
        'No se encontró el vehículo seleccionado'
      );

      return;

    }


    /*
     * Número documental duplicado.
     */

    if (numero) {

      var duplicado =
        documentos.some(
          function (documento) {

            return (
              String(
                documento.numero || ''
              ).toUpperCase() ===
              numero &&
              documento.id !== id
            );

          }
        );


      if (duplicado) {

        toast(
          'Ya existe un documento con ese número'
        );

        return;

      }

    }


    if (id) {

      var indice =
        documentos.findIndex(
          function (documento) {

            return (
              documento.id === id
            );

          }
        );


      if (indice === -1) {
        return;
      }


      var anterior =
        documentos[indice];


      documentos[indice] = {

        id:
          anterior.id,

        vehiculoId:
          vehiculoId,

        vehiculoPlaca:
          vehiculo.placa,

        tipo:
          tipo,

        numero:
          numero,

        fecha:
          camposDocumento.fecha.value,

        referencia:
          camposDocumento
            .referencia
            .value
            .trim(),

        observaciones:
          camposDocumento
            .observaciones
            .value
            .trim(),

        estado:
          anterior.estado

      };


      guardarDocumentos();

      renderDocumentos();

      renderMovimientosDocumentales();

      actualizarResumenDocumentacion();

      cargarSelectDocumentosMovimiento();

      closeAllModals();


      toast(
        'Documento actualizado correctamente'
      );


      return;

    }


    var nuevo = {

      id:
        'documento-' +
        Date.now(),

      vehiculoId:
        vehiculoId,

      vehiculoPlaca:
        vehiculo.placa,

      tipo:
        tipo,

      numero:
        numero,

      fecha:
        camposDocumento.fecha.value,

      referencia:
        camposDocumento
          .referencia
          .value
          .trim(),

      observaciones:
        camposDocumento
          .observaciones
          .value
          .trim(),

      estado:
        'ACTIVO'

    };


    documentos.push(
      nuevo
    );


    guardarDocumentos();

    renderDocumentos();

    actualizarResumenDocumentacion();

    cargarSelectDocumentosMovimiento();

    closeAllModals();


    toast(
      'Documento registrado correctamente'
    );

  }


  /* =========================================================
     ANULAR / RESTAURAR DOCUMENTO
  ========================================================= */

  function cambiarEstadoDocumento(id) {

    var documento =
      buscarDocumento(id);


    if (!documento) {
      return;
    }


    var activo =
      documento.estado ===
      'ACTIVO';


    if (
      activo &&
      movimientosDocumentales.some(
        function (movimiento) {

          return (
            movimiento.documentoId ===
            documento.id &&
            movimiento.estado ===
            'ACTIVO'
          );

        }
      )
    ) {

      toast(
        'El documento tiene movimientos vigentes. Revise su trazabilidad antes de anularlo.'
      );

      return;

    }


    var confirmar =
      window.confirm(
        '¿Está seguro de ' +
        (
          activo
            ? 'anular'
            : 'restaurar'
        ) +
        ' el documento ' +
        (
          documento.numero ||
          documento.tipo
        ) +
        '?'
      );


    if (!confirmar) {
      return;
    }


    documento.estado =
      activo
        ? 'ANULADO'
        : 'ACTIVO';


    guardarDocumentos();

    renderDocumentos();

    actualizarResumenDocumentacion();

    cargarSelectDocumentosMovimiento();


    toast(
      activo
        ? 'Documento anulado correctamente'
        : 'Documento restaurado correctamente'
    );

  }


  /* =========================================================
     VER DOCUMENTO
  ========================================================= */

  function verDocumento(id) {

    var documento =
      buscarDocumento(id);


    if (!documento) {
      return;
    }


    var cantidadMovimientos =
      movimientosDocumentales.filter(
        function (movimiento) {

          return (
            movimiento.documentoId ===
            documento.id
          );

        }
      ).length;


    document
      .getElementById(
        'detailDocumentVehicle'
      )
      .textContent =
      documento.vehiculoPlaca;


    document
      .getElementById(
        'detailDocumentType'
      )
      .textContent =
      documento.tipo;


    document
      .getElementById(
        'detailDocumentNumber'
      )
      .textContent =
      documento.numero || '—';


    document
      .getElementById(
        'detailDocumentDate'
      )
      .textContent =
      formatearFechaDocumento(
        documento.fecha
      );


    document
      .getElementById(
        'detailDocumentState'
      )
      .textContent =
      documento.estado === 'ACTIVO'
        ? 'Activo'
        : 'Anulado';


    document
      .getElementById(
        'detailDocumentMovements'
      )
      .textContent =
      cantidadMovimientos;


    document
      .getElementById(
        'detailDocumentReference'
      )
      .textContent =
      documento.referencia || '—';


    document
      .getElementById(
        'detailDocumentObservations'
      )
      .textContent =
      documento.observaciones ||
      'Sin observaciones';


    openModal(
      'documentDetailModal'
    );

  }


  /* =========================================================
     NUEVO MOVIMIENTO
  ========================================================= */

  function nuevoMovimientoDocumento() {

    documentMovementForm.reset();


    camposMovimientoDocumento.id.value =
      '';


    cargarSelectDocumentosMovimiento();


    camposMovimientoDocumento.tipo.value =
      'ENTREGA';


    camposMovimientoDocumento.fecha.value =
      fechaHoraLocalDocumento();


    camposMovimientoDocumento.vehiculo.value =
      '';


    camposMovimientoDocumento.referencia.value =
      '';


    document
      .getElementById(
        'movimientoDocumentoModalTitulo'
      )
      .textContent =
      'Registrar movimiento documental';


    document
      .getElementById(
        'btnGuardarMovimientoDocumento'
      )
      .textContent =
      'Guardar movimiento';


    openModal(
      'documentacionModal'
    );

  }


  /* =========================================================
     EDITAR MOVIMIENTO
  ========================================================= */

  function editarMovimientoDocumento(id) {

    var movimiento =
      movimientosDocumentales.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!movimiento) {
      return;
    }


    documentMovementForm.reset();


    cargarSelectDocumentosMovimiento();


    camposMovimientoDocumento.id.value =
      movimiento.id;


    camposMovimientoDocumento.tipo.value =
      movimiento.tipo;


    camposMovimientoDocumento.documento.value =
      movimiento.documentoId;


    sincronizarDocumentoMovimiento();


    camposMovimientoDocumento.fecha.value =
      movimiento.fecha;


    camposMovimientoDocumento.unidad.value =
      movimiento.unidad || '';


    camposMovimientoDocumento.persona.value =
      movimiento.persona || '';


    camposMovimientoDocumento.grado.value =
      movimiento.grado || '';


    camposMovimientoDocumento.observaciones.value =
      movimiento.observaciones || '';


    document
      .getElementById(
        'movimientoDocumentoModalTitulo'
      )
      .textContent =
      'Corregir movimiento documental';


    document
      .getElementById(
        'btnGuardarMovimientoDocumento'
      )
      .textContent =
      'Guardar corrección';


    openModal(
      'documentacionModal'
    );

  }


  /* =========================================================
     GUARDAR MOVIMIENTO
  ========================================================= */

  function procesarMovimientoDocumento(event) {

    event.preventDefault();


    var id =
      camposMovimientoDocumento.id.value;


    var documentoId =
      camposMovimientoDocumento
        .documento
        .value;


    var tipo =
      camposMovimientoDocumento
        .tipo
        .value;


    var fecha =
      camposMovimientoDocumento
        .fecha
        .value;


    var persona =
      camposMovimientoDocumento
        .persona
        .value
        .trim();


    if (
      !documentoId ||
      !tipo ||
      !fecha ||
      !persona
    ) {

      toast(
        'Complete los campos obligatorios'
      );

      return;

    }


    if (!buscarDocumento(documentoId)) {

      toast(
        'El documento seleccionado no existe'
      );

      return;

    }


    if (id) {

      var indice =
        movimientosDocumentales.findIndex(
          function (movimiento) {

            return movimiento.id === id;

          }
        );


      if (indice === -1) {
        return;
      }


      var anterior =
        movimientosDocumentales[indice];


      movimientosDocumentales[indice] = {

        id:
          anterior.id,

        documentoId:
          documentoId,

        tipo:
          tipo,

        fecha:
          fecha,

        unidad:
          camposMovimientoDocumento
            .unidad
            .value
            .trim(),

        persona:
          persona,

        grado:
          camposMovimientoDocumento
            .grado
            .value
            .trim(),

        observaciones:
          camposMovimientoDocumento
            .observaciones
            .value
            .trim(),

        estado:
          anterior.estado

      };


      guardarMovimientosDocumentales();

      renderMovimientosDocumentales();

      actualizarResumenDocumentacion();

      closeAllModals();


      toast(
        'Movimiento corregido correctamente'
      );


      return;

    }


    var nuevo = {

      id:
        'mov-doc-' +
        Date.now(),

      documentoId:
        documentoId,

      tipo:
        tipo,

      fecha:
        fecha,

      unidad:
        camposMovimientoDocumento
          .unidad
          .value
          .trim(),

      persona:
        persona,

      grado:
        camposMovimientoDocumento
          .grado
          .value
          .trim(),

      observaciones:
        camposMovimientoDocumento
          .observaciones
          .value
          .trim(),

      estado:
        'ACTIVO'

    };


    movimientosDocumentales.push(
      nuevo
    );


    guardarMovimientosDocumentales();

    renderMovimientosDocumentales();

    actualizarResumenDocumentacion();

    closeAllModals();


    toast(
      tipo === 'ENTREGA'
        ? 'Entrega registrada correctamente'
        : 'Recepción registrada correctamente'
    );

  }


  /* =========================================================
     ANULAR / RESTAURAR MOVIMIENTO
  ========================================================= */

  function cambiarEstadoMovimientoDocumento(id) {

    var movimiento =
      movimientosDocumentales.find(
        function (item) {

          return item.id === id;

        }
      );


    if (!movimiento) {
      return;
    }


    var activo =
      movimiento.estado ===
      'ACTIVO';


    var confirmar =
      window.confirm(
        '¿Está seguro de ' +
        (
          activo
            ? 'anular'
            : 'restaurar'
        ) +
        ' este movimiento documental?'
      );


    if (!confirmar) {
      return;
    }


    movimiento.estado =
      activo
        ? 'ANULADO'
        : 'ACTIVO';


    guardarMovimientosDocumentales();

    renderMovimientosDocumentales();

    actualizarResumenDocumentacion();


    toast(
      activo
        ? 'Movimiento anulado correctamente'
        : 'Movimiento restaurado correctamente'
    );

  }


  /* =========================================================
     FILTROS DOCUMENTOS
  ========================================================= */

  function aplicarFiltrosDocumentos() {

    if (!documentBody) {
      return;
    }


    var texto =
      documentSearch
        ? documentSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var tipo =
      documentTypeFilter
        ? documentTypeFilter.value
        : '';


    var estado =
      documentStateFilter
        ? documentStateFilter.value
        : '';


    documentBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =
            !texto ||
            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideTipo =
            !tipo ||
            row.dataset.type === tipo;


          var coincideEstado =
            !estado ||
            row.dataset.state === estado;


          row.style.display =
            (
              coincideTexto &&
              coincideTipo &&
              coincideEstado
            )
              ? ''
              : 'none';

        }
      );

  }


  /* =========================================================
     FILTROS MOVIMIENTOS
  ========================================================= */

  function aplicarFiltrosMovimientosDocumentales() {

    if (!documentMovementBody) {
      return;
    }


    var texto =
      movementSearch
        ? movementSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var tipo =
      movementTypeFilter
        ? movementTypeFilter.value
        : '';


    documentMovementBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =
            !texto ||
            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideTipo =
            !tipo ||
            row.dataset.type === tipo;


          row.style.display =
            (
              coincideTexto &&
              coincideTipo
            )
              ? ''
              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnRegistrarDocumento) {

    btnRegistrarDocumento.addEventListener(
      'click',
      nuevoDocumento
    );

  }


  if (btnRegistrarMovimiento) {

    btnRegistrarMovimiento.addEventListener(
      'click',
      nuevoMovimientoDocumento
    );

  }


  if (documentoForm) {

    documentoForm.addEventListener(
      'submit',
      procesarDocumento
    );

  }


  if (documentMovementForm) {

    documentMovementForm.addEventListener(
      'submit',
      procesarMovimientoDocumento
    );

  }


  if (
    camposMovimientoDocumento.documento
  ) {

    camposMovimientoDocumento
      .documento
      .addEventListener(
        'change',
        sincronizarDocumentoMovimiento
      );

  }


  /* Tabla documentos */

  if (documentBody) {

    documentBody.addEventListener(
      'click',
      function (event) {

        var ver =
          event.target.closest(
            '.document-view'
          );

        var editar =
          event.target.closest(
            '.document-edit'
          );

        var estado =
          event.target.closest(
            '.document-toggle'
          );


        if (ver) {

          verDocumento(
            ver.dataset.id
          );

          return;

        }


        if (editar) {

          editarDocumento(
            editar.dataset.id
          );

          return;

        }


        if (estado) {

          cambiarEstadoDocumento(
            estado.dataset.id
          );

        }

      }
    );

  }


  /* Tabla movimientos */

  if (documentMovementBody) {

    documentMovementBody.addEventListener(
      'click',
      function (event) {

        var editar =
          event.target.closest(
            '.movement-edit'
          );

        var estado =
          event.target.closest(
            '.movement-toggle'
          );


        if (editar) {

          editarMovimientoDocumento(
            editar.dataset.id
          );

          return;

        }


        if (estado) {

          cambiarEstadoMovimientoDocumento(
            estado.dataset.id
          );

        }

      }
    );

  }


  /* Filtros expediente */

  if (documentSearch) {

    documentSearch.addEventListener(
      'input',
      aplicarFiltrosDocumentos
    );

  }


  if (documentTypeFilter) {

    documentTypeFilter.addEventListener(
      'change',
      aplicarFiltrosDocumentos
    );

  }


  if (documentStateFilter) {

    documentStateFilter.addEventListener(
      'change',
      aplicarFiltrosDocumentos
    );

  }


  /* Filtros movimientos */

  if (movementSearch) {

    movementSearch.addEventListener(
      'input',
      aplicarFiltrosMovimientosDocumentales
    );

  }


  if (movementTypeFilter) {

    movementTypeFilter.addEventListener(
      'change',
      aplicarFiltrosMovimientosDocumentales
    );

  }

  /* =========================================================
   RECORRIDOS
========================================================= */

  var STORAGE_RECORRIDOS = 'siv_recorridos_frontend_v1';


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var recorridoBody = document.getElementById('recorridoTableBody');

  var recorridoSearch = document.getElementById('recorridoSearch');

  var recorridoUnitFilter = document.getElementById('recorridoUnitFilter');

  var recorridoStateFilter = document.getElementById('recorridoStateFilter');

  var recorridoDateFilter = document.getElementById('recorridoDateFilter');

  var btnNuevoRecorrido = document.getElementById('btnNuevoRecorrido');

  var recorridoForm = document.getElementById('recorridoForm');

  var recorridoCierreForm = document.getElementById('recorridoCierreForm');

  var recorridoReturnFields = document.getElementById('recorridoReturnFields');

  var recorridoModalTitulo = document.getElementById('recorridoModalTitulo');

  var btnGuardarRecorrido = document.getElementById('btnGuardarRecorrido');


  /* =========================================================
     CAMPOS DEL FORMULARIO
  ========================================================= */

  var camposRecorrido = {

    id: document.getElementById('recorridoId'),

    vehiculo: document.getElementById('recorridoVehiculo'),

    conductor: document.getElementById('recorridoConductor'),

    unidad: document.getElementById('recorridoUnidad'),

    destino: document.getElementById('recorridoDestino'),

    motivo: document.getElementById('recorridoMotivo'),

    salida: document.getElementById('recorridoSalida'),

    llegada: document.getElementById('recorridoLlegada'),

    kmInicio: document.getElementById('recorridoKmInicio'),

    kmFin: document.getElementById('recorridoKmFin'),

    combustibleSalida:
      document.getElementById('recorridoCombustibleSalida'),

    combustibleLlegada:
      document.getElementById('recorridoCombustibleLlegada'),

    estadoSalida:
      document.getElementById('recorridoEstadoSalida'),

    estadoLlegada:
      document.getElementById('recorridoEstadoLlegada'),

    danos:
      document.getElementById('recorridoDanos'),

    observaciones:
      document.getElementById('recorridoObservaciones')

  };


  /* =========================================================
     CAMPOS PARA CERRAR RECORRIDO
  ========================================================= */

  var camposCierreRecorrido = {

    id:
      document.getElementById('recorridoCierreId'),

    vehiculo:
      document.getElementById('recorridoCierreVehiculo'),

    kmInicio:
      document.getElementById('recorridoCierreKmInicio'),

    llegada:
      document.getElementById('recorridoCierreLlegada'),

    kmFin:
      document.getElementById('recorridoCierreKmFin'),

    combustible:
      document.getElementById('recorridoCierreCombustible'),

    estado:
      document.getElementById('recorridoCierreEstado'),

    danos:
      document.getElementById('recorridoCierreDanos'),

    observaciones:
      document.getElementById('recorridoCierreObservaciones')

  };


  var recorridos = [];


  /* =========================================================
     BUSCAR RECORRIDO
  ========================================================= */

  function buscarRecorridoPorId(id) {

    return recorridos.find(function (r) {

      return String(r.id) === String(id);

    });

  }


  /* =========================================================
     UTILIDAD PARA DETALLE
  ========================================================= */

  function ponerTextoRecorrido(id, valor) {

    var elemento = document.getElementById(id);

    if (elemento) {

      elemento.textContent =
        valor === undefined ||
          valor === null ||
          valor === ''
          ? '—'
          : valor;

    }

  }


  /* =========================================================
     FECHAS
  ========================================================= */

  function fechaDesdeDateTime(valor) {

    return String(valor || '').split('T')[0];

  }


  function formatearFechaRecorrido(valor) {

    var fecha = fechaDesdeDateTime(valor);

    if (
      !fecha ||
      fecha.indexOf('-') === -1
    ) {

      return '—';

    }


    var partes = fecha.split('-');


    return (
      partes[2] +
      '/' +
      partes[1] +
      '/' +
      partes[0]
    );

  }


  function formatearHoraRecorrido(valor) {

    var partes =
      String(valor || '').split('T');


    if (partes.length < 2) {

      return '—';

    }


    return partes[1].slice(0, 5) || '—';

  }


  function formatearFechaHoraRecorrido(valor) {

    if (!valor) {

      return '—';

    }


    return (
      formatearFechaRecorrido(valor) +
      ' · ' +
      formatearHoraRecorrido(valor)
    );

  }


  /* Fecha actual para datetime-local */

  function ahoraParaInput() {

    var ahora = new Date();

    var offset = ahora.getTimezoneOffset();

    var local = new Date(
      ahora.getTime() -
      offset * 60000
    );


    return local
      .toISOString()
      .slice(0, 16);

  }


  /* =========================================================
     CALCULAR KM
  ========================================================= */

  function kmRecorrido(item) {

    var inicio = Number(item.kmInicio);

    var fin = Number(item.kmFin);


    if (
      item.kmFin === '' ||
      item.kmFin === null ||
      item.kmFin === undefined
    ) {

      return null;

    }


    if (
      !Number.isFinite(inicio) ||
      !Number.isFinite(fin) ||
      fin < inicio
    ) {

      return null;

    }


    return fin - inicio;

  }


  /* =========================================================
     OBTENER DATOS INICIALES DESDE LA TABLA
  ========================================================= */

  function obtenerRecorridosIniciales() {

    if (!recorridoBody) {

      return [];

    }


    return Array
      .from(
        recorridoBody.querySelectorAll('tr')
      )
      .map(function (row, index) {

        var c = row.children;


        return {

          id:
            String(
              row.dataset.id ||
              ('recorrido-' + (index + 1))
            ),


          vehiculo:
            c[1]
              ? c[1].textContent.trim()
              : '',


          conductor:
            c[2]
              ? c[2].textContent.trim()
              : '',


          unidad:
            row.dataset.unit ||
            (
              c[3]
                ? c[3].textContent.trim()
                : ''
            ),


          destino:
            c[4]
              ? c[4].textContent.trim()
              : '',


          motivo:
            row.dataset.motivo || '',


          salida:
            row.dataset.salida || '',


          llegada:
            row.dataset.llegada || '',


          kmInicio:
            row.dataset.kmInicio || '',


          kmFin:
            row.dataset.kmFin || '',


          combustibleSalida:
            row.dataset.combustibleSalida || '',


          combustibleLlegada:
            row.dataset.combustibleLlegada || '',


          estadoSalida:
            row.dataset.estadoSalida || 'Bueno',


          estadoLlegada:
            row.dataset.estadoLlegada || '',


          danos:
            row.dataset.danos || '',


          observaciones:
            row.dataset.observaciones || '',


          estado:
            row.dataset.state || 'ABIERTO'

        };

      });

  }


  /* =========================================================
     NORMALIZAR DATOS
  ========================================================= */

  function normalizarRecorrido(item, index) {

    return {

      id:
        String(
          item.id ||
          ('recorrido-' + (index + 1))
        ),

      vehiculo:
        item.vehiculo || '',

      conductor:
        item.conductor || '',

      unidad:
        item.unidad || '',

      destino:
        item.destino || '',

      motivo:
        item.motivo || '',

      salida:
        item.salida || '',

      llegada:
        item.llegada || '',

      kmInicio:
        item.kmInicio !== undefined
          ? String(item.kmInicio)
          : '',

      kmFin:
        item.kmFin !== undefined &&
          item.kmFin !== null
          ? String(item.kmFin)
          : '',

      combustibleSalida:
        item.combustibleSalida || '',

      combustibleLlegada:
        item.combustibleLlegada || '',

      estadoSalida:
        item.estadoSalida || 'Bueno',

      estadoLlegada:
        item.estadoLlegada || '',

      danos:
        item.danos || '',

      observaciones:
        item.observaciones || '',

      estado:
        item.estado === 'CERRADO'
          ? 'CERRADO'
          : 'ABIERTO'

    };

  }


  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  function cargarRecorridos() {

    var guardados =
      localStorage.getItem(
        STORAGE_RECORRIDOS
      );


    if (guardados) {

      try {

        var parseados =
          JSON.parse(guardados);


        if (Array.isArray(parseados)) {

          recorridos =
            parseados.map(
              normalizarRecorrido
            );

          guardarRecorridos();

          return;

        }

      }
      catch (error) {

        console.error(
          'Error leyendo recorridos:',
          error
        );

      }

    }


    recorridos =
      obtenerRecorridosIniciales();


    guardarRecorridos();

  }


  function guardarRecorridos() {

    localStorage.setItem(
      STORAGE_RECORRIDOS,
      JSON.stringify(recorridos)
    );

  }


  /* =========================================================
     ESTADOS
  ========================================================= */

  function claseEstadoRecorrido(estado) {

    return estado === 'CERRADO'
      ? 'green'
      : 'orange';

  }


  function textoEstadoRecorrido(estado) {

    return estado === 'CERRADO'
      ? 'Cerrado'
      : 'Abierto';

  }


  /* =========================================================
     INDICADORES
  ========================================================= */

  function actualizarResumenRecorridos() {

    var total = recorridos.length;


    var abiertos =
      recorridos.filter(function (r) {

        return r.estado === 'ABIERTO';

      }).length;


    var cerrados =
      recorridos.filter(function (r) {

        return r.estado === 'CERRADO';

      }).length;


    var kmTotal =
      recorridos.reduce(
        function (suma, r) {

          var km = kmRecorrido(r);

          return suma + (
            km === null
              ? 0
              : km
          );

        },
        0
      );


    var totalEl =
      document.getElementById(
        'recorridoMetricTotal'
      );


    var abiertosEl =
      document.getElementById(
        'recorridoMetricAbiertos'
      );


    var cerradosEl =
      document.getElementById(
        'recorridoMetricCerrados'
      );


    var kmEl =
      document.getElementById(
        'recorridoMetricKm'
      );


    if (totalEl) {

      totalEl.textContent = total;

    }


    if (abiertosEl) {

      abiertosEl.textContent = abiertos;

    }


    if (cerradosEl) {

      cerradosEl.textContent = cerrados;

    }


    if (kmEl) {

      kmEl.textContent =
        formatearKm(kmTotal);

    }

  }


  /* =========================================================
     RENDERIZAR TABLA
  ========================================================= */

  function renderRecorridos() {

    if (!recorridoBody) {

      return;

    }


    recorridoBody.innerHTML = '';


    recorridos.forEach(function (item) {

      var km = kmRecorrido(item);

      var row =
        document.createElement('tr');


      row.dataset.id =
        String(item.id);


      row.dataset.unit =
        item.unidad || '';


      row.dataset.state =
        item.estado || 'ABIERTO';


      row.dataset.date =
        fechaDesdeDateTime(
          item.salida
        );


      row.innerHTML = `

      <td>
        ${escaparHTML(
        formatearFechaRecorrido(
          item.salida
        )
      )}
      </td>


      <td>

        <strong>
          ${escaparHTML(
        item.vehiculo
      )}
        </strong>

      </td>


      <td>
        ${escaparHTML(
        item.conductor
      )}
      </td>


      <td>
        ${escaparHTML(
        item.unidad || '—'
      )}
      </td>


      <td>

        <div class="recorrido-destination">

          <strong>
            ${escaparHTML(
        item.destino
      )}
          </strong>


          ${item.motivo
          ? `
                <small>
                  ${escaparHTML(
            item.motivo
          )}
                </small>
              `
          : ''
        }

        </div>

      </td>


      <td>
        ${escaparHTML(
          formatearHoraRecorrido(
            item.salida
          )
        )}
      </td>


      <td>
        ${escaparHTML(
          formatearHoraRecorrido(
            item.llegada
          )
        )}
      </td>


      <td>

        ${km === null
          ? '—'
          : escaparHTML(
            formatearKm(km) +
            ' km'
          )
        }

      </td>


      <td>

        <span
          class="badge ${claseEstadoRecorrido(
          item.estado
        )}">

          ${textoEstadoRecorrido(
          item.estado
        )}

        </span>

      </td>


      <td>

        <div class="recorrido-actions">


          <button
            type="button"
            class="btn soft recorrido-view"
            data-id="${escaparHTML(
          String(item.id)
        )}">
            Ver
          </button>


          <button
            type="button"
            class="btn recorrido-edit"
            data-id="${escaparHTML(
          String(item.id)
        )}">
            Corregir
          </button>


          ${item.estado === 'ABIERTO'
          ? `
                <button
                  type="button"
                  class="btn recorrido-close"
                  data-id="${escaparHTML(
            String(item.id)
          )}">
                  Cerrar
                </button>
              `
          : ''
        }


        </div>

      </td>

    `;


      recorridoBody.appendChild(row);

    });


    actualizarResumenRecorridos();

    aplicarFiltrosRecorridos();

  }


  /* =========================================================
     NUEVO RECORRIDO
  ========================================================= */

  function nuevoRecorrido() {

    if (!recorridoForm) {

      return;

    }


    recorridoForm.reset();


    camposRecorrido.id.value = '';


    camposRecorrido.salida.value =
      ahoraParaInput();


    camposRecorrido.estadoSalida.value =
      'Bueno';


    if (recorridoReturnFields) {

      recorridoReturnFields
        .classList
        .remove('show');

    }


    if (recorridoModalTitulo) {

      recorridoModalTitulo.textContent =
        'Registrar recorrido';

    }


    if (btnGuardarRecorrido) {

      btnGuardarRecorrido.textContent =
        'Guardar recorrido';

    }


    openModal('recorridoModal');

  }


  /* =========================================================
     CORREGIR RECORRIDO
  ========================================================= */

  function editarRecorrido(id) {

    var item =
      buscarRecorridoPorId(id);


    if (!item) {

      toast(
        'No se encontró el recorrido'
      );

      return;

    }


    camposRecorrido.id.value =
      String(item.id);


    camposRecorrido.vehiculo.value =
      item.vehiculo || '';


    camposRecorrido.conductor.value =
      item.conductor || '';


    camposRecorrido.unidad.value =
      item.unidad || '';


    camposRecorrido.destino.value =
      item.destino || '';


    camposRecorrido.motivo.value =
      item.motivo || '';


    camposRecorrido.salida.value =
      item.salida || '';


    camposRecorrido.llegada.value =
      item.llegada || '';


    camposRecorrido.kmInicio.value =
      item.kmInicio || '';


    camposRecorrido.kmFin.value =
      item.kmFin || '';


    camposRecorrido.combustibleSalida.value =
      item.combustibleSalida || '';


    camposRecorrido.combustibleLlegada.value =
      item.combustibleLlegada || '';


    camposRecorrido.estadoSalida.value =
      item.estadoSalida || 'Bueno';


    camposRecorrido.estadoLlegada.value =
      item.estadoLlegada || '';


    camposRecorrido.danos.value =
      item.danos || '';


    camposRecorrido.observaciones.value =
      item.observaciones || '';


    if (recorridoReturnFields) {

      recorridoReturnFields
        .classList
        .toggle(
          'show',
          item.estado === 'CERRADO'
        );

    }


    if (recorridoModalTitulo) {

      recorridoModalTitulo.textContent =
        'Corregir recorrido';

    }


    if (btnGuardarRecorrido) {

      btnGuardarRecorrido.textContent =
        'Guardar corrección';

    }


    openModal('recorridoModal');

  }


  /* =========================================================
     GUARDAR / ACTUALIZAR
  ========================================================= */

  function procesarRecorrido(event) {

    event.preventDefault();


    var id =
      camposRecorrido.id.value;


    var kmInicio =
      Number(
        camposRecorrido
          .kmInicio
          .value
      );


    var kmFinTexto =
      camposRecorrido
        .kmFin
        .value;


    var kmFin =
      kmFinTexto === ''
        ? null
        : Number(kmFinTexto);


    if (
      !camposRecorrido.vehiculo.value ||
      !camposRecorrido.conductor.value ||
      !camposRecorrido.unidad.value ||
      !camposRecorrido.destino.value.trim() ||
      !camposRecorrido.salida.value ||
      !Number.isFinite(kmInicio)
    ) {

      toast(
        'Complete los campos obligatorios del recorrido'
      );

      return;

    }


    if (
      kmFin !== null &&
      (
        !Number.isFinite(kmFin) ||
        kmFin < kmInicio
      )
    ) {

      toast(
        'El kilometraje final no puede ser menor al inicial'
      );

      camposRecorrido.kmFin.focus();

      return;

    }


    var cerrado =
      Boolean(
        camposRecorrido.llegada.value &&
        kmFin !== null
      );


    var datos = {

      id:
        String(
          id ||
          (
            'recorrido-' +
            Date.now()
          )
        ),


      vehiculo:
        camposRecorrido.vehiculo.value,


      conductor:
        camposRecorrido.conductor.value,


      unidad:
        camposRecorrido.unidad.value,


      destino:
        camposRecorrido
          .destino
          .value
          .trim(),


      motivo:
        camposRecorrido
          .motivo
          .value
          .trim(),


      salida:
        camposRecorrido.salida.value,


      llegada:
        cerrado
          ? camposRecorrido.llegada.value
          : '',


      kmInicio:
        String(kmInicio),


      kmFin:
        cerrado
          ? String(kmFin)
          : '',


      combustibleSalida:
        camposRecorrido
          .combustibleSalida
          .value,


      combustibleLlegada:
        cerrado
          ? camposRecorrido
            .combustibleLlegada
            .value
          : '',


      estadoSalida:
        camposRecorrido
          .estadoSalida
          .value,


      estadoLlegada:
        cerrado
          ? camposRecorrido
            .estadoLlegada
            .value
          : '',


      danos:
        camposRecorrido
          .danos
          .value
          .trim(),


      observaciones:
        camposRecorrido
          .observaciones
          .value
          .trim(),


      estado:
        cerrado
          ? 'CERRADO'
          : 'ABIERTO'

    };


    /* EDITAR */

    if (id) {

      var indice =
        recorridos.findIndex(
          function (r) {

            return (
              String(r.id) ===
              String(id)
            );

          }
        );


      if (indice !== -1) {

        recorridos[indice] =
          datos;

      }


      toast(
        'Recorrido corregido correctamente'
      );

    }

    /* NUEVO */

    else {

      recorridos.unshift(datos);


      toast(
        'Recorrido registrado correctamente'
      );

    }


    guardarRecorridos();

    renderRecorridos();

    closeAllModals();

  }


  /* =========================================================
     VER DETALLE
  ========================================================= */

  function verRecorrido(id) {

    var item =
      buscarRecorridoPorId(id);


    if (!item) {

      console.error(
        'No se encontró el recorrido:',
        id
      );


      toast(
        'No se pudo cargar el detalle del recorrido'
      );

      return;

    }


    var km =
      kmRecorrido(item);


    /* VEHÍCULO */

    ponerTextoRecorrido(
      'detalleRecorridoVehiculo',
      item.vehiculo
    );


    /* SUBTÍTULO */

    ponerTextoRecorrido(
      'detalleRecorridoSubtitulo',
      (
        item.destino ||
        'Sin destino'
      ) +
      ' · ' +
      formatearFechaRecorrido(
        item.salida
      )
    );


    /* CONDUCTOR */

    ponerTextoRecorrido(
      'detalleRecorridoConductor',
      item.conductor
    );


    /* UNIDAD */

    ponerTextoRecorrido(
      'detalleRecorridoUnidad',
      item.unidad
    );


    /* SALIDA */

    ponerTextoRecorrido(
      'detalleRecorridoSalida',
      formatearFechaHoraRecorrido(
        item.salida
      )
    );


    /* LLEGADA */

    ponerTextoRecorrido(
      'detalleRecorridoLlegada',
      formatearFechaHoraRecorrido(
        item.llegada
      )
    );


    /* KM INICIAL */

    ponerTextoRecorrido(
      'detalleRecorridoKmInicio',

      item.kmInicio !== ''
        ? formatearKm(
          Number(item.kmInicio)
        )
        : '—'
    );


    /* KM FINAL */

    ponerTextoRecorrido(
      'detalleRecorridoKmFin',

      item.kmFin !== ''
        ? formatearKm(
          Number(item.kmFin)
        )
        : '—'
    );


    /* KM TOTAL */

    ponerTextoRecorrido(
      'detalleRecorridoKmTotal',

      km === null
        ? '—'
        : (
          formatearKm(km) +
          ' km'
        )
    );


    /* COMBUSTIBLE */

    var combustibleSalida =
      item.combustibleSalida !== ''
        ? item.combustibleSalida + '%'
        : '—';


    var combustibleLlegada =
      item.combustibleLlegada !== ''
        ? item.combustibleLlegada + '%'
        : '—';


    ponerTextoRecorrido(
      'detalleRecorridoCombustible',

      combustibleSalida +
      ' → ' +
      combustibleLlegada
    );


    /* DESTINO / MOTIVO */

    ponerTextoRecorrido(
      'detalleRecorridoDestino',

      item.destino +
      (
        item.motivo
          ? ' · ' + item.motivo
          : ''
      )
    );


    /* ESTADO VEHÍCULO */

    ponerTextoRecorrido(
      'detalleRecorridoEstadoVehiculo',

      (
        item.estadoSalida ||
        '—'
      ) +
      ' → ' +
      (
        item.estadoLlegada ||
        'Pendiente'
      )
    );


    /* DAÑOS */

    ponerTextoRecorrido(
      'detalleRecorridoDanos',

      item.danos ||
      'Sin daños registrados.'
    );


    /* OBSERVACIONES */

    ponerTextoRecorrido(
      'detalleRecorridoObservaciones',

      item.observaciones ||
      'Sin observaciones.'
    );


    /* BADGE ESTADO */

    var estadoBadge =
      document.getElementById(
        'detalleRecorridoEstado'
      );


    if (estadoBadge) {

      estadoBadge.textContent =
        textoEstadoRecorrido(
          item.estado
        );


      estadoBadge.className =
        'badge ' +
        claseEstadoRecorrido(
          item.estado
        ) +
        ' recorrido-detail-status';

    }


    /* ABRIR MODAL */

    openModal(
      'recorridoDetalleModal'
    );

  }


  /* =========================================================
     ABRIR CIERRE
  ========================================================= */

  function abrirCierreRecorrido(id) {

    var item =
      buscarRecorridoPorId(id);


    if (!item) {

      toast(
        'No se encontró el recorrido'
      );

      return;

    }


    if (
      item.estado !== 'ABIERTO'
    ) {

      toast(
        'Este recorrido ya está cerrado'
      );

      return;

    }


    if (!recorridoCierreForm) {

      return;

    }


    recorridoCierreForm.reset();


    camposCierreRecorrido.id.value =
      String(item.id);


    camposCierreRecorrido.vehiculo.value =
      item.vehiculo;


    camposCierreRecorrido.kmInicio.value =
      item.kmInicio;


    camposCierreRecorrido.llegada.value =
      ahoraParaInput();


    camposCierreRecorrido.estado.value =
      'Bueno';


    openModal(
      'recorridoCierreModal'
    );

  }


  /* =========================================================
     CERRAR RECORRIDO
  ========================================================= */

  function cerrarRecorrido(event) {

    event.preventDefault();


    var id =
      camposCierreRecorrido
        .id
        .value;


    var item =
      buscarRecorridoPorId(id);


    if (!item) {

      toast(
        'No se encontró el recorrido'
      );

      return;

    }


    var kmInicio =
      Number(item.kmInicio);


    var kmFin =
      Number(
        camposCierreRecorrido
          .kmFin
          .value
      );


    if (
      !camposCierreRecorrido
        .llegada
        .value ||

      !camposCierreRecorrido
        .kmFin
        .value
    ) {

      toast(
        'Registre la fecha de llegada y el kilometraje final'
      );

      return;

    }


    if (
      !Number.isFinite(kmFin) ||
      kmFin < kmInicio
    ) {

      toast(
        'El kilometraje final no puede ser menor al inicial'
      );


      camposCierreRecorrido
        .kmFin
        .focus();


      return;

    }


    item.llegada =
      camposCierreRecorrido
        .llegada
        .value;


    item.kmFin =
      String(kmFin);


    item.combustibleLlegada =
      camposCierreRecorrido
        .combustible
        .value;


    item.estadoLlegada =
      camposCierreRecorrido
        .estado
        .value;


    item.danos =
      camposCierreRecorrido
        .danos
        .value
        .trim();


    var obsCierre =
      camposCierreRecorrido
        .observaciones
        .value
        .trim();


    if (obsCierre) {

      item.observaciones =
        item.observaciones
          ? (
            item.observaciones +
            ' · Cierre: ' +
            obsCierre
          )
          : obsCierre;

    }


    item.estado = 'CERRADO';


    guardarRecorridos();

    renderRecorridos();

    closeAllModals();


    toast(
      'Recorrido cerrado correctamente'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function aplicarFiltrosRecorridos() {

    if (!recorridoBody) {

      return;

    }


    var q =
      recorridoSearch
        ? recorridoSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var unit =
      recorridoUnitFilter
        ? recorridoUnitFilter.value
        : '';


    var state =
      recorridoStateFilter
        ? recorridoStateFilter.value
        : '';


    var date =
      recorridoDateFilter
        ? recorridoDateFilter.value
        : '';


    recorridoBody
      .querySelectorAll('tr')
      .forEach(function (row) {

        var coincideTexto =
          !q ||
          row
            .textContent
            .toLowerCase()
            .includes(q);


        var coincideUnidad =
          !unit ||
          row.dataset.unit === unit;


        var coincideEstado =
          !state ||
          row.dataset.state === state;


        var coincideFecha =
          !date ||
          row.dataset.date === date;


        row.style.display =
          (
            coincideTexto &&
            coincideUnidad &&
            coincideEstado &&
            coincideFecha
          )
            ? ''
            : 'none';

      });

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevoRecorrido) {

    btnNuevoRecorrido.addEventListener(
      'click',
      nuevoRecorrido
    );

  }


  /* Botones externos que abren nuevo recorrido */

  document
    .querySelectorAll(
      '[data-open="recorridoModal"]'
    )
    .forEach(function (btn) {

      if (
        btn.id !==
        'btnNuevoRecorrido'
      ) {

        btn.addEventListener(
          'click',
          nuevoRecorrido
        );

      }

    });


  /* GUARDAR */

  if (recorridoForm) {

    recorridoForm.addEventListener(
      'submit',
      procesarRecorrido
    );

  }


  /* CERRAR */

  if (recorridoCierreForm) {

    recorridoCierreForm.addEventListener(
      'submit',
      cerrarRecorrido
    );

  }


  /* =========================================================
     ACCIONES DE LA TABLA
  ========================================================= */

  if (recorridoBody) {

    recorridoBody.addEventListener(
      'click',
      function (event) {


        var ver =
          event.target.closest(
            '.recorrido-view'
          );


        var editar =
          event.target.closest(
            '.recorrido-edit'
          );


        var cerrar =
          event.target.closest(
            '.recorrido-close'
          );


        /* VER */

        if (ver) {

          var idVer =
            ver.getAttribute(
              'data-id'
            );


          verRecorrido(
            idVer
          );


          return;

        }


        /* CORREGIR */

        if (editar) {

          var idEditar =
            editar.getAttribute(
              'data-id'
            );


          editarRecorrido(
            idEditar
          );


          return;

        }


        /* CERRAR */

        if (cerrar) {

          var idCerrar =
            cerrar.getAttribute(
              'data-id'
            );


          abrirCierreRecorrido(
            idCerrar
          );


          return;

        }

      }
    );

  }


  /* =========================================================
     EVENTOS DE FILTROS
  ========================================================= */

  if (recorridoSearch) {

    recorridoSearch.addEventListener(
      'input',
      aplicarFiltrosRecorridos
    );

  }


  if (recorridoUnitFilter) {

    recorridoUnitFilter.addEventListener(
      'change',
      aplicarFiltrosRecorridos
    );

  }


  if (recorridoStateFilter) {

    recorridoStateFilter.addEventListener(
      'change',
      aplicarFiltrosRecorridos
    );

  }


  if (recorridoDateFilter) {

    recorridoDateFilter.addEventListener(
      'change',
      aplicarFiltrosRecorridos
    );

  }

  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarDocumentacionVehicular();

  cargarSelectVehiculosDocumento();

  cargarSelectDocumentosMovimiento();

  renderDocumentos();

  renderMovimientosDocumentales();

  actualizarResumenDocumentacion();

  cargarRecorridos();

  renderRecorridos();

  /* =========================================================
   COMBUSTIBLE
========================================================= */

  var STORAGE_COMBUSTIBLE =
    'siv_combustible_frontend_v1';


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var combustibleBody =
    document.getElementById(
      'combustibleTableBody'
    );


  var combustibleSearch =
    document.getElementById(
      'combustibleSearch'
    );


  var combustibleTypeFilter =
    document.getElementById(
      'combustibleTypeFilter'
    );


  var combustibleUnitFilter =
    document.getElementById(
      'combustibleUnitFilter'
    );


  var combustibleDateFilter =
    document.getElementById(
      'combustibleDateFilter'
    );


  var btnNuevoCombustible =
    document.getElementById(
      'btnNuevoCombustible'
    );


  var combustibleForm =
    document.getElementById(
      'combustibleForm'
    );


  var combustibleModalTitulo =
    document.getElementById(
      'combustibleModalTitulo'
    );


  var btnGuardarCombustible =
    document.getElementById(
      'btnGuardarCombustible'
    );


  /* =========================================================
     CAMPOS
  ========================================================= */

  var camposCombustible = {

    id:
      document.getElementById(
        'combustibleId'
      ),

    vehiculo:
      document.getElementById(
        'combustibleVehiculo'
      ),

    conductor:
      document.getElementById(
        'combustibleConductor'
      ),

    unidad:
      document.getElementById(
        'combustibleUnidad'
      ),

    fecha:
      document.getElementById(
        'combustibleFecha'
      ),

    km:
      document.getElementById(
        'combustibleKm'
      ),

    tipo:
      document.getElementById(
        'combustibleTipo'
      ),

    estacion:
      document.getElementById(
        'combustibleEstacion'
      ),

    litros:
      document.getElementById(
        'combustibleLitros'
      ),

    precio:
      document.getElementById(
        'combustiblePrecio'
      ),

    total:
      document.getElementById(
        'combustibleTotal'
      ),

    vale:
      document.getElementById(
        'combustibleVale'
      ),

    factura:
      document.getElementById(
        'combustibleFactura'
      ),

    observaciones:
      document.getElementById(
        'combustibleObservaciones'
      )

  };


  var combustibles = [];


  /* =========================================================
     BUSCAR
  ========================================================= */

  function buscarCombustiblePorId(id) {

    return combustibles.find(
      function (item) {

        return (
          String(item.id) ===
          String(id)
        );

      }
    );

  }


  /* =========================================================
     FECHAS
  ========================================================= */

  function fechaCombustible(valor) {

    return String(
      valor || ''
    ).split('T')[0];

  }


  function fechaHoraCombustible(valor) {

    if (!valor) {
      return '—';
    }


    var partes =
      valor.split('T');


    if (partes.length !== 2) {
      return valor;
    }


    var fecha =
      partes[0].split('-');


    return (
      fecha[2] +
      '/' +
      fecha[1] +
      '/' +
      fecha[0] +
      ' ' +
      partes[1].slice(0, 5)
    );

  }


  /* =========================================================
     DINERO
  ========================================================= */

  function formatoDineroCombustible(valor) {

    var numero =
      Number(valor || 0);


    return numero.toLocaleString(
      'es-BO',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  /* =========================================================
     TOTAL
  ========================================================= */

  function calcularTotalCombustible(
    litros,
    precio
  ) {

    var cantidad =
      Number(litros || 0);


    var precioUnitario =
      Number(precio || 0);


    if (
      !Number.isFinite(cantidad) ||
      !Number.isFinite(precioUnitario)
    ) {

      return 0;

    }


    return (
      cantidad *
      precioUnitario
    );

  }


  /* =========================================================
     ACTUALIZAR TOTAL FORMULARIO
  ========================================================= */

  function actualizarTotalCombustible() {

    if (!camposCombustible.total) {
      return;
    }


    var total =
      calcularTotalCombustible(

        camposCombustible.litros.value,

        camposCombustible.precio.value

      );


    camposCombustible.total.value =
      formatoDineroCombustible(
        total
      );

  }


  /* =========================================================
     DATOS INICIALES
  ========================================================= */

  function obtenerCombustiblesIniciales() {

    if (!combustibleBody) {
      return [];
    }


    return Array
      .from(
        combustibleBody
          .querySelectorAll('tr')
      )
      .map(
        function (row, index) {

          var c =
            row.children;


          var litrosTexto =
            c[6]
              ? c[6]
                .textContent
                .replace('L', '')
                .trim()
              : '0';


          var importeTexto =
            c[9]
              ? c[9]
                .textContent
                .replace('Bs', '')
                .replace(/\./g, '')
                .replace(',', '.')
                .trim()
              : '0';


          return {

            id:
              String(
                row.dataset.id ||
                (
                  'combustible-' +
                  (index + 1)
                )
              ),


            vehiculo:
              c[1]
                ? c[1]
                  .textContent
                  .trim()
                : '',


            conductor:
              row.dataset.conductor ||
              (
                c[2]
                  ? c[2]
                    .textContent
                    .trim()
                  : ''
              ),


            unidad:
              row.dataset.unit ||
              (
                c[3]
                  ? c[3]
                    .textContent
                    .trim()
                  : ''
              ),


            fecha:
              row.dataset.fecha ||
              '',


            km:
              c[4]
                ? c[4]
                  .textContent
                  .trim()
                  .replace(/\./g, '')
                : '',


            tipo:
              row.dataset.type ||
              '',


            litros:
              litrosTexto,


            estacion:
              c[7]
                ? c[7]
                  .textContent
                  .trim()
                : '',


            vale:
              c[8]
                ? c[8]
                  .textContent
                  .trim()
                : '',


            precio:
              row.dataset.precio ||
              '',


            total:
              importeTexto,


            factura:
              row.dataset.factura ||
              '',


            observaciones:
              row.dataset.observaciones ||
              ''

          };

        }
      );

  }


  /* =========================================================
     NORMALIZAR
  ========================================================= */

  function normalizarCombustible(
    item,
    index
  ) {

    return {

      id:
        String(
          item.id ||
          (
            'combustible-' +
            (index + 1)
          )
        ),

      vehiculo:
        item.vehiculo || '',

      conductor:
        item.conductor || '',

      unidad:
        item.unidad || '',

      fecha:
        item.fecha || '',

      km:
        String(
          item.km || ''
        ),

      tipo:
        item.tipo || '',

      litros:
        String(
          item.litros || ''
        ),

      estacion:
        item.estacion || '',

      vale:
        item.vale || '',

      precio:
        String(
          item.precio || ''
        ),

      total:
        String(
          item.total || ''
        ),

      factura:
        item.factura || '',

      observaciones:
        item.observaciones || ''

    };

  }


  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  function cargarCombustibles() {

    var datos =
      localStorage.getItem(
        STORAGE_COMBUSTIBLE
      );


    if (datos) {

      try {

        var resultado =
          JSON.parse(datos);


        if (
          Array.isArray(resultado)
        ) {

          combustibles =
            resultado.map(
              normalizarCombustible
            );

          return;

        }

      }
      catch (error) {

        console.error(
          'Error cargando combustible:',
          error
        );

      }

    }


    combustibles =
      obtenerCombustiblesIniciales();


    guardarCombustibles();

  }


  function guardarCombustibles() {

    localStorage.setItem(

      STORAGE_COMBUSTIBLE,

      JSON.stringify(
        combustibles
      )

    );

  }


  /* =========================================================
     INDICADORES
  ========================================================= */

  function actualizarResumenCombustible() {

    var totalRegistros =
      combustibles.length;


    var litros =
      combustibles.reduce(
        function (suma, item) {

          return (
            suma +
            Number(item.litros || 0)
          );

        },
        0
      );


    var importe =
      combustibles.reduce(
        function (suma, item) {

          return (
            suma +
            Number(item.total || 0)
          );

        },
        0
      );


    var vehiculosUnicos =
      new Set(

        combustibles
          .map(
            function (item) {

              return item.vehiculo;

            }
          )
          .filter(Boolean)

      ).size;


    var registrosEl =
      document.getElementById(
        'combustibleMetricRegistros'
      );


    var litrosEl =
      document.getElementById(
        'combustibleMetricLitros'
      );


    var importeEl =
      document.getElementById(
        'combustibleMetricImporte'
      );


    var vehiculosEl =
      document.getElementById(
        'combustibleMetricVehiculos'
      );


    if (registrosEl) {

      registrosEl.textContent =
        totalRegistros;

    }


    if (litrosEl) {

      litrosEl.textContent =
        formatoDineroCombustible(
          litros
        );

    }


    if (importeEl) {

      importeEl.textContent =
        'Bs ' +
        formatoDineroCombustible(
          importe
        );

    }


    if (vehiculosEl) {

      vehiculosEl.textContent =
        vehiculosUnicos;

    }

  }


  /* =========================================================
     RENDER
  ========================================================= */

  function renderCombustibles() {

    if (!combustibleBody) {
      return;
    }


    combustibleBody.innerHTML =
      '';


    combustibles.forEach(
      function (item) {

        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          String(item.id);


        row.dataset.date =
          fechaCombustible(
            item.fecha
          );


        row.dataset.unit =
          item.unidad || '';


        row.dataset.type =
          item.tipo || '';


        row.innerHTML = `

        <td>
          ${escaparHTML(
          fechaHoraCombustible(
            item.fecha
          )
        )}
        </td>


        <td>

          <strong>
            ${escaparHTML(
          item.vehiculo
        )}
          </strong>

        </td>


        <td>
          ${escaparHTML(
          item.conductor || '—'
        )}
        </td>


        <td>
          ${escaparHTML(
          item.unidad || '—'
        )}
        </td>


        <td>
          ${escaparHTML(
          formatearKm(
            item.km
          )
        )}
        </td>


        <td>
          ${escaparHTML(
          item.tipo === 'DIÉSEL'
            ? 'Diésel'
            : item.tipo
        )}
        </td>


        <td>
          ${escaparHTML(
          formatoDineroCombustible(
            item.litros
          )
        )} L
        </td>


        <td>
          ${escaparHTML(
          item.estacion || '—'
        )}
        </td>


        <td>
          ${escaparHTML(
          item.vale || '—'
        )}
        </td>


        <td>
          Bs ${escaparHTML(
          formatoDineroCombustible(
            item.total
          )
        )}
        </td>


        <td>

          <div class="combustible-actions">


            <button
              type="button"
              class="btn soft combustible-view"
              data-id="${escaparHTML(
          String(item.id)
        )}">
              Ver
            </button>


            <button
              type="button"
              class="btn combustible-edit"
              data-id="${escaparHTML(
          String(item.id)
        )}">
              Corregir
            </button>


          </div>

        </td>

      `;


        combustibleBody
          .appendChild(row);

      }
    );


    actualizarResumenCombustible();

    aplicarFiltrosCombustible();

  }


  /* =========================================================
     NUEVO
  ========================================================= */

  function nuevoCombustible() {

    if (!combustibleForm) {
      return;
    }


    combustibleForm.reset();


    camposCombustible.id.value =
      '';


    camposCombustible.fecha.value =
      ahoraParaInput();


    camposCombustible.tipo.value =
      'DIÉSEL';


    camposCombustible.total.value =
      '0,00';


    if (combustibleModalTitulo) {

      combustibleModalTitulo.textContent =
        'Registrar abastecimiento';

    }


    if (btnGuardarCombustible) {

      btnGuardarCombustible.textContent =
        'Guardar abastecimiento';

    }


    openModal(
      'combustibleModal'
    );

  }


  /* =========================================================
     EDITAR
  ========================================================= */

  function editarCombustible(id) {

    var item =
      buscarCombustiblePorId(id);


    if (!item) {

      toast(
        'No se encontró el abastecimiento'
      );

      return;

    }


    camposCombustible.id.value =
      String(item.id);


    camposCombustible.vehiculo.value =
      item.vehiculo || '';


    camposCombustible.conductor.value =
      item.conductor || '';


    camposCombustible.unidad.value =
      item.unidad || '';


    camposCombustible.fecha.value =
      item.fecha || '';


    camposCombustible.km.value =
      item.km || '';


    camposCombustible.tipo.value =
      item.tipo || '';


    camposCombustible.estacion.value =
      item.estacion || '';


    camposCombustible.litros.value =
      item.litros || '';


    camposCombustible.precio.value =
      item.precio || '';


    camposCombustible.vale.value =
      item.vale || '';


    camposCombustible.factura.value =
      item.factura || '';


    camposCombustible.observaciones.value =
      item.observaciones || '';


    actualizarTotalCombustible();


    combustibleModalTitulo.textContent =
      'Corregir abastecimiento';


    btnGuardarCombustible.textContent =
      'Guardar corrección';


    openModal(
      'combustibleModal'
    );

  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  function procesarCombustible(event) {

    event.preventDefault();


    var id =
      camposCombustible.id.value;


    var vehiculo =
      camposCombustible
        .vehiculo
        .value;


    var fecha =
      camposCombustible
        .fecha
        .value;


    var km =
      Number(
        camposCombustible
          .km
          .value
      );


    var tipo =
      camposCombustible
        .tipo
        .value;


    var litros =
      Number(
        camposCombustible
          .litros
          .value
      );


    var precio =
      Number(
        camposCombustible
          .precio
          .value || 0
      );


    if (
      !vehiculo ||
      !fecha ||
      !tipo ||
      !Number.isFinite(km) ||
      !Number.isFinite(litros) ||
      litros <= 0
    ) {

      toast(
        'Complete los campos obligatorios del abastecimiento'
      );

      return;

    }


    if (km < 0) {

      toast(
        'El kilometraje no puede ser negativo'
      );

      return;

    }


    if (precio < 0) {

      toast(
        'El precio unitario no puede ser negativo'
      );

      return;

    }


    var total =
      calcularTotalCombustible(
        litros,
        precio
      );


    var datos = {

      id:
        String(
          id ||
          (
            'combustible-' +
            Date.now()
          )
        ),


      vehiculo:
        vehiculo,


      conductor:
        camposCombustible
          .conductor
          .value,


      unidad:
        camposCombustible
          .unidad
          .value,


      fecha:
        fecha,


      km:
        String(km),


      tipo:
        tipo,


      estacion:
        camposCombustible
          .estacion
          .value
          .trim(),


      litros:
        String(litros),


      precio:
        String(precio),


      total:
        String(total),


      vale:
        camposCombustible
          .vale
          .value
          .trim(),


      factura:
        camposCombustible
          .factura
          .value
          .trim(),


      observaciones:
        camposCombustible
          .observaciones
          .value
          .trim()

    };


    if (id) {

      var indice =
        combustibles.findIndex(
          function (item) {

            return (
              String(item.id) ===
              String(id)
            );

          }
        );


      if (indice !== -1) {

        combustibles[indice] =
          datos;

      }


      toast(
        'Abastecimiento corregido correctamente'
      );

    }
    else {

      combustibles.unshift(
        datos
      );


      toast(
        'Abastecimiento registrado correctamente'
      );

    }


    guardarCombustibles();

    renderCombustibles();

    closeAllModals();

  }


  /* =========================================================
     VER
  ========================================================= */

  function verCombustible(id) {

    var item =
      buscarCombustiblePorId(id);


    if (!item) {

      toast(
        'No se encontró el abastecimiento'
      );

      return;

    }


    ponerTextoRecorrido(
      'detalleCombustibleVehiculo',
      item.vehiculo
    );


    ponerTextoRecorrido(
      'detalleCombustibleSubtitulo',

      (
        item.tipo === 'DIÉSEL'
          ? 'Diésel'
          : item.tipo
      ) +

      ' · ' +

      fechaHoraCombustible(
        item.fecha
      )
    );


    ponerTextoRecorrido(
      'detalleCombustibleConductor',
      item.conductor || '—'
    );


    ponerTextoRecorrido(
      'detalleCombustibleUnidad',
      item.unidad || '—'
    );


    ponerTextoRecorrido(
      'detalleCombustibleFecha',

      fechaHoraCombustible(
        item.fecha
      )
    );


    ponerTextoRecorrido(
      'detalleCombustibleKm',

      formatearKm(
        item.km
      ) +
      ' km'
    );


    ponerTextoRecorrido(
      'detalleCombustibleTipo',

      item.tipo === 'DIÉSEL'
        ? 'Diésel'
        : item.tipo
    );


    ponerTextoRecorrido(
      'detalleCombustibleLitros',

      formatoDineroCombustible(
        item.litros
      ) +
      ' L'
    );


    ponerTextoRecorrido(
      'detalleCombustiblePrecio',

      'Bs ' +
      formatoDineroCombustible(
        item.precio
      )
    );


    ponerTextoRecorrido(
      'detalleCombustibleTotal',

      'Bs ' +
      formatoDineroCombustible(
        item.total
      )
    );


    ponerTextoRecorrido(
      'detalleCombustibleEstacion',

      item.estacion ||
      'Sin registrar'
    );


    var documentos = [];


    if (item.vale) {

      documentos.push(
        'Vale: ' +
        item.vale
      );

    }


    if (item.factura) {

      documentos.push(
        'Factura: ' +
        item.factura
      );

    }


    ponerTextoRecorrido(
      'detalleCombustibleDocumento',

      documentos.length
        ? documentos.join(' · ')
        : 'Sin documentación registrada'
    );


    ponerTextoRecorrido(
      'detalleCombustibleObservaciones',

      item.observaciones ||
      'Sin observaciones'
    );


    openModal(
      'combustibleDetalleModal'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function aplicarFiltrosCombustible() {

    if (!combustibleBody) {
      return;
    }


    var texto =
      combustibleSearch

        ? combustibleSearch
          .value
          .trim()
          .toLowerCase()

        : '';


    var tipo =
      combustibleTypeFilter

        ? combustibleTypeFilter.value

        : '';


    var unidad =
      combustibleUnitFilter

        ? combustibleUnitFilter.value

        : '';


    var fecha =
      combustibleDateFilter

        ? combustibleDateFilter.value

        : '';


    combustibleBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =

            !texto ||

            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideTipo =

            !tipo ||

            row.dataset.type ===
            tipo;


          var coincideUnidad =

            !unidad ||

            row.dataset.unit ===
            unidad;


          var coincideFecha =

            !fecha ||

            row.dataset.date ===
            fecha;


          row.style.display =

            (
              coincideTexto &&
              coincideTipo &&
              coincideUnidad &&
              coincideFecha
            )

              ? ''

              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevoCombustible) {

    btnNuevoCombustible
      .addEventListener(
        'click',
        nuevoCombustible
      );

  }


  if (combustibleForm) {

    combustibleForm
      .addEventListener(
        'submit',
        procesarCombustible
      );

  }


  /* CALCULAR TOTAL */

  if (camposCombustible.litros) {

    camposCombustible.litros
      .addEventListener(
        'input',
        actualizarTotalCombustible
      );

  }


  if (camposCombustible.precio) {

    camposCombustible.precio
      .addEventListener(
        'input',
        actualizarTotalCombustible
      );

  }


  /* ACCIONES DE TABLA */

  if (combustibleBody) {

    combustibleBody
      .addEventListener(
        'click',
        function (event) {

          var ver =
            event.target.closest(
              '.combustible-view'
            );


          var editar =
            event.target.closest(
              '.combustible-edit'
            );


          if (ver) {

            verCombustible(
              ver.getAttribute(
                'data-id'
              )
            );

            return;

          }


          if (editar) {

            editarCombustible(
              editar.getAttribute(
                'data-id'
              )
            );

          }

        }
      );

  }


  /* FILTROS */

  if (combustibleSearch) {

    combustibleSearch.addEventListener(
      'input',
      aplicarFiltrosCombustible
    );

  }


  if (combustibleTypeFilter) {

    combustibleTypeFilter.addEventListener(
      'change',
      aplicarFiltrosCombustible
    );

  }


  if (combustibleUnitFilter) {

    combustibleUnitFilter.addEventListener(
      'change',
      aplicarFiltrosCombustible
    );

  }


  if (combustibleDateFilter) {

    combustibleDateFilter.addEventListener(
      'change',
      aplicarFiltrosCombustible
    );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarCombustibles();

  renderCombustibles();

  /* =========================================================
   INCIDENTES
========================================================= */

  var STORAGE_INCIDENTES =
    'siv_incidentes_frontend_v1';


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var incidenteBody =
    document.getElementById(
      'incidenteTableBody'
    );


  var incidenteSearch =
    document.getElementById(
      'incidenteSearch'
    );


  var incidenteTypeFilter =
    document.getElementById(
      'incidenteTypeFilter'
    );


  var incidenteStateFilter =
    document.getElementById(
      'incidenteStateFilter'
    );


  var incidenteDateFilter =
    document.getElementById(
      'incidenteDateFilter'
    );


  var btnNuevoIncidente =
    document.getElementById(
      'btnNuevoIncidente'
    );


  var incidenteForm =
    document.getElementById(
      'incidenteForm'
    );


  var incidenteModalTitulo =
    document.getElementById(
      'incidenteModalTitulo'
    );


  var btnGuardarIncidente =
    document.getElementById(
      'btnGuardarIncidente'
    );


  /* =========================================================
     CAMPOS
  ========================================================= */

  var camposIncidente = {

    id:
      document.getElementById(
        'incidenteId'
      ),

    vehiculo:
      document.getElementById(
        'incidenteVehiculo'
      ),

    conductor:
      document.getElementById(
        'incidenteConductor'
      ),

    unidad:
      document.getElementById(
        'incidenteUnidad'
      ),

    fecha:
      document.getElementById(
        'incidenteFecha'
      ),

    tipo:
      document.getElementById(
        'incidenteTipo'
      ),

    lugar:
      document.getElementById(
        'incidenteLugar'
      ),

    descripcion:
      document.getElementById(
        'incidenteDescripcion'
      ),

    estadoPosterior:
      document.getElementById(
        'incidenteEstadoPosterior'
      ),

    referencia:
      document.getElementById(
        'incidenteReferencia'
      ),

    danos:
      document.getElementById(
        'incidenteDanos'
      ),

    observaciones:
      document.getElementById(
        'incidenteObservaciones'
      )

  };


  var incidentes = [];


  /* =========================================================
     BUSCAR INCIDENTE
  ========================================================= */

  function buscarIncidentePorId(id) {

    return incidentes.find(
      function (item) {

        return (
          String(item.id) ===
          String(id)
        );

      }
    );

  }


  /* =========================================================
     FECHAS
  ========================================================= */

  function fechaIncidente(valor) {

    return String(
      valor || ''
    ).split('T')[0];

  }


  function fechaHoraIncidente(valor) {

    if (!valor) {
      return '—';
    }


    var partes =
      String(valor).split('T');


    if (partes.length !== 2) {
      return valor;
    }


    var fecha =
      partes[0].split('-');


    if (fecha.length !== 3) {
      return valor;
    }


    return (
      fecha[2] +
      '/' +
      fecha[1] +
      '/' +
      fecha[0] +
      ' ' +
      partes[1].slice(0, 5)
    );

  }


  /* =========================================================
     TIPO
  ========================================================= */

  function textoTipoIncidente(tipo) {

    switch (tipo) {

      case 'ACCIDENTE':

        return 'Accidente de tránsito';


      case 'MECANICO':

        return 'Incidente mecánico';


      case 'DANO':

        return 'Daño';


      default:

        return 'Otro';

    }

  }


  /* =========================================================
     ESTADO
  ========================================================= */

  function textoEstadoIncidente(estado) {

    switch (estado) {

      case 'BUENO':

        return 'Bueno';


      case 'REGULAR':

        return 'Regular';


      case 'SEPARADO':

        return 'Separado';


      case 'INOPERABLE':

        return 'Inoperable';


      default:

        return 'Sin registrar';

    }

  }


  function claseEstadoIncidente(estado) {

    if (
      estado === 'SEPARADO' ||
      estado === 'INOPERABLE'
    ) {

      return 'red';

    }


    if (estado === 'REGULAR') {

      return 'orange';

    }


    return 'green';

  }


  /* =========================================================
     TEXTO SEGURO PARA DETALLE
  ========================================================= */

  function ponerTextoIncidente(
    id,
    valor
  ) {

    var elemento =
      document.getElementById(id);


    if (!elemento) {
      return;
    }


    elemento.textContent =
      valor === undefined ||
        valor === null ||
        valor === ''
        ? '—'
        : valor;

  }


  /* =========================================================
     DATOS INICIALES DEL HTML
  ========================================================= */

  function obtenerIncidentesIniciales() {

    if (!incidenteBody) {
      return [];
    }


    return Array
      .from(
        incidenteBody
          .querySelectorAll('tr')
      )
      .map(
        function (row, index) {

          return {

            id:
              String(
                row.dataset.id ||
                (
                  'incidente-' +
                  (index + 1)
                )
              ),


            fecha:
              row.dataset.fecha ||
              '',


            vehiculo:
              row.dataset.vehiculo ||
              '',


            conductor:
              row.dataset.conductor ||
              '',


            unidad:
              row.dataset.unidad ||
              '',


            tipo:
              row.dataset.tipo ||
              'OTRO',


            lugar:
              row.dataset.lugar ||
              '',


            estadoPosterior:
              row.dataset.estado ||
              'BUENO',


            referencia:
              row.dataset.referencia ||
              '',


            descripcion:
              row.dataset.descripcion ||
              '',


            danos:
              row.dataset.danos ||
              '',


            observaciones:
              row.dataset.observaciones ||
              ''

          };

        }
      );

  }


  /* =========================================================
     NORMALIZAR
  ========================================================= */

  function normalizarIncidente(
    item,
    index
  ) {

    return {

      id:
        String(
          item.id ||
          (
            'incidente-' +
            (index + 1)
          )
        ),

      fecha:
        item.fecha || '',

      vehiculo:
        item.vehiculo || '',

      conductor:
        item.conductor || '',

      unidad:
        item.unidad || '',

      tipo:
        item.tipo || 'OTRO',

      lugar:
        item.lugar || '',

      estadoPosterior:
        item.estadoPosterior ||
        'BUENO',

      referencia:
        item.referencia || '',

      descripcion:
        item.descripcion || '',

      danos:
        item.danos || '',

      observaciones:
        item.observaciones || ''

    };

  }


  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  function cargarIncidentes() {

    var datos =
      localStorage.getItem(
        STORAGE_INCIDENTES
      );


    if (datos) {

      try {

        var resultado =
          JSON.parse(datos);


        if (
          Array.isArray(resultado)
        ) {

          incidentes =
            resultado.map(
              normalizarIncidente
            );

          return;

        }

      }
      catch (error) {

        console.error(
          'Error cargando incidentes:',
          error
        );

      }

    }


    incidentes =
      obtenerIncidentesIniciales();


    guardarIncidentes();

  }


  function guardarIncidentes() {

    localStorage.setItem(

      STORAGE_INCIDENTES,

      JSON.stringify(
        incidentes
      )

    );

  }


  /* =========================================================
     INDICADORES
  ========================================================= */

  function actualizarResumenIncidentes() {

    var total =
      incidentes.length;


    var accidentes =
      incidentes.filter(
        function (item) {

          return (
            item.tipo ===
            'ACCIDENTE'
          );

        }
      ).length;


    var separados =
      incidentes.filter(
        function (item) {

          return (
            item.estadoPosterior ===
            'SEPARADO'
          );

        }
      ).length;


    var vehiculos =
      new Set(

        incidentes
          .map(
            function (item) {

              return item.vehiculo;

            }
          )
          .filter(Boolean)

      ).size;


    var totalEl =
      document.getElementById(
        'incidenteMetricTotal'
      );


    var accidentesEl =
      document.getElementById(
        'incidenteMetricAccidentes'
      );


    var separadosEl =
      document.getElementById(
        'incidenteMetricSeparados'
      );


    var vehiculosEl =
      document.getElementById(
        'incidenteMetricVehiculos'
      );


    if (totalEl) {

      totalEl.textContent =
        total;

    }


    if (accidentesEl) {

      accidentesEl.textContent =
        accidentes;

    }


    if (separadosEl) {

      separadosEl.textContent =
        separados;

    }


    if (vehiculosEl) {

      vehiculosEl.textContent =
        vehiculos;

    }

  }


  /* =========================================================
     RENDER TABLA
  ========================================================= */

  function renderIncidentes() {

    if (!incidenteBody) {
      return;
    }


    incidenteBody.innerHTML =
      '';


    incidentes.forEach(
      function (item) {

        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          String(item.id);


        row.dataset.date =
          fechaIncidente(
            item.fecha
          );


        row.dataset.type =
          item.tipo || '';


        row.dataset.state =
          item.estadoPosterior || '';


        row.innerHTML = `

        <td>
          ${escaparHTML(
          fechaHoraIncidente(
            item.fecha
          )
        )}
        </td>


        <td>

          <strong>
            ${escaparHTML(
          item.vehiculo
        )}
          </strong>

        </td>


        <td>
          ${escaparHTML(
          item.conductor ||
          '—'
        )}
        </td>


        <td>
          ${escaparHTML(
          item.unidad ||
          '—'
        )}
        </td>


        <td>
          ${escaparHTML(
          textoTipoIncidente(
            item.tipo
          )
        )}
        </td>


        <td>
          ${escaparHTML(
          item.lugar ||
          '—'
        )}
        </td>


        <td>

          <span
            class="badge ${claseEstadoIncidente(
          item.estadoPosterior
        )}">

            ${escaparHTML(
          textoEstadoIncidente(
            item.estadoPosterior
          )
        )}

          </span>

        </td>


        <td>
          ${escaparHTML(
          item.referencia ||
          '—'
        )}
        </td>


        <td>

          <div class="incidente-actions">

            <button
              type="button"
              class="btn soft incidente-view"
              data-id="${escaparHTML(
          String(item.id)
        )}">
              Ver
            </button>


            <button
              type="button"
              class="btn incidente-edit"
              data-id="${escaparHTML(
          String(item.id)
        )}">
              Corregir
            </button>

          </div>

        </td>

      `;


        incidenteBody
          .appendChild(row);

      }
    );


    actualizarResumenIncidentes();

    aplicarFiltrosIncidentes();

  }


  /* =========================================================
     NUEVO INCIDENTE
  ========================================================= */

  function nuevoIncidente() {

    if (!incidenteForm) {
      return;
    }


    incidenteForm.reset();


    camposIncidente.id.value =
      '';


    camposIncidente.fecha.value =
      ahoraParaInput();


    camposIncidente.estadoPosterior.value =
      'BUENO';


    if (incidenteModalTitulo) {

      incidenteModalTitulo.textContent =
        'Registrar incidente';

    }


    if (btnGuardarIncidente) {

      btnGuardarIncidente.textContent =
        'Guardar incidente';

    }


    openModal(
      'incidenteModal'
    );

  }


  /* =========================================================
     CORREGIR
  ========================================================= */

  function editarIncidente(id) {

    var item =
      buscarIncidentePorId(id);


    if (!item) {

      toast(
        'No se encontró el incidente'
      );

      return;

    }


    camposIncidente.id.value =
      String(item.id);


    camposIncidente.vehiculo.value =
      item.vehiculo || '';


    camposIncidente.conductor.value =
      item.conductor || '';


    camposIncidente.unidad.value =
      item.unidad || '';


    camposIncidente.fecha.value =
      item.fecha || '';


    camposIncidente.tipo.value =
      item.tipo || '';


    camposIncidente.lugar.value =
      item.lugar || '';


    camposIncidente.descripcion.value =
      item.descripcion || '';


    camposIncidente.estadoPosterior.value =
      item.estadoPosterior ||
      'BUENO';


    camposIncidente.referencia.value =
      item.referencia || '';


    camposIncidente.danos.value =
      item.danos || '';


    camposIncidente.observaciones.value =
      item.observaciones || '';


    if (incidenteModalTitulo) {

      incidenteModalTitulo.textContent =
        'Corregir incidente';

    }


    if (btnGuardarIncidente) {

      btnGuardarIncidente.textContent =
        'Guardar corrección';

    }


    openModal(
      'incidenteModal'
    );

  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  function procesarIncidente(event) {

    event.preventDefault();


    var id =
      camposIncidente.id.value;


    var vehiculo =
      camposIncidente
        .vehiculo
        .value;


    var unidad =
      camposIncidente
        .unidad
        .value;


    var fecha =
      camposIncidente
        .fecha
        .value;


    var tipo =
      camposIncidente
        .tipo
        .value;


    var descripcion =
      camposIncidente
        .descripcion
        .value
        .trim();


    var estadoPosterior =
      camposIncidente
        .estadoPosterior
        .value;


    if (
      !vehiculo ||
      !unidad ||
      !fecha ||
      !tipo ||
      !descripcion ||
      !estadoPosterior
    ) {

      toast(
        'Complete los campos obligatorios del incidente'
      );

      return;

    }


    var datos = {

      id:
        String(
          id ||
          (
            'incidente-' +
            Date.now()
          )
        ),


      vehiculo:
        vehiculo,


      conductor:
        camposIncidente
          .conductor
          .value,


      unidad:
        unidad,


      fecha:
        fecha,


      tipo:
        tipo,


      lugar:
        camposIncidente
          .lugar
          .value
          .trim(),


      descripcion:
        descripcion,


      estadoPosterior:
        estadoPosterior,


      referencia:
        camposIncidente
          .referencia
          .value
          .trim(),


      danos:
        camposIncidente
          .danos
          .value
          .trim(),


      observaciones:
        camposIncidente
          .observaciones
          .value
          .trim()

    };


    /* CORREGIR */

    if (id) {

      var indice =
        incidentes.findIndex(
          function (item) {

            return (
              String(item.id) ===
              String(id)
            );

          }
        );


      if (indice === -1) {

        toast(
          'No se encontró el incidente'
        );

        return;

      }


      incidentes[indice] =
        datos;


      toast(
        'Incidente corregido correctamente'
      );

    }

    /* NUEVO */

    else {

      incidentes.unshift(
        datos
      );


      toast(
        'Incidente registrado correctamente'
      );

    }


    guardarIncidentes();

    renderIncidentes();

    closeAllModals();

  }


  /* =========================================================
     VER DETALLE
  ========================================================= */

  function verIncidente(id) {

    var item =
      buscarIncidentePorId(id);


    if (!item) {

      toast(
        'No se encontró el incidente'
      );

      return;

    }


    ponerTextoIncidente(
      'detalleIncidenteVehiculo',

      item.vehiculo
    );


    ponerTextoIncidente(
      'detalleIncidenteSubtitulo',

      textoTipoIncidente(
        item.tipo
      ) +
      ' · ' +
      fechaHoraIncidente(
        item.fecha
      )
    );


    ponerTextoIncidente(
      'detalleIncidenteConductor',

      item.conductor ||
      'Sin registrar'
    );


    ponerTextoIncidente(
      'detalleIncidenteUnidad',

      item.unidad
    );


    ponerTextoIncidente(
      'detalleIncidenteFecha',

      fechaHoraIncidente(
        item.fecha
      )
    );


    ponerTextoIncidente(
      'detalleIncidenteTipo',

      textoTipoIncidente(
        item.tipo
      )
    );


    ponerTextoIncidente(
      'detalleIncidenteLugar',

      item.lugar ||
      'Sin registrar'
    );


    ponerTextoIncidente(
      'detalleIncidenteReferencia',

      item.referencia ||
      'Sin referencia'
    );


    ponerTextoIncidente(
      'detalleIncidenteDescripcion',

      item.descripcion
    );


    ponerTextoIncidente(
      'detalleIncidenteDanos',

      item.danos ||
      'Sin daños registrados.'
    );


    ponerTextoIncidente(
      'detalleIncidenteObservaciones',

      item.observaciones ||
      'Sin observaciones.'
    );


    var estado =
      document.getElementById(
        'detalleIncidenteEstado'
      );


    if (estado) {

      estado.textContent =
        textoEstadoIncidente(
          item.estadoPosterior
        );


      estado.className =
        'badge ' +
        claseEstadoIncidente(
          item.estadoPosterior
        ) +
        ' incidente-detail-status';

    }


    openModal(
      'incidenteDetalleModal'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function aplicarFiltrosIncidentes() {

    if (!incidenteBody) {
      return;
    }


    var texto =
      incidenteSearch

        ? incidenteSearch
          .value
          .trim()
          .toLowerCase()

        : '';


    var tipo =
      incidenteTypeFilter

        ? incidenteTypeFilter.value

        : '';


    var estado =
      incidenteStateFilter

        ? incidenteStateFilter.value

        : '';


    var fecha =
      incidenteDateFilter

        ? incidenteDateFilter.value

        : '';


    incidenteBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =

            !texto ||

            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideTipo =

            !tipo ||

            row.dataset.type ===
            tipo;


          var coincideEstado =

            !estado ||

            row.dataset.state ===
            estado;


          var coincideFecha =

            !fecha ||

            row.dataset.date ===
            fecha;


          row.style.display =

            (
              coincideTexto &&
              coincideTipo &&
              coincideEstado &&
              coincideFecha
            )

              ? ''

              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevoIncidente) {

    btnNuevoIncidente
      .addEventListener(
        'click',
        nuevoIncidente
      );

  }


  if (incidenteForm) {

    incidenteForm
      .addEventListener(
        'submit',
        procesarIncidente
      );

  }


  /* ACCIONES DE TABLA */

  if (incidenteBody) {

    incidenteBody
      .addEventListener(
        'click',
        function (event) {

          var ver =
            event.target.closest(
              '.incidente-view'
            );


          var editar =
            event.target.closest(
              '.incidente-edit'
            );


          if (ver) {

            verIncidente(
              ver.getAttribute(
                'data-id'
              )
            );

            return;

          }


          if (editar) {

            editarIncidente(
              editar.getAttribute(
                'data-id'
              )
            );

          }

        }
      );

  }


  /* FILTROS */

  if (incidenteSearch) {

    incidenteSearch.addEventListener(
      'input',
      aplicarFiltrosIncidentes
    );

  }


  if (incidenteTypeFilter) {

    incidenteTypeFilter.addEventListener(
      'change',
      aplicarFiltrosIncidentes
    );

  }


  if (incidenteStateFilter) {

    incidenteStateFilter.addEventListener(
      'change',
      aplicarFiltrosIncidentes
    );

  }


  if (incidenteDateFilter) {

    incidenteDateFilter.addEventListener(
      'change',
      aplicarFiltrosIncidentes
    );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarIncidentes();

  renderIncidentes();

  /* =========================================================
   MANTENIMIENTOS
========================================================= */

  var STORAGE_MANTENIMIENTOS =
    'siv_mantenimientos_frontend_v1';


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var mantenimientoBody =
    document.getElementById(
      'mantenimientoTableBody'
    );


  var mantenimientoSearch =
    document.getElementById(
      'mantenimientoSearch'
    );


  var mantenimientoTypeFilter =
    document.getElementById(
      'mantenimientoTypeFilter'
    );


  var mantenimientoStateFilter =
    document.getElementById(
      'mantenimientoStateFilter'
    );


  var mantenimientoDateFilter =
    document.getElementById(
      'mantenimientoDateFilter'
    );


  var btnNuevoMantenimiento =
    document.getElementById(
      'btnNuevoMantenimiento'
    );


  var mantenimientoForm =
    document.getElementById(
      'mantenimientoForm'
    );


  var mantenimientoModalTitulo =
    document.getElementById(
      'mantenimientoModalTitulo'
    );


  var btnGuardarMantenimiento =
    document.getElementById(
      'btnGuardarMantenimiento'
    );


  /* =========================================================
     CAMPOS
  ========================================================= */

  var camposMantenimiento = {

    id:
      document.getElementById(
        'mantenimientoId'
      ),

    vehiculo:
      document.getElementById(
        'mantenimientoVehiculo'
      ),

    tipo:
      document.getElementById(
        'mantenimientoTipo'
      ),

    taller:
      document.getElementById(
        'mantenimientoTaller'
      ),

    kmIngreso:
      document.getElementById(
        'mantenimientoKmIngreso'
      ),

    fechaIngreso:
      document.getElementById(
        'mantenimientoFechaIngreso'
      ),

    estado:
      document.getElementById(
        'mantenimientoEstado'
      ),

    diagnostico:
      document.getElementById(
        'mantenimientoDiagnostico'
      ),

    trabajo:
      document.getElementById(
        'mantenimientoTrabajo'
      ),

    fechaSalida:
      document.getElementById(
        'mantenimientoFechaSalida'
      ),

    costo:
      document.getElementById(
        'mantenimientoCosto'
      ),

    proximoKm:
      document.getElementById(
        'mantenimientoProximoKm'
      ),

    proximaFecha:
      document.getElementById(
        'mantenimientoProximaFecha'
      ),

    observaciones:
      document.getElementById(
        'mantenimientoObservaciones'
      )

  };


  var mantenimientos = [];


  /* =========================================================
     BUSCAR
  ========================================================= */

  function buscarMantenimientoPorId(id) {

    return mantenimientos.find(
      function (item) {

        return (
          String(item.id) ===
          String(id)
        );

      }
    );

  }


  /* =========================================================
     FECHAS
  ========================================================= */

  function fechaMantenimiento(valor) {

    return String(
      valor || ''
    ).split('T')[0];

  }


  function fechaHoraMantenimiento(valor) {

    if (!valor) {
      return '—';
    }


    var partes =
      String(valor).split('T');


    if (partes.length !== 2) {
      return valor;
    }


    var fecha =
      partes[0].split('-');


    if (fecha.length !== 3) {
      return valor;
    }


    return (
      fecha[2] +
      '/' +
      fecha[1] +
      '/' +
      fecha[0] +
      ' ' +
      partes[1].slice(0, 5)
    );

  }


  function fechaSimpleMantenimiento(valor) {

    if (!valor) {
      return '—';
    }


    var partes =
      String(valor).split('-');


    if (partes.length !== 3) {
      return valor;
    }


    return (
      partes[2] +
      '/' +
      partes[1] +
      '/' +
      partes[0]
    );

  }


  /* =========================================================
     FECHA ACTUAL PARA INPUT
  ========================================================= */

  function ahoraMantenimientoInput() {

    var ahora =
      new Date();


    var offset =
      ahora.getTimezoneOffset();


    var local =
      new Date(
        ahora.getTime() -
        offset * 60000
      );


    return local
      .toISOString()
      .slice(0, 16);

  }


  /* =========================================================
     TIPO
  ========================================================= */

  function textoTipoMantenimiento(tipo) {

    return tipo === 'CORRECTIVO'
      ? 'Correctivo'
      : 'Preventivo';

  }


  /* =========================================================
     ESTADO
  ========================================================= */

  function textoEstadoMantenimiento(estado) {

    return estado === 'FINALIZADO'
      ? 'Finalizado'
      : 'En proceso';

  }


  function claseEstadoMantenimiento(estado) {

    return estado === 'FINALIZADO'
      ? 'green'
      : 'orange';

  }


  /* =========================================================
     DINERO
  ========================================================= */

  function formatoDineroMantenimiento(valor) {

    var numero =
      Number(valor || 0);


    return numero.toLocaleString(
      'es-BO',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  /* =========================================================
     PRÓXIMO SERVICIO
  ========================================================= */

  function textoProximoMantenimiento(item) {

    var partes = [];


    if (item.proximoKm) {

      partes.push(
        formatearKm(
          item.proximoKm
        ) +
        ' km'
      );

    }


    if (item.proximaFecha) {

      partes.push(
        fechaSimpleMantenimiento(
          item.proximaFecha
        )
      );

    }


    return partes.length
      ? partes.join(' · ')
      : '—';

  }


  /* =========================================================
     DETALLE SEGURO
  ========================================================= */

  function ponerTextoMantenimiento(
    id,
    valor
  ) {

    var elemento =
      document.getElementById(id);


    if (!elemento) {
      return;
    }


    elemento.textContent =
      valor === undefined ||
        valor === null ||
        valor === ''
        ? '—'
        : valor;

  }


  /* =========================================================
     DATOS INICIALES
  ========================================================= */

  function obtenerMantenimientosIniciales() {

    if (!mantenimientoBody) {
      return [];
    }


    return Array
      .from(
        mantenimientoBody
          .querySelectorAll('tr')
      )
      .map(
        function (row, index) {

          return {

            id:
              String(
                row.dataset.id ||
                (
                  'mantenimiento-' +
                  (index + 1)
                )
              ),

            vehiculo:
              row.dataset.vehiculo ||
              '',

            tipo:
              row.dataset.tipo ||
              'PREVENTIVO',

            taller:
              row.dataset.taller ||
              '',

            kmIngreso:
              row.dataset.kmIngreso ||
              '',

            fechaIngreso:
              row.dataset.fechaIngreso ||
              '',

            fechaSalida:
              row.dataset.fechaSalida ||
              '',

            diagnostico:
              row.dataset.diagnostico ||
              '',

            trabajo:
              row.dataset.trabajo ||
              '',

            costo:
              row.dataset.costo ||
              '',

            proximoKm:
              row.dataset.proximoKm ||
              '',

            proximaFecha:
              row.dataset.proximaFecha ||
              '',

            estado:
              row.dataset.estado ||
              'EN_PROCESO',

            observaciones:
              row.dataset.observaciones ||
              ''

          };

        }
      );

  }


  /* =========================================================
     NORMALIZAR
  ========================================================= */

  function normalizarMantenimiento(
    item,
    index
  ) {

    return {

      id:
        String(
          item.id ||
          (
            'mantenimiento-' +
            (index + 1)
          )
        ),

      vehiculo:
        item.vehiculo || '',

      tipo:
        item.tipo || 'PREVENTIVO',

      taller:
        item.taller || '',

      kmIngreso:
        item.kmIngreso !== undefined
          ? String(item.kmIngreso)
          : '',

      fechaIngreso:
        item.fechaIngreso || '',

      fechaSalida:
        item.fechaSalida || '',

      diagnostico:
        item.diagnostico || '',

      trabajo:
        item.trabajo || '',

      costo:
        item.costo !== undefined &&
          item.costo !== null
          ? String(item.costo)
          : '',

      proximoKm:
        item.proximoKm !== undefined &&
          item.proximoKm !== null
          ? String(item.proximoKm)
          : '',

      proximaFecha:
        item.proximaFecha || '',

      estado:
        item.estado === 'FINALIZADO'
          ? 'FINALIZADO'
          : 'EN_PROCESO',

      observaciones:
        item.observaciones || ''

    };

  }


  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  function cargarMantenimientos() {

    var datos =
      localStorage.getItem(
        STORAGE_MANTENIMIENTOS
      );


    if (datos) {

      try {

        var resultado =
          JSON.parse(datos);


        if (
          Array.isArray(resultado)
        ) {

          mantenimientos =
            resultado.map(
              normalizarMantenimiento
            );

          return;

        }

      }
      catch (error) {

        console.error(
          'Error cargando mantenimientos:',
          error
        );

      }

    }


    mantenimientos =
      obtenerMantenimientosIniciales();


    guardarMantenimientos();

  }


  function guardarMantenimientos() {

    localStorage.setItem(

      STORAGE_MANTENIMIENTOS,

      JSON.stringify(
        mantenimientos
      )

    );

  }


  /* =========================================================
     INDICADORES
  ========================================================= */

  function actualizarResumenMantenimientos() {

    var total =
      mantenimientos.length;


    var proceso =
      mantenimientos.filter(
        function (item) {

          return (
            item.estado ===
            'EN_PROCESO'
          );

        }
      ).length;


    var finalizados =
      mantenimientos.filter(
        function (item) {

          return (
            item.estado ===
            'FINALIZADO'
          );

        }
      ).length;


    var costo =
      mantenimientos.reduce(
        function (suma, item) {

          return (
            suma +
            Number(item.costo || 0)
          );

        },
        0
      );


    var totalEl =
      document.getElementById(
        'mantenimientoMetricTotal'
      );


    var procesoEl =
      document.getElementById(
        'mantenimientoMetricProceso'
      );


    var finalizadosEl =
      document.getElementById(
        'mantenimientoMetricFinalizados'
      );


    var costoEl =
      document.getElementById(
        'mantenimientoMetricCosto'
      );


    if (totalEl) {

      totalEl.textContent =
        total;

    }


    if (procesoEl) {

      procesoEl.textContent =
        proceso;

    }


    if (finalizadosEl) {

      finalizadosEl.textContent =
        finalizados;

    }


    if (costoEl) {

      costoEl.textContent =
        'Bs ' +
        formatoDineroMantenimiento(
          costo
        );

    }

  }


  /* =========================================================
     RENDER
  ========================================================= */

  function renderMantenimientos() {

    if (!mantenimientoBody) {
      return;
    }


    mantenimientoBody.innerHTML =
      '';


    mantenimientos.forEach(
      function (item) {

        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          String(item.id);


        row.dataset.date =
          fechaMantenimiento(
            item.fechaIngreso
          );


        row.dataset.type =
          item.tipo;


        row.dataset.state =
          item.estado;


        row.innerHTML = `

        <td>
          ${escaparHTML(
          fechaHoraMantenimiento(
            item.fechaIngreso
          )
        )}
        </td>


        <td>

          <strong>
            ${escaparHTML(
          item.vehiculo
        )}
          </strong>

        </td>


        <td>
          ${escaparHTML(
          textoTipoMantenimiento(
            item.tipo
          )
        )}
        </td>


        <td>
          ${escaparHTML(
          item.taller || '—'
        )}
        </td>


        <td>
          ${escaparHTML(
          formatearKm(
            item.kmIngreso
          )
        )}
        </td>


        <td>
          ${escaparHTML(
          item.trabajo || '—'
        )}
        </td>


        <td>
          ${item.costo
            ? (
              'Bs ' +
              escaparHTML(
                formatoDineroMantenimiento(
                  item.costo
                )
              )
            )
            : '—'
          }
        </td>


        <td>

          <span
            class="badge ${claseEstadoMantenimiento(
            item.estado
          )}">

            ${textoEstadoMantenimiento(
            item.estado
          )}

          </span>

        </td>


        <td>
          ${escaparHTML(
            textoProximoMantenimiento(
              item
            )
          )}
        </td>


        <td>

          <div class="mantenimiento-actions">

            <button
              type="button"
              class="btn soft mantenimiento-view"
              data-id="${escaparHTML(
            String(item.id)
          )}">
              Ver
            </button>


            <button
              type="button"
              class="btn mantenimiento-edit"
              data-id="${escaparHTML(
            String(item.id)
          )}">
              Corregir
            </button>

          </div>

        </td>

      `;


        mantenimientoBody
          .appendChild(row);

      }
    );


    actualizarResumenMantenimientos();

    aplicarFiltrosMantenimientos();

  }


  /* =========================================================
     NUEVO
  ========================================================= */

  function nuevoMantenimiento() {

    if (!mantenimientoForm) {
      return;
    }


    mantenimientoForm.reset();


    camposMantenimiento.id.value =
      '';


    camposMantenimiento.fechaIngreso.value =
      ahoraMantenimientoInput();


    camposMantenimiento.estado.value =
      'EN_PROCESO';


    if (mantenimientoModalTitulo) {

      mantenimientoModalTitulo.textContent =
        'Registrar mantenimiento';

    }


    if (btnGuardarMantenimiento) {

      btnGuardarMantenimiento.textContent =
        'Guardar mantenimiento';

    }


    openModal(
      'mantenimientoModal'
    );

  }


  /* =========================================================
     CORREGIR
  ========================================================= */

  function editarMantenimiento(id) {

    var item =
      buscarMantenimientoPorId(id);


    if (!item) {

      toast(
        'No se encontró el mantenimiento'
      );

      return;

    }


    camposMantenimiento.id.value =
      String(item.id);


    camposMantenimiento.vehiculo.value =
      item.vehiculo || '';


    camposMantenimiento.tipo.value =
      item.tipo || 'PREVENTIVO';


    camposMantenimiento.taller.value =
      item.taller || '';


    camposMantenimiento.kmIngreso.value =
      item.kmIngreso || '';


    camposMantenimiento.fechaIngreso.value =
      item.fechaIngreso || '';


    camposMantenimiento.estado.value =
      item.estado || 'EN_PROCESO';


    camposMantenimiento.diagnostico.value =
      item.diagnostico || '';


    camposMantenimiento.trabajo.value =
      item.trabajo || '';


    camposMantenimiento.fechaSalida.value =
      item.fechaSalida || '';


    camposMantenimiento.costo.value =
      item.costo || '';


    camposMantenimiento.proximoKm.value =
      item.proximoKm || '';


    camposMantenimiento.proximaFecha.value =
      item.proximaFecha || '';


    camposMantenimiento.observaciones.value =
      item.observaciones || '';


    mantenimientoModalTitulo.textContent =
      'Corregir mantenimiento';


    btnGuardarMantenimiento.textContent =
      'Guardar corrección';


    openModal(
      'mantenimientoModal'
    );

  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  function procesarMantenimiento(event) {

    event.preventDefault();


    var id =
      camposMantenimiento.id.value;


    var vehiculo =
      camposMantenimiento
        .vehiculo
        .value;


    var tipo =
      camposMantenimiento
        .tipo
        .value;


    var kmIngreso =
      Number(
        camposMantenimiento
          .kmIngreso
          .value
      );


    var fechaIngreso =
      camposMantenimiento
        .fechaIngreso
        .value;


    var trabajo =
      camposMantenimiento
        .trabajo
        .value
        .trim();


    var estado =
      camposMantenimiento
        .estado
        .value;


    if (
      !vehiculo ||
      !tipo ||
      !fechaIngreso ||
      !trabajo ||
      !Number.isFinite(kmIngreso)
    ) {

      toast(
        'Complete los campos obligatorios del mantenimiento'
      );

      return;

    }


    if (kmIngreso < 0) {

      toast(
        'El kilometraje no puede ser negativo'
      );

      return;

    }


    var fechaSalida =
      camposMantenimiento
        .fechaSalida
        .value;


    if (
      fechaSalida &&
      fechaSalida < fechaIngreso
    ) {

      toast(
        'La fecha de salida no puede ser anterior al ingreso'
      );

      return;

    }


    if (
      estado === 'FINALIZADO' &&
      !fechaSalida
    ) {

      toast(
        'Registre la fecha de salida para finalizar el mantenimiento'
      );

      return;

    }


    var costoTexto =
      camposMantenimiento
        .costo
        .value;


    var costo =
      costoTexto === ''
        ? ''
        : Number(costoTexto);


    if (
      costo !== '' &&
      (
        !Number.isFinite(costo) ||
        costo < 0
      )
    ) {

      toast(
        'El costo no es válido'
      );

      return;

    }


    var datos = {

      id:
        String(
          id ||
          (
            'mantenimiento-' +
            Date.now()
          )
        ),


      vehiculo:
        vehiculo,


      tipo:
        tipo,


      taller:
        camposMantenimiento
          .taller
          .value
          .trim(),


      kmIngreso:
        String(kmIngreso),


      fechaIngreso:
        fechaIngreso,


      estado:
        estado,


      diagnostico:
        camposMantenimiento
          .diagnostico
          .value
          .trim(),


      trabajo:
        trabajo,


      fechaSalida:
        fechaSalida,


      costo:
        costo === ''
          ? ''
          : String(costo),


      proximoKm:
        camposMantenimiento
          .proximoKm
          .value,


      proximaFecha:
        camposMantenimiento
          .proximaFecha
          .value,


      observaciones:
        camposMantenimiento
          .observaciones
          .value
          .trim()

    };


    /* CORREGIR */

    if (id) {

      var indice =
        mantenimientos.findIndex(
          function (item) {

            return (
              String(item.id) ===
              String(id)
            );

          }
        );


      if (indice === -1) {

        toast(
          'No se encontró el mantenimiento'
        );

        return;

      }


      mantenimientos[indice] =
        datos;


      toast(
        'Mantenimiento corregido correctamente'
      );

    }

    /* NUEVO */

    else {

      mantenimientos.unshift(
        datos
      );


      toast(
        'Mantenimiento registrado correctamente'
      );

    }


    guardarMantenimientos();

    renderMantenimientos();

    closeAllModals();

  }


  /* =========================================================
     VER DETALLE
  ========================================================= */

  function verMantenimiento(id) {

    var item =
      buscarMantenimientoPorId(id);


    if (!item) {

      toast(
        'No se encontró el mantenimiento'
      );

      return;

    }


    ponerTextoMantenimiento(
      'detalleMantenimientoVehiculo',
      item.vehiculo
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoSubtitulo',

      textoTipoMantenimiento(
        item.tipo
      ) +
      ' · ' +
      fechaHoraMantenimiento(
        item.fechaIngreso
      )
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoTipo',

      textoTipoMantenimiento(
        item.tipo
      )
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoTaller',

      item.taller ||
      'Sin registrar'
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoIngreso',

      fechaHoraMantenimiento(
        item.fechaIngreso
      )
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoSalida',

      fechaHoraMantenimiento(
        item.fechaSalida
      )
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoKm',

      formatearKm(
        item.kmIngreso
      ) +
      ' km'
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoCosto',

      item.costo
        ? (
          'Bs ' +
          formatoDineroMantenimiento(
            item.costo
          )
        )
        : '—'
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoProximoKm',

      item.proximoKm
        ? (
          formatearKm(
            item.proximoKm
          ) +
          ' km'
        )
        : '—'
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoProximaFecha',

      fechaSimpleMantenimiento(
        item.proximaFecha
      )
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoDiagnostico',

      item.diagnostico ||
      'Sin diagnóstico registrado.'
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoTrabajo',

      item.trabajo ||
      'Sin información.'
    );


    ponerTextoMantenimiento(
      'detalleMantenimientoObservaciones',

      item.observaciones ||
      'Sin observaciones.'
    );


    var estado =
      document.getElementById(
        'detalleMantenimientoEstado'
      );


    if (estado) {

      estado.textContent =
        textoEstadoMantenimiento(
          item.estado
        );


      estado.className =
        'badge ' +
        claseEstadoMantenimiento(
          item.estado
        ) +
        ' mantenimiento-detail-status';

    }


    openModal(
      'mantenimientoDetalleModal'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function aplicarFiltrosMantenimientos() {

    if (!mantenimientoBody) {
      return;
    }


    var texto =
      mantenimientoSearch
        ? mantenimientoSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var tipo =
      mantenimientoTypeFilter
        ? mantenimientoTypeFilter.value
        : '';


    var estado =
      mantenimientoStateFilter
        ? mantenimientoStateFilter.value
        : '';


    var fecha =
      mantenimientoDateFilter
        ? mantenimientoDateFilter.value
        : '';


    mantenimientoBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =

            !texto ||

            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideTipo =

            !tipo ||

            row.dataset.type ===
            tipo;


          var coincideEstado =

            !estado ||

            row.dataset.state ===
            estado;


          var coincideFecha =

            !fecha ||

            row.dataset.date ===
            fecha;


          row.style.display =

            (
              coincideTexto &&
              coincideTipo &&
              coincideEstado &&
              coincideFecha
            )

              ? ''

              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevoMantenimiento) {

    btnNuevoMantenimiento
      .addEventListener(
        'click',
        nuevoMantenimiento
      );

  }


  if (mantenimientoForm) {

    mantenimientoForm
      .addEventListener(
        'submit',
        procesarMantenimiento
      );

  }


  /* ACCIONES TABLA */

  if (mantenimientoBody) {

    mantenimientoBody
      .addEventListener(
        'click',
        function (event) {

          var ver =
            event.target.closest(
              '.mantenimiento-view'
            );


          var editar =
            event.target.closest(
              '.mantenimiento-edit'
            );


          if (ver) {

            verMantenimiento(
              ver.getAttribute(
                'data-id'
              )
            );

            return;

          }


          if (editar) {

            editarMantenimiento(
              editar.getAttribute(
                'data-id'
              )
            );

          }

        }
      );

  }


  /* FILTROS */

  if (mantenimientoSearch) {

    mantenimientoSearch
      .addEventListener(
        'input',
        aplicarFiltrosMantenimientos
      );

  }


  if (mantenimientoTypeFilter) {

    mantenimientoTypeFilter
      .addEventListener(
        'change',
        aplicarFiltrosMantenimientos
      );

  }


  if (mantenimientoStateFilter) {

    mantenimientoStateFilter
      .addEventListener(
        'change',
        aplicarFiltrosMantenimientos
      );

  }


  if (mantenimientoDateFilter) {

    mantenimientoDateFilter
      .addEventListener(
        'change',
        aplicarFiltrosMantenimientos
      );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarMantenimientos();

  renderMantenimientos();

  /* =========================================================
   INVENTARIO
========================================================= */

  var STORAGE_INVENTARIO_ARTICULOS =
    'siv_inventario_articulos_v1';


  var STORAGE_INVENTARIO_MOVIMIENTOS =
    'siv_inventario_movimientos_v1';


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var inventarioBody =
    document.getElementById(
      'inventarioTableBody'
    );


  var inventarioMovementBody =
    document.getElementById(
      'inventarioMovementTableBody'
    );


  var inventarioSearch =
    document.getElementById(
      'inventarioSearch'
    );


  var inventarioCategoryFilter =
    document.getElementById(
      'inventarioCategoryFilter'
    );


  var inventarioStateFilter =
    document.getElementById(
      'inventarioStateFilter'
    );


  var inventarioMovementSearch =
    document.getElementById(
      'inventarioMovementSearch'
    );


  var inventarioMovementTypeFilter =
    document.getElementById(
      'inventarioMovementTypeFilter'
    );


  var btnNuevoArticulo =
    document.getElementById(
      'btnNuevoArticulo'
    );


  var btnNuevoMovimientoInventario =
    document.getElementById(
      'btnNuevoMovimientoInventario'
    );


  var articuloForm =
    document.getElementById(
      'articuloForm'
    );


  var inventarioMovimientoForm =
    document.getElementById(
      'inventarioMovimientoForm'
    );


  var articuloModalTitulo =
    document.getElementById(
      'articuloModalTitulo'
    );


  var btnGuardarArticulo =
    document.getElementById(
      'btnGuardarArticulo'
    );


  /* =========================================================
     CAMPOS ARTÍCULO
  ========================================================= */

  var camposArticulo = {

    id:
      document.getElementById(
        'articuloId'
      ),

    codigo:
      document.getElementById(
        'articuloCodigo'
      ),

    nombre:
      document.getElementById(
        'articuloNombre'
      ),

    categoria:
      document.getElementById(
        'articuloCategoria'
      ),

    unidad:
      document.getElementById(
        'articuloUnidad'
      ),

    stock:
      document.getElementById(
        'articuloStock'
      ),

    minimo:
      document.getElementById(
        'articuloMinimo'
      ),

    observaciones:
      document.getElementById(
        'articuloObservaciones'
      )

  };


  /* =========================================================
     CAMPOS MOVIMIENTO
  ========================================================= */

  var camposMovimientoInventario = {

    tipo:
      document.getElementById(
        'inventarioMovimientoTipo'
      ),

    articulo:
      document.getElementById(
        'inventarioMovimientoArticulo'
      ),

    stock:
      document.getElementById(
        'inventarioMovimientoStock'
      ),

    cantidad:
      document.getElementById(
        'inventarioMovimientoCantidad'
      ),

    fecha:
      document.getElementById(
        'inventarioMovimientoFecha'
      ),

    destino:
      document.getElementById(
        'inventarioMovimientoDestino'
      ),

    unidad:
      document.getElementById(
        'inventarioMovimientoUnidad'
      ),

    vehiculo:
      document.getElementById(
        'inventarioMovimientoVehiculo'
      ),

    motivo:
      document.getElementById(
        'inventarioMovimientoMotivo'
      ),

    documento:
      document.getElementById(
        'inventarioMovimientoDocumento'
      ),

    observaciones:
      document.getElementById(
        'inventarioMovimientoObservaciones'
      )

  };


  var articulosInventario = [];

  var movimientosInventario = [];


  /* =========================================================
     UTILIDADES
  ========================================================= */

  function buscarArticuloInventario(id) {

    return articulosInventario.find(
      function (item) {

        return (
          String(item.id) ===
          String(id)
        );

      }
    );

  }


  function formatoCantidadInventario(valor) {

    var numero =
      Number(valor || 0);


    return numero.toLocaleString(
      'es-BO',
      {
        maximumFractionDigits: 2
      }
    );

  }


  function fechaHoraInventario(valor) {

    if (!valor) {
      return '—';
    }


    var partes =
      String(valor).split('T');


    if (partes.length !== 2) {
      return valor;
    }


    var fecha =
      partes[0].split('-');


    if (fecha.length !== 3) {
      return valor;
    }


    return (
      fecha[2] +
      '/' +
      fecha[1] +
      '/' +
      fecha[0] +
      ' ' +
      partes[1].slice(0, 5)
    );

  }


  function ahoraInventarioInput() {

    var ahora =
      new Date();


    var offset =
      ahora.getTimezoneOffset();


    var local =
      new Date(
        ahora.getTime() -
        offset * 60000
      );


    return local
      .toISOString()
      .slice(0, 16);

  }


  /* =========================================================
     CATEGORÍA
  ========================================================= */

  function textoCategoriaInventario(
    categoria
  ) {

    switch (categoria) {

      case 'LUBRICANTE':
        return 'Lubricante';

      case 'FILTRO':
        return 'Filtro';

      case 'REPUESTO':
        return 'Repuesto';

      case 'FLUIDO':
        return 'Fluido';

      case 'MATERIAL':
        return 'Material';

      default:
        return 'Otro';

    }

  }


  /* =========================================================
     ESTADO DEL STOCK
  ========================================================= */

  function estadoArticuloInventario(item) {

    var stock =
      Number(item.stock || 0);


    var minimo =
      Number(item.minimo || 0);


    if (stock <= 0) {

      return 'AGOTADO';

    }


    if (stock <= minimo) {

      return 'BAJO';

    }


    return 'DISPONIBLE';

  }


  function textoEstadoInventario(estado) {

    if (estado === 'AGOTADO') {

      return 'Agotado';

    }


    if (estado === 'BAJO') {

      return 'Bajo stock';

    }


    return 'Disponible';

  }


  function claseEstadoInventario(estado) {

    if (
      estado === 'AGOTADO' ||
      estado === 'BAJO'
    ) {

      return 'red';

    }


    return 'green';

  }


  /* =========================================================
     DATOS INICIALES
  ========================================================= */

  function obtenerArticulosIniciales() {

    if (!inventarioBody) {
      return [];
    }


    return Array
      .from(
        inventarioBody
          .querySelectorAll('tr')
      )
      .map(
        function (row, index) {

          return {

            id:
              String(
                row.dataset.id ||
                (
                  'articulo-' +
                  (index + 1)
                )
              ),

            codigo:
              row.dataset.codigo ||
              '',

            nombre:
              row.dataset.nombre ||
              '',

            categoria:
              row.dataset.categoria ||
              'OTRO',

            unidad:
              row.dataset.unidad ||
              'Unidad',

            stock:
              row.dataset.stock ||
              '0',

            minimo:
              row.dataset.minimo ||
              '0',

            observaciones:
              row.dataset.observaciones ||
              ''

          };

        }
      );

  }


  /* =========================================================
     MOVIMIENTOS INICIALES
  ========================================================= */

  function obtenerMovimientosInicialesInventario() {

    return [

      {
        id:
          'movimiento-inventario-1',

        tipo:
          'SALIDA',

        articuloId:
          'articulo-1',

        articuloCodigo:
          'LUB-001',

        articuloNombre:
          'Aceite 15W40',

        cantidad:
          '2',

        fecha:
          '2026-09-08T09:15',

        destino:
          'UTOP',

        unidad:
          'UTOP',

        vehiculo:
          '4021-LIG',

        motivo:
          'Cambio de aceite',

        documento:
          'ACTA-0240/2026',

        observaciones:
          ''
      },


      {
        id:
          'movimiento-inventario-2',

        tipo:
          'ENTRADA',

        articuloId:
          'articulo-2',

        articuloCodigo:
          'FIL-004',

        articuloNombre:
          'Filtro de aceite',

        cantidad:
          '8',

        fecha:
          '2026-09-05T11:30',

        destino:
          'Almacén central',

        unidad:
          '',

        vehiculo:
          '',

        motivo:
          '',

        documento:
          'ING-0188/2026',

        observaciones:
          'Ingreso de almacén.'
      },


      {
        id:
          'movimiento-inventario-3',

        tipo:
          'SALIDA',

        articuloId:
          'articulo-3',

        articuloCodigo:
          'REP-019',

        articuloNombre:
          'Pastillas de freno',

        cantidad:
          '1',

        fecha:
          '2026-09-03T15:10',

        destino:
          'Taller Central',

        unidad:
          '',

        vehiculo:
          '5510-XRT',

        motivo:
          'Mantenimiento correctivo',

        documento:
          'SAL-0098/2026',

        observaciones:
          ''
      }

    ];

  }


  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  function cargarInventario() {

    var articulosGuardados =
      localStorage.getItem(
        STORAGE_INVENTARIO_ARTICULOS
      );


    if (articulosGuardados) {

      try {

        var lista =
          JSON.parse(
            articulosGuardados
          );


        if (Array.isArray(lista)) {

          articulosInventario =
            lista;

        }

      }
      catch (error) {

        console.error(
          'Error cargando artículos:',
          error
        );

      }

    }


    if (!articulosInventario.length) {

      articulosInventario =
        obtenerArticulosIniciales();

    }


    var movimientosGuardados =
      localStorage.getItem(
        STORAGE_INVENTARIO_MOVIMIENTOS
      );


    if (movimientosGuardados) {

      try {

        var movimientos =
          JSON.parse(
            movimientosGuardados
          );


        if (Array.isArray(movimientos)) {

          movimientosInventario =
            movimientos;

        }

      }
      catch (error) {

        console.error(
          'Error cargando movimientos:',
          error
        );

      }

    }


    if (!movimientosInventario.length) {

      movimientosInventario =
        obtenerMovimientosInicialesInventario();

    }


    guardarInventario();

  }


  function guardarInventario() {

    localStorage.setItem(

      STORAGE_INVENTARIO_ARTICULOS,

      JSON.stringify(
        articulosInventario
      )

    );


    localStorage.setItem(

      STORAGE_INVENTARIO_MOVIMIENTOS,

      JSON.stringify(
        movimientosInventario
      )

    );

  }


  /* =========================================================
     INDICADORES
  ========================================================= */

  function actualizarResumenInventario() {

    var articulos =
      articulosInventario.length;


    var entradas =
      movimientosInventario.filter(
        function (item) {

          return item.tipo ===
            'ENTRADA';

        }
      ).length;


    var salidas =
      movimientosInventario.filter(
        function (item) {

          return item.tipo ===
            'SALIDA';

        }
      ).length;


    var bajoStock =
      articulosInventario.filter(
        function (item) {

          return (
            estadoArticuloInventario(item) !==
            'DISPONIBLE'
          );

        }
      ).length;


    var articulosEl =
      document.getElementById(
        'inventarioMetricArticulos'
      );


    var entradasEl =
      document.getElementById(
        'inventarioMetricEntradas'
      );


    var salidasEl =
      document.getElementById(
        'inventarioMetricSalidas'
      );


    var bajoEl =
      document.getElementById(
        'inventarioMetricBajoStock'
      );


    if (articulosEl) {

      articulosEl.textContent =
        articulos;

    }


    if (entradasEl) {

      entradasEl.textContent =
        entradas;

    }


    if (salidasEl) {

      salidasEl.textContent =
        salidas;

    }


    if (bajoEl) {

      bajoEl.textContent =
        bajoStock;

    }

  }


  /* =========================================================
     RENDER ARTÍCULOS
  ========================================================= */

  function renderInventario() {

    if (!inventarioBody) {
      return;
    }


    inventarioBody.innerHTML =
      '';


    articulosInventario.forEach(
      function (item) {

        var estado =
          estadoArticuloInventario(
            item
          );


        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          String(item.id);


        row.dataset.category =
          item.categoria;


        row.dataset.state =
          estado;


        row.innerHTML = `

        <td>

          <strong>
            ${escaparHTML(
          item.codigo
        )}
          </strong>

        </td>


        <td>
          ${escaparHTML(
          item.nombre
        )}
        </td>


        <td>
          ${escaparHTML(
          textoCategoriaInventario(
            item.categoria
          )
        )}
        </td>


        <td>
          ${escaparHTML(
          item.unidad
        )}
        </td>


        <td>

          <strong>
            ${escaparHTML(
          formatoCantidadInventario(
            item.stock
          )
        )}
          </strong>

        </td>


        <td>
          ${escaparHTML(
          formatoCantidadInventario(
            item.minimo
          )
        )}
        </td>


        <td>

          <span
            class="badge ${claseEstadoInventario(
          estado
        )}">

            ${textoEstadoInventario(
          estado
        )}

          </span>

        </td>


        <td>

          <div class="inventario-actions">


            <button
              type="button"
              class="btn soft inventario-view"
              data-id="${escaparHTML(
          String(item.id)
        )}">
              Ver
            </button>


            <button
              type="button"
              class="btn inventario-edit"
              data-id="${escaparHTML(
          String(item.id)
        )}">
              Editar
            </button>


            <button
              type="button"
              class="btn inventario-move"
              data-id="${escaparHTML(
          String(item.id)
        )}">
              Movimiento
            </button>


          </div>

        </td>

      `;


        inventarioBody.appendChild(
          row
        );

      }
    );


    actualizarResumenInventario();

    aplicarFiltrosInventario();

    cargarSelectArticulosInventario();

  }


  /* =========================================================
     RENDER MOVIMIENTOS
  ========================================================= */

  function renderMovimientosInventario() {

    if (!inventarioMovementBody) {
      return;
    }


    inventarioMovementBody.innerHTML =
      '';


    movimientosInventario

      .slice()

      .sort(
        function (a, b) {

          return String(b.fecha)
            .localeCompare(
              String(a.fecha)
            );

        }
      )

      .forEach(
        function (item) {

          var row =
            document.createElement(
              'tr'
            );


          row.dataset.type =
            item.tipo;


          row.innerHTML = `

          <td>
            ${escaparHTML(
            fechaHoraInventario(
              item.fecha
            )
          )}
          </td>


          <td>

            <span
              class="badge ${item.tipo === 'ENTRADA'
              ? 'green'
              : 'orange'
            }">

              ${item.tipo === 'ENTRADA'
              ? 'Entrada'
              : 'Salida'
            }

            </span>

          </td>


          <td>

            <strong>
              ${escaparHTML(
              item.articuloCodigo
            )}
            </strong>

            ·

            ${escaparHTML(
              item.articuloNombre
            )}

          </td>


          <td>
            ${escaparHTML(
              formatoCantidadInventario(
                item.cantidad
              )
            )}
          </td>


          <td>
            ${escaparHTML(
              item.destino || '—'
            )}
          </td>


          <td>
            ${escaparHTML(
              item.vehiculo || '—'
            )}
          </td>


          <td>
            ${escaparHTML(
              item.documento || '—'
            )}
          </td>

        `;


          inventarioMovementBody
            .appendChild(row);

        }
      );


    aplicarFiltrosMovimientosInventario();

  }


  /* =========================================================
     SELECT ARTÍCULOS
  ========================================================= */

  function cargarSelectArticulosInventario() {

    var select =
      camposMovimientoInventario
        .articulo;


    if (!select) {
      return;
    }


    var valorActual =
      select.value;


    select.innerHTML =
      '<option value="">Seleccionar artículo</option>';


    articulosInventario.forEach(
      function (item) {

        var option =
          document.createElement(
            'option'
          );


        option.value =
          item.id;


        option.textContent =
          item.codigo +
          ' · ' +
          item.nombre;


        select.appendChild(
          option
        );

      }
    );


    if (
      valorActual &&
      buscarArticuloInventario(
        valorActual
      )
    ) {

      select.value =
        valorActual;

    }

  }


  /* =========================================================
     NUEVO ARTÍCULO
  ========================================================= */

  function nuevoArticuloInventario() {

    if (!articuloForm) {
      return;
    }


    articuloForm.reset();


    camposArticulo.id.value =
      '';


    camposArticulo.stock.value =
      '0';


    camposArticulo.minimo.value =
      '0';


    camposArticulo.stock.readOnly =
      false;


    articuloModalTitulo.textContent =
      'Registrar artículo';


    btnGuardarArticulo.textContent =
      'Guardar artículo';


    openModal(
      'articuloModal'
    );

  }


  /* =========================================================
     EDITAR ARTÍCULO
  ========================================================= */

  function editarArticuloInventario(id) {

    var item =
      buscarArticuloInventario(id);


    if (!item) {

      toast(
        'No se encontró el artículo'
      );

      return;

    }


    camposArticulo.id.value =
      String(item.id);


    camposArticulo.codigo.value =
      item.codigo || '';


    camposArticulo.nombre.value =
      item.nombre || '';


    camposArticulo.categoria.value =
      item.categoria || '';


    camposArticulo.unidad.value =
      item.unidad || '';


    camposArticulo.stock.value =
      item.stock || '0';


    camposArticulo.minimo.value =
      item.minimo || '0';


    camposArticulo.observaciones.value =
      item.observaciones || '';


    /*
     * El stock se modifica mediante
     * movimientos de inventario.
     */

    camposArticulo.stock.readOnly =
      true;


    articuloModalTitulo.textContent =
      'Editar artículo';


    btnGuardarArticulo.textContent =
      'Guardar cambios';


    openModal(
      'articuloModal'
    );

  }


  /* =========================================================
     GUARDAR ARTÍCULO
  ========================================================= */

  function procesarArticuloInventario(
    event
  ) {

    event.preventDefault();


    var id =
      camposArticulo.id.value;


    var codigo =
      camposArticulo
        .codigo
        .value
        .trim()
        .toUpperCase();


    var nombre =
      camposArticulo
        .nombre
        .value
        .trim();


    var categoria =
      camposArticulo
        .categoria
        .value;


    var unidad =
      camposArticulo
        .unidad
        .value
        .trim();


    if (
      !codigo ||
      !nombre ||
      !categoria ||
      !unidad
    ) {

      toast(
        'Complete los campos obligatorios del artículo'
      );

      return;

    }


    var duplicado =
      articulosInventario.some(
        function (item) {

          return (
            item.codigo
              .toUpperCase() ===
            codigo &&

            String(item.id) !==
            String(id)
          );

        }
      );


    if (duplicado) {

      toast(
        'Ya existe un artículo con ese código'
      );

      return;

    }


    var minimo =
      Number(
        camposArticulo
          .minimo
          .value || 0
      );


    if (
      !Number.isFinite(minimo) ||
      minimo < 0
    ) {

      toast(
        'El stock mínimo no es válido'
      );

      return;

    }


    /* EDITAR */

    if (id) {

      var item =
        buscarArticuloInventario(id);


      if (!item) {
        return;
      }


      item.codigo =
        codigo;


      item.nombre =
        nombre;


      item.categoria =
        categoria;


      item.unidad =
        unidad;


      item.minimo =
        String(minimo);


      item.observaciones =
        camposArticulo
          .observaciones
          .value
          .trim();


      /*
       * Actualizar también el nombre
       * guardado en movimientos históricos.
       */

      movimientosInventario.forEach(
        function (movimiento) {

          if (
            String(
              movimiento.articuloId
            ) === String(item.id)
          ) {

            movimiento.articuloCodigo =
              codigo;


            movimiento.articuloNombre =
              nombre;

          }

        }
      );


      toast(
        'Artículo actualizado correctamente'
      );

    }

    /* NUEVO */

    else {

      var stockInicial =
        Number(
          camposArticulo
            .stock
            .value || 0
        );


      if (
        !Number.isFinite(stockInicial) ||
        stockInicial < 0
      ) {

        toast(
          'El stock inicial no es válido'
        );

        return;

      }


      articulosInventario.push({

        id:
          'articulo-' +
          Date.now(),

        codigo:
          codigo,

        nombre:
          nombre,

        categoria:
          categoria,

        unidad:
          unidad,

        stock:
          String(stockInicial),

        minimo:
          String(minimo),

        observaciones:
          camposArticulo
            .observaciones
            .value
            .trim()

      });


      toast(
        'Artículo registrado correctamente'
      );

    }


    guardarInventario();

    renderInventario();

    renderMovimientosInventario();

    closeAllModals();

  }


  /* =========================================================
     MOSTRAR CAMPOS DE SALIDA
  ========================================================= */

  function sincronizarMovimientoInventario() {

    var salida =
      camposMovimientoInventario
        .tipo
        .value ===
      'SALIDA';


    document
      .querySelectorAll(
        '.inventario-salida-field'
      )
      .forEach(
        function (field) {

          field.classList.toggle(
            'show',
            salida
          );

        }
      );

  }


  /* =========================================================
     MOSTRAR STOCK
  ========================================================= */

  function actualizarStockMovimientoInventario() {

    var item =
      buscarArticuloInventario(
        camposMovimientoInventario
          .articulo
          .value
      );


    camposMovimientoInventario
      .stock
      .value =

      item
        ? (
          formatoCantidadInventario(
            item.stock
          ) +
          ' ' +
          item.unidad
        )
        : '';

  }


  /* =========================================================
     ABRIR MOVIMIENTO
  ========================================================= */

  function nuevoMovimientoInventario(
    articuloId
  ) {

    if (!inventarioMovimientoForm) {
      return;
    }


    inventarioMovimientoForm.reset();


    camposMovimientoInventario
      .tipo
      .value =
      'SALIDA';


    camposMovimientoInventario
      .fecha
      .value =
      ahoraInventarioInput();


    cargarSelectArticulosInventario();


    if (articuloId) {

      camposMovimientoInventario
        .articulo
        .value =
        String(articuloId);

    }


    sincronizarMovimientoInventario();

    actualizarStockMovimientoInventario();


    openModal(
      'inventarioModal'
    );

  }


  /* =========================================================
     GUARDAR MOVIMIENTO
  ========================================================= */

  function procesarMovimientoInventario(
    event
  ) {

    event.preventDefault();


    var tipo =
      camposMovimientoInventario
        .tipo
        .value;


    var articuloId =
      camposMovimientoInventario
        .articulo
        .value;


    var item =
      buscarArticuloInventario(
        articuloId
      );


    var cantidad =
      Number(
        camposMovimientoInventario
          .cantidad
          .value
      );


    var fecha =
      camposMovimientoInventario
        .fecha
        .value;


    if (
      !item ||
      !fecha ||
      !Number.isFinite(cantidad) ||
      cantidad <= 0
    ) {

      toast(
        'Complete los campos obligatorios del movimiento'
      );

      return;

    }


    var stockActual =
      Number(item.stock || 0);


    if (
      tipo === 'SALIDA' &&
      cantidad > stockActual
    ) {

      toast(
        'La cantidad de salida supera el stock disponible'
      );

      return;

    }


    if (tipo === 'ENTRADA') {

      item.stock =
        String(
          stockActual +
          cantidad
        );

    }
    else {

      item.stock =
        String(
          stockActual -
          cantidad
        );

    }


    movimientosInventario.unshift({

      id:
        'movimiento-inventario-' +
        Date.now(),

      tipo:
        tipo,

      articuloId:
        String(item.id),

      articuloCodigo:
        item.codigo,

      articuloNombre:
        item.nombre,

      cantidad:
        String(cantidad),

      fecha:
        fecha,

      destino:
        camposMovimientoInventario
          .destino
          .value
          .trim(),

      unidad:
        tipo === 'SALIDA'
          ? camposMovimientoInventario
            .unidad
            .value
          : '',

      vehiculo:
        tipo === 'SALIDA'
          ? camposMovimientoInventario
            .vehiculo
            .value
          : '',

      motivo:
        tipo === 'SALIDA'
          ? camposMovimientoInventario
            .motivo
            .value
            .trim()
          : '',

      documento:
        camposMovimientoInventario
          .documento
          .value
          .trim(),

      observaciones:
        camposMovimientoInventario
          .observaciones
          .value
          .trim()

    });


    guardarInventario();

    renderInventario();

    renderMovimientosInventario();

    closeAllModals();


    toast(
      tipo === 'ENTRADA'
        ? 'Entrada registrada correctamente'
        : 'Salida registrada correctamente'
    );

  }


  /* =========================================================
     VER ARTÍCULO
  ========================================================= */

  function verArticuloInventario(id) {

    var item =
      buscarArticuloInventario(id);


    if (!item) {

      toast(
        'No se encontró el artículo'
      );

      return;

    }


    var estado =
      estadoArticuloInventario(
        item
      );


    document
      .getElementById(
        'detalleInventarioNombre'
      )
      .textContent =
      item.nombre;


    document
      .getElementById(
        'detalleInventarioSubtitulo'
      )
      .textContent =
      item.codigo +
      ' · ' +
      textoCategoriaInventario(
        item.categoria
      );


    document
      .getElementById(
        'detalleInventarioCodigo'
      )
      .textContent =
      item.codigo;


    document
      .getElementById(
        'detalleInventarioCategoria'
      )
      .textContent =
      textoCategoriaInventario(
        item.categoria
      );


    document
      .getElementById(
        'detalleInventarioUnidad'
      )
      .textContent =
      item.unidad;


    document
      .getElementById(
        'detalleInventarioStock'
      )
      .textContent =
      formatoCantidadInventario(
        item.stock
      ) +
      ' ' +
      item.unidad;


    document
      .getElementById(
        'detalleInventarioMinimo'
      )
      .textContent =
      formatoCantidadInventario(
        item.minimo
      ) +
      ' ' +
      item.unidad;


    document
      .getElementById(
        'detalleInventarioObservaciones'
      )
      .textContent =
      item.observaciones ||
      'Sin observaciones.';


    var historial =
      movimientosInventario.filter(
        function (movimiento) {

          return (
            String(
              movimiento.articuloId
            ) ===
            String(item.id)
          );

        }
      );


    document
      .getElementById(
        'detalleInventarioMovimientos'
      )
      .textContent =
      historial.length;


    var estadoEl =
      document.getElementById(
        'detalleInventarioEstado'
      );


    estadoEl.textContent =
      textoEstadoInventario(
        estado
      );


    estadoEl.className =
      'badge ' +
      claseEstadoInventario(
        estado
      ) +
      ' inventario-detail-status';


    var historialBody =
      document.getElementById(
        'detalleInventarioHistorial'
      );


    historialBody.innerHTML =
      '';


    if (!historial.length) {

      historialBody.innerHTML = `

      <tr>

        <td colspan="5">
          Sin movimientos registrados
        </td>

      </tr>

    `;

    }
    else {

      historial
        .slice(0, 10)
        .forEach(
          function (movimiento) {

            var row =
              document.createElement(
                'tr'
              );


            row.innerHTML = `

            <td>
              ${escaparHTML(
              fechaHoraInventario(
                movimiento.fecha
              )
            )}
            </td>


            <td>
              ${movimiento.tipo === 'ENTRADA'
                ? 'Entrada'
                : 'Salida'
              }
            </td>


            <td>
              ${escaparHTML(
                formatoCantidadInventario(
                  movimiento.cantidad
                )
              )}
            </td>


            <td>
              ${escaparHTML(
                movimiento.destino ||
                '—'
              )}
            </td>


            <td>
              ${escaparHTML(
                movimiento.documento ||
                '—'
              )}
            </td>

          `;


            historialBody.appendChild(
              row
            );

          }
        );

    }


    openModal(
      'inventarioDetalleModal'
    );

  }


  /* =========================================================
     FILTROS ARTÍCULOS
  ========================================================= */

  function aplicarFiltrosInventario() {

    if (!inventarioBody) {
      return;
    }


    var texto =
      inventarioSearch
        ? inventarioSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var categoria =
      inventarioCategoryFilter
        ? inventarioCategoryFilter.value
        : '';


    var estado =
      inventarioStateFilter
        ? inventarioStateFilter.value
        : '';


    inventarioBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =

            !texto ||

            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideCategoria =

            !categoria ||

            row.dataset.category ===
            categoria;


          var coincideEstado =

            !estado ||

            row.dataset.state ===
            estado;


          row.style.display =

            (
              coincideTexto &&
              coincideCategoria &&
              coincideEstado
            )

              ? ''

              : 'none';

        }
      );

  }


  /* =========================================================
     FILTROS MOVIMIENTOS
  ========================================================= */

  function aplicarFiltrosMovimientosInventario() {

    if (!inventarioMovementBody) {
      return;
    }


    var texto =
      inventarioMovementSearch
        ? inventarioMovementSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var tipo =
      inventarioMovementTypeFilter
        ? inventarioMovementTypeFilter.value
        : '';


    inventarioMovementBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =

            !texto ||

            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideTipo =

            !tipo ||

            row.dataset.type ===
            tipo;


          row.style.display =

            (
              coincideTexto &&
              coincideTipo
            )

              ? ''

              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevoArticulo) {

    btnNuevoArticulo.addEventListener(
      'click',
      nuevoArticuloInventario
    );

  }


  if (btnNuevoMovimientoInventario) {

    btnNuevoMovimientoInventario
      .addEventListener(
        'click',
        function () {

          nuevoMovimientoInventario('');

        }
      );

  }


  if (articuloForm) {

    articuloForm.addEventListener(
      'submit',
      procesarArticuloInventario
    );

  }


  if (inventarioMovimientoForm) {

    inventarioMovimientoForm
      .addEventListener(
        'submit',
        procesarMovimientoInventario
      );

  }


  if (
    camposMovimientoInventario.tipo
  ) {

    camposMovimientoInventario
      .tipo
      .addEventListener(
        'change',
        sincronizarMovimientoInventario
      );

  }


  if (
    camposMovimientoInventario.articulo
  ) {

    camposMovimientoInventario
      .articulo
      .addEventListener(
        'change',
        actualizarStockMovimientoInventario
      );

  }


  /* ACCIONES TABLA */

  if (inventarioBody) {

    inventarioBody.addEventListener(
      'click',
      function (event) {

        var ver =
          event.target.closest(
            '.inventario-view'
          );


        var editar =
          event.target.closest(
            '.inventario-edit'
          );


        var movimiento =
          event.target.closest(
            '.inventario-move'
          );


        if (ver) {

          verArticuloInventario(
            ver.dataset.id
          );

          return;

        }


        if (editar) {

          editarArticuloInventario(
            editar.dataset.id
          );

          return;

        }


        if (movimiento) {

          nuevoMovimientoInventario(
            movimiento.dataset.id
          );

        }

      }
    );

  }


  /* FILTROS */

  if (inventarioSearch) {

    inventarioSearch.addEventListener(
      'input',
      aplicarFiltrosInventario
    );

  }


  if (inventarioCategoryFilter) {

    inventarioCategoryFilter
      .addEventListener(
        'change',
        aplicarFiltrosInventario
      );

  }


  if (inventarioStateFilter) {

    inventarioStateFilter
      .addEventListener(
        'change',
        aplicarFiltrosInventario
      );

  }


  if (inventarioMovementSearch) {

    inventarioMovementSearch
      .addEventListener(
        'input',
        aplicarFiltrosMovimientosInventario
      );

  }


  if (inventarioMovementTypeFilter) {

    inventarioMovementTypeFilter
      .addEventListener(
        'change',
        aplicarFiltrosMovimientosInventario
      );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarInventario();

  renderInventario();

  renderMovimientosInventario();

  sincronizarMovimientoInventario();

  /* =========================================================
   REPORTES
========================================================= */


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var reporteVehiculoFilter =
    document.getElementById(
      'reporteVehiculoFilter'
    );


  var reporteFechaDesde =
    document.getElementById(
      'reporteFechaDesde'
    );


  var reporteFechaHasta =
    document.getElementById(
      'reporteFechaHasta'
    );


  var btnLimpiarFiltrosReporte =
    document.getElementById(
      'btnLimpiarFiltrosReporte'
    );


  var reporteDetalleTitulo =
    document.getElementById(
      'reporteDetalleTitulo'
    );


  var reporteDetalleSubtitulo =
    document.getElementById(
      'reporteDetalleSubtitulo'
    );


  var reporteDetalleResumen =
    document.getElementById(
      'reporteDetalleResumen'
    );


  var reporteResultadoHead =
    document.getElementById(
      'reporteResultadoHead'
    );


  var reporteResultadoBody =
    document.getElementById(
      'reporteResultadoBody'
    );


  /* =========================================================
     LEER LOCAL STORAGE
  ========================================================= */

  function obtenerDatosReporte(clave) {

    var datos =
      localStorage.getItem(
        clave
      );


    if (!datos) {
      return [];
    }


    try {

      var resultado =
        JSON.parse(datos);


      return Array.isArray(resultado)
        ? resultado
        : [];

    }
    catch (error) {

      console.error(
        'Error leyendo ' +
        clave +
        ':',
        error
      );


      return [];

    }

  }


  /* =========================================================
     FORMATOS
  ========================================================= */

  function numeroReporte(valor) {

    return Number(valor || 0);

  }


  function formatoNumeroReporte(valor) {

    return numeroReporte(valor)
      .toLocaleString(
        'es-BO',
        {
          maximumFractionDigits: 2
        }
      );

  }


  function formatoDineroReporte(valor) {

    return numeroReporte(valor)
      .toLocaleString(
        'es-BO',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );

  }


  function fechaReporte(valor) {

    if (!valor) {
      return '—';
    }


    var fecha =
      String(valor)
        .split('T')[0];


    var partes =
      fecha.split('-');


    if (partes.length !== 3) {
      return valor;
    }


    return (
      partes[2] +
      '/' +
      partes[1] +
      '/' +
      partes[0]
    );

  }


  function fechaHoraReporte(valor) {

    if (!valor) {
      return '—';
    }


    var partes =
      String(valor)
        .split('T');


    if (partes.length === 1) {

      return fechaReporte(
        valor
      );

    }


    return (
      fechaReporte(
        partes[0]
      ) +
      ' ' +
      partes[1]
        .slice(0, 5)
    );

  }


  /* =========================================================
     FILTRO DE FECHA
  ========================================================= */

  function valorFechaReporte(valor) {

    return String(
      valor || ''
    ).split('T')[0];

  }


  function coincideFechaReporte(valor) {

    var fecha =
      valorFechaReporte(
        valor
      );


    if (!fecha) {
      return true;
    }


    var desde =
      reporteFechaDesde
        ? reporteFechaDesde.value
        : '';


    var hasta =
      reporteFechaHasta
        ? reporteFechaHasta.value
        : '';


    if (
      desde &&
      fecha < desde
    ) {

      return false;

    }


    if (
      hasta &&
      fecha > hasta
    ) {

      return false;

    }


    return true;

  }


  /* =========================================================
     FILTRO VEHÍCULO
  ========================================================= */

  function coincideVehiculoReporte(
    valor
  ) {

    var seleccionado =
      reporteVehiculoFilter
        ? reporteVehiculoFilter.value
        : '';


    return (
      !seleccionado ||
      String(valor || '') ===
      seleccionado
    );

  }


  /* =========================================================
     CARGAR VEHÍCULOS AL FILTRO
  ========================================================= */

  function cargarVehiculosReporte() {

    if (!reporteVehiculoFilter) {
      return;
    }


    var actual =
      reporteVehiculoFilter.value;


    var placas =
      new Set();


    obtenerDatosReporte(
      'siv_vehiculos'
    )
      .forEach(
        function (item) {

          if (item.placa) {

            placas.add(
              item.placa
            );

          }

        }
      );


    [
      'siv_recorridos_frontend_v1',
      'siv_combustible_frontend_v1',
      'siv_incidentes_frontend_v1',
      'siv_mantenimientos_frontend_v1'
    ]
      .forEach(
        function (clave) {

          obtenerDatosReporte(
            clave
          )
            .forEach(
              function (item) {

                if (item.vehiculo) {

                  placas.add(
                    item.vehiculo
                  );

                }

              }
            );

        }
      );


    reporteVehiculoFilter.innerHTML =
      '<option value="">Todos los vehículos</option>';


    Array
      .from(placas)
      .sort()
      .forEach(
        function (placa) {

          var opcion =
            document.createElement(
              'option'
            );


          opcion.value =
            placa;


          opcion.textContent =
            placa;


          reporteVehiculoFilter
            .appendChild(
              opcion
            );

        }
      );


    if (
      actual &&
      placas.has(actual)
    ) {

      reporteVehiculoFilter.value =
        actual;

    }

  }


  /* =========================================================
     INDICADORES PRINCIPALES
  ========================================================= */

  function actualizarResumenReportes() {

    var vehiculos =
      obtenerDatosReporte(
        'siv_vehiculos'
      );


    var recorridos =
      obtenerDatosReporte(
        'siv_recorridos_frontend_v1'
      );


    var combustibles =
      obtenerDatosReporte(
        'siv_combustible_frontend_v1'
      );


    var articulos =
      obtenerDatosReporte(
        'siv_inventario_articulos_v1'
      );


    var litros =
      combustibles.reduce(
        function (suma, item) {

          return (
            suma +
            numeroReporte(
              item.litros
            )
          );

        },
        0
      );


    var alertas =
      articulos.filter(
        function (item) {

          return (
            numeroReporte(
              item.stock
            ) <=
            numeroReporte(
              item.minimo
            )
          );

        }
      ).length;


    var vehiculosEl =
      document.getElementById(
        'reporteMetricVehiculos'
      );


    var recorridosEl =
      document.getElementById(
        'reporteMetricRecorridos'
      );


    var litrosEl =
      document.getElementById(
        'reporteMetricLitros'
      );


    var alertasEl =
      document.getElementById(
        'reporteMetricAlertas'
      );


    if (vehiculosEl) {

      vehiculosEl.textContent =
        vehiculos.length;

    }


    if (recorridosEl) {

      recorridosEl.textContent =
        recorridos.length;

    }


    if (litrosEl) {

      litrosEl.textContent =
        formatoNumeroReporte(
          litros
        );

    }


    if (alertasEl) {

      alertasEl.textContent =
        alertas;

    }

  }


  /* =========================================================
     RESUMEN DEL MODAL
  ========================================================= */

  function renderResumenReporte(items) {

    if (!reporteDetalleResumen) {
      return;
    }


    reporteDetalleResumen.innerHTML =
      '';


    items.forEach(
      function (item) {

        var box =
          document.createElement(
            'div'
          );


        box.className =
          'reporte-summary-item';


        box.innerHTML = `

        <span>
          ${escaparHTML(
          item.label
        )}
        </span>

        <strong>
          ${escaparHTML(
          String(item.valor)
        )}
        </strong>

      `;


        reporteDetalleResumen
          .appendChild(box);

      }
    );

  }


  /* =========================================================
     RENDER TABLA GENERICA
  ========================================================= */

  function mostrarReporte(config) {
    reporteDetalleTitulo.textContent =
      config.titulo;


    reporteDetalleSubtitulo.textContent =
      config.subtitulo || '';


    renderResumenReporte(
      config.resumen || []
    );


    reporteResultadoHead.innerHTML =
      '';


    reporteResultadoBody.innerHTML =
      '';


    var trHead =
      document.createElement(
        'tr'
      );


    config.columnas.forEach(
      function (columna) {

        var th =
          document.createElement(
            'th'
          );


        th.textContent =
          columna;


        trHead.appendChild(
          th
        );

      }
    );


    reporteResultadoHead
      .appendChild(
        trHead
      );


    if (!config.filas.length) {

      reporteResultadoBody.innerHTML = `

      <tr>

        <td
          class="reporte-empty"
          colspan="${config.columnas.length}">

          No existen registros para los filtros seleccionados.

        </td>

      </tr>

    `;

    }
    else {

      config.filas.forEach(
        function (fila) {

          var tr =
            document.createElement(
              'tr'
            );


          fila.forEach(
            function (valor) {

              var td =
                document.createElement(
                  'td'
                );


              td.textContent =
                valor === undefined ||
                  valor === null ||
                  valor === ''
                  ? '—'
                  : valor;


              tr.appendChild(
                td
              );

            }
          );


          reporteResultadoBody
            .appendChild(
              tr
            );

        }
      );

    }


    openModal(
      'reporteDetalleModal'
    );

  }


  /* =========================================================
     VEHÍCULOS
  ========================================================= */

  function reporteVehiculos() {

    var datos =
      obtenerDatosReporte(
        'siv_vehiculos'
      )
        .filter(
          function (item) {

            return coincideVehiculoReporte(
              item.placa
            );

          }
        );


    var unidades =
      new Set(
        datos
          .map(
            function (item) {

              return item.unidad;

            }
          )
          .filter(Boolean)
      ).size;


    mostrarReporte({

      titulo:
        'Vehículos por unidad',

      subtitulo:
        'Estado actual del parque automotor.',

      resumen: [

        {
          label:
            'Vehículos',

          valor:
            datos.length
        },

        {
          label:
            'Unidades',

          valor:
            unidades
        },

        {
          label:
            'Buenos',

          valor:
            datos.filter(
              function (item) {

                return item.estado ===
                  'Bueno';

              }
            ).length
        },

        {
          label:
            'Inoperables',

          valor:
            datos.filter(
              function (item) {

                return item.estado ===
                  'Inoperable';

              }
            ).length
        }

      ],

      columnas: [
        'Placa',
        'Marca',
        'Modelo',
        'Unidad',
        'Estado',
        'Kilometraje'
      ],

      filas:
        datos.map(
          function (item) {

            return [

              item.placa,

              item.marca,

              item.modelo,

              item.unidad ||
              'Sin asignar',

              item.estado,

              formatoNumeroReporte(
                item.km
              ) +
              ' km'

            ];

          }
        )

    });

  }


  /* =========================================================
     ASIGNACIONES
  ========================================================= */

  function reporteAsignaciones() {

    var datos =
      obtenerDatosReporte(
        'siv_asignaciones'
      )
        .filter(
          function (item) {

            return (
              coincideVehiculoReporte(
                item.vehiculoPlaca
              ) &&

              coincideFechaReporte(
                item.fechaInicio
              )
            );

          }
        );


    mostrarReporte({

      titulo:
        'Historial de asignaciones',

      subtitulo:
        'Asignaciones institucionales registradas.',

      resumen: [

        {
          label:
            'Registros',

          valor:
            datos.length
        },

        {
          label:
            'Actuales',

          valor:
            datos.filter(
              function (item) {

                return !item.fechaFin;

              }
            ).length
        },

        {
          label:
            'Históricas',

          valor:
            datos.filter(
              function (item) {

                return !!item.fechaFin;

              }
            ).length
        },

        {
          label:
            'Vehículos',

          valor:
            new Set(
              datos.map(
                function (item) {

                  return item.vehiculoPlaca;

                }
              )
            ).size
        }

      ],

      columnas: [
        'Vehículo',
        'Unidad',
        'Inicio',
        'Fin',
        'Motivo',
        'Documento',
        'Estado'
      ],

      filas:
        datos.map(
          function (item) {

            return [

              item.vehiculoPlaca,

              item.unidad,

              fechaReporte(
                item.fechaInicio
              ),

              fechaReporte(
                item.fechaFin
              ),

              item.motivo ||
              '—',

              item.documento ||
              '—',

              item.fechaFin
                ? 'Histórica'
                : 'Actual'

            ];

          }
        )

    });

  }


  /* =========================================================
     RECORRIDOS
  ========================================================= */

  function reporteRecorridos() {

    var datos =
      obtenerDatosReporte(
        'siv_recorridos_frontend_v1'
      )
        .filter(
          function (item) {

            return (
              coincideVehiculoReporte(
                item.vehiculo
              ) &&

              coincideFechaReporte(
                item.salida
              )
            );

          }
        );


    var km =
      datos.reduce(
        function (suma, item) {

          var inicio =
            numeroReporte(
              item.kmInicio
            );


          var fin =
            numeroReporte(
              item.kmFin
            );


          return (
            suma +
            (
              fin >= inicio &&
                item.kmFin !== ''
                ? fin - inicio
                : 0
            )
          );

        },
        0
      );


    mostrarReporte({

      titulo:
        'Historial de recorridos',

      subtitulo:
        'Salidas, retornos y kilometraje.',

      resumen: [

        {
          label:
            'Recorridos',

          valor:
            datos.length
        },

        {
          label:
            'Abiertos',

          valor:
            datos.filter(
              function (item) {

                return item.estado ===
                  'ABIERTO';

              }
            ).length
        },

        {
          label:
            'Cerrados',

          valor:
            datos.filter(
              function (item) {

                return item.estado ===
                  'CERRADO';

              }
            ).length
        },

        {
          label:
            'Kilómetros',

          valor:
            formatoNumeroReporte(
              km
            )
        }

      ],

      columnas: [
        'Salida',
        'Llegada',
        'Vehículo',
        'Conductor',
        'Unidad',
        'Destino',
        'KM inicial',
        'KM final',
        'Estado'
      ],

      filas:
        datos.map(
          function (item) {

            return [

              fechaHoraReporte(
                item.salida
              ),

              fechaHoraReporte(
                item.llegada
              ),

              item.vehiculo,

              item.conductor,

              item.unidad,

              item.destino,

              formatoNumeroReporte(
                item.kmInicio
              ),

              item.kmFin
                ? formatoNumeroReporte(
                  item.kmFin
                )
                : '—',

              item.estado ===
                'CERRADO'
                ? 'Cerrado'
                : 'Abierto'

            ];

          }
        )

    });

  }


  /* =========================================================
     COMBUSTIBLE
  ========================================================= */

  function reporteCombustible() {

    var datos =
      obtenerDatosReporte(
        'siv_combustible_frontend_v1'
      )
        .filter(
          function (item) {

            return (
              coincideVehiculoReporte(
                item.vehiculo
              ) &&

              coincideFechaReporte(
                item.fecha
              )
            );

          }
        );


    var litros =
      datos.reduce(
        function (suma, item) {

          return (
            suma +
            numeroReporte(
              item.litros
            )
          );

        },
        0
      );


    var importe =
      datos.reduce(
        function (suma, item) {

          return (
            suma +
            numeroReporte(
              item.total
            )
          );

        },
        0
      );


    mostrarReporte({

      titulo:
        'Consumo de combustible',

      subtitulo:
        'Abastecimientos registrados.',

      resumen: [

        {
          label:
            'Abastecimientos',

          valor:
            datos.length
        },

        {
          label:
            'Litros',

          valor:
            formatoNumeroReporte(
              litros
            )
        },

        {
          label:
            'Importe',

          valor:
            'Bs ' +
            formatoDineroReporte(
              importe
            )
        },

        {
          label:
            'Vehículos',

          valor:
            new Set(
              datos.map(
                function (item) {

                  return item.vehiculo;

                }
              )
            ).size
        }

      ],

      columnas: [
        'Fecha',
        'Vehículo',
        'Conductor',
        'Unidad',
        'KM',
        'Tipo',
        'Litros',
        'Estación',
        'Vale',
        'Importe'
      ],

      filas:
        datos.map(
          function (item) {

            return [

              fechaHoraReporte(
                item.fecha
              ),

              item.vehiculo,

              item.conductor ||
              '—',

              item.unidad ||
              '—',

              formatoNumeroReporte(
                item.km
              ),

              item.tipo,

              formatoNumeroReporte(
                item.litros
              ) +
              ' L',

              item.estacion ||
              '—',

              item.vale ||
              '—',

              'Bs ' +
              formatoDineroReporte(
                item.total
              )

            ];

          }
        )

    });

  }


  /* =========================================================
     MANTENIMIENTOS
  ========================================================= */

  function reporteMantenimientos() {

    var datos =
      obtenerDatosReporte(
        'siv_mantenimientos_frontend_v1'
      )
        .filter(
          function (item) {

            return (
              coincideVehiculoReporte(
                item.vehiculo
              ) &&

              coincideFechaReporte(
                item.fechaIngreso
              )
            );

          }
        );


    var costo =
      datos.reduce(
        function (suma, item) {

          return (
            suma +
            numeroReporte(
              item.costo
            )
          );

        },
        0
      );


    mostrarReporte({

      titulo:
        'Mantenimientos',

      subtitulo:
        'Historial preventivo y correctivo.',

      resumen: [

        {
          label:
            'Registros',

          valor:
            datos.length
        },

        {
          label:
            'En proceso',

          valor:
            datos.filter(
              function (item) {

                return item.estado ===
                  'EN_PROCESO';

              }
            ).length
        },

        {
          label:
            'Finalizados',

          valor:
            datos.filter(
              function (item) {

                return item.estado ===
                  'FINALIZADO';

              }
            ).length
        },

        {
          label:
            'Costo',

          valor:
            'Bs ' +
            formatoDineroReporte(
              costo
            )
        }

      ],

      columnas: [
        'Ingreso',
        'Salida',
        'Vehículo',
        'Tipo',
        'Taller',
        'KM',
        'Trabajo',
        'Costo',
        'Estado'
      ],

      filas:
        datos.map(
          function (item) {

            return [

              fechaHoraReporte(
                item.fechaIngreso
              ),

              fechaHoraReporte(
                item.fechaSalida
              ),

              item.vehiculo,

              item.tipo ===
                'CORRECTIVO'
                ? 'Correctivo'
                : 'Preventivo',

              item.taller ||
              '—',

              formatoNumeroReporte(
                item.kmIngreso
              ),

              item.trabajo,

              item.costo
                ? (
                  'Bs ' +
                  formatoDineroReporte(
                    item.costo
                  )
                )
                : '—',

              item.estado ===
                'FINALIZADO'
                ? 'Finalizado'
                : 'En proceso'

            ];

          }
        )

    });

  }


  /* =========================================================
     INVENTARIO
  ========================================================= */

  function reporteInventario() {

    var datos =
      obtenerDatosReporte(
        'siv_inventario_articulos_v1'
      );


    var bajo =
      datos.filter(
        function (item) {

          return (
            numeroReporte(
              item.stock
            ) <=
            numeroReporte(
              item.minimo
            )
          );

        }
      ).length;


    mostrarReporte({

      titulo:
        'Kardex / inventario',

      subtitulo:
        'Existencias actuales en almacén.',

      resumen: [

        {
          label:
            'Artículos',

          valor:
            datos.length
        },

        {
          label:
            'Disponibles',

          valor:
            datos.length -
            bajo
        },

        {
          label:
            'Bajo mínimo',

          valor:
            bajo
        },

        {
          label:
            'Agotados',

          valor:
            datos.filter(
              function (item) {

                return (
                  numeroReporte(
                    item.stock
                  ) <= 0
                );

              }
            ).length
        }

      ],

      columnas: [
        'Código',
        'Artículo',
        'Categoría',
        'Unidad',
        'Stock',
        'Mínimo',
        'Estado'
      ],

      filas:
        datos.map(
          function (item) {

            var stock =
              numeroReporte(
                item.stock
              );


            var minimo =
              numeroReporte(
                item.minimo
              );


            var estado =
              stock <= 0
                ? 'Agotado'
                : (
                  stock <= minimo
                    ? 'Bajo stock'
                    : 'Disponible'
                );


            return [

              item.codigo,

              item.nombre,

              item.categoria,

              item.unidad,

              formatoNumeroReporte(
                item.stock
              ),

              formatoNumeroReporte(
                item.minimo
              ),

              estado

            ];

          }
        )

    });

  }


  /* =========================================================
     MOVIMIENTOS INVENTARIO
  ========================================================= */

  function reporteMovimientosInventario() {

    var datos =
      obtenerDatosReporte(
        'siv_inventario_movimientos_v1'
      )
        .filter(
          function (item) {

            return coincideFechaReporte(
              item.fecha
            );

          }
        );


    mostrarReporte({

      titulo:
        'Movimientos de almacén',

      subtitulo:
        'Entradas y salidas registradas.',

      resumen: [

        {
          label:
            'Movimientos',

          valor:
            datos.length
        },

        {
          label:
            'Entradas',

          valor:
            datos.filter(
              function (item) {

                return item.tipo ===
                  'ENTRADA';

              }
            ).length
        },

        {
          label:
            'Salidas',

          valor:
            datos.filter(
              function (item) {

                return item.tipo ===
                  'SALIDA';

              }
            ).length
        },

        {
          label:
            'Artículos',

          valor:
            new Set(
              datos.map(
                function (item) {

                  return item.articuloId;

                }
              )
            ).size
        }

      ],

      columnas: [
        'Fecha',
        'Tipo',
        'Artículo',
        'Cantidad',
        'Destino / origen',
        'Vehículo',
        'Documento'
      ],

      filas:
        datos.map(
          function (item) {

            return [

              fechaHoraReporte(
                item.fecha
              ),

              item.tipo ===
                'ENTRADA'
                ? 'Entrada'
                : 'Salida',

              item.articuloCodigo +
              ' · ' +
              item.articuloNombre,

              formatoNumeroReporte(
                item.cantidad
              ),

              item.destino ||
              '—',

              item.vehiculo ||
              '—',

              item.documento ||
              '—'

            ];

          }
        )

    });

  }


  /* =========================================================
     INCIDENTES
  ========================================================= */

  function reporteIncidentes() {

    var datos =
      obtenerDatosReporte(
        'siv_incidentes_frontend_v1'
      )
        .filter(
          function (item) {

            return (
              coincideVehiculoReporte(
                item.vehiculo
              ) &&

              coincideFechaReporte(
                item.fecha
              )
            );

          }
        );


    mostrarReporte({

      titulo:
        'Incidentes vehiculares',

      subtitulo:
        'Hechos registrados sobre vehículos institucionales.',

      resumen: [

        {
          label:
            'Incidentes',

          valor:
            datos.length
        },

        {
          label:
            'Accidentes',

          valor:
            datos.filter(
              function (item) {

                return item.tipo ===
                  'ACCIDENTE';

              }
            ).length
        },

        {
          label:
            'Separados',

          valor:
            datos.filter(
              function (item) {

                return item.estadoPosterior ===
                  'SEPARADO';

              }
            ).length
        },

        {
          label:
            'Vehículos',

          valor:
            new Set(
              datos.map(
                function (item) {

                  return item.vehiculo;

                }
              )
            ).size
        }

      ],

      columnas: [
        'Fecha',
        'Vehículo',
        'Conductor',
        'Unidad',
        'Tipo',
        'Lugar',
        'Estado',
        'Referencia'
      ],

      filas:
        datos.map(
          function (item) {

            return [

              fechaHoraReporte(
                item.fecha
              ),

              item.vehiculo,

              item.conductor ||
              '—',

              item.unidad,

              item.tipo,

              item.lugar ||
              '—',

              item.estadoPosterior,

              item.referencia ||
              '—'

            ];

          }
        )

    });

  }


  /* =========================================================
     CONDUCTORES
  ========================================================= */

  function reporteConductores() {

    var datos =
      obtenerDatosReporte(
        'siv_conductores'
      );


    mostrarReporte({

      titulo:
        'Conductores',

      subtitulo:
        'Padrón actual de conductores registrados.',

      resumen: [

        {
          label:
            'Conductores',

          valor:
            datos.length
        },

        {
          label:
            'Activos',

          valor:
            datos.filter(
              function (item) {

                return item.estado ===
                  'ACTIVO';

              }
            ).length
        },

        {
          label:
            'Inactivos',

          valor:
            datos.filter(
              function (item) {

                return item.estado ===
                  'INACTIVO';

              }
            ).length
        },

        {
          label:
            'Con vehículo',

          valor:
            datos.filter(
              function (item) {

                return (
                  item.vehiculosAsociados &&
                  item.vehiculosAsociados.length
                );

              }
            ).length
        }

      ],

      columnas: [
        'CI',
        'Nombre',
        'Grado',
        'Licencia',
        'Categoría',
        'Unidad',
        'Vehículos',
        'Estado'
      ],

      filas:
        datos.map(
          function (item) {

            return [

              item.ci,

              (
                (
                  item.nombres || ''
                ) +
                ' ' +
                (
                  item.apellidos || ''
                )
              ).trim(),

              item.grado ||
              '—',

              item.licencia ||
              '—',

              item.categoria ||
              '—',

              item.unidad ||
              '—',

              (
                item.vehiculosAsociados ||
                []
              ).join(', ') ||
              '—',

              item.estado ===
                'ACTIVO'
                ? 'Activo'
                : 'Inactivo'

            ];

          }
        )

    });

  }


  /* =========================================================
     HISTORIAL INTEGRAL
  ========================================================= */

  function reporteHistorialVehiculo() {

    var placa =
      reporteVehiculoFilter
        ? reporteVehiculoFilter.value
        : '';


    if (!placa) {

      toast(
        'Seleccione un vehículo para generar el historial integral'
      );

      return;

    }


    var filas = [];


    obtenerDatosReporte(
      'siv_asignaciones'
    )
      .filter(
        function (item) {

          return (
            item.vehiculoPlaca ===
            placa
          );

        }
      )
      .forEach(
        function (item) {

          filas.push([

            fechaReporte(
              item.fechaInicio
            ),

            'Asignación',

            item.unidad,

            item.motivo ||
            'Asignación de unidad'

          ]);

        }
      );


    obtenerDatosReporte(
      'siv_recorridos_frontend_v1'
    )
      .filter(
        function (item) {

          return (
            item.vehiculo ===
            placa &&
            coincideFechaReporte(
              item.salida
            )
          );

        }
      )
      .forEach(
        function (item) {

          filas.push([

            fechaHoraReporte(
              item.salida
            ),

            'Recorrido',

            item.unidad,

            (
              item.destino ||
              'Sin destino'
            ) +
            ' · ' +
            (
              item.conductor ||
              'Sin conductor'
            )

          ]);

        }
      );


    obtenerDatosReporte(
      'siv_combustible_frontend_v1'
    )
      .filter(
        function (item) {

          return (
            item.vehiculo ===
            placa &&
            coincideFechaReporte(
              item.fecha
            )
          );

        }
      )
      .forEach(
        function (item) {

          filas.push([

            fechaHoraReporte(
              item.fecha
            ),

            'Combustible',

            item.unidad ||
            '—',

            formatoNumeroReporte(
              item.litros
            ) +
            ' L · Bs ' +
            formatoDineroReporte(
              item.total
            )

          ]);

        }
      );


    obtenerDatosReporte(
      'siv_mantenimientos_frontend_v1'
    )
      .filter(
        function (item) {

          return (
            item.vehiculo ===
            placa &&
            coincideFechaReporte(
              item.fechaIngreso
            )
          );

        }
      )
      .forEach(
        function (item) {

          filas.push([

            fechaHoraReporte(
              item.fechaIngreso
            ),

            'Mantenimiento',

            item.taller ||
            '—',

            item.trabajo ||
            'Mantenimiento'

          ]);

        }
      );


    obtenerDatosReporte(
      'siv_incidentes_frontend_v1'
    )
      .filter(
        function (item) {

          return (
            item.vehiculo ===
            placa &&
            coincideFechaReporte(
              item.fecha
            )
          );

        }
      )
      .forEach(
        function (item) {

          filas.push([

            fechaHoraReporte(
              item.fecha
            ),

            'Incidente',

            item.unidad,

            item.descripcion ||
            item.tipo

          ]);

        }
      );


    filas.sort(
      function (a, b) {

        return String(b[0])
          .localeCompare(
            String(a[0])
          );

      }
    );


    mostrarReporte({

      titulo:
        'Historial integral · ' +
        placa,

      subtitulo:
        'Eventos registrados para el vehículo seleccionado.',

      resumen: [

        {
          label:
            'Vehículo',

          valor:
            placa
        },

        {
          label:
            'Eventos',

          valor:
            filas.length
        },

        {
          label:
            'Desde',

          valor:
            reporteFechaDesde &&
              reporteFechaDesde.value
              ? fechaReporte(
                reporteFechaDesde.value
              )
              : 'Todo'
        },

        {
          label:
            'Hasta',

          valor:
            reporteFechaHasta &&
              reporteFechaHasta.value
              ? fechaReporte(
                reporteFechaHasta.value
              )
              : 'Todo'
        }

      ],

      columnas: [
        'Fecha',
        'Evento',
        'Unidad / origen',
        'Detalle'
      ],

      filas:
        filas

    });

  }


  /* =========================================================
     GENERAR
  ========================================================= */

  function generarReporte(tipo) {

    switch (tipo) {

      case 'vehiculos':

        reporteVehiculos();

        break;


      case 'asignaciones':

        reporteAsignaciones();

        break;


      case 'recorridos':

        reporteRecorridos();

        break;


      case 'combustible':

        reporteCombustible();

        break;


      case 'mantenimientos':

        reporteMantenimientos();

        break;


      case 'inventario':

        reporteInventario();

        break;


      case 'movimientos':

        reporteMovimientosInventario();

        break;


      case 'incidentes':

        reporteIncidentes();

        break;


      case 'conductores':

        reporteConductores();

        break;


      case 'historial':

        reporteHistorialVehiculo();

        break;

    }

  }


  /* =========================================================
     LIMPIAR FILTROS
  ========================================================= */

  function limpiarFiltrosReporte() {

    if (reporteVehiculoFilter) {

      reporteVehiculoFilter.value =
        '';

    }


    if (reporteFechaDesde) {

      reporteFechaDesde.value =
        '';

    }


    if (reporteFechaHasta) {

      reporteFechaHasta.value =
        '';

    }


    toast(
      'Filtros de reportes limpiados'
    );

  }


  /* =========================================================
     VALIDAR FECHAS
  ========================================================= */

  function validarFechasReporte() {

    if (
      reporteFechaDesde &&
      reporteFechaHasta &&
      reporteFechaDesde.value &&
      reporteFechaHasta.value &&
      reporteFechaHasta.value <
      reporteFechaDesde.value
    ) {

      toast(
        'La fecha final no puede ser anterior a la fecha inicial'
      );


      reporteFechaHasta.value =
        '';

    }

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  document
    .querySelectorAll(
      '.report-generate'
    )
    .forEach(
      function (boton) {

        boton.addEventListener(
          'click',
          function () {

            validarFechasReporte();


            generarReporte(
              boton.dataset.reportType
            );

          }
        );

      }
    );


  if (btnLimpiarFiltrosReporte) {

    btnLimpiarFiltrosReporte
      .addEventListener(
        'click',
        limpiarFiltrosReporte
      );

  }


  if (reporteFechaDesde) {

    reporteFechaDesde
      .addEventListener(
        'change',
        validarFechasReporte
      );

  }


  if (reporteFechaHasta) {

    reporteFechaHasta
      .addEventListener(
        'change',
        validarFechasReporte
      );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarVehiculosReporte();

  actualizarResumenReportes();

  /* =========================================================
   USUARIOS
========================================================= */

  var STORAGE_USUARIOS =
    'siv_usuarios_frontend_v1';


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var usuarioBody =
    document.getElementById(
      'usuarioTableBody'
    );


  var usuarioSearch =
    document.getElementById(
      'usuarioSearch'
    );


  var usuarioRoleFilter =
    document.getElementById(
      'usuarioRoleFilter'
    );


  var usuarioStateFilter =
    document.getElementById(
      'usuarioStateFilter'
    );


  var btnNuevoUsuario =
    document.getElementById(
      'btnNuevoUsuario'
    );


  var usuarioForm =
    document.getElementById(
      'usuarioForm'
    );


  var usuarioModalTitulo =
    document.getElementById(
      'usuarioModalTitulo'
    );


  var btnGuardarUsuario =
    document.getElementById(
      'btnGuardarUsuario'
    );


  /* =========================================================
     CAMPOS
  ========================================================= */

  var camposUsuario = {

    id:
      document.getElementById(
        'usuarioId'
      ),

    usuario:
      document.getElementById(
        'usuarioNombre'
      ),

    personal:
      document.getElementById(
        'usuarioPersonal'
      ),

    rol:
      document.getElementById(
        'usuarioRol'
      ),

    estado:
      document.getElementById(
        'usuarioEstado'
      ),

    password:
      document.getElementById(
        'usuarioPassword'
      ),

    cambioPassword:
      document.getElementById(
        'usuarioCambioPassword'
      ),

    observaciones:
      document.getElementById(
        'usuarioObservaciones'
      )

  };


  var usuariosSistema = [];


  /* =========================================================
     BUSCAR
  ========================================================= */

  function buscarUsuarioPorId(id) {

    return usuariosSistema.find(
      function (item) {

        return (
          String(item.id) ===
          String(id)
        );

      }
    );

  }


  /* =========================================================
     ROL
  ========================================================= */

  function textoRolUsuario(rol) {

    switch (rol) {

      case 'ADMINISTRADOR':
        return 'Administrador';

      case 'TRANSPORTES':
        return 'Transportes';

      case 'COMBUSTIBLE':
        return 'Combustible';

      case 'MANTENIMIENTO':
        return 'Mantenimiento';

      case 'ALMACEN':
        return 'Almacén';

      case 'CONSULTA':
        return 'Consulta';

      default:
        return 'Sin rol';

    }

  }


  /* =========================================================
     FECHA
  ========================================================= */

  function fechaHoraUsuario(valor) {

    if (!valor) {
      return '—';
    }


    var partes =
      String(valor).split('T');


    if (!partes[0]) {
      return '—';
    }


    var fecha =
      partes[0].split('-');


    if (fecha.length !== 3) {
      return valor;
    }


    var resultado =
      fecha[2] +
      '/' +
      fecha[1] +
      '/' +
      fecha[0];


    if (partes[1]) {

      resultado +=
        ' ' +
        partes[1].slice(0, 5);

    }


    return resultado;

  }


  /* =========================================================
     FECHA ACTUAL
  ========================================================= */

  function ahoraUsuarioIso() {

    var ahora =
      new Date();


    var offset =
      ahora.getTimezoneOffset();


    var local =
      new Date(
        ahora.getTime() -
        offset * 60000
      );


    return local
      .toISOString()
      .slice(0, 16);

  }


  /* =========================================================
     DETALLE SEGURO
  ========================================================= */

  function ponerTextoUsuario(
    id,
    valor
  ) {

    var elemento =
      document.getElementById(id);


    if (!elemento) {
      return;
    }


    elemento.textContent =
      valor === undefined ||
        valor === null ||
        valor === ''
        ? '—'
        : valor;

  }


  /* =========================================================
     DATOS INICIALES DEL HTML
  ========================================================= */

  function obtenerUsuariosIniciales() {

    if (!usuarioBody) {
      return [];
    }


    return Array
      .from(
        usuarioBody
          .querySelectorAll('tr')
      )
      .map(
        function (row, index) {

          return {

            id:
              String(
                row.dataset.id ||
                (
                  'usuario-' +
                  (index + 1)
                )
              ),


            usuario:
              row.dataset.usuario ||
              '',


            personal:
              row.dataset.personal ||
              '',


            rol:
              row.dataset.rol ||
              'CONSULTA',


            estado:
              row.dataset.estado ||
              'ACTIVO',


            ultimoAcceso:
              row.dataset.ultimoAcceso ||
              '',


            creado:
              row.dataset.creado ||
              '',


            cambioPassword:
              row.dataset.cambioPassword ||
              'SI',


            observaciones:
              row.dataset.observaciones ||
              ''

          };

        }
      );

  }


  /* =========================================================
     NORMALIZAR
  ========================================================= */

  function normalizarUsuario(
    item,
    index
  ) {

    return {

      id:
        String(
          item.id ||
          (
            'usuario-' +
            (index + 1)
          )
        ),

      usuario:
        item.usuario || '',

      personal:
        item.personal || '',

      rol:
        item.rol || 'CONSULTA',

      estado:
        item.estado === 'INACTIVO'
          ? 'INACTIVO'
          : 'ACTIVO',

      ultimoAcceso:
        item.ultimoAcceso || '',

      creado:
        item.creado || '',

      cambioPassword:
        item.cambioPassword === 'NO'
          ? 'NO'
          : 'SI',

      observaciones:
        item.observaciones || ''

    };

  }


  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  function cargarUsuarios() {

    var datos =
      localStorage.getItem(
        STORAGE_USUARIOS
      );


    if (datos) {

      try {

        var resultado =
          JSON.parse(datos);


        if (
          Array.isArray(resultado)
        ) {

          usuariosSistema =
            resultado.map(
              normalizarUsuario
            );

          return;

        }

      }
      catch (error) {

        console.error(
          'Error cargando usuarios:',
          error
        );

      }

    }


    usuariosSistema =
      obtenerUsuariosIniciales();


    guardarUsuarios();

  }


  function guardarUsuarios() {

    localStorage.setItem(

      STORAGE_USUARIOS,

      JSON.stringify(
        usuariosSistema
      )

    );

  }


  /* =========================================================
     INDICADORES
  ========================================================= */

  function actualizarResumenUsuarios() {

    var total =
      usuariosSistema.length;


    var activos =
      usuariosSistema.filter(
        function (item) {

          return (
            item.estado ===
            'ACTIVO'
          );

        }
      ).length;


    var administradores =
      usuariosSistema.filter(
        function (item) {

          return (
            item.rol ===
            'ADMINISTRADOR'
          );

        }
      ).length;


    var inactivos =
      usuariosSistema.filter(
        function (item) {

          return (
            item.estado ===
            'INACTIVO'
          );

        }
      ).length;


    var totalEl =
      document.getElementById(
        'usuarioMetricTotal'
      );


    var activosEl =
      document.getElementById(
        'usuarioMetricActivos'
      );


    var adminEl =
      document.getElementById(
        'usuarioMetricAdministradores'
      );


    var inactivosEl =
      document.getElementById(
        'usuarioMetricInactivos'
      );


    if (totalEl) {

      totalEl.textContent =
        total;

    }


    if (activosEl) {

      activosEl.textContent =
        activos;

    }


    if (adminEl) {

      adminEl.textContent =
        administradores;

    }


    if (inactivosEl) {

      inactivosEl.textContent =
        inactivos;

    }

  }


  /* =========================================================
     RENDER
  ========================================================= */

  function renderUsuarios() {

    if (!usuarioBody) {
      return;
    }


    usuarioBody.innerHTML =
      '';


    usuariosSistema.forEach(
      function (item) {

        var row =
          document.createElement(
            'tr'
          );


        row.dataset.id =
          String(item.id);


        row.dataset.role =
          item.rol;


        row.dataset.state =
          item.estado;


        row.innerHTML = `

        <td>

          <strong>
            ${escaparHTML(
          item.usuario
        )}
          </strong>

        </td>


        <td>
          ${escaparHTML(
          item.personal ||
          '—'
        )}
        </td>


        <td>
          ${escaparHTML(
          textoRolUsuario(
            item.rol
          )
        )}
        </td>


        <td>

          <span
            class="badge ${item.estado ===
            'ACTIVO'
            ? 'green'
            : 'red'
          }">

            ${item.estado ===
            'ACTIVO'
            ? 'Activo'
            : 'Inactivo'
          }

          </span>

        </td>


        <td>
          ${escaparHTML(
            fechaHoraUsuario(
              item.ultimoAcceso
            )
          )}
        </td>


        <td>

          <div class="usuario-actions">


            <button
              type="button"
              class="btn soft usuario-view"
              data-id="${escaparHTML(
            String(item.id)
          )}">
              Ver
            </button>


            <button
              type="button"
              class="btn usuario-edit"
              data-id="${escaparHTML(
            String(item.id)
          )}">
              Editar
            </button>


            <button
              type="button"
              class="btn usuario-toggle"
              data-id="${escaparHTML(
            String(item.id)
          )}">

              ${item.estado ===
            'ACTIVO'
            ? 'Desactivar'
            : 'Activar'
          }

            </button>


          </div>

        </td>

      `;


        usuarioBody.appendChild(
          row
        );

      }
    );


    actualizarResumenUsuarios();

    aplicarFiltrosUsuarios();

  }


  /* =========================================================
     NUEVO USUARIO
  ========================================================= */

  function nuevoUsuario() {

    if (!usuarioForm) {
      return;
    }


    usuarioForm.reset();


    camposUsuario.id.value =
      '';


    camposUsuario.estado.value =
      'ACTIVO';


    camposUsuario.cambioPassword.value =
      'SI';


    camposUsuario.password.value =
      '';


    camposUsuario.password.required =
      true;


    if (usuarioModalTitulo) {

      usuarioModalTitulo.textContent =
        'Registrar usuario';

    }


    if (btnGuardarUsuario) {

      btnGuardarUsuario.textContent =
        'Guardar usuario';

    }


    openModal(
      'usuarioModal'
    );

  }


  /* =========================================================
     EDITAR
  ========================================================= */

  function editarUsuario(id) {

    var item =
      buscarUsuarioPorId(id);


    if (!item) {

      toast(
        'No se encontró el usuario'
      );

      return;

    }


    camposUsuario.id.value =
      String(item.id);


    camposUsuario.usuario.value =
      item.usuario || '';


    camposUsuario.personal.value =
      item.personal || '';


    camposUsuario.rol.value =
      item.rol || 'CONSULTA';


    camposUsuario.estado.value =
      item.estado || 'ACTIVO';


    camposUsuario.password.value =
      '';


    camposUsuario.password.required =
      false;


    camposUsuario.password.placeholder =
      'Dejar vacío para mantenerla';


    camposUsuario.cambioPassword.value =
      item.cambioPassword || 'NO';


    camposUsuario.observaciones.value =
      item.observaciones || '';


    if (usuarioModalTitulo) {

      usuarioModalTitulo.textContent =
        'Editar usuario';

    }


    if (btnGuardarUsuario) {

      btnGuardarUsuario.textContent =
        'Guardar cambios';

    }


    openModal(
      'usuarioModal'
    );

  }


  /* =========================================================
     GUARDAR
  ========================================================= */

  function procesarUsuario(event) {

    event.preventDefault();


    var id =
      camposUsuario.id.value;


    var nombreUsuario =
      camposUsuario
        .usuario
        .value
        .trim()
        .toLowerCase();


    var personal =
      camposUsuario
        .personal
        .value
        .trim();


    var rol =
      camposUsuario
        .rol
        .value;


    var estado =
      camposUsuario
        .estado
        .value;


    var password =
      camposUsuario
        .password
        .value;


    if (
      !nombreUsuario ||
      !personal ||
      !rol ||
      !estado
    ) {

      toast(
        'Complete los campos obligatorios del usuario'
      );

      return;

    }


    /*
     * Permitimos letras, números,
     * punto, guion y guion bajo.
     */

    if (
      !/^[a-z0-9._-]+$/
        .test(nombreUsuario)
    ) {

      toast(
        'El nombre de usuario contiene caracteres no permitidos'
      );

      return;

    }


    var duplicado =
      usuariosSistema.some(
        function (item) {

          return (
            item.usuario
              .toLowerCase() ===
            nombreUsuario &&

            String(item.id) !==
            String(id)
          );

        }
      );


    if (duplicado) {

      toast(
        'Ya existe un usuario con ese nombre'
      );

      return;

    }


    /*
     * En el prototipo no almacenamos
     * la contraseña en localStorage.
     */

    if (
      !id &&
      !password
    ) {

      toast(
        'Ingrese una contraseña temporal'
      );

      return;

    }


    if (
      password &&
      password.length < 6
    ) {

      toast(
        'La contraseña temporal debe tener al menos 6 caracteres'
      );

      return;

    }


    /* EDITAR */

    if (id) {

      var indice =
        usuariosSistema.findIndex(
          function (item) {

            return (
              String(item.id) ===
              String(id)
            );

          }
        );


      if (indice === -1) {

        toast(
          'No se encontró el usuario'
        );

        return;

      }


      var anterior =
        usuariosSistema[indice];


      usuariosSistema[indice] = {

        id:
          String(anterior.id),

        usuario:
          nombreUsuario,

        personal:
          personal,

        rol:
          rol,

        estado:
          estado,

        ultimoAcceso:
          anterior.ultimoAcceso || '',

        creado:
          anterior.creado || '',

        cambioPassword:
          camposUsuario
            .cambioPassword
            .value,

        observaciones:
          camposUsuario
            .observaciones
            .value
            .trim()

      };


      toast(
        'Usuario actualizado correctamente'
      );

    }

    /* NUEVO */

    else {

      usuariosSistema.unshift({

        id:
          'usuario-' +
          Date.now(),

        usuario:
          nombreUsuario,

        personal:
          personal,

        rol:
          rol,

        estado:
          estado,

        ultimoAcceso:
          '',

        creado:
          ahoraUsuarioIso(),

        cambioPassword:
          camposUsuario
            .cambioPassword
            .value,

        observaciones:
          camposUsuario
            .observaciones
            .value
            .trim()

      });


      toast(
        'Usuario registrado correctamente'
      );

    }


    guardarUsuarios();

    renderUsuarios();

    closeAllModals();

  }


  /* =========================================================
     ACTIVAR / DESACTIVAR
  ========================================================= */

  function cambiarEstadoUsuario(id) {

    var item =
      buscarUsuarioPorId(id);


    if (!item) {

      toast(
        'No se encontró el usuario'
      );

      return;

    }


    if (
      item.estado ===
      'ACTIVO'
    ) {

      item.estado =
        'INACTIVO';


      toast(
        'Usuario desactivado correctamente'
      );

    }
    else {

      item.estado =
        'ACTIVO';


      toast(
        'Usuario activado correctamente'
      );

    }


    guardarUsuarios();

    renderUsuarios();

  }


  /* =========================================================
     VER
  ========================================================= */

  function verUsuario(id) {

    var item =
      buscarUsuarioPorId(id);


    if (!item) {

      toast(
        'No se encontró el usuario'
      );

      return;

    }


    ponerTextoUsuario(
      'detalleUsuarioNombre',
      item.usuario
    );


    ponerTextoUsuario(
      'detalleUsuarioPersonal',
      item.personal
    );


    ponerTextoUsuario(
      'detalleUsuarioRol',

      textoRolUsuario(
        item.rol
      )
    );


    ponerTextoUsuario(
      'detalleUsuarioEstadoTexto',

      item.estado === 'ACTIVO'
        ? 'Activo'
        : 'Inactivo'
    );


    ponerTextoUsuario(
      'detalleUsuarioUltimoAcceso',

      item.ultimoAcceso
        ? fechaHoraUsuario(
          item.ultimoAcceso
        )
        : 'Sin accesos registrados'
    );


    ponerTextoUsuario(
      'detalleUsuarioCreado',

      fechaHoraUsuario(
        item.creado
      )
    );


    ponerTextoUsuario(
      'detalleUsuarioCambioPassword',

      item.cambioPassword === 'SI'
        ? 'Pendiente'
        : 'No requerido'
    );


    ponerTextoUsuario(
      'detalleUsuarioObservaciones',

      item.observaciones ||
      'Sin observaciones.'
    );


    var estado =
      document.getElementById(
        'detalleUsuarioEstado'
      );


    if (estado) {

      estado.textContent =
        item.estado === 'ACTIVO'
          ? 'Activo'
          : 'Inactivo';


      estado.className =
        'badge ' +
        (
          item.estado === 'ACTIVO'
            ? 'green'
            : 'red'
        ) +
        ' usuario-detail-status';

    }


    openModal(
      'usuarioDetalleModal'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function aplicarFiltrosUsuarios() {

    if (!usuarioBody) {
      return;
    }


    var texto =
      usuarioSearch
        ? usuarioSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var rol =
      usuarioRoleFilter
        ? usuarioRoleFilter.value
        : '';


    var estado =
      usuarioStateFilter
        ? usuarioStateFilter.value
        : '';


    usuarioBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =

            !texto ||

            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideRol =

            !rol ||

            row.dataset.role ===
            rol;


          var coincideEstado =

            !estado ||

            row.dataset.state ===
            estado;


          row.style.display =

            (
              coincideTexto &&
              coincideRol &&
              coincideEstado
            )

              ? ''

              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (btnNuevoUsuario) {

    btnNuevoUsuario.addEventListener(
      'click',
      nuevoUsuario
    );

  }


  if (usuarioForm) {

    usuarioForm.addEventListener(
      'submit',
      procesarUsuario
    );

  }


  /* ACCIONES TABLA */

  if (usuarioBody) {

    usuarioBody.addEventListener(
      'click',
      function (event) {

        var boton =
          event.target.closest(
            'button'
          );


        if (!boton) {
          return;
        }


        var fila =
          boton.closest('tr');


        var id =
          boton.dataset.id ||
          (
            fila
              ? fila.dataset.id
              : ''
          );


        if (!id) {
          return;
        }


        if (
          boton.classList.contains(
            'usuario-view'
          )
        ) {

          verUsuario(id);

          return;

        }


        if (
          boton.classList.contains(
            'usuario-edit'
          )
        ) {

          editarUsuario(id);

          return;

        }


        if (
          boton.classList.contains(
            'usuario-toggle'
          )
        ) {

          cambiarEstadoUsuario(id);

        }

      }
    );

  }


  /* FILTROS */

  if (usuarioSearch) {

    usuarioSearch.addEventListener(
      'input',
      aplicarFiltrosUsuarios
    );

  }


  if (usuarioRoleFilter) {

    usuarioRoleFilter.addEventListener(
      'change',
      aplicarFiltrosUsuarios
    );

  }


  if (usuarioStateFilter) {

    usuarioStateFilter.addEventListener(
      'change',
      aplicarFiltrosUsuarios
    );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarUsuarios();

  renderUsuarios();

  /* =========================================================
   AUDITORÍA
========================================================= */

  var STORAGE_AUDITORIA =
    'siv_auditoria_frontend_v1';


  /* =========================================================
     ELEMENTOS
  ========================================================= */

  var auditoriaBody =
    document.getElementById(
      'auditoriaTableBody'
    );


  var auditoriaSearch =
    document.getElementById(
      'auditoriaSearch'
    );


  var auditoriaModuleFilter =
    document.getElementById(
      'auditoriaModuleFilter'
    );


  var auditoriaActionFilter =
    document.getElementById(
      'auditoriaActionFilter'
    );


  var auditoriaDateFilter =
    document.getElementById(
      'auditoriaDateFilter'
    );


  var auditoriaRegistros = [];


  /* =========================================================
     BUSCAR
  ========================================================= */

  function buscarAuditoriaPorId(id) {

    return auditoriaRegistros.find(
      function (item) {

        return (
          String(item.id) ===
          String(id)
        );

      }
    );

  }


  /* =========================================================
     FECHA
  ========================================================= */

  function fechaAuditoria(valor) {

    return String(
      valor || ''
    ).split('T')[0];

  }


  function fechaHoraAuditoria(valor) {

    if (!valor) {
      return '—';
    }


    var partes =
      String(valor).split('T');


    if (!partes[0]) {
      return '—';
    }


    var fecha =
      partes[0].split('-');


    if (fecha.length !== 3) {
      return valor;
    }


    var resultado =
      fecha[2] +
      '/' +
      fecha[1] +
      '/' +
      fecha[0];


    if (partes[1]) {

      resultado +=
        ' ' +
        partes[1].slice(0, 5);

    }


    return resultado;

  }


  /* =========================================================
     AHORA
  ========================================================= */

  function ahoraAuditoriaIso() {

    var ahora =
      new Date();


    var offset =
      ahora.getTimezoneOffset();


    var local =
      new Date(
        ahora.getTime() -
        offset * 60000
      );


    return local
      .toISOString()
      .slice(0, 16);

  }


  /* =========================================================
     ACCIONES
  ========================================================= */

  function textoAccionAuditoria(
    accion
  ) {

    switch (accion) {

      case 'INSERT':

        return 'Creación';


      case 'UPDATE':

        return 'Modificación';


      case 'STATUS':

        return 'Cambio de estado';


      case 'LOGIN':

        return 'Acceso';


      default:

        return accion || 'Evento';

    }

  }


  function claseAccionAuditoria(
    accion
  ) {

    switch (accion) {

      case 'INSERT':

        return 'green';


      case 'UPDATE':

        return 'blue';


      case 'STATUS':

        return 'orange';


      case 'LOGIN':

        return 'blue';


      default:

        return 'gray';

    }

  }


  /* =========================================================
     MÓDULOS
  ========================================================= */

  function textoModuloAuditoria(
    modulo
  ) {

    switch (modulo) {

      case 'VEHICULOS':
        return 'Vehículos';

      case 'ASIGNACIONES':
        return 'Asignaciones';

      case 'CONDUCTORES':
        return 'Conductores';

      case 'UNIDADES':
        return 'Unidades';

      case 'RECORRIDOS':
        return 'Recorridos';

      case 'COMBUSTIBLE':
        return 'Combustible';

      case 'MANTENIMIENTO':
        return 'Mantenimiento';

      case 'INVENTARIO':
        return 'Inventario';

      case 'INCIDENTES':
        return 'Incidentes';

      case 'DOCUMENTACION':
        return 'Documentación';

      case 'USUARIOS':
        return 'Usuarios';

      default:
        return modulo || 'Sistema';

    }

  }


  /* =========================================================
     DATOS INICIALES
  ========================================================= */

  function obtenerAuditoriaInicial() {

    if (!auditoriaBody) {
      return [];
    }


    return Array
      .from(
        auditoriaBody
          .querySelectorAll('tr')
      )
      .map(
        function (row, index) {

          return {

            id:
              String(
                row.dataset.id ||
                (
                  'auditoria-' +
                  (index + 1)
                )
              ),


            fecha:
              row.dataset.fecha ||
              '',


            usuario:
              row.dataset.usuario ||
              '',


            accion:
              row.dataset.accion ||
              'INSERT',


            modulo:
              row.dataset.modulo ||
              '',


            entidad:
              row.dataset.entidad ||
              '',


            descripcion:
              row.dataset.descripcion ||
              '',


            detalle:
              row.dataset.detalle ||
              ''

          };

        }
      );

  }


  /* =========================================================
     NORMALIZAR
  ========================================================= */

  function normalizarAuditoria(
    item,
    index
  ) {

    return {

      id:
        String(
          item.id ||
          (
            'auditoria-' +
            (index + 1)
          )
        ),

      fecha:
        item.fecha || '',

      usuario:
        item.usuario || 'sistema',

      accion:
        item.accion || 'INSERT',

      modulo:
        item.modulo || 'SISTEMA',

      entidad:
        item.entidad || '',

      descripcion:
        item.descripcion || '',

      detalle:
        item.detalle || ''

    };

  }


  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  function cargarAuditoria() {

    var datos =
      localStorage.getItem(
        STORAGE_AUDITORIA
      );


    if (datos) {

      try {

        var resultado =
          JSON.parse(datos);


        if (
          Array.isArray(resultado)
        ) {

          auditoriaRegistros =
            resultado.map(
              normalizarAuditoria
            );

          return;

        }

      }
      catch (error) {

        console.error(
          'Error cargando auditoría:',
          error
        );

      }

    }


    auditoriaRegistros =
      obtenerAuditoriaInicial();


    guardarAuditoria();

  }


  function guardarAuditoria() {

    localStorage.setItem(

      STORAGE_AUDITORIA,

      JSON.stringify(
        auditoriaRegistros
      )

    );

  }


  /* =========================================================
     REGISTRAR EVENTO
  ========================================================= */

  function registrarAuditoria(
    accion,
    modulo,
    descripcion,
    entidad,
    detalle,
    usuario
  ) {

    auditoriaRegistros.unshift({

      id:
        'auditoria-' +
        Date.now(),

      fecha:
        ahoraAuditoriaIso(),

      usuario:
        usuario ||
        'transportes.admin',

      accion:
        accion ||
        'INSERT',

      modulo:
        modulo ||
        'SISTEMA',

      entidad:
        entidad ||
        '',

      descripcion:
        descripcion ||
        '',

      detalle:
        detalle ||
        ''

    });


    /*
     * Evita que localStorage crezca
     * indefinidamente en el prototipo.
     */

    if (
      auditoriaRegistros.length >
      500
    ) {

      auditoriaRegistros =
        auditoriaRegistros.slice(
          0,
          500
        );

    }


    guardarAuditoria();

    renderAuditoria();

  }


  /* =========================================================
     INDICADORES
  ========================================================= */

  function actualizarResumenAuditoria() {

    var hoy =
      ahoraAuditoriaIso()
        .split('T')[0];


    var total =
      auditoriaRegistros.length;


    var eventosHoy =
      auditoriaRegistros.filter(
        function (item) {

          return (
            fechaAuditoria(
              item.fecha
            ) === hoy
          );

        }
      ).length;


    var inserts =
      auditoriaRegistros.filter(
        function (item) {

          return (
            item.accion ===
            'INSERT'
          );

        }
      ).length;


    var updates =
      auditoriaRegistros.filter(
        function (item) {

          return (
            item.accion ===
            'UPDATE'
          );

        }
      ).length;


    var totalEl =
      document.getElementById(
        'auditoriaMetricTotal'
      );


    var hoyEl =
      document.getElementById(
        'auditoriaMetricHoy'
      );


    var insertEl =
      document.getElementById(
        'auditoriaMetricInsert'
      );


    var updateEl =
      document.getElementById(
        'auditoriaMetricUpdate'
      );


    if (totalEl) {

      totalEl.textContent =
        total;

    }


    if (hoyEl) {

      hoyEl.textContent =
        eventosHoy;

    }


    if (insertEl) {

      insertEl.textContent =
        inserts;

    }


    if (updateEl) {

      updateEl.textContent =
        updates;

    }

  }


  /* =========================================================
     RENDER
  ========================================================= */

  function renderAuditoria() {

    if (!auditoriaBody) {
      return;
    }


    auditoriaBody.innerHTML =
      '';


    auditoriaRegistros

      .slice()

      .sort(
        function (a, b) {

          return String(b.fecha)
            .localeCompare(
              String(a.fecha)
            );

        }
      )

      .forEach(
        function (item) {

          var row =
            document.createElement(
              'tr'
            );


          row.dataset.id =
            String(item.id);


          row.dataset.date =
            fechaAuditoria(
              item.fecha
            );


          row.dataset.module =
            item.modulo;


          row.dataset.action =
            item.accion;


          row.innerHTML = `

          <td>
            ${escaparHTML(
            fechaHoraAuditoria(
              item.fecha
            )
          )}
          </td>


          <td>

            <strong>
              ${escaparHTML(
            item.usuario
          )}
            </strong>

          </td>


          <td>

            <span
              class="badge ${claseAccionAuditoria(
            item.accion
          )}">

              ${escaparHTML(
            textoAccionAuditoria(
              item.accion
            )
          )}

            </span>

          </td>


          <td>
            ${escaparHTML(
            textoModuloAuditoria(
              item.modulo
            )
          )}
          </td>


          <td>
            ${escaparHTML(
            item.entidad ||
            '—'
          )}
          </td>


          <td>
            ${escaparHTML(
            item.descripcion ||
            '—'
          )}
          </td>


          <td>

            <button
              type="button"
              class="btn soft auditoria-view"
              data-id="${escaparHTML(
            String(item.id)
          )}">
              Ver
            </button>

          </td>

        `;


          auditoriaBody
            .appendChild(row);

        }
      );


    actualizarResumenAuditoria();

    aplicarFiltrosAuditoria();

  }


  /* =========================================================
     VER
  ========================================================= */

  function verAuditoria(id) {

    var item =
      buscarAuditoriaPorId(id);


    if (!item) {

      toast(
        'No se encontró el registro de auditoría'
      );

      return;

    }


    var poner =
      function (
        idElemento,
        valor
      ) {

        var elemento =
          document.getElementById(
            idElemento
          );


        if (!elemento) {
          return;
        }


        elemento.textContent =
          valor ||
          '—';

      };


    poner(
      'detalleAuditoriaAccion',

      textoAccionAuditoria(
        item.accion
      )
    );


    poner(
      'detalleAuditoriaSubtitulo',

      textoModuloAuditoria(
        item.modulo
      ) +
      (
        item.entidad
          ? ' · ' + item.entidad
          : ''
      )
    );


    poner(
      'detalleAuditoriaFecha',

      fechaHoraAuditoria(
        item.fecha
      )
    );


    poner(
      'detalleAuditoriaUsuario',

      item.usuario
    );


    poner(
      'detalleAuditoriaModulo',

      textoModuloAuditoria(
        item.modulo
      )
    );


    poner(
      'detalleAuditoriaTipo',

      textoAccionAuditoria(
        item.accion
      )
    );


    poner(
      'detalleAuditoriaEntidad',

      item.entidad ||
      'Sin referencia'
    );


    poner(
      'detalleAuditoriaDescripcion',

      item.descripcion
    );


    poner(
      'detalleAuditoriaDetalle',

      item.detalle ||
      'Sin información adicional.'
    );


    openModal(
      'auditoriaDetalleModal'
    );

  }


  /* =========================================================
     FILTROS
  ========================================================= */

  function aplicarFiltrosAuditoria() {

    if (!auditoriaBody) {
      return;
    }


    var texto =
      auditoriaSearch
        ? auditoriaSearch
          .value
          .trim()
          .toLowerCase()
        : '';


    var modulo =
      auditoriaModuleFilter
        ? auditoriaModuleFilter.value
        : '';


    var accion =
      auditoriaActionFilter
        ? auditoriaActionFilter.value
        : '';


    var fecha =
      auditoriaDateFilter
        ? auditoriaDateFilter.value
        : '';


    auditoriaBody
      .querySelectorAll('tr')
      .forEach(
        function (row) {

          var coincideTexto =

            !texto ||

            row
              .textContent
              .toLowerCase()
              .includes(texto);


          var coincideModulo =

            !modulo ||

            row.dataset.module ===
            modulo;


          var coincideAccion =

            !accion ||

            row.dataset.action ===
            accion;


          var coincideFecha =

            !fecha ||

            row.dataset.date ===
            fecha;


          row.style.display =

            (
              coincideTexto &&
              coincideModulo &&
              coincideAccion &&
              coincideFecha
            )

              ? ''

              : 'none';

        }
      );

  }


  /* =========================================================
     EVENTOS
  ========================================================= */

  if (auditoriaBody) {

    auditoriaBody.addEventListener(
      'click',
      function (event) {

        var boton =
          event.target.closest(
            '.auditoria-view'
          );


        if (!boton) {
          return;
        }


        verAuditoria(
          boton.dataset.id
        );

      }
    );

  }


  if (auditoriaSearch) {

    auditoriaSearch.addEventListener(
      'input',
      aplicarFiltrosAuditoria
    );

  }


  if (auditoriaModuleFilter) {

    auditoriaModuleFilter
      .addEventListener(
        'change',
        aplicarFiltrosAuditoria
      );

  }


  if (auditoriaActionFilter) {

    auditoriaActionFilter
      .addEventListener(
        'change',
        aplicarFiltrosAuditoria
      );

  }


  if (auditoriaDateFilter) {

    auditoriaDateFilter
      .addEventListener(
        'change',
        aplicarFiltrosAuditoria
      );

  }


  /* =========================================================
     INICIALIZAR
  ========================================================= */

  cargarAuditoria();

  renderAuditoria();

})();


/* =========================================================
   LOGIN
   Prototipo frontend.
   Actualmente NO valida usuario ni contraseña.
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    inicializarLogin();

    inicializarEstadoConexion();

  }
);


/* =========================================================
   INICIALIZAR LOGIN
========================================================= */

function inicializarLogin() {

  const pantallaLogin =
    document.getElementById(
      "pantallaLogin"
    );


  const formulario =
    document.getElementById(
      "loginForm"
    );


  const botonPassword =
    document.getElementById(
      "btnVerPassword"
    );


  /*
   * El login debe mostrarse siempre
   * mientras no exista autenticación real.
   */

  if (pantallaLogin) {

    pantallaLogin.style.display =
      "flex";

    pantallaLogin.classList.remove(
      "login-closing"
    );

  }


  /*
   * Ingreso al sistema.
   *
   * IMPORTANTE:
   * No se valida usuario.
   * No se valida contraseña.
   * No se consulta backend.
   */

  if (formulario) {

    formulario.addEventListener(
      "submit",
      function (event) {

        event.preventDefault();

        iniciarSesion();

      }
    );

  }


  /*
   * Mostrar / ocultar contraseña
   */

  if (botonPassword) {

    botonPassword.addEventListener(
      "click",
      alternarPassword
    );

  }

}


/* =========================================================
   INGRESAR AL SISTEMA
   SIN VALIDACIÓN
========================================================= */

function iniciarSesion() {

  const pantallaLogin =
    document.getElementById(
      "pantallaLogin"
    );


  const usuarioInput =
    document.getElementById(
      "loginUsuario"
    );


  if (!pantallaLogin) {
    return;
  }


  /*
   * Si se escribió un usuario,
   * únicamente lo mostramos en la barra superior.
   *
   * Esto NO significa que haya sido autenticado.
   */

  const usuario =
    usuarioInput
      ? usuarioInput.value.trim()
      : "";


  if (usuario) {

    const nombrePerfil =
      document.querySelector(
        ".profile .name strong"
      );


    const subtituloPerfil =
      document.querySelector(
        ".profile-subtitle"
      );


    if (nombrePerfil) {

      nombrePerfil.textContent =
        usuario;

    }


    if (subtituloPerfil) {

      subtituloPerfil.textContent =
        "Acceso temporal";

    }

  }


  /*
   * Animación de salida
   */

  pantallaLogin.classList.add(
    "login-closing"
  );


  setTimeout(
    function () {

      pantallaLogin.style.display =
        "none";

    },
    220
  );

}


/* =========================================================
   MOSTRAR / OCULTAR CONTRASEÑA
========================================================= */

function alternarPassword() {

  const password =
    document.getElementById(
      "loginPass"
    );


  const boton =
    document.getElementById(
      "btnVerPassword"
    );


  if (
    !password ||
    !boton
  ) {
    return;
  }


  const mostrar =
    password.type ===
    "password";


  password.type =
    mostrar
      ? "text"
      : "password";


  boton.dataset.visible =
    mostrar
      ? "true"
      : "false";


  boton.title =
    mostrar
      ? "Ocultar contraseña"
      : "Mostrar contraseña";


  boton.setAttribute(
    "aria-label",
    mostrar
      ? "Ocultar contraseña"
      : "Mostrar contraseña"
  );

}


/* =========================================================
   ESTADO DE CONEXIÓN
========================================================= */

function inicializarEstadoConexion() {

  actualizarEstadoConexion();


  window.addEventListener(
    "online",
    actualizarEstadoConexion
  );


  window.addEventListener(
    "offline",
    actualizarEstadoConexion
  );

}


function actualizarEstadoConexion() {

  const offlineBox =
    document.getElementById(
      "offlineBox"
    );

  const netStatus =
    document.getElementById(
      "netStatus"
    );


  if (navigator.onLine) {

    if (offlineBox) {

      offlineBox.style.display =
        "none";

    }


    if (netStatus) {

      netStatus.textContent =
        "En línea";

    }

  } else {

    if (offlineBox) {

      offlineBox.style.display =
        "block";

    }


    if (netStatus) {

      netStatus.textContent =
        "Sin conexión";

    }

  }



}

/* =========================================================
   SUBMENÚS DEL SIDEBAR
========================================================= */

document.querySelectorAll(".nav-group").forEach(grupo => {

  grupo.addEventListener("click", function () {

    const menuId = this.dataset.menu;
    const submenu = document.getElementById(menuId);

    if (!submenu) return;

    const estabaAbierto = submenu.classList.contains("open");


    /* Cerrar los demás grupos */

    document.querySelectorAll(".submenu").forEach(menu => {
      menu.classList.remove("open");
    });

    document.querySelectorAll(".nav-group").forEach(btn => {
      btn.classList.remove("open");
    });


    /* Abrir el seleccionado */

    if (!estabaAbierto) {

      submenu.classList.add("open");

      this.classList.add("open");

    }

  });

});

function abrirGrupoDePaginaActiva() {

  const activo = document.querySelector(".submenu button.active");

  if (!activo) return;

  const submenu = activo.closest(".submenu");

  if (!submenu) return;

  submenu.classList.add("open");

  const grupo = document.querySelector(
    `.nav-group[data-menu="${submenu.id}"]`
  );

  if (grupo) {

    grupo.classList.add("open");

    grupo.classList.add("section-active");

  }

}
/* =========================================================
   SELECTOR RÁPIDO DE CATÁLOGOS
   Capa de UI preparada para catálogos grandes (500+ registros).
   Conserva los <select> existentes para no romper la lógica actual.
========================================================= */

(function () {
  'use strict';

  var CATALOG_TARGETS = {
    vehiculoUnidad: 'unit',
    conductorUnidad: 'unit',
    recorridoVehiculo: 'vehicle',
    recorridoConductor: 'driver',
    recorridoUnidad: 'unit',
    combustibleVehiculo: 'vehicle',
    combustibleConductor: 'driver',
    combustibleUnidad: 'unit',
    mantenimientoVehiculo: 'vehicle',
    inventarioMovimientoArticulo: 'article',
    inventarioMovimientoUnidad: 'unit',
    inventarioMovimientoVehiculo: 'vehicle',
    documentMovementDocument: 'document',
    encargadoUnidad: 'unit',
    asignacionVehiculo: 'vehicle',
    asignacionUnidad: 'unit',
    reasignacionNuevaUnidad: 'unit',
    unidadSuperior: 'unit',
    documentoVehiculo: 'vehicle',
    incidenteVehiculo: 'vehicle',
    incidenteConductor: 'driver',
    incidenteUnidad: 'unit',
    reporteVehiculoFilter: 'vehicle'
  };

  var CATALOG_LABELS = {
    vehicle: {
      singular: 'vehículo',
      title: 'Seleccionar vehículo',
      search: 'Buscar por placa, marca, modelo o unidad...'
    },
    driver: {
      singular: 'conductor',
      title: 'Seleccionar conductor',
      search: 'Buscar por nombre, CI, licencia o unidad...'
    },
    unit: {
      singular: 'unidad',
      title: 'Seleccionar unidad',
      search: 'Buscar por código, nombre o ubicación...'
    },
    article: {
      singular: 'artículo',
      title: 'Seleccionar artículo',
      search: 'Buscar por código, artículo o categoría...'
    },
    document: {
      singular: 'documento',
      title: 'Seleccionar documento',
      search: 'Buscar por tipo, número, vehículo o referencia...'
    }
  };

  var state = {
    select: null,
    type: null,
    query: '',
    rows: []
  };

  var backdrop;
  var titleEl;
  var subtitleEl;
  var searchEl;
  var statusEl;
  var bodyEl;
  var clearBtn;

  function normalizarCatalogo(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function textoOpcion(option) {
    return String(option.textContent || option.label || option.value || '').trim();
  }

  function valorVisible(select) {
    var selected = select.options[select.selectedIndex];
    if (!select.value || !selected) {
      return '';
    }
    return textoOpcion(selected);
  }

  function tipoEtiqueta(type) {
    return CATALOG_LABELS[type] || {
      singular: 'registro',
      title: 'Seleccionar registro',
      search: 'Buscar...'
    };
  }

  function placaDesdeTexto(text) {
    return String(text || '').split(' · ')[0].trim();
  }

  function encontrarFilaTabla(type, text, value) {
    var primary = placaDesdeTexto(text);
    var tables = {
      vehicle: '#vehicleTable tbody tr',
      driver: '#conductorTable tbody tr',
      unit: '#unitTable tbody tr',
      article: '#inventarioTable tbody tr',
      document: '#documentTable tbody tr'
    };
    var selector = tables[type];
    if (!selector) return null;

    var rows = Array.from(document.querySelectorAll(selector));
    return rows.find(function (row) {
      var rowText = normalizarCatalogo(row.textContent);
      return rowText.indexOf(normalizarCatalogo(primary)) !== -1 ||
        (value && rowText.indexOf(normalizarCatalogo(value)) !== -1);
    }) || null;
  }

  function columnasFila(type, option) {
    var text = textoOpcion(option);
    var value = option.value;
    var row = encontrarFilaTabla(type, text, value);
    var cells = row ? Array.from(row.cells).map(function (cell) {
      return String(cell.textContent || '').replace(/\s+/g, ' ').trim();
    }) : [];

    if (type === 'vehicle') {
      return {
        c1: placaDesdeTexto(text) || value,
        c2: cells.length ? [cells[1], cells[2]].filter(Boolean).join(' · ') : text.replace(placaDesdeTexto(text), '').replace(/^\s*·\s*/, '') || 'Vehículo institucional',
        c3: cells.length ? [cells[3], cells[4]].filter(Boolean).join(' · ') : 'Disponible en catálogo'
      };
    }

    if (type === 'driver') {
      return {
        c1: cells.length ? cells[1] || text : text,
        c2: cells.length ? [cells[0], cells[2], cells[3]].filter(Boolean).join(' · ') : 'Conductor registrado',
        c3: cells.length ? cells[4] || '—' : 'Disponible en catálogo'
      };
    }

    if (type === 'unit') {
      return {
        c1: cells.length ? cells[1] || text : text,
        c2: cells.length ? [cells[0], cells[2]].filter(Boolean).join(' · ') : 'Unidad institucional',
        c3: cells.length ? cells[6] || cells[3] || '—' : 'Disponible en catálogo'
      };
    }

    if (type === 'article') {
      return {
        c1: cells.length ? cells[1] || text : text,
        c2: cells.length ? [cells[0], cells[2], cells[3]].filter(Boolean).join(' · ') : 'Artículo de inventario',
        c3: cells.length ? 'Stock: ' + (cells[4] || '—') : 'Disponible en catálogo'
      };
    }

    if (type === 'document') {
      return {
        c1: cells.length ? [cells[1], cells[2]].filter(Boolean).join(' · ') : text,
        c2: cells.length ? 'Vehículo: ' + (cells[0] || '—') : 'Documento registrado',
        c3: cells.length ? cells[4] || cells[5] || '—' : 'Disponible en catálogo'
      };
    }

    return { c1: text, c2: value, c3: 'Disponible' };
  }

  function construirDialogo() {
    if (document.getElementById('catalogPickerBackdrop')) {
      backdrop = document.getElementById('catalogPickerBackdrop');
      return;
    }

    backdrop = document.createElement('div');
    backdrop.id = 'catalogPickerBackdrop';
    backdrop.className = 'catalog-picker-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = [
      '<div class="catalog-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="catalogPickerTitle">',
      '  <div class="catalog-picker-head">',
      '    <div><h3 id="catalogPickerTitle">Seleccionar registro</h3><p id="catalogPickerSubtitle">Búsqueda rápida en el catálogo.</p></div>',
      '    <button type="button" class="catalog-picker-close" id="catalogPickerClose" aria-label="Cerrar">✕</button>',
      '  </div>',
      '  <div class="catalog-picker-search-wrap">',
      '    <input type="search" class="catalog-picker-search" id="catalogPickerSearch" autocomplete="off">',
      '  </div>',
      '  <div class="catalog-picker-status"><span id="catalogPickerStatus"></span><span>Seleccione una fila para continuar</span></div>',
      '  <div class="catalog-picker-table-wrap">',
      '    <table class="catalog-picker-table">',
      '      <thead><tr><th>Registro</th><th>Detalle</th><th>Referencia</th></tr></thead>',
      '      <tbody id="catalogPickerBody"></tbody>',
      '    </table>',
      '  </div>',
      '  <div class="catalog-picker-foot">',
      '    <span class="catalog-picker-hint">Se muestran hasta 80 coincidencias. Escriba para reducir resultados.</span>',
      '    <div class="actions">',
      '      <button type="button" class="btn" id="catalogPickerClear">Limpiar selección</button>',
      '      <button type="button" class="btn" id="catalogPickerCancel">Cancelar</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(backdrop);

    titleEl = document.getElementById('catalogPickerTitle');
    subtitleEl = document.getElementById('catalogPickerSubtitle');
    searchEl = document.getElementById('catalogPickerSearch');
    statusEl = document.getElementById('catalogPickerStatus');
    bodyEl = document.getElementById('catalogPickerBody');
    clearBtn = document.getElementById('catalogPickerClear');

    document.getElementById('catalogPickerClose').addEventListener('click', cerrarCatalogo);
    document.getElementById('catalogPickerCancel').addEventListener('click', cerrarCatalogo);
    clearBtn.addEventListener('click', limpiarSeleccionCatalogo);
    searchEl.addEventListener('input', function () {
      state.query = searchEl.value;
      renderCatalogo();
    });

    bodyEl.addEventListener('click', function (event) {
      var row = event.target.closest('.catalog-picker-row');
      if (!row || !state.select) return;
      seleccionarCatalogo(row.dataset.value);
    });

    backdrop.addEventListener('click', function (event) {
      if (event.target === backdrop) cerrarCatalogo();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && backdrop.classList.contains('show')) {
        cerrarCatalogo();
      }
    });
  }

  function obtenerOpciones(select, type) {
    return Array.from(select.options)
      .filter(function (option) { return option.value !== ''; })
      .map(function (option) {
        var cols = columnasFila(type, option);
        return {
          value: option.value,
          text: textoOpcion(option),
          c1: cols.c1,
          c2: cols.c2,
          c3: cols.c3,
          search: normalizarCatalogo([option.value, option.textContent, cols.c1, cols.c2, cols.c3].join(' '))
        };
      });
  }

  function renderCatalogo() {
    if (!state.select || !bodyEl) return;

    var query = normalizarCatalogo(state.query);
    var allRows = obtenerOpciones(state.select, state.type);
    var filtered = query ? allRows.filter(function (item) {
      return item.search.indexOf(query) !== -1;
    }) : allRows;

    state.rows = filtered;
    var visible = filtered.slice(0, 80);
    bodyEl.innerHTML = '';

    if (!visible.length) {
      var empty = document.createElement('tr');
      empty.innerHTML = '<td class="catalog-picker-empty" colspan="3">No se encontraron coincidencias.</td>';
      bodyEl.appendChild(empty);
    } else {
      visible.forEach(function (item) {
        var row = document.createElement('tr');
        row.className = 'catalog-picker-row' + (String(state.select.value) === String(item.value) ? ' is-selected' : '');
        row.dataset.value = item.value;

        var td1 = document.createElement('td');
        var strong = document.createElement('strong');
        strong.textContent = item.c1 || item.text;
        td1.appendChild(strong);

        var td2 = document.createElement('td');
        td2.textContent = item.c2 || '—';

        var td3 = document.createElement('td');
        td3.textContent = item.c3 || '—';

        row.appendChild(td1);
        row.appendChild(td2);
        row.appendChild(td3);
        bodyEl.appendChild(row);
      });
    }

    var shown = Math.min(filtered.length, 80);
    statusEl.textContent = query
      ? shown + ' de ' + filtered.length + ' coincidencia(s) · ' + allRows.length + ' registro(s) en catálogo'
      : shown + ' de ' + allRows.length + ' registro(s)';
  }

  function abrirCatalogo(select) {
    construirDialogo();
    state.select = select;
    state.type = select.dataset.catalogType || CATALOG_TARGETS[select.id] || 'record';
    state.query = '';

    var label = tipoEtiqueta(state.type);
    titleEl.textContent = label.title;
    subtitleEl.textContent = 'Búsqueda rápida sin recorrer listas extensas.';
    searchEl.placeholder = label.search;
    searchEl.value = '';
    clearBtn.style.display = select.dataset.catalogRequired === 'true' ? 'none' : '';

    renderCatalogo();
    backdrop.classList.add('show');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(function () {
      searchEl.focus();
      searchEl.select();
    });
  }

  function cerrarCatalogo() {
    if (!backdrop) return;
    backdrop.classList.remove('show');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.select = null;
    state.type = null;
    state.query = '';
  }

  function seleccionarCatalogo(value) {
    if (!state.select) return;
    state.select.value = value;
    state.select.dispatchEvent(new Event('input', { bubbles: true }));
    state.select.dispatchEvent(new Event('change', { bubbles: true }));
    sincronizarControl(state.select);
    cerrarCatalogo();
  }

  function limpiarSeleccionCatalogo() {
    if (!state.select || state.select.dataset.catalogRequired === 'true') return;
    state.select.value = '';
    state.select.dispatchEvent(new Event('input', { bubbles: true }));
    state.select.dispatchEvent(new Event('change', { bubbles: true }));
    sincronizarControl(state.select);
    cerrarCatalogo();
  }

  function sincronizarControl(select) {
    var control = document.querySelector('.catalog-picker-control[data-select-id="' + select.id + '"]');
    if (!control) return;

    var strong = control.querySelector('strong');
    var small = control.querySelector('small');
    var visible = valorVisible(select);
    var label = tipoEtiqueta(select.dataset.catalogType);

    if (visible) {
      strong.textContent = visible;
      small.textContent = 'Seleccionado · cambiar con búsqueda rápida';
      control.classList.remove('is-empty');
    } else {
      strong.textContent = 'Buscar ' + label.singular;
      small.textContent = 'Abrir búsqueda y seleccionar en tabla';
      control.classList.add('is-empty');
    }
  }

  function convertirSelect(select, type) {
    if (!select || select.dataset.catalogPickerReady === 'true') return;

    select.dataset.catalogPickerReady = 'true';
    select.dataset.catalogType = type;
    select.dataset.catalogRequired = select.required ? 'true' : 'false';
    select.required = false;
    select.classList.add('catalog-native-select');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    var control = document.createElement('div');
    control.className = 'catalog-picker-control is-empty';
    control.dataset.selectId = select.id;
    control.innerHTML = [
      '<div class="catalog-picker-value">',
      '  <strong>Buscar registro</strong>',
      '  <small>Abrir búsqueda y seleccionar en tabla</small>',
      '</div>',
      '<button type="button" class="btn catalog-picker-open">Buscar</button>'
    ].join('');

    select.insertAdjacentElement('afterend', control);

    control.querySelector('.catalog-picker-open').addEventListener('click', function () {
      sincronizarControl(select);
      abrirCatalogo(select);
    });

    select.addEventListener('change', function () {
      sincronizarControl(select);
    });

    var observer = new MutationObserver(function () {
      sincronizarControl(select);
    });
    observer.observe(select, { childList: true, subtree: true });

    sincronizarControl(select);
  }

  function inicializarCatalogos() {
    construirDialogo();

    Object.keys(CATALOG_TARGETS).forEach(function (id) {
      var select = document.getElementById(id);
      if (select) convertirSelect(select, CATALOG_TARGETS[id]);
    });

    document.addEventListener('reset', function (event) {
      setTimeout(function () {
        event.target.querySelectorAll('select[data-catalog-picker-ready="true"]').forEach(sincronizarControl);
      }, 0);
    }, true);

    document.addEventListener('click', function (event) {
      var opener = event.target.closest('[data-open], #btnNuevoRecorrido, #btnNuevoCombustible, #btnNuevoMantenimiento, #btnNuevoIncidente, #btnNuevoMovimientoInventario, #btnNuevaAsignacion, #btnRegistrarDocumento');
      if (!opener) return;
      requestAnimationFrame(function () {
        document.querySelectorAll('select[data-catalog-picker-ready="true"]').forEach(sincronizarControl);
      });
    }, true);

    document.addEventListener('submit', function (event) {
      var requiredCatalogs = Array.from(event.target.querySelectorAll('select[data-catalog-required="true"]'));
      var missing = requiredCatalogs.find(function (select) { return !select.value; });
      if (!missing) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      var control = document.querySelector('.catalog-picker-control[data-select-id="' + missing.id + '"]');
      if (control) {
        control.querySelector('.catalog-picker-open').focus();
        abrirCatalogo(missing);
      }
      if (typeof window.toast === 'function') {
        window.toast('Seleccione los campos obligatorios antes de guardar');
      }
    }, true);
  }

  window.SIVCatalogPicker = {
    refresh: function (selectId) {
      var select = document.getElementById(selectId);
      if (select) sincronizarControl(select);
    },
    open: function (selectId) {
      var select = document.getElementById(selectId);
      if (select) abrirCatalogo(select);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarCatalogos);
  } else {
    inicializarCatalogos();
  }
})();


/* =========================================================
   REPORTES · EXPORTAR PDF / IMPRIMIR
   Únicas acciones de salida visibles en el frontend.
========================================================= */

(function () {
  'use strict';

  function texto(el, fallback) {
    return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : (fallback || '');
  }

  function escaparHtmlReporte(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function obtenerReporteVisible() {
    var table = document.getElementById('reporteResultadoTable');
    if (!table) return null;

    var headers = Array.from(table.querySelectorAll('thead th')).map(function (th) {
      return texto(th);
    });

    var rows = Array.from(table.querySelectorAll('tbody tr')).map(function (tr) {
      return Array.from(tr.querySelectorAll('td')).map(function (td) {
        return texto(td);
      });
    }).filter(function (row) {
      return !(row.length === 1 && /no existen registros/i.test(row[0]));
    });

    var summary = Array.from(document.querySelectorAll('#reporteDetalleResumen .reporte-summary-item')).map(function (item) {
      return {
        label: texto(item.querySelector('span')),
        value: texto(item.querySelector('strong'))
      };
    });

    return {
      title: texto(document.getElementById('reporteDetalleTitulo'), 'Reporte'),
      subtitle: texto(document.getElementById('reporteDetalleSubtitulo')),
      headers: headers,
      rows: rows,
      summary: summary
    };
  }

  function nombreArchivoReporte(title) {
    return String(title || 'reporte')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'reporte';
  }

  function exportarReportePdf() {
    var report = obtenerReporteVisible();
    if (!report || !report.headers.length) {
      if (typeof window.toast === 'function') window.toast('Primero genere un reporte');
      return;
    }

    var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDFCtor) {
      if (typeof window.toast === 'function') window.toast('No se pudo cargar el generador PDF. Se abrirá la impresión.');
      imprimirReporte();
      return;
    }

    var orientation = report.headers.length > 6 ? 'landscape' : 'portrait';
    var doc = new jsPDFCtor({ orientation: orientation, unit: 'mm', format: 'a4' });
    var pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(report.title, 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    if (report.subtitle) {
      var subtitleLines = doc.splitTextToSize(report.subtitle, pageWidth - 28);
      doc.text(subtitleLines, 14, 22);
    }

    var summaryY = report.subtitle ? 30 : 24;
    if (report.summary.length) {
      var summaryText = report.summary.map(function (item) {
        return item.label + ': ' + item.value;
      }).join('   |   ');
      doc.setFontSize(7.5);
      doc.text(doc.splitTextToSize(summaryText, pageWidth - 28), 14, summaryY);
      summaryY += 8;
    }

    if (typeof doc.autoTable !== 'function') {
      if (typeof window.toast === 'function') window.toast('No se pudo cargar la tabla PDF. Se abrirá la impresión.');
      imprimirReporte();
      return;
    }

    doc.autoTable({
      startY: summaryY,
      head: [report.headers],
      body: report.rows,
      margin: { left: 10, right: 10 },
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.8, overflow: 'linebreak' },
      headStyles: { fontStyle: 'bold' },
      didDrawPage: function () {
        var height = doc.internal.pageSize.getHeight();
        doc.setFontSize(7);
        doc.text('Sistema de Información Vehicular · Comando Departamental de Policía Oruro', 10, height - 6);
        doc.text('Página ' + doc.internal.getNumberOfPages(), pageWidth - 28, height - 6);
      }
    });

    doc.save(nombreArchivoReporte(report.title) + '.pdf');
    if (typeof window.toast === 'function') window.toast('Reporte exportado a PDF');
  }

  function imprimirReporte() {
    var report = obtenerReporteVisible();
    if (!report || !report.headers.length) {
      if (typeof window.toast === 'function') window.toast('Primero genere un reporte');
      return;
    }

    var popup = window.open('', '_blank', 'width=1100,height=760');
    if (!popup) {
      if (typeof window.toast === 'function') window.toast('El navegador bloqueó la ventana de impresión');
      return;
    }

    var summaryHtml = report.summary.map(function (item) {
      return '<div class="sum"><span>' + escaparHtmlReporte(item.label) + '</span><strong>' + escaparHtmlReporte(item.value) + '</strong></div>';
    }).join('');

    var headHtml = report.headers.map(function (header) {
      return '<th>' + escaparHtmlReporte(header) + '</th>';
    }).join('');

    var rowsHtml = report.rows.map(function (row) {
      return '<tr>' + row.map(function (cell) {
        return '<td>' + escaparHtmlReporte(cell) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    popup.document.open();
    popup.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + escaparHtmlReporte(report.title) + '</title><style>' +
      '@page{size:auto;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#142019;margin:0;font-size:10px}' +
      'header{border-bottom:2px solid #14503D;padding-bottom:10px;margin-bottom:12px}h1{font-family:Georgia,serif;font-size:20px;margin:0 0 4px}p{margin:0;color:#56635b}' +
      '.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:12px 0}.sum{border:1px solid #dbe3dc;padding:7px}.sum span{display:block;font-size:8px;color:#718078;margin-bottom:2px}.sum strong{font-size:11px}' +
      'table{width:100%;border-collapse:collapse;font-size:8.5px}th,td{border:1px solid #dbe3dc;padding:5px;text-align:left;vertical-align:top}th{background:#eef3ef;font-weight:700}' +
      'footer{margin-top:10px;padding-top:7px;border-top:1px solid #dbe3dc;font-size:8px;color:#718078}@media print{button{display:none}}' +
      '</style></head><body>' +
      '<header><h1>' + escaparHtmlReporte(report.title) + '</h1><p>' + escaparHtmlReporte(report.subtitle) + '</p></header>' +
      (summaryHtml ? '<section class="summary">' + summaryHtml + '</section>' : '') +
      '<table><thead><tr>' + headHtml + '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
      '<footer>Sistema de Información Vehicular · Comando Departamental de Policía Oruro</footer>' +
      '</body></html>');
    popup.document.close();
    popup.focus();
    setTimeout(function () { popup.print(); }, 180);
  }

  function initReportActions() {
    var pdfBtn = document.getElementById('btnExportarReportePdf');
    var printBtn = document.getElementById('btnImprimirReporte');
    if (pdfBtn) pdfBtn.addEventListener('click', exportarReportePdf);
    if (printBtn) printBtn.addEventListener('click', imprimirReporte);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReportActions);
  } else {
    initReportActions();
  }
})();


/* =========================================================
   PUENTE PARA BACKEND
   Punto único de configuración para comenzar a sustituir localStorage
   por endpoints HTTP sin cambiar la interfaz de usuario.
========================================================= */

window.SIVApi = window.SIVApi || {
  baseUrl: '',

  configure: function (baseUrl) {
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
  },

  request: async function (path, options) {
    if (!this.baseUrl) {
      throw new Error('SIVApi.baseUrl todavía no fue configurado.');
    }

    var config = Object.assign({
      headers: { 'Content-Type': 'application/json' }
    }, options || {});

    var response = await fetch(this.baseUrl + '/' + String(path || '').replace(/^\//, ''), config);
    if (!response.ok) {
      throw new Error('Error HTTP ' + response.status);
    }

    var type = response.headers.get('content-type') || '';
    return type.indexOf('application/json') !== -1 ? response.json() : response.text();
  }
};
