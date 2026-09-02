import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BankAvatar } from './BankAvatar';
import {
  MEXICAN_BANKS,
  MexicanBankId,
} from '../../constants/mexicanBanks';
import { useTheme } from '../../hooks/useTheme';

interface BankSelectorProps {
  selectedBankId: MexicanBankId;
  onSelectBank: (bankId: MexicanBankId) => void;
  autoDetected?: boolean;
}

export const BankSelector: React.FC<BankSelectorProps> = ({
  selectedBankId,
  onSelectBank,
  autoDetected = false,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          INSTITUCIÓN / LOGO DEL BANCO
        </Text>
        {autoDetected && (
          <View style={[styles.detectedBadge, { backgroundColor: colors.accentSubtle, borderColor: colors.accent }]}>
            <Text style={[styles.detectedText, { color: colors.accent }]}>
              ⚡ DETECTADO AUTOMÁTICAMENTE
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {MEXICAN_BANKS.map((bank) => {
          const isSelected = selectedBankId === bank.id;
          return (
            <TouchableOpacity
              key={bank.id}
              activeOpacity={0.75}
              onPress={() => onSelectBank(bank.id)}
              style={[
                styles.bankPill,
                {
                  backgroundColor: isSelected ? colors.bgCard : colors.bgSurface,
                  borderColor: isSelected ? colors.accent : colors.borderMuted,
                  borderWidth: isSelected ? 2 : 1,
                },
                isSelected && {
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.35,
                  shadowRadius: 4,
                  elevation: 3,
                },
              ]}
            >
              <BankAvatar bankId={bank.id} size={28} showBorder={false} />
              <Text
                style={[
                  styles.bankName,
                  {
                    color: isSelected ? colors.textPrimary : colors.textMuted,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {bank.shortName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  detectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  detectedText: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  scrollContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  bankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 8,
  },
  bankName: {
    fontSize: 12,
    fontFamily: 'System',
  },
});
