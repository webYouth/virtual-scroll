import type { Stats as FSStats } from 'node:fs';
import type { InternalContext, Rspack } from '../../types';
import { HttpCode } from '../helper';
/**
 * Resolves URL to file path with security checks and retrieves file from
 * the build output directories.
 */
export declare function getFileFromUrl(url: string, outputFileSystem: Rspack.OutputFileSystem, context: InternalContext): Promise<{
    filename: string;
    fsStats: FSStats;
} | {
    errorCode: HttpCode;
} | undefined>;
