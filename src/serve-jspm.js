import Promise from 'bluebird';

import {stat, readFile} from 'fs';
import {join as pathJoin, extname} from 'path';
import {wrapFunction, handleRequest} from './cache';
import {Builder} from 'jspm';

const builder = new Builder;

const statAsync = Promise.promisify(stat);
const readFileAsync = Promise.promisify(readFile);

import {unescape} from 'querystring';

import mime from 'mime-types';

export default function serveJspm(baseDir, {failOnNotFound = false, plugins = {}} = {}) {
  let doCompile = (function(fullDir) {
    return builder.compile(fullDir, {
      sourceMaps: 'inline'
    }).get('source');
  });
  
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

      if(handleRequest(req, res, { mtime, fullDir })) { return true; }
                        
      let contents;
      {
        var accept = req.headers['accept'];
        //if (accept && accept.indexOf('application/x-es-module') !== -1) {
          if(pluginHandler) {
            contents = await Promise.try(() => pluginHandler(contents, pathname, baseDir));
          } else {
            contents = await doCompile(fullDir, mtime);
          }
        //} else {
//          contents = await readFileAsync(fullDir, 'utf8');
        //}
      };
          
      res.end(contents);
    } catch(err) {
      if(err.code === 'ENOENT' && !sourceFound) {
        return notFound();
      } else {
        
        console.error(err.stack);
        res.status(500)
        res.end();
      }
    }
  };
}
