# github-direct-commit
Simple library to update and commmit directly to GitHub.

We needed to push files directly to GitHub from our processes and libraries, so
we put together this module to get the job done. It exports one method, update(),
which takes an authorization token, the repo, branch name, and a list of files to
push and commit to the repo/branch.

```
const ghdc = require('github-direct-commit');

const fileInfo = [{
    path: 'somefile.txt',
    contents: 'And more stuff for file.',
}, {
    path: 'anotherfile.txt',
    contents: 'Yet more stuff for file.',
}];

ghdc.update('GitHub Auth Token', 'Owner/branch', 'master', fileInfo);
```

utf-8 encoding is assumed, by default, but you need to send base64, add the encoding property into the mix:

```
const ghdc = require('github-direct-commit');

const fileInfo = [{
    path: 'somefile.jpg',
    contents: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...',
    encoding: 'base64',
}, {
    path: 'anotherfile.jpg',
    contents: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD...',
    encoding: 'base64',
}];

ghdc.update('GitHub Auth Token', 'Owner/branch', 'master', fileInfo);
```
