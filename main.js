'use strict';

const http = require('node:http');
const port = 9999;
const statusNotFound = 404;
const statusOk = 200;
const statusBadRequest = 400;

let nextId = 1;
const posts = [];

const methods = new Map();

function sendResponse(
  response,
  { status = statusOk, headers = {}, body = null }
) {
  Object.entries(headers).forEach(function ([key, value]) {
    response.setHeader(key, value);
  });

  response.writeHead(status);
  response.end(body);
}

function sendJSON(response, body) {
  sendResponse(response, {
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

methods.set('/posts.get', function ({ response }) {
  // Filter out removed posts
  const activePosts = posts.filter(post => !post.removed);
  sendJSON(response, activePosts);
});

methods.set('/posts.getById', function ({ response, searchParams }) {
  const idString = searchParams.get('id');

  if (!idString || isNaN(Number(idString))) {
    sendResponse(response, { status: statusBadRequest });
    return;
  }

  const id = Number(idString);
  const findPost = posts.find((el) => el.id === id && !el.removed);

  if (findPost) {
    sendJSON(response, findPost);
  } else {
    sendResponse(response, { status: statusNotFound });
  }
});

methods.set('/posts.post', function ({ response, searchParams }) {
  if (!searchParams.has('content')) {
    sendResponse(response, { status: statusBadRequest });
    return;
  }

  const content = searchParams.get('content');

  const post = {
    id: nextId++,
    content: content,
    created: Date.now(),
    removed: false, // Newly created posts are not removed
  };

  posts.unshift(post);

  sendJSON(response, post);
});

methods.set('/posts.edit', function ({ response, searchParams }) {
  const idString = searchParams.get('id');

  if (!idString || isNaN(Number(idString))) {
    sendResponse(response, { status: statusBadRequest });
    return;
  }

  const id = Number(idString);
  const findPost = posts.find((el) => el.id === id && !el.removed);

  if (findPost) {
    if (searchParams.has('content')) {
      const content = searchParams.get('content');
      findPost.content = content;
      sendJSON(response, findPost);
    } else {
      sendResponse(response, { status: statusBadRequest });
    }
  } else {
    sendResponse(response, { status: statusNotFound });
  }
});

methods.set('/posts.delete', function ({ response, searchParams }) {
  const idString = searchParams.get('id');

  if (!idString || isNaN(Number(idString))) {
    sendResponse(response, { status: statusBadRequest });
    return;
  }

  const id = Number(idString);
  const findPost = posts.find((el) => el.id === id && !el.removed);

  if (findPost) {
    findPost.removed = true; // Mark the post as removed
    sendJSON(response, findPost);
  } else {
    sendResponse(response, { status: statusNotFound });
  }
});

methods.set('/posts.restore', function ({ response, searchParams }) {
  const idString = searchParams.get('id');

  if (!idString || isNaN(Number(idString))) {
    sendResponse(response, { status: statusBadRequest });
    return;
  }

  const id = Number(idString);
  const findPost = posts.find((el) => el.id === id && el.removed);

  if (findPost) {
    findPost.removed = false; // Restore the post
    sendJSON(response, findPost);
  } else if (posts.some((el) => el.id === id && !el.removed)) {
    sendResponse(response, { status: statusBadRequest }); // Attempt to restore an active (non-removed) post
  } else {
    sendResponse(response, { status: statusNotFound }); // Post not found
  }
});


const server = http.createServer(function (request, response) {
  const { pathname, searchParams } = new URL(
    request.url,
    `http://${request.headers.host}`
  );

  const method = methods.get(pathname);
  if (method === undefined) {
    sendResponse(response, { status: statusNotFound });
    return;
  }

  const params = {
    request,
    response,
    pathname,
    searchParams,
  };

  method(params);
});

server.listen(port);
