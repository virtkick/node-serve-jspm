const {execFile} = require('child_process');
const path = require('path');
const should = require('chai').should();

function runRequest(cwd, route) {
  return new Promise((resolve, reject) => {
    execFile(process.argv[0], [path.join(__dirname, '..', 'serve-test.js'), route], {
      cwd: path.join(__dirname, cwd)
    }, (error, stdout, stderr) => {
      if(error) { return reject(error); }
      process.stderr.write(stderr);
      return resolve(stdout.toString('utf8'));
    });
  });
}


describe('serve-jspm', () => {
  it('should serve compiled jsx with babel plugin', () => {
    return runRequest('jsx-babel', 'test.jsx').then(out => {
      out.should.match(/^System.register/);
    });
  });
  it('should serve compiled jsx with jsx-loader plugin', () => {
    return runRequest('jsx-loader', 'test.jsx').then(out => {
      out.should.match(/^System.register/);
    });
  });
  it('should compile files from inside jspm_packages', () => {
    return runRequest('jsx-babel', 'jspm_packages/npm/systemjs-plugin-babel@0.0.18/babel-helpers/taggedTemplateLiteralLoose.js').then(out => {
      out.should.match(/^System.register/);
    });
  });
  it('should serve json files', () => {
    return runRequest('jsx-babel', 'jspm_packages/npm/babel-runtime@6.20.0.json').then(out => {
      out.should.match(/^{/);
    });
  });
  
  it('should not compile jspm.config.js', () => {
    return runRequest('jsx-babel', 'jspm.config.js').then(out => {
      out.should.not.match(/^System.register/);
    });
  });
});
