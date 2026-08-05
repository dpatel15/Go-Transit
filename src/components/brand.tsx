import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-baseline gap-1.5 font-display", className)}>
      <span className="text-xl font-semibold tracking-tight text-ink">Kankotri</span>
      <span className="text-xl font-semibold tracking-tight text-gold">Studio</span>
    </Link>
  );
}
