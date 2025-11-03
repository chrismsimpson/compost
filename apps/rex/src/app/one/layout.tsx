import { Header } from '~/app/one/header';
import { ThemeProvider } from '~/app/_components/theme/themeProvider';

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
      <Header />
      {children}
    </ThemeProvider>
  );
}
