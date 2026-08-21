import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '@/src/services/iapService';

interface Props {
  visible: boolean;
  productName: string | null;
  price: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PurchaseModal({ visible, productName, price, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.badge}>SIMULATED STORE PURCHASE</Text>
          <Text style={styles.title}>{productName}</Text>
          {price != null && <Text style={styles.price}>{formatPrice(price)}</Text>}
          <Text style={styles.body}>
            This confirms the purchase locally for testing. Wire up react-native-iap in
            src/services/iapService.ts to charge a real payment method before release.
          </Text>
          <View style={styles.row}>
            <Pressable style={[styles.button, styles.cancel]} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirm]} onPress={onConfirm}>
              <Text style={styles.buttonText}>Buy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    backgroundColor: '#1E2233',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 8,
  },
  badge: {
    color: '#9AA3C7',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  price: {
    color: '#8FD694',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  body: {
    color: '#C3C9E6',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancel: {
    backgroundColor: '#3A4066',
  },
  confirm: {
    backgroundColor: '#5B8CFF',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
});
