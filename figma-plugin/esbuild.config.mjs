import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

// Build plugin sandbox (code.ts → dist/code.js)
const codeCtx = await esbuild.context({
    entryPoints: ['src/code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    target: 'es2020',
    format: 'iife',
});

// Build UI script (ui.ts → temp file, then inline into ui.html)
const uiCtx = await esbuild.context({
    entryPoints: ['src/ui.ts'],
    bundle: true,
    outfile: 'dist/ui.bundle.js',
    target: 'es2020',
    format: 'iife',
});

async function buildAll() {
    await codeCtx.rebuild();
    await uiCtx.rebuild();

    // Read the HTML template and inline the bundled JS
    const html = readFileSync('src/ui.html', 'utf8');
    const js = readFileSync('dist/ui.bundle.js', 'utf8');
    const finalHtml = html.replace('<!-- INLINE_SCRIPT -->', `<script>${js}</script>`);
    writeFileSync('dist/ui.html', finalHtml);

    console.log('[build] Done');
}

await buildAll();

if (isWatch) {
    console.log('[watch] Watching for changes...');
    // Simple poll-based watch
    const chokidar = await import('fs').then(fs => fs.watch);
    // For simplicity, just keep the contexts alive
    await codeCtx.watch();
    await uiCtx.watch();
} else {
    await codeCtx.dispose();
    await uiCtx.dispose();
}
