const fetch = require('node-fetch');

let createFiles;
let sleep;
exports.update = (token, repo, branch, files, message = 'GitHub Direct Commit') => new Promise(async (resolve, reject) => {
    const baseRepoURL = `https://api.github.com/repos/${repo}/git/`;

    // GET REFERENCE

    const refResponse = await fetch(`${baseRepoURL}refs/heads/${branch}`, {
        method: 'GET',
        headers: {
            Authorization: `token ${token}`,
        },
    });

    if (refResponse.status !== 200) {
        console.error('Error getting reference to:', `${baseRepoURL}refs/heads/${branch}`, refResponse.status);
        reject(new Error('Error getting reference to:', `${baseRepoURL}refs/heads/${branch}`, refResponse.status));
        return;
    }
    let json = await refResponse.json();
    const { url } = json.object;

    // GET COMMIT

    const commitResponse = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: `token ${token}`,
        },
    });

    if (commitResponse.status !== 200) {
        console.error('Error getting commit:', commitResponse.status);
        reject(new Error('Error getting commit:', commitResponse.status));
        return;
    }
    json = await commitResponse.json();

    const commitSHA = json.sha;
    const { tree } = json;

    // GET TREE

    const baseTree = await fetch(tree.url, {
        method: 'GET',
        headers: {
            Authorization: `token ${token}`,
        },
    });

    if (baseTree.status !== 200) {
        console.error('Error getting tree:', baseTree.status);
        return;
    }
    json = await baseTree.json();
    const baseTreeSHA = json.sha;

    // CREATE NEW TREE WITH FILES

    const newTreeResult = await createFiles(repo, token, baseTreeSHA, files);
    if (newTreeResult.noTree) {
        resolve({ added: false });
        return;
    }

    // COMMIT

    const commit = {
        message, // Your commit message.
        parents: [commitSHA], // Array of SHAs. Usually contains just one SHA.
        tree: newTreeResult.sha, // SHA of the tree.
    };

    const newCommitBody = JSON.stringify(commit);
    const newCommitResponse = await fetch(`${baseRepoURL}commits`, {
        method: 'POST',
        headers: {
            Authorization: `token ${token}`,
        },
        body: newCommitBody,
    });

    if (newCommitResponse.status !== 200 && newCommitResponse.status !== 201) {
        console.error('Error posting commit:', newCommitResponse.status);
        reject(new Error('Error posting commit:', newCommitResponse.status));
        return;
    }
    const newCommitResult = await newCommitResponse.json();

    // UPDATE REFERENCE

    const update = {
        sha: newCommitResult.sha,
        force: true,
    };
    const updateRefBody = JSON.stringify(update);
    const updateRefResponse = await fetch(`${baseRepoURL}refs/heads/${branch}`, {
        method: 'PATCH',
        headers: {
            Authorization: `token ${token}`,
        },
        body: updateRefBody,
    });

    if (updateRefResponse.status !== 200 && updateRefResponse.status !== 201) {
        const errorJson = await updateRefResponse.json();
        console.error('Error updating ref:', updateRefResponse.status, updateRefResponse.statusText, update, commit);
        reject(new Error('Error updating ref:', updateRefResponse.status, updateRefResponse.statusText, update, commit));
        return;
    }
    const updateRefResult = await updateRefResponse.json();
    updateRefResult.added = true;
    resolve(updateRefResult);
});

sleep = ms => new Promise(async (resolve) => {
    setTimeout(() => {
        resolve(true);
    }, ms);
});

createFiles = async (repo, token, baseTreeSHA, files) => new Promise(async (resolve, reject) => {
    const baseRepoURL = `https://api.github.com/repos/${repo}/git/`;
    const baseTestURL = `https://api.github.com/repos/${repo}/contents/`;

    // TEST EXISTENCE

    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        const testFile = `${baseTestURL}/${file.path}`;
        const res = await fetch(testFile, { // eslint-disable-line
            method: 'GET',
            headers: {
                Authorization: `token ${token}`,
            },
        });

        if (res.status === 200) {
            file.exists = true;
        } else {
            file.exists = false;
        }
    }

    const newFiles = files.filter(file => !file.exists).map((file) => { delete file.exists; return file; });

    // CREATE BLOBS

    const blobs = [];
    for (let fileIdx = 0; fileIdx < newFiles.length; fileIdx++) {
        const file = newFiles[fileIdx];
        const blobUrl = `${baseRepoURL}blobs`;
        const blob = {
            content: file.contents,
            encoding: file.encoding ? file.encoding : 'utf-8',
        };
        const blobBody = JSON.stringify(blob);
        const blobResponse = await fetch(blobUrl, { // eslint-disable-line
            method: 'POST',
            headers: {
                Authorization: `token ${token}`,
            },
            body: blobBody,
        });

        if (blobResponse.status !== 200 && blobResponse.status !== 201) {
            console.error('Error posting blob:', blobResponse.status);
            reject(new Error('Error posting blob:', blobResponse.status));
            return;
        }
        const json = await blobResponse.json(); // eslint-disable-line
        json.path = file.path;
        blobs.push(json);
    }

    // POST NEW TREE

    const newTree = {
        base_tree: baseTreeSHA,
        tree: blobs.map(blob => ({
            path: blob.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha,
        })),
    };

    if (newTree.tree.length === 0) {
        resolve({ noTree: true });
        return;
    }

    const newTreeBody = JSON.stringify(newTree);
    const newTreeResponse = await fetch(`${baseRepoURL}trees`, {
        method: 'POST',
        headers: {
            Authorization: `token ${token}`,
        },
        body: newTreeBody,
    });

    if (newTreeResponse.status !== 200 && newTreeResponse.status !== 201) {
        console.error('Error posting tree:', newTreeResponse.status, newTreeResponse.statusText, newTree);
        reject(new Error('Error posting tree:', newTreeResponse.status));
        return;
    }

    const json = await newTreeResponse.json();
    resolve(json);
});
