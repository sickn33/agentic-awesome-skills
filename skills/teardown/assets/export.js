(function (root) {
  const ns = 'http://www.w3.org/2000/svg';
  const CROP_PADDING = 3;
  const PNG_DPI = 300;

  function prepare(svg, {crop, transparent, metadata}) {
    const sheet = svg.viewBox.baseVal, paper = svg.querySelector('#paper');
    let {width, height} = sheet;
    if (crop) {
      const bounds = svg.querySelector('#geometry').getBBox();
      const x = bounds.x - CROP_PADDING, y = bounds.y - CROP_PADDING;
      width = bounds.width + CROP_PADDING * 2;
      height = bounds.height + CROP_PADDING * 2;
      svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
      for (const [name, value] of Object.entries({x, y, width, height})) paper?.setAttribute(name, value);
    }
    svg.setAttribute('width', width + 'mm');
    svg.setAttribute('height', height + 'mm');
    if (transparent) paper?.remove();
    const record = document.createElementNS(ns, 'metadata');
    record.textContent = JSON.stringify(metadata);
    svg.prepend(record);
    return {width, height};
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  async function withPhysicalResolution(blob, dpi) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunk = new Uint8Array(21), view = new DataView(chunk.buffer), pixelsPerMeter = Math.round(dpi / .0254);
    view.setUint32(0, 9);
    chunk.set([112, 72, 89, 115], 4);
    view.setUint32(8, pixelsPerMeter);
    view.setUint32(12, pixelsPerMeter);
    chunk[16] = 1;
    view.setUint32(17, crc32(chunk.subarray(4, 17)));
    const slices = [bytes.subarray(0, 8)];
    for (let offset = 8; offset < bytes.length;) {
      const size = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0) + 12;
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (type !== 'pHYs') slices.push(bytes.subarray(offset, offset + size));
      if (type === 'IHDR') slices.push(chunk);
      offset += size;
    }
    return new Blob(slices, {type: 'image/png'});
  }

  async function inline(url) {
    if (url.startsWith('data:')) return url;
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:font/woff2;base64,${btoa(binary)}`;
  }

  async function embedFonts(svg) {
    const families = new Set([...svg.querySelectorAll('text')].flatMap(t => (t.getAttribute('font-family') || '').split(',').map(f => f.trim().replace(/^["']|["']$/g, ''))));
    if (!families.size) return;
    let css = '';
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (!(rule instanceof CSSFontFaceRule) || !families.has(rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim())) continue;
        let text = rule.cssText;
        for (const [, url] of text.matchAll(/url\(["']?([^"')]+)["']?\)/g)) text = text.replace(url, await inline(new URL(url, sheet.href || location.href).href));
        css += text;
      }
    }
    if (!css) return;
    const style = document.createElementNS(ns, 'style');
    style.textContent = css;
    svg.prepend(style);
  }

  const writers = {
    async svg(svg, size, filename) {
      saveBlob(new Blob([new XMLSerializer().serializeToString(svg)], {type: 'image/svg+xml'}), filename + '.svg');
    },
    async png(svg, {width, height}, filename) {
      await embedFonts(svg);
      const source = new XMLSerializer().serializeToString(svg);
      const image = new Image(), url = URL.createObjectURL(new Blob([source], {type: 'image/svg+xml'}));
      try {
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width / 25.4 * PNG_DPI);
        canvas.height = Math.round(height / 25.4 * PNG_DPI);
        const context = canvas.getContext('2d');
        if (svg.querySelector('#paper')) {
          context.fillStyle = 'white';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw Error('Could not create PNG');
        saveBlob(await withPhysicalResolution(blob, PNG_DPI), filename + '.png');
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    async pdf(svg, {width, height}, filename, metadata) {
      const pdf = new jspdf.jsPDF({orientation: width >= height ? 'landscape' : 'portrait', unit: 'mm', format: [width, height], compress: true});
      pdf.setProperties({title: filename, subject: metadata.concept === false ? 'Technical drawing' : 'Illustrative technical drawing'});
      await pdf.svg(svg, {x: 0, y: 0, width, height});
      saveBlob(pdf.output('blob'), filename + '.pdf');
    }
  };

  async function save(svg, format, {filename, crop = false, transparent = false, metadata = {}}) {
    const write = writers[format];
    if (!write) throw Error('Unknown export format');
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-10000px;top:0;';
    host.append(svg);
    document.body.append(host);
    try {
      const size = prepare(svg, {crop, transparent, metadata});
      host.style.width = size.width + 'mm';
      host.style.height = size.height + 'mm';
      await write(svg, size, filename, metadata);
    } finally {
      host.remove();
    }
  }

  root.DrawingExport = {save};
})(globalThis);
