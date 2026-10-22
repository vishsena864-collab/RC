// Small wrappers around the pre-cut artwork in public/art (built by scripts/build-art.mjs).
// All of it is decorative, so images carry empty alt text and explicit sizes (no layout shift).

export function NeonIcon({ name, size = 48, className = "", priority = false }) {
  return (
    <img
      src={`/art/icons/${name}.webp`}
      width={size}
      height={size}
      alt=""
      className={`neon ${className}`.trim()}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

/** A neon icon on a dark rounded tile: reads well on both the light and the dark page theme. */
export function IconTile({ name, size = 72, className = "" }) {
  const inner = Math.round(size * 0.68);
  return (
    <span className={`icon-tile ${className}`.trim()} style={{ width: size, height: size }}>
      <NeonIcon name={name} size={inner} />
    </span>
  );
}

export function Avatar({ n, size = 88, className = "", priority = false }) {
  return (
    <img
      src={`/art/avatars/a${n}.webp`}
      width={size}
      height={size}
      alt=""
      className={`avatar ${className}`.trim()}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
