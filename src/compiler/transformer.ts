import { FileMeta, CompilerOptions, CompilerContext } from './interfaces';
import { parseTsSrcFile } from './parser';
import { isTsSourceFile, isTransformable, readFile } from './util';
import { processStyles } from './styles';
import * as fs from 'fs';
import * as path from 'path';


export function transformTsFiles(opts: CompilerOptions, ctx: CompilerContext = {}): Promise<Map<string, FileMeta>> {
  return transformDirectory(opts.srcDir, opts, ctx).then(() => {
    return ctx.files;
  });
}


export function transformTsFile(filePath: string, opts: CompilerOptions, ctx: CompilerContext = {}) {
  if (!ctx.files) {
    ctx.files = new Map();
  }

  return getFile(filePath, opts, ctx).then(file => {
    return transformFile(file, opts, ctx);
  });
}


function transformFile(file: FileMeta, opts: CompilerOptions, ctx: CompilerContext) {
  if (!file.isTsSourceFile || !file.isTransformable) {
    return Promise.resolve(file);
  }

  parseTsSrcFile(file, opts, ctx);

  if (!file.cmpMeta) {
    return Promise.resolve(file);
  }

  return processStyles(file, opts, ctx).then(() => {
    return file;
  });
}


function transformDirectory(dir: string, opts: CompilerOptions, ctx: CompilerContext) {
  return new Promise((resolve) => {

    fs.readdir(dir, (err, files) => {
      if (err) {
        console.log(err);
        resolve();
        return;
      }

      const promises: Promise<any>[] = [];

      files.forEach(dirItem => {
        const readPath = path.join(dir, dirItem);

        if (!isValidDirectory(readPath)) {
          return;
        }

        if (fs.statSync(readPath).isDirectory()) {
          promises.push(transformDirectory(readPath, opts, ctx));

        } else if (isTsSourceFile(readPath)) {
          promises.push(transformTsFile(readPath, opts, ctx));
        }
      });

      Promise.all(promises).then(() => {
        resolve();
      });
    });

  });
}


export function getFile(filePath: string, opts: CompilerOptions, ctx: CompilerContext): Promise<FileMeta> {
  if (opts.cacheFiles !== false) {
    const file = ctx.files.get(filePath);
    if (file) {
      return Promise.resolve(file);
    }
  }

  return readFile(filePath).then(srcText => {
    return createFileMeta(filePath, srcText, opts, ctx);
  });
}


export function getFileSync(filePath: string, opts: CompilerOptions, ctx: CompilerContext) {
  if (opts.cacheFiles !== false) {
    const file = ctx.files.get(filePath);
    if (file) {
      return file;
    }
  }

  return createFileMeta(filePath, fs.readFileSync(filePath, 'utf8'), opts, ctx);
}


function createFileMeta(filePath: string, srcText: string, opts: CompilerOptions, ctx: CompilerContext) {
  const file: FileMeta = {
    fileName: path.basename(filePath),
    filePath: filePath,
    srcText: srcText,
    srcTextWithoutDecorators: srcText,
    isTsSourceFile: isTsSourceFile(filePath),
    isTransformable: false,
    cmpMeta: null
  };

  if (file.isTsSourceFile) {
    file.isTransformable = isTransformable(file.srcText);
  }

  if (opts.cacheFiles !== false) {
    ctx.files.set(filePath, file);
  }

  return file;
}


function isValidDirectory(filePath: string) {
  return filePath.indexOf('node_modules') === -1;
}
