import type { ErrorComponentProps } from "@tanstack/react-router";
import { useMountEffect } from "../useMountEffect";
import { hasAttemptedRecovery, isAssetLoadError, recoverStaleAssets } from "../assetRecovery";

// Router `defaultErrorComponent`. Replaces TanStack Router's raw English
// "Something went wrong!" panel with the paper-themed, localized recovery UI and,
// for a stale/poisoned asset chunk, self-heals by clearing caches and reloading
// once before falling back to guidance. See `assetRecovery.ts` for the failure
// mode this addresses on iOS Safari.
export function AppErrorBoundary({ error }: ErrorComponentProps) {
  const assetError = isAssetLoadError(error);
  const shouldAutoRecover = assetError && !hasAttemptedRecovery();

  useMountEffect(() => {
    if (shouldAutoRecover) recoverStaleAssets();
  });

  // The one-shot recovery navigates away; render nothing so the error UI does not
  // flash before the reload lands.
  if (shouldAutoRecover) return null;

  return (
    <main className="min-h-svh flex items-center bg-paper text-ink font-sans">
      <div className="w-[min(520px,100%)] mx-auto px-6 py-[12vh]">
        <h1 className="text-[21px] font-bold mb-2.5">Papertrip 资源加载失败</h1>
        <p className="text-ink-soft leading-relaxed">
          浏览器仍在使用旧版页面资源。请关闭这个页面后重新打开；如果你在应用内浏览器中，请选择「在
          Safari 中打开」。
        </p>
        <button
          type="button"
          onClick={() => recoverStaleAssets()}
          className="mt-5 inline-flex items-center rounded-md border border-ink px-4 py-2 text-sm font-semibold"
        >
          重新加载
        </button>
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-auto rounded-md border border-red-500 p-3 text-xs text-red-600">
            {String((error as { message?: unknown })?.message ?? error)}
          </pre>
        ) : null}
      </div>
    </main>
  );
}
