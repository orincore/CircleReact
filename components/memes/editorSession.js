// expo-router has no built-in way to pass a return value back from a pushed
// screen (unlike UIKit's delegate pattern or a Promise-returning modal).
// This is the same problem tokenStore.ts/authEvents.ts solve for other
// cross-module handoffs, but simpler: only one edit session is ever in
// flight at a time, so a single mutable slot (not a pub/sub set) is enough.
//
// Flow: create.jsx calls startEditorSession(input) then router.push()'s the
// editor screen; that screen reads getEditorInput() on mount. On Done, it
// calls setEditorResult(result) then router.back(); create.jsx's
// useFocusEffect calls consumeEditorResult() to pick it up.

let pendingInput = null;
let pendingResult = null;

export function startEditorSession(input) {
  pendingInput = input;
  pendingResult = null;
}

export function getEditorInput() {
  return pendingInput;
}

export function setEditorResult(result) {
  pendingResult = result;
}

export function consumeEditorResult() {
  const result = pendingResult;
  pendingResult = null;
  return result;
}
