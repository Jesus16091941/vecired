/*
 * VeciRed - capa interactiva compartida para los prototipos HTML.
 * Navegación entre pantallas, estado local de formularios, GPS y mapas (Leaflet).
 */
(function () {
  'use strict';

  var PAGE = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';

  var SANTIAGO_CENTRO = { lat: -33.4378, lng: -70.6504, label: 'Santiago Centro', place: 'Santiago Centro, Santiago', fallback: true };

  var SCREENS = [
    ['index', 'Índice de prototipos'],
    ['INT-01', 'Home / Página de inicio'],
    ['INT-02', 'Registro de usuario'],
    ['INT-03', 'Selección de tipo de usuario'],
    ['INT-03.5', 'Tipo de especialista'],
    ['INT-04', 'Inicio de sesión'],
    ['INT-05', 'Recuperar contraseña'],
    ['INT-06', 'Verificación del técnico'],
    ['INT-07', 'Dashboard del técnico'],
    ['INT-08', 'Perfil del técnico'],
    ['INT-09', 'Publicar servicio'],
    ['INT-10', 'Panel del cliente'],
    ['INT-11', 'Búsqueda de servicios'],
    ['INT-12', 'Mapa de técnicos'],
    ['INT-13', 'Perfil público y reseñas'],
    ['INT-14', 'Publicar solicitud'],
    ['INT-15', 'Solicitud publicada'],
    ['INT-16', 'Solicitudes cercanas'],
    ['INT-17', 'Detalle de solicitud'],
    ['INT-18', 'Propuestas recibidas'],
    ['INT-19', 'Comparación de técnicos'],
    ['INT-20', 'Servicio confirmado'],
    ['INT-21', 'Chat / coordinación'],
    ['INT-22', 'Agenda e historial'],
    ['INT-23', 'Calificar servicio'],
    ['INT-00-teryser', 'Términos del servicio'],
    ['INT-00-poldepri', 'Política de privacidad'],
    ['INT-00-prodeda', 'Protección de datos'],
    ['INT-00-cendeayu', 'Centro de ayuda']
  ];

  var TECH_PAGES = ['INT-06', 'INT-07', 'INT-08', 'INT-09', 'INT-16', 'INT-17'];
  var CLIENT_PAGES = ['INT-10', 'INT-11', 'INT-12', 'INT-13', 'INT-14', 'INT-15', 'INT-18', 'INT-19', 'INT-20', 'INT-21', 'INT-22', 'INT-23'];

  /* Almacenamiento de sesión */
  var store = {
    get: function (key) {
      try { return JSON.parse(sessionStorage.getItem('vecired:' + key)); } catch (e) { return null; }
    },
    set: function (key, value) {
      try { sessionStorage.setItem('vecired:' + key, JSON.stringify(value)); } catch (e) { /* almacenamiento no disponible */ }
    }
  };

  function homeFor(page) {
    if (TECH_PAGES.indexOf(page) !== -1) return 'INT-07.html';
    if (CLIENT_PAGES.indexOf(page) !== -1) return 'INT-10.html';
    return 'INT-01.html';
  }

  /* Toasts */
  var toastHost;
  function toast(message) {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'vr-toast-host';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    var item = document.createElement('div');
    item.className = 'vr-toast';
    item.textContent = message;
    toastHost.appendChild(item);
    setTimeout(function () { item.classList.add('vr-toast--out'); }, 2600);
    setTimeout(function () { item.remove(); }, 3000);
  }

  /* Navegación */
  function resolveTarget(el) {
    if (el.hasAttribute('data-go-role')) {
      try {
        var routes = JSON.parse(el.getAttribute('data-go-role'));
        return routes[store.get('role') || 'client'] || routes.client;
      } catch (e) { return null; }
    }
    return el.getAttribute('data-go');
  }

  function go(el) {
    var message = el.getAttribute('data-toast');
    var target = resolveTarget(el);
    if (message) toast(message);
    if (!target) return;
    var delay = el.hasAttribute('data-go-delay') ? Number(el.getAttribute('data-go-delay')) : (message ? 900 : 0);
    setTimeout(function () { location.href = target; }, delay);
  }

  function isSubmitButton(el) {
    return el.tagName === 'BUTTON' && el.form && (el.getAttribute('type') || 'submit').toLowerCase() === 'submit';
  }

  document.addEventListener('click', function (event) {
    var el = event.target.closest('[data-go], [data-go-role], [data-toast]');
    if (!el || el.disabled) return;
    // Los botones submit navegan en el evento submit para respetar la validación del formulario.
    if (isSubmitButton(el)) return;
    event.preventDefault();
    go(el);
  });

  document.addEventListener('submit', function (event) {
    // Prototipo sin backend: nunca recargamos la página al enviar un formulario.
    event.preventDefault();
    var submitter = event.submitter || event.target.querySelector('[data-go], [data-go-role], [data-toast]');
    var navigates = submitter && (submitter.hasAttribute('data-go') || submitter.hasAttribute('data-go-role') || submitter.hasAttribute('data-toast'));
    if (event.target.hasAttribute('data-vr-register')) {
      users.registerFromForm(event.target).then(function (user) {
        if (!user) return;
        if (submitter) submitter.setAttribute('data-toast', '¡Cuenta creada! Bienvenido/a a VeciRed, ' + user.nombre.split(' ')[0] + '.');
        if (navigates) go(submitter);
      });
      return;
    }
    if (navigates) go(submitter);
  }, true);

  /* Registro temporal de usuarios (localStorage del navegador; sin backend en el prototipo) */
  var USERS_KEY = 'vecired:users';
  var users = {
    list: function () {
      try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; }
    },
    save: function (list) {
      localStorage.setItem(USERS_KEY, JSON.stringify(list));
    },
    current: function () { return store.get('user'); },
    logout: function () { try { sessionStorage.removeItem('vecired:user'); } catch (e) { /* sin almacenamiento */ } },
    clear: function () { localStorage.removeItem(USERS_KEY); users.logout(); },
    updateCurrent: function (patch) {
      var current = users.current();
      if (!current) return null;
      var list = users.list();
      var stored = list.find(function (u) { return u.id === current.id; });
      if (stored) {
        Object.assign(stored, patch);
        users.save(list);
      }
      var updated = Object.assign({}, current, patch);
      store.set('user', updated);
      return updated;
    },
    registerFromForm: function (form) {
      var field = function (name) {
        var el = form.elements.namedItem(name);
        return el && typeof el.value === 'string' ? el.value.trim() : '';
      };
      var email = field('correo').toLowerCase();
      var password = (form.elements.namedItem('password') || {}).value || '';
      var perfil = form.getAttribute('data-vr-perfil') || 'vecino';
      var isPro = perfil !== 'vecino';
      var verificacion = isPro ? collectVerification(form) : null;
      if (users.list().some(function (u) { return u.correo === email; })) {
        toast('Ya existe una cuenta registrada con ' + email + '.');
        var emailInput = form.elements.namedItem('correo');
        if (emailInput) emailInput.focus();
        return Promise.resolve(null);
      }
      if (verificacion && verificacion.rut && users.list().some(function (u) { return u.verificacion && u.verificacion.rut === verificacion.rut; })) {
        toast('Ya existe un especialista registrado con el RUT ' + verificacion.rut + '.');
        var rutInput = form.elements.namedItem('rut');
        if (rutInput) rutInput.focus();
        return Promise.resolve(null);
      }
      var salt = randomHex(16);
      return hashPassword(password, salt).then(function (hash) {
        var user = {
          id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'u-' + Date.now(),
          nombre: field('nombre'),
          correo: email,
          telefono: '+56 ' + field('telefono').replace(/\s+/g, ' '),
          direccion: field('direccion'),
          barrio: field('barrio'),
          depto: field('depto'),
          rol: isPro ? 'tech' : 'client',
          perfil: perfil,
          verificacion: verificacion,
          proveedor: form.getAttribute('data-vr-provider') || 'correo',
          salt: salt,
          passwordHash: hash,
          creadoEn: new Date().toISOString()
        };
        var list = users.list();
        list.push(user);
        try {
          users.save(list);
        } catch (e) {
          toast('No se pudo guardar el registro en este navegador.');
          return null;
        }
        var publicUser = Object.assign({}, user);
        delete publicUser.salt;
        delete publicUser.passwordHash;
        store.set('user', publicUser);
        return publicUser;
      });
    },
    authenticate: function (identifier, password) {
      var id = String(identifier || '').trim().toLowerCase();
      var digits = id.replace(/\D/g, '');
      return seedReady.then(function () {
        var user = users.list().find(function (u) {
          if (u.correo === id) return true;
          var phone = String(u.telefono || '').replace(/\D/g, '');
          return digits.length >= 8 && phone.slice(-digits.length) === digits;
        });
        if (!user) return null;
        return hashPassword(password, user.salt).then(function (hash) {
          if (!hash || hash !== user.passwordHash) return null;
          var publicUser = Object.assign({}, user);
          delete publicUser.salt;
          delete publicUser.passwordHash;
          store.set('user', publicUser);
          store.set('role', user.rol === 'tech' ? 'tech' : user.rol === 'admin' ? 'admin' : 'client');
          return publicUser;
        });
      });
    },
    homeFor: function (user) {
      if (!user) return 'INT-01.html';
      if (user.rol === 'admin') return 'index.html';
      return user.rol === 'tech' ? 'INT-07.html' : 'INT-10.html';
    }
  };

  /*
   * Modelo de cuentas:
   *   rol     'client' (vecino) | 'tech' (especialista) | 'admin' (administrador)
   *   perfil  'vecino' | 'certificado' | 'experiencia' | 'admin'
   *   tipoCuenta  etiqueta legible del tipo de usuario
   * Cuentas de demostración: se crean una sola vez por navegador (localStorage) y nunca pisan
   * registros existentes con el mismo correo. Contraseñas de demo: ver DEMO_PASSWORDS.
   */
  var SEED_VERSION = 1;
  var SEED_KEY = 'vecired:seed-version';
  var DEMO_PASSWORDS = { client: 'Vecino2026!', tech: 'Tecnico2026!', admin: 'Admin2026!' };
  var TIPO_CUENTA = {
    vecino: 'Vecino / Cliente',
    certificado: 'Profesional certificado',
    experiencia: 'Profesional con experiencia',
    admin: 'Administrador'
  };

  var SEED_USERS = [
    { id: 'seed-admin', nombre: 'Administración VeciRed', correo: 'admin@vecired.cl', telefono: '+56 9 2000 0000', perfil: 'admin', direccion: 'Agustinas 1070', barrio: 'Santiago Centro', permisos: ['usuarios', 'verificaciones', 'reportes', 'contenido'] },

    { id: 'seed-v-maria', nombre: 'María Fuentes', correo: 'maria.fuentes@vecired.demo', telefono: '+56 9 3111 0001', perfil: 'vecino', direccion: 'Huérfanos 1160', barrio: 'Santiago Centro' },
    { id: 'seed-v-camila', nombre: 'Camila Restrepo', correo: 'camila.restrepo@vecired.demo', telefono: '+56 9 3111 0002', perfil: 'vecino', direccion: 'Merced 450', barrio: 'Barrio Lastarria' },
    { id: 'seed-v-ana', nombre: 'Ana Soto', correo: 'ana.soto@vecired.demo', telefono: '+56 9 3111 0003', perfil: 'vecino', direccion: 'Compañía 2015', barrio: 'Barrio Brasil' },
    { id: 'seed-v-rosa', nombre: 'Rosa Pérez', correo: 'rosa.perez@vecired.demo', telefono: '+56 9 3111 0004', perfil: 'vecino', direccion: 'Agustinas 2240', barrio: 'Barrio Yungay' },
    { id: 'seed-v-felipe', nombre: 'Felipe González', correo: 'felipe.gonzalez@vecired.demo', telefono: '+56 9 3111 0005', perfil: 'vecino', direccion: 'San Antonio 385', barrio: 'Santiago Centro' },
    { id: 'seed-v-claudia', nombre: 'Claudia Valdés', correo: 'claudia.valdes@vecired.demo', telefono: '+56 9 3111 0006', perfil: 'vecino', direccion: 'José Victorino Lastarria 90', barrio: 'Barrio Lastarria' },
    { id: 'seed-v-beatriz', nombre: 'Beatriz Rosales', correo: 'beatriz.rosales@vecired.demo', telefono: '+56 9 3111 0007', perfil: 'vecino', direccion: 'Libertad 120', barrio: 'Barrio Yungay' },
    { id: 'seed-v-carlos', nombre: 'Carlos Herrera', correo: 'carlos.herrera@vecired.demo', telefono: '+56 9 3111 0008', perfil: 'vecino', direccion: 'Santa Isabel 640', barrio: 'Barrio Santa Isabel' },
    { id: 'seed-v-andres', nombre: 'Andrés Morales', correo: 'andres.morales@vecired.demo', telefono: '+56 9 3111 0009', perfil: 'vecino', direccion: 'Portugal 210', barrio: 'Barrio San Borja' },

    { id: 'seed-t-roberto', nombre: 'Roberto Díaz', correo: 'roberto.diaz@vecired.demo', telefono: '+56 9 4222 0001', perfil: 'certificado', direccion: 'Catedral 1850', barrio: 'Barrio Yungay', oficios: ['Gasfitería'], titulo: 'Maestro Gasfíter certificado SEC', anosExperiencia: 15, rut: '11.111.111-1' },
    { id: 'seed-t-lucia', nombre: 'Lucía Muñoz', correo: 'lucia.munoz@vecired.demo', telefono: '+56 9 4222 0002', perfil: 'certificado', direccion: 'Monjitas 520', barrio: 'Barrio Bellas Artes', oficios: ['Electricidad'], titulo: 'Ingeniera Electricista, instaladora SEC clase A', anosExperiencia: 9, rut: '12.222.222-0' },
    { id: 'seed-t-carlosv', nombre: 'Carlos Vargas', correo: 'carlos.vargas@vecired.demo', telefono: '+56 9 4222 0003', perfil: 'certificado', direccion: 'San Pablo 1400', barrio: 'Santiago Centro', oficios: ['Cerrajería'], titulo: 'Técnico en cerrajería de alta seguridad', anosExperiencia: 11, rut: '13.333.333-4' },
    { id: 'seed-t-carlost', nombre: 'Carlos Torres', correo: 'carlos.torres@vecired.demo', telefono: '+56 9 4222 0004', perfil: 'certificado', direccion: 'Rosas 1290', barrio: 'Barrio Brasil', oficios: ['Carpintería'], titulo: 'Técnico en construcción y carpintería', anosExperiencia: 8, rut: '14.444.444-8' },
    { id: 'seed-t-andresp', nombre: 'Andrés Pizarro', correo: 'andres.pizarro@vecired.demo', telefono: '+56 9 4222 0005', perfil: 'certificado', direccion: 'Ricardo Cumming 330', barrio: 'Barrio Brasil', oficios: ['Pintura', 'Terminaciones'], titulo: 'Curso de pintura y terminaciones (OTEC)', anosExperiencia: 7, rut: '15.555.555-1' },
    { id: 'seed-t-juan', nombre: 'Juan Camilo Ramírez', correo: 'juancamilo.ramirez@vecired.demo', telefono: '+56 9 4222 0006', perfil: 'certificado', direccion: 'Huérfanos 2050', barrio: 'Barrio Brasil', oficios: ['Electricidad'], titulo: 'Técnico electricista, instalador SEC clase D', anosExperiencia: 6, rut: '16.666.666-5' },
    { id: 'seed-t-luisa', nombre: 'Luisa María Mendoza', correo: 'luisa.mendoza@vecired.demo', telefono: '+56 9 4222 0007', perfil: 'certificado', direccion: 'Agustinas 1500', barrio: 'Santiago Centro', oficios: ['Gasfitería', 'Gas'], titulo: 'Instaladora de gas SEC clase 3', anosExperiencia: 10, rut: '17.777.777-9' },
    { id: 'seed-t-valentina', nombre: 'Valentina Rivas', correo: 'valentina.rivas@vecired.demo', telefono: '+56 9 4222 0008', perfil: 'certificado', direccion: 'Mac Iver 640', barrio: 'Santiago Centro', oficios: ['Climatización'], titulo: 'Técnica en refrigeración y climatización', anosExperiencia: 5, rut: '18.888.888-2' },

    { id: 'seed-e-hernan', nombre: 'Hernán Soto', correo: 'hernan.soto@vecired.demo', telefono: '+56 9 5333 0001', perfil: 'experiencia', direccion: 'Cueto 410', barrio: 'Barrio Yungay', oficios: ['Albañilería', 'Cerámica'], anosExperiencia: 25, rut: '9.876.543-3', respaldo: 'Recomendaciones de 6 vecinos y fotos de 12 trabajos' },
    { id: 'seed-e-marta', nombre: 'Marta Leiva', correo: 'marta.leiva@vecired.demo', telefono: '+56 9 5333 0002', perfil: 'experiencia', direccion: 'Erasmo Escala 2180', barrio: 'Barrio Brasil', oficios: ['Pintura', 'Empapelado'], anosExperiencia: 14, rut: '10.234.567-8', respaldo: 'Recomendaciones de 4 vecinos y fotos de 9 trabajos' },
    { id: 'seed-e-jorge', nombre: 'Jorge Contreras', correo: 'jorge.contreras@vecired.demo', telefono: '+56 9 5333 0003', perfil: 'experiencia', direccion: 'Sazié 2050', barrio: 'Barrio República', oficios: ['Gasfitería', 'Reparaciones del hogar'], anosExperiencia: 18, rut: '8.765.432-1', respaldo: 'Recomendaciones de 5 vecinos y fotos de 7 trabajos' }
  ];

  function rolFor(perfil) {
    if (perfil === 'admin') return 'admin';
    return perfil === 'vecino' ? 'client' : 'tech';
  }

  function buildSeedUser(data) {
    var rol = rolFor(data.perfil);
    var user = {
      id: data.id,
      nombre: data.nombre,
      correo: data.correo,
      telefono: data.telefono,
      direccion: data.direccion,
      barrio: data.barrio,
      depto: '',
      rol: rol,
      perfil: data.perfil,
      tipoCuenta: TIPO_CUENTA[data.perfil],
      proveedor: 'correo',
      demo: true,
      creadoEn: '2026-01-15T12:00:00.000Z'
    };
    if (rol === 'admin') user.permisos = data.permisos;
    if (rol === 'tech') {
      user.oficios = data.oficios;
      user.anosExperiencia = data.anosExperiencia;
      user.verificacion = data.perfil === 'certificado'
        ? { estado: 'verificado', rut: data.rut, titulo: data.titulo }
        : { estado: 'verificado', rut: data.rut, respaldo: data.respaldo };
      user.sello = {
        tipo: data.perfil === 'certificado' ? 'Sello Profesional Certificado' : 'Sello Experiencia Verificada',
        estado: 'aprobado'
      };
    }
    return user;
  }

  function seedDemoUsers() {
    var done;
    try { done = Number(localStorage.getItem(SEED_KEY)) >= SEED_VERSION; } catch (e) { return Promise.resolve(); }
    if (done || !(window.crypto && crypto.subtle)) return Promise.resolve();
    var existing = users.list();
    var taken = {};
    existing.forEach(function (u) { taken[u.correo] = true; taken[u.id] = true; });
    var pending = SEED_USERS.filter(function (d) { return !taken[d.correo] && !taken[d.id]; });
    return Promise.all(pending.map(function (data) {
      var user = buildSeedUser(data);
      user.salt = randomHex(16);
      return hashPassword(DEMO_PASSWORDS[user.rol], user.salt).then(function (hash) {
        user.passwordHash = hash;
        return user;
      });
    })).then(function (created) {
      try {
        users.save(users.list().concat(created));
        localStorage.setItem(SEED_KEY, String(SEED_VERSION));
      } catch (e) { /* almacenamiento lleno o bloqueado */ }
    });
  }

  var seedReady = seedDemoUsers();

  /* Datos de verificación del especialista: solo campos visibles; de los archivos se guarda la referencia, no el contenido */
  function collectVerification(form) {
    var data = { estado: 'pendiente de revisión' };
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name || !el.closest('[data-vr-verificacion]') || el.matches(':disabled')) return;
      if (el.type === 'file') {
        data[el.name] = Array.prototype.map.call(el.files || [], function (f) {
          return { nombre: f.name, tipo: f.type, tamanoKB: Math.round(f.size / 1024) };
        });
      } else if (el.value.trim()) {
        data[el.name] = el.value.trim();
      }
    });
    return data;
  }

  function randomHex(bytes) {
    var arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.prototype.map.call(arr, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  function hashPassword(password, salt) {
    if (!(window.crypto && crypto.subtle)) return Promise.resolve(null);
    var data = new TextEncoder().encode(salt + ':' + password);
    return crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function wireLogo() {
    var logo = document.querySelector('header img, nav img');
    if (!logo || logo.closest('a, button')) return;
    var target = PAGE === 'INT-01' ? 'index.html' : homeFor(PAGE);
    logo.style.cursor = 'pointer';
    logo.setAttribute('role', 'link');
    logo.setAttribute('tabindex', '0');
    logo.setAttribute('title', 'Ir al inicio');
    logo.addEventListener('click', function () { location.href = target; });
    logo.addEventListener('keydown', function (e) { if (e.key === 'Enter') location.href = target; });
  }

  /* Rol seleccionado (Vecino / Técnico) compartido entre pantallas */
  function wireRoles() {
    if (typeof window.selectRole !== 'function') return;
    var original = window.selectRole;
    var techArg = 'tech';
    document.querySelectorAll('[onclick*="selectRole("]').forEach(function (el) {
      var match = /selectRole\(\s*['"]([^'"]+)['"]/.exec(el.getAttribute('onclick'));
      if (match && match[1] !== 'client') techArg = match[1];
    });
    window.selectRole = function (role) {
      store.set('role', role === 'client' ? 'client' : 'tech');
      return original.apply(this, arguments);
    };
    var saved = store.get('role');
    if (saved) {
      try { original(saved === 'tech' ? techArg : 'client'); } catch (e) { /* tarjeta no disponible */ }
    }
  }

  /* Navegador flotante de pantallas */
  function buildScreenNav() {
    if (PAGE === 'index') return;
    var index = -1;
    for (var i = 0; i < SCREENS.length; i++) if (SCREENS[i][0] === PAGE) index = i;
    if (index === -1) return;
    var prev = SCREENS[index - 1];
    var next = SCREENS[index + 1];

    var nav = document.createElement('nav');
    nav.className = 'vr-screen-nav';
    nav.setAttribute('aria-label', 'Navegación entre pantallas del prototipo');

    var html = '';
    html += prev
      ? '<a class="vr-screen-nav__btn" href="' + prev[0] + '.html" title="Anterior: ' + prev[1] + '" aria-label="Pantalla anterior: ' + prev[1] + '">&#8249;</a>'
      : '<span class="vr-screen-nav__btn vr-screen-nav__btn--off" aria-hidden="true">&#8249;</span>';
    html += '<button type="button" class="vr-screen-nav__current" aria-expanded="false" aria-controls="vr-screen-list"><strong>' + PAGE + '</strong><span>' + SCREENS[index][1] + '</span></button>';
    html += next
      ? '<a class="vr-screen-nav__btn" href="' + next[0] + '.html" title="Siguiente: ' + next[1] + '" aria-label="Pantalla siguiente: ' + next[1] + '">&#8250;</a>'
      : '<span class="vr-screen-nav__btn vr-screen-nav__btn--off" aria-hidden="true">&#8250;</span>';
    html += '<ul class="vr-screen-nav__list" id="vr-screen-list" hidden>';
    SCREENS.forEach(function (screen) {
      html += '<li><a href="' + screen[0] + '.html"' + (screen[0] === PAGE ? ' aria-current="page"' : '') + '><strong>' + screen[0] + '</strong> ' + screen[1] + '</a></li>';
    });
    html += '</ul>';
    nav.innerHTML = html;
    document.body.appendChild(nav);

    var toggle = nav.querySelector('.vr-screen-nav__current');
    var list = nav.querySelector('.vr-screen-nav__list');
    var close = function () { list.setAttribute('hidden', ''); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', function () {
      if (list.hasAttribute('hidden')) { list.removeAttribute('hidden'); toggle.setAttribute('aria-expanded', 'true'); }
      else close();
    });
    document.addEventListener('click', function (e) { if (!nav.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* Estado local de formularios (se conserva al cambiar de pantalla) */
  var SKIPPED_TYPES = ['password', 'file', 'hidden', 'submit', 'button', 'reset', 'image'];

  function sharedKey(el) {
    if (el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT') return null;
    var hint = [el.id, el.name, el.type, el.placeholder, el.getAttribute('aria-label')].join(' ').toLowerCase();
    if (/e-?mail|correo|identifier/.test(hint)) return 'shared:email';
    if (el.type === 'tel' || /phone|celular|tel[eé]fono|whatsapp/.test(hint)) return 'shared:phone';
    if (/neighbo|barrio/.test(hint)) return 'shared:barrio';
    if (/address|direcci/.test(hint)) return 'shared:address';
    if (/full-?name|nombre completo|input-name/.test(hint)) return 'shared:name';
    return null;
  }

  function fieldKey(el, position) {
    var shared = sharedKey(el);
    if (shared) return shared;
    if (el.type === 'radio') return 'field:' + PAGE + ':radio:' + (el.name || position);
    return 'field:' + PAGE + ':' + (el.id || el.name || (el.tagName.toLowerCase() + '-' + position));
  }

  function persistFields() {
    var fields = Array.prototype.filter.call(document.querySelectorAll('input, textarea, select'), function (el) {
      return SKIPPED_TYPES.indexOf((el.type || '').toLowerCase()) === -1 && !el.hasAttribute('data-vr-nostore');
    });

    fields.forEach(function (el, position) {
      var key = fieldKey(el, position);
      var saved = store.get(key);
      if (saved !== null && saved !== undefined) {
        if (el.type === 'checkbox') el.checked = !!saved;
        else if (el.type === 'radio') el.checked = el.value === saved;
        else el.value = saved;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      var save = function () {
        if (el.type === 'checkbox') store.set(key, el.checked);
        else if (el.type === 'radio') { if (el.checked) store.set(key, el.value); }
        else store.set(key, el.value);
      };
      el.addEventListener('input', save);
      el.addEventListener('change', save);
    });
  }

  /* Ubicación: GPS con respaldo en Santiago Centro */
  var isDesktop = !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) && !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  var locationListeners = [];
  var currentLocation = store.get('location') || SANTIAGO_CENTRO;
  var pendingLocate = null;

  function setLocation(loc) {
    currentLocation = loc;
    store.set('location', loc);
    locationListeners.forEach(function (fn) { fn(loc); });
    updateLocationText(loc);
  }

  function reverseGeocode(loc) {
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 5000);
    return fetch('https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&addressdetails=1&lat=' + loc.lat + '&lon=' + loc.lng, {
      headers: { 'Accept-Language': 'es' },
      signal: controller ? controller.signal : undefined
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var a = (data && data.address) || {};
        var barrio = a.suburb || a.neighbourhood || a.quarter || a.city_district || a.city || a.town || 'Tu ubicación';
        var ciudad = a.city || a.town || a.village || a.state || '';
        var calle = a.road ? a.road + (a.house_number ? ' ' + a.house_number : '') : '';
        return Object.assign({}, loc, { label: barrio, place: ciudad && ciudad !== barrio ? barrio + ', ' + ciudad : barrio, street: calle });
      })
      .catch(function () { return Object.assign({}, loc, { label: 'Tu ubicación', place: 'Ubicación GPS activa' }); })
      .finally(function () { clearTimeout(timer); });
  }

  function useFallback(reason) {
    var loc = Object.assign({}, SANTIAGO_CENTRO, { reason: reason });
    setLocation(loc);
    if (reason !== 'desktop' && !store.get('fallback-notice')) {
      store.set('fallback-notice', true);
      toast('No pudimos usar tu GPS. Mostrando el mapa en Santiago Centro.');
    }
    return loc;
  }

  /**
   * Obtiene la ubicación del usuario.
   * - En computadores se usa Santiago Centro por defecto (salvo que el usuario pida su GPS con un botón).
   * - Si el usuario niega el permiso, no hay GPS o la precisión es muy baja, también se usa Santiago Centro.
   */
  function locate(options) {
    var force = options && options.force;
    if (!force && pendingLocate) return pendingLocate;
    if (!force && currentLocation && !currentLocation.fallback) return Promise.resolve(currentLocation);
    if (!force && isDesktop) return Promise.resolve(useFallback('desktop'));
    if (!('geolocation' in navigator) || !window.isSecureContext) return Promise.resolve(useFallback('unsupported'));

    pendingLocate = new Promise(function (resolve) {
      navigator.geolocation.getCurrentPosition(function (position) {
        var c = position.coords;
        if (c.accuracy > 5000) { resolve(useFallback('imprecise')); return; }
        var loc = { lat: c.latitude, lng: c.longitude, accuracy: c.accuracy, label: 'Tu ubicación', place: 'Ubicación GPS activa', fallback: false };
        setLocation(loc);
        reverseGeocode(loc).then(function (named) { setLocation(named); resolve(named); });
      }, function (error) {
        resolve(useFallback(error && error.code === 1 ? 'denied' : 'unavailable'));
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 });
    }).finally(function () { pendingLocate = null; });
    return pendingLocate;
  }

  function formatCoords(loc) {
    var lat = Math.abs(loc.lat).toFixed(4) + '° ' + (loc.lat < 0 ? 'S' : 'N');
    var lng = Math.abs(loc.lng).toFixed(4) + '° ' + (loc.lng < 0 ? 'O' : 'E');
    return 'Lat: ' + lat + ' • Long: ' + lng;
  }

  function updateLocationText(loc) {
    document.querySelectorAll('[data-vr-coords]').forEach(function (el) { el.textContent = formatCoords(loc); });
    document.querySelectorAll('[data-vr-place]').forEach(function (el) {
      el.textContent = loc.fallback ? 'Santiago Centro (ubicación por defecto)' : (loc.street ? loc.street + ', ' : '') + (loc.place || loc.label);
    });
  }

  /* Mapas */
  var TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';
  var POSITION_CLASS = /^(absolute|fixed|transform|-?translate-[xy]-\S+|-?(left|right|top|bottom)-\S+|inset-\S+|z-\d+|animate-bounce)$/;
  var maps = [];

  function offsetPoint(center, km, bearing) {
    var rad = bearing * Math.PI / 180;
    return [
      center.lat + (km / 111.32) * Math.cos(rad),
      center.lng + (km / (111.32 * Math.cos(center.lat * Math.PI / 180))) * Math.sin(rad)
    ];
  }

  function pinIcon(el) {
    var anchorBottom = el.getAttribute('data-vr-anchor') === 'bottom' || el.classList.contains('-translate-y-full');
    var clone = el.cloneNode(true);
    clone.className = Array.prototype.filter.call(el.classList, function (c) { return !POSITION_CLASS.test(c); }).join(' ');
    clone.removeAttribute('data-vr-pin');
    clone.removeAttribute('data-vr-anchor');
    var wrapper = document.createElement('div');
    wrapper.className = 'vr-pin' + (anchorBottom ? ' vr-pin--bottom' : '');
    wrapper.appendChild(clone);
    return L.divIcon({ className: 'vr-divicon', html: wrapper.outerHTML, iconSize: [0, 0] });
  }

  function generatedIcon(pin) {
    var html = '<div class="vr-pin"><div class="vr-gen-pin vr-gen-pin--' + (pin.tone || 'primary') + '">' +
      (pin.icon ? '<span class="material-symbols-outlined" aria-hidden="true">' + pin.icon + '</span>' : '') +
      (pin.text ? '<b>' + pin.text + '</b>' : '') + '</div></div>';
    return L.divIcon({ className: 'vr-divicon', html: html, iconSize: [0, 0] });
  }

  function initMap(host) {
    host.classList.add('vr-map-host');
    host.style.backgroundImage = 'none';
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';

    var interactive = host.getAttribute('data-vr-interactive') !== 'false';
    var theme = host.getAttribute('data-vr-theme') || 'light';
    var radius = Number(host.getAttribute('data-vr-radius') || 0);

    var pins = [];
    host.querySelectorAll('[data-vr-pin]').forEach(function (el) {
      var parts = el.getAttribute('data-vr-pin').split(',');
      pins.push({ km: Number(parts[0]), deg: Number(parts[1] || 0), icon: pinIcon(el) });
      el.remove();
    });
    if (host.hasAttribute('data-vr-pins')) {
      try {
        JSON.parse(host.getAttribute('data-vr-pins')).forEach(function (p) {
          pins.push({ km: p.km, deg: p.deg, icon: generatedIcon(p) });
        });
      } catch (e) { /* JSON de pines inválido */ }
    }
    Array.prototype.forEach.call(host.children, function (child) {
      if (child.tagName.toLowerCase() === 'svg') child.style.display = 'none';
    });
    host.querySelectorAll('[data-vr-decor]').forEach(function (el) { el.style.display = 'none'; });

    var canvas = document.createElement('div');
    canvas.className = 'vr-leaflet';
    canvas.setAttribute('role', 'region');
    canvas.setAttribute('aria-label', 'Mapa de la zona de cobertura');
    host.insertBefore(canvas, host.firstChild);

    var map = L.map(canvas, {
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      touchZoom: interactive,
      doubleClickZoom: interactive,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: interactive,
      tap: interactive
    });
    map.attributionControl.setPrefix(false);
    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    canvas.classList.toggle('vr-leaflet--dark', theme === 'dark');
    var accent = theme === 'dark' ? '#60a5fa' : '#006a61';

    var circle = L.circle([0, 0], { radius: radius || 1, color: accent, weight: 2, dashArray: '6 6', fillColor: accent, fillOpacity: radius ? 0.12 : 0, opacity: radius ? 0.9 : 0, interactive: false }).addTo(map);
    var draggable = interactive && host.hasAttribute('data-vr-draggable');
    var dot = draggable
      ? L.marker([0, 0], {
          icon: L.divIcon({ className: 'vr-divicon', iconSize: [0, 0], html: '<div class="vr-pin vr-pin--bottom"><div class="vr-home-pin"><span class="vr-home-pin__label">' + (host.getAttribute('data-vr-draggable') || 'Tu hogar') + '</span><span class="material-symbols-outlined" aria-hidden="true">home_pin</span></div></div>' }),
          draggable: true,
          autoPan: true,
          title: 'Arrastra el pin para ajustar tu ubicación',
          zIndexOffset: 1000
        }).addTo(map)
      : L.circleMarker([0, 0], { radius: 7, color: '#ffffff', weight: 3, fillColor: '#001428', fillOpacity: 1, interactive: false }).addTo(map);
    if (draggable) L.control.zoom({ position: 'topright' }).addTo(map);
    var markers = pins.map(function (p) { return { pin: p, marker: L.marker([0, 0], { icon: p.icon, keyboard: false, riseOnHover: true }).addTo(map) }; });
    var route = host.hasAttribute('data-vr-route') ? L.polyline([], { color: '#14b8a6', weight: 5, dashArray: '8 6', opacity: 0.9 }).addTo(map) : null;

    var state = { host: host, map: map, theme: theme, radius: radius };

    function fit() {
      if (state.radius) {
        map.fitBounds(dot.getLatLng().toBounds(state.radius * 2), { padding: [12, 12], animate: false });
      } else {
        var pts = markers.map(function (m) { return m.marker.getLatLng(); }).concat([dot.getLatLng()]);
        if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 16, animate: false });
        else map.setView(dot.getLatLng(), 15, { animate: false });
      }
    }

    state.place = function (loc) {
      var center = [loc.lat, loc.lng];
      dot.setLatLng(center);
      circle.setLatLng(center);
      markers.forEach(function (m) {
        m.marker.setLatLng(m.pin.km ? offsetPoint(loc, m.pin.km, m.pin.deg) : center);
      });
      if (route) {
        var origin = markers.filter(function (m) { return m.pin.km; })[0];
        if (origin) route.setLatLngs([origin.marker.getLatLng(), center]);
      }
      if (loc.manual) map.panTo(center);
      else fit();
    };

    if (draggable) {
      var moveHome = function (latlng) {
        var loc = { lat: latlng.lat, lng: latlng.lng, label: 'Ubicación ajustada', place: 'Ubicación ajustada manualmente', fallback: false, manual: true };
        setLocation(loc);
        host.dispatchEvent(new CustomEvent('vr:pinmoving', { detail: loc, bubbles: true }));
        reverseGeocode(loc).then(function (named) {
          if (currentLocation.lat !== loc.lat || currentLocation.lng !== loc.lng) return;
          setLocation(named);
          host.dispatchEvent(new CustomEvent('vr:pinmoved', { detail: named, bubbles: true }));
        });
      };
      dot.on('dragend', function () { moveHome(dot.getLatLng()); });
      map.on('click', function (e) { moveHome(e.latlng); });
      state.recenter = function () { map.setView(dot.getLatLng(), Math.max(map.getZoom(), 16)); };
    }

    state.setRadius = function (meters) {
      state.radius = meters;
      circle.setRadius(meters || 1);
      circle.setStyle({ fillOpacity: meters ? 0.12 : 0, opacity: meters ? 0.9 : 0 });
      fit();
    };

    state.toggleLayers = function () {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      canvas.classList.toggle('vr-leaflet--dark', state.theme === 'dark');
    };

    state.place(currentLocation);
    locationListeners.push(state.place);
    if ('ResizeObserver' in window) new ResizeObserver(function () { map.invalidateSize(); }).observe(host);
    setTimeout(function () { map.invalidateSize(); fit(); }, 300);
    maps.push(state);
  }

  function mapFor(el) {
    var target = el.getAttribute('data-vr-target');
    var host = target ? document.querySelector('[data-vr-map="' + target + '"]') : el.closest('[data-vr-map]');
    host = host || document.querySelector('[data-vr-map]');
    for (var i = 0; i < maps.length; i++) if (maps[i].host === host) return maps[i];
    return maps[0];
  }

  function wireMapControls() {
    document.addEventListener('click', function (event) {
      var ctl = event.target.closest('[data-vr-ctl]');
      if (ctl) {
        event.preventDefault();
        var action = ctl.getAttribute('data-vr-ctl');
        var state = mapFor(ctl);
        if (action === 'locate') {
          toast('Buscando tu ubicación GPS…');
          locate({ force: true }).then(function (loc) {
            toast(loc.fallback ? 'GPS no disponible: usamos Santiago Centro.' : 'Ubicación actualizada: ' + (loc.place || loc.label));
          });
        } else if (state && action === 'zoom-in') state.map.zoomIn();
        else if (state && action === 'zoom-out') state.map.zoomOut();
        else if (state && action === 'recenter' && state.recenter) {
          state.recenter();
          toast('Arrastra el pin o haz clic en el mapa para ubicar tu hogar.');
        }
        else if (state && action === 'layers') state.toggleLayers();
        return;
      }

      var radiusBtn = event.target.closest('[data-vr-set-radius]');
      if (radiusBtn) {
        var group = radiusBtn.parentElement.querySelectorAll('[data-vr-set-radius]');
        var activeClass = null;
        var idleClass = null;
        group.forEach(function (b) {
          if (!b.hasAttribute('data-vr-class')) b.setAttribute('data-vr-class', b.className);
          if (b.hasAttribute('data-vr-active')) activeClass = b.getAttribute('data-vr-class');
          else idleClass = idleClass || b.getAttribute('data-vr-class');
        });
        if (activeClass && idleClass) {
          group.forEach(function (b) {
            b.className = b === radiusBtn ? activeClass : idleClass;
            b.setAttribute('aria-pressed', String(b === radiusBtn));
          });
        }
        var target = mapFor(radiusBtn);
        if (target) target.setRadius(Number(radiusBtn.getAttribute('data-vr-set-radius')));
        return;
      }

      var share = event.target.closest('[data-vr-share]');
      if (share) {
        event.preventDefault();
        var url = 'https://www.google.com/maps?q=' + currentLocation.lat + ',' + currentLocation.lng;
        if (navigator.share) navigator.share({ title: 'Mi servicio VeciRed', text: 'Sigue la llegada de mi técnico VeciRed', url: url }).catch(function () {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Enlace de la ruta copiado al portapapeles.'); });
      }
    });

    document.querySelectorAll('[data-vr-radius-input]').forEach(function (input) {
      var apply = function () {
        var state = mapFor(input);
        if (state) state.setRadius(Number(input.value) * 1000);
      };
      input.addEventListener('input', apply);
      setTimeout(apply, 350);
    });
  }

  function initMaps() {
    var hosts = document.querySelectorAll('[data-vr-map]');
    if (!hosts.length) return;
    if (!window.L) { console.warn('[VeciRed] Leaflet no se cargó; los mapas no son interactivos.'); return; }
    hosts.forEach(initMap);
    wireMapControls();
    locate();
  }

  /* Chat de soporte: reemplaza los enlaces al Centro de Ayuda por una conversación con respuestas programadas */
  var support = (function () {
    var CHAT_KEY = 'support-chat';
    var AGENT = { nombre: 'Camila', cargo: 'Soporte VeciRed', inicial: 'C' };
    var SUPPORT_SELECTOR = 'a[href$="INT-00-cendeayu.html"], [data-vr-support]';

    var MAIN_CHIPS = ['Problemas para registrarme', 'Olvidé mi contraseña', 'Verificación y sellos', 'Pagos con VeciPay', 'Problema con un servicio'];

    var INTENTS = [
      {
        keys: ['humano', 'persona real', 'ejecutivo', 'agente', 'hablar con alguien', 'operador'],
        reply: ['Estás hablando conmigo, Camila, del equipo de soporte. Soy una persona de verdad, no te preocupes.', 'Si prefieres, también puedo dejar tu caso con prioridad para que un supervisor te llame. ¿Me cuentas brevemente qué pasó?'],
        chips: ['Problema con un servicio', 'Pagos con VeciPay']
      },
      {
        keys: ['contrasena', 'clave', 'password', 'olvide', 'no puedo entrar', 'iniciar sesion', 'login', 'acceder'],
        reply: ['Uy, eso pasa más de lo que crees, tranquilo/a.', 'En la pantalla de inicio de sesión toca "¿Olvidaste tu contraseña?" y te llegará un código a tu correo para crear una nueva.', 'Si el correo no te llega en unos minutos, revisa la carpeta de spam. ¿Te funcionó?'],
        chips: ['Sí, ya pude', 'No me llega el correo'],
        actions: [{ label: 'Ir a recuperar contraseña', href: 'INT-05.html' }]
      },
      {
        keys: ['no me llega', 'spam', 'no llego el correo', 'no recibo'],
        reply: ['Entiendo, qué lata. Revisa que el correo esté bien escrito, a veces se cuela un punto o una letra de más.', 'Si sigue sin llegar, escríbeme el correo con el que te registraste y lo reviso desde acá.']
      },
      {
        keys: ['registr', 'crear cuenta', 'cuenta nueva', 'inscrib', 'unirme'],
        reply: ['¡Bacán que te quieras sumar a VeciRed!', 'El registro tiene dos pasos: primero eliges si eres vecino o especialista, y luego completas tus datos y ubicación.', 'Si eres especialista te pediremos tu RUT y algo que respalde tu oficio (un certificado o recomendaciones de trabajos anteriores). ¿En qué parte te quedaste pegado/a?'],
        chips: ['Soy vecino', 'Soy especialista', 'Error con el RUT'],
        actions: [{ label: 'Empezar registro', href: 'INT-03.html' }]
      },
      {
        keys: ['rut'],
        reply: ['El RUT lo puedes escribir con o sin puntos, pero tiene que incluir el dígito verificador (por ejemplo 12.345.678-5).', 'Si te marca error, es probable que el dígito no coincida. Revísalo en tu cédula y vuelve a intentarlo.']
      },
      {
        keys: ['soy vecino', 'vecino', 'cliente'],
        reply: ['Perfecto. Como vecino solo necesitas tus datos básicos y tu ubicación para ver técnicos cerca.', 'Después puedes publicar una solicitud y los especialistas del barrio te mandan propuestas.']
      },
      {
        keys: ['soy especialista', 'especialista', 'tecnico', 'maestro', 'oficio'],
        reply: ['¡Buenísimo! Los especialistas pueden ser titulados/certificados o personas que aprendieron el oficio trabajando. Ambos son bienvenidos.', 'Con tu RUT y tus respaldos quedas registrado, y si quieres más confianza de los vecinos puedes pedir el Sello Verificado.']
      },
      {
        keys: ['sello', 'verific', 'certificad', 'antecedentes', 'cedula', 'documento'],
        reply: ['El Sello Verificado es opcional, pero ayuda mucho a que te elijan.', 'Te pedimos fotos de tu cédula por ambos lados, un comprobante de domicilio y el certificado de antecedentes (se saca gratis en el Registro Civil).', 'La revisión toma entre 24 y 48 horas hábiles. Te avisamos apenas esté listo.'],
        actions: [{ label: 'Ir a la verificación', href: 'INT-06.html' }]
      },
      {
        keys: ['pago', 'pagar', 'vecipay', 'cobro', 'reembolso', 'devolucion', 'tarjeta', 'transferencia', 'boleta'],
        reply: ['Con VeciPay el pago queda retenido hasta que confirmas que el trabajo quedó bien. Así nadie pierde.', 'Si te cobraron algo que no corresponde o necesitas un reembolso, cuéntame el día del servicio y el nombre del técnico, y lo reviso.'],
        chips: ['Me cobraron de más', 'Quiero un reembolso']
      },
      {
        keys: ['de mas', 'reembolso', 'cobraron'],
        reply: ['Lamento mucho eso. Dejé tu caso marcado para revisión.', 'Normalmente lo resolvemos en 3 a 5 días hábiles y el dinero vuelve al mismo medio de pago. ¿Hay algo más en lo que te pueda ayudar mientras tanto?']
      },
      {
        keys: ['no llego', 'no vino', 'atraso', 'tarde', 'problema', 'reclamo', 'queja', 'mal trabajo', 'mal hecho', 'denuncia'],
        reply: ['Uf, lamento que hayas tenido esa experiencia. Vamos a solucionarlo.', 'Si el técnico no llegó o el trabajo no quedó bien, no confirmes el servicio todavía: el pago sigue protegido.', 'Cuéntame qué pasó con un poco más de detalle y lo escalo con el equipo de mediación vecinal.'],
        chips: ['El técnico no llegó', 'El trabajo quedó mal']
      },
      {
        keys: ['cancelar', 'cancelacion', 'reagendar', 'cambiar la hora', 'cambiar fecha'],
        reply: ['Sin problema. Puedes cancelar o reagendar desde tu agenda hasta 2 horas antes de la visita sin costo.', 'Si falta menos tiempo, avísale al técnico por el chat de coordinación para que no salga en vano.'],
        actions: [{ label: 'Abrir mi agenda', href: 'INT-22.html' }]
      },
      {
        keys: ['seguridad', 'peligro', 'emergencia', 'robo', 'acoso', 'amenaza', 'miedo'],
        reply: ['Tu seguridad es lo primero. Si estás en peligro ahora mismo, llama al 133 (Carabineros).', 'Cuando estés a salvo, escríbeme qué pasó y bloquearemos la cuenta involucrada mientras investigamos.']
      },
      {
        keys: ['publicar', 'solicitud', 'buscar tecnico', 'necesito un', 'gasfiter', 'electric', 'cerrajer', 'pintor'],
        reply: ['¡Te ayudo! Lo más rápido es publicar una solicitud contando qué necesitas, y los especialistas cercanos te envían propuestas.', 'También puedes buscar directamente en el mapa y ver reseñas de cada uno.'],
        actions: [{ label: 'Publicar solicitud', href: 'INT-14.html' }, { label: 'Ver mapa de técnicos', href: 'INT-12.html' }]
      },
      {
        keys: ['si ya pude', 'ya pude', 'funciono', 'listo', 'solucionado', 'resuelto'],
        reply: ['¡Qué bueno! Me alegra mucho.', '¿Hay algo más en lo que te pueda ayudar?']
      },
      {
        keys: ['gracias', 'muchas gracias', 'te pasaste', 'genial', 'bacan', 'excelente'],
        reply: ['¡De nada! Para eso estamos.', 'Si te surge cualquier otra duda, aquí voy a estar.']
      },
      {
        keys: ['chao', 'adios', 'hasta luego', 'nos vemos', 'eso es todo', 'nada mas'],
        reply: ['¡Que estés muy bien! Gracias por ser parte de VeciRed.']
      },
      {
        keys: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'alo', 'hey'],
        reply: ['¡Hola! ¿En qué te puedo ayudar hoy?'],
        chips: MAIN_CHIPS
      }
    ];

    var FALLBACKS = [
      ['Mmm, no estoy segura de haberte entendido bien.', '¿Me lo podrías contar con otras palabras? O elige uno de estos temas:'],
      ['Perdona, se me escapó eso. ¿Tiene que ver con alguno de estos temas?'],
      ['Quiero ayudarte bien, así que déjame anotarlo para revisarlo con el equipo.', 'Mientras tanto, ¿es sobre alguno de estos temas?']
    ];

    var host, log, input, sendBtn, chipsHost, lastTrigger, fallbackCount = 0, busy = false, pending = [];
    var state = store.get(CHAT_KEY) || { messages: [], open: false };

    function save() { store.set(CHAT_KEY, state); }

    function normalize(text) {
      return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function firstName() {
      var user = users.current && users.current();
      return user && user.nombre ? user.nombre.split(' ')[0] : '';
    }

    function timeLabel(ts) {
      return new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    }

    function findIntent(text) {
      var clean = ' ' + normalize(text) + ' ';
      var best = null, bestLen = 0;
      INTENTS.forEach(function (intent) {
        intent.keys.forEach(function (key) {
          if (clean.indexOf(key) !== -1 && key.length > bestLen) { best = intent; bestLen = key.length; }
        });
      });
      return best;
    }

    function renderMessage(msg, animate) {
      var row = document.createElement('div');
      row.className = 'vr-chat__row vr-chat__row--' + msg.from + (animate ? ' vr-chat__row--in' : '');
      if (msg.from === 'agent') {
        var avatar = document.createElement('span');
        avatar.className = 'vr-chat__avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = AGENT.inicial;
        row.appendChild(avatar);
      }
      var bubble = document.createElement('div');
      bubble.className = 'vr-chat__bubble';
      var text = document.createElement('p');
      text.textContent = msg.text;
      bubble.appendChild(text);
      if (msg.actions && msg.actions.length) {
        var actions = document.createElement('div');
        actions.className = 'vr-chat__actions';
        msg.actions.forEach(function (action) {
          var link = document.createElement('a');
          link.className = 'vr-chat__action';
          link.href = action.href;
          link.textContent = action.label;
          actions.appendChild(link);
        });
        bubble.appendChild(actions);
      }
      var meta = document.createElement('span');
      meta.className = 'vr-chat__meta';
      meta.textContent = timeLabel(msg.ts) + (msg.from === 'user' ? ' · Leído' : '');
      bubble.appendChild(meta);
      row.appendChild(bubble);
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
    }

    function setChips(chips) {
      chipsHost.innerHTML = '';
      (chips || []).forEach(function (label) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'vr-chat__chip';
        chip.textContent = label;
        chip.addEventListener('click', function () { send(label); });
        chipsHost.appendChild(chip);
      });
      chipsHost.hidden = !chips || !chips.length;
    }

    function push(msg) {
      msg.ts = msg.ts || Date.now();
      state.messages.push(msg);
      save();
      renderMessage(msg, true);
    }

    function showTyping() {
      var row = document.createElement('div');
      row.className = 'vr-chat__row vr-chat__row--agent vr-chat__row--typing';
      row.innerHTML = '<span class="vr-chat__avatar" aria-hidden="true">' + AGENT.inicial + '</span><div class="vr-chat__bubble vr-chat__typing" aria-label="' + AGENT.nombre + ' está escribiendo"><span></span><span></span><span></span></div>';
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      host.querySelector('.vr-chat__status').textContent = 'Escribiendo…';
      return row;
    }

    function agentSays(lines, chips, actions) {
      busy = true;
      setChips(null);
      var i = 0;
      (function next() {
        if (i >= lines.length) {
          busy = false;
          host.querySelector('.vr-chat__status').textContent = 'En línea';
          if (pending.length) { respond(pending.join(' ')); pending = []; return; }
          setChips(chips);
          return;
        }
        var line = lines[i];
        var pause = i === 0 ? 500 : 350;
        var typingTime = Math.min(2600, 700 + line.length * 22);
        setTimeout(function () {
          var typing = showTyping();
          setTimeout(function () {
            typing.remove();
            var isLast = i === lines.length - 1;
            push({ from: 'agent', text: line, actions: isLast ? actions : null });
            i++;
            next();
          }, typingTime);
        }, pause);
      })();
    }

    function respond(text) {
      var intent = findIntent(text);
      if (intent) {
        fallbackCount = 0;
        agentSays(intent.reply, intent.chips, intent.actions);
        return;
      }
      var lines = FALLBACKS[Math.min(fallbackCount, FALLBACKS.length - 1)];
      fallbackCount++;
      agentSays(lines, MAIN_CHIPS);
    }

    function send(text) {
      text = (text || '').trim();
      if (!text) return;
      push({ from: 'user', text: text });
      input.value = '';
      sendBtn.disabled = true;
      if (busy) { pending.push(text); return; }
      respond(text);
    }

    function greet() {
      var name = firstName();
      var lines = [
        (name ? '¡Hola, ' + name + '! ' : '¡Hola! ') + 'Soy ' + AGENT.nombre + ', del equipo de soporte de VeciRed.',
        'Cuéntame con tus palabras qué necesitas, o elige uno de estos temas para empezar.'
      ];
      agentSays(lines, MAIN_CHIPS);
    }

    function build() {
      host = document.createElement('section');
      host.className = 'vr-chat';
      host.id = 'vr-support-chat';
      host.hidden = true;
      host.setAttribute('role', 'dialog');
      host.setAttribute('aria-modal', 'false');
      host.setAttribute('aria-labelledby', 'vr-chat-title');
      host.innerHTML =
        '<header class="vr-chat__header">' +
          '<span class="vr-chat__avatar vr-chat__avatar--lg" aria-hidden="true">' + AGENT.inicial + '<i class="vr-chat__online"></i></span>' +
          '<div class="vr-chat__who"><h2 id="vr-chat-title">' + AGENT.nombre + ' · ' + AGENT.cargo + '</h2><span class="vr-chat__status">En línea</span></div>' +
          '<button type="button" class="vr-chat__icon-btn" data-chat-restart aria-label="Reiniciar conversación" title="Nueva conversación"><span class="material-symbols-outlined" aria-hidden="true">refresh</span></button>' +
          '<button type="button" class="vr-chat__icon-btn" data-chat-close aria-label="Cerrar chat de soporte"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>' +
        '</header>' +
        '<div class="vr-chat__log" role="log" aria-live="polite" aria-label="Conversación con soporte"><p class="vr-chat__day">Hoy · Respondemos en minutos</p></div>' +
        '<div class="vr-chat__chips" hidden></div>' +
        '<form class="vr-chat__form" autocomplete="off">' +
          '<label class="sr-only" for="vr-chat-input">Escribe tu mensaje</label>' +
          '<input id="vr-chat-input" class="vr-chat__input" type="text" placeholder="Escribe tu mensaje…" maxlength="400"/>' +
          '<button type="submit" class="vr-chat__send" aria-label="Enviar mensaje" disabled><span class="material-symbols-outlined" aria-hidden="true">send</span></button>' +
        '</form>';
      document.body.appendChild(host);

      log = host.querySelector('.vr-chat__log');
      input = host.querySelector('.vr-chat__input');
      sendBtn = host.querySelector('.vr-chat__send');
      chipsHost = host.querySelector('.vr-chat__chips');

      var form = host.querySelector('.vr-chat__form');
      // Este formulario no debe pasar por el manejador global de envíos del prototipo.
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopPropagation();
        send(input.value);
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && (event.isComposing || event.keyCode === 229)) event.preventDefault();
      });
      input.addEventListener('input', function () { sendBtn.disabled = !input.value.trim(); });
      host.querySelector('[data-chat-close]').addEventListener('click', close);
      host.querySelector('[data-chat-restart]').addEventListener('click', function () {
        if (busy) return;
        state.messages = [];
        save();
        log.querySelectorAll('.vr-chat__row').forEach(function (row) { row.remove(); });
        fallbackCount = 0;
        greet();
      });
      host.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });

      state.messages.forEach(function (msg) { renderMessage(msg, false); });
      if (state.messages.length) setChips(MAIN_CHIPS.slice(0, 3));
    }

    function open(trigger) {
      if (!host) build();
      lastTrigger = trigger || document.activeElement;
      host.hidden = false;
      requestAnimationFrame(function () { host.classList.add('vr-chat--open'); });
      state.open = true;
      save();
      if (!state.messages.length && !busy) greet();
      log.scrollTop = log.scrollHeight;
      input.focus();
    }

    function close() {
      if (!host) return;
      host.classList.remove('vr-chat--open');
      host.hidden = true;
      state.open = false;
      save();
      if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
    }

    function wire() {
      if (PAGE === 'index') return;
      document.addEventListener('click', function (event) {
        var trigger = event.target.closest(SUPPORT_SELECTOR);
        if (!trigger || trigger.closest('.vr-screen-nav')) return;
        event.preventDefault();
        event.stopPropagation();
        open(trigger);
      }, true);
      document.querySelectorAll(SUPPORT_SELECTOR).forEach(function (el) {
        if (el.closest('.vr-screen-nav')) return;
        el.setAttribute('aria-haspopup', 'dialog');
        el.setAttribute('aria-controls', 'vr-support-chat');
      });
      if (state.open) open();
    }

    return { open: open, close: close, wire: wire };
  })();

  /* API pública usada por los scripts de cada pantalla */
  window.VeciRed = {
    support: support,
    users: users,
    locate: locate,
    toast: toast,
    store: store,
    getLocation: function () { return currentLocation; },
    SANTIAGO_CENTRO: SANTIAGO_CENTRO
  };

  function wireScrollbar() {
    var root = document.documentElement;
    var EDGE_PX = 28;
    var hideTimer = null;
    var nearEdge = false;

    function show() {
      clearTimeout(hideTimer);
      root.classList.add('vr-scroll-show');
    }
    function hideSoon() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!nearEdge) root.classList.remove('vr-scroll-show');
      }, 900);
    }

    document.addEventListener('mousemove', function (e) {
      var wasNear = nearEdge;
      nearEdge = e.clientX >= root.clientWidth - EDGE_PX;
      if (nearEdge) show();
      else if (wasNear) hideSoon();
    }, { passive: true });
    document.addEventListener('mouseleave', function () { nearEdge = false; hideSoon(); });
    window.addEventListener('scroll', function () { show(); hideSoon(); }, { passive: true });
  }

  function boot() {
    wireScrollbar();
    wireLogo();
    wireRoles();
    persistFields();
    initMaps();
    updateLocationText(currentLocation);
    buildScreenNav();
    support.wire();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
