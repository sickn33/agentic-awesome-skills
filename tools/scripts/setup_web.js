const fs = require('fs');
const path = require('path');

const { findProjectRoot } = require('../lib/project-root');
const { resolveSafeRealPath } = require('../lib/symlink-safety');

const ROOT_DIR = findProjectRoot(__dirname);
const WEB_APP_PUBLIC = path.join(ROOT_DIR, 'apps', 'web-app', 'public');

// 2. Copy skills directory content
// Note: Symlinking is better, but Windows often requires admin for symlinks. 
// We will try to copy for reliability in this environment.
function copyFolderSync(from, to, rootDir = from) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });

    fs.readdirSync(from).forEach(element => {
        const srcPath = path.join(from, element);
        const destPath = path.join(to, element);
        const stat = fs.lstatSync(srcPath);
        const realPath = stat.isSymbolicLink() ? resolveSafeRealPath(rootDir, srcPath) : srcPath;

        if (!realPath) {
            console.warn(`[app:setup] Skipping symlink outside skills root: ${srcPath}`);
            return;
        }

        const realStat = fs.statSync(realPath);

        if (realStat.isFile()) {
            fs.copyFileSync(realPath, destPath);
        } else if (realStat.isDirectory()) {
            copyFolderSync(realPath, destPath, rootDir);
        }
        // Skip other types (e.g. sockets, FIFOs)
    });
}

function copyIndexFiles(sourceIndex, destIndex, destBackupIndex, publicRoot = path.dirname(destIndex)) {
    copyIndexFile(sourceIndex, destIndex, publicRoot);
    copyIndexFile(sourceIndex, destBackupIndex, publicRoot);
}

function copyIndexFile(sourceIndex, destinationIndex, publicRoot = path.dirname(destinationIndex)) {
    if (fs.existsSync(destinationIndex) && fs.lstatSync(destinationIndex).isSymbolicLink()) {
        throw new Error(`Refusing to copy index through symlink: ${destinationIndex}`);
    }

    const destinationParent = path.dirname(destinationIndex);
    const resolvedPublicRoot = fs.realpathSync(publicRoot);
    const resolvedDestinationParent = fs.realpathSync(destinationParent);
    const relativeParent = path.relative(resolvedPublicRoot, resolvedDestinationParent);
    if (relativeParent.startsWith('..') || path.isAbsolute(relativeParent)) {
        throw new Error(`Refusing to copy index outside web public directory: ${destinationIndex}`);
    }

    console.log(`Copying ${sourceIndex} -> ${destinationIndex}...`);
    fs.copyFileSync(sourceIndex, destinationIndex);
}

function main() {
    if (!fs.existsSync(WEB_APP_PUBLIC)) {
        fs.mkdirSync(WEB_APP_PUBLIC, { recursive: true });
    }

    const sourceIndex = path.join(ROOT_DIR, 'skills_index.json');
    const destIndex = path.join(WEB_APP_PUBLIC, 'skills.json');
    const destBackupIndex = path.join(WEB_APP_PUBLIC, 'skills.json.backup');
    copyIndexFiles(sourceIndex, destIndex, destBackupIndex, WEB_APP_PUBLIC);

    const sourceSkills = path.join(ROOT_DIR, 'skills');
    const destSkills = path.join(WEB_APP_PUBLIC, 'skills');

    console.log(`Copying skills directory...`);

    // Check if destination exists and remove it to ensure fresh copy
    if (fs.existsSync(destSkills)) {
        fs.rmSync(destSkills, { recursive: true, force: true });
    }

    copyFolderSync(sourceSkills, destSkills, sourceSkills);

    console.log('✅ Web app assets setup complete!');
}

if (require.main === module) {
    main();
}

module.exports = { copyFolderSync, copyIndexFile, copyIndexFiles, main };
