import { Module } from 'node:module';
import path from 'path';
import callerPath from 'caller-path';
import resolveFrom from 'resolve-from';

export default class RequireClean {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  deleteMod = function (mod: Module) {
    return delete require.cache[mod.id];
  };

  constructor(name: string, deep = true) {
    deep ??= true;
    if (typeof name !== 'string') {
      throw new TypeError('requireClean expects a moduleId String');
    }
    const cp = callerPath();
    if (!cp) {
      throw new Error('requireClean.clean: callerPath() returned undefined');
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.searchCache(name, cp, deep, this.deleteMod);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-require-imports
    return require(resolveFrom(path.dirname(cp), name));
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  clean = (name: string, deep = true) => {
    deep ??= true;
    if (name === undefined) {
      return Object.keys(require.cache).forEach((key) => {
        return delete require.cache[key];
      });
    } else {
      if (typeof name !== 'string') {
        throw new TypeError('requireClean.clean Expects a moduleId String');
      }
      // eslint-disable-next-line @typescript-eslint/unbound-method
      return this.searchCache(name, callerPath(), deep, this.deleteMod);
    }
  };

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  searchCache = (name: string, calledFrom: string | undefined, deep: boolean, callback: (module: Module) => void) => {
    if (!calledFrom) {
      throw new Error('requireClean.searchCache: calledFrom is undefined');
    }

    const modName = resolveFrom(path.dirname(calledFrom), name);
    let mod: Module | undefined;
    if (modName && (mod = require.cache[modName]) !== void 0) {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      const run = function (mod: Module) {
        if (deep) {
          mod.children.forEach((child) => {
            return run(child);
          });
        }
        return callback(mod);
      };
      run(mod);
    }
  };
}
