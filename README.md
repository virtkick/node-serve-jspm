# node-serve-jspm
Express middleware to transpile, cache and serve JSPM javascripts on server-side. Much much faster than compiling with babel in the browser.

This package will:
* Use JSPM's plugins such as babel/jsx
* Automatically read metadata for each file that you may have defined in your `package.json`
* Use ETag to cache transpiled files in the browser (304 requests)
* Save local cache in `.cache` dir, you may need to periodically clean it

TODO:
* Tests

## Usage

### Install
```
npm install --save-dev serve-jspm
```

### Import
```js
import serveJspm from 'serve-jspm';
```
or with ES5
```js
const serveJspm = require('serve.jspm').default;
```

### Use with Express

```js
app.use('/jspm_packages', serveJspm(path.join(__dirname, 'javascripts', 'jspm_packages')));
app.use('/javascripts', serveJspm(path.join(__dirname, 'javascripts');
```

For best performance serve both jspm_packages and your own scripts. 

### Plugins

Each request to `.pug.js` will load a file from `.pug` and then pass it to babel. For static build you need to hook up your own tooling. (to be improved)

```js
  app.use('/javascripts', serveJspm(pathJoin(__dirname, 'javascripts'), {
    plugins: {
      pug(pugContent, pathname, basedir) {
        const pug = require('pug');
        let text = pug.compile(pugContent, { doctype: 'html', pretty: true, filename: pathname, basedir, inlineRuntimeFunctions: false })();
        return `export default ${JSON.stringify(text)}`;;
      }
    }
  }));
```

## License
MIT
