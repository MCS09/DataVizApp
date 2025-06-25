"use client";
import { useRouter } from "next/navigation";

type RedirectButtonProps = {
  label: string;
  to: string;
  className?: string;
};

export default function RedirectButton({
  label,
  to,
  className = "btn btn-primary"
}: RedirectButtonProps) {
  const router = useRouter();

  return (
    <button
      className={className}
      onClick={() => router.push(to)}
    >
      {label}
    </button>
  );

}