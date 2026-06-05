import node_fs from "node:fs";
import { join, relative } from "node:path";
import { logger } from "@rsbuild/core";
import picocolors from "../compiled/picocolors/index.js";
import { addBannerAndFooter, getTimeCost } from "./utils.js";
const logPrefixApiExtractor = picocolors.dim('[api-extractor]');
async function bundleDts(options) {
    let apiExtractor;
    try {
        apiExtractor = await import("@microsoft/api-extractor");
    } catch  {
        const error = new Error(`${picocolors.cyan('@microsoft/api-extractor')} is required when ${picocolors.cyan('dts.bundle')} is set to ${picocolors.cyan('true')}, please make sure it is installed. You could check https://rslib.rs/guide/advanced/dts#how-to-generate-declaration-files-in-rslib for more details.`);
        error.stack = '';
        throw error;
    }
    const { Extractor, ExtractorConfig, ExtractorLogLevel } = apiExtractor;
    const { name, cwd, distPath, dtsExtension, banner, footer, dtsEntry, tsconfigPath = 'tsconfig.json', bundledPackages = [] } = options;
    try {
        await Promise.all(dtsEntry.map(async (entry)=>{
            const start = Date.now();
            const untrimmedFilePath = join(cwd, relative(cwd, distPath), `${entry.name}${dtsExtension}`);
            const mainEntryPointFilePath = entry.path;
            if (!node_fs.existsSync(mainEntryPointFilePath)) throw new Error(`Declaration entry file ${picocolors.underline(entry.path)} not found.\nPlease ensure that your tsconfig file ${picocolors.underline(tsconfigPath)} is correctly configured to generate declaration files. If needed, a custom tsconfig can be specified using the ${picocolors.cyan('source.tsconfigPath')} option.`);
            const internalConfig = {
                mainEntryPointFilePath,
                bundledPackages,
                dtsRollup: {
                    enabled: true,
                    untrimmedFilePath
                },
                compiler: {
                    tsconfigFilePath: tsconfigPath
                },
                projectFolder: cwd
            };
            const extractorConfig = ExtractorConfig.prepare({
                configObject: internalConfig,
                configObjectFullPath: void 0,
                packageJsonFullPath: join(cwd, 'package.json')
            });
            const extractorResult = Extractor.invoke(extractorConfig, {
                localBuild: true,
                messageCallback (message) {
                    if ('console-compiler-version-notice' === message.messageId || 'console-preamble' === message.messageId) message.logLevel = ExtractorLogLevel.None;
                }
            });
            if (!extractorResult.succeeded) throw new Error(`API Extractor error. ${picocolors.dim(`(${name})`)}`);
            await addBannerAndFooter(untrimmedFilePath, banner, footer);
            logger.ready(`declaration files bundled successfully: ${picocolors.cyan(relative(cwd, untrimmedFilePath))} in ${getTimeCost(start)} ${picocolors.dim(`(${name})`)}`);
        }));
    } catch (e) {
        const message = e instanceof Error ? e.message : e;
        const error = new Error(`${logPrefixApiExtractor} ${message} ${picocolors.dim(`(${name})`)}`);
        error.stack = '';
        throw error;
    }
}
export { bundleDts };
