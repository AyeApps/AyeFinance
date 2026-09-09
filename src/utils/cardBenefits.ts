import { MexicanBankId } from '../constants/mexicanBanks';
import { Account } from '../types';

export interface RewardsCalculation {
  hasRewards: boolean;
  type?: 'points' | 'cashback';
  points?: number;
  cashback?: number;
  label: string;
  badgeColor: string;
  estimatedMxn: number;
}

export interface AnnuityExemptionStatus {
  hasRule: boolean;
  productName: string;
  conditionDescription: string;
  isExempt: boolean;
  currentSpending: number;
  requiredSpending: number;
  currentTransactions: number;
  requiredTransactions: number;
  message: string;
  badgeColor: string;
}

export interface DailyYieldCalculation {
  hasYield: boolean;
  annualRate: number; // e.g. 0.135 for 13.5%
  dailyRate: number;
  dailyYieldMxn: number;
  monthlyYieldMxn: number;
  rateLabel: string;
}

export interface FinancingCycleInfo {
  hasCycle: boolean;
  isBestDayToBuy: boolean;
  daysUntilCutOff: number;
  daysOfFinancing: number; // up to 50 or 60 days
  cutOffDay?: number;
  paymentDueDay?: number;
  paymentGraceDays?: number;
  computedDueDay?: number;
  isDueNextMonth: boolean;
  advice: string;
  statusColor: string;
}

export interface CreditUtilizationStatus {
  ratio: number; // 0 to 100+
  status: 'optimal' | 'moderate' | 'critical';
  label: string;
  color: string;
  advice: string;
}

/**
 * 1. MOTOR DE RECOMPENSAS Y CASHBACK
 * Calcula los puntos o cashback generado por una compra según el banco, producto y categoría.
 */
export const calculateTransactionRewards = (
  bankId?: string | null,
  productName?: string | null,
  amountStr?: string | number | null,
  category?: string | null
): RewardsCalculation => {
  const amount = typeof amountStr === 'number' ? amountStr : parseFloat(String(amountStr || '0').replace(/[^0-9.-]/g, '')) || 0;
  if (amount <= 0 || !bankId) {
    return { hasRewards: false, label: '', badgeColor: '#FE9D01', estimatedMxn: 0 };
  }

  const normBank = bankId.toLowerCase().trim();
  const normProd = (productName || '').toLowerCase().trim();
  const normCat = (category || '').toLowerCase().trim();

  // 1. BBVA (Puntos BBVA)
  if (normBank === 'bbva') {
    let rate = 0.09; // Default 9% Azul
    let levelName = 'Azul (9%)';

    if (normProd.includes('oro')) {
      rate = 0.11;
      levelName = 'Oro (11%)';
    } else if (normProd.includes('platinum') || normProd.includes('platino')) {
      rate = 0.15;
      levelName = 'Platinum (15%)';
    } else if (normProd.includes('infinite')) {
      rate = 0.23;
      levelName = 'Infinite (23%)';
    } else if (normProd.includes('crea') || normProd.includes('primera')) {
      rate = 0.05;
      levelName = 'Crea (5%)';
    }

    const points = Math.floor(amount * rate);
    const estimatedMxn = Number((points * 0.08).toFixed(2)); // ~$0.08 MXN por punto
    return {
      hasRewards: points > 0,
      type: 'points',
      points,
      label: `+${points.toLocaleString()} PUNTOS BBVA [${levelName}]`,
      badgeColor: '#004481',
      estimatedMxn,
    };
  }

  // 2. HSBC 2Now (2% Cashback en compras > $10)
  if (normBank === 'hsbc' && (normProd.includes('2now') || normProd.includes('now'))) {
    if (amount >= 10) {
      const cashback = Number((amount * 0.02).toFixed(2));
      return {
        hasRewards: true,
        type: 'cashback',
        cashback,
        label: `+$${cashback.toFixed(2)} CASHBACK 2NOW (2%)`,
        badgeColor: '#00e676',
        estimatedMxn: cashback,
      };
    }
  }

  // 3. Santander LikeU (Cashback por categoría)
  if (normBank === 'santander' && normProd.includes('likeu')) {
    let rate = 0;
    let concept = '';

    if (normCat.includes('gasolina') || normCat.includes('combustible') || normCat.includes('transporte')) {
      rate = 0.04;
      concept = '4% GASOLINA';
    } else if (
      normCat.includes('restaurante') ||
      normCat.includes('comida') ||
      normCat.includes('alimento') ||
      normCat.includes('entretenimiento') ||
      normCat.includes('cine')
    ) {
      rate = 0.05;
      concept = '5% RESTAURANTES';
    } else if (normCat.includes('farmacia') || normCat.includes('salud') || normCat.includes('medicina')) {
      rate = 0.06;
      concept = '6% FARMACIAS';
    }

    if (rate > 0) {
      const cashback = Number((amount * rate).toFixed(2));
      return {
        hasRewards: true,
        type: 'cashback',
        cashback,
        label: `+$${cashback.toFixed(2)} CASHBACK LIKEU (${concept})`,
        badgeColor: '#ec4899',
        estimatedMxn: cashback,
      };
    }
  }

  // 4. Citibanamex Costco
  if (normBank === 'banamex' && normProd.includes('costco')) {
    const isCostco = normCat.includes('gasolina') || normCat.includes('supermercado') || normCat.includes('costco');
    const rate = isCostco ? 0.03 : 0.02;
    const cashback = Number((amount * rate).toFixed(2));
    return {
      hasRewards: true,
      type: 'cashback',
      cashback,
      label: `+$${cashback.toFixed(2)} REEMBOLSO COSTCO (${isCostco ? '3% REEMBOLSO' : '2% GENERAL'})`,
      badgeColor: '#FE9D01',
      estimatedMxn: cashback,
    };
  }

  // 5. Banregio (Tarjeta MÁS o Clásica)
  if (normBank === 'banregio') {
    const rate = normProd.includes('más') || normProd.includes('mas') ? 0.02 : 0.01;
    const cashback = Number((amount * rate).toFixed(2));
    return {
      hasRewards: true,
      type: 'cashback',
      cashback,
      label: `+$${cashback.toFixed(2)} RECOMPENSA BANREGIO (${rate * 100}%)`,
      badgeColor: '#FE9D01',
      estimatedMxn: cashback,
    };
  }

  return { hasRewards: false, label: '', badgeColor: '#FE9D01', estimatedMxn: 0 };
};

/**
 * 2. TRACKER DE EXENCIÓN DE ANUALIDAD
 */
export const evaluateAnnuityExemption = (
  bankId?: string | null,
  productName?: string | null,
  monthSpendStr?: string | number | null,
  monthTransactionCount: number = 0
): AnnuityExemptionStatus => {
  const monthSpend = typeof monthSpendStr === 'number' ? monthSpendStr : parseFloat(String(monthSpendStr || '0').replace(/[^0-9.-]/g, '')) || 0;
  const normBank = (bankId || '').toLowerCase().trim();
  const normProd = (productName || '').toLowerCase().trim();

  // Banamex Joy: $1 al mes
  if (normBank === 'banamex' && (normProd.includes('joy') || normProd.includes('simplicity'))) {
    const isExempt = monthSpend >= 1;
    return {
      hasRule: true,
      productName: 'Banamex Joy',
      conditionDescription: 'Al menos 1 compra al mes (mínimo $1 MXN)',
      isExempt,
      currentSpending: monthSpend,
      requiredSpending: 1,
      currentTransactions: monthTransactionCount,
      requiredTransactions: 1,
      message: isExempt
        ? 'Exención cumplida este mes (compras activas)'
        : 'Haz al menos 1 compra este mes para evitar la cuota por inactividad',
      badgeColor: isExempt ? '#00e676' : '#ff1744',
    };
  }

  // HSBC Zero: 1 compra al mes
  if (normBank === 'hsbc' && normProd.includes('zero')) {
    const isExempt = monthTransactionCount >= 1 || monthSpend >= 1;
    return {
      hasRule: true,
      productName: 'HSBC Zero',
      conditionDescription: 'Al menos 1 compra al mes sin monto mínimo',
      isExempt,
      currentSpending: monthSpend,
      requiredSpending: 1,
      currentTransactions: monthTransactionCount,
      requiredTransactions: 1,
      message: isExempt
        ? 'Exención cumplida este mes (sin cobro por no uso)'
        : 'Usa tu tarjeta al menos una vez al mes para evitar comisión de $179+IVA',
      badgeColor: isExempt ? '#00e676' : '#ff1744',
    };
  }

  // Santander LikeU: $200 al mes
  if (normBank === 'santander' && normProd.includes('likeu')) {
    const isExempt = monthSpend >= 200;
    const diff = Math.max(0, 200 - monthSpend);
    return {
      hasRule: true,
      productName: 'Santander LikeU',
      conditionDescription: 'Gasto mínimo de $200 MXN al mes',
      isExempt,
      currentSpending: monthSpend,
      requiredSpending: 200,
      currentTransactions: monthTransactionCount,
      requiredTransactions: 1,
      message: isExempt
        ? 'Comisión mensual condonada ($200+ gastados)'
        : `Faltan $${diff.toFixed(2)} MXN para exentar la comisión de $150`,
      badgeColor: isExempt ? '#00e676' : '#ff1744',
    };
  }

  // Hey Banco (Hey Pro): 6 compras de $100+
  if (normBank === 'heybanco' || normProd.includes('hey')) {
    const isExempt = monthTransactionCount >= 6 && monthSpend >= 600;
    return {
      hasRule: true,
      productName: 'Hey Pro',
      conditionDescription: '6 compras de $100+ al mes para tasa preferencial',
      isExempt,
      currentSpending: monthSpend,
      requiredSpending: 600,
      currentTransactions: monthTransactionCount,
      requiredTransactions: 6,
      message: isExempt
        ? 'Estatus Hey Pro Calificado (Tasa preferencial activa)'
        : `Llevas ${monthTransactionCount}/6 compras de $100+ para mantener Hey Pro`,
      badgeColor: isExempt ? '#00e676' : '#00b0ff',
    };
  }

  return {
    hasRule: false,
    productName: productName || '',
    conditionDescription: '',
    isExempt: true,
    currentSpending: monthSpend,
    requiredSpending: 0,
    currentTransactions: monthTransactionCount,
    requiredTransactions: 0,
    message: '',
    badgeColor: '#00e676',
  };
};

export interface YieldPreset {
  label: string;
  rate: number;
  description: string;
}

export const POPULAR_YIELD_PRESETS: YieldPreset[] = [
  { label: 'CETES (11%)', rate: 11.0, description: '11.0% CETES' },
  { label: 'NU (13.5%)', rate: 13.5, description: '13.5% Nu Cajitas' },
  { label: 'FINSUS (14%)', rate: 14.0, description: '14.0% Finsus' },
  { label: 'MP / KLAR (15%)', rate: 15.0, description: '15.0% Mercado Pago / Klar' },
  { label: 'STORI (15.5%)', rate: 15.5, description: '15.5% Stori Cuenta+' },
];

/**
 * 3. RENDIMIENTOS DIARIOS PASIVOS EN CUENTAS DE DÉBITO / FINTECH / INVERSIÓN
 */
export const calculateDailyYield = (
  bankId?: string | null,
  productName?: string | null,
  currentBalanceStr?: string | number | null,
  customHasYield?: boolean | null,
  customAnnualYieldRate?: number | string | null
): DailyYieldCalculation => {
  const balance = typeof currentBalanceStr === 'number' ? currentBalanceStr : parseFloat(String(currentBalanceStr || '0').replace(/[^0-9.-]/g, '')) || 0;
  const normBank = (bankId || '').toLowerCase().trim();
  const normProd = (productName || '').toLowerCase().trim();

  // If explicitly disabled
  if (customHasYield === false) {
    return {
      hasYield: false,
      annualRate: 0,
      dailyRate: 0,
      dailyYieldMxn: 0,
      monthlyYieldMxn: 0,
      rateLabel: '',
    };
  }

  let annualRate = 0;
  let rateLabel = '';

  // Check if custom annual rate is provided
  if (customAnnualYieldRate !== undefined && customAnnualYieldRate !== null && customAnnualYieldRate !== '') {
    const rawRate = typeof customAnnualYieldRate === 'number'
      ? customAnnualYieldRate
      : parseFloat(String(customAnnualYieldRate).replace(/[^0-9.-]/g, ''));

    if (!isNaN(rawRate) && rawRate > 0) {
      annualRate = rawRate > 1 ? rawRate / 100 : rawRate;
      const pctFormatted = (annualRate * 100).toFixed(2).replace(/\.00$/, '');
      rateLabel = `${pctFormatted}% Anual`;
    }
  }

  // If no custom rate set or valid, check bank presets
  if (annualRate === 0) {
    if (normBank === 'nu' || normProd.includes('cajita') || normProd.includes('nu')) {
      annualRate = 0.135; // 13.5% anual representativo
      rateLabel = '13.5% Anual (Cajitas Nu)';
    } else if (normBank === 'mercadopago' || normProd.includes('mercado pago')) {
      annualRate = 0.150; // 15.0% anual representativo Mercado Pago
      rateLabel = '15.0% Anual (Mercado Pago)';
    } else if (normBank === 'heybanco' && (normProd.includes('inversion') || normProd.includes('smart'))) {
      annualRate = 0.110;
      rateLabel = '11.0% Anual (Hey Inversión)';
    } else if (normBank === 'klar' || normProd.includes('klar')) {
      annualRate = 0.150;
      rateLabel = '15.0% Anual (Klar)';
    } else if (normBank === 'uala' || normProd.includes('ualá') || normProd.includes('uala')) {
      annualRate = 0.150;
      rateLabel = '15.0% Anual (Ualá)';
    } else if (normBank === 'cetes' || normProd.includes('cetes')) {
      annualRate = 0.110;
      rateLabel = '11.0% Anual (CETES)';
    } else if (normBank === 'finsus' || normProd.includes('finsus')) {
      annualRate = 0.140;
      rateLabel = '14.0% Anual (Finsus)';
    } else if (normBank === 'stori' || normProd.includes('stori')) {
      annualRate = 0.155;
      rateLabel = '15.5% Anual (Stori)';
    } else if (customHasYield === true) {
      // Default rate if user toggled yield on without specifying rate
      annualRate = 0.100;
      rateLabel = '10.0% Anual';
    }
  }

  if (annualRate > 0 && balance > 0) {
    const dailyRate = annualRate / 360; // Convención bancaria 360 días
    const dailyYieldMxn = Number((balance * dailyRate).toFixed(2));
    const monthlyYieldMxn = Number(((balance * annualRate) / 12).toFixed(2));
    return {
      hasYield: true,
      annualRate,
      dailyRate,
      dailyYieldMxn,
      monthlyYieldMxn,
      rateLabel,
    };
  }

  return {
    hasYield: false,
    annualRate: 0,
    dailyRate: 0,
    dailyYieldMxn: 0,
    monthlyYieldMxn: 0,
    rateLabel: '',
  };
};

/**
 * 4. INTELIGENCIA DE CICLOS Y FINANCIAMIENTO ("HASTA 50-60 DÍAS GRATIS")
 * Resuelve el bug común de apps donde corte y pago caen en el mismo número de día (ej. corta el 6 y paga el 6).
 */
export const evaluateFinancingCycle = (
  cutOffDay?: number | null,
  paymentDueDay?: number | null,
  paymentGraceDays?: number | null
): FinancingCycleInfo => {
  if (!cutOffDay) {
    return {
      hasCycle: false,
      isBestDayToBuy: false,
      daysUntilCutOff: 0,
      daysOfFinancing: 30,
      isDueNextMonth: false,
      advice: '',
      statusColor: '#FE9D01',
    };
  }

  const today = new Date().getDate();
  let daysUntilCutOff = cutOffDay - today;
  if (daysUntilCutOff < 0) {
    daysUntilCutOff += 30; // Días restantes hasta el próximo corte
  }

  // 1. Determinar los días de gracia para pagar después del corte:
  let effectiveGraceDays = 20; // Estándar de la banca en México

  if (paymentGraceDays && paymentGraceDays > 0) {
    effectiveGraceDays = paymentGraceDays;
  } else if (paymentDueDay && paymentDueDay > 0) {
    if (paymentDueDay > cutOffDay) {
      // Mismo mes calendario: ej. corta 6, paga 26 -> 20 días
      effectiveGraceDays = paymentDueDay - cutOffDay;
    } else {
      // Mes siguiente (o 30 días después): ej. corta 6, paga 6 -> 30 días!
      // Evita el error de `6 - 6 = 0` que confunde a otras apps.
      effectiveGraceDays = 30 - cutOffDay + paymentDueDay;
    }
  }

  // 2. Determinar si el pago cae en el mes siguiente y cuál es el día calendario
  const isDueNextMonth = effectiveGraceDays >= 28 || (paymentDueDay ? paymentDueDay <= cutOffDay : false);
  let computedDueDay = paymentDueDay || undefined;
  if (!computedDueDay) {
    // Calcular día calendario sumando los días de gracia
    const refDate = new Date(2026, 0, cutOffDay); // enero (mes con 31 días de referencia)
    refDate.setDate(refDate.getDate() + effectiveGraceDays);
    computedDueDay = refDate.getDate();
  }

  // 3. Ventana máxima de financiamiento libre de intereses
  // Ciclo completo (30 días) + Días para pagar después del corte (ej. 20 o 30 días) = hasta 50 o 60 días!
  const maxDaysOfFinancing = 30 + effectiveGraceDays;
  const currentFinancingAvailable = Math.max(effectiveGraceDays, daysUntilCutOff + effectiveGraceDays);

  // 4. El mejor momento para comprar es 1 a 3 días después del corte
  const isRightAfterCutoff = today === cutOffDay + 1 || today === cutOffDay + 2 || (cutOffDay === 30 && today === 1);
  const isBestDayToBuy = daysUntilCutOff >= 25 || isRightAfterCutoff;

  let advice = '';
  let statusColor = '#00e676';

  if (isBestDayToBuy) {
    advice = `¡Día óptimo para comprar! Cuentas con hasta ${maxDaysOfFinancing} días de financiamiento libre de intereses (Corte el ${cutOffDay}, pago el ${computedDueDay}${isDueNextMonth ? ' del mes siguiente' : ''}).`;
    statusColor = '#00e676';
  } else if (daysUntilCutOff <= 3) {
    advice = `Corte próximo en ${daysUntilCutOff} día(s). Espera al día siguiente al corte para obtener hasta ${maxDaysOfFinancing} días de financiamiento.`;
    statusColor = '#FE9D01';
  } else {
    advice = `${daysUntilCutOff} días para tu corte. Dispones de ${currentFinancingAvailable} días para pagar (límite el día ${computedDueDay}${isDueNextMonth ? ' del mes siguiente' : ''}).`;
    statusColor = '#00b0ff';
  }

  return {
    hasCycle: true,
    isBestDayToBuy,
    daysUntilCutOff,
    daysOfFinancing: currentFinancingAvailable,
    cutOffDay,
    paymentDueDay: computedDueDay,
    paymentGraceDays: effectiveGraceDays,
    computedDueDay,
    isDueNextMonth,
    advice,
    statusColor,
  };
};

/**
 * SEMÁFORO DE UTILIZACIÓN DE CRÉDITO (BURÓ DE CRÉDITO)
 */
export const evaluateCreditUtilization = (
  currentBalanceStr?: string | number | null,
  creditLimitStr?: string | number | null
): CreditUtilizationStatus => {
  const current = typeof currentBalanceStr === 'number' ? currentBalanceStr : parseFloat(String(currentBalanceStr || '0').replace(/[^0-9.-]/g, '')) || 0;
  const limit = typeof creditLimitStr === 'number' ? creditLimitStr : parseFloat(String(creditLimitStr || '0').replace(/[^0-9.-]/g, '')) || 0;

  if (limit <= 0) {
    return {
      ratio: 0,
      status: 'optimal',
      label: '0%',
      color: '#00e676',
      advice: 'Línea de crédito no definida.',
    };
  }

  const ratio = Math.max(0, Math.round((current / limit) * 100));

  if (ratio <= 30) {
    return {
      ratio,
      status: 'optimal',
      label: `${ratio}% UTILIZADO`,
      color: '#00e676',
      advice: 'Nivel óptimo para Score de Buró de Crédito (< 30%).',
    };
  } else if (ratio <= 50) {
    return {
      ratio,
      status: 'moderate',
      label: `${ratio}% UTILIZADO`,
      color: '#FE9D01',
      advice: 'Uso moderado. Procura no superar el 50% antes del corte.',
    };
  } else {
    return {
      ratio,
      status: 'critical',
      label: `${ratio}% UTILIZADO`,
      color: '#ff1744',
      advice: 'Alto nivel de deuda. Puede penalizar tu calificación crediticia en Buró.',
    };
  }
};

/**
 * 4. CÁLCULO DE PAGOS ESTIMADOS DE TARJETA DE CRÉDITO (BANXICO / CONDUSEF)
 */
export interface CreditCardPaymentEstimates {
  account: Account;
  currentDebt: number;
  noInterestPayment: number;
  minimumPayment: number;
  cutOffDay?: number;
  paymentDueDay?: number;
  daysUntilDue?: number;
  dueDateLabel?: string;
  isOverdueRisk: boolean;
}

export interface AllCreditCardsPaymentSummary {
  cardsWithDebt: CreditCardPaymentEstimates[];
  allCreditCards: CreditCardPaymentEstimates[];
  totalDebt: number;
  totalNoInterest: number;
  totalMinimum: number;
}

export const calculateCreditCardPaymentEstimates = (account: Account): CreditCardPaymentEstimates => {
  const currentDebt = Math.max(
    0,
    parseFloat(String(account.current_balance || '0').replace(/[^0-9.-]/g, '')) || 0
  );

  const noInterestPayment = currentDebt;

  let minimumPayment = 0;
  if (currentDebt > 0) {
    // Regla estándar mexicana Banxico/Condusef:
    // Mayor entre: 5% del saldo deudor revolvente, o 1.25% de la línea de crédito, con piso mínimo de $200 MXN
    let minEst = Math.max(200, Math.round(currentDebt * 0.05));
    if (account.credit_limit) {
      const limit = parseFloat(String(account.credit_limit).replace(/[^0-9.-]/g, '')) || 0;
      if (limit > 0) {
        minEst = Math.max(minEst, Math.round(limit * 0.0125));
      }
    }
    // El pago mínimo nunca puede superar la deuda total
    minimumPayment = Math.min(currentDebt, minEst);
  }

  const now = new Date();
  const today = now.getDate();
  const cutOffDay = account.cut_off_day || undefined;
  let paymentDueDay = account.payment_due_day || undefined;

  // Si no tiene día de pago explícito pero sí plazo de gracia:
  if (!paymentDueDay && cutOffDay && account.payment_grace_days) {
    const cycle = evaluateFinancingCycle(cutOffDay, undefined, account.payment_grace_days);
    paymentDueDay = cycle.computedDueDay;
  }

  let daysUntilDue: number | undefined = undefined;
  let dueDateLabel = '';
  let isOverdueRisk = false;

  if (paymentDueDay) {
    if (today === paymentDueDay) {
      daysUntilDue = 0;
      dueDateLabel = `Día ${paymentDueDay} (¡Vence hoy!)`;
    } else if (today < paymentDueDay) {
      daysUntilDue = paymentDueDay - today;
      const dayWord = daysUntilDue === 1 ? 'día' : 'días';
      dueDateLabel = `Día ${paymentDueDay} (este mes) · Faltan ${daysUntilDue} ${dayWord}`;
    } else {
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      daysUntilDue = (daysInCurrentMonth - today) + paymentDueDay;
      const dayWord = daysUntilDue === 1 ? 'día' : 'días';
      dueDateLabel = `Día ${paymentDueDay} (próx. mes) · Faltan ${daysUntilDue} ${dayWord}`;
    }
    isOverdueRisk = daysUntilDue <= 3 && currentDebt > 0;
  }

  return {
    account,
    currentDebt,
    noInterestPayment,
    minimumPayment,
    cutOffDay,
    paymentDueDay,
    daysUntilDue,
    dueDateLabel,
    isOverdueRisk,
  };
};

export const calculateAllCreditCardsPaymentSummary = (
  accounts: Account[]
): AllCreditCardsPaymentSummary => {
  const creditAccounts = accounts.filter((a) => a.account_type === 'credito');

  const allCreditCards = creditAccounts.map(calculateCreditCardPaymentEstimates);
  const cardsWithDebt = allCreditCards.filter((c) => c.currentDebt > 0);

  const totalDebt = cardsWithDebt.reduce((acc, c) => acc + c.currentDebt, 0);
  const totalNoInterest = cardsWithDebt.reduce((acc, c) => acc + c.noInterestPayment, 0);
  const totalMinimum = cardsWithDebt.reduce((acc, c) => acc + c.minimumPayment, 0);

  return {
    cardsWithDebt,
    allCreditCards,
    totalDebt,
    totalNoInterest,
    totalMinimum,
  };
};

