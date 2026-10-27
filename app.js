// =================================================================
// MARKETPLACE SAN LUIS - LÓGICA PRINCIPAL CON SUPABASE REALTIME & MAPA INTERACTIVO
// =================================================================

// Credenciales fijas opcionales (puedes pegarlas aquí o ingresarlas desde la web)
const HARDCODED_SUPABASE_URL = 'https://odqdprxxxmpyintbnvof.supabase.co';
const HARDCODED_SUPABASE_KEY = 'sb_publishable_NN5aOr6MG_5H2pRnEV1CSQ_1X_u5BMz';

// Coordenadas base de localidades de la Provincia de San Luis
const CITY_COORDINATES = {
  'San Luis Capital': { lat: -33.2995, lng: -66.3356 },
  'Villa Mercedes': { lat: -33.6757, lng: -65.4578 },
  'Merlo': { lat: -32.3411, lng: -65.0138 },
  'Juana Koslay': { lat: -33.2731, lng: -66.2415 },
  'La Punta': { lat: -33.1834, lng: -66.3135 },
  'Potrero de los Funes': { lat: -33.2241, lng: -66.2307 },
  'El Trapiche': { lat: -33.1091, lng: -66.0645 },
  'Carpintería': { lat: -32.4089, lng: -65.0086 },
  'Concarán': { lat: -32.5599, lng: -65.2447 },
  'Santa Rosa del Conlara': { lat: -32.3432, lng: -65.2057 },
  'Quines': { lat: -32.2343, lng: -65.8064 }
};

// Metadatos y diferenciación visual por Rubro (colores, iconos y estilos)
function getCategoryMeta(category) {
  const norm = (category || '').toLowerCase();
  if (norm.includes('cafe') || norm.includes('gastro') || norm.includes('restaurante') || norm.includes('bar') || norm.includes('comida')) {
    return {
      name: 'Cafeterías y Gastronomía',
      icon: 'fa-mug-hot',
      color: '#d97706', // Ámbar cálido
      bgColor: 'bg-amber-600',
      badgeClass: 'bg-amber-600 text-white',
      borderClass: 'border-amber-500',
      textColor: 'text-amber-500'
    };
  }
  if (norm.includes('moda') || norm.includes('ropa') || norm.includes('indumentaria') || norm.includes('calzado') || norm.includes('boutique')) {
    return {
      name: 'Indumentaria y Moda',
      icon: 'fa-tshirt',
      color: '#db2777', // Rosa magenta
      bgColor: 'bg-pink-600',
      badgeClass: 'bg-pink-600 text-white',
      borderClass: 'border-pink-500',
      textColor: 'text-pink-500'
    };
  }
  if (norm.includes('tecno') || norm.includes('celular') || norm.includes('comput') || norm.includes('apple') || norm.includes('samsung') || norm.includes('notebook')) {
    return {
      name: 'Tecnología',
      icon: 'fa-laptop',
      color: '#0284c7', // Azul cian
      bgColor: 'bg-sky-600',
      badgeClass: 'bg-sky-600 text-white',
      borderClass: 'border-sky-500',
      textColor: 'text-sky-500'
    };
  }
  if (norm.includes('vehic') || norm.includes('moto') || norm.includes('auto') || norm.includes('bici') || norm.includes('rodado')) {
    return {
      name: 'Vehículos y Rodados',
      icon: 'fa-car',
      color: '#ea580c', // Naranja
      bgColor: 'bg-orange-600',
      badgeClass: 'bg-orange-600 text-white',
      borderClass: 'border-orange-500',
      textColor: 'text-orange-500'
    };
  }
  if (norm.includes('hogar') || norm.includes('mueble') || norm.includes('deco') || norm.includes('sillon')) {
    return {
      name: 'Hogar y Muebles',
      icon: 'fa-couch',
      color: '#b45309', // Madera / ámbar oscuro
      bgColor: 'bg-amber-700',
      badgeClass: 'bg-amber-700 text-white',
      borderClass: 'border-amber-600',
      textColor: 'text-amber-600'
    };
  }
  if (norm.includes('inmueble') || norm.includes('alquiler') || norm.includes('cabaña') || norm.includes('casa') || norm.includes('depto')) {
    return {
      name: 'Inmuebles y Alquileres',
      icon: 'fa-home',
      color: '#4f46e5', // Índigo
      bgColor: 'bg-indigo-600',
      badgeClass: 'bg-indigo-600 text-white',
      borderClass: 'border-indigo-500',
      textColor: 'text-indigo-500'
    };
  }
  if (norm.includes('servicio') || norm.includes('profesional') || norm.includes('oficio') || norm.includes('electri')) {
    return {
      name: 'Servicios',
      icon: 'fa-tools',
      color: '#059669', // Esmeralda
      bgColor: 'bg-emerald-600',
      badgeClass: 'bg-emerald-600 text-white',
      borderClass: 'border-emerald-500',
      textColor: 'text-emerald-500'
    };
  }
  return {
    name: category || 'Comercio General',
    icon: 'fa-store',
    color: '#C5A059', // VM Hub Gold
    bgColor: 'bg-[#C5A059]',
    badgeClass: 'bg-gold-600 text-navy-950',
    borderClass: 'border-gold-500',
    textColor: 'text-gold-500'
  };
}

// Resolver coordenadas de un comercio/publicación (exactas o dispersión suave si solo tiene ciudad)
function resolveCoordinates(item) {
  const hasExactLat = item.lat !== null && item.lat !== undefined && !isNaN(Number(item.lat));
  const hasExactLng = item.lng !== null && item.lng !== undefined && !isNaN(Number(item.lng));

  if (hasExactLat && hasExactLng) {
    return { lat: Number(item.lat), lng: Number(item.lng), isExact: true };
  }

  const base = CITY_COORDINATES[item.city] || CITY_COORDINATES['San Luis Capital'];
  // Dispersión determinista basada en el ID para evitar superposición perfecta
  let seed = 0;
  const strId = String(item.id || 'seed');
  for (let i = 0; i < strId.length; i++) {
    seed = (seed * 31 + strId.charCodeAt(i)) & 0xffffffff;
  }
  const jitterLat = (((seed % 1000) / 1000) - 0.5) * 0.015;
  const jitterLng = ((((seed >> 4) % 1000) / 1000) - 0.5) * 0.018;

  return {
    lat: base.lat + jitterLat,
    lng: base.lng + jitterLng,
    isExact: false
  };
}

// Productos de respaldo en caso de no haber conexión con Supabase todavía
const DEFAULT_PRODUCTS = [
  {
    "id": "prod-1",
    "title": "Bicicleta Mountain Bike Venzo Rodado 29",
    "price": 380000,
    "category": "Vehículos y Rodados",
    "city": "San Luis Capital",
    "address": "Av. Illia 340, Centro",
    "lat": -33.2995,
    "lng": -66.3375,
    "description": "Excelente estado, frenos a disco hidráulicos Shimano, cubiertas con poco uso. Service recién hecho. Se entrega con inflador y soporte de caramañola.",
    "seller": "Federico M.",
    "phone": "5492664123456",
    "image": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-18T14:30:00Z",
    "featured": true,
    "estado": "aprobado"
  },
  {
    "id": "prod-2",
    "title": "Cabaña Alquiler Temporario con Pileta",
    "price": 65000,
    "category": "Inmuebles y Alquileres",
    "city": "Potrero de los Funes",
    "address": "Circuito del Lago Km 3",
    "lat": -33.2215,
    "lng": -66.2340,
    "description": "Cabaña totalmente equipada para 4 a 6 personas. Asador individual, cochera cubierta, parque amplio y vista a las sierras. Ideal fines de semana o vacaciones.",
    "seller": "Cabañas Sierras Puntanas",
    "phone": "5492664789012",
    "image": "https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-17T11:00:00Z",
    "featured": true,
    "estado": "aprobado"
  },
  {
    "id": "prod-3",
    "title": "Samsung Galaxy A54 5G 128GB Blanco",
    "price": 420000,
    "category": "Tecnología",
    "city": "Villa Mercedes",
    "address": "Av. Mitre 520, VM",
    "lat": -33.6765,
    "lng": -65.4580,
    "description": "6 meses de uso, libre de fábrica para cualquier empresa. Batería en óptimo estado (100%), vidrio templado colocado desde el primer día. Caja original y cable.",
    "seller": "Tecno Mercedes",
    "phone": "5492657891234",
    "image": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-19T09:15:00Z",
    "featured": false,
    "estado": "aprobado"
  },
  {
    "id": "prod-4",
    "title": "Mesa de Algarrobo Macizo + 6 Sillas",
    "price": 290000,
    "category": "Hogar y Muebles",
    "city": "Juana Koslay",
    "address": "Av. del Viento Chorrillero 1420",
    "lat": -33.2740,
    "lng": -66.2430,
    "description": "Mesa de 1.80m x 0.90m lustrada, madera pesada y resistente. Incluye 6 sillas haciendo juego. Impecable estado de conservación.",
    "seller": "Muebles Koslay",
    "phone": "5492664556677",
    "image": "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-15T18:00:00Z",
    "featured": false,
    "estado": "aprobado"
  },
  {
    "id": "prod-5",
    "title": "Moto Honda Wave 110cc - Año 2023",
    "price": 1450000,
    "category": "Vehículos y Rodados",
    "city": "Merlo",
    "address": "Av. del Sol 680, Villa de Merlo",
    "lat": -32.3420,
    "lng": -65.0125,
    "description": "8.500 km reales. Todos los service oficiales al día. Papeles al día y lista para transferir en el acto. Muy bajo consumo, excelente andar.",
    "seller": "Motos del Valle",
    "phone": "5492656411223",
    "image": "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-18T19:40:00Z",
    "featured": true,
    "estado": "aprobado"
  },
  {
    "id": "prod-6",
    "title": "Notebook Lenovo ThinkPad T480 i5 16GB SSD 512GB",
    "price": 550000,
    "category": "Tecnología",
    "city": "San Luis Capital",
    "address": "Junín 850, Microcentro",
    "lat": -33.3015,
    "lng": -66.3350,
    "description": "Ideal para trabajo, programación o estudio. Teclado retroiluminado, doble batería con gran autonomía. Windows 11 Pro original instalado.",
    "seller": "Byte Informática",
    "phone": "5492664998877",
    "image": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-16T16:20:00Z",
    "featured": false,
    "estado": "aprobado"
  },
  {
    "id": "prod-7",
    "title": "Sillón Esquinero Chenille Gris 3 Cuerpos",
    "price": 380000,
    "category": "Hogar y Muebles",
    "city": "La Punta",
    "address": "Av. Serrana y Bv. Las Cañadas",
    "lat": -33.1840,
    "lng": -66.3145,
    "description": "Almohadones de alta densidad (28kg), tela antimancha lavable. Mide 2.10m x 1.60m. Se retira por La Punta o coordinamos flete.",
    "seller": "Patricia B.",
    "phone": "5492664332211",
    "image": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-17T20:10:00Z",
    "featured": false,
    "estado": "aprobado"
  },
  {
    "id": "prod-8",
    "title": "Servicio de Electricidad e Instalaciones Domiciliarias",
    "price": 15000,
    "category": "Servicios",
    "city": "San Luis Capital",
    "address": "Rivadavia 720, San Luis",
    "lat": -33.3005,
    "lng": -66.3385,
    "description": "Electricista matriculado. Instalaciones de tableros, cableados, térmicas, disyuntores, colocación de luminarias y detección de fugas eléctricas. Presupuestos sin cargo en San Luis y Juana Koslay.",
    "seller": "Roberto Instalaciones",
    "phone": "5492664667788",
    "image": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-19T08:00:00Z",
    "featured": true,
    "estado": "aprobado"
  },
  {
    "id": "prod-9",
    "title": "Café de Especialidad & Brunch Puntano",
    "price": 4500,
    "category": "Gastronomía y Cafeterías",
    "city": "Villa Mercedes",
    "address": "Calle Pedernera 430, Centro",
    "lat": -33.6735,
    "lng": -65.4610,
    "description": "Cafetería de especialidad con granos de origen seleccionados, pastelería artesanal horneada en el día, tostados en pan de masa madre y opciones veggies. Espacio coworking con wifi de alta velocidad.",
    "seller": "Origen Café & Tostaduría",
    "phone": "5492657451234",
    "image": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-20T10:00:00Z",
    "featured": true,
    "estado": "aprobado"
  },
  {
    "id": "prod-10",
    "title": "Boutique Urbana & Ropa de Diseño",
    "price": 28000,
    "category": "Moda y Ropa",
    "city": "San Luis Capital",
    "address": "Peatonal Rivadavia 650, Centro",
    "lat": -33.2982,
    "lng": -66.3360,
    "description": "Prendas exclusivas, remeras oversize, jeans elastizados, camisas y vestidos de temporada. Calidad premium y asesoramiento personalizado. Pagos en cuotas sin interés y envíos a toda la provincia.",
    "seller": "Aura Indumentaria",
    "phone": "5492664321987",
    "image": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    "date": "2026-10-20T11:30:00Z",
    "featured": true,
    "estado": "aprobado"
  }
];

// Estado global de la aplicación
const AppState = {
  allProducts: [],
  filteredProducts: [],
  selectedCategory: 'all',
  selectedCity: 'all',
  searchQuery: '',
  sortBy: 'newest',
  favorites: JSON.parse(localStorage.getItem('sl_favorites') || '[]'),
  onlyFavorites: false,
  isSupabaseConnected: false,
  viewMode: localStorage.getItem('sl_view_mode') || 'split', // 'split' | 'map' | 'grid'
  activeMapMarkerId: null
};

// =================================================================
// GOOGLE MAPS PLATFORM CONFIG & INSTANCIAS (Demo Key / Prototipo)
// =================================================================
// Source: Google Maps Platform Code Assist
const HARDCODED_GOOGLE_MAPS_KEY = '';

function getGoogleMapsKey() {
  const stored = localStorage.getItem('GOOGLE_MAPS_API_KEY');
  if (stored && stored.trim().length > 5) return stored.trim();
  return HARDCODED_GOOGLE_MAPS_KEY || '';
}

function setGoogleMapsKey(key) {
  if (key && key.trim().length > 0) {
    localStorage.setItem('GOOGLE_MAPS_API_KEY', key.trim());
  } else {
    localStorage.removeItem('GOOGLE_MAPS_API_KEY');
  }
}

let googleMapsPromise = null;
function ensureGoogleMapsLoaded() {
  if (window.google && window.google.maps && window.google.maps.importLibrary) {
    return Promise.resolve();
  }
  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = getGoogleMapsKey();
  if (!apiKey) {
    return Promise.reject(new Error('NO_API_KEY'));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    try {
      (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
        key: apiKey,
        v: "weekly"
      });

      const start = Date.now();
      const interval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.importLibrary) {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - start > 10000) {
          clearInterval(interval);
          reject(new Error('Tiempo de espera agotado al cargar Google Maps Platform'));
        }
      }, 50);
    } catch (err) {
      reject(err);
    }
  });

  return googleMapsPromise;
}

// Instancias de mapas y componentes de Google Maps
let mainMap = null;
let currentInfoWindow = null;
let markerInstances = {};
let userLocationMarker = null;

let publishMiniMap = null;
let publishMiniMarker = null;
let publishPlaceAutocomplete = null;

// Cliente de Supabase y canal Realtime
let supabaseClient = null;
let realtimeChannel = null;

// =================================================================
// INICIALIZACIÓN DE SUPABASE
// =================================================================

function sanitizeSupabaseUrl(rawUrl) {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Quitar /rest/v1 o /rest/v1/ si fue pegado accidentalmente
  url = url.replace(/\/rest\/v1\/?$/i, '');
  // Quitar barra final si la tiene
  url = url.replace(/\/+$/, '');
  return url;
}

function getSupabaseCredentials() {
  const storedUrl = localStorage.getItem('sl_supabase_url');
  const storedKey = localStorage.getItem('sl_supabase_anon_key');

  const rawUrl = (storedUrl && storedUrl.trim().length > 5) ? storedUrl : HARDCODED_SUPABASE_URL;
  const url = sanitizeSupabaseUrl(rawUrl);

  const key = (storedKey && storedKey.trim().length > 10) ? storedKey.trim() : HARDCODED_SUPABASE_KEY;
  return { url, key };
}

function initSupabase() {
  const { url, key } = getSupabaseCredentials();

  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      AppState.isSupabaseConnected = true;
      setupRealtimeSubscription();
      return true;
    } catch (err) {
      console.error('Error al inicializar cliente Supabase:', err);
      supabaseClient = null;
      AppState.isSupabaseConnected = false;
      return false;
    }
  }

  supabaseClient = null;
  AppState.isSupabaseConnected = false;
  return false;
}

// Suscripción a cambios en tiempo real en la tabla 'products'
function setupRealtimeSubscription() {
  if (!supabaseClient) return;

  try {
    if (realtimeChannel) {
      supabaseClient.removeChannel(realtimeChannel);
    }

    realtimeChannel = supabaseClient
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('⚡ Cambio detectado en tiempo real desde Supabase:', payload);
          loadProducts(false, AppState.searchQuery || ''); // recarga en tiempo real preservando búsqueda
          if (payload.eventType === 'INSERT') {
            showToast('🔔 ¡Nuevo aviso publicado en San Luis en tiempo real!', 'info');
          }
        }
      )
      .subscribe((status) => {
        console.log('Estado de conexión Realtime Supabase:', status);
      });
  } catch (err) {
    console.warn('No se pudo activar la suscripción Realtime:', err);
  }
}

// Actualizar el estado visual de la UI respecto a Supabase (Identidad VM Hub)
function updateSupabaseUIState(isConnected) {
  const statusBtn = document.getElementById('supabase-status-btn');
  const statusDot = document.getElementById('supabase-status-dot');
  const statusText = document.getElementById('supabase-status-text');
  const banner = document.getElementById('supabase-banner');
  const pendingBanner = document.getElementById('supabase-pending-banner');
  const sourceLabel = document.getElementById('data-source-label');
  const footerIndicator = document.getElementById('footer-status-indicator');

  if (isConnected) {
    if (statusBtn) {
      statusBtn.className = 'p-2 sm:px-3 sm:py-2 rounded-xl border border-emerald-500/40 bg-[#0F1A34] hover:bg-[#142247] text-emerald-300 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm';
    }
    if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    if (statusText) statusText.textContent = 'Supabase Conectado';
    if (banner) banner.classList.remove('hidden');
    if (pendingBanner) pendingBanner.classList.add('hidden');
    if (sourceLabel) sourceLabel.textContent = 'Supabase Cloud (En Tiempo Real)';
    if (footerIndicator) {
      footerIndicator.className = 'inline-flex items-center gap-1.5 text-emerald-400 font-semibold cursor-pointer';
      footerIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Supabase Conectado (En Vivo)';
    }
  } else {
    if (statusBtn) {
      statusBtn.className = 'p-2 sm:px-3 sm:py-2 rounded-xl border border-gold-500/30 bg-[#0F1A34] hover:bg-[#142247] text-gold-200 transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm';
    }
    if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-gold-400';
    if (statusText) statusText.textContent = 'Conectar Supabase';
    if (banner) banner.classList.add('hidden');
    if (pendingBanner) pendingBanner.classList.remove('hidden');
    if (sourceLabel) sourceLabel.textContent = 'Catálogo Local (Conecta Supabase)';
    if (footerIndicator) {
      footerIndicator.className = 'inline-flex items-center gap-1.5 text-gold-400 font-semibold cursor-pointer';
      footerIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-gold-400"></span> Modo local (Haz clic para conectar Supabase)';
    }
  }
}

// =================================================================
// CARGA DE PRODUCTOS (SUPABASE CON FILTRO ILIKE EN TIEMPO REAL)
// =================================================================

let searchDebounceTimer = null;

// Estado del sistema de moderación:
// La columna 'estado' guarda 'pendiente' | 'aprobado' en Supabase.
// El flag es adaptativo: si la columna no existe aún, no se filtra y se muestra todo.
let hasEstadoColumn = true;

async function loadProducts(showLoader = true, searchTerm = AppState.searchQuery || '') {
  const isConfigured = initSupabase();

  if (isConfigured && supabaseClient) {
    try {
      if (showLoader) {
        const countBadge = document.getElementById('results-count');
        if (countBadge) countBadge.textContent = 'Buscando en Supabase...';
      }

      let query = supabaseClient.from('products').select('*');

      // 1. Cargar todos los avisos y negocios activos de Supabase
      if (hasEstadoColumn) {
        query = query.neq('estado', 'rechazado');
      }

      // 2. Filtro ilike en tiempo real (nombre, descripción y categoría)
      if (searchTerm && searchTerm.trim() !== '') {
        const cleanTerm = searchTerm.trim();
        query = query.or(`title.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%,category.ilike.%${cleanTerm}%`);
      }

      // 3. Orden: más recientes primero (por id)
      query = query.order('id', { ascending: false });

      let { data, error } = await query;

      // Si falló porque la columna 'estado' aún no existe en Supabase,
      // activar modo sin filtro de moderación
      if (error && error.message && (
        error.message.toLowerCase().includes('estado') ||
        error.message.toLowerCase().includes('column') ||
        error.code === 'PGRST204' || error.code === '42703'
      )) {
        console.warn("Columna 'estado' no detectada en Supabase. Mostrando todos los productos sin filtro de moderación.");
        hasEstadoColumn = false;
        return loadProducts(showLoader, searchTerm);
      }

      // Si falló el ordenamiento por id, reintentar sin order
      if (error && error.message && error.message.toLowerCase().includes('order')) {
        let retryQuery = supabaseClient.from('products').select('*');
        if (hasEstadoColumn) retryQuery = retryQuery.eq('estado', 'aprobado');
        if (searchTerm && searchTerm.trim() !== '') {
          const cleanTerm = searchTerm.trim();
          retryQuery = retryQuery.or(`title.ilike.%${cleanTerm}%,description.ilike.%${cleanTerm}%,category.ilike.%${cleanTerm}%`);
        }
        const retry = await retryQuery;
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        throw error;
      }

      // Normalizar y mapear registros recibidos de Supabase (con coordenadas y dirección)
      AppState.allProducts = (data || []).map(item => ({
        id: String(item.id || 'supa-' + Math.random()),
        title: item.title || 'Sin título',
        price: Number(item.price) || 0,
        category: item.category || 'Otros',
        city: item.city || item.location || 'San Luis Capital',
        address: item.address || '',
        lat: (item.lat !== null && item.lat !== undefined && !isNaN(Number(item.lat))) ? Number(item.lat) : null,
        lng: (item.lng !== null && item.lng !== undefined && !isNaN(Number(item.lng))) ? Number(item.lng) : null,
        description: item.description || '',
        seller: item.seller || 'Vendedor local',
        phone: item.phone || item.whatsapp || '5492664000000',
        image: item.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
        date: item.created_at || item.date || new Date().toISOString(),
        featured: item.featured === true || item.featured === 'true',
        estado: item.estado || 'aprobado'
      }));

      updateSupabaseUIState(true);
      updateCategoryBadges();
      applyFilters();
      return;
    } catch (err) {
      console.warn('No se pudo obtener datos desde Supabase:', err.message || err);
      updateSupabaseUIState(false);
    }
  }

  // Fallback: usar datos locales si no hay Supabase o falló la consulta
  updateSupabaseUIState(false);
  loadLocalProductsFallback(searchTerm);
}

// Función controladora del input de búsqueda con debounce
function handleSearchInput(value) {
  AppState.searchQuery = value;

  // Sincronizar ambos buscadores (desktop y mobile)
  const desktopInput = document.getElementById('search-input');
  const mobileInput = document.getElementById('mobile-search-input');
  if (desktopInput && desktopInput.value !== value) desktopInput.value = value;
  if (mobileInput && mobileInput.value !== value) mobileInput.value = value;

  // Debounce de 250ms para consultar a Supabase sin saturar
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadProducts(true, value);
  }, 250);
}

// Sembrar productos iniciales si la tabla de Supabase está recién creada y vacía
async function seedInitialProducts() {
  if (!supabaseClient) return;
  try {
    const toInsert = DEFAULT_PRODUCTS.map(p => ({
      title: p.title,
      price: p.price,
      category: p.category,
      city: p.city,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      description: p.description,
      seller: p.seller,
      phone: p.phone,
      image: p.image,
      featured: p.featured,
      estado: 'aprobado'
    }));

    const { data, error } = await supabaseClient.from('products').insert(toInsert).select();
    if (!error && data) {
      AppState.allProducts = data.map(item => ({
        id: String(item.id || 'supa-' + Math.random()),
        title: item.title || 'Sin título',
        price: Number(item.price) || 0,
        category: item.category || 'Otros',
        city: item.city || item.location || 'San Luis Capital',
        address: item.address || '',
        lat: (item.lat !== null && item.lat !== undefined && !isNaN(Number(item.lat))) ? Number(item.lat) : null,
        lng: (item.lng !== null && item.lng !== undefined && !isNaN(Number(item.lng))) ? Number(item.lng) : null,
        description: item.description || '',
        seller: item.seller || 'Vendedor local',
        phone: item.phone || item.whatsapp || '5492664000000',
        image: item.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80',
        date: item.created_at || item.date || new Date().toISOString(),
        featured: item.featured === true || item.featured === 'true',
        estado: item.estado || 'aprobado'
      }));
      updateSupabaseUIState(true);
      updateCategoryBadges();
      applyFilters();
      showToast('¡Datos iniciales con geolocalización sincronizados en Supabase!');
      return;
    }
  } catch (seedErr) {
    console.error('Error al sembrar datos en Supabase:', seedErr);
  }
  loadLocalProductsFallback();
}

// Sembrar avisos de muestra bajo demanda desde el botón del modal
async function seedSampleProductsToSupabase() {
  if (!supabaseClient) {
    showToast('Primero asegúrate de conectar Supabase', 'error');
    return;
  }
  const btn = document.getElementById('seed-btn');
  if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo avisos geolocalizados a Supabase...';

  try {
    const toInsert = DEFAULT_PRODUCTS.map(p => ({
      title: p.title,
      price: p.price,
      category: p.category,
      city: p.city,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      description: p.description,
      seller: p.seller,
      phone: p.phone,
      image: p.image,
      featured: Boolean(p.featured),
      estado: 'aprobado'
    }));

    const { error } = await supabaseClient.from('products').insert(toInsert);
    if (error) throw error;

    showToast('¡10 avisos geolocalizados agregados a tu Supabase! 🗺️🎉');
    if (btn) btn.innerHTML = '<i class="fas fa-check text-emerald-600"></i> ¡Avisos cargados con éxito!';
    await loadProducts(false);
  } catch (err) {
    console.error('Error al cargar avisos de muestra:', err);
    showToast('No se pudieron subir los avisos: ' + err.message, 'error');
    if (btn) btn.innerHTML = '<i class="fas fa-times text-red-500"></i> Error al cargar';
  }
}

// Fallback a archivos locales / localStorage
async function loadLocalProductsFallback(searchTerm = '') {
  let baseProducts = [];
  try {
    const res = await fetch('data.json');
    if (res.ok) {
      baseProducts = await res.json();
    } else {
      baseProducts = DEFAULT_PRODUCTS;
    }
  } catch (err) {
    baseProducts = DEFAULT_PRODUCTS;
  }

  const userProducts = JSON.parse(localStorage.getItem('sl_user_products') || '[]');
  let combined = [...userProducts, ...baseProducts];

  // Filtrar solo aprobados: si la propiedad 'estado' existe filtramos por 'aprobado';
  // si solo tiene 'approved', lo respetamos; si no tiene ninguna, la mostramos.
  combined = combined.filter(p => {
    if (p.estado !== undefined) return p.estado === 'aprobado';
    if (p.approved !== undefined) return p.approved === true;
    return true;
  });

  // Filtrar búsqueda ilike local si hay término
  if (searchTerm && searchTerm.trim() !== '') {
    const q = searchTerm.trim().toLowerCase();
    combined = combined.filter(p => 
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  AppState.allProducts = combined;

  updateCategoryBadges();
  applyFilters();
}

// =================================================================
// FORMATEADORES Y UTILIDADES
// =================================================================

const formatPrice = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (isoString) => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return 'Reciente';
  }
};

function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =================================================================
// FILTROS Y RENDERIZADO DE PRODUCTOS
// =================================================================

function updateCategoryBadges() {
  const categoryContainer = document.getElementById('categories-container');
  if (!categoryContainer) return;

  const categories = [
    { id: 'all', label: 'Todas las categorías', icon: 'fa-layer-group' },
    { id: 'Gastronomía y Cafeterías', label: 'Cafeterías y Restó', icon: 'fa-mug-hot' },
    { id: 'Moda y Ropa', label: 'Indumentaria', icon: 'fa-tshirt' },
    { id: 'Tecnología', label: 'Tecnología', icon: 'fa-laptop' },
    { id: 'Vehículos y Rodados', label: 'Vehículos', icon: 'fa-car' },
    { id: 'Hogar y Muebles', label: 'Hogar', icon: 'fa-couch' },
    { id: 'Inmuebles y Alquileres', label: 'Inmuebles', icon: 'fa-home' },
    { id: 'Servicios', label: 'Servicios', icon: 'fa-tools' },
    { id: 'Otros', label: 'Otros', icon: 'fa-box' }
  ];

  categoryContainer.innerHTML = categories.map(cat => {
    const count = cat.id === 'all'
      ? AppState.allProducts.length
      : AppState.allProducts.filter(p => p.category === cat.id).length;

    const isActive = AppState.selectedCategory === cat.id;
    return `
      <button 
        onclick="setCategory('${cat.id}')"
        class="flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm whitespace-nowrap ${
          isActive 
            ? 'bg-[#0B132B] text-white border border-gold-500/50 shadow-md shadow-navy-950/20' 
            : 'bg-white text-slate-700 hover:text-navy-950 hover:bg-slate-50 hover:border-gold-500/40 border border-slate-200'
        }"
      >
        <i class="fas ${cat.icon} text-xs ${isActive ? 'text-gold-400' : 'text-slate-400'}"></i>
        <span>${cat.label}</span>
        <span class="text-xs px-2 py-0.5 rounded-full font-bold ${
          isActive ? 'bg-gold-500 text-navy-950' : 'bg-slate-100 text-slate-500'
        }">${count}</span>
      </button>
    `;
  }).join('');
}

// =================================================================
// MÓDULO DE MAPA INTERACTIVO GEOLOCALIZADO (GOOGLE MAPS JS API + ADVANCED MARKERS)
// =================================================================
// Source: Google Maps Platform Code Assist

function renderMapPlaceholder(containerId, customMessage) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="w-full h-full min-h-[160px] flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-white select-none">
      <div class="w-12 h-12 rounded-2xl bg-gold-metallic text-navy-950 flex items-center justify-center text-xl font-black mb-3 shadow-soft-3d">
        <i class="fab fa-google"></i>
      </div>
      <h3 class="font-extrabold text-sm sm:text-base text-gold-200 mb-1">Google Maps Platform &bull; San Luis</h3>
      <p class="text-xs text-slate-300 max-w-sm mb-4 leading-relaxed">${customMessage || 'Ingresa tu Maps Demo Key para visualizar el mapa vectorial de comercios y habilitar el autocompletado de calles.'}</p>
      <button 
        type="button" 
        onclick="openGoogleMapsModal()" 
        class="px-4 py-2 rounded-xl bg-gold-metallic text-navy-950 text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-amber-200/50"
      >
        <i class="fas fa-key"></i> Conectar Maps Demo Key (Sin Tarjeta)
      </button>
    </div>
  `;
}

async function initMarketplaceMap() {
  const mapElement = document.getElementById('main-marketplace-map');
  if (!mapElement || mainMap) return;

  const apiKey = getGoogleMapsKey();
  if (!apiKey) {
    renderMapPlaceholder('main-marketplace-map');
    return;
  }

  try {
    await ensureGoogleMapsLoaded();

    const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker')
    ]);

    mainMap = new Map(mapElement, {
      center: { lat: -33.35, lng: -65.85 },
      zoom: 9,
      mapId: 'DEMO_MAP_ID',
      renderingType: 'VECTOR',
      internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
      mapTypeControl: true,
      streetViewControl: true,
      zoomControl: true,
      fullscreenControl: false
    });

    // Ajustar vista inicial según modo guardado
    setViewMode(AppState.viewMode);

    // Cargar y mostrar todos los marcadores al mismo tiempo en el mapa
    const initialList = (pendingProductsToRender && pendingProductsToRender.length > 0)
      ? pendingProductsToRender 
      : (AppState.allProducts.length > 0 ? AppState.allProducts : AppState.filteredProducts);

    if (initialList && initialList.length > 0) {
      renderMapMarkers(initialList, true);
    }
  } catch (err) {
    console.error('Error al inicializar el mapa interactivo Google Maps:', err);
    renderMapPlaceholder('main-marketplace-map', 'No se pudo inicializar Google Maps. Verifica la clave ingresada.');
  }
}

// Crear elemento visual HTML para cada pin de AdvancedMarkerElement
function createAdvancedMarkerContent(item, isSelected = false) {
  const meta = getCategoryMeta(item.category);
  const isFeatured = item.featured;
  const pinSize = isSelected ? 44 : 38;
  const iconSize = isSelected ? 'text-sm' : 'text-xs';
  const glowBorder = isSelected 
    ? 'ring-4 ring-gold-400 scale-110 shadow-2xl' 
    : 'ring-2 ring-white shadow-lg hover:scale-110';

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-gmp-marker relative group cursor-pointer transition-transform duration-200';
  wrapper.style.width = `${pinSize}px`;
  wrapper.style.height = `${pinSize + 10}px`;

  wrapper.innerHTML = `
    <!-- Cabeza del Pin con degradado y color de categoría -->
    <div class="w-full rounded-2xl flex items-center justify-center text-white transition-all ${glowBorder}" 
         style="height: ${pinSize}px; background: linear-gradient(135deg, ${meta.color} 0%, #0B132B 150%);">
      <i class="fas ${meta.icon} ${iconSize}"></i>
      ${isFeatured ? '<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-navy-950 rounded-full flex items-center justify-center text-[8px] font-black shadow border border-white">★</span>' : ''}
    </div>
    <!-- Punta del Pin -->
    <div class="w-2.5 h-2.5 transform rotate-45 mx-auto -mt-1" style="background-color: ${meta.color}; border-right: 1.5px solid #ffffff; border-bottom: 1.5px solid #ffffff;"></div>
    <!-- Sombra inferior -->
    <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-black/25 rounded-full blur-[1px]"></div>
  `;

  return wrapper;
}

// Crear contenido de la tarjeta rápida (InfoWindow con nombre, foto y enlace al negocio)
function createMarkerPopupContent(item) {
  const meta = getCategoryMeta(item.category);
  const coords = resolveCoordinates(item);
  const cleanPhone = (item.phone || '5492664000000').replace(/\D/g, '');
  const waText = encodeURIComponent(
    `¡Hola ${item.seller || ''}! Vi tu negocio/publicación en el mapa de VM Hub San Luis: "${item.title}". ¿Aún sigue disponible?`
  );
  const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;
  const addressText = item.address ? `${item.address}, ${item.city}` : item.city;
  const gmapsDirUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;

  return `
    <div class="w-72 max-w-[285px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 text-slate-800 font-sans">
      <!-- Portada con imagen del negocio -->
      <div class="relative h-32 w-full overflow-hidden bg-slate-100 cursor-pointer" onclick="openDetailModal('${escapeHtml(item.id)}')">
        <img 
          src="${escapeHtml(item.image)}" 
          alt="${escapeHtml(item.title)}" 
          class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
          onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80'" 
        />
        <span class="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide text-white shadow-md ${meta.badgeClass}">
          <i class="fas ${meta.icon} mr-1"></i> ${escapeHtml(item.category)}
        </span>
        ${item.price > 0 ? `
          <span class="absolute bottom-2 right-2 bg-navy-950/90 text-gold-300 font-black text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm border border-gold-500/30 shadow-md">
            ${formatPrice(item.price)}
          </span>
        ` : ''}
      </div>

      <!-- Contenido descriptivo del negocio -->
      <div class="p-3.5 space-y-2">
        <div>
          <div class="text-[10px] font-bold text-gold-700 uppercase tracking-wider flex items-center gap-1">
            <i class="fas fa-store"></i> ${escapeHtml(item.seller || 'Comercio Local')}
          </div>
          <h4 
            onclick="openDetailModal('${escapeHtml(item.id)}')"
            class="font-extrabold text-navy-950 text-xs sm:text-sm leading-snug line-clamp-1 mt-0.5 cursor-pointer hover:text-gold-600 transition-colors" 
            title="${escapeHtml(item.title)}"
          >
            ${escapeHtml(item.title)}
          </h4>
        </div>

        <div class="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
          <i class="fas fa-map-marker-alt text-red-500 flex-shrink-0"></i>
          <span class="truncate" title="${escapeHtml(addressText)}">${escapeHtml(addressText)}</span>
        </div>

        <!-- Botones de Enlace al Negocio y WhatsApp -->
        <div class="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <button 
            type="button" 
            onclick="openDetailModal('${escapeHtml(item.id)}')" 
            class="w-full py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-950 text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <i class="fas fa-eye text-slate-500"></i> Ver Ficha
          </button>
          
          <a 
            href="${waUrl}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="w-full py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-black transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-700/20"
          >
            <i class="fab fa-whatsapp"></i> Chat
          </a>
        </div>

        <div class="pt-1 text-center">
          <a 
            href="${gmapsDirUrl}" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="text-[10px] font-semibold text-slate-500 hover:text-navy-950 underline inline-flex items-center gap-1"
          >
            <i class="fas fa-diamond-turn-right text-gold-600"></i> Cómo llegar en Google Maps
          </a>
        </div>
      </div>
    </div>
  `;
}

// Variables para controlar la sincronización de carga
let pendingProductsToRender = null;
let pendingAutoFit = false;

// Renderizar TODOS los marcadores geolocalizados de Supabase al mismo tiempo en el mapa
async function renderMapMarkers(products = null, autoFit = false) {
  const items = (products && products.length > 0)
    ? products 
    : (AppState.allProducts.length > 0 ? AppState.allProducts : AppState.filteredProducts);

  if (!mainMap || !window.google || !google.maps) {
    pendingProductsToRender = items;
    pendingAutoFit = autoFit;
    return;
  }

  try {
    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

    // Limpiar marcadores previos para evitar duplicados al recargar
    Object.values(markerInstances).forEach(marker => {
      if (marker) marker.map = null;
    });
    markerInstances = {};

    const mapCountBadge = document.getElementById('map-count-badge');
    if (mapCountBadge) {
      mapCountBadge.textContent = `${items.length} locale${items.length === 1 ? '' : 's'}`;
    }

    const bounds = new google.maps.LatLngBounds();
    let validCoordsCount = 0;

    items.forEach(item => {
      const coords = resolveCoordinates(item);
      const isSelected = AppState.activeMapMarkerId === item.id;
      const markerContent = createAdvancedMarkerContent(item, isSelected);

      const marker = new AdvancedMarkerElement({
        map: mainMap,
        position: { lat: coords.lat, lng: coords.lng },
        title: `${item.title} - ${item.seller || 'San Luis'}`,
        content: markerContent,
        internalUsageAttributionIds: ['gmp_git_agentskills_v1']
      });

      // Al hacer clic en cualquier pin del mapa, abrir su InfoWindow completa
      marker.addListener('gmp-click', () => {
        AppState.activeMapMarkerId = item.id;

        // Resaltar pin seleccionado manteniendo todos los demás visibles
        Object.keys(markerInstances).forEach(key => {
          const m = markerInstances[key];
          if (m && m.content) {
            if (key === String(item.id)) {
              m.content.classList.add('selected-marker-active');
              m.zIndex = 999999;
            } else {
              m.content.classList.remove('selected-marker-active');
              m.zIndex = 1;
            }
          }
        });

        if (currentInfoWindow) currentInfoWindow.close();

        currentInfoWindow = new google.maps.InfoWindow({
          content: createMarkerPopupContent(item),
          maxWidth: 290
        });

        currentInfoWindow.open({
          anchor: marker,
          map: mainMap
        });
      });

      markerInstances[String(item.id)] = marker;
      bounds.extend({ lat: coords.lat, lng: coords.lng });
      validCoordsCount++;
    });

    // Encuadre automático para mostrar todos los negocios juntos en pantalla
    if (autoFit && validCoordsCount > 0 && !bounds.isEmpty()) {
      mainMap.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
      google.maps.event.addListenerOnce(mainMap, 'idle', () => {
        if (mainMap.getZoom() > 14) {
          mainMap.setZoom(14);
        }
      });
    }

  } catch (err) {
    console.error('Error al renderizar marcadores en Google Maps:', err);
  }
}

// Centrar y enfocar un negocio específico desde la lista o tarjeta SIN borrar los demás
function focusProductOnMap(id, autoScroll = true) {
  const strId = String(id);
  const marker = markerInstances[strId];
  const product = AppState.allProducts.find(p => String(p.id) === strId) ||
                  AppState.filteredProducts.find(p => String(p.id) === strId);

  // Si estamos en modo cuadrícula pura, alternar automáticamente a vista dividida
  if (AppState.viewMode === 'grid') {
    setViewMode('split');
  }

  if (!mainMap) return;

  const coords = marker ? marker.position : (product ? resolveCoordinates(product) : null);
  if (!coords) return;

  const lat = typeof coords.lat === 'function' ? coords.lat() : coords.lat;
  const lng = typeof coords.lng === 'function' ? coords.lng() : coords.lng;

  // 1. Zoom suave y paneo hacia el negocio seleccionado SIN borrar los demás marcadores
  mainMap.panTo({ lat, lng });
  mainMap.setZoom(16);

  // 2. Resaltar visualmente el marcador seleccionado manteniendo todos los pines en el mapa
  Object.keys(markerInstances).forEach(key => {
    const m = markerInstances[key];
    if (m && m.content) {
      if (key === strId) {
        m.content.classList.add('selected-marker-active');
        m.zIndex = 999999;
      } else {
        m.content.classList.remove('selected-marker-active');
        m.zIndex = 1;
      }
    }
  });

  // 3. Abrir la ventana InfoWindow con foto, nombre y enlaces del negocio
  if (product) {
    setTimeout(() => {
      if (currentInfoWindow) currentInfoWindow.close();
      currentInfoWindow = new google.maps.InfoWindow({
        content: createMarkerPopupContent(product),
        maxWidth: 290
      });

      if (marker) {
        currentInfoWindow.open({
          anchor: marker,
          map: mainMap
        });
      } else {
        currentInfoWindow.setPosition({ lat, lng });
        currentInfoWindow.open({
          map: mainMap
        });
      }
    }, 200);
  }

  // 4. Scroll en dispositivos móviles hasta el mapa
  if (autoScroll && window.innerWidth < 1024) {
    const mapSec = document.getElementById('map-section');
    if (mapSec) {
      mapSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

// Accesos directos por localidad en el mapa
function focusCity(cityName) {
  if (!mainMap) return;

  if (cityName === 'all') {
    const bounds = new google.maps.LatLngBounds();
    Object.values(markerInstances).forEach(m => {
      if (m && m.position) bounds.extend(m.position);
    });
    if (!bounds.isEmpty()) {
      mainMap.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    } else {
      mainMap.panTo({ lat: -33.35, lng: -65.85 });
      mainMap.setZoom(9);
    }
    return;
  }

  const coords = CITY_COORDINATES[cityName];
  if (coords) {
    mainMap.panTo({ lat: coords.lat, lng: coords.lng });
    mainMap.setZoom(13);
  }
}

// Geolocalización del usuario por GPS en el mapa
function locateUserOnMap() {
  if (!navigator.geolocation) {
    showToast('Tu navegador no soporta geolocalización', 'error');
    return;
  }

  showToast('Obteniendo tu ubicación actual...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      if (!mainMap) return;

      if (userLocationMarker) {
        userLocationMarker.map = null;
        userLocationMarker = null;
      }

      try {
        const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

        const userPinEl = document.createElement('div');
        userPinEl.className = 'relative flex items-center justify-center';
        userPinEl.innerHTML = `
          <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-sky-400 opacity-75"></span>
          <div class="w-6 h-6 rounded-full bg-sky-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-[10px]">
            <i class="fas fa-street-view"></i>
          </div>
        `;

        userLocationMarker = new AdvancedMarkerElement({
          map: mainMap,
          position: { lat: latitude, lng: longitude },
          content: userPinEl,
          title: '¡Estás aquí!',
          internalUsageAttributionIds: ['gmp_git_agentskills_v1']
        });

        if (currentInfoWindow) currentInfoWindow.close();
        currentInfoWindow = new google.maps.InfoWindow({
          content: '<div class="p-2 text-xs font-bold text-navy-950 text-center font-sans">📍 ¡Estás aquí!</div>'
        });
        currentInfoWindow.open({
          anchor: userLocationMarker,
          map: mainMap
        });

        mainMap.panTo({ lat: latitude, lng: longitude });
        mainMap.setZoom(14);
        showToast('Mapa centrado en tu posición actual 📍');
      } catch (e) {
        console.error('Error al agregar marcador de usuario:', e);
      }
    },
    (err) => {
      console.warn('Error GPS:', err);
      showToast('No pudimos acceder a tu GPS. Revisa los permisos.', 'error');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// Alternar entre los 3 modos de vista: 'split', 'map', 'grid'
function setViewMode(mode) {
  AppState.viewMode = mode;
  localStorage.setItem('sl_view_mode', mode);

  const btnSplit = document.getElementById('view-btn-split');
  const btnMap = document.getElementById('view-btn-map');
  const btnGrid = document.getElementById('view-btn-grid');
  const layoutContainer = document.getElementById('catalog-layout-container');
  const mapSection = document.getElementById('map-section');
  const gridSection = document.getElementById('grid-section');
  const productsGrid = document.getElementById('products-grid');
  const expandMapText = document.getElementById('expand-map-text');

  // Actualizar estado activo de los botones
  const activeClass = 'bg-white text-navy-950 shadow-sm';
  const inactiveClass = 'text-slate-600 hover:text-navy-950';

  if (btnSplit) btnSplit.className = `px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${mode === 'split' ? activeClass : inactiveClass}`;
  if (btnMap) btnMap.className = `px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${mode === 'map' ? activeClass : inactiveClass}`;
  if (btnGrid) btnGrid.className = `px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${mode === 'grid' ? activeClass : inactiveClass}`;

  if (!layoutContainer || !mapSection || !gridSection) return;

  if (mode === 'split') {
    layoutContainer.className = 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-start';
    mapSection.className = 'lg:col-span-5 w-full block transition-all duration-300';
    gridSection.className = 'lg:col-span-7 w-full block transition-all duration-300';
    if (productsGrid) productsGrid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-6';
    if (expandMapText) expandMapText.textContent = 'Ampliar Mapa';
  } else if (mode === 'map') {
    layoutContainer.className = 'grid grid-cols-1 gap-8 items-start';
    mapSection.className = 'w-full block transition-all duration-300';
    gridSection.className = 'hidden';
    if (expandMapText) expandMapText.textContent = 'Modo Dividido';
  } else if (mode === 'grid') {
    layoutContainer.className = 'grid grid-cols-1 gap-8 items-start';
    mapSection.className = 'hidden';
    gridSection.className = 'w-full block transition-all duration-300';
    if (productsGrid) productsGrid.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
  }

  // Refrescar tamaño del mapa en Google Maps para recalcular layout
  setTimeout(() => {
    if (mainMap && window.google && google.maps && google.maps.event) {
      google.maps.event.trigger(mainMap, 'resize');
    }
  }, 250);
}

// Botón de ampliar/reducir mapa
function toggleMapFullscreen() {
  setViewMode(AppState.viewMode === 'map' ? 'split' : 'map');
}

// =================================================================
// MINI MAPA PARA EL FORMULARIO DE PUBLICACIÓN (GOOGLE MAPS)
// =================================================================

async function initPublishMiniMap() {
  const miniMapEl = document.getElementById('publish-mini-map');
  if (!miniMapEl) return;

  const currentCity = document.getElementById('prod-city')?.value || 'San Luis Capital';
  const baseCoords = CITY_COORDINATES[currentCity] || CITY_COORDINATES['San Luis Capital'];

  const apiKey = getGoogleMapsKey();
  if (!apiKey) {
    renderMapPlaceholder('publish-mini-map', 'Conecta tu Maps Demo Key para previsualizar el pin en Google Maps.');
    setPublishCoordinates(baseCoords.lat, baseCoords.lng);
    return;
  }

  try {
    await ensureGoogleMapsLoaded();
    const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
      google.maps.importLibrary('maps'),
      google.maps.importLibrary('marker')
    ]);

    if (!publishMiniMap) {
      publishMiniMap = new Map(miniMapEl, {
        center: { lat: baseCoords.lat, lng: baseCoords.lng },
        zoom: 14,
        mapId: 'DEMO_MAP_ID',
        disableDefaultUI: true,
        zoomControl: false,
        renderingType: 'VECTOR',
        internalUsageAttributionIds: ['gmp_git_agentskills_v1']
      });

      const pinIcon = document.createElement('div');
      pinIcon.className = 'w-8 h-8 rounded-full bg-gold-500 text-navy-950 flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-navy-950/20 font-black text-xs cursor-grab active:cursor-grabbing';
      pinIcon.innerHTML = '<i class="fas fa-map-pin"></i>';

      publishMiniMarker = new AdvancedMarkerElement({
        map: publishMiniMap,
        position: { lat: baseCoords.lat, lng: baseCoords.lng },
        content: pinIcon,
        gmpDraggable: true,
        title: 'Arrastra para fijar ubicación exacta',
        internalUsageAttributionIds: ['gmp_git_agentskills_v1']
      });

      publishMiniMarker.addListener('dragend', () => {
        const pos = publishMiniMarker.position;
        const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
        const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
        setPublishCoordinates(lat, lng);
      });

      publishMiniMap.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        publishMiniMarker.position = { lat, lng };
        setPublishCoordinates(lat, lng);
      });

      setPublishCoordinates(baseCoords.lat, baseCoords.lng);
    } else {
      publishMiniMap.panTo({ lat: baseCoords.lat, lng: baseCoords.lng });
      publishMiniMap.setZoom(14);
      if (publishMiniMarker) {
        publishMiniMarker.position = { lat: baseCoords.lat, lng: baseCoords.lng };
      }
    }
  } catch (err) {
    console.error('Error al inicializar el mini mapa en el formulario:', err);
    setPublishCoordinates(baseCoords.lat, baseCoords.lng);
  }
}

function setPublishCoordinates(lat, lng) {
  const latNum = typeof lat === 'number' ? lat : parseFloat(lat);
  const lngNum = typeof lng === 'number' ? lng : parseFloat(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return;

  const latInput = document.getElementById('prod-lat');
  const lngInput = document.getElementById('prod-lng');
  const label = document.getElementById('publish-coord-label');
  const values = document.getElementById('publish-coord-values');

  if (latInput) latInput.value = latNum.toFixed(6);
  if (lngInput) lngInput.value = lngNum.toFixed(6);

  if (label) label.innerHTML = '<i class="fas fa-check-circle text-emerald-600 mr-1"></i> Ubicación fijada en el mapa';
  if (values) {
    values.textContent = `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`;
    values.classList.remove('hidden');
  }
}

function handlePublishCityChange(cityName) {
  const coords = CITY_COORDINATES[cityName];
  if (coords && publishMiniMap && publishMiniMarker) {
    publishMiniMap.panTo({ lat: coords.lat, lng: coords.lng });
    publishMiniMarker.position = { lat: coords.lat, lng: coords.lng };
    setPublishCoordinates(coords.lat, coords.lng);
  }
}

function locatePublishUserGps() {
  if (!navigator.geolocation) {
    showToast('Tu navegador no permite GPS', 'error');
    return;
  }
  showToast('Detectando coordenadas actuales...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (publishMiniMap && publishMiniMarker) {
        publishMiniMap.panTo({ lat: latitude, lng: longitude });
        publishMiniMap.setZoom(15);
        publishMiniMarker.position = { lat: latitude, lng: longitude };
        setPublishCoordinates(latitude, longitude);
        showToast('¡Ubicación GPS fijada en el mapa!');
      }
    },
    () => showToast('No se pudo obtener el GPS', 'error'),
    { enableHighAccuracy: true }
  );
}

function resetPublishMiniMap() {
  if (publishMiniMarker && publishMiniMap) {
    const defaultCoords = CITY_COORDINATES['San Luis Capital'];
    publishMiniMarker.position = { lat: defaultCoords.lat, lng: defaultCoords.lng };
  }
  const latInput = document.getElementById('prod-lat');
  const lngInput = document.getElementById('prod-lng');
  const values = document.getElementById('publish-coord-values');
  const label = document.getElementById('publish-coord-label');

  if (latInput) latInput.value = '';
  if (lngInput) lngInput.value = '';
  if (values) values.classList.add('hidden');
  if (label) label.innerHTML = '<i class="fas fa-hand-pointer text-gold-600 mr-1"></i> Toca el mapa para fijar tu pin';
}

// =================================================================
// GOOGLE PLACES AUTOCOMPLETE (AUTOCOMPLETADO DE DIRECCIONES EN SAN LUIS & VILLA MERCEDES)
// =================================================================

async function initPublishAutocomplete() {
  const container = document.getElementById('gmp-autocomplete-wrapper');
  if (!container) return;

  const apiKey = getGoogleMapsKey();
  if (!apiKey) {
    container.innerHTML = `
      <div class="p-2.5 rounded-xl bg-gold-50/70 border border-gold-200/80 text-[11px] text-navy-950 flex items-center justify-between">
        <span class="flex items-center gap-1.5"><i class="fab fa-google text-gold-600"></i> Autocompletado de calles de Villa Mercedes y San Luis</span>
        <button type="button" onclick="openGoogleMapsModal()" class="text-gold-700 underline font-bold hover:text-navy-950">Activar</button>
      </div>
    `;
    return;
  }

  try {
    await ensureGoogleMapsLoaded();
    const { PlaceAutocompleteElement } = await google.maps.importLibrary('places');

    container.innerHTML = '';

    const placeAutocomplete = new PlaceAutocompleteElement({
      internalUsageAttributionIds: ['gmp_git_agentskills_v1']
    });

    // Restringir a Argentina
    placeAutocomplete.includedRegionCodes = ['ar'];

    // Sesgo hacia San Luis y Villa Mercedes
    placeAutocomplete.locationBias = {
      center: { lat: -33.35, lng: -65.85 },
      radius: 120000
    };

    container.appendChild(placeAutocomplete);

    // Escuchar selección de predicción
    placeAutocomplete.addEventListener('gmp-select', async ({ placePrediction }) => {
      if (!placePrediction) return;

      try {
        const place = placePrediction.toPlace();
        // Campo mask explícito y mandatorio para optimización de costos
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
        });

        if (place.location) {
          const lat = place.location.lat();
          const lng = place.location.lng();
          setPublishCoordinates(lat, lng);

          if (publishMiniMap) {
            publishMiniMap.panTo({ lat, lng });
            publishMiniMap.setZoom(16);
            if (publishMiniMarker) {
              publishMiniMarker.position = { lat, lng };
            }
          }
        }

        const fullAddr = place.formattedAddress || place.displayName || '';
        const prodAddressInput = document.getElementById('prod-address');
        if (prodAddressInput) {
          prodAddressInput.value = fullAddr;
        }

        // Detección automática inteligente de la localidad (Villa Mercedes, San Luis, etc.)
        autoSelectCityFromComponents(place.addressComponents, fullAddr);

        showToast('📍 Dirección y coordenadas detectadas automáticamente');
      } catch (placeErr) {
        console.error('Error al obtener datos del lugar:', placeErr);
      }
    });

    publishPlaceAutocomplete = placeAutocomplete;
  } catch (err) {
    console.warn('PlaceAutocompleteElement no disponible o en fallback:', err);
  }
}

// Analizar la dirección para autoseleccionar la localidad en el formulario
function autoSelectCityFromComponents(components, fullText) {
  const citySelect = document.getElementById('prod-city');
  if (!citySelect) return;

  const textToScan = [
    fullText || '',
    ...(components || []).map(c => c.longText || c.shortText || '')
  ].join(' ').toLowerCase();

  let matchedCity = null;

  if (textToScan.includes('villa mercedes') || textToScan.includes('mercedes')) {
    matchedCity = 'Villa Mercedes';
  } else if (textToScan.includes('merlo') || textToScan.includes('villa de merlo')) {
    matchedCity = 'Merlo';
  } else if (textToScan.includes('juana koslay') || textToScan.includes('koslay')) {
    matchedCity = 'Juana Koslay';
  } else if (textToScan.includes('la punta') || textToScan.includes('punta')) {
    matchedCity = 'La Punta';
  } else if (textToScan.includes('potrero')) {
    matchedCity = 'Potrero de los Funes';
  } else if (textToScan.includes('trapiche')) {
    matchedCity = 'El Trapiche';
  } else if (textToScan.includes('carpinter')) {
    matchedCity = 'Carpintería';
  } else if (textToScan.includes('concar')) {
    matchedCity = 'Concarán';
  } else if (textToScan.includes('santa rosa')) {
    matchedCity = 'Santa Rosa del Conlara';
  } else if (textToScan.includes('quines')) {
    matchedCity = 'Quines';
  } else if (textToScan.includes('san luis')) {
    matchedCity = 'San Luis Capital';
  }

  if (matchedCity) {
    citySelect.value = matchedCity;
  }
}

// =================================================================
// GESTIÓN DEL MODAL DE GOOGLE MAPS PLATFORM
// =================================================================

function openGoogleMapsModal() {
  const modal = document.getElementById('modal-google-maps');
  const input = document.getElementById('gmaps-key-input');
  const statusDiv = document.getElementById('gmaps-modal-status');

  if (input) input.value = getGoogleMapsKey();
  if (statusDiv) {
    statusDiv.classList.add('hidden');
    statusDiv.textContent = '';
  }

  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
}

function closeGoogleMapsModal() {
  const modal = document.getElementById('modal-google-maps');
  if (modal) {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

function handleSaveGoogleMapsKey(e) {
  e.preventDefault();
  const input = document.getElementById('gmaps-key-input');
  const key = input ? input.value.trim() : '';
  const statusDiv = document.getElementById('gmaps-modal-status');

  if (!key) {
    if (statusDiv) {
      statusDiv.className = 'p-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200';
      statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Por favor ingresa una API Key válida.';
      statusDiv.classList.remove('hidden');
    }
    return;
  }

  setGoogleMapsKey(key);
  showToast('Clave de Google Maps guardada correctamente 🗺️');

  closeGoogleMapsModal();
  updateGoogleMapsStatusUI();

  // Reinicializar mapa principal y Places Autocomplete
  if (!mainMap) {
    initMarketplaceMap();
  } else {
    window.location.reload();
  }
}

function updateGoogleMapsStatusUI() {
  const statusBtn = document.getElementById('gmaps-status-btn');
  const dot = document.getElementById('gmaps-status-dot');
  const text = document.getElementById('gmaps-status-text');

  const key = getGoogleMapsKey();
  if (key) {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400';
    if (text) text.textContent = 'Google Maps';
    if (statusBtn) statusBtn.title = 'Google Maps Platform Activo (Demo Key)';
  } else {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400 animate-pulse';
    if (text) text.textContent = 'Maps Demo Key';
    if (statusBtn) statusBtn.title = 'Configurar Maps Demo Key (Sin Tarjeta)';
  }
}

// =================================================================
// FILTRADO Y ACTUALIZACIÓN SINCRONIZADA
// =================================================================

function applyFilters() {
  let list = [...AppState.allProducts];

  // Filtro de Favoritos
  if (AppState.onlyFavorites) {
    list = list.filter(p => AppState.favorites.includes(p.id));
  }

  // Filtro de Categoría
  if (AppState.selectedCategory !== 'all') {
    list = list.filter(p => p.category === AppState.selectedCategory);
  }

  // Filtro de Ciudad
  if (AppState.selectedCity !== 'all') {
    list = list.filter(p => p.city === AppState.selectedCity);
  }

  // Filtro de Búsqueda local (solo si estamos en modo local sin Supabase)
  if (!AppState.isSupabaseConnected && AppState.searchQuery.trim() !== '') {
    const q = AppState.searchQuery.toLowerCase();
    list = list.filter(p => 
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  // Ordenamiento
  if (AppState.sortBy === 'price-asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (AppState.sortBy === 'price-desc') {
    list.sort((a, b) => b.price - a.price);
  } else if (AppState.sortBy === 'newest') {
    list.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      if (dateA !== dateB && !isNaN(dateA) && !isNaN(dateB)) {
        return dateB - dateA;
      }
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }

  AppState.filteredProducts = list;

  // Actualizar simultáneamente la lista y mostrar todos los pines en el mapa
  renderProducts();
  renderMapMarkers(AppState.allProducts, false);
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const countBadge = document.getElementById('results-count');
  const emptyState = document.getElementById('empty-state');

  if (countBadge) {
    countBadge.textContent = `${AppState.filteredProducts.length} producto${AppState.filteredProducts.length === 1 ? '' : 's'}`;
  }

  if (AppState.filteredProducts.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  grid.innerHTML = AppState.filteredProducts.map(product => {
    const isFav = AppState.favorites.includes(product.id);
    const catMeta = getCategoryMeta(product.category);
    const cleanPhone = (product.phone || '5492664000000').replace(/\D/g, '');
    const waText = encodeURIComponent(
      `¡Hola ${product.seller || ''}! Vi tu publicación en VM Hub San Luis sobre "${product.title}" (${formatPrice(product.price)}). ¿Aún sigue disponible?`
    );
    const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;
    const displayLocation = product.address ? `${product.address}, ${product.city}` : product.city;

    return `
      <article 
        class="bg-white rounded-2xl overflow-hidden border border-slate-200/90 shadow-[0_8px_20px_-4px_rgba(11,19,43,0.06),0_2px_4px_-1px_rgba(11,19,43,0.03)] hover:shadow-[0_16px_32px_-4px_rgba(11,19,43,0.12),0_4px_8px_-2px_rgba(11,19,43,0.05)] hover:border-gold-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer"
        onclick="focusProductOnMap('${product.id}')"
      >
        <!-- Imagen y badges -->
        <div class="relative h-52 overflow-hidden bg-slate-100 cursor-pointer" onclick="event.stopPropagation(); focusProductOnMap('${product.id}')">
          <img 
            src="${product.image}" 
            alt="${escapeHtml(product.title)}"
            loading="lazy"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onerror="this.src='https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80'"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <span class="text-white text-xs font-semibold flex items-center gap-1.5 bg-navy-950/80 backdrop-blur-sm px-3 py-1 rounded-full border border-gold-500/30">
              <i class="fas fa-map-location-dot text-gold-400"></i> Ver en el mapa
            </span>
          </div>

          <!-- Badges superiores diferenciados por Rubro -->
          <div class="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            <span class="text-[11px] font-bold ${catMeta.badgeClass} px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-white/20">
              <i class="fas ${catMeta.icon} text-[10px]"></i> ${escapeHtml(product.category)}
            </span>
            ${product.featured ? `
              <span class="text-[10px] font-black bg-gradient-to-r from-amber-300 via-gold-500 to-amber-600 text-navy-950 px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <i class="fas fa-star text-[9px]"></i> Destacado
              </span>
            ` : ''}
          </div>

          <!-- Botón de Favorito -->
          <button 
            type="button"
            onclick="event.stopPropagation(); toggleFavorite('${product.id}')"
            class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm hover:bg-white text-slate-600 hover:text-red-500 flex items-center justify-center shadow-md transition-all active:scale-90 border border-slate-200"
            title="Guardar en favoritos"
          >
            <i class="${isFav ? 'fas fa-heart text-red-500' : 'far fa-heart'} text-base"></i>
          </button>
        </div>

        <!-- Contenido -->
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <!-- Ubicación interactiva con enlace al mapa -->
            <div class="flex items-center justify-between text-xs text-slate-500 mb-2">
              <button 
                type="button" 
                onclick="event.stopPropagation(); focusProductOnMap('${product.id}')"
                class="flex items-center gap-1.5 text-navy-950 hover:text-gold-600 font-semibold transition-colors text-left group/loc"
                title="Ubicar este negocio en el mapa"
              >
                <i class="fas fa-map-location-dot text-gold-600 group-hover/loc:scale-110 transition-transform"></i>
                <span class="underline decoration-slate-300 underline-offset-2 truncate max-w-[170px] sm:max-w-[210px]">${escapeHtml(displayLocation)}</span>
              </button>
              <span class="text-slate-400 font-medium whitespace-nowrap">${formatDate(product.date)}</span>
            </div>

            <!-- Título -->
            <h3 
              class="font-extrabold text-navy-950 text-base line-clamp-2 hover:text-gold-600 transition-colors cursor-pointer mb-2"
              onclick="event.stopPropagation(); focusProductOnMap('${product.id}')"
              title="${escapeHtml(product.title)}"
            >
              ${escapeHtml(product.title)}
            </h3>

            <!-- Descripción recortada -->
            <p class="text-slate-600 text-xs line-clamp-2 mb-4 leading-relaxed font-normal">
              ${escapeHtml(product.description)}
            </p>
          </div>

          <!-- Precio y acciones -->
          <div class="pt-3 border-t border-slate-100">
            <div class="flex items-baseline justify-between mb-3">
              <div>
                <span class="text-[11px] text-slate-400 block font-semibold uppercase tracking-wider">Precio</span>
                <span class="text-2xl font-black text-navy-950 tracking-tight">${formatPrice(product.price)}</span>
              </div>
              <span class="text-xs text-slate-500 font-medium truncate max-w-[130px]">Por <strong class="text-navy-900">${escapeHtml(product.seller || 'Vendedor')}</strong></span>
            </div>

            <div class="grid grid-cols-12 gap-2">
              <button 
                type="button"
                onclick="event.stopPropagation(); focusProductOnMap('${product.id}')"
                class="col-span-3 text-center py-2.5 px-2 rounded-xl border border-slate-200 hover:border-gold-500/50 bg-slate-50 hover:bg-gold-50/50 text-navy-950 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Ver ubicación en el mapa"
              >
                <i class="fas fa-map-pin text-gold-600"></i> <span class="hidden sm:inline">Mapa</span>
              </button>

              <button 
                type="button"
                onclick="event.stopPropagation(); openDetailModal('${product.id}')"
                class="col-span-4 text-center py-2.5 px-2 rounded-xl border border-slate-200 hover:border-gold-500/40 bg-slate-50 hover:bg-slate-100 text-navy-950 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <i class="fas fa-circle-info text-slate-500"></i> Ficha
              </button>

              <a 
                href="${waUrl}" 
                target="_blank" 
                rel="noopener noreferrer"
                onclick="event.stopPropagation()"
                class="col-span-5 text-center py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white text-xs font-black shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-1 border border-emerald-400/30"
              >
                <i class="fab fa-whatsapp text-sm text-emerald-100"></i> WhatsApp
              </a>
            </div>
              >
                <i class="fas fa-map-pin text-gold-600"></i> <span class="hidden sm:inline">Mapa</span>
              </button>

              <button 
                type="button"
                onclick="openDetailModal('${product.id}')"
                class="col-span-4 text-center py-2.5 px-2 rounded-xl border border-slate-200 hover:border-gold-500/40 bg-slate-50 hover:bg-slate-100 text-navy-950 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <i class="fas fa-circle-info text-slate-500"></i> Ficha
              </button>

              <a 
                href="${waUrl}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="col-span-5 text-center py-2.5 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-95 text-white text-xs font-black shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-1 border border-emerald-400/30"
              >
                <i class="fab fa-whatsapp text-sm text-emerald-100"></i> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Manejador de favoritos
function toggleFavorite(id) {
  const strId = String(id);
  const index = AppState.favorites.indexOf(strId);
  if (index >= 0) {
    AppState.favorites.splice(index, 1);
    showToast('Producto quitado de favoritos');
  } else {
    AppState.favorites.push(strId);
    showToast('¡Guardado en tus favoritos! ❤️');
  }
  localStorage.setItem('sl_favorites', JSON.stringify(AppState.favorites));
  updateFavoritesBadge();
  renderProducts();
}

function updateFavoritesBadge() {
  const badge = document.getElementById('fav-count-badge');
  if (badge) {
    badge.textContent = AppState.favorites.length;
    if (AppState.favorites.length > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function setCategory(categoryId) {
  AppState.selectedCategory = categoryId;
  updateCategoryBadges();
  applyFilters();
}

// =================================================================
// MODALES: DETALLE, PUBLICACIÓN Y CONFIGURACIÓN SUPABASE
// =================================================================

function openDetailModal(id) {
  const product = AppState.allProducts.find(p => String(p.id) === String(id));
  if (!product) return;

  const modal = document.getElementById('detail-modal');
  const content = document.getElementById('detail-modal-content');

  const cleanPhone = (product.phone || '5492664000000').replace(/\D/g, '');
  const waText = encodeURIComponent(
    `¡Hola ${product.seller || ''}! Vi tu publicación en VM Hub San Luis sobre "${product.title}" (${formatPrice(product.price)}). ¿Aún sigue disponible?`
  );
  const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

  content.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 sm:p-8">
      <!-- Imagen ampliada -->
      <div class="space-y-4">
        <div class="rounded-2xl overflow-hidden bg-slate-100 aspect-square border border-slate-200 shadow-inner">
          <img 
            src="${product.image}" 
            alt="${escapeHtml(product.title)}"
            class="w-full h-full object-cover"
            onerror="this.src='https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=800&q=80'"
          />
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-navy-900 text-gold-300 text-xs font-bold rounded-full border border-gold-500/30">
            <i class="fas fa-tag text-gold-400"></i> ${escapeHtml(product.category)}
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-navy-950 text-xs font-bold rounded-full border border-slate-200">
            <i class="fas fa-map-marker-alt text-gold-600"></i> ${escapeHtml(product.city)}
          </span>
          ${product.address ? `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-gold-50 text-gold-800 text-xs font-bold rounded-full border border-gold-300">
              <i class="fas fa-location-dot text-gold-600"></i> ${escapeHtml(product.address)}
            </span>
          ` : ''}
          ${product.featured ? `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-300 via-gold-500 to-amber-600 text-navy-950 text-xs font-black rounded-full shadow-sm">
              <i class="fas fa-star text-[10px]"></i> Destacado
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Info del producto -->
      <div class="flex flex-col justify-between">
        <div>
          <div class="text-xs text-slate-400 mb-1 font-medium">Publicado el ${formatDate(product.date)}</div>
          <h2 class="text-2xl font-black text-navy-950 mb-2 leading-tight">${escapeHtml(product.title)}</h2>
          <div class="text-3xl font-black text-navy-950 mb-5 tracking-tight">${formatPrice(product.price)}</div>

          <div class="mb-5">
            <h4 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Descripción</h4>
            <p class="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-200">
              ${escapeHtml(product.description)}
            </p>
          </div>

          <!-- Datos del Vendedor -->
          <div class="bg-navy-950/5 rounded-2xl p-4 border border-navy-950/10 mb-6">
            <h4 class="text-xs font-extrabold text-navy-950 uppercase tracking-wider mb-2">Contacto Comercial</h4>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-navy-900 border border-gold-500/30 text-gold-300 font-extrabold flex items-center justify-center text-sm shadow">
                  ${(product.seller || 'V')[0].toUpperCase()}
                </div>
                <div>
                  <div class="font-extrabold text-navy-950 text-sm">${escapeHtml(product.seller || 'Vendedor local')}</div>
                  <div class="text-xs text-slate-500 flex items-center gap-1 font-medium"><i class="fas fa-shield-alt text-emerald-500"></i> Comercio / Vecino de San Luis</div>
                </div>
              </div>
              <span class="text-xs text-navy-900 font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                ${product.phone || 'Teléfono no especificado'}
              </span>
            </div>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="space-y-2.5">
          <a 
            href="${waUrl}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-[0.99] text-white font-black text-sm shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 border border-emerald-400/30"
          >
            <i class="fab fa-whatsapp text-lg"></i> Iniciar conversación por WhatsApp
          </a>

          <button 
            type="button" 
            onclick="closeDetailModal(); focusProductOnMap('${product.id}');"
            class="w-full py-2.5 px-4 rounded-xl bg-gold-50 hover:bg-gold-100 text-navy-950 font-bold text-xs border border-gold-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <i class="fas fa-map-location-dot text-gold-600"></i> Ver ubicación en el Mapa Interactivo
          </button>

          <button 
            type="button" 
            onclick="closeDetailModal()"
            class="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Cerrar detalle
          </button>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function openPublishModal() {
  const modal = document.getElementById('publish-modal');
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  initPublishMiniMap();
  initPublishAutocomplete();
}

function closePublishModal() {
  const modal = document.getElementById('publish-modal');
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  document.getElementById('publish-form').reset();
  document.getElementById('image-preview-container').classList.add('hidden');
  resetPublishMiniMap();
}

// Modal de Configuración Supabase
function openSupabaseModal() {
  const modal = document.getElementById('supabase-modal');
  const urlInput = document.getElementById('supabase-url-input');
  const keyInput = document.getElementById('supabase-key-input');
  const statusDiv = document.getElementById('supabase-modal-status');

  const { url, key } = getSupabaseCredentials();
  if (urlInput) urlInput.value = url;
  if (keyInput) keyInput.value = key;

  if (statusDiv) {
    statusDiv.classList.add('hidden');
    statusDiv.textContent = '';
  }

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeSupabaseModal() {
  const modal = document.getElementById('supabase-modal');
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

// Probar conexión con Supabase desde el modal
async function testSupabaseConnection() {
  const rawUrl = document.getElementById('supabase-url-input').value;
  const url = sanitizeSupabaseUrl(rawUrl);
  const key = document.getElementById('supabase-key-input').value.trim();
  const statusDiv = document.getElementById('supabase-modal-status');
  const testBtn = document.getElementById('supabase-test-btn');

  if (!url || !key) {
    statusDiv.className = 'p-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200';
    statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Por favor ingresa tanto la URL como la API Key.';
    statusDiv.classList.remove('hidden');
    return;
  }

  testBtn.disabled = true;
  testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Probando...';

  try {
    const testClient = window.supabase.createClient(url, key);
    const { data, error } = await testClient.from('products').select('id').limit(1);

    if (error) {
      statusDiv.className = 'p-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200';
      statusDiv.innerHTML = `<i class="fas fa-times-circle"></i> Error de conexión: ${escapeHtml(error.message)}. ¿Ya creaste la tabla 'products' en Supabase?`;
    } else {
      statusDiv.className = 'p-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200';
      statusDiv.innerHTML = '<i class="fas fa-check-circle text-emerald-600"></i> ¡Conexión exitosa con Supabase y la tabla \'products\'!';
    }
  } catch (err) {
    statusDiv.className = 'p-3 rounded-xl text-xs font-semibold flex items-center gap-2 bg-red-50 text-red-700 border border-red-200';
    statusDiv.innerHTML = `<i class="fas fa-times-circle"></i> Error al conectar: ${escapeHtml(err.message || 'Verifica la URL')}`;
  } finally {
    statusDiv.classList.remove('hidden');
    testBtn.disabled = false;
    testBtn.innerHTML = '<i class="fas fa-vial"></i> Probar Conexión';
  }
}

// Copiar script SQL al portapapeles
function copySqlScript() {
  const code = document.getElementById('sql-script-code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('copy-sql-btn');
    btn.innerHTML = '<i class="fas fa-check text-emerald-400"></i> ¡Copiado!';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-copy"></i> Copiar SQL';
    }, 2500);
  });
}

// Notificaciones Toast flotantes
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const iconContainer = document.getElementById('toast-icon-container');
  const icon = document.getElementById('toast-icon');

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;

  if (type === 'error') {
    iconContainer.className = 'w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs';
    icon.className = 'fas fa-exclamation-triangle';
  } else if (type === 'info') {
    iconContainer.className = 'w-8 h-8 rounded-full bg-gold-500/20 text-gold-300 flex items-center justify-center text-xs';
    icon.className = 'fas fa-info-circle';
  } else {
    iconContainer.className = 'w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs';
    icon.className = 'fas fa-check';
  }

  toast.classList.remove('translate-y-24', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0');
    toast.classList.remove('translate-y-0', 'opacity-100');
  }, 3500);
}

// =================================================================
// CONFIGURACIÓN DE EVENTOS DEL DOM
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Inicializar estado de Google Maps Platform
  updateGoogleMapsStatusUI();
  initMarketplaceMap();

  loadProducts();
  updateFavoritesBadge();

  // Búsqueda en vivo conectada a Supabase en tiempo real (ilike)
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleSearchInput(e.target.value);
    });
  }

  const mobileSearchInput = document.getElementById('mobile-search-input');
  if (mobileSearchInput) {
    mobileSearchInput.addEventListener('input', (e) => {
      handleSearchInput(e.target.value);
    });
  }

  // Filtro de ciudad
  const cityFilter = document.getElementById('city-filter');
  if (cityFilter) {
    cityFilter.addEventListener('change', (e) => {
      AppState.selectedCity = e.target.value;
      applyFilters();
      if (e.target.value !== 'all') {
        focusCity(e.target.value);
      }
    });
  }

  // Ordenamiento
  const sortFilter = document.getElementById('sort-filter');
  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      AppState.sortBy = e.target.value;
      applyFilters();
    });
  }

  // Filtro de favoritos toggle
  const favFilterBtn = document.getElementById('filter-favorites-btn');
  if (favFilterBtn) {
    favFilterBtn.addEventListener('click', () => {
      AppState.onlyFavorites = !AppState.onlyFavorites;
      if (AppState.onlyFavorites) {
        favFilterBtn.classList.add('bg-red-500', 'text-white', 'border-red-500');
        favFilterBtn.classList.remove('bg-[#0F1A34]', 'text-slate-300', 'border-[#1C2F5E]');
      } else {
        favFilterBtn.classList.remove('bg-red-500', 'text-white', 'border-red-500');
        favFilterBtn.classList.add('bg-[#0F1A34]', 'text-slate-300', 'border-[#1C2F5E]');
      }
      applyFilters();
    });
  }

  // Manejo de previsualización de imagen
  const imageFileInput = document.getElementById('product-image-file');
  const imageUrlInput = document.getElementById('product-image-url');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('image-preview');

  let base64Image = null;

  if (imageFileInput) {
    imageFileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          base64Image = event.target.result;
          previewImg.src = base64Image;
          previewContainer.classList.remove('hidden');
          if (imageUrlInput) imageUrlInput.value = '';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', function(e) {
      if (e.target.value.trim()) {
        base64Image = null;
        previewImg.src = e.target.value.trim();
        previewContainer.classList.remove('hidden');
        if (imageFileInput) imageFileInput.value = '';
      }
    });
  }

  // Formulario de guardar configuración de Supabase
  const supaForm = document.getElementById('supabase-config-form');
  if (supaForm) {
    supaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawUrl = document.getElementById('supabase-url-input').value;
      const url = sanitizeSupabaseUrl(rawUrl);
      const key = document.getElementById('supabase-key-input').value.trim();

      localStorage.setItem('sl_supabase_url', url);
      localStorage.setItem('sl_supabase_anon_key', key);

      closeSupabaseModal();
      showToast('Guardando credenciales e iniciando sincronización...');

      await loadProducts(true);
      showToast('¡Conexión establecida con Supabase! 🟢');
    });
  }

  // MANEJO DEL FORMULARIO DE PUBLICACIÓN
  const publishForm = document.getElementById('publish-form');
  const submitBtn = document.getElementById('publish-submit-btn');
  const submitText = document.getElementById('publish-submit-text');

  if (publishForm) {
    publishForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('prod-title').value.trim();
      const price = parseFloat(document.getElementById('prod-price').value);
      const category = document.getElementById('prod-category').value;
      const city = document.getElementById('prod-city').value;
      const address = (document.getElementById('prod-address')?.value || '').trim();
      const seller = document.getElementById('prod-seller').value.trim();
      const phone = document.getElementById('prod-phone').value.trim();
      const description = document.getElementById('prod-desc').value.trim();
      const urlVal = imageUrlInput ? imageUrlInput.value.trim() : '';

      const rawLat = document.getElementById('prod-lat')?.value;
      const rawLng = document.getElementById('prod-lng')?.value;
      let lat = (rawLat && !isNaN(parseFloat(rawLat))) ? parseFloat(rawLat) : null;
      let lng = (rawLng && !isNaN(parseFloat(rawLng))) ? parseFloat(rawLng) : null;

      // Si no se tocó el mini mapa, resolvemos las coordenadas base de la ciudad
      if (lat === null || lng === null) {
        const defaultCityCoords = CITY_COORDINATES[city] || CITY_COORDINATES['San Luis Capital'];
        lat = defaultCityCoords.lat;
        lng = defaultCityCoords.lng;
      }

      const image = base64Image || urlVal || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';

      // Cambiar estado a guardando
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Guardando en la nube...';

      const newProductPayload = {
        title,
        price,
        category,
        city,
        address,
        lat,
        lng,
        seller,
        phone,
        description,
        image,
        featured: false,
        estado: 'pendiente'
      };

      try {
        if (AppState.isSupabaseConnected && supabaseClient) {
          // GUARDADO DINÁMICO EN SUPABASE
          let { data, error } = await supabaseClient
            .from('products')
            .insert([newProductPayload])
            .select();

          if (error) {
            // Si la columna lat o address no existen todavía en Supabase, reintentamos con payload básico
            if (error.message && (
              error.message.toLowerCase().includes('lat') ||
              error.message.toLowerCase().includes('address') ||
              error.message.toLowerCase().includes('estado') ||
              error.code === 'PGRST204' || error.code === '42703'
            )) {
              console.warn("Columnas extendidas no detectadas en Supabase. Reintentando con esquema adaptativo...");
              const fallbackPayload = {
                title,
                price,
                category,
                city,
                seller,
                phone,
                description,
                image,
                featured: false
              };
              if (hasEstadoColumn) fallbackPayload.estado = 'pendiente';
              const retry = await supabaseClient.from('products').insert([fallbackPayload]).select();
              if (retry.error) throw retry.error;
            } else {
              throw error;
            }
          }

          // Mensaje de confirmación de moderación
          showToast('¡Gracias por publicar! Tu anuncio y ubicación están en revisión y se activarán en breve.', 'info');

          // Refrescar la lista pública
          await loadProducts(false);
        } else {
          // GUARDADO DE RESPALDO EN LOCALSTORAGE (modo offline)
          const localItem = {
            id: 'user-prod-' + Date.now(),
            ...newProductPayload,
            date: new Date().toISOString()
          };
          const userProducts = JSON.parse(localStorage.getItem('sl_user_products') || '[]');
          userProducts.unshift(localItem);
          localStorage.setItem('sl_user_products', JSON.stringify(userProducts));
          showToast('¡Gracias por publicar! Tu anuncio y ubicación se guardaron localmente.');
        }

        base64Image = null;
        closePublishModal();
        updateCategoryBadges();
        applyFilters();

      } catch (err) {
        console.error('Error al guardar aviso:', err);
        showToast('Error al guardar en Supabase: ' + (err.message || 'Intente nuevamente'), 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Publicar Aviso';
      }
    });
  }

  // Tecla Escape para cerrar modales
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetailModal();
      closePublishModal();
      closeSupabaseModal();
      closeGoogleMapsModal();
    }
  });
});
