import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Check,
  Sparkles,
  Shield,
  Zap,
  Layers,
  ArrowRight,
  RefreshCw,
  Lock,
  Star,
} from 'lucide-react-native';
import { PurchasesPackage, PACKAGE_TYPE } from 'react-native-purchases';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useTheme } from '../../hooks/useTheme';
import { AyeLogo } from '../ui/AyeLogo';
import { AnimatedDotBackground } from '../canvas/AnimatedDotBackground';

interface AyePaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AyePaywallModal: React.FC<AyePaywallModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { colors, isDark } = useTheme();

  const offerings = useSubscriptionStore((state) => state.offerings);
  const purchase = useSubscriptionStore((state) => state.purchase);
  const restore = useSubscriptionStore((state) => state.restore);
  const refreshCustomerInfo = useSubscriptionStore((state) => state.refreshCustomerInfo);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    if (offerings?.current?.availablePackages && offerings.current.availablePackages.length > 0) {
      const available = offerings.current.availablePackages;
      setPackages(available);

      // Pre-seleccionar paquete anual si existe, o el primero disponible
      const annual = available.find(
        (p) => p.packageType === PACKAGE_TYPE.ANNUAL || p.identifier.toLowerCase().includes('annual') || p.identifier.toLowerCase().includes('yearly')
      );
      setSelectedPackage(annual || available[0]);
    }
  }, [offerings]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setIsProcessing(true);
    setFeedbackError(null);

    try {
      const isPro = await purchase(selectedPackage);
      if (isPro) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      if (!err?.userCancelled) {
        setFeedbackError(err?.message || 'Error al procesar el pago. Intenta nuevamente.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    setIsProcessing(true);
    setFeedbackError(null);

    try {
      const isPro = await restore();
      if (isPro) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setFeedbackError('No se encontraron compras activas asociadas a tu cuenta de Apple ID.');
      }
    } catch (err: any) {
      setFeedbackError(err?.message || 'Error al restaurar compras.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const features = [
    {
      title: 'Cuentas & Billeteras Ilimitadas',
      desc: 'Bancos, efectivo, cripto y líneas de crédito sin ninguna restricción.',
    },
    {
      title: 'Automatización de Recurrentes',
      desc: 'Programación de gastos fijos, suscripciones y cobros proyectados.',
    },
    {
      title: 'Widgets Nativos de Precisión',
      desc: 'Consulta tu balance y añade transacciones desde tu pantalla de inicio.',
    },
    {
      title: 'Sincronización en la Nube Aye',
      desc: 'Tus datos respaldados en tiempo real con cifrado de extremo a extremo.',
    },
    {
      title: 'Reportes y Exportación Contable',
      desc: 'Exportación completa en CSV / PDF para análisis patrimonial.',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: '#050505' }]}>
        {/* Animated matrix background */}
        <AnimatedDotBackground />

        {/* Top Floating Close Button */}
        <View style={[styles.headerBar, { top: insets.top > 0 ? insets.top + 8 : 16 }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <X size={18} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: (insets.top > 0 ? insets.top : 24) + 40,
              paddingBottom: (insets.bottom > 0 ? insets.bottom : 20) + 30,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand & Badge Header */}
          <View style={styles.brandHeader}>
            <View style={styles.geoBadge}>
              <View style={styles.geoLine} />
              <Text style={styles.geoBadgeText}>AYEAPPS // ECOSYSTEM PASS</Text>
            </View>

            <View style={styles.logoRow}>
              <AyeLogo width={48} color="#FE9D01" />
              <Text style={styles.brandTitle}>
                AYE<Text style={{ color: '#FE9D01' }}>FINANCE</Text> PRO
              </Text>
            </View>

            <Text style={styles.heroSubtitle}>
              Precisión contable de alto nivel, automatización integral y control absoluto de tu patrimonio.
            </Text>
          </View>

          {/* Features Neo-Card */}
          <View style={styles.featuresCard}>
            <View style={styles.cardHeader}>
              <Zap size={14} color="#FE9D01" strokeWidth={2.5} />
              <Text style={styles.cardHeaderText}>BENEFICIOS EXCLUSIVOS DE NIVEL PRO</Text>
            </View>

            <View style={styles.featuresList}>
              {features.map((item, idx) => (
                <View key={idx} style={styles.featureItem}>
                  <View style={styles.checkIconBox}>
                    <Check size={12} color="#FE9D01" strokeWidth={3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.featureItemTitle}>{item.title}</Text>
                    <Text style={styles.featureItemDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Error Message */}
          {feedbackError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{feedbackError}</Text>
            </View>
          )}

          {/* Pricing / Packages Selector */}
          <View style={styles.packagesContainer}>
            <Text style={styles.packagesSectionTitle}>SELECCIONA TU MODALIDAD DE ACCESO:</Text>

            {packages.length > 0 ? (
              packages.map((pkg) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                const isAnnual =
                  pkg.packageType === PACKAGE_TYPE.ANNUAL ||
                  pkg.identifier.toLowerCase().includes('annual') ||
                  pkg.identifier.toLowerCase().includes('yearly');
                const isLifetime =
                  pkg.packageType === PACKAGE_TYPE.LIFETIME ||
                  pkg.identifier.toLowerCase().includes('lifetime');

                let title = pkg.product.title || 'Plan Pro';
                if (isAnnual) title = 'PLAN ANUAL // RECOMENDADO';
                else if (isLifetime) title = 'PLAN DE POR VIDA (LIFETIME)';
                else title = 'PLAN MENSUAL';

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.packageCard,
                      isSelected && styles.packageCardSelected,
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                    activeOpacity={0.85}
                  >
                    {isAnnual && (
                      <View style={styles.popularTag}>
                        <Star size={10} color="#000000" strokeWidth={3} />
                        <Text style={styles.popularTagText}>MÁS POPULAR — AHORRA 40%</Text>
                      </View>
                    )}

                    <View style={styles.packageCardBody}>
                      <View style={styles.packageRadioOuter}>
                        {isSelected && <View style={styles.packageRadioInner} />}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.packageTitle,
                            isSelected && { color: '#ffffff' },
                          ]}
                        >
                          {title}
                        </Text>
                        <Text style={styles.packageDesc}>
                          {isAnnual
                            ? 'Facturado anualmente. Acceso total ininterrumpido.'
                            : isLifetime
                            ? 'Un solo pago único. Acceso vitalicio sin renovaciones.'
                            : 'Facturado mensualmente. Cancela cuando desees.'}
                        </Text>
                      </View>

                      <View style={styles.priceContainer}>
                        <Text style={styles.packagePrice}>
                          {pkg.product.priceString}
                        </Text>
                        <Text style={styles.packagePeriod}>
                          {isAnnual ? '/ año' : isLifetime ? 'único' : '/ mes'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              // Fallback placeholder cards if packages are still loading
              <View style={[styles.packageCard, styles.packageCardSelected]}>
                <View style={styles.popularTag}>
                  <Text style={styles.popularTagText}>MÁS POPULAR</Text>
                </View>
                <View style={styles.packageCardBody}>
                  <View style={styles.packageRadioOuter}>
                    <View style={styles.packageRadioInner} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packageTitle}>PLAN ANUAL PRO</Text>
                    <Text style={styles.packageDesc}>Facturado anualmente. Ahorro equivalente a 4 meses.</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={styles.packagePrice}>$19.99</Text>
                    <Text style={styles.packagePeriod}>/ año</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              isProcessing && { opacity: 0.7 },
            ]}
            onPress={handlePurchase}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Text style={styles.ctaButtonText}>ACTIVAR ACCESO PRO AHORA</Text>
                <ArrowRight size={16} color="#000000" strokeWidth={3} />
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Actions & Legal */}
          <View style={styles.footerSection}>
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <RefreshCw size={12} color="#a0a0a0" strokeWidth={2} />
              <Text style={styles.restoreBtnText}>RESTAURAR COMPRAS PREVIAS</Text>
            </TouchableOpacity>

            <View style={styles.legalRow}>
              <TouchableOpacity onPress={() => openLink('https://ayeapps.com/terms')} activeOpacity={0.7}>
                <Text style={styles.legalText}>Términos de Uso</Text>
              </TouchableOpacity>
              <Text style={styles.legalDot}>•</Text>
              <TouchableOpacity onPress={() => openLink('https://ayeapps.com/privacy')} activeOpacity={0.7}>
                <Text style={styles.legalText}>Política de Privacidad</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.disclaimerText}>
              La suscripción se renueva automáticamente a menos que se cancele al menos 24 horas antes del final del periodo actual en los ajustes de tu cuenta de Apple ID.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  geoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  geoLine: {
    width: 20,
    height: 1.5,
    backgroundColor: '#FE9D01',
  },
  geoBadgeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    letterSpacing: 2,
    color: '#FE9D01',
    fontWeight: '800',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 380,
  },
  featuresCard: {
    backgroundColor: '#0d0d0d',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 18,
    marginBottom: 20,
    ...(Platform.OS === 'web' ? { boxShadow: '4px 4px 0px 0px rgba(0,0,0,0.8)' } : {}),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 12,
    marginBottom: 14,
  },
  cardHeaderText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkIconBox: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(254, 157, 1, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(254, 157, 1, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  featureItemDesc: {
    fontSize: 11,
    color: '#8a8a8a',
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ff1744',
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textAlign: 'center',
  },
  packagesContainer: {
    marginBottom: 20,
    gap: 12,
  },
  packagesSectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: '#8a8a8a',
    letterSpacing: 1,
    marginBottom: 4,
  },
  packageCard: {
    backgroundColor: '#0d0d0d',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    position: 'relative',
    ...(Platform.OS === 'web' ? { boxShadow: '3px 3px 0px 0px rgba(0,0,0,0.8)' } : {}),
  },
  packageCardSelected: {
    borderColor: '#FE9D01',
    backgroundColor: 'rgba(254, 157, 1, 0.04)',
    ...(Platform.OS === 'web' ? { boxShadow: '4px 4px 0px 0px rgba(254, 157, 1, 0.3)' } : {}),
  },
  popularTag: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: '#FE9D01',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  popularTagText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
  },
  packageCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packageRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FE9D01',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FE9D01',
  },
  packageTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e0e0e0',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  packageDesc: {
    fontSize: 11,
    color: '#7a7a7a',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FE9D01',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  packagePeriod: {
    fontSize: 10,
    color: '#8a8a8a',
    textTransform: 'uppercase',
  },
  ctaButton: {
    backgroundColor: '#FE9D01',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FE9D01',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? { boxShadow: '4px 4px 0px 0px #000000' } : {}),
  },
  ctaButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footerSection: {
    alignItems: 'center',
    gap: 12,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  restoreBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    fontWeight: '800',
    color: '#a0a0a0',
    letterSpacing: 1,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legalText: {
    fontSize: 11,
    color: '#666666',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 11,
    color: '#444444',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 14,
    maxWidth: 360,
  },
});
