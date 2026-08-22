# Expo SDK 54

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before
writing any code. Dependency versions are pinned to Expo's SDK 54 manifest -
install native packages with `npx expo install <pkg>`, never plain `npm install`.

# Tap handling

The tap stage on the home screen keeps animation and gesture handling on
separate nodes on purpose. Never attach a Pressable, responder, or gesture to
the animated slime sprite, and never animate the touch target. See the comment
block at the top of `app/(tabs)/index.tsx`.
