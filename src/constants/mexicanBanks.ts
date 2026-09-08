export type MexicanBankId =
  | 'bbva'
  | 'banorte'
  | 'santander'
  | 'banamex'
  | 'nu'
  | 'mercadopago'
  | 'hsbc'
  | 'scotiabank'
  | 'azteca'
  | 'banregio'
  | 'heybanco'
  | 'inbursa'
  | 'spin'
  | 'amex'
  | 'visa'
  | 'mastercard'
  | 'binance'
  | 'revolut'
  | 'generic';

export interface BankDefinition {
  id: MexicanBankId;
  name: string;
  shortName: string;
  brandColor: string;
  badgeBg: string;
  keywords: string[];
  creditCards: string[];
  debitCards: string[];
}

export const MEXICAN_BANKS: BankDefinition[] = [
  {
    id: 'bbva',
    name: 'BBVA México',
    shortName: 'BBVA',
    brandColor: '#004481',
    badgeBg: '#042C54',
    keywords: ['bbva', 'bancomer', 'bbva bancomer', 'azul'],
    creditCards: [
      'Tarjeta Azul BBVA',
      'Tarjeta Oro BBVA',
      'Tarjeta Platinum BBVA',
      'Tarjeta Infinite BBVA',
      'Tarjeta Crea BBVA',
      'Tarjeta Mi Primera Tarjeta BBVA',
      'Tarjeta IPN BBVA',
      'Tarjeta Afinidad UNAM BBVA',
      'Tarjeta Vive BBVA',
    ],
    debitCards: [
      'Libretón Básico / Digital BBVA',
      'Libretón Premium BBVA',
      'Nómina BBVA',
      'Link Card BBVA',
      'Maestra Patrimonial BBVA',
    ],
  },
  {
    id: 'banorte',
    name: 'Banorte',
    shortName: 'Banorte',
    brandColor: '#EB0029',
    badgeBg: '#4A0810',
    keywords: ['banorte', 'ixe', 'fuerte'],
    creditCards: [
      'Tarjeta Banorte Por Ti',
      'Tarjeta Clásica Banorte',
      'Tarjeta Oro Banorte',
      'Tarjeta Platinum Banorte',
      'Tarjeta Infinite Banorte',
      'Tarjeta Mujer Banorte',
      'Tarjeta AT&T Elite Banorte',
      'Tarjeta Marriott Bonvoy Banorte',
    ],
    debitCards: [
      'Cuenta Enlace Digital Banorte',
      'Cuenta Mujer Banorte',
      'Suma Menores Banorte',
      'Nómina Banorte',
    ],
  },
  {
    id: 'santander',
    name: 'Santander',
    shortName: 'Santander',
    brandColor: '#EC0000',
    badgeBg: '#450608',
    keywords: ['santander', 'serfin', 'supernet'],
    creditCards: [
      'Tarjeta LikeU Santander',
      'Fiesta Rewards Clásica',
      'Fiesta Rewards Oro',
      'Fiesta Rewards Platino',
      'Aeroméxico Blanca Santander',
      'Aeroméxico Platinum Santander',
      'Aeroméxico Infinite Santander',
      'Black Unlimited Santander',
    ],
    debitCards: [
      'Débito LikeU Santander',
      'Cuenta Digital SuperNómina',
      'Cuenta Select Santander',
    ],
  },
  {
    id: 'banamex',
    name: 'Banamex',
    shortName: 'Banamex',
    brandColor: '#E60045',
    badgeBg: '#450014',
    keywords: ['banamex', 'citibanamex', 'citi', 'perfiles'],
    creditCards: [
      'Tarjeta Joy Citibanamex',
      'Tarjeta Clásica Citibanamex',
      'Tarjeta Oro Citibanamex',
      'Tarjeta Platinum Citibanamex',
      'Tarjeta Citibanamex Rewards',
      'Tarjeta Citibanamex Premier',
      'Tarjeta Citibanamex Prestige',
      'Tarjeta Costco Citibanamex',
    ],
    debitCards: [
      'MiCuenta Citibanamex',
      'Cuenta Priority Citibanamex',
      'Débito Digital Citibanamex',
    ],
  },
  {
    id: 'nu',
    name: 'Nu México',
    shortName: 'Nu',
    brandColor: '#820AD1',
    badgeBg: '#2D064A',
    keywords: ['nu', 'nubank', 'moradita', 'cuenta nu', 'cajita'],
    creditCards: [
      'Tarjeta de Crédito Nu (Mastercard Gold)',
      'Tarjeta de Crédito Nu (Mastercard Platinum)',
    ],
    debitCards: [
      'Cuenta Nu (Débito con Cajitas)',
    ],
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    shortName: 'Mercado Pago',
    brandColor: '#009EE3',
    badgeBg: '#04354D',
    keywords: ['mercado pago', 'mercadopago', 'mp', 'meli', 'mercado libre'],
    creditCards: [
      'Tarjeta de Crédito Mercado Pago Visa',
    ],
    debitCards: [
      'Tarjeta Débito Mercado Pago Wallet',
    ],
  },
  {
    id: 'hsbc',
    name: 'HSBC México',
    shortName: 'HSBC',
    brandColor: '#DB0011',
    badgeBg: '#3E080B',
    keywords: ['hsbc', 'premier'],
    creditCards: [
      'HSBC 2Now (2% Cashback)',
      'HSBC Zero (Sin Anualidad)',
      'HSBC Air (Tasa Baja)',
      'HSBC Viva',
      'HSBC Viva Plus',
      'HSBC Advance Platinum',
      'HSBC Premier World Elite',
    ],
    debitCards: [
      'HSBC Flexible Débito',
      'HSBC Stilo Digital',
      'Nómina HSBC',
      'Premier Débito HSBC',
    ],
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank',
    shortName: 'Scotiabank',
    brandColor: '#ED0722',
    badgeBg: '#45070D',
    keywords: ['scotia', 'scotiabank', 'inverlat'],
    creditCards: [
      'Tarjeta Scotia IDEAL',
      'Scotia Travel Clásica',
      'Scotia Travel Oro',
      'Scotia Travel Platinum',
      'Scotia Travel World Elite',
    ],
    debitCards: [
      'ScotiaWeb Básica',
      'Cuenta Scotia Débito',
      'Cuenta Scotia Premium',
    ],
  },
  {
    id: 'azteca',
    name: 'Banco Azteca',
    shortName: 'Azteca',
    brandColor: '#007934',
    badgeBg: '#032B13',
    keywords: ['azteca', 'banco azteca', 'guardadito', 'elektra'],
    creditCards: [
      'Tarjeta Azteca Oro',
      'Tarjeta Azteca ABC',
      'Tarjeta Vas Banco Azteca',
    ],
    debitCards: [
      'Guardadito Digital Azteca',
      'Guardadito Cheques',
      'Somos Débito Azteca',
    ],
  },
  {
    id: 'banregio',
    name: 'Banregio',
    shortName: 'Banregio',
    brandColor: '#FF6B00',
    badgeBg: '#4D2000',
    keywords: ['banregio', 'regio', 'regional'],
    creditCards: [
      'Tarjeta Más Banregio',
      'Tarjeta Banregio Platinum',
      'Tarjeta Banregio Gold',
      'Tarjeta Banregio Clásica',
      'Tarjeta Naranja Banregio',
    ],
    debitCards: [
      'Cuenta Naranja Digital',
      'Mi Cuenta Débito Banregio',
    ],
  },
  {
    id: 'heybanco',
    name: 'Hey Banco',
    shortName: 'Hey',
    brandColor: '#111111',
    badgeBg: '#262626',
    keywords: ['hey', 'hey banco', 'heybanco'],
    creditCards: [
      'Hey Crédito Tradicional',
      'Hey Garantizada',
      'Hey Pro Crédito',
    ],
    debitCards: [
      'Cuenta Hey Débito',
      'Cuenta Hey Smart',
    ],
  },
  {
    id: 'inbursa',
    name: 'Inbursa',
    shortName: 'Inbursa',
    brandColor: '#012148',
    badgeBg: '#01152E',
    keywords: ['inbursa', 'slim', 'sanborns'],
    creditCards: [
      'Tarjeta Clásica Inbursa',
      'Tarjeta Oro Inbursa',
      'Tarjeta Platino Inbursa',
      'Tarjeta Sam\'s Club Inbursa',
      'Tarjeta Walmart Inbursa',
      'Tarjeta Sanborns Inbursa',
      'Tarjeta Black AMEX Inbursa',
    ],
    debitCards: [
      'Cuenta Sanborns Débito',
      'Cuenta Ct Inbursa',
      'Cuenta Digital Efe',
    ],
  },
  {
    id: 'spin',
    name: 'Spin by OXXO',
    shortName: 'Spin',
    brandColor: '#5E2D91',
    badgeBg: '#2A1442',
    keywords: ['spin', 'spin by oxxo', 'oxxo', 'spin premia'],
    creditCards: [
      'Tarjeta Spin Más Crédito',
    ],
    debitCards: [
      'Tarjeta Débito Spin Visa',
    ],
  },
  {
    id: 'amex',
    name: 'American Express',
    shortName: 'AMEX',
    brandColor: '#006FCF',
    badgeBg: '#02294A',
    keywords: ['amex', 'american express', 'american', 'centurion'],
    creditCards: [
      'The Gold Elite Credit Card AMEX',
      'The Platinum Credit Card AMEX',
      'Tarjeta Blue AMEX',
      'The Green Card American Express',
      'The Gold Card American Express',
      'The Platinum Card American Express',
    ],
    debitCards: [
      'Cuenta Débito Alianzas AMEX',
    ],
  },
  {
    id: 'visa',
    name: 'Visa',
    shortName: 'Visa',
    brandColor: '#1A1F71',
    badgeBg: '#0A0C2E',
    keywords: ['visa', 'debito visa', 'credito visa'],
    creditCards: [
      'Visa Clásica',
      'Visa Oro',
      'Visa Platinum',
      'Visa Signature',
      'Visa Infinite',
    ],
    debitCards: [
      'Visa Débito Clásica',
      'Visa Débito Platinum',
    ],
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    shortName: 'Mastercard',
    brandColor: '#1F1F1F',
    badgeBg: '#2B2B2B',
    keywords: ['mastercard', 'master card', 'mc'],
    creditCards: [
      'Mastercard Standard',
      'Mastercard Gold',
      'Mastercard Platinum',
      'Mastercard Black / World Elite',
    ],
    debitCards: [
      'Mastercard Débito Standard',
      'Mastercard Débito Platinum',
    ],
  },
  {
    id: 'binance',
    name: 'Binance',
    shortName: 'Binance',
    brandColor: '#F3BA2F',
    badgeBg: '#473507',
    keywords: ['binance', 'crypto', 'usdt', 'btc', 'bitcoin'],
    creditCards: [
      'Binance Card Crédito (Crypto)',
    ],
    debitCards: [
      'Binance Card Débito (Crypto)',
    ],
  },
  {
    id: 'revolut',
    name: 'Revolut México',
    shortName: 'Revolut',
    brandColor: '#FFFFFF',
    badgeBg: '#E2E8F0',
    keywords: ['revolut', 'revo', 'revolut mexico', 'revolut bank'],
    creditCards: [
      'Tarjeta Revolut Crédito',
    ],
    debitCards: [
      'Cuenta Estándar Revolut Débito',
      'Cuenta Premium Revolut Débito',
      'Cuenta Metal Revolut Débito',
    ],
  },
  {
    id: 'generic',
    name: 'Otra Institución / Efectivo',
    shortName: 'Otro',
    brandColor: '#1E1E1E',
    badgeBg: '#2E2E2E',
    keywords: ['efectivo', 'caja', 'otro', 'personal'],
    creditCards: [
      'Tarjeta de Crédito Clásica',
      'Tarjeta de Crédito Oro',
      'Tarjeta de Crédito Platino',
      'Tarjeta Departamental',
    ],
    debitCards: [
      'Tarjeta de Débito Bancaria',
      'Cuenta de Nómina',
      'Cuenta Digital',
    ],
  },
];

export const getBankDefinition = (bankId?: string | null): BankDefinition => {
  if (!bankId) return MEXICAN_BANKS.find((b) => b.id === 'generic')!;
  const found = MEXICAN_BANKS.find((b) => b.id.toLowerCase() === bankId.toLowerCase());
  return found || MEXICAN_BANKS.find((b) => b.id === 'generic')!;
};

export const detectBankFromName = (accountName?: string | null): MexicanBankId => {
  if (!accountName || !accountName.trim()) return 'generic';

  const normalized = accountName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // 1. Direct short name and ID match
  for (const bank of MEXICAN_BANKS) {
    if (bank.id === 'generic') continue;
    if (normalized === bank.id || normalized === bank.shortName.toLowerCase()) {
      return bank.id;
    }
  }

  // 2. Keyword exact token / substring match
  for (const bank of MEXICAN_BANKS) {
    if (bank.id === 'generic') continue;
    for (const kw of bank.keywords) {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const regex = new RegExp(`\\b${normKw}\\b`, 'i');
      if (regex.test(normalized) || normalized.includes(normKw)) {
        return bank.id;
      }
    }
  }

  return 'generic';
};

export const ACCOUNT_NAME_SUGGESTIONS = [
  'Principal',
  'Nómina',
  'Gastos',
  'Personal',
];

export const cleanAccountDisplayName = (
  accountName: string,
  bankId?: string | null
): string => {
  if (!accountName || !accountName.trim()) return 'CUENTA';
  const trimmed = accountName.trim();
  const bank = getBankDefinition(bankId || detectBankFromName(accountName));

  if (bank.id === 'generic') {
    return trimmed.toUpperCase();
  }

  const normName = trimmed.toLowerCase();
  const normBankName = bank.name.toLowerCase();
  const normShortName = bank.shortName.toLowerCase();

  // If the account name exactly matches the bank name or short name
  if (normName === normBankName || normName === normShortName) {
    return 'CUENTA PRINCIPAL';
  }

  // Remove leading bank name or short name if present (e.g. "Scotiabank Débito" -> "Débito")
  const escapedBank = normBankName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedShort = normShortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^(${escapedBank}|${escapedShort})\\s*[-:/]?\\s*`, 'i');
  const stripped = trimmed.replace(pattern, '').trim();

  if (stripped.length > 0) {
    return stripped.toUpperCase();
  }

  return trimmed.toUpperCase();
};

export const getBankCreditCards = (bankId?: string | null): string[] => {
  const bank = getBankDefinition(bankId);
  return bank.creditCards || [];
};

export const getBankDebitCards = (bankId?: string | null): string[] => {
  const bank = getBankDefinition(bankId);
  return bank.debitCards || [];
};
