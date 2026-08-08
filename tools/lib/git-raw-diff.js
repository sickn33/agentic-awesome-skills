function splitNulFields(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Raw Git diff must be provided as a Buffer.");
  }
  if (buffer.length === 0 && options.allowEmpty) {
    return [];
  }
  if (buffer.length === 0 || buffer[buffer.length - 1] !== 0) {
    throw new Error("Raw Git diff is empty or missing its final NUL terminator.");
  }

  const fields = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] === 0) {
      fields.push(buffer.subarray(start, index));
      start = index + 1;
    }
  }
  return fields;
}

function decodeGitPath(buffer) {
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("Raw Git diff contains a path that is not canonical UTF-8.");
  }
  if (Buffer.from(value, "utf8").compare(buffer) !== 0) {
    throw new Error("Raw Git diff path did not round-trip to canonical UTF-8 bytes.");
  }
  return value;
}

function parseRawDiff(buffer, options = {}) {
  const fields = splitNulFields(buffer, options);
  if (!fields.length) return [];
  const records = [];

  for (let index = 0; index < fields.length;) {
    const header = fields[index].toString("ascii");
    if (!fields[index].equals(Buffer.from(header, "ascii"))) {
      throw new Error("Raw Git diff contains a non-ASCII record header.");
    }
    index += 1;

    const match = header.match(
      /^:(?<oldMode>[0-7]{6}) (?<newMode>[0-7]{6}) (?<oldOid>[0-9a-f]{40}|[0-9a-f]{64}) (?<newOid>[0-9a-f]{40}|[0-9a-f]{64}) (?<status>[ACDMRTUXB])(?<score>[0-9]{0,3})$/u,
    );
    if (!match?.groups || match.groups.oldOid.length !== match.groups.newOid.length) {
      throw new Error(`Malformed raw Git diff header: ${header}`);
    }

    if (index >= fields.length) throw new Error("Raw Git diff record is missing its path.");
    const firstPath = decodeGitPath(fields[index]);
    index += 1;
    const isRenameOrCopy = match.groups.status === "R" || match.groups.status === "C";
    let secondPath = null;
    if (isRenameOrCopy) {
      if (index >= fields.length) {
        throw new Error("Raw Git rename/copy record is missing its destination path.");
      }
      secondPath = decodeGitPath(fields[index]);
      index += 1;
    }

    const status = match.groups.status;
    records.push({
      status,
      old_path: status === "A" ? null : firstPath,
      new_path: status === "D" ? null : isRenameOrCopy ? secondPath : firstPath,
      old_mode: match.groups.oldMode,
      new_mode: match.groups.newMode,
      old_oid: match.groups.oldOid,
      new_oid: match.groups.newOid,
      similarity: match.groups.score ? Number(match.groups.score) : null,
    });
  }
  return records;
}

module.exports = { decodeGitPath, parseRawDiff, splitNulFields };
