/**
 * AyeFinance — Intelligent Category Auto-Classification Rules & Catalog
 * Single Source of Truth for automatic transaction categorization ("Libro de Categorías").
 * Precision Atelier Level Architecture.
 */

export interface CategoryRule {
  id: string;
  name: string;
  color: string;
  badgeBg: string;
  description: string;
  keywords: string[];
}

export const CATEGORY_RULES: CategoryRule[] = [
  {
    id: 'combustible',
    name: 'Combustible',
    color: '#FE9D01',
    badgeBg: 'rgba(254, 157, 1, 0.15)',
    description: 'Gasolineras, combustible, gas LP y estaciones de servicio',
    keywords: [
      'gasolina',
      'gasolinera',
      'combustible',
      'diesel',
      'magna',
      'premium',
      'gas lp',
      'gas natural',
      'combugas',
      'tanque de gas',
      'pemex',
      'bp',
      'shell',
      'mobil',
      'g500',
      'repsol',
      'hidrosina',
      'oxxo gas',
      'oxxogas',
      'chevron',
      'totalenergies',
      'total energies',
      'valero',
      'gulf',
      'petro seven',
      'petroseven',
      'rendichicas',
      'servifacil',
      'costco gas',
      'gasmart',
      'gasomex',
      'gas express nieto',
      'estacion de servicio',
    ],
  },
  {
    id: 'transporte',
    name: 'Transporte',
    color: '#3B82F6',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    description: 'Taxis, aplicaciones de movilidad, metro, vuelos, casetas y peajes',
    keywords: [
      'uber',
      'didi',
      'cabify',
      'indrive',
      'in drive',
      'beat',
      'taxi',
      'radiotaxi',
      'metro',
      'metrobus',
      'suburbano',
      'tren ligero',
      'cablebus',
      'camion',
      'pesero',
      'colectivo',
      'combi',
      'rtp',
      'ado',
      'etn',
      'primera plus',
      'autovias',
      'omnibus de mexico',
      'futura',
      'autobus',
      'aeromexico',
      'volaris',
      'vivaaerobus',
      'viva aerobus',
      'avion',
      'vuelo',
      'boletos de avion',
      'aeropuerto',
      'caseta',
      'capufe',
      'tag telepass',
      'tag pase',
      'pase urbano',
      'tag televia',
      'televia',
      'viapass',
      'estacionamiento',
      'parquimetro',
      'parkimovil',
      'ecobici',
      'lime',
      'bird',
    ],
  },
  {
    id: 'supermercado',
    name: 'Supermercado',
    color: '#10B981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    description: 'Supermercados, clubes de precio, tiendas de conveniencia y abarrotes',
    keywords: [
      'supermercado',
      'super',
      'despensa',
      'walmart express',
      'walmart',
      'aurrera',
      'bodega aurrera',
      'mi bodega aurrera',
      'chedraui selecto',
      'chedraui',
      'soriana hiper',
      'soriana super',
      'soriana',
      'la comer',
      'fresko',
      'city market',
      'h-e-b',
      'heb',
      'costco',
      'sam\'s club',
      'sam\'s',
      'sams',
      'oxxo',
      '7-eleven',
      '7 eleven',
      'seven eleven',
      'circle k',
      'tiendas extra',
      'kiosko',
      'abarrotes',
      'carniceria',
      'fruteria',
      'verduleria',
      'polleria',
      'pescaderia',
      'tortilleria',
      'recauderia',
      'cremeria',
      'tiendita',
      'superama',
    ],
  },
  {
    id: 'comida',
    name: 'Comida',
    color: '#EF4444',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    description: 'Restaurantes, cafeterías, delivery y alimentos preparados',
    keywords: [
      'uber eats',
      'ubereats',
      'didi food',
      'didifood',
      'rappi',
      'mcdonalds',
      'mc donalds',
      'burger king',
      'kfc',
      'kentucky',
      'starbucks',
      'carls jr',
      'carl\'s jr',
      'subway',
      'wendys',
      'churchs',
      'little caesars',
      'dominos',
      'domino\'s',
      'pizza hut',
      'pizza',
      'sushi',
      'sushito',
      'toks',
      'vips',
      'sanborns',
      'el globo',
      'pasteleria',
      'panaderia la esperanza',
      'la esperanza',
      'le caroz',
      'panaderia',
      'nutrisa',
      'dairy queen',
      'santa clara',
      'michoacana',
      'helado',
      'heladeria',
      'alitas',
      'wings',
      'wingstop',
      'buffalo wild wings',
      'hamburguesa',
      'mariscos',
      'marisqueria',
      'restaurante',
      'taqueria',
      'tacos',
      'fondita',
      'antojitos',
      'buffet',
      'cafeteria',
      'cafe',
      'desayuno',
      'almuerzo',
      'comida',
      'cena',
      'lonche',
    ],
  },
  {
    id: 'servicios',
    name: 'Servicios',
    color: '#6366F1',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    description: 'Electricidad, agua, telecomunicaciones, renta y servicios domésticos',
    keywords: [
      'recibo cfe',
      'cfe',
      'luz',
      'agua',
      'sacmex',
      'cespt',
      'siapa',
      'interapas',
      'aguakan',
      'internet',
      'telmex',
      'infinitum',
      'izzi',
      'totalplay',
      'total play',
      'megacable',
      'dish',
      'sky',
      'starlink',
      'renta',
      'alquiler',
      'predial',
      'mantenimiento depa',
      'cuota de mantenimiento',
      'naturgy',
      'gas natural fenosa',
      'telcel',
      'movistar',
      'at&t',
      'att',
      'unefon',
      'bait',
      'virgin mobile',
      'recarga cel',
      'recarga telcel',
      'recarga movistar',
      'recarga saldo',
      'tiempo aire',
    ],
  },
  {
    id: 'entretenimiento',
    name: 'Entretenimiento',
    color: '#A855F7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    description: 'Streaming, cine, videojuegos, conciertos y eventos culturales',
    keywords: [
      'netflix',
      'spotify',
      'amazon prime',
      'prime video',
      'disney+',
      'disney plus',
      'disney',
      'apple tv',
      'apple music',
      'youtube premium',
      'youtube music',
      'youtube',
      'crunchyroll',
      'paramount+',
      'paramount',
      'deezer',
      'tidal',
      'hbo',
      'max',
      'cinepolis',
      'cinemex',
      'cinedot',
      'cine',
      'steam',
      'playstation',
      'ps plus',
      'psn',
      'game pass',
      'xbox',
      'nintendo',
      'eshop',
      'epic games',
      'riot games',
      'blizzard',
      'ticketmaster',
      'eticket',
      'boletia',
      'concierto',
      'festival',
      'teatro',
      'museo',
      'six flags',
    ],
  },
  {
    id: 'salud',
    name: 'Salud',
    color: '#14B8A6',
    badgeBg: 'rgba(20, 184, 166, 0.15)',
    description: 'Farmacias, consultas médicas, laboratorios, hospitales y gimnasio',
    keywords: [
      'farmacias del ahorro',
      'farmacia del ahorro',
      'farmacias guadalajara',
      'farmacia guadalajara',
      'farmacia san pablo',
      'san pablo',
      'benavides',
      'farmacias similares',
      'similares',
      'farmacia',
      'doctor',
      'medico',
      'dentista',
      'dental',
      'oftalmologo',
      'consulta medica',
      'consulta',
      'hospital',
      'clinica',
      'laboratorio medico del chopo',
      'laboratorio',
      'chopo',
      'salud digna',
      'medicamento',
      'medicamentos',
      'medicina',
      'pastillas',
      'jarabe',
      'lentes',
      'optica',
      'devlyn',
      'psicologo',
      'terapia',
      'smart fit',
      'smartfit',
      'sports world',
      'anytime fitness',
      'crossfit',
      'yoga',
      'gym',
      'gimnasio',
    ],
  },
  {
    id: 'compras',
    name: 'Compras',
    color: '#EC4899',
    badgeBg: 'rgba(236, 72, 153, 0.15)',
    description: 'Comercio electrónico, ropa, calzado, departamentales y tecnología',
    keywords: [
      'mercado libre',
      'mercadolibre',
      'amazon',
      'liverpool',
      'palacio de hierro',
      'sears',
      'coppel',
      'elektra',
      'suburbia',
      'zara',
      'h&m',
      'shein',
      'pull&bear',
      'bershka',
      'stradivarius',
      'massimo dutti',
      'mango',
      'c&a',
      'nike',
      'adidas',
      'puma',
      'innovasport',
      'marti',
      'taf',
      'ropa',
      'calzado',
      'zapatos',
      'tenis',
      'aliexpress',
      'temu',
      'office depot',
      'officemax',
      'home depot',
      'steren',
      'apple store',
      'ishop',
      'macstore',
      'samsung',
    ],
  },
  {
    id: 'educacion',
    name: 'Educación',
    color: '#0EA5E9',
    badgeBg: 'rgba(14, 165, 233, 0.15)',
    description: 'Colegiaturas, cursos en línea, talleres, universidades y libros',
    keywords: [
      'colegiatura',
      'inscripcion',
      'colegio',
      'escuela',
      'universidad',
      'instituto',
      'facultad',
      'kinder',
      'udemy',
      'platzi',
      'coursera',
      'edx',
      'duolingo',
      'open english',
      'domestika',
      'crehana',
      'diplomado',
      'curso',
      'taller',
      'clases',
      'libros',
      'libreria gandhi',
      'libreria',
      'gandhi',
      'porrua',
      'el sotano',
      'papeleria',
    ],
  },
  {
    id: 'viajes',
    name: 'Viajes',
    color: '#F97316',
    badgeBg: 'rgba(249, 115, 22, 0.15)',
    description: 'Hoteles, hospedajes, alquiler vacacional y paquetes turísticos',
    keywords: [
      'airbnb',
      'booking',
      'expedia',
      'despegar',
      'trivago',
      'hoteles.com',
      'hotel',
      'hostal',
      'hospedaje',
      'resort',
      'viaje',
      'vacaciones',
      'tours',
    ],
  },
  {
    id: 'mascotas',
    name: 'Mascotas',
    color: '#8B5CF6',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    description: 'Veterinarias, alimento para mascotas y accesorios animales',
    keywords: [
      'veterinaria',
      'veterinario',
      'petco',
      'petland',
      'croquetas',
      'alimento mascota',
      'perro',
      'gato',
      'mascota',
      'mascotas',
      'estetica canina',
    ],
  },
  {
    id: 'cuidado_personal',
    name: 'Cuidado Personal',
    color: '#F43F5E',
    badgeBg: 'rgba(244, 63, 94, 0.15)',
    description: 'Barberías, estéticas, spas, uñas, perfumes y cosméticos',
    keywords: [
      'barberia',
      'peluqueria',
      'estetica',
      'salon de belleza',
      'corte de pelo',
      'corte de cabello',
      'unas',
      'manicure',
      'pedicure',
      'spa',
      'masaje',
      'sephora',
      'sally beauty',
      'cosmeticos',
      'perfume',
      'perfumeria',
    ],
  },
  {
    id: 'finanzas',
    name: 'Finanzas',
    color: '#EAB308',
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    description: 'Inversiones, seguros, rendimientos, CETES y pólizas',
    keywords: [
      'cetesdirecto',
      'cetes',
      'gbm',
      'finsus',
      'klar',
      'nu',
      'stori',
      'mercado pago',
      'fondos de inversion',
      'acciones',
      'dividendo',
      'intereses',
      'prestamo',
      'hipoteca',
      'seguro de auto',
      'seguro de gastos medicos',
      'seguro de vida',
      'seguro',
      'seguros',
      'gnp',
      'axa',
      'metlife',
      'mapfre',
      'qualitas',
      'sgmm',
      'inversion',
    ],
  },
  {
    id: 'ingresos',
    name: 'Ingresos',
    color: '#22C55E',
    badgeBg: 'rgba(34, 197, 94, 0.15)',
    description: 'Nómina, sueldos, honorarios, ventas y depósitos',
    keywords: [
      'nomina',
      'sueldo',
      'salario',
      'quincena',
      'honorarios',
      'freelance',
      'aguinaldo',
      'bono',
      'utilidades',
      'comision',
      'deposito',
      'reembolso',
      'pago de cliente',
      'ingreso',
    ],
  },
  {
    id: 'pago_tarjeta',
    name: 'Pago de Tarjeta',
    color: '#06B6D4',
    badgeBg: 'rgba(6, 182, 212, 0.15)',
    description: 'Pagos para no generar intereses, abonos y liquidación de TDC',
    keywords: [
      'pago de tarjeta',
      'pago tarjeta',
      'pago tdc',
      'pago tc',
      'liquidar tarjeta',
      'pago credito',
      'abono tarjeta',
      'pago minimo tdc',
    ],
  },
  {
    id: 'impuestos',
    name: 'Impuestos',
    color: '#64748B',
    badgeBg: 'rgba(100, 116, 139, 0.15)',
    description: 'SAT, impuestos federales/estatales, tenencia, refrendos y multas',
    keywords: [
      'declaracion sat',
      'sat',
      'impuesto',
      'impuestos',
      'iva',
      'isr',
      'tenencia',
      'refrendo',
      'licencia de conducir',
      'pasaporte',
      'multa',
      'infraccion',
      'tramite',
    ],
  },
];

export const STANDARD_CATEGORIES: string[] = CATEGORY_RULES.map((r) => r.name);

/**
 * Normalizes text: lowercase, remove accents/diacritics, strip special chars
 */
export function normalizeRuleText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Pre-flattened keyword lookup table sorted by keyword length descending
 * so multi-word keywords match before single-word subsets (e.g. 'uber eats' before 'uber').
 */
interface FlatKeywordEntry {
  keyword: string;
  normalizedKeyword: string;
  isMultiWord: boolean;
  rule: CategoryRule;
}

const FLATTENED_KEYWORD_ENTRIES: FlatKeywordEntry[] = (() => {
  const entries: FlatKeywordEntry[] = [];
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      const norm = normalizeRuleText(kw);
      if (norm) {
        entries.push({
          keyword: kw,
          normalizedKeyword: norm,
          isMultiWord: norm.includes(' '),
          rule,
        });
      }
    }
  }
  // Sort descending by length so longer phrases have higher priority
  return entries.sort((a, b) => b.normalizedKeyword.length - a.normalizedKeyword.length);
})();

export interface PredictionResult {
  category: string;
  ruleId: string;
  matchedKeyword: string;
  color: string;
  badgeBg: string;
}

/**
 * Predicts the most accurate category based on the concept / description entered by the user.
 * Returns the matching CategoryRule result or null if no rule matched.
 */
export function predictCategory(concept: string): PredictionResult | null {
  if (!concept || typeof concept !== 'string') return null;

  const normalizedInput = normalizeRuleText(concept);
  if (!normalizedInput || normalizedInput.length < 2) return null;

  const tokens = normalizedInput.split(' ').filter(Boolean);

  for (const entry of FLATTENED_KEYWORD_ENTRIES) {
    const kw = entry.normalizedKeyword;

    if (entry.isMultiWord) {
      // For multi-word phrases, check if input contains the phrase
      if (normalizedInput.includes(kw)) {
        return {
          category: entry.rule.name,
          ruleId: entry.rule.id,
          matchedKeyword: entry.keyword,
          color: entry.rule.color,
          badgeBg: entry.rule.badgeBg,
        };
      }
    } else {
      // For single words:
      // 1. Direct exact match in tokens (handles "uber", "gasolina", "chedraui")
      if (tokens.includes(kw)) {
        return {
          category: entry.rule.name,
          ruleId: entry.rule.id,
          matchedKeyword: entry.keyword,
          color: entry.rule.color,
          badgeBg: entry.rule.badgeBg,
        };
      }

      // 2. Exact word boundaries via regex, also checking common plural endings (-s, -es)
      const regex = new RegExp(`(?:^|\\s)${kw}(?:s|es)?(?:\\s|$)`, 'i');
      if (regex.test(normalizedInput)) {
        return {
          category: entry.rule.name,
          ruleId: entry.rule.id,
          matchedKeyword: entry.keyword,
          color: entry.rule.color,
          badgeBg: entry.rule.badgeBg,
        };
      }
    }
  }

  return null;
}

/**
 * Returns the visual styling properties for a category name
 */
export function getCategoryVisuals(categoryName: string): { color: string; badgeBg: string } {
  const norm = normalizeRuleText(categoryName);
  const rule = CATEGORY_RULES.find((r) => normalizeRuleText(r.name) === norm);
  if (rule) {
    return { color: rule.color, badgeBg: rule.badgeBg };
  }
  return { color: '#FE9D01', badgeBg: 'rgba(254, 157, 1, 0.15)' };
}
