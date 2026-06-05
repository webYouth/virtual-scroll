import type { DtsGenOptions } from './index';
export declare const DEFAULT_EXCLUDED_PACKAGES: string[];
export declare const calcBundledPackages: (options: {
    cwd: string;
    autoExternal: DtsGenOptions["autoExternal"];
    userExternals?: DtsGenOptions["userExternals"];
    overrideBundledPackages?: string[];
}) => string[];
export declare function generateDts(data: DtsGenOptions): Promise<void>;
