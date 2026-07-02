"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Wallet,
  TrendingUp,
  Settings,
  LogOut,
  ChevronRight,
  ChevronsUpDown,
  Coins,
  Bitcoin,
  Building2,
  PiggyBank,
  Landmark,
  HelpCircle,
  NotebookPen,
  Flame,
  Rocket,
  CirclePlus,
  CircleMinus,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import logoXL from "@/assets/images/logo-xl.png";

type SidebarEntry = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  settingKeys: string[];
};

const portfolioItems: SidebarEntry[] = [
  { title: "Actions & Fonds", url: "/portfolio/stocks-funds", icon: LineChart, settingKeys: ["Actions & Fonds"] },
  { title: "Startups & PME", url: "/portfolio/private-equity", icon: Rocket, settingKeys: ["Startups & PME"] },
  { title: "Immobilier", url: "/portfolio/real-estate", icon: Building2, settingKeys: ["Immobilier"] },
  { title: "Crypto", url: "/portfolio/crypto", icon: Bitcoin, settingKeys: ["Crypto"] },
  { title: "Métaux précieux", url: "/portfolio/precious-metals", icon: Coins, settingKeys: ["Métaux precieux", "Metaux precieux"] },
  { title: "Épargne", url: "/portfolio/savings-accounts", icon: PiggyBank, settingKeys: ["Epargne", "Épargne", "Eargne", "Éargne"] },
  { title: "Autres", url: "/portfolio/other-assets", icon: HelpCircle, settingKeys: ["Autres"] },
];

const debtsItems: SidebarEntry[] = [
  { title: "Emprunts", url: "/debts/loans", icon: Landmark, settingKeys: ["Emprunts"] },
  { title: "Prêts immobiliers", url: "/debts/mortgages", icon: Building2, settingKeys: ["Prêts immobiliers", "Prets immobiliers"] },
];

// Placeholder en attendant l'auth locale offline
const currentUser = {
  name: "Baptiste",
  email: "baptiste@freenary.app",
  avatarUrl: undefined as string | undefined,
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, state } = useSidebar();
  const [activeTabs, setActiveTabs] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function loadSettingsTabs() {
      try {
        const response = await fetch("/api/settings", { method: "GET", cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { settings?: { activeTabs?: string[] } };
        if (!mounted || !Array.isArray(payload.settings?.activeTabs)) return;
        setActiveTabs(payload.settings.activeTabs);
      } catch {
        // Keep default sidebar visibility when settings API is unavailable.
      }
    }

    void loadSettingsTabs();

    const onTabsUpdated = () => {
      void loadSettingsTabs();
    };
    window.addEventListener("settings-tabs-updated", onTabsUpdated);

    return () => {
      mounted = false;
      window.removeEventListener("settings-tabs-updated", onTabsUpdated);
    };
  }, [pathname]);

  const visibleTabSet = React.useMemo(() => {
    if (!activeTabs) return null;
    return new Set(activeTabs.map((tab) => normalizeLabel(tab)));
  }, [activeTabs]);

  const isEntryVisible = React.useCallback(
    (entry: SidebarEntry) => {
      if (!visibleTabSet) return true;
      return entry.settingKeys.some((key) => visibleTabSet.has(normalizeLabel(key)));
    },
    [visibleTabSet]
  );

  const visiblePortfolioItems = React.useMemo(
    () => portfolioItems.filter((entry) => isEntryVisible(entry)),
    [isEntryVisible]
  );
  const visibleDebtsItems = React.useMemo(
    () => debtsItems.filter((entry) => isEntryVisible(entry)),
    [isEntryVisible]
  );

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Freenary">
              <Link href="/dashboard">
                <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                  <Image
                    src={logoXL}
                    alt="Freenary logo"
                    className="size-9 object-contain"
                    priority
                  />
                </div>
                <span className="text-4xl font-semibold tracking-wide text-sidebar-primary group-data-[collapsible=icon]:hidden">
                  Freenary
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
            <SidebarGroupLabel>Patrimoine</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/dashboard"}
                  tooltip="Tableau de bord"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard />
                    <span>Tableau de bord</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {visiblePortfolioItems.length > 0 ? (
                <Collapsible
                  defaultOpen={pathname.startsWith("/portfolio")}
                  className="group/collapsible"
                  asChild
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={pathname === "/portfolio"} tooltip="Actifs">
                        <CirclePlus />
                        <span>Actifs</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {visiblePortfolioItems.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === item.url}
                            >
                              <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : null}

              {visibleDebtsItems.length > 0 ? (
                <Collapsible
                  defaultOpen={pathname.startsWith("/debts")}
                  className="group/collapsible"
                  asChild
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={pathname === "/debts"} tooltip="Passifs">
                        <CircleMinus />
                        <span>Passifs</span>
                        <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {visibleDebtsItems.map((item) => (
                          <SidebarMenuSubItem key={item.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === item.url}
                            >
                              <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : null}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

                <SidebarGroup>
            <SidebarGroupLabel>Outils</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/strategy"}
                  tooltip="Stratégie"
                >
                  <Link href="/strategy">
                    <NotebookPen />
                    <span>Stratégie</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/budget"} tooltip="Budget">
                  <Link href="/budget">
                    <Wallet />
                    <span>Budget</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/taxation"}
                  tooltip="Taxation"
                >
                  <Link href="/taxation">
                    <Flame />
                    <span>Taxation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/simulation"}
                  tooltip="Simulation"
                >
                  <Link href="/simulation">
                    <TrendingUp />
                    <span>Simulation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="py-2">
                      <Avatar size="sm">
                        {currentUser.avatarUrl ? (
                          <AvatarImage
                            src={currentUser.avatarUrl}
                            alt={`Photo de profil de ${currentUser.name}`}
                          />
                        ) : null}
                        <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{currentUser.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {currentUser.email}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" hidden={state !== "collapsed" || isMobile}>
                  Compte
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings />
                    <span>Réglages</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut />
                  <span>Se déconnecter</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}