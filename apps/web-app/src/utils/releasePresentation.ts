/** Remove only release metadata repeated in the page heading; keep original notes in the archive. */
export function releasePresentation(release: { tag: string; name: string; body: string }) {
  const title = release.name.replace(/^v?\d+(?:\.\d+)+(?:-[\w.]+)?\s*[—–:-]?\s*/, '').trim().replace(/^["“]|["”]$/g, '') || release.tag;
  const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  let removed = false;
  const body = release.body.split('\n').filter(line => {
    if (removed || !/^#{1,2}\s/.test(line) || title === release.tag) return true;
    const matches = normalized(line).includes(normalized(release.tag.replace(/^v/, ''))) && normalized(line).includes(normalized(title));
    if (matches) removed = true;
    return !matches;
  }).join('\n');
  return {title, body};
}
