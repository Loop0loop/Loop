#!/usr/bin/env node

/**
 * 🔥 build 후 public 폴더의 파일을 out/renderer로 복사
 * Electron의 StaticServer가 out/renderer를 서빙하므로, public 파일들도 거기 있어야 함
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'public');
const targetDir = path.join(__dirname, '..', 'out', 'renderer');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source directory does not exist: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);

  files.forEach((file) => {
    // Skip dot files like .DS_Store
    if (file.startsWith('.')) {
      return;
    }

    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);

    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied: ${file}`);
    }
  });
}

console.log(`📂 Copying public assets from ${sourceDir} to ${targetDir}...`);
copyRecursive(sourceDir, targetDir);
console.log(`✅ Public assets copy complete!`);
