import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IvyFrame } from '@/src/art/IvyFrame';
import { SlimeSprite } from '@/src/art/SlimeSprite';
import { useSlimeEyes } from '@/src/art/useSlimeEyes';
import { useAdGate } from '@/src/components/AdGateProvider';
import { BonusRoundModal } from '@/src/components/BonusRoundModal';
import { CareControls } from '@/src/components/CareControls';
import {
  Floater,
  FloatingValue,
  MAX_FLOATERS,
  makeFloater,
  runFloater,
} from '@/src/components/FloatingValue';
import { GameScreen } from '@/src/components/GameScreen';
import { PopInVisitor } from '@/src/components/PopInVisitor';
import { SkinFoundModal } from '@/src/components/SkinFoundModal';
import { readyRewardCount } from '@/src/game/daily';
import { VISITOR_BY_ID } from '@/src/game/eventData';
import { bonusRoundReady, bonusRoundWaitMs, popInActive, visitorDef } from '@/src/game/events';
import { ownedSkinIds } from '@/src/game/entitlements';
import { useTabContentPadding } from '@/src/components/useTabContentPadding';
import { SKIN_BY_ID, resolveLook } from '@/src/game/skinData';
import { SLIMES, SLIME_BY_ID } from '@/src/game/slimeData';
import { useGameStore } from '@/src/game/store';
import { haptics } from '@/src/feel/haptics';
import { theme } from '@/src/theme';
import { computeGps, computeTapValue } from '@/src/game/economy';
import { formatDuration, formatGps, formatNumber } from '@/src/utils/format';

/**
 * ============================================================================
 * TAP ARCHITECTURE - read before editing this screen.
 * ============================================================================
 * The tap stage is two sibling layers that never overlap in responsibility:
 *
 *   Layer 1 (sprite)  Animated.View with `pointerEvents="none"`. Purely
 *                     decorative. It moves, squishes, and breathes, and it can
 *                     never receive or swallow a touch.
 *
 *   Layer 2 (target)  A plain Pressable filling the stage, with no children,
 *                     no transform, and only `onPress`. It is the sole thing
 *                     the player actually touches.
 *
 * An earlier build made the animated sprite itself the interactive node. The
 * gesture responder then treated finger movement as a drag on the sprite and
 * ate the press, so taps silently stopped producing goo. Keeping animation and
 * gesture handling on separate nodes is what prevents that: never attach a
 * gesture, responder, or Pressable to the animated sprite, and never animate
 * the touch target.
 * ============================================================================
 */

export default function HomeScreen() {
  const bottomPad = useTabContentPadding();
  const tap = useGameStore((s) => s.tap);
  const totalTaps = useGameStore((s) => s.totalTaps);
  const slimes = useGameStore((s) => s.slimes);
  const farmName = useGameStore((s) => s.farmName);
  const boostExpiresAt = useGameStore((s) => s.boostExpiresAt);
  const boostMult = useGameStore((s) => s.boostMultiplier);
  const state = useGameStore();
  const ownedSkins = ownedSkinIds(state);
  const { maybeShowAd } = useAdGate();
  const router = useRouter();
  const [foundSkinId, setFoundSkinId] = useState<string | null>(null);
  const [boostLeft, setBoostLeft] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [bonusOpen, setBonusOpen] = useState(false);
  const [catchToast, setCatchToast] = useState<string | null>(null);

  const catchPopIn = useGameStore((s) => s.catchPopIn);
  const playBonusRound = useGameStore((s) => s.playBonusRound);
  const popInSlimeId = useGameStore((s) => s.popInSlimeId);
  const popInExpiresAt = useGameStore((s) => s.popInExpiresAt);
  const frenzyExpiresAt = useGameStore((s) => s.frenzyExpiresAt);
  const frenzyMult = useGameStore((s) => s.frenzyMultiplier);

  // Two independent drivers so a tap reaction can never interrupt the idle
  // loop (and vice versa) - they are composed, not shared.
  const bob = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const { eyes, rouse } = useSlimeEyes();
  const [floaters, setFloaters] = useState<Floater[]>([]);

  // Where the stage sits on screen, so a tap's page coordinates can be turned
  // into stage-local ones. Held in a ref rather than state: it is read during a
  // tap and must never trigger a re-render of the stage mid-interaction.
  const stageRef = useRef<View>(null);
  const stageOrigin = useRef({ x: 0, y: 0 });

  const measureStage = useCallback(() => {
    stageRef.current?.measureInWindow((x, y) => {
      stageOrigin.current = { x, y };
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      maybeShowAd();
      const interval = setInterval(maybeShowAd, 60_000);
      return () => clearInterval(interval);
    }, [maybeShowAd])
  );

  // Idle: a slow breathing bob that runs forever, untouched by input.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  // Keeps the boost badge counting down without re-rendering on every tick.
  useEffect(() => {
    const update = () => setBoostLeft(Math.max(0, boostExpiresAt - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [boostExpiresAt]);

  // One shared clock for everything that counts down on this screen: the care
  // cooldowns, the frenzy badge, and the bonus-round button.
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCatch = useCallback(() => {
    const result = catchPopIn();
    if (!result) return;
    haptics.rareReward();
    const def = VISITOR_BY_ID[result.visitorId];
    setCatchToast(
      result.kind === 'frenzy'
        ? `${def.name} caught! Production going haywire.`
        : `${def.name} caught! +${formatNumber(result.reward)} goo`
    );
    if (result.foundSkinId) setFoundSkinId(result.foundSkinId);
    setTimeout(() => setCatchToast(null), 3200);
  }, [catchPopIn]);

  const handleTap = useCallback(
    (event: GestureResponderEvent) => {
      const { value, foundSkinId: found } = tap();
      haptics.tap();
      rouse();
      if (found) {
        haptics.rareReward();
        setFoundSkinId(found);
      }

      pop.setValue(1);
      Animated.spring(pop, {
        toValue: 0,
        friction: 4.5,
        tension: 120,
        useNativeDriver: true,
      }).start();

      // pageX/pageY, converted into stage-local coordinates with the origin
      // measured at layout.
      //
      // The tempting field here is locationX/locationY, which is already
      // target-relative and would need no conversion - but it does not exist on
      // react-native-web, where nativeEvent is the raw DOM event. Reading it
      // yields undefined, `left: undefined` silently falls back to 0, and every
      // floater piles up in the stage's top-left corner. pageX/pageY is present
      // on both React Native and the web, so it is the portable choice.
      const { pageX, pageY } = event.nativeEvent;
      const origin = stageOrigin.current;
      const floater = makeFloater(value, pageX - origin.x, pageY - origin.y);
      setFloaters((current) => {
        // Oldest out first, so a rapid tapper sees their newest numbers.
        const trimmed =
          current.length >= MAX_FLOATERS
            ? current.slice(current.length - MAX_FLOATERS + 1)
            : current;
        return [...trimmed, floater];
      });
      runFloater(floater, () =>
        setFloaters((current) => current.filter((f) => f.id !== floater.id))
      );
    },
    [tap, rouse, pop]
  );

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  const squishX = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const squishY = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] });

  const ownedSummary = SLIMES.filter((s) => (slimes[s.id]?.count ?? 0) > 0);
  const heroLook = resolveLook('basic', SLIME_BY_ID.basic.look, ownedSkins);
  const tapValue = computeTapValue(state);
  const rewardsReady = readyRewardCount(state);
  const gps = computeGps(state);
  const boostRunning = boostLeft > 0;
  const frenzyLeft = Math.max(0, frenzyExpiresAt - nowMs);
  const visitor = visitorDef(state);
  const visitorHere = visitor != null && popInActive(state, nowMs);
  const bonusReady = bonusRoundReady(state, nowMs);
  const bonusWait = bonusRoundWaitMs(state, nowMs);

  return (
    <GameScreen title={farmName}>
      {boostRunning && (
        <View style={styles.boostBadge}>
          <Text style={styles.boostText}>
            {boostMult}x goo · {formatDuration(boostLeft)} left
          </Text>
        </View>
      )}
      {frenzyLeft > 0 && (
        <View style={[styles.boostBadge, styles.frenzyBadge]}>
          <Text style={[styles.boostText, styles.frenzyText]}>
            FRENZY {frenzyMult}x · {formatDuration(frenzyLeft)} left
          </Text>
        </View>
      )}
      {catchToast && (
        <View style={styles.catchToast} accessibilityLiveRegion="polite">
          <Text style={styles.catchToastText}>{catchToast}</Text>
        </View>
      )}

      <View ref={stageRef} style={styles.stage} onLayout={measureStage}>
        {/* Decorative gold ivy framing the stage. Behind everything, never
            interactive, corner-only so it cannot cross the slime or the text. */}
        <IvyFrame />

        {/* ---- Layer 1: decorative sprite. Never interactive. ---- */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.spriteLayer,
            { transform: [{ translateY: bobY }, { scaleX: squishX }, { scaleY: squishY }] },
          ]}
        >
          <SlimeSprite look={heroLook} eyes={eyes} size={210} seed="basic" />
        </Animated.View>

        {/* ---- Floating goo numbers. Also decorative. ---- */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {floaters.map((f) => (
            <FloatingValue key={f.id} floater={f} />
          ))}
        </View>

        {/* ---- Layer 2: the only interactive node. Never animated. ---- */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleTap}
          accessibilityRole="button"
          accessibilityLabel={`Tap the slime to make goo. Each tap gives ${formatNumber(tapValue)} goo.`}
          accessibilityHint="Double tap to collect goo"
        />

        {/* The visitor sits AFTER the main target so its own small Pressable
            wins inside its little box, while every touch outside that box
            still falls through to the goo tap above. */}
        {visitorHere && (
          <PopInVisitor
            def={visitor}
            slimeId={popInSlimeId!}
            expiresAt={popInExpiresAt}
            onCatch={handleCatch}
          />
        )}
      </View>

      <Text style={styles.hint}>+{formatNumber(tapValue)} per tap</Text>
      <Text
        style={styles.tapCount}
        accessibilityLabel={`${formatNumber(totalTaps)} taps so far, producing ${formatGps(gps)}`}
      >
        {formatNumber(totalTaps)} taps · {formatGps(gps)}
      </Text>

      <CareControls nowMs={nowMs} />

      <ScrollView contentContainerStyle={[styles.summary, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <Pressable
          style={[styles.bonusCard, !bonusReady && styles.bonusCardWaiting]}
          onPress={() => setBonusOpen(true)}
          disabled={!bonusReady}
          accessibilityRole="button"
          accessibilityState={{ disabled: !bonusReady }}
          accessibilityLabel={
            bonusReady
              ? 'Bonus round ready. Stop the marker in the centre for a multiplier.'
              : `Bonus round recharging, ${formatDuration(bonusWait)} left`
          }
        >
          <Text style={styles.bonusEmoji}>🎡</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bonusTitle, !bonusReady && styles.bonusTitleWaiting]}>
              {bonusReady ? 'Bonus round ready' : 'Bonus round'}
            </Text>
            <Text style={styles.bonusSub}>
              {bonusReady
                ? 'Stop the marker dead centre for up to 5x'
                : `Recharging · ${formatDuration(bonusWait)}`}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.dailyCard}
          onPress={() => router.push('/daily')}
          accessibilityRole="button"
          accessibilityLabel={
            rewardsReady > 0
              ? `Daily rewards, ${rewardsReady} ready to collect`
              : 'Daily rewards and quests'
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyTitle}>Daily rewards</Text>
            <Text style={styles.dailySub}>
              {rewardsReady > 0
                ? `${rewardsReady} ready to collect`
                : 'Streak, quests and this week\u2019s challenge'}
            </Text>
          </View>
          {rewardsReady > 0 && (
            <View style={styles.dailyBadge}>
              <Text style={styles.dailyBadgeText}>{rewardsReady}</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.summaryTitle}>Your collection</Text>
        {ownedSummary.length === 0 ? (
          <Text style={styles.empty}>
            No slimes yet - visit the Slimes tab once you have some goo!
          </Text>
        ) : (
          ownedSummary.map((def) => {
            const owned = slimes[def.id];
            return (
              <Pressable
                key={def.id}
                style={styles.row}
                onPress={() => router.push({ pathname: '/slime/[id]', params: { id: def.id } })}
              >
                <View pointerEvents="none">
                  <SlimeSprite
                    look={resolveLook(def.id, def.look, ownedSkins)}
                    eyes="asleep"
                    size={38}
                    seed={def.id}
                  />
                </View>
                <Text style={styles.rowName}>{def.name}</Text>
                <Text style={styles.rowCount}>x{formatNumber(owned.count)}</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <SkinFoundModal
        skin={foundSkinId ? SKIN_BY_ID[foundSkinId] : null}
        onClose={() => setFoundSkinId(null)}
      />

      <BonusRoundModal
        visible={bonusOpen}
        onStop={playBonusRound}
        onClose={() => setBonusOpen(false)}
      />
    </GameScreen>
  );
}

const styles = StyleSheet.create({
  boostBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(245,196,81,0.18)',
    borderColor: theme.accentGold,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 4,
  },
  boostText: { color: theme.accentGold, fontSize: 12, fontWeight: '800' },
  stage: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    marginTop: 4,
    color: theme.accentGreen,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  tapCount: {
    marginTop: 3,
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  summary: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 8,
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20,26,22,0.66)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.accentGold,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    minHeight: 44,
  },
  frenzyBadge: { borderColor: '#5BE9E9', backgroundColor: 'rgba(91,233,233,0.14)' },
  frenzyText: { color: '#5BE9E9', letterSpacing: 1 },
  catchToast: {
    alignSelf: 'center',
    backgroundColor: 'rgba(143,214,148,0.18)',
    borderColor: theme.accentGreen,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  catchToastText: { color: theme.accentGreen, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20,26,22,0.66)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.accentGold,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    minHeight: 44,
  },
  bonusCardWaiting: { borderColor: theme.cardBorder },
  bonusEmoji: { fontSize: 22 },
  bonusTitle: { color: theme.accentGold, fontSize: 15, fontWeight: '800' },
  bonusTitleWaiting: { color: theme.textSecondary },
  bonusSub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  dailyTitle: { color: theme.accentGold, fontSize: 15, fontWeight: '800' },
  dailySub: { color: theme.textSecondary, fontSize: 12, marginTop: 2 },
  dailyBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  dailyBadgeText: { color: '#241C05', fontSize: 13, fontWeight: '800' },
  summaryTitle: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  empty: {
    color: theme.textMuted,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20,26,22,0.55)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
  },
  rowName: { flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: '600' },
  rowCount: { color: theme.accentGreen, fontSize: 14, fontWeight: '700' },
});
