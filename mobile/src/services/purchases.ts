import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

// API Keys Configuration
const REVENUECAT_API_KEYS = {
  ios: 'appl_SKnrSyuHMqqaCNJcXNACNDeUNyU',
  android: 'test_VjxGMqpCPZlWFbpuuxGxdlMhEwF', // Se reemplazará con goog_... al configurar Google Play
  test: 'test_VjxGMqpCPZlWFbpuuxGxdlMhEwF',
};

// Identificadores de Entitlements soportados
export const ENTITLEMENT_IDS = {
  UNLIMITED: 'ayeapps_unlimited',
  PRO_FINANCE: 'pro_finance',
  PRO_GLOBAL: 'pro_global',
} as const;

export type EntitlementId = (typeof ENTITLEMENT_IDS)[keyof typeof ENTITLEMENT_IDS];

export interface PurchasesState {
  isConfigured: boolean;
  isPro: boolean;
  activeEntitlements: string[];
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOffering | null;
}

class PurchasesService {
  private isConfigured = false;
  private isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  /**
   * Inicializa el SDK de RevenueCat con la API Key correspondiente a la plataforma y el ID del usuario
   */
  public async configure(appUserID?: string): Promise<void> {
    if (!this.isNative) {
      console.log('[PurchasesService] Plataforma Web detectada. RevenueCat nativo deshabilitado en Web.');
      return;
    }

    if (this.isConfigured) {
      if (appUserID) {
        await this.logIn(appUserID);
      }
      return;
    }

    try {
      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;

      await Purchases.configure({
        apiKey,
        appUserID: appUserID || undefined,
      });

      this.isConfigured = true;
      console.log(`[PurchasesService] RevenueCat configurado exitosamente en ${Platform.OS}.`);
    } catch (error) {
      console.error('[PurchasesService] Error al configurar RevenueCat:', error);
    }
  }

  /**
   * Identifica al usuario autenticado en RevenueCat
   */
  public async logIn(appUserID: string): Promise<CustomerInfo | null> {
    if (!this.isNative || !this.isConfigured) return null;
    try {
      const { customerInfo } = await Purchases.logIn(appUserID);
      return customerInfo;
    } catch (error) {
      console.error('[PurchasesService] Error al identificar usuario en RevenueCat:', error);
      return null;
    }
  }

  /**
   * Cierra la sesión del usuario en RevenueCat (genera un ID anónimo)
   */
  public async logOut(): Promise<CustomerInfo | null> {
    if (!this.isNative || !this.isConfigured) return null;
    try {
      const customerInfo = await Purchases.logOut();
      return customerInfo;
    } catch (error) {
      console.error('[PurchasesService] Error al cerrar sesión en RevenueCat:', error);
      return null;
    }
  }

  /**
   * Obtiene la información del cliente y sus suscripciones activas
   */
  public async getCustomerInfo(): Promise<CustomerInfo | null> {
    if (!this.isNative || !this.isConfigured) return null;
    try {
      return await Purchases.getCustomerInfo();
    } catch (error) {
      console.error('[PurchasesService] Error al obtener CustomerInfo:', error);
      return null;
    }
  }

  /**
   * Verifica si el usuario tiene algún entitlement PRO activo (ayeapps_unlimited, pro_finance, pro_global)
   */
  public checkIsPro(customerInfo: CustomerInfo | null): boolean {
    if (!customerInfo) return false;
    const active = customerInfo.entitlements.active;
    return Boolean(
      active[ENTITLEMENT_IDS.UNLIMITED] ||
      active[ENTITLEMENT_IDS.PRO_FINANCE] ||
      active[ENTITLEMENT_IDS.PRO_GLOBAL]
    );
  }

  /**
   * Obtiene las ofertas y paquetes disponibles configurados en el Dashboard
   */
  public async getOfferings(): Promise<PurchasesOfferings | null> {
    if (!this.isNative || !this.isConfigured) return null;
    try {
      return await Purchases.getOfferings();
    } catch (error) {
      console.error('[PurchasesService] Error al obtener Offerings:', error);
      return null;
    }
  }

  /**
   * Realiza la compra de un paquete (Monthly, Yearly, Lifetime)
   */
  public async purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo; isPro: boolean }> {
    if (!this.isNative) {
      throw new Error('Las compras dentro de la app solo están disponibles en dispositivos móviles nativos.');
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPro = this.checkIsPro(customerInfo);
      return { customerInfo, isPro };
    } catch (error: any) {
      if (!error.userCancelled) {
        console.error('[PurchasesService] Error en purchasePackage:', error);
      }
      throw error;
    }
  }

  /**
   * Restaura compras previas del usuario (Requisito indispensable para App Store)
   */
  public async restorePurchases(): Promise<{ customerInfo: CustomerInfo; isPro: boolean }> {
    if (!this.isNative) {
      throw new Error('La restauración de compras solo está disponible en dispositivos móviles nativos.');
    }
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPro = this.checkIsPro(customerInfo);
      return { customerInfo, isPro };
    } catch (error: any) {
      console.error('[PurchasesService] Error en restorePurchases:', error);
      throw error;
    }
  }

  /**
   * Muestra el Paywall nativo oficial de RevenueCat
   */
  public async presentPaywall(): Promise<boolean> {
    if (!this.isNative) {
      console.warn('[PurchasesService] Paywalls nativos no disponibles en Web.');
      return false;
    }
    try {
      const result = await RevenueCatUI.presentPaywall();
      return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
    } catch (error) {
      console.error('[PurchasesService] Error al presentar Paywall:', error);
      return false;
    }
  }

  /**
   * Muestra el Paywall nativo solo si el usuario NO tiene el entitlement activo
   */
  public async presentPaywallIfNeeded(requiredEntitlement: string = ENTITLEMENT_IDS.UNLIMITED): Promise<boolean> {
    if (!this.isNative) return false;
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: requiredEntitlement,
      });
      return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
    } catch (error) {
      console.error('[PurchasesService] Error en presentPaywallIfNeeded:', error);
      return false;
    }
  }

  /**
   * Muestra el Centro de Atención al Cliente de RevenueCat (Customer Center) si está disponible
   */
  public async presentCustomerCenter(): Promise<void> {
    if (!this.isNative) return;
    try {
      if (typeof (RevenueCatUI as any).presentCustomerCenter === 'function') {
        await (RevenueCatUI as any).presentCustomerCenter();
      }
    } catch (error) {
      console.error('[PurchasesService] Error al presentar Customer Center:', error);
    }
  }

  /**
   * Agrega un listener para actualizaciones automáticas de información de cliente (renovaciones, cancelaciones)
   */
  public addCustomerInfoUpdateListener(listener: (info: CustomerInfo) => void) {
    if (!this.isNative) return () => {};
    return Purchases.addCustomerInfoUpdateListener(listener);
  }
}

export const purchasesService = new PurchasesService();
