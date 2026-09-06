// Aliased so the DOM `KeyboardEvent` stays available for the document-level guard below.
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

// An IME (Chinese/Japanese/Korean input) owns the keyboard while a candidate is being
// composed, and the keys that drive it (Enter to accept a candidate above all) still
// reach the page as ordinary keydowns. `isComposing` on the native event is the modern
// signal; WebKit and older engines only report the legacy keyCode 229 for those keys,
// so both are checked.
export function isComposing(e: ReactKeyboardEvent): boolean {
  return e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229;
}

// True only for an Enter the user meant as a command. Guard every "commit / send /
// blur on Enter" handler with this so accepting an IME candidate never doubles as
// confirming the field.
export function isEnterKey(e: ReactKeyboardEvent): boolean {
  return e.key === "Enter" && !isComposing(e);
}

// `<form onKeyDown={blockImeSubmit}>`: without this the Enter that closes an IME
// composition triggers implicit form submission, so a dialog submits and closes while
// the user is still typing their first word.
export function blockImeSubmit(e: ReactKeyboardEvent<HTMLFormElement>): void {
  if (e.key === "Enter" && isComposing(e)) e.preventDefault();
}

type KeyInfo = { key?: string; code?: string; isComposing?: boolean; keyCode?: number };

// The IME masks the physical key it consumed: Chrome reports `key: "Process"` for a
// keydown the IME swallowed, while `code` always names the real key.
function isEscapeKey(e: KeyInfo): boolean {
  return e.key === "Escape" || e.code === "Escape";
}

// Escape with a candidate list open means "dismiss the candidates", never "close the
// dialog". Base Web closes its modals from the Escape *keyup* it hears at the document
// (baseui/layer/layers-manager.js), and that is the one event the IME leaves looking
// ordinary: `compositionend` has already fired, so the keyup carries no composition at
// all. Only the keydown still knows, so the verdict is made there and the keyup it
// pairs with is swallowed. Split out from the DOM wiring below so it can be tested.
export function createImeEscapeTracker() {
  let composing = false;
  let swallowKeyup = false;

  return {
    compositionStart() {
      composing = true;
    },
    // Callers delay this by a beat; see COMPOSITION_GRACE_MS.
    compositionEnd() {
      composing = false;
    },
    keyDown(e: KeyInfo) {
      if (!isEscapeKey(e)) return;
      swallowKeyup = composing || e.isComposing === true || e.keyCode === 229;
    },
    // True when this keyup closed a composition rather than a dialog. `composing`
    // still counts: some IMEs drop only the candidate list on Escape and keep the
    // preedit alive, so no `compositionend` ever arrives.
    keyUp(e: KeyInfo): boolean {
      if (!isEscapeKey(e)) return false;
      const owned = swallowKeyup || composing;
      swallowKeyup = false;
      return owned;
    },
  };
}

// WebKit fires `compositionend` *before* the keydown that ended the composition, so
// the flag has to outlive the composition by a beat or that keydown reads as ordinary.
// 0ms and 1ms are not enough there; 5ms is. https://bugs.webkit.org/show_bug.cgi?id=165004
const COMPOSITION_GRACE_MS = 5;

// Stops an IME's Escape from closing whatever Base Web modal is open. Listens in the
// capture phase so the keyup is dropped before it reaches the document-level handler
// that Base Web installs. Returns the teardown.
export function installImeEscapeGuard(doc: Document = document): () => void {
  const tracker = createImeEscapeTracker();
  let settle: ReturnType<typeof setTimeout> | undefined;

  const onCompositionStart = () => {
    clearTimeout(settle);
    tracker.compositionStart();
  };
  const onCompositionEnd = () => {
    clearTimeout(settle);
    settle = setTimeout(() => tracker.compositionEnd(), COMPOSITION_GRACE_MS);
  };
  const onKeyDown = (e: KeyboardEvent) => tracker.keyDown(e);
  const onKeyUp = (e: KeyboardEvent) => {
    if (tracker.keyUp(e)) e.stopPropagation();
  };

  doc.addEventListener("compositionstart", onCompositionStart, true);
  doc.addEventListener("compositionend", onCompositionEnd, true);
  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("keyup", onKeyUp, true);

  return () => {
    clearTimeout(settle);
    doc.removeEventListener("compositionstart", onCompositionStart, true);
    doc.removeEventListener("compositionend", onCompositionEnd, true);
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("keyup", onKeyUp, true);
  };
}
