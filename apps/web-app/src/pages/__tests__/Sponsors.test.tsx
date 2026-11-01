import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Sponsors from '../Sponsors';

describe('sponsors page', () => {
  it('recognizes all five OSS programs with official links and locally served marks', () => {
    render(<Sponsors />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sponsors & Supporters');
    const sponsors = screen.getAllByRole('article');
    expect(sponsors).toHaveLength(5);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(['Financial Sponsors', 'Infrastructure & Tooling Supporters']);
    const urls = [
      'https://developers.openai.com/community/codex-for-oss',
      'https://vercel.com/open-source-program',
      'https://snyk.io/open-source/',
      'https://www.atlascloud.ai/oss-program',
      'https://www.browserstack.com/open-source',
    ];
    sponsors.forEach((article, index) => {
      expect(within(article).getByRole('link')).toHaveAttribute('href', urls[index]);
      expect(within(article).getByRole('img').getAttribute('src')).toMatch(/^\/sponsors\//);
    });
    expect(screen.getByRole('img', { name: /Vercel Inc/ })).toHaveAttribute('src', '/sponsors/vercel-oss-2026.png');
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', `${window.location.origin}/sponsors/`);
  });
  it('separates community support from the five program acknowledgements', () => {
    render(<Sponsors />);
    expect(screen.getByRole('link', { name: 'Support AAS' })).toHaveAttribute('href', '/sponsors/#support-aas');
    expect(screen.getByRole('link', { name: 'Sponsor AAS' })).toHaveAttribute('href', 'https://github.com/sponsors/sickn33');
    expect(screen.getByRole('link', { name: 'Buy Me a Coffee' })).toHaveAttribute('href', 'https://buymeacoffee.com/sickn33');
  });
});
