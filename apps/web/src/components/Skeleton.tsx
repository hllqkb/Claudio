interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  count?: number;
}

export function Skeleton({ width = "100%", height = "16px", borderRadius = "var(--radius-sm)", count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width, height, borderRadius }}
        />
      ))}
    </>
  );
}

export function PlayerSkeleton() {
  return (
    <div className="player-card skeleton-card">
      <div className="player-upper">
        <div className="dj-header">
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="80px" height="14px" />
            <Skeleton width="60px" height="12px" />
          </div>
        </div>
        <Skeleton width="100%" height="40px" />
      </div>
      <div className="player-lower">
        <Skeleton width="70%" height="20px" />
        <Skeleton width="50%" height="14px" />
        <Skeleton width="100%" height="6px" />
        <div className="controls-row">
          <Skeleton width="36px" height="36px" borderRadius="50%" count={5} />
        </div>
      </div>
    </div>
  );
}

export function PlaylistSkeleton() {
  return (
    <div className="pl-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="pl-card skeleton-card" style={{ animationDelay: `${i * 0.04}s` }}>
          <div className="pl-card-cover">
            <Skeleton width="100%" height="100%" borderRadius="0" />
          </div>
          <div className="pl-card-info">
            <Skeleton width="80%" height="14px" />
            <Skeleton width="40%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
}
