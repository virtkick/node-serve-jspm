import Promise from 'bluebird';
import {readFile, writeFile} from 'fs';
import {mkdirp as _mkdirp} from 'mkdirp';
const mkdirp = Promise.promisify(_mkdirp);
const readFileAsync = Promise.promisify(readFile);
const writeFileAsync = Promise.promisify(writeFile);

import {join as pathJoin} from 'path';
import {createHash} from 'crypto';

let path = require('path');
let crypto = require('crypto');

const cacheDirPromise = mkdirp(path.join(__dirname, '.cache')).then(() => {
  return path.join(__dirname, '.cache');
});

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function saveToCache(key, data) {
  key = sha256(key);
  return cacheDirPromise.then((cacheDir) => {
    return writeFileAsync(path.join(cacheDir, key), data);
  }).then(() => {
    return data;
  });
}

function getFromCache(key) {
  key = sha256(key);
  return cacheDirPromise.then((cacheDir) => {
    return readFileAsync(path.join(cacheDir, key), 'utf8');
  }).catch({
    code: 'ENOENT'
  }, () => {});
}


export function wrapFunction(func, getData = data => data) {
  return function() {
    let args = arguments;
    let key = JSON.stringify(args);
    return getFromCache(key).then(data => {
      if(data) {
        return data;
      }
      return Promise.try(() => func.apply(this, args)).then(data => getData(data)).then(data => {
        return saveToCache(key, data);
      });
    })
  };
};

export function handleRequest(req, res, cacheKey) {
  if(typeof cacheKey !== 'string') {
    cacheKey = JSON.stringify(cacheKey);
  }
  cacheKey = sha256(cacheKey);
  if(req.headers['if-none-match'] === cacheKey) {
    res.status(304).end();
    return true;
  }
  res.setHeader('etag', cacheKey);
  return false;
}
