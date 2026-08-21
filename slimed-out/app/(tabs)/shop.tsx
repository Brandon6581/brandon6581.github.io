import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GameScreen } from '@/src/components/GameScreen';
import { useIAP } from '@/src/components/IAPProvider';
import { ADD_ONS, NO_ADS_PRICE } from '@/src/game/addOnData';
import { useGameStore } from '@/src/game/store';
import { NO_ADS_PRODUCT_ID, formatPrice } from '@/src/services/iapService';
import { theme } from '@/src/theme';

export default function ShopScreen() {
  const noAdsPurchased = useGameStore((s) => s.noAdsPurchased);
  const purchasedAddOns = useGameStore((s) => s.purchasedAddOns);
  const { buy } = useIAP();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleBuy = async (productId: string) => {
    setBusyId(productId);
    await buy(productId);
    setBusyId(null);
  };

  const cheapAddOns = ADD_ONS.filter((a) => a.price === 0.25);
  const bigAddOns = ADD_ONS.filter((a) => a.price === 0.5);

  return (
    <GameScreen title="Shop">
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Text style={styles.blurb}>
          Everything you need to fully upgrade every slime is free and earned by playing. Everything
          below is optional - remove ads, or grab a small cosmetic or accelerator to say thanks.
        </Text>

        <Text style={styles.sectionTitle}>Remove ads</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.emoji}>🚫📺</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Remove Ads</Text>
              <Text style={styles.desc}>Turns off interstitial ad breaks for good. One-time.</Text>
            </View>
          </View>
          {noAdsPurchased ? (
            <View style={styles.ownedBadge}>
              <Text style={styles.ownedBadgeText}>Purchased</Text>
            </View>
          ) : (
            <Pressable
              style={styles.buyButton}
              disabled={busyId === NO_ADS_PRODUCT_ID}
              onPress={() => handleBuy(NO_ADS_PRODUCT_ID)}
            >
              <Text style={styles.buyButtonText}>{formatPrice(NO_ADS_PRICE)}</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>Add-ons - $0.25</Text>
        {cheapAddOns.map((a) => {
          const owned = purchasedAddOns.includes(a.id);
          return (
            <View key={a.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.emoji}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{a.name}</Text>
                  <Text style={styles.desc}>{a.description}</Text>
                </View>
              </View>
              {owned ? (
                <View style={styles.ownedBadge}>
                  <Text style={styles.ownedBadgeText}>Purchased</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.buyButton}
                  disabled={busyId === a.id}
                  onPress={() => handleBuy(a.id)}
                >
                  <Text style={styles.buyButtonText}>{formatPrice(a.price)}</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Add-ons - $0.50</Text>
        {bigAddOns.map((a) => {
          const owned = purchasedAddOns.includes(a.id);
          return (
            <View key={a.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.emoji}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{a.name}</Text>
                  <Text style={styles.desc}>{a.description}</Text>
                </View>
              </View>
              {owned ? (
                <View style={styles.ownedBadge}>
                  <Text style={styles.ownedBadgeText}>Purchased</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.buyButton}
                  disabled={busyId === a.id}
                  onPress={() => handleBuy(a.id)}
                >
                  <Text style={styles.buyButtonText}>{formatPrice(a.price)}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  blurb: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  emoji: { fontSize: 26 },
  name: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  desc: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  buyButton: {
    alignSelf: 'flex-start',
    backgroundColor: theme.accentGold,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  buyButtonText: { color: '#141626', fontWeight: '800', fontSize: 13 },
  ownedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(143,214,148,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ownedBadgeText: { color: theme.accentGreen, fontWeight: '700', fontSize: 12 },
});
