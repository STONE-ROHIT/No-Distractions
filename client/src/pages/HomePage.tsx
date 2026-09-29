import { PublicHeader } from '../layouts/PublicHeader';
import { Features } from './home/Features';
import { Footer } from './home/Footer';
import { Hero } from './home/Hero';

export function HomePage() {
  return (
    <div className="min-h-screen bg-canvas">
      <PublicHeader />
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}
