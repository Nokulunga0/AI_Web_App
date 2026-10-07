import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarClock, LayoutDashboard, ListChecks, Mail, NotebookPen, Settings, ShieldCheck, Sparkles } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Email Generator", url: "/email", icon: Mail },
  { title: "Meeting Notes", url: "/meetings", icon: NotebookPen },
  { title: "Task Planner", url: "/tasks", icon: ListChecks },
  { title: "Schedule", url: "/schedule", icon: CalendarClock },
] as const;
const more = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Responsible AI", url: "/responsible-ai", icon: ShieldCheck },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { setOpenMobile } = useSidebar();
  const render = (items: readonly { title: string; url: string; icon: typeof Mail }[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
          <Link to={item.url} onClick={() => setOpenMobile(false)}>
            <item.icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <p className="font-display text-sm font-semibold text-sidebar-accent-foreground">Focusly</p>
            <p className="text-xs text-sidebar-foreground/70">AI Productivity</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{render(main)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{render(more)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <p className="px-2 pb-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          Review AI output before using it.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
