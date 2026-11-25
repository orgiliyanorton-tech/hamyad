import { PublicNotes } from './public-notes';
import { SiteHeader } from './site-header';

export default function Home() {
  return <>
    <SiteHeader />
    <main className="wrap">
      <div className="intro"><span className="badge">دفتر عمومی</span><h1>یادداشت‌های <em>عمومی</em></h1><p>یادداشت‌های منتشرشده را اینجا، بدون ورود، بخوان.</p></div>
      <PublicNotes />
    </main>
  </>;
}
