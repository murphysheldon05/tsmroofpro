import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      duration={3000}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:backdrop-blur-md group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:font-semibold",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          success:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-emerald-500 [&_[data-icon]]:text-emerald-500",
          error:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-destructive [&_[data-icon]]:text-destructive",
          warning:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-amber-500 [&_[data-icon]]:text-amber-500",
          info:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-[hsl(var(--info))] [&_[data-icon]]:text-[hsl(var(--info))]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
