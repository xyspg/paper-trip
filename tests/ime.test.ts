import { describe, expect, it } from "bun:test";
import type { KeyboardEvent } from "react";
import { blockImeSubmit, createImeEscapeTracker, isComposing, isEnterKey } from "../src/ime";

// The helpers only read `key` plus two fields of the native event, so a plain object
// stands in for React's synthetic keyboard event.
function keyEvent(key: string, native: { isComposing?: boolean; keyCode?: number } = {}) {
  let prevented = false;
  const event = {
    key,
    nativeEvent: { isComposing: native.isComposing ?? false, keyCode: native.keyCode ?? 0 },
    preventDefault: () => {
      prevented = true;
    },
  };
  return {
    event: event as unknown as KeyboardEvent<HTMLFormElement>,
    wasPrevented: () => prevented,
  };
}

describe("IME-aware Enter", () => {
  it("treats a plain Enter as a command", () => {
    expect(isEnterKey(keyEvent("Enter").event)).toBeTrue();
    expect(isComposing(keyEvent("Enter").event)).toBeFalse();
  });

  it("ignores the Enter that accepts an IME candidate", () => {
    expect(isEnterKey(keyEvent("Enter", { isComposing: true }).event)).toBeFalse();
  });

  it("ignores composition on engines that only report keyCode 229", () => {
    const legacy = keyEvent("Enter", { keyCode: 229 }).event;
    expect(isComposing(legacy)).toBeTrue();
    expect(isEnterKey(legacy)).toBeFalse();
  });

  it("stays out of the way of other keys", () => {
    expect(isEnterKey(keyEvent("Escape").event)).toBeFalse();
    expect(isEnterKey(keyEvent("a").event)).toBeFalse();
  });
});

describe("blockImeSubmit", () => {
  it("cancels implicit form submission while composing", () => {
    for (const native of [{ isComposing: true }, { keyCode: 229 }]) {
      const composing = keyEvent("Enter", native);
      blockImeSubmit(composing.event);
      expect(composing.wasPrevented()).toBeTrue();
    }
  });

  it("leaves a deliberate Enter submitting the form", () => {
    const plain = keyEvent("Enter");
    blockImeSubmit(plain.event);
    expect(plain.wasPrevented()).toBeFalse();
  });

  it("never cancels non-Enter keys", () => {
    const space = keyEvent(" ", { isComposing: true });
    blockImeSubmit(space.event);
    expect(space.wasPrevented()).toBeFalse();
  });
});

describe("IME-aware Escape", () => {
  it("swallows the keyup whose keydown the IME consumed", () => {
    const t = createImeEscapeTracker();
    t.compositionStart();
    // Chrome masks the consumed key as "Process" and reports keyCode 229.
    t.keyDown({ key: "Process", code: "Escape", keyCode: 229 });
    // `compositionend` already fired, so the keyup itself looks perfectly ordinary.
    t.compositionEnd();
    expect(t.keyUp({ key: "Escape", code: "Escape", keyCode: 27 })).toBeTrue();
  });

  it("swallows it on WebKit, where compositionend beats the keydown", () => {
    const t = createImeEscapeTracker();
    t.compositionStart();
    // The grace period keeps the composition flag alive across this keydown.
    t.keyDown({ key: "Escape", code: "Escape", keyCode: 27, isComposing: false });
    t.compositionEnd();
    expect(t.keyUp({ key: "Escape", code: "Escape", keyCode: 27 })).toBeTrue();
  });

  it("swallows it while a preedit survives the Escape", () => {
    const t = createImeEscapeTracker();
    t.compositionStart();
    t.keyDown({ key: "Escape", code: "Escape", isComposing: true });
    expect(t.keyUp({ key: "Escape", code: "Escape" })).toBeTrue();
  });

  it("lets a deliberate Escape close the dialog", () => {
    const t = createImeEscapeTracker();
    t.keyDown({ key: "Escape", code: "Escape", keyCode: 27 });
    expect(t.keyUp({ key: "Escape", code: "Escape", keyCode: 27 })).toBeFalse();
  });

  it("lets the second Escape through after the first dismissed the IME", () => {
    const t = createImeEscapeTracker();
    t.compositionStart();
    t.keyDown({ key: "Process", code: "Escape", keyCode: 229 });
    t.compositionEnd();
    expect(t.keyUp({ key: "Escape", code: "Escape" })).toBeTrue();

    t.keyDown({ key: "Escape", code: "Escape", keyCode: 27 });
    expect(t.keyUp({ key: "Escape", code: "Escape", keyCode: 27 })).toBeFalse();
  });

  it("ignores every other key", () => {
    const t = createImeEscapeTracker();
    t.compositionStart();
    t.keyDown({ key: "Process", code: "KeyA", keyCode: 229 });
    expect(t.keyUp({ key: "a", code: "KeyA" })).toBeFalse();
  });
});
