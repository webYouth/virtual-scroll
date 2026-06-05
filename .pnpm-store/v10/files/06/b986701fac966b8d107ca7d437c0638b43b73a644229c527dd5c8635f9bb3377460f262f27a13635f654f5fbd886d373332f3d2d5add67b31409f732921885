import { fork } from "node:child_process";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "@rsbuild/core";
import picocolors from "../compiled/picocolors/index.js";
import { cleanDtsFiles, cleanTsBuildInfoFile, clearTempDeclarationDir, getDtsEmitPath, loadTsconfig, processSourceEntry, ts, warnIfOutside } from "./utils.js";
const src_filename = fileURLToPath(import.meta.url);
const src_dirname = dirname(src_filename);
const PLUGIN_DTS_NAME = 'rsbuild:dts';
const pluginDts = (options = {})=>({
        name: PLUGIN_DTS_NAME,
        setup (api) {
            const loggerLevel = api.logger.level;
            logger.level = loggerLevel;
            let apiExtractorOptions = {};
            if (options.bundle && 'object' == typeof options.bundle) apiExtractorOptions = {
                ...options.bundle
            };
            const bundle = !!options.bundle;
            options.abortOnError = options.abortOnError ?? true;
            options.build = options.build ?? false;
            options.redirect = options.redirect ?? {};
            options.redirect.path = options.redirect.path ?? true;
            options.redirect.extension = options.redirect.extension ?? false;
            options.alias = options.alias ?? {};
            options.tsgo = options.tsgo ?? false;
            const dtsPromises = [];
            let promisesResult = [];
            let childProcesses = [];
            api.onBeforeEnvironmentCompile(async ({ isWatch, isFirstCompile, environment })=>{
                if (!isFirstCompile && !options.tsgo) return;
                const { config } = environment;
                const dtsEntry = processSourceEntry(bundle, config.source?.entry);
                const cwd = api.context.rootPath;
                const tsconfigPath = ts.findConfigFile(cwd, ts.sys.fileExists.bind(ts.sys), config.source.tsconfigPath);
                if (!tsconfigPath) {
                    const error = new Error(`Failed to resolve tsconfig file ${picocolors.cyan(`"${config.source.tsconfigPath}"`)} from ${picocolors.cyan(cwd)}. Please ensure that the file exists.`);
                    error.stack = '';
                    throw error;
                }
                const tsConfigResult = loadTsconfig(tsconfigPath);
                const { options: rawCompilerOptions } = tsConfigResult;
                const { declarationDir, outDir, composite, incremental } = rawCompilerOptions;
                const distPathRoot = 'string' == typeof config.output?.distPath ? config.output?.distPath : config.output?.distPath.root;
                const dtsEmitPath = getDtsEmitPath(options.distPath, declarationDir, distPathRoot);
                warnIfOutside(cwd, declarationDir, 'declarationDir');
                warnIfOutside(cwd, outDir, 'outDir');
                if (false !== config.output.cleanDistPath) await cleanDtsFiles(dtsEmitPath);
                if (bundle) await clearTempDeclarationDir(cwd);
                if (composite || incremental || options.build) await cleanTsBuildInfoFile(tsconfigPath, rawCompilerOptions);
                const jsExtension = extname(src_filename);
                const childProcess = fork(join(src_dirname, `./dts${jsExtension}`), [], {
                    stdio: 'inherit'
                });
                childProcesses.push(childProcess);
                const dtsGenOptions = {
                    ...options,
                    bundle,
                    dtsEntry,
                    dtsEmitPath,
                    userExternals: config.output.externals,
                    apiExtractorOptions,
                    tsconfigPath,
                    tsConfigResult,
                    name: environment.name,
                    cwd,
                    isWatch,
                    loggerLevel: loggerLevel
                };
                childProcess.send(dtsGenOptions);
                dtsPromises.push(new Promise((resolve)=>{
                    childProcess.on('message', (message)=>{
                        if ('success' === message) resolve({
                            status: 'success'
                        });
                        else if ('error' === message) resolve({
                            status: 'error',
                            errorMessage: `Error occurred in ${environment.name} declaration files generation.`
                        });
                    });
                }));
            });
            api.onAfterBuild({
                handler: async ({ isFirstCompile })=>{
                    if (!isFirstCompile) return;
                    promisesResult = await Promise.all(dtsPromises);
                },
                order: 'pre'
            });
            api.onAfterBuild(({ isFirstCompile })=>{
                if (!isFirstCompile) return;
                for (const result of promisesResult)if ('error' === result.status) {
                    if (options.abortOnError) {
                        const error = new Error(result.errorMessage);
                        error.stack = '';
                        throw error;
                    }
                    result.errorMessage && logger.error(result.errorMessage);
                    logger.warn('With `abortOnError` configuration currently disabled, type errors will not fail the build, but proper type declaration output cannot be guaranteed.');
                }
            });
            const killProcesses = ()=>{
                for (const childProcess of childProcesses)if (!childProcess.killed) try {
                    childProcess.kill();
                } catch (_err) {}
                childProcesses = [];
            };
            api.onCloseBuild(killProcesses);
            api.onCloseDevServer(killProcesses);
        }
    });
export { PLUGIN_DTS_NAME, pluginDts };
