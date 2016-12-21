import Promise from 'bluebird';
import url from 'url';
import fs from 'fs';
import path from 'path';
import {wrapFunction, handleRequest} from './cache';

import jspm from 'jspm';

const loader = new jspm.Loader({});
const builder = new jspm.Builder({});
// workaround for: https://github.com/jspm/jspm-cli/issues/2202
loader.getCanonicalName = builder.getCanonicalName;

// source:
// https://github.com/systemjs/systemjs/blob/master/lib/esm.js#L6
const esmRegEx = /(^\s*|[}\);\n]\s*)(import\s+(['"]|(\*\s+as\s+)?[^"'\(\)\n;]+\s+from\s+['"]|\{)|export\s+\*\s+from\s+["']|export\s+(\{|default|function|class|var|const|let|async\s+function))/;

function isEsNext(contents) {
  if(!contents) {
    return;
  }
  return contents.match(esmRegEx);
}

export default function serveJspm(baseDir, {plugins = {}} = {}) {
  let cachedBabelTranslate;

  async function getMetadata(pathname) {
    let metadata = {
      babelOptions: {
        sourceMaps: 'inline'
      }
    };
    await loader.locate({name: pathname, metadata});
    return metadata;
  }

  async function doBabel(contents, pathname) {
    let metadata = await getMetadata(pathname);
    if(!cachedBabelTranslate) {
      let babel = await loader.import('plugin-babel');
      babel.pluginLoader = loader;
      babel.loader = loader;
      cachedBabelTranslate = wrapFunction(babel.translate.bind(babel));
    }
    
    if(!isEsNext(contents)) {
      return contents;
    }
    return cachedBabelTranslate({
      metadata, address: pathname, source: contents
    }, {
      outputESM: false
    });
  }

  return async (req, res, next) => {
    try {
      res.setHeader('Cache-Control', `public, max-age=0`);
      res.setHeader('content-type', 'text/javascript');
      
      let pathname = req.url;
      let pluginHandler;
      let m;
      if(m = pathname.match(/\.(\w+)\.js$/)) {
        let plugin = m[1];
        if(plugins[plugin]) {
          pluginHandler = plugins[plugin];
          pathname = pathname.replace(/\.(\w+)\.js$/, (m, ext) => `.${ext}`);
        }
      }
      
      var fullDir = path.join(baseDir, pathname);
      let {mtime} = await fs.statAsync(fullDir);
      
      let metadata = await getMetadata(pathname);
      
      if(handleRequest(req, res, { mtime, fullDir, metadata })) { return true; }
      
      let contents = await fs.readFileAsync(fullDir, 'utf8');
      if(pluginHandler) {
        contents = await Promise.try(() => pluginHandler(contents, pathname, baseDir));
      }
      contents = await doBabel(contents, pathname);
      
      res.end(contents);
    } catch(err) {
      if(err.code === 'ENOENT') {
        res.status(404).end();
      } else {
        console.error(err.stack);
        res.status(500).end();
      }
    }
  };
}
