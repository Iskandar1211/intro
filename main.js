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
  sendJSON(response, posts);
});
methods.set('/posts.getById', function ({ response, searchParams }) {
  const idString = searchParams.get('id');

  if (!idString || isNaN(Number(idString))) {
    sendResponse(response, { status: statusBadRequest });
    return;
  }

  const id = Number(idString);
  const findPost = posts.find((el) => el.id === id);

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
  };

  posts.unshift(post);

  sendJSON(response, post);
});
methods.set('/posts.edit/:id', function ({ response, searchParams }) {
  const idString = searchParams.get('id');

  if (!idString || isNaN(Number(idString))) {
    sendResponse(response, { status: statusBadRequest });
    return;
  }

  const id = Number(idString);
  const findIndex = posts.findIndex((el) => el.id === id);

  if (findIndex !== -1) {
    if (searchParams.has('content')) {
      const content = searchParams.get('content');
      posts[findIndex].content = content;
      sendJSON(response, posts[findIndex]);
    } else {
      sendResponse(response, { status: statusBadRequest });
    }
  } else {
    sendResponse(response, { status: statusNotFound });
  }
});

methods.set('/posts.delete/:id', function ({ response, searchParams }) {
  const idString = searchParams.get('id');

  if (!idString || isNaN(Number(idString))) {
    sendResponse(response, { status: statusBadRequest });
    return;
  }

  const id = Number(idString);
  const findIndex = posts.findIndex((el) => el.id === id);

  if (findIndex !== -1) {
    const deletedPost = posts.splice(findIndex, 1);
    sendJSON(response, deletedPost[0]);
  } else {
    sendResponse(response, { status: statusNotFound });
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
