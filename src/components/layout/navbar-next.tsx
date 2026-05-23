"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Crown,
  ExternalLink,
  Home,
  Info,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  ShoppingBag,
  Sun,
  User,
  Vote,
  Wrench,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavConfig, type NavItem } from "@/hooks/useNavConfig";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ManagementModeToggle } from "@/components/management/ManagementModeToggle";
import { SITE_URL } from "@/lib/site";

const NotificationDropdown = lazy(() =>
  import("@/components/ui/notification-dropdown").then((m) => ({
    default: m.NotificationDropdown,
  })),
);

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  wrench: Wrench,
  "scroll-text": ScrollText,
  "shopping-bag": ShoppingBag,
  vote: Vote,
  info: Info,
  "book-open": BookOpen,
};

function getIcon(name: string | null): LucideIcon | null {
  if (!name) return null;
  return ICON_MAP[name.toLowerCase()] ?? null;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { user, signOut, loading } = useAuth();
  const { isAdmin } = useUserRoles();
  const { isActive } = useSubscription();
  const { isDark, toggleTheme } = useTheme();
  const { items: navItems, logos, loading: navLoading } = useNavConfig();
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        const nextScrolled = window.scrollY > 24;
        if (nextScrolled === isScrolledRef.current) return;
        isScrolledRef.current = nextScrolled;
        setIsScrolled(nextScrolled);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const showPremiumArea = isAdmin || isActive();
  const isOnKitSubdomain =
    typeof window !== "undefined" && window.location.hostname.startsWith("kit.");
  const mainDomain = isOnKitSubdomain ? SITE_URL : "";

  const handleNavigation = (path: string) => {
    if (isOnKitSubdomain) {
      window.location.href = `${mainDomain}${path}`;
    } else {
      router.push(path);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logout realizado com sucesso!");
    handleNavigation("/");
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario";
  };

  const handleItemClick = (item: NavItem) => {
    if (item.is_external) {
      window.open(item.href, item.open_in_new_tab ? "_blank" : "_self", "noopener");
      return;
    }
    handleNavigation(item.href);
  };

  const handleItemPrefetch = (item: Pick<NavItem, "href" | "is_external">) => {
    if (item.is_external || isOnKitSubdomain) return;
    router.prefetch(item.href);
  };

  const isItemActive = (item: NavItem) => {
    if (item.href === "/") return pathname === "/";
    return pathname.startsWith(item.href);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 w-full">
      <nav
        className={cn(
          "mx-auto transition-all duration-300 ease-out",
          isScrolled
            ? "w-[85%] mt-2 px-3 rounded-[1.2rem] border border-border/40 bg-background/75 backdrop-blur-md shadow-sm"
            : "w-full bg-background border-b border-border/40",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between transition-all duration-300 ease-out px-4",
            isScrolled ? "h-14" : "h-16",
          )}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNavigation("/")}
              className="flex items-center p-2 hover:opacity-80 transition-opacity duration-200 mr-2"
              aria-label="Ir para a pagina inicial"
            >
              <img
                src={logos.light}
                alt="PqEstudar"
                width={120}
                height={36}
                className="h-8 sm:h-9 md:h-11 w-auto object-contain block dark:hidden"
              />
              <img
                src={logos.dark}
                alt="PqEstudar"
                width={120}
                height={36}
                className="h-8 sm:h-9 md:h-11 w-auto object-contain hidden dark:block"
              />
            </button>

            <div className="hidden md:flex items-center gap-1">
              {navLoading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-20 rounded-[1.2rem]" />
                  ))}
                </>
              ) : (
                navItems.map((item) => {
                  const IconComp = getIcon(item.icon);
                  const showIconDesktop = item.show_icon_desktop !== false;
                  const showIconTablet = item.show_icon_tablet !== false;

                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => handleItemPrefetch(item)}
                      onFocus={() => handleItemPrefetch(item)}
                      onTouchStart={() => handleItemPrefetch(item)}
                      className={cn(
                        "relative hover:bg-accent rounded-[1.2rem]",
                        isItemActive(item) && "bg-accent text-accent-foreground",
                      )}
                      aria-current={isItemActive(item) ? "page" : undefined}
                    >
                      {item.is_new && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center rounded-full bg-primary px-1 py-px text-[8px] font-semibold uppercase leading-none tracking-wide text-primary-foreground shadow-sm">
                          Novo
                        </span>
                      )}
                      {IconComp && showIconDesktop && (
                        <IconComp className="h-4 w-4 mr-2 hidden lg:inline-flex" aria-hidden="true" />
                      )}
                      {IconComp && showIconTablet && (
                        <IconComp className="h-4 w-4 mr-2 inline-flex lg:hidden" aria-hidden="true" />
                      )}
                      {item.label}
                      {item.is_external && <ExternalLink className="h-3 w-3 ml-1 opacity-50" />}
                    </Button>
                  );
                })
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ManagementModeToggle />
            {user && (
              <Suspense fallback={null}>
                <NotificationDropdown />
              </Suspense>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0 rounded-[1.2rem]"
              aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {!loading && (
              <>
                {!user ? (
                  <Button
                    variant="default"
                    size="sm"
                    onMouseEnter={() => !isOnKitSubdomain && router.prefetch("/login")}
                    onFocus={() => !isOnKitSubdomain && router.prefetch("/login")}
                    onClick={() => handleNavigation("/login")}
                    aria-label="Entrar"
                  >
                    Entrar
                  </Button>
                ) : (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="relative h-9 w-9 rounded-full p-0"
                        aria-label="Menu do usuario"
                        aria-haspopup="menu"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-popover">
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium text-sm">{getUserDisplayName()}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onMouseEnter={() => !isOnKitSubdomain && router.prefetch("/ferramentas/salvos")}
                        onFocus={() => !isOnKitSubdomain && router.prefetch("/ferramentas/salvos")}
                        onClick={() => handleNavigation("/ferramentas/salvos")}
                        className="cursor-pointer"
                      >
                        <Bookmark className="h-4 w-4 mr-2" />Salvos
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem
                          onMouseEnter={() => !isOnKitSubdomain && router.prefetch("/admin")}
                          onFocus={() => !isOnKitSubdomain && router.prefetch("/admin")}
                          onClick={() => handleNavigation("/admin")}
                          className="cursor-pointer"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />Dashboard admin
                        </DropdownMenuItem>
                      )}
                      {showPremiumArea && (
                        <DropdownMenuItem
                          onMouseEnter={() => !isOnKitSubdomain && router.prefetch("/premium")}
                          onFocus={() => !isOnKitSubdomain && router.prefetch("/premium")}
                          onClick={() => handleNavigation("/premium")}
                          className="cursor-pointer"
                        >
                          <Crown className="h-4 w-4 mr-2" />Area Premium
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <LogOut className="h-4 w-4 mr-2" />Sair
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </div>

          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0"
              aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <ManagementModeToggle />
            {user && (
              <Suspense fallback={null}>
                <NotificationDropdown />
              </Suspense>
            )}

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Menu de navegacao">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Menu
                </div>
                {navLoading ? (
                  <div className="p-2 space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full rounded-md" />
                    ))}
                  </div>
                ) : (
                  navItems.map((item) => {
                    const IconComp = getIcon(item.icon);
                    const showIconMobile = item.show_icon_mobile !== false;
                    return (
                      <DropdownMenuItem
                        key={item.id}
                        onMouseEnter={() => handleItemPrefetch(item)}
                        onFocus={() => handleItemPrefetch(item)}
                        onClick={() => handleItemClick(item)}
                        aria-current={isItemActive(item) ? "page" : undefined}
                      >
                        {IconComp && showIconMobile && (
                          <IconComp className="h-4 w-4 mr-2" aria-hidden="true" />
                        )}
                        {item.label}
                        {item.is_new && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-primary px-1.5 py-px text-[9px] font-semibold uppercase leading-none tracking-wide text-primary-foreground">
                            Novo
                          </span>
                        )}
                        {item.is_external && <ExternalLink className="h-3 w-3 ml-1 opacity-50" />}
                      </DropdownMenuItem>
                    );
                  })
                )}
                <DropdownMenuSeparator />

                {!loading && (
                  <>
                    {!user ? (
                      <DropdownMenuItem
                        onMouseEnter={() => !isOnKitSubdomain && router.prefetch("/login")}
                        onFocus={() => !isOnKitSubdomain && router.prefetch("/login")}
                        onClick={() => handleNavigation("/login")}
                        className="text-primary font-medium"
                      >
                        <User className="h-4 w-4 mr-2" />Entrar
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Conta
                        </div>
                        <div className="flex items-center gap-2 p-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col space-y-0.5 leading-none">
                            <p className="font-medium text-sm">{getUserDisplayName()}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</p>
                          </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onMouseEnter={() => !isOnKitSubdomain && router.prefetch("/ferramentas/salvos")}
                          onFocus={() => !isOnKitSubdomain && router.prefetch("/ferramentas/salvos")}
                          onClick={() => handleNavigation("/ferramentas/salvos")}
                          className="cursor-pointer"
                        >
                          <Bookmark className="h-4 w-4 mr-2" />Salvos
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem
                            onMouseEnter={() => !isOnKitSubdomain && router.prefetch("/admin")}
                            onFocus={() => !isOnKitSubdomain && router.prefetch("/admin")}
                            onClick={() => handleNavigation("/admin")}
                            className="cursor-pointer"
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />Dashboard admin
                          </DropdownMenuItem>
                        )}
                        {showPremiumArea && (
                          <DropdownMenuItem
                            onMouseEnter={() => !isOnKitSubdomain && router.prefetch("/premium")}
                            onFocus={() => !isOnKitSubdomain && router.prefetch("/premium")}
                            onClick={() => handleNavigation("/premium")}
                            className="cursor-pointer"
                          >
                            <Crown className="h-4 w-4 mr-2" />Area Premium
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 mr-2" />Sair
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
    </div>
  );
}
