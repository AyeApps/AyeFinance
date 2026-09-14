import { create } from 'zustand';
import { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import { purchasesService, ENTITLEMENT_IDS } from '../services/purchases';

interface SubscriptionState {
  isPro: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  activeEntitlements: string[];
  error: string | null;

  initPurchases: (userId?: string) => Promise<void>;
  syncUser: (userId: string) => Promise<void>;
  clearUser: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  openPaywall: () => Promise<boolean>;
  openPaywallIfNeeded: (entitlement?: string) => Promise<boolean>;
  openCustomerCenter: () => Promise<void>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPro: false,
  isLoading: false,
  customerInfo: null,
  offerings: null,
  activeEntitlements: [],
  error: null,

  initPurchases: async (userId?: string) => {
    try {
      set({ isLoading: true, error: null });
      await purchasesService.configure(userId);

      // Listener en tiempo real para cambios de suscripción
      purchasesService.addCustomerInfoUpdateListener((customerInfo) => {
        const isPro = purchasesService.checkIsPro(customerInfo);
        const activeEntitlements = Object.keys(customerInfo.entitlements.active);
        set({ customerInfo, isPro, activeEntitlements });
      });

      const customerInfo = await purchasesService.getCustomerInfo();
      const offerings = await purchasesService.getOfferings();

      const isPro = purchasesService.checkIsPro(customerInfo);
      const activeEntitlements = customerInfo ? Object.keys(customerInfo.entitlements.active) : [];

      set({
        customerInfo,
        offerings,
        isPro,
        activeEntitlements,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('[useSubscriptionStore] Error in initPurchases:', err);
      set({ isLoading: false, error: err?.message || 'Error al inicializar suscripciones' });
    }
  },

  syncUser: async (userId: string) => {
    try {
      const customerInfo = await purchasesService.logIn(userId);
      if (customerInfo) {
        const isPro = purchasesService.checkIsPro(customerInfo);
        const activeEntitlements = Object.keys(customerInfo.entitlements.active);
        set({ customerInfo, isPro, activeEntitlements });
      }
    } catch (err: any) {
      console.error('[useSubscriptionStore] Error syncing user:', err);
    }
  },

  clearUser: async () => {
    try {
      const customerInfo = await purchasesService.logOut();
      if (customerInfo) {
        const isPro = purchasesService.checkIsPro(customerInfo);
        const activeEntitlements = Object.keys(customerInfo.entitlements.active);
        set({ customerInfo, isPro, activeEntitlements });
      }
    } catch (err: any) {
      console.error('[useSubscriptionStore] Error clearing user:', err);
    }
  },

  refreshCustomerInfo: async () => {
    try {
      set({ isLoading: true });
      const customerInfo = await purchasesService.getCustomerInfo();
      const isPro = purchasesService.checkIsPro(customerInfo);
      const activeEntitlements = customerInfo ? Object.keys(customerInfo.entitlements.active) : [];
      set({ customerInfo, isPro, activeEntitlements, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Error al refrescar estado' });
    }
  },

  purchase: async (pkg: PurchasesPackage) => {
    try {
      set({ isLoading: true, error: null });
      const { customerInfo, isPro } = await purchasesService.purchasePackage(pkg);
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      set({ customerInfo, isPro, activeEntitlements, isLoading: false });
      return isPro;
    } catch (err: any) {
      set({ isLoading: false, error: err?.userCancelled ? null : err?.message });
      return false;
    }
  },

  restore: async () => {
    try {
      set({ isLoading: true, error: null });
      const { customerInfo, isPro } = await purchasesService.restorePurchases();
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      set({ customerInfo, isPro, activeEntitlements, isLoading: false });
      return isPro;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Error al restaurar compras' });
      return false;
    }
  },

  openPaywall: async () => {
    try {
      const purchased = await purchasesService.presentPaywall();
      if (purchased) {
        await get().refreshCustomerInfo();
      }
      return purchased;
    } catch (err: any) {
      console.error('[useSubscriptionStore] Error in openPaywall:', err);
      return false;
    }
  },

  openPaywallIfNeeded: async (entitlement?: string) => {
    try {
      const targetEntitlement = entitlement || ENTITLEMENT_IDS.UNLIMITED;
      const purchased = await purchasesService.presentPaywallIfNeeded(targetEntitlement);
      if (purchased) {
        await get().refreshCustomerInfo();
      }
      return purchased;
    } catch (err: any) {
      console.error('[useSubscriptionStore] Error in openPaywallIfNeeded:', err);
      return false;
    }
  },

  openCustomerCenter: async () => {
    try {
      await purchasesService.presentCustomerCenter();
    } catch (err: any) {
      console.error('[useSubscriptionStore] Error in openCustomerCenter:', err);
    }
  },
}));
