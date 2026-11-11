import { useState } from "react";
import { Skeleton } from "@radix-ui/themes";

export default function AchievementIcon({ src, pending }: { src?: string; pending: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = failed || (!pending && !src) ? "/unknown.png" : src;
  return (
    <span className="forever-achievement-icon">
      {!loaded && <Skeleton width="40px" height="40px" />}
      {source && <img src={source} alt="" loading="lazy" style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)} onError={() => { setFailed(true); setLoaded(false); }} />}
    </span>
  );
}
