import node_fs from "node:fs";
import promises from "node:fs/promises";
import { createRequire } from "node:module";
import { platform } from "node:os";
import node_path, { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAsync } from "@ast-grep/napi";
import { logger } from "@rsbuild/core";
import magic_string from "../compiled/magic-string/index.js";
import picocolors from "../compiled/picocolors/index.js";
import { convertPathToPattern, glob } from "../compiled/tinyglobby/index.js";
import { createRequire as __rspack_createRequire } from "node:module";
const __rspack_createRequire_require = __rspack_createRequire(import.meta.url);
const tsconfig_paths_index_js_namespaceObject = __rspack_createRequire_require("../compiled/tsconfig-paths/index.js");
const { createMatchPath, loadConfig } = tsconfig_paths_index_js_namespaceObject;
const utils_filename = fileURLToPath(import.meta.url);
const utils_require = createRequire(utils_filename);
const ts = utils_require("typescript");
const JS_EXTENSIONS = [
    'js',
    'mjs',
    'jsx',
    '(?<!\\.d\\.)ts',
    '(?<!\\.d\\.)mts',
    '(?<!\\.d\\.)cts',
    'tsx',
    'cjs',
    'cjsx',
    'mjsx',
    'mtsx',
    'ctsx'
];
const JS_EXTENSIONS_PATTERN = new RegExp(`\\.(${JS_EXTENSIONS.join('|')})$`);
function loadTsconfig(tsconfigPath) {
    const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile.bind(ts.sys));
    const configFileContent = ts.parseJsonConfigFileContent(configFile.config, ts.sys, node_path.dirname(tsconfigPath));
    return configFileContent;
}
function mergeAliasWithTsConfigPaths(paths, alias = {}) {
    const mergedPaths = {};
    if (alias && 'object' == typeof alias && Object.keys(alias).length > 0) {
        for (const [key, value] of Object.entries(alias))if ('string' == typeof value && value.trim()) mergedPaths[key] = [
            value
        ];
    }
    if (paths) {
        for (const [key, value] of Object.entries(paths))if (Array.isArray(value) && value.length > 0) {
            if (!mergedPaths[key]) mergedPaths[key] = [
                ...value
            ];
        }
    }
    return Object.keys(mergedPaths).length > 0 ? mergedPaths : {};
}
const TEMP_FOLDER = '.rslib';
const TEMP_DTS_DIR = `${TEMP_FOLDER}/declarations`;
function ensureTempDeclarationDir(cwd, name) {
    const dirPath = node_path.join(cwd, TEMP_DTS_DIR, name);
    if (node_fs.existsSync(dirPath)) return dirPath;
    node_fs.mkdirSync(dirPath, {
        recursive: true
    });
    const gitIgnorePath = node_path.join(cwd, TEMP_FOLDER, '.gitignore');
    node_fs.writeFileSync(gitIgnorePath, '**/*\n');
    return dirPath;
}
async function pathExists(path) {
    return node_fs.promises.access(path).then(()=>true).catch(()=>false);
}
async function isDirectory(filePath) {
    try {
        const stat = await promises.stat(filePath);
        return stat.isDirectory();
    } catch  {
        return false;
    }
}
async function emptyDir(dir) {
    if (!await pathExists(dir)) return;
    try {
        for (const file of (await node_fs.promises.readdir(dir)))await node_fs.promises.rm(node_path.resolve(dir, file), {
            recursive: true,
            force: true
        });
    } catch (err) {
        logger.warn(`Failed to empty dir: ${dir}`);
        logger.warn(err);
    }
}
async function clearTempDeclarationDir(cwd) {
    const dirPath = node_path.join(cwd, TEMP_DTS_DIR);
    await emptyDir(dirPath);
}
function getFileLoc(diagnostic, configPath) {
    if (diagnostic.file) {
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
        return `${picocolors.cyan(diagnostic.file.fileName)}:${picocolors.yellow(line + 1)}:${picocolors.yellow(character + 1)}`;
    }
    return picocolors.cyan(configPath);
}
const prettyTime = (seconds)=>{
    const format = (time)=>picocolors.bold(time);
    if (seconds < 10) {
        const digits = seconds >= 0.01 ? 2 : 3;
        return `${format(seconds.toFixed(digits))} s`;
    }
    if (seconds < 60) return `${format(seconds.toFixed(1))} s`;
    const minutes = Math.floor(seconds / 60);
    const minutesLabel = `${format(minutes.toFixed(0))} m`;
    const remainingSeconds = seconds % 60;
    if (0 === remainingSeconds) return minutesLabel;
    const secondsLabel = `${format(remainingSeconds.toFixed(remainingSeconds % 1 === 0 ? 0 : 1))} s`;
    return `${minutesLabel} ${secondsLabel}`;
};
const convertPath = (path)=>{
    if ('win32' === platform()) return convertPathToPattern(path);
    return path;
};
function getTimeCost(start) {
    const second = (Date.now() - start) / 1000;
    return prettyTime(second);
}
async function addBannerAndFooter(dtsFile, banner, footer) {
    const content = await promises.readFile(dtsFile, 'utf-8');
    const code = new magic_string(content);
    if (banner && !content.trimStart().startsWith(banner.trim())) code.prepend(`${banner}\n`);
    if (footer && !content.trimEnd().endsWith(footer.trim())) code.append(`\n${footer}\n`);
    if (code.hasChanged()) await promises.writeFile(dtsFile, code.toString());
}
async function addExtension(redirect, dtsFile, path, jsExtension, dtsExtension) {
    if (!redirect.extension) return path;
    if (!isAbsolute(path) && !path.startsWith('.')) return path;
    const candidatePaths = [];
    if (await isDirectory(join(dirname(dtsFile), path))) candidatePaths.push(`${path.replace(/\/+$/, '')}/index`);
    candidatePaths.push(path);
    for (const candidatePath of candidatePaths)if (await pathExists(join(dirname(dtsFile), `${candidatePath}${dtsExtension}`))) return `${candidatePath}${jsExtension}`;
    return path;
}
async function redirectDtsImports(dtsFile, dtsExtension, redirect, matchPath, outDir, rootDir) {
    const content = await promises.readFile(dtsFile, 'utf-8');
    const code = new magic_string(content);
    const sgNode = (await parseAsync("typescript", content)).root();
    const matcher = {
        rule: {
            any: [
                {
                    kind: 'import_statement',
                    has: {
                        field: 'source',
                        has: {
                            pattern: '$IMP',
                            kind: 'string_fragment'
                        }
                    }
                },
                {
                    kind: 'import_statement',
                    has: {
                        kind: 'import_require_clause',
                        has: {
                            field: 'source',
                            has: {
                                pattern: '$IMP',
                                kind: 'string_fragment'
                            }
                        }
                    }
                },
                {
                    kind: 'export_statement',
                    has: {
                        field: 'source',
                        has: {
                            pattern: '$IMP',
                            kind: 'string_fragment'
                        }
                    }
                },
                {
                    any: [
                        {
                            pattern: 'require($A)'
                        },
                        {
                            pattern: 'import($A)'
                        }
                    ],
                    has: {
                        field: 'arguments',
                        has: {
                            has: {
                                pattern: '$IMP',
                                kind: 'string_fragment'
                            }
                        }
                    }
                }
            ]
        }
    };
    const matchModule = sgNode.findAll(matcher).map((match)=>{
        const matchNode = match.getMatch('IMP');
        return {
            n: matchNode.text(),
            s: matchNode.range().start.index,
            e: matchNode.range().end.index
        };
    });
    const jsExtension = dtsExtension.replace(/\.d\.ts$/, '.js').replace(/\.d\.cts$/, '.cjs').replace(/\.d\.mts$/, '.mjs');
    for (const imp of matchModule){
        const { n: importPath, s: start, e: end } = imp;
        if (importPath) try {
            const absoluteImportPath = matchPath(importPath, void 0, void 0, [
                '.jsx',
                '.tsx',
                '.js',
                '.ts',
                '.mjs',
                '.mts',
                '.cjs',
                '.cts',
                '.d.ts'
            ]);
            let redirectImportPath = importPath;
            if (absoluteImportPath && !absoluteImportPath.includes('node_modules') && redirect.path) {
                const relativeRootDir = node_path.relative(normalize(rootDir), normalize(absoluteImportPath));
                const isOutsideRootdir = relativeRootDir.startsWith('..') || node_path.isAbsolute(relativeRootDir);
                if (isOutsideRootdir) {
                    const relativePath = relative(dirname(dtsFile), absoluteImportPath);
                    redirectImportPath = relativePath.startsWith('..') ? relativePath : `./${relativePath}`;
                } else {
                    const originalFilePath = resolve(rootDir, relative(outDir, dtsFile));
                    const originalSourceDir = dirname(originalFilePath);
                    const relativePath = relative(originalSourceDir, absoluteImportPath);
                    redirectImportPath = relativePath.startsWith('..') ? relativePath : `./${relativePath}`;
                }
            }
            const ext = extname(redirectImportPath);
            if (ext) if (JS_EXTENSIONS_PATTERN.test(redirectImportPath)) {
                if (redirect.extension) redirectImportPath = redirectImportPath.replace(/\.[^.]+$/, jsExtension);
            } else redirectImportPath = await addExtension(redirect, dtsFile, redirectImportPath, jsExtension, dtsExtension);
            else {
                if (absoluteImportPath && normalize(absoluteImportPath).startsWith(normalize(rootDir))) redirectImportPath = await addExtension(redirect, dtsFile, redirectImportPath, jsExtension, dtsExtension);
                if (!absoluteImportPath && importPath.startsWith('.')) redirectImportPath = await addExtension(redirect, dtsFile, redirectImportPath, jsExtension, dtsExtension);
            }
            const normalizedRedirectImportPath = redirectImportPath.split(node_path.sep).join('/');
            code.overwrite(start, end, normalizedRedirectImportPath);
        } catch (err) {
            logger.warn(err);
        }
    }
    if (code.hasChanged()) await promises.writeFile(dtsFile, code.toString());
}
async function processDtsFiles(bundle, dir, dtsExtension, redirect, tsconfigPath, rootDir, paths, banner, footer) {
    if (bundle) return;
    let matchPath;
    if (redirect.path || redirect.extension) {
        const result = loadConfig(tsconfigPath);
        if ('failed' === result.resultType) return void logger.error(result.message);
        const { absoluteBaseUrl, addMatchAll } = result;
        const mainFields = [];
        matchPath = createMatchPath(absoluteBaseUrl, paths, mainFields, addMatchAll);
    }
    const dtsFiles = await globDtsFiles(dir, [
        `/**/*${dtsExtension}`
    ]);
    await Promise.all(dtsFiles.map(async (file)=>{
        try {
            if (banner || footer) await addBannerAndFooter(file, banner, footer);
            if ((redirect.path || redirect.extension) && matchPath) await redirectDtsImports(file, dtsExtension, redirect, matchPath, dir, rootDir);
        } catch (error) {
            logger.error(`Failed to rename declaration file ${file}: ${error}`);
        }
    }));
}
function processSourceEntry(bundle, entryConfig) {
    if (!bundle) return [];
    if (entryConfig && Object.values(entryConfig).every((val)=>'string' == typeof val)) {
        const entries = Object.entries(entryConfig).map(([name, path])=>({
                name,
                path
            }));
        if (0 === entries.length) {
            const noValidEntryError = new Error(`Can not find a valid entry for ${picocolors.cyan('dts.bundle')} option, please check your entry config.`);
            noValidEntryError.stack = '';
            throw noValidEntryError;
        }
        return entries;
    }
    const error = new Error('@microsoft/api-extractor only support entry of Record<string, string> type to bundle declaration files, please check your entry config.');
    error.stack = '';
    throw error;
}
async function calcLongestCommonPath(absPaths) {
    if (0 === absPaths.length) return null;
    const sep = node_path.posix.sep;
    const splitPaths = absPaths.map((p)=>p.split(sep));
    let lcaFragments = splitPaths[0];
    for(let i = 1; i < splitPaths.length; i++){
        const currentPath = splitPaths[i];
        const minLength = Math.min(lcaFragments.length, currentPath.length);
        let j = 0;
        while(j < minLength && lcaFragments[j] === currentPath[j])j++;
        lcaFragments = lcaFragments.slice(0, j);
    }
    let lca = lcaFragments.length > 0 ? lcaFragments.join(sep) : sep;
    const stats = await promises.stat(lca);
    if (stats?.isFile()) lca = node_path.dirname(lca);
    return lca;
}
const globDtsFiles = async (dir, patterns)=>{
    const dtsFiles = await Promise.all(patterns.map(async (pattern)=>glob(convertPath(join(dir, pattern)), {
            absolute: true,
            dot: true
        })));
    return dtsFiles.flat();
};
async function cleanDtsFiles(dir) {
    const patterns = [
        '/**/*.d.ts',
        '/**/*.d.cts',
        '/**/*.d.mts',
        '/**/*.d.ts.map',
        '/**/*.d.cts.map',
        '/**/*.d.mts.map'
    ];
    const allFiles = await globDtsFiles(dir, patterns);
    await Promise.all(allFiles.map(async (file)=>promises.rm(file, {
            force: true
        })));
}
async function cleanTsBuildInfoFile(tsconfigPath, compilerOptions) {
    const tsconfigDir = dirname(tsconfigPath);
    const { outDir, rootDir, tsBuildInfoFile } = compilerOptions;
    let tsbuildInfoFilePath;
    if (tsBuildInfoFile && isAbsolute(tsBuildInfoFile)) tsbuildInfoFilePath = tsBuildInfoFile;
    else {
        const defaultFileName = `${basename(tsconfigPath, '.json')}${tsBuildInfoFile ?? '.tsbuildinfo'}`;
        tsbuildInfoFilePath = outDir ? rootDir ? join(outDir, relative(resolve(tsconfigDir, rootDir), tsconfigDir), defaultFileName) : join(outDir, defaultFileName) : join(tsconfigDir, defaultFileName);
    }
    if (await pathExists(tsbuildInfoFilePath)) await promises.rm(tsbuildInfoFilePath, {
        force: true
    });
}
function getDtsEmitPath(pathFromPlugin, declarationDir, distPathRoot) {
    return pathFromPlugin ?? declarationDir ?? distPathRoot;
}
function warnIfOutside(cwd, dir, label) {
    if (dir) {
        const normalizedCwd = normalize(cwd);
        const normalizedDir = normalize(dir);
        const relDir = relative(normalizedCwd, normalizedDir);
        if (relDir.startsWith('..')) logger.warn(`The resolved ${label} ${picocolors.cyan(normalizedDir)} is outside the project root ${picocolors.cyan(normalizedCwd)}, please check your tsconfig file.`);
    }
}
function renameDtsFile(fileName, dtsExtension, bundle) {
    if (bundle) return fileName;
    if (fileName.endsWith('.d.ts.map')) return fileName.replace(/\.d\.ts\.map$/, `${dtsExtension}.map`);
    return fileName.replace(/\.d\.ts$/, dtsExtension);
}
function updateDeclarationMapContent(fileName, content, dtsExtension, bundle, hasDeclarationMap = false) {
    if (bundle || !hasDeclarationMap) return content;
    if (fileName.endsWith('.d.ts')) return content.replace(/(\/\/# sourceMappingURL=.+)\.d\.ts\.map/g, `$1${dtsExtension}.map`);
    if (fileName.endsWith('.d.ts.map')) return content.replace(/("file":"[^"]*)\.d\.ts"/g, `$1${dtsExtension}"`);
    return content;
}
export { JS_EXTENSIONS_PATTERN, TEMP_DTS_DIR, TEMP_FOLDER, addBannerAndFooter, calcLongestCommonPath, cleanDtsFiles, cleanTsBuildInfoFile, clearTempDeclarationDir, emptyDir, ensureTempDeclarationDir, getDtsEmitPath, getFileLoc, getTimeCost, globDtsFiles, isDirectory, loadTsconfig, mergeAliasWithTsConfigPaths, pathExists, prettyTime, processDtsFiles, processSourceEntry, redirectDtsImports, renameDtsFile, ts, updateDeclarationMapContent, warnIfOutside };
