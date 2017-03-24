import { CompilerOptions, CompilerContext } from './interfaces';
import { Logger } from './logger';
import { transformTsFiles } from './transformer';
import { writeFile } from './util';
import * as path from 'path';


export function compileComponents(opts: CompilerOptions, ctx: CompilerContext = {}) {
  const logger = new Logger(ctx, `compile`);

  return compile(opts, ctx)
    .then(() => {
      // congrats, we did it!  (•_•) / ( •_•)>⌐■-■ / (⌐■_■)
      logger.finish();
    })
    .catch(err => {
      if (err.isFatal) { throw err; }
      throw logger.fail(err);
    });
}


export function compile(opts: CompilerOptions, ctx: CompilerContext) {
  return transformTsFiles(opts, ctx).then(files => {
    return generateManifest(opts, ctx);
  });
}


function generateManifest(opts: CompilerOptions, ctx: CompilerContext) {
  const manifestPath = path.join(opts.destDir, 'manifest.json');

  const manifest: any = {
    components: ctx.components || []
  };

  return writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}
