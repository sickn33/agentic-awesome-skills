# Publishing A Package

Compare the package manifest with a neighboring published package in the same
family.

- Keep development `exports` and `publishConfig.exports` aligned by key.
  Source targets become their intended built targets; blocked internal and
  legacy paths remain blocked.
- Check current AI documentation copy tooling and the package `files` list for
  every file required in the published payload.
- Ensure each public source entrypoint has exactly one published counterpart
  and no internal entrypoint becomes exposed.

Run the current root build so publication payload generation executes. Create a
tarball in a temporary destination without publishing, inspect its file list,
and inspect the packed `package.json` whenever manifest transformation matters.

This branch is complete when package and root checks pass and the packed
surface contains exactly the intended files, exports, and metadata.
