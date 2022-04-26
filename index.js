const gitHubActions = require('@actions/github');

const context = gitHubActions.context;
console.log(context);
console.log(context.payload.pull_request?.base);
console.log("commits",context.payload.commits);
