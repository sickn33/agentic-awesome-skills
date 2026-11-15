import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Changelog from '../Changelog';
import archive from '../../data/releases.json';
import { renderWithRouter } from '../../utils/testUtils';

declare const __AAS_RELEASE_ENTRIES__: typeof archive.releases;
const preparedEntries = typeof __AAS_RELEASE_ENTRIES__ === 'undefined' ? [] : __AAS_RELEASE_ENTRIES__;
const latestRelease = preparedEntries[0] ?? archive.releases[0];
const adjacentOlderRelease = preparedEntries[1] ?? archive.releases[preparedEntries.length ? 0 : 1];
describe('Changelog', () => {
  it('shows original latest notes and allows opening the oldest release through search', () => {
    renderWithRouter(<Changelog />, {useProvider:false});
    expect(screen.getByRole('article', {name:`Release ${latestRelease.tag}`})).toBeInTheDocument();
    expect(screen.getByRole('link', {name:'View on GitHub'})).toHaveAttribute('href',latestRelease.url);
    const oldest=archive.releases.at(-1)!;
    fireEvent.change(screen.getByLabelText('Search releases'),{target:{value:oldest.tag}});
    const releaseHref = `/?version=${encodeURIComponent(oldest.tag)}`;
    const link = screen.getAllByRole('link').find(entry => entry.getAttribute('href') === releaseHref);
    expect(link).toBeDefined();
    fireEvent.click(link!);
    expect(screen.getByRole('article',{name:`Release ${oldest.tag}`})).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'View on GitHub'})).toHaveAttribute('href',oldest.url);
  });
  it('searches all release bodies and handles no matches', () => {
    renderWithRouter(<Changelog />, {useProvider:false});
    fireEvent.change(screen.getByLabelText('Search releases'),{target:{value:'not-a-real-release-xyzz'}});
    expect(screen.getByText(/No releases found/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search releases'),{target:{value:'stageshow'}});
    expect(screen.queryByText(/No releases found/)).not.toBeInTheDocument();
  });
});

describe('Release navigation', () => {
  it('restores the archive after clearing an empty search', () => {
    renderWithRouter(<Changelog />, {useProvider:false});
    fireEvent.change(screen.getByLabelText('Search releases'), {target:{value:'no-such-version-zz'}});
    fireEvent.click(screen.getByRole('button', {name:'Clear filters'}));
    expect(screen.queryByText('No releases found.')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', {name:'Release versions'}).querySelectorAll('a').length).toBe(Math.min(30,archive.releases.length + preparedEntries.length));
  });
  it('opens the adjacent older release', () => {
    renderWithRouter(<Changelog />, {useProvider:false});
    fireEvent.click(screen.getByRole('link', {name:`Older release ${adjacentOlderRelease.tag}`}));
    expect(screen.getByRole('article', {name:`Release ${adjacentOlderRelease.tag}`})).toBeInTheDocument();
  });
});
