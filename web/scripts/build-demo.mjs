import { cp, mkdir, readFile, rm, writeFile, symlink } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const web = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stage = join(web, '.demo');
const basePath = process.env.DEMO_BASE_PATH ?? '';
if (basePath && !/^\/[a-zA-Z0-9/_-]+$/.test(basePath)) throw new Error('DEMO_BASE_PATH must be an absolute URL path');
await rm(stage, { recursive: true, force: true });
await mkdir(stage);
for (const name of ['app', 'src', 'public', 'package.json', 'tsconfig.json', 'postcss.config.mjs']) {
  await cp(join(web, name), join(stage, name), { recursive: true });
}
for (const name of ['app/admin', 'app/(public)/configuracion', 'app/sitemap.ts', 'src/components/ConfigPanel.tsx', 'src/lib/config-actions.ts', 'src/lib/connect/transport.ts']) {
  await rm(join(stage, name), { recursive: true, force: true });
}
await cp(join(web, 'demo/src'), join(stage, 'src'), { recursive: true });
await cp(join(web, '../backend/seed/seed.json'), join(stage, 'src/data/demo-catalog.json'));
await symlink(join(web, 'node_modules'), join(stage, 'node_modules'), 'dir');
const edit = async (name, transform) => {
  const path = join(stage, name);
  await writeFile(path, transform(await readFile(path, 'utf8')));
};
const demoToday = '2026-10-12';
for (const route of ['app/(public)/page.tsx', 'app/(public)/perfil/page.tsx', 'app/(public)/juego/[id]/page.tsx']) {
  await edit(route, text => text.replace('export const dynamic = "force-dynamic";', 'export const dynamic = "force-static";').replaceAll('process.env.DEMO_TODAY', JSON.stringify(demoToday)));
}
await edit('app/(public)/juego/[id]/page.tsx', text => 'import { demoGames } from "@/lib/connect/catalog";\nexport const dynamicParams = false;\nexport function generateStaticParams() { return demoGames.map(({ id }) => ({ id })); }\n' + text);
await edit('app/robots.ts', text => 'export const dynamic = "force-static";\n' + text);
for (const file of ['src/components/Footer.tsx', 'src/components/Topbar.tsx']) {
  await edit(file, text => text.replace(/<Link href="\/configuracion"[\s\S]*?<\/Link>/g, '').replace(file.endsWith('Footer.tsx') ? 'import Link from "next/link";' : '__unused__', '').replace('import { attribution, ui }', 'import { attribution }'));
}
await edit('src/components/ProfilePanel.tsx', text => text.replace('const { user, logout } = useAuth();', 'const { user } = useAuth();').replace(/<ComicButton variant="ghost" onClick=\{logout\}[\s\S]*?<\/ComicButton>/, ''));
await writeFile(join(stage, 'src/components/DealsShowcase.tsx'), 'export function DealsShowcase(_props: { deals: unknown; stores: unknown; error: string | null; gameIdByDealId?: Record<string, string> }) { void _props; return <p className="font-ui px-6 py-8 text-center">Demo: no se muestran ofertas ni precios vigentes.</p>; }\n');
await edit('src/components/Footer.tsx', text => text.replace('{attribution.region}', 'Demo · 12 oct 2026 · {attribution.region}'));
await edit('app/(public)/perfil/page.tsx', text => text.replace('<ProfileView ', '<p className="font-ui">Perfil de visitante local. Sin cuenta ni contraseña; puedes borrar tus preferencias en Datos y respaldo.</p><ProfileView '));
await writeFile(join(stage, 'next.config.ts'), `import type { NextConfig } from 'next';\nconst config: NextConfig = { output: 'export', trailingSlash: true, basePath: ${JSON.stringify(basePath)}, images: { unoptimized: true }, experimental: { cpus: 2 } };\nexport default config;\n`);
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => ['PATH', 'HOME', 'TMPDIR', 'SYSTEMROOT'].includes(key)));
env.NEXT_TELEMETRY_DISABLED = '1';
if (process.argv.includes('--prepare-only')) process.exit(0);
const result = spawnSync(process.execPath, [join(web, 'node_modules/next/dist/bin/next'), 'build', '--webpack'], { cwd: stage, env, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
const demoSite = resolve(web, '..', 'demo-site');
await rm(demoSite, { recursive: true, force: true });
await cp(join(stage, 'out'), demoSite, { recursive: true });
await writeFile(join(demoSite, '.nojekyll'), '');
console.log(`Static demo exported to ${demoSite} (base path: ${basePath || '/'})`);
