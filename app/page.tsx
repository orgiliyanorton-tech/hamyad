import { PublicNotes } from './public-notes';
import { SiteHeader } from './site-header';

export default function Home() {
  return <>
    <SiteHeader />
    <main className="wrap">
      <PublicNotes />
    </main>
  </>;
}
