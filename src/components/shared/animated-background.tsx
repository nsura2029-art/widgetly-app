/**
 * Full-bleed background with a restrained dot grid and soft fades.
 * It keeps the first viewport product-like and quiet across devices.
 */
export function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.12) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(to bottom, black 0%, black 42%, transparent 88%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 42%, transparent 88%)",
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-72 opacity-80"
        style={{
          background:
            "linear-gradient(180deg, rgba(238, 240, 255, 0.72) 0%, rgba(255, 255, 255, 0) 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-white" />
    </div>
  );
}
