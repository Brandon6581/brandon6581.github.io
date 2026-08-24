import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SlimeSprite } from '@/src/art/SlimeSprite';
import { GameScreen } from '@/src/components/GameScreen';
import { useTabContentPadding } from '@/src/components/useTabContentPadding';
import { useIAP } from '@/src/components/IAPProvider';
import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  NO_ADS_PRICE,
  SHOP_ITEMS,
  ShopItemDef,
  starterPackSeparateValue,
} from '@/src/game/shopData';
import { adsRemoved, ownsItem } from '@/src/game/entitlements';
import { SKIN_BY_ID } from '@/src/game/skinData';
import { useGameStore } from '@/src/game/store';
import { NO_ADS_PRODUCT_ID, formatPrice } from '@/src/services/iapService';
import { theme } from '@/src/theme';
import { formatNumber } from '@/src/utils/format';

export default function ShopScreen() {
  const bottomPad = useTabContentPadding();
  const state = useGameStore();
  const noAdsPurchased = adsRemoved(state);
  const { buy } = useIAP();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleBuy = async (productId: string) => {
    setBusyId(productId);
    await buy(productId);
    setBusyId(null);
  };

  const owns = (id: string) => ownsItem(state, id);

  return (
    <GameScreen title="Shop">
      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.blurb}>
          Every upgrade in the game can be earned by playing. Nothing here is required - it is
          for making the place yours, saving a little time, and filling out a collection.
        </Text>

        {/* Remove Ads sits on its own above the categories. */}
        <View style={styles.card}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>Remove Ads</Text>
              <Text style={styles.desc}>
                Turns off interstitial ad breaks for good. One-time purchase.
              </Text>
            </View>
          </View>
          {noAdsPurchased ? (
            <OwnedBadge />
          ) : (
            <BuyButton
              label={formatPrice(NO_ADS_PRICE)}
              busy={busyId === NO_ADS_PRODUCT_ID}
              onPress={() => handleBuy(NO_ADS_PRODUCT_ID)}
            />
          )}
        </View>

        {CATEGORY_ORDER.map((category) => {
          const items = SHOP_ITEMS.filter((i) => i.category === category);
          if (items.length === 0) return null;

          return (
            <View key={category} style={styles.section}>
              <Text style={styles.sectionTitle}>{CATEGORY_LABELS[category]}</Text>
              <Text style={styles.sectionBlurb}>{CATEGORY_BLURBS[category]}</Text>

              {items.map((item) => (
                <ShopRow
                  key={item.id}
                  item={item}
                  owned={owns(item.id)}
                  busy={busyId === item.id}
                  onBuy={() => handleBuy(item.id)}
                />
              ))}
            </View>
          );
        })}

        <Text style={styles.footnote}>
          Backdrops are free for everyone and live in Settings.
        </Text>
      </ScrollView>
    </GameScreen>
  );
}

function ShopRow({
  item,
  owned,
  busy,
  onBuy,
}: {
  item: ShopItemDef;
  owned: boolean;
  busy: boolean;
  onBuy: () => void;
}) {
  const skin = item.effect.kind === 'skin' ? SKIN_BY_ID[item.effect.skinId] : null;
  const isBundle = item.effect.kind === 'bundle';
  const comingSoon = item.status === 'comingSoon';

  return (
    <View style={[styles.card, comingSoon && styles.cardSoon]}>
      <View style={styles.rowTop}>
        {skin && (
          <View pointerEvents="none" style={styles.skinPreview}>
            <SlimeSprite look={skin.look} eyes="roused" size={54} seed={skin.id} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, comingSoon && styles.nameSoon]}>{item.name}</Text>
          <Text style={styles.desc}>{item.blurb}</Text>

          {isBundle && item.effect.kind === 'bundle' && (
            <Text style={styles.bundleLine}>
              Includes {formatNumber(item.effect.goo)} goo · worth{' '}
              {formatPrice(starterPackSeparateValue())} of cosmetics separately
            </Text>
          )}

          {comingSoon && item.note && <Text style={styles.note}>{item.note}</Text>}
        </View>
      </View>

      {comingSoon ? (
        <View style={styles.soonBadge}>
          <Text style={styles.soonBadgeText}>Coming soon</Text>
        </View>
      ) : owned && !item.repeatable ? (
        <OwnedBadge />
      ) : (
        <BuyButton
          label={item.repeatable && owned ? `${formatPrice(item.price ?? 0)} · buy again` : formatPrice(item.price ?? 0)}
          busy={busy}
          onPress={onBuy}
        />
      )}
    </View>
  );
}

function BuyButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={styles.buyButton}
      disabled={busy}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Purchase for ${label}`}
    >
      <Text style={styles.buyButtonText}>{label}</Text>
    </Pressable>
  );
}

function OwnedBadge() {
  return (
    <View style={styles.ownedBadge}>
      <Text style={styles.ownedBadgeText}>Purchased</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  blurb: { color: theme.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 4 },
  section: { gap: 10, marginTop: 10 },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionBlurb: { color: theme.textMuted, fontSize: 12, marginTop: -6, marginBottom: 2 },
  card: {
    backgroundColor: 'rgba(18,24,20,0.62)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardSoon: { borderStyle: 'dashed', backgroundColor: 'rgba(18,24,20,0.35)' },
  rowTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  skinPreview: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.textPrimary, fontSize: 15, fontWeight: '700' },
  nameSoon: { color: theme.textSecondary },
  desc: { color: theme.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 },
  bundleLine: { color: theme.accentGold, fontSize: 11, fontWeight: '700', marginTop: 5 },
  note: { color: theme.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 5 },
  buyButton: {
    minHeight: 44,
    justifyContent: 'center',
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
  soonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  soonBadgeText: { color: theme.textMuted, fontWeight: '700', fontSize: 12 },
  footnote: {
    color: theme.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
