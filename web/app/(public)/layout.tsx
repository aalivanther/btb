import type { JSX, ReactNode } from "react";

import { FilterProvider } from "@/lib/timeline-context";
import { ProfileProvider } from "@/lib/profile-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider } from "@/lib/auth-context";
import { ViewportProvider } from "@/lib/viewport-context";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";

export default function PublicLayout({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <FilterProvider>
      <ThemeProvider>
       <AuthProvider>
        <ViewportProvider>
        <ProfileProvider>
        {children}

        <BottomNav />

        <Footer />
        </ProfileProvider>
        </ViewportProvider>
       </AuthProvider>
      </ThemeProvider>
    </FilterProvider>
  );
}
