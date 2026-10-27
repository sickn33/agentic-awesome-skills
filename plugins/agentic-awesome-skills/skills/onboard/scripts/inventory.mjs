#!/usr/bin/env node
// onboard skill 第 0 步：盘点资料文件夹（零 LLM，硬事实）
// 用法：node inventory.mjs <资料文件夹> [输出json路径]
// 默认只输出摘要；指定路径时才写 JSON 清单。
// 敏感命名文件只登记排除，绝不读取内容。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

const rootArg = process.argv[2];
if (!rootArg) {
  console.error('用法：node inventory.mjs <资料文件夹> [输出json路径]');
  process.exit(2);
}
const root = resolve(rootArg);
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`资料路径必须是已存在的文件夹：${rootArg}`);
  process.exit(2);
}
const outPath = process.argv[3] ? resolve(process.argv[3]) : '';

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt',
  '__pycache__', '.venv', 'venv', 'env', 'target', 'vendor', 'coverage', '.gradle', '.idea',
  '.vscode', 'site-packages', 'Pods', 'DerivedData', '__MACOSX', '.terraform', '项目拆解包']);
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
const GIT_COMMON = ['-c', 'core.fsmonitor=false', '-c', 'core.quotePath=false'];
const MAX_DEPTH = 15, MAX_FILES = 80000, BIG_FILE = 20 * 1024 * 1024, STALE_MS = 18 * 30.4 * 24 * 3600 * 1000;
const LINE_READ_CAP = 512 * 1024, MAX_WARNINGS = 50;
const SECRET_NAME = /^(?:\.env(?:\..*)?|.*\.(?:pem|key|p12|pfx|jks|keystore)$|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$|\.npmrc$|\.netrc$|\.git-credentials$|.*credentials?\.json$|service-account.*\.json$|.*\.secret\.[^/]*$|secrets?\.[^/]*$)/i;

const warnings = [];
let fileCount = 0;
const docs = [], bigFiles = [], sensitiveExcluded = [];
const gitRepoDirs = [];
let walkIncomplete = false;
const outPathRel = outPath ? relative(root, outPath) : '';

function note(msg) {
  if (warnings.length < MAX_WARNINGS) warnings.push(msg);
  else if (warnings.length === MAX_WARNINGS) warnings.push(`警告超过 ${MAX_WARNINGS} 条，已截断（问题可能比列出的更多）`);
}

function isGitRepo(dir) {
  const dotGit = join(dir, '.git');
  if (!existsSync(dotGit)) return false;
  try { if (statSync(dotGit).isDirectory()) return true; } catch { return false; }
  // worktree 的 .git 是一个文件，内容形如 gitdir: <path>
  try { return readFileSync(dotGit, 'utf8').slice(0, 8) === 'gitdir: '; } catch { return false; }
}

// 终端输出专用的安全文件名：去掉控制字符，防伪造摘要/终端注入。JSON 输出不受影响。
function safeName(name) {
  // eslint-disable-next-line no-control-regex
  return name.replace(/[\u0000-\u001f\u007f-\u009f]/g, '?');
}

function walk(dir, depth) {
  if (depth > MAX_DEPTH) { walkIncomplete = true; note(`目录深度超过 ${MAX_DEPTH} 层，以下未扫描：${relative(root, dir) || '.'}`); return; }
  if (fileCount > MAX_FILES) { walkIncomplete = true; return; }
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch (e) { note(`读不了 ${relative(root, dir) || '.'}: ${e.code || e.message}`); return; }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  if (depth > 0 && isGitRepo(dir) && !gitRepoDirs.includes(dir)) gitRepoDirs.push(dir);
  for (const ent of entries) {
    if (fileCount > MAX_FILES) { walkIncomplete = true; note(`文件数超过 ${MAX_FILES}，扫描不完整`); return; }
    const full = join(dir, ent.name);
    if (outPathRel && relative(root, full).replaceAll('\\', '/') === outPathRel.replaceAll('\\', '/')) continue; // 输出文件不算材料
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) {
      if (ent.name === '.git') continue;
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      walk(full, depth + 1);
    } else if (ent.isFile()) {
      fileCount++;
      const ext = (ent.name.match(/\.[^.\s]+$/) || [''])[0].toLowerCase();
      if (SECRET_NAME.test(ent.name)) { sensitiveExcluded.push(relative(root, full)); }
      let st; try { st = statSync(full); } catch (e) { note(`读不了 ${relative(root, full)}: ${e.code || e.message}`); continue; }
      if (DOC_EXT.has(ext)) {
        docs.push({ path: relative(root, full), sizeKB: Math.round(st.size / 1024), mtime: st.mtime.toISOString(), stale: Date.now() - st.mtimeMs > STALE_MS });
      }
      if (st.size > BIG_FILE) bigFiles.push({ path: relative(root, full), sizeMB: +(st.size / 1048576).toFixed(1) });
    }
  }
}

function git(repo, args) {
  try { return execFileSync('git', ['-C', repo, ...GIT_COMMON, ...args],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 120000, stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch (e) { note(`git 在 ${safeName(basename(repo))} 失败: ${String(e.message).slice(0, 120)}`); return ''; }
}

function scanRepo(repo) {
  const errsBefore = warnings.length;
  const branch = git(repo, ['rev-parse', '--abbrev-ref', 'HEAD']).trim();
  const headDate = git(repo, ['log', '-1', '--format=%cI']).trim();
  const commitCount = parseInt(git(repo, ['rev-list', '--count', 'HEAD']).trim() || '0', 10) || 0;
  const gitOk = warnings.length === errsBefore && (branch !== '' || headDate !== '');
  const shallowRaw = git(repo, ['rev-parse', '--is-shallow-repository']).trim().toLowerCase();
  const shallow = shallowRaw === 'true' ? true : shallowRaw === 'false' ? false : null;
  const hot = new Map();
  const log = git(repo, ['log', '--since=12 months ago', '--name-only', '--pretty=format:']);
  for (const line of log.split('\n')) { const f = line; if (f) hot.set(f, (hot.get(f) || 0) + 1); } // 不 trim：保留原名
  const hotFiles = [...hot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([file, touches]) => ({ file, touches }));
  const langs = {};
  const langStats = { filesOnly: 0 };
  walkLangs(repo, langs, 0, langStats);
  return { path: relative(root, repo) || '.', name: basename(repo), branch: gitOk ? (branch || 'unknown') : 'unknown',
    headDate, commitCount, gitOk, shallow, hotFiles,
    languages: Object.entries(langs).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.lines - a.lines) };
}

function walkLangs(dir, langs, depth, stats) {
  if (depth > MAX_DEPTH) return;
  let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch (e) { note(`统计语言时读不了 ${relative(root, dir) || '.'}: ${e.code || e.message}`); return; }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) {
      // 嵌套 git 仓库由 scanRepo 单独扫，这里不重复进入
      if (ent.name !== '.git' && !EXCLUDE_DIRS.has(ent.name) && !isGitRepo(full)) walkLangs(full, langs, depth + 1, stats);
    } else {
      const ext = (ent.name.match(/\.[^.\s]+$/) || [''])[0].toLowerCase().slice(1);
      if (!LANG_MAP[ext]) continue;
      const name = LANG_MAP[ext];
      const rec = langs[name] || { files: 0, lines: 0 };
      rec.files++;
      let st; try { st = statSync(full); } catch (e) { note(`读不了 ${relative(root, full)}: ${e.code || e.message}`); continue; }
      if (SECRET_NAME.test(ent.name)) continue; // 敏感命名文件只计文件数，绝不读内容
      if (st.size < LINE_READ_CAP) {
        try {
          const content = readFileSync(full, 'utf8');
          // 与 wc -l 同口径：空文件 0 行，结尾换行不额外计一行
          rec.lines += content === '' ? 0 : content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
        } catch (e) { note(`统计行数失败 ${relative(root, full)}: ${e.code || e.message}`); }
      } else {
        stats.filesOnly++;
      }
      langs[name] = rec;
    }
  }
}

walk(root, 0);
if (isGitRepo(root)) gitRepoDirs.unshift(root); // 根目录本身是仓库（walk 只查子目录）
const repos = gitRepoDirs.map(scanRepo);
const docsByExt = {};
for (const d of docs) { const e = (d.path.match(/\.[^.]+$/)?.[0] || '其他').toLowerCase(); docsByExt[e] = (docsByExt[e] || 0) + 1; }
const staleDocs = docs.filter(d => d.stale).length;
docs.sort((a, b) => b.sizeKB - a.sizeKB);
const docList = docs.slice(0, 200);
const result = {
  root, scannedAt: new Date().toISOString(),
  totals: { files: fileCount, gitRepos: repos.length, docs: docs.length, staleDocs, walkIncomplete,
    sensitiveExcluded: sensitiveExcluded.length },
  repos, docsByExt, docList, bigFiles: bigFiles.slice(0, 30), warnings,
  docListTruncated: docs.length - docList.length,
  bigFilesTruncated: Math.max(0, bigFiles.length - 30),
  sensitiveFiles: sensitiveExcluded.slice(0, 100),
};
if (outPath) {
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
}

// 终端摘要
const fmtLangs = r => r.languages.slice(0, 5).map(l => `${l.name} ${l.files} 文件`).join('、') || '无代码';
console.log(`# 资料盘点：${root}`);
console.log(`文件总数 ${fileCount}，git 仓库 ${repos.length} 个，文档 ${docs.length} 份（其中 ${staleDocs} 份超过 18 个月未动）${sensitiveExcluded.length ? `，敏感命名文件 ${sensitiveExcluded.length} 个（只登记排除，未读取）` : ''}${walkIncomplete ? '，⚠ 扫描不完整（见警告）' : ''}`);
for (const r of repos) {
  const label = r.gitOk ? '' : '（git 调用失败，以下历史数据不可信）';
  console.log(`\n## 仓库 ${safeName(r.name)}（${r.gitOk ? r.branch : 'unknown'}${label}，${r.commitCount} commits，最近提交 ${r.headDate?.slice(0, 10) || '无'}）`);
  console.log(`语言：${fmtLangs(r)}`);
  if (!r.gitOk) console.log('历史读取失败（git 不可用或仓库损坏），热点与提交数不可用');
  else if (r.shallow === true) console.log(`浅克隆（历史不完整，${r.commitCount} 个可见提交），热点文件仅供参考，重要结论需完整克隆核实`);
  else if (r.commitCount < 5) console.log(`热点：提交历史很短（${r.commitCount} 个），热点文件参考价值有限`);
  else console.log(`近 12 个月热点：${r.hotFiles.slice(0, 8).map(h => `${safeName(h.file)}(${h.touches})`).join('、') || '无记录'}`);
}
console.log(`\n## 文档分布：${Object.entries(docsByExt).map(([e, n]) => `${e}×${n}`).join('、') || '无'}`);
console.log(`最大的文档：${docList.slice(0, 8).map(d => `${safeName(d.path)}(${d.sizeKB}KB${d.stale ? ',可能过期' : ''})`).join('、') || '无'}`);
if (bigFiles.length) console.log(`\n大文件(>20MB)：${bigFiles.slice(0, 10).map(b => `${safeName(b.path)}(${b.sizeMB}MB)`).join('、')}`);
if (warnings.length) console.log(`\n警告：\n- ${warnings.slice(0, 10).join('\n- ')}`);
if (outPath) {
  const trunc = [];
  if (result.docListTruncated > 0) trunc.push(`文档清单仅前 ${docList.length}/${docs.length}`);
  if (result.bigFilesTruncated > 0) trunc.push(`大文件清单仅前 30/${bigFiles.length}`);
  if (walkIncomplete) trunc.push('目录遍历不完整');
  console.log(`\nJSON 已写入：${outPath}${trunc.length ? `（截断说明：${trunc.join('；')}）` : '（清单完整）'}`);
}
