import { copyFileSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'node:child_process';

const options = process.argv.slice(2).reduce((args, arg) => {
    const [key, value] = arg.split('=');
    args[key.substring(2)] = value ?? true;

    return args;
}, {} as any);

function copy(filename: string, from: string, to: string): void {
    copyFileSync(resolve(from, filename), resolve(to, filename));
}

function rewrite(path: string, replacer: (from: string) => string): void {
    try {
        const file = readFileSync(path).toString();
        const replaced = replacer(file);
        writeFileSync(path, replaced);
    } catch {
        // not found
    }
}

/**
 * Checks next dev version number based on the local package via `npm show`.
 */
function getNextVersion() {
    const versions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-dynamic-require,global-require
    const pkgJson = require(resolve('package.json'));

    try {
        const versionString = execSync(`npm show ${pkgJson.name} versions --json`, { encoding: 'utf8', stdio: 'pipe' });
        const parsed = JSON.parse(versionString) as string[];
        versions.push(...parsed);
    } catch {
        // the package might not have been published yet
    }

    if (versions.some((v) => v === pkgJson.version)) {
        // eslint-disable-next-line no-console
        console.error(`before-deploy: A release with version ${pkgJson.version} already exists. Please increment version accordingly.`);
        process.exit(1);
    }

    const preid = options.preid ?? 'alpha';
    const prereleaseNumbers = versions
        .filter((v) => v.startsWith(`${pkgJson.version}-${preid}.`))
        .map((v) => Number(v.match(/\.(\d+)$/)?.[1]));
    const lastPrereleaseNumber = Math.max(-1, ...prereleaseNumbers);

    return `${pkgJson.version}-${preid}.${lastPrereleaseNumber + 1}`;
}

// as we publish only the dist folder, we need to copy some meta files inside (readme/license/package.json)
// also changes paths inside the copied `package.json` (`dist/index.js` -> `index.js`)
const root = resolve(__dirname, '..');
const target = resolve(process.cwd(), 'dist');
const pkgPath = resolve(process.cwd(), 'package.json');

if (options.canary) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-dynamic-require,global-require
    const pkgJson = require(pkgPath);
    const nextVersion = getNextVersion();
    pkgJson.version = nextVersion;

    const packageNames = readdirSync(`${__dirname}/../packages/`);
    for (const dep of Object.keys(pkgJson.dependencies)) {
        if (packageNames.includes(dep)) {
            // We can read the new version of the dependency package because of turborepo (that builds a build graph).
            // eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-dynamic-require,global-require
            const pkgJsonDep = require(resolve(`../${dep}`, 'package.json'));
            const prefix = pkgJson.dependencies[dep].startsWith('^') ? '^' : '';
            pkgJson.dependencies[dep] = prefix + pkgJsonDep.version;
        }
    }

    // eslint-disable-next-line no-console
    console.info(`canary: setting version to ${nextVersion}`);

    writeFileSync(pkgPath, `${JSON.stringify(pkgJson, null, 4)}\n`);
}

copy('README.md', root, target);
copy('LICENSE.md', root, target);
copy('package.json', process.cwd(), target);
rewrite(resolve(target, 'package.json'), (pkg) => pkg.replace(/dist\//g, ''));
rewrite(resolve(target, 'utils.js'), (pkg) => pkg.replace('../package.json', './package.json'));
