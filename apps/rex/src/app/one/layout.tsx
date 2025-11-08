import { Header } from '~/app/one/header';
import { ThemeProvider } from '~/app/_components/theme/themeProvider';
import { TooltipProvider } from '~/app/_components/shadcn/tooltip';

export default async function PageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Header />
        {children}
      </TooltipProvider>
    </ThemeProvider>
  );
}
