import Promise from 'bluebird';

import {stat, readFile} from 'fs';
import {join as pathJoin, extname} from 'path';
import {wrapFunction, handleRequest} from './cache';
import {Loader, Builder} from 'jspm';

const builder = new Builder;
const loader = builder.loader;

// workaround for: https://github.com/jspm/jspm-cli/issues/2202
loader.getCanonicalName = builder.getCanonicalName;

const statAsync = Promise.promisify(stat);
const readFileAsync = Promise.promisify(readFile);

import {unescape} from 'querystring';

import mime from 'mime-types';

export default function serveJspm(baseDir, {failOnNotFound = false, plugins = {}} = {}) {
  let cachedLoaderTranslate;
  async function getMetadata(pathname) {
    let metadata = {
      babelOptions: {
        sourceMaps: 'inline'
      }
    };
    await loader.locate({name: pathname, metadata});
    return metadata;
  }

  async function doTranslate(contents, pathname) {
    let metadata = await getMetadata(pathname);
    if(!cachedLoaderTranslate) {
      cachedLoaderTranslate = wrapFunction(loader.translate.bind(loader));
    }
    return cachedLoaderTranslate({
      metadata, address: pathname, source: contents
    }, {
      outputESM: false
    });
  }
  
  return async (req, res, next) => {
    let sourceFound;
    let notFound = () => {
      if(failOnNotFound) {
        return res.status(404).end();
      }
      return next();
    };
    
    try {
      res.setHeader('Cache-Control', `public, max-age=0`);
      res.setHeader('content-type', mime.contentType(extname(req.url)));
      let pathname = unescape(req.url);
      
      let pluginHandler;
      { // handle plugins
        let m;
        if(m = pathname.match(/\.(\w+)\.js$/)) {
          let plugin = m[1];
          if(plugins.hasOwnProperty(plugin)) {
            pluginHandler = plugins[plugin];
            pathname = pathname.replace(/\.(\w+)\.js$/, (m, ext) => `.${ext}`);
          }
        }
      }
      var fullDir = pathJoin(baseDir, pathname);
      let stat = await statAsync(fullDir);
      if(!stat.isFile()) {
        return notFound();
      }
      let {mtime} = stat;
      sourceFound = true;
      
      let metadata = await getMetadata(pathname);
      if(handleRequest(req, res, { mtime, fullDir, metadata })) { return true; }
      
      let contents = await readFileAsync(fullDir, 'utf8');
      if(pluginHandler) {
        contents = await Promise.try(() => pluginHandler(contents, pathname, baseDir));
      }
      contents = await doTranslate(contents, pathname);
            
      res.end(contents);
    } catch(err) {
      if(err.code === 'ENOENT' && !sourceFound) {
        return notFound();
      } else {
        console.error(err.stack);
        res.status(500).end();
      }
    }
  };
}
