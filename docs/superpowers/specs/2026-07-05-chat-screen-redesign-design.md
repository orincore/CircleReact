# Chat Screen Redesign: Bubbles, Typing Indicator, Online Status

## Goal

The conversation screen (`app/secure/chat-conversation.jsx`) looks and feels generic: flat solid-color message bubbles with no entrance animation, a typing indicator that's just three static gray dots, and an online/offline state that's plain text with no visual indicator on the avatar. This redesign gives all three a modern, bold/playful (Instagram DM-style) treatment with smooth Reanimated-driven animation, without touching any of the screen's existing data/socket logic (message send/receive, receipts, blind-date reveal, edits, reactions, media messages all stay exactly as they are).

## Scope

- **In scope**: `app/secure/chat-conversation.jsx` visual/animation layer only — message bubble styling + entrance animation, typing indicator, online-status indicator on the header avatar.
- **Out of scope**: chat list screen, user profile screens, any socket/presence backend logic, message send/receive/receipt logic, blind-date reveal flow, reactions, edit, media handling. Online status improvements are scoped to this screen only (not propagated elsewhere).
- **Non-goal**: fixing any specific existing performance bug — no such bug is known; the requirement is that the new animations must not introduce any regression (must stay 60fps, off the JS thread).

## Current State (for reference)

- Typing indicator: `app/secure/chat-conversation.jsx` renders a static row of 3 `View` dots + "typing..." text (no animation) when `typingUsers.length > 0`.
- Online status: plain `Text` reading "Online"/"Offline" under the conversation name; no indicator on the avatar itself.
- Message bubbles: flat solid colors (`#E9D5FF` mine / `#FFFFFF` theirs), no shadow, no entrance animation, not fully dark-mode aware.
- `react-native-reanimated` v4.3.1 is already installed and configured (Expo SDK 56 wires its babel plugin automatically via `babel-preset-expo`) but is barely used in this file (only a `runOnJS` import) — no new dependencies are needed for this work.
- `expo-linear-gradient` is already installed and unused in this file.

## New Components

### `components/chat/TypingIndicator.jsx`
- Props: `visible: boolean`, `avatarUrl?: string`.
- Renders a small avatar + a bubble shaped like "their" message bubble (same corner radius/background as the redesigned theirBubble) containing 3 dots.
- The 3 dots run a staggered up/down bounce loop via Reanimated (`withRepeat(withSequence(withTiming(...), withTiming(...)))`, each dot offset by ~120ms).
- The whole component fades + scales in (0.8→1) when `visible` becomes true, and fades + scales out when it becomes false, rather than the current hard mount/unmount.
- Purely presentational — the parent screen continues to own `typingUsers` state and socket event handling exactly as today; it just passes `visible={typingUsers.length > 0}`.

### `components/chat/OnlineStatusDot.jsx`
- Props: `isOnline: boolean`, `size?: number`.
- Renders nothing when `isOnline` is false.
- When `isOnline` is true, renders a small green circle (positioned by the parent, absolutely, at the avatar's bottom-right) with a continuous breathing pulse: `withRepeat(withSequence(scale/opacity up, scale/opacity down), -1)`.
- Parent screen also keeps the existing "Online"/"Offline" text label, but crossfades it (`Animated.Text`/opacity transition) on change instead of an instant swap.

### `components/chat/AnimatedMessageBubble.jsx`
- Props: `isMine: boolean`, `children` (the already-rendered bubble content from the existing `renderItem`).
- On mount, animates opacity 0→1, translateY 8→0, scale 0.94→1 over ~220ms (Reanimated `useAnimatedStyle` + `withTiming`).
- Applies the new background: `LinearGradient` (purple→pink, theme-aware) when `isMine`, elevated surface color + soft shadow when not.
- Does **not** re-implement or wrap any interaction logic (long-press menu, reactions, edit, selection, media rendering) — it only wraps the visual container. `renderItem`'s return value becomes `children`.
- Because messages are keyed by stable `item.id` and rendered via `.map()` (not a virtualized list), a new message mounts exactly one new `AnimatedMessageBubble` instance; existing bubbles are never remounted by unrelated re-renders (typing indicator toggling, scroll, etc.), so the entrance animation naturally never replays for old messages.

## Changes to `chat-conversation.jsx`

1. Replace the static `typingRow`/`typingDotsContainer`/`typingDot` block (lines ~2961-2972) with `<TypingIndicator visible={typingUsers.length > 0} avatarUrl={avatarUrl} />`. Remove the now-unused `typingRow`/`typingDotsContainer`/`typingDot`/`typingText` style entries.
2. In the header (around lines 2777-2882), overlay `<OnlineStatusDot isOnline={isOnline} />` on the avatar container, and wrap the "Online"/"Offline" `Text` in a crossfade.
3. In the messages render loop (~line 2955), wrap each `renderItem({item, index})` result in `<AnimatedMessageBubble isMine={isMine}>...</AnimatedMessageBubble>`, reusing the exact same `isMine` boolean already computed at line 1986 (`senderIdStr && myUserId && senderIdStr === myUserId`) that `renderItem` itself uses internally — no new derivation, just passed one level up.
4. Update `myMessageBubble`/`theirMessageBubble` style objects: gradient colors (mine) / elevated surface + shadow (theirs) instead of flat colors, slightly larger `borderRadius`, values driven from `theme` so dark mode looks correct.

## Data Flow

No changes. `typingUsers` and `isOnline` continue to be populated exactly as today via the existing `chat:typing` and `chat:presence` socket handlers — the new components are pure consumers of that same state via props. No new socket events, no new API calls.

## Error Handling

None of this touches error paths. If `avatarUrl` is missing, `TypingIndicator` falls back to the same initial-letter avatar treatment already used elsewhere in the header. If Reanimated's shared values fail to initialize for any reason, components fall back to their final (settled) visual state rather than being invisible (no animation is an acceptable degradation; a missing bubble is not).

## Testing / Verification

This is a visual/animation change with no meaningful unit-testable logic. Verification is manual, using the `run` skill / browser or device tooling to confirm, per the `verify` skill's guidance for runtime-observable changes:
- Typing indicator appears within a beat of the other user typing and disappears shortly after they stop, with a smooth (not jarring) entrance/exit.
- Online status dot correctly reflects presence changes in real time (toggle a second test account online/offline and observe).
- New messages animate in on both sides (mine/theirs) without any perceptible delay in when the message content itself becomes visible/readable.
- Scrolling through a long history remains smooth — no jank introduced by the new bubble wrapper.
- Dark mode: gradient/elevated colors and the online dot all look correct against the dark theme.
