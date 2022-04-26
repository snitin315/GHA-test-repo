const gitHubActions = require('@actions/github');

const context = gitHubActions.context;
console.log(context);
console.log(context.payload.commits);
