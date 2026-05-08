import { cn } from "@/lib/utils";

interface HeroBadgeProps {
  href?: string;
  text: string;
  icon?: React.ReactNode;
  endIcon?: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const HeroBadge = ({
  text,
  icon,
  endIcon,
  variant = "outline",
  size = "md",
  className,
}: HeroBadgeProps) => {
  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-1.5 text-sm",
    lg: "px-5 py-2 text-base",
  };

  const variantClasses = {
    default: "bg-primary text-primary-foreground",
    outline: "border border-border bg-background/50 backdrop-blur-sm",
    ghost: "bg-muted/50",
  };

  return (
    <div className="inline-flex">
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full font-medium transition-colors",
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        {icon}
        <span>{text}</span>
        {endIcon}
      </div>
    </div>
  );
};

export default HeroBadge;
