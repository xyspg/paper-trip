export function PapertripLogo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/icon-192.png"
      alt=""
      aria-hidden="true"
      className={`shrink-0 object-cover ${className}`}
    />
  );
}
