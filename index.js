const gitHubActions = require('@actions/github');

const context = gitHubActions.context;
console.log(context.payload.pull_request.head);
