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
  | 'generic';

export interface BankDefinition {
  id: MexicanBankId;
  name: string;
  shortName: string;
  brandColor: string;
  badgeBg: string;
  keywords: string[];
}

export const MEXICAN_BANKS: BankDefinition[] = [
  {
    id: 'bbva',
    name: 'BBVA México',
    shortName: 'BBVA',
    brandColor: '#004481',
    badgeBg: '#042C54',
    keywords: ['bbva', 'bancomer', 'bbva bancomer', 'azul'],
  },
  {
    id: 'banorte',
    name: 'Banorte',
    shortName: 'Banorte',
    brandColor: '#EB0029',
    badgeBg: '#4A0810',
    keywords: ['banorte', 'ixe', 'fuerte'],
  },
  {
    id: 'santander',
    name: 'Santander',
    shortName: 'Santander',
    brandColor: '#EC0000',
    badgeBg: '#450608',
    keywords: ['santander', 'serfin', 'supernet'],
  },
  {
    id: 'banamex',
    name: 'Banamex',
    shortName: 'Banamex',
    brandColor: '#E60045',
    badgeBg: '#450014',
    keywords: ['banamex', 'citibanamex', 'citi', 'perfiles'],
  },
  {
    id: 'nu',
    name: 'Nu México',
    shortName: 'Nu',
    brandColor: '#820AD1',
    badgeBg: '#2D064A',
    keywords: ['nu', 'nubank', 'moradita', 'cuenta nu', 'cajita'],
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    shortName: 'Mercado Pago',
    brandColor: '#009EE3',
    badgeBg: '#04354D',
    keywords: ['mercado pago', 'mercadopago', 'mp', 'meli', 'mercado libre'],
  },
  {
    id: 'hsbc',
    name: 'HSBC México',
    shortName: 'HSBC',
    brandColor: '#DB0011',
    badgeBg: '#3E080B',
    keywords: ['hsbc', 'premier'],
  },
  {
    id: 'scotiabank',
    name: 'Scotiabank',
    shortName: 'Scotiabank',
    brandColor: '#ED0722',
    badgeBg: '#45070D',
    keywords: ['scotia', 'scotiabank', 'inverlat'],
  },
  {
    id: 'azteca',
    name: 'Banco Azteca',
    shortName: 'Azteca',
    brandColor: '#007934',
    badgeBg: '#032B13',
    keywords: ['azteca', 'banco azteca', 'guardadito', 'elektra'],
  },
  {
    id: 'banregio',
    name: 'Banregio',
    shortName: 'Banregio',
    brandColor: '#FF6B00',
    badgeBg: '#4D2000',
    keywords: ['banregio', 'regio', 'regional'],
  },
  {
    id: 'heybanco',
    name: 'Hey Banco',
    shortName: 'Hey',
    brandColor: '#111111',
    badgeBg: '#262626',
    keywords: ['hey', 'hey banco', 'heybanco'],
  },
  {
    id: 'inbursa',
    name: 'Inbursa',
    shortName: 'Inbursa',
    brandColor: '#012148',
    badgeBg: '#01152E',
    keywords: ['inbursa', 'slim', 'sanborns'],
  },
  {
    id: 'spin',
    name: 'Spin by OXXO',
    shortName: 'Spin',
    brandColor: '#5E2D91',
    badgeBg: '#2A1442',
    keywords: ['spin', 'spin by oxxo', 'oxxo', 'spin premia'],
  },
  {
    id: 'amex',
    name: 'American Express',
    shortName: 'AMEX',
    brandColor: '#006FCF',
    badgeBg: '#02294A',
    keywords: ['amex', 'american express', 'american', 'centurion'],
  },
  {
    id: 'visa',
    name: 'Visa',
    shortName: 'Visa',
    brandColor: '#1A1F71',
    badgeBg: '#0A0C2E',
    keywords: ['visa', 'debito visa', 'credito visa'],
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    shortName: 'Mastercard',
    brandColor: '#1F1F1F',
    badgeBg: '#2B2B2B',
    keywords: ['mastercard', 'master card', 'mc'],
  },
  {
    id: 'binance',
    name: 'Binance',
    shortName: 'Binance',
    brandColor: '#F3BA2F',
    badgeBg: '#473507',
    keywords: ['binance', 'crypto', 'usdt', 'btc', 'bitcoin'],
  },
  {
    id: 'generic',
    name: 'Otra Institución / Efectivo',
    shortName: 'Otro',
    brandColor: '#1E1E1E',
    badgeBg: '#2E2E2E',
    keywords: ['efectivo', 'caja', 'otro', 'personal'],
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
