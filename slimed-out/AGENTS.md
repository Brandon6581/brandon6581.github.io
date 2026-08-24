# Expo SDK 54

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code. Dependency versions are pinned to Expo's SDK 54 manifest -
install native packages with `npx expo install <pkg>`, never plain `npm install`.

# Tap handling

The tap stage on the home screen keeps animation and gesture handling on
separate nodes on purpose. Never attach a Pressable, responder, or gesture to
the animated slime sprite, and never animate the touch target. See the comment
block at the top of `app/(tabs)/index.tsx`.

This applies to every tappable thing on the stage, not just the main slime. The
rare visitor (`src/components/PopInVisitor.tsx`) follows the same two-layer
split. Note especially that an `Animated.View` wrapping a `TouchableOpacity` is
the *same bug in a different shape* - the responder treats finger movement as a
drag on the animated parent and eats the press. Animate a sibling, never an
ancestor of the touch target.

# Touch coordinates

`nativeEvent.locationX` / `locationY` **do not exist on react-native-web** -
there `nativeEvent` is the raw DOM event. Reading them yields `undefined`, which
silently becomes `0` in a style, so anything positioned from them piles up in a
corner instead of erroring. Use `pageX` / `pageY`, which both platforms provide,
and convert to container-local coordinates with a `measureInWindow` origin
captured in `onLayout`. See `handleTap` in `app/(tabs)/index.tsx`.
