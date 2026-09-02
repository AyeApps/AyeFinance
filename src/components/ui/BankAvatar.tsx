import React from 'react';
import { View, StyleSheet, ViewStyle, Image, ImageSourcePropType } from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { MexicanBankId, getBankDefinition } from '../../constants/mexicanBanks';

interface BankAvatarProps {
  bankId: MexicanBankId | string;
  size?: number;
  showBorder?: boolean;
  style?: ViewStyle;
}

const BANK_LOGOS: Record<string, ImageSourcePropType> = {
  bbva: require('../../../assets/banks/bbva.png'),
  banamex: require('../../../assets/banks/banamex.png'),
  santander: require('../../../assets/banks/santander.png'),
  banorte: require('../../../assets/banks/banorte.png'),
  scotiabank: require('../../../assets/banks/scotiabank.png'),
  nu: require('../../../assets/banks/nu.png'),
  mercadopago: require('../../../assets/banks/mercadopago.png'),
  hsbc: require('../../../assets/banks/hsbc.png'),
  azteca: require('../../../assets/banks/azteca.png'),
  banregio: require('../../../assets/banks/banregio.png'),
  heybanco: require('../../../assets/banks/heybanco.png'),
  inbursa: require('../../../assets/banks/inbursa.png'),
  spin: require('../../../assets/banks/spin.png'),
  amex: require('../../../assets/banks/amex.png'),
  visa: require('../../../assets/banks/visa.png'),
  mastercard: require('../../../assets/banks/mastercard.png'),
  binance: require('../../../assets/banks/binance.png'),
};

export const BankAvatar: React.FC<BankAvatarProps> = ({
  bankId,
  size = 36,
  showBorder = true,
  style,
}) => {
  const bank = getBankDefinition(bankId);
  const cornerRadius = Math.round(size * 0.26);
  const logoSource = BANK_LOGOS[bank.id];

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: cornerRadius,
          backgroundColor: bank.brandColor || '#141414',
          borderColor: showBorder ? 'rgba(255, 255, 255, 0.22)' : 'transparent',
        },
        style,
      ]}
    >
      {logoSource ? (
        <Image
          source={logoSource}
          resizeMode="contain"
          style={{
            width: Math.round(size * 0.78),
            height: Math.round(size * 0.78),
          }}
        />
      ) : (
        <Svg viewBox="0 0 100 100" width="65%" height="65%">
          <Rect x="18" y="28" width="64" height="48" rx="8" fill="none" stroke="#FE9D01" strokeWidth="5" />
          <Path d="M18 42 L82 42" stroke="#FE9D01" strokeWidth="4" />
          <Circle cx="64" cy="56" r="5" fill="#FE9D01" />
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
});
