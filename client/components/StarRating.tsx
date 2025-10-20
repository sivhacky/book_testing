import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}

export function StarRating({ value, onChange, size = 18, readOnly, className }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const stars = [1, 2, 3, 4, 5];
  const active = hover ?? value;

  return (
    <div className={cn("flex items-center gap-1", className)} aria-label={`Rating: ${value} out of 5`}>
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(s)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange && onChange(s)}
          className={cn("p-0.5 rounded", readOnly ? "cursor-default" : "cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring")}
          aria-label={`${s} star`}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              active >= s ? "fill-primary text-primary" : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}
