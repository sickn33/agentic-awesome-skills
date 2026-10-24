#!/usr/bin/env node
// onboard skill 第 0 步：盘点资料文件夹（零 LLM，硬事实）
// 用法：node inventory.mjs <资料文件夹> [输出json路径]
// 产出：inventory.json（给 agent 读）+ 终端摘要（给人看）
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, basename, resolve } from 'node:path';

const root = resolve(process.argv[2] || '');
if (!existsSync(root)) { console.error(`文件夹不存在：${root}`); process.exit(1); }
const outPath = process.argv[3] || 'inventory.json';

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt',
  '__pycache__', '.venv', 'venv', 'env', 'target', 'vendor', 'coverage', '.gradle', '.idea',
  '.vscode', 'site-packages', 'Pods', 'DerivedData', '__MACOSX', '.terraform']);
const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff',
  '.mp4', '.mov', '.avi', '.mkv', '.mp3', '.wav', '.flac', '.zip', '.rar', '.7z', '.tar', '.gz',
  '.bz2', '.xz', '.exe', '.dll', '.so', '.dylib', '.apk', '.ipa', '.msi', '.bin', '.iso', '.dmg',
  '.woff', '.woff2', '.ttf', '.eot', '.otf', '.psd', '.ai', '.sketch']);
const DOC_EXT = new Set(['.md', '.txt', '.docx', '.doc', '.pdf', '.pptx', '.ppt', '.xlsx', '.xls', '.csv', '.rtf']);
const LANG_MAP = { py: 'Python', js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', ts: 'TypeScript',
  tsx: 'TypeScript', jsx: 'JavaScript', go: 'Go', java: 'Java', kt: 'Kotlin', rs: 'Rust', rb: 'Ruby',
  php: 'PHP', c: 'C', h: 'C/C++头', cpp: 'C++', cc: 'C++', hpp: 'C++', cs: 'C#', swift: 'Swift',
  scala: 'Scala', sh: 'Shell', bat: 'Batch', ps1: 'PowerShell', vue: 'Vue', svelte: 'Svelte',
  sql: 'SQL', html: 'HTML', css: 'CSS', scss: 'SCSS', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
  json: 'JSON', proto: 'Protobuf', graphql: 'GraphQL' };
const MAX_DEPTH = 15, MAX_FILES = 80000, BIG_FILE = 20 * 1024 * 1024, STALE_MS = 18 * 30.4 * 24 * 3600 * 1000;

const warnings = [];
let fileCount = 0;
const docs = [], bigFiles = [], codeExts = new Map(); // ext -> {files, lines}
const gitRepoDirs = [];

function isGitRepo(dir) { return existsSync(join(dir, '.git')); }

function walk(dir, depth) {
  if (depth > MAX_DEPTH || fileCount > MAX_FILES) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch (e) { warnings.push(`读不了 ${dir}: ${e.code || e.message}`); return; }
  if (depth > 0 && isGitRepo(dir) && !gitRepoDirs.includes(dir)) gitRepoDirs.push(dir);
  for (const ent of entries) {
    if (fileCount > MAX_FILES) { warnings.push('文件数超上限，扫描不完整'); return; }
    const full = join(dir, ent.name);
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) {
      if (ent.name === '.git') continue;
      if (EXCLUDE_DIRS.has(ent.name)) { continue; }
      walk(full, depth + 1);
    } else if (ent.isFile()) {
      fileCount++;
      const ext = (ent.name.match(/\.[^.\s]+$/) || [''])[0].toLowerCase();
      let st; try { st = statSync(full); } catch { continue; }
      if (DOC_EXT.has(ext)) {
        docs.push({ path: relative(root, full), sizeKB: Math.round(st.size / 1024), mtime: st.mtime.toISOString(), stale: Date.now() - st.mtimeMs > STALE_MS });
      } else if (BINARY_EXT.has(ext)) {
        // 二进制文件只在大文件清单里出现
      } else if (ext && LANG_MAP[ext.slice(1)]) {
        const rec = codeExts.get(ext) || { ext, files: 0, lines: 0 };
        rec.files++;
        if (st.size < 512 * 1024) {
          try { rec.lines += readFileSync(full, 'utf8').split('\n').length; }
          catch { /* 读不了就只计文件数 */ }
        }
        codeExts.set(ext, rec);
      }
      if (st.size > BIG_FILE) bigFiles.push({ path: relative(root, full), sizeMB: +(st.size / 1048576).toFixed(1) });
    }
  }
}

function git(repo, args) {
  try { return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 120000 }); }
  catch (e) { warnings.push(`git 在 ${basename(repo)} 失败: ${String(e.message).slice(0, 120)}`); return ''; }
}

function scanRepo(repo) {
  const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim() || 'unknown';
  const headDate = git(repo, ['log', '-1', '--format=%cI']).trim();
  const commitCount = parseInt(git(repo, ['rev-list', '--count', 'HEAD']).trim() || '0', 10);
  const hot = {};
  const log = git(repo, ['log', '--since=12 months ago', '--name-only', '--pretty=format:']);
  for (const line of log.split('\n')) { const f = line.trim(); if (f) hot[f] = (hot[f] || 0) + 1; }
  const hotFiles = Object.entries(hot).sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([file, touches]) => ({ file, touches }));
  const langs = {};
  walkLangs(repo, langs, 0);
  return { path: relative(root, repo) || '.', name: basename(repo), branch, headDate, commitCount,
    hotFiles, languages: Object.entries(langs).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.lines - a.lines) };
}
function walkLangs(dir, langs, depth) {
  if (depth > MAX_DEPTH) return;
  let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) { if (ent.name !== '.git' && !EXCLUDE_DIRS.has(ent.name)) walkLangs(full, langs, depth + 1); }
    else {
      const ext = (ent.name.match(/\.[^.\s]+$/) || [''])[0].toLowerCase().slice(1);
      if (!LANG_MAP[ext]) continue;
      const rec = langs[LANG_MAP[ext]] || { files: 0, lines: 0 };
      rec.files++;
      let st; try { st = statSync(full); } catch { continue; }
      if (st.size < 512 * 1024) { try { rec.lines += readFileSync(full, 'utf8').split('\n').length; } catch { /* skip */ } }
      langs[LANG_MAP[ext]] = rec;
    }
  }
}

walk(root, 0);
if (isGitRepo(root)) gitRepoDirs.unshift(root); // 根目录本身是仓库（walk 只查子目录）
const repos = gitRepoDirs.map(scanRepo);
const docsByExt = {};
for (const d of docs) { const e = d.path.match(/\.[^.]+$/)?.[0] || '其他'; docsByExt[e] = (docsByExt[e] || 0) + 1; }
const staleDocs = docs.filter(d => d.stale).length;
docs.sort((a, b) => b.sizeKB - a.sizeKB);
const docList = docs.slice(0, 200);
const result = { root, scannedAt: new Date().toISOString(), totals: { files: fileCount, gitRepos: repos.length, docs: docs.length, staleDocs },
  repos, docsByExt, docList, bigFiles: bigFiles.slice(0, 30), warnings };
writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

// 终端摘要
const fmtLangs = r => r.languages.slice(0, 5).map(l => `${l.name} ${l.files} 文件`).join('、') || '无代码';
console.log(`# 资料盘点：${root}`);
console.log(`文件总数 ${fileCount}，git 仓库 ${repos.length} 个，文档 ${docs.length} 份（其中 ${staleDocs} 份超过 18 个月未动）`);
for (const r of repos) {
  console.log(`\n## 仓库 ${r.name}（${r.branch}，${r.commitCount} commits，最近提交 ${r.headDate?.slice(0, 10)}）`);
  console.log(`语言：${fmtLangs(r)}`);
  if (r.commitCount < 5) console.log(`热点：提交历史太浅（${r.commitCount} 个），热点文件无参考价值，需要完整克隆`);
  else console.log(`近 12 个月热点：${r.hotFiles.slice(0, 8).map(h => `${h.file}(${h.touches})`).join('、') || '无记录'}`);
}
console.log(`\n## 文档分布：${Object.entries(docsByExt).map(([e, n]) => `${e}×${n}`).join('、') || '无'}`);
console.log(`最大的文档：${docList.slice(0, 8).map(d => `${d.path}(${d.sizeKB}KB${d.stale ? ',可能过期' : ''})`).join('、') || '无'}`);
if (bigFiles.length) console.log(`\n大文件(>20MB)：${bigFiles.slice(0, 10).map(b => `${b.path}(${b.sizeMB}MB)`).join('、')}`);
if (warnings.length) console.log(`\n警告：\n- ${warnings.slice(0, 10).join('\n- ')}`);
console.log(`\n完整数据：${outPath}`);
