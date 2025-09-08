/** Reexport every module */
import Patcher from './composites.js';

export * from './patches/buffer.js';
export * from './auxiliary/callee.js';
export * from './commands/commands.js';
export * from './configuration/configuration.js';
export * from './auxiliary/console.js';
export * from './configuration/constants.js';
export * from './filedrops/crypt.js';
export * from './auxiliary/debug.js';
export * from './auxiliary/file.js';
export * from './filedrops/filedrops.js';
export * from './filedrops/packer.js';
export * from './build/packaging.js';
export * from './patches/parser.js';
export * from './auxiliary/uac.js';
export * from './auxiliary/logger.js';
export * from './composites.js';

/** Emits patch progress information. */
export { patchEmitter } from './patches/patches.js';

/** Emits events for file drop operations. */
export { filedropEmitter } from './filedrops/filedrops.js';

/** Emits events for packaging operations. */
export { packagingEmitter } from './build/packaging.js';

export default Patcher;
