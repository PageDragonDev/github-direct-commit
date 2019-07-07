const ghdc = require('./lib/index');

const fileInfo = [{
    path: 'somefile.txt',
    contents: 'And more stuff for file.',
}, {
    path: 'anotherfile.txt',
    contents: 'Yet more stuff for file.',
}];

ghdc.update('e13e226831b1c2fc192f8aebf2ae1661769e82b1', 'PageDragonDev/abouttally', 'master', fileInfo);
