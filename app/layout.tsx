import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'هم‌یاد | دفتر یادداشت شخصی',
  description: 'دفتر یادداشت همگام بین دستگاه‌ها با صفحهٔ یادداشت‌های عمومی',
  robots: { index: false, follow: false },
};

const initialTheme = `try{var t=localStorage.getItem('hamyad-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch{}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fa" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: initialTheme }} /></head><body>{children}<div className="checker-hatch-bg"></div></body></html>;
}
