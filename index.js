const gitHubActions = require('@actions/github');

const context = gitHubActions.context;
console.log("event", context.eventName);
console.log(context);
console.log(context.payload.pull_request?.base);
console.log("commits",context.payload.commits);
console.log("refff",context.payload.ref);
