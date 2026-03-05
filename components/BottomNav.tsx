"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarDays, CheckSquare, GraduationCap } from "lucide-react";

const navItems = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/exams", label: "Exams", icon: GraduationCap },
];

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-nav">
            <div className="flex items-center justify-around px-2 py-2 pb-safe" style={{ paddingBottom: `calc(0.5rem + env(safe-area-inset-bottom, 0px))` }}>
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-2xl transition-all duration-200 active:scale-90 ${isActive
                                    ? "text-latte-500"
                                    : "text-latte-300 hover:text-latte-400"
                                }`}
                        >
                            <div
                                className={`p-1.5 rounded-xl transition-all duration-200 ${isActive ? "bg-latte-100" : ""
                                    }`}
                            >
                                <Icon
                                    className="w-5 h-5"
                                    strokeWidth={isActive ? 2 : 1.5}
                                />
                            </div>
                            <span className={`text-[10px] font-medium ${isActive ? "text-latte-500 font-semibold" : ""}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
