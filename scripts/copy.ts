import { copyFileSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'node:child_process';
import semver from 'semver';

function copy(filename: string, from: string, to: string): void {
    copyFileSync(join(from, filename), join(to, filename));
}

function rewrite(p: string, replacer: (from: string) => string): void {
    try {
        const file = readFileSync(p).toString();
        const replaced = replacer(file);
        writeFileSync(p, replaced);
    } catch {
        // not found
    }
}

function getProjectVersion(packageName: string) {
    const version = execSync(`npm show ${packageName} version`)
        .toString()
        .trim();
    return version;
}

const localPackages = readdirSync(join(__dirname, '../packages'));

if (!process.env.GIT_TAG || semver.valid(process.env.GIT_TAG) === null) {
    throw new Error(
        `GIT_TAG environment variable is not set or is not a valid semver tag!

GIT_TAG: ${process.env.GIT_TAG}
GITHUB_REF: ${process.env.GITHUB_REF}`,
    );
}

const targetVersion = semver.valid(process.env.GIT_TAG);

let rootVersion = getProjectVersion(`${__dirname}/../`);
const currentLocalVersion = getProjectVersion(process.cwd());

if (semver.gt(targetVersion!, rootVersion)) {
    execSync(
        `cd ${__dirname}/../ && npm version ${targetVersion} --git-tag-version=false`,
        {
            encoding: 'utf-8',
        },
    );

    rootVersion = getProjectVersion(`${__dirname}/../`);
}

if (
    semver.valid(rootVersion) &&
    semver.valid(currentLocalVersion) &&
    semver.gt(rootVersion, currentLocalVersion)
) {
    execSync(
        `cd ${process.cwd()} && npm version ${rootVersion} --git-tag-version=false`,
        {
            encoding: 'utf-8',
        },
    );
}

// eslint-disable-next-line
const localDependencies = Object.keys(
    require(join(process.cwd(), 'package.json')).dependencies,
).filter((dep: string) => localPackages.includes(dep));

execSync(`cd ${process.cwd()} && npm install ${localDependencies.join(' ')}`, {
    encoding: 'utf-8',
});

// as we publish only the dist folder, we need to copy some meta files inside (readme/license/package.json)
// also changes paths inside the copied `package.json` (`dist/index.js` -> `index.js`)
const root = join(__dirname, '..');
const target = join(process.cwd(), 'dist');

copy('README.md', root, target);
copy('LICENSE.md', root, target);
copy('package.json', process.cwd(), target);
rewrite(join(target, 'package.json'), (pkg) => pkg.replace(/dist\//g, ''));
rewrite(join(target, 'utils.js'), (pkg) =>
    pkg.replace('../package.json', './package.json'),
);
