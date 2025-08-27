"use client";

type ButtonProps = {
  label: string;
  action?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  disabled?: boolean;
};

export default function Button({
  label,
  action,
  type="button",
  className = "btn btn-primary",
  disabled=false
}: ButtonProps) {

  return (
    <button
      className={className}
      onClick={action}
      type={type}
      disabled={disabled}
    >
      {label}
    </button>
  );

}