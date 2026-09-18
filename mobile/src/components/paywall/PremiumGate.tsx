import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { useTheme } from '../../hooks/useTheme';
import { AyePaywallModal } from './AyePaywallModal';

interface PremiumGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  onUnlock?: () => void;
}

export const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  title = 'FUNCIÓN PRO',
  description = 'Desbloquea esta función con AyeFinance PRO.',
  onUnlock,
}) => {
  const isPro = useSubscriptionStore((state) => state.isPro);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const { colors } = useTheme();

  if (!isPro) {
    return (
      <>
        <TouchableOpacity
          style={[styles.lockedBox, { backgroundColor: colors.bgSurface, borderColor: colors.borderColor }]}
          onPress={() => setPaywallVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.lockIconBox, { backgroundColor: colors.accentSubtle }]} >
            <Lock size={16} color={colors.accent} strokeWidth={2.5} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.lockedDesc, { color: colors.textMuted }]}>{description}</Text>
        </TouchableOpacity>

        <AyePaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          onSuccess={() => {
            setPaywallVisible(false);
            onUnlock?.();
          }}
        />
      </>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  lockedBox: { borderWidth: 1.5, padding: 16, alignItems: 'center', gap: 6 },
  lockIconBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  lockedTitle: { fontSize: 13, fontWeight: '800' },
  lockedDesc: { fontSize: 11, textAlign: 'center' },
});
