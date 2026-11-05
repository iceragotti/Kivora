import { useState } from "react";
import { Shield } from "lucide-react";

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className = "", fallbackLabel }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Shield className="w-6 h-6 mb-1.5 text-sky-600 dark:text-sky-400" />
        <span className="text-xs font-medium max-w-[22ch] truncate">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
