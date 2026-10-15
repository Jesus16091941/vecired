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
    if (submitter && (submitter.hasAttribute('data-go') || submitter.hasAttribute('data-go-role') || submitter.hasAttribute('data-toast'))) {
      go(submitter);
    }
  }, true);

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
    var dot = L.circleMarker([0, 0], { radius: 7, color: '#ffffff', weight: 3, fillColor: '#001428', fillOpacity: 1, interactive: false }).addTo(map);
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
      fit();
    };

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

  /* API pública usada por los scripts de cada pantalla */
  window.VeciRed = {
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
