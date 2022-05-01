const gitHubActions = require('@actions/github');
const gitHubActionsCore = require('@actions/core');

console.log(process.env);

const getCommentBody = (isBuildSuccessful) => {
  const buildStatus = isBuildSuccessful ? '✅ Ready' : '❌ Failed';

  return `**The latest updates on your project.**
    |App Name|Build Status|Build Version|Build Commit|
    |---|---|---|---|
    |\${{env.APP_NAME}}|${buildStatus}|\${{env.VERSION}}|\${{ github.event.pull_request.head.sha }}|`;
};

function findCommentPredicate(inputs, comment) {
  return (
    (inputs.commentAuthor && comment.user ? comment.user.login === inputs.commentAuthor : true) &&
    (inputs.bodyIncludes && comment.body ? comment.body.includes(inputs.bodyIncludes) : true)
  );
}

async function findComment(inputs) {
  const octokit = gitHubActions.getOctokit(inputs.token);
  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

  const parameters = {
    owner,
    repo,
    issue_number: inputs.issueNumber,
  };

  for await (const { data: comments } of octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    parameters,
  )) {
    // Search each page for the comment
    const comment = comments.find((comment) => findCommentPredicate(inputs, comment));
    if (comment) return comment;
  }
  return undefined;
}

async function getBuildInfo() {
  try {
    const inputs = {
      token: process.env.ti,
      buildStatus: process.env.BUILD_STATUS,
      issueNumber: process.env.ISSUE_NUMBER,
    };

    if (!(inputs.token && inputs.buildStatus)) {
      gitHubActionsCore.setFailed("Missing either 'TOKEN' or 'BUILD_STATUS'.");
      return;
    }
    const comment = await findComment(inputs);
    const octokit = gitHubActions.getOctokit(inputs.token);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');

    if (comment) {
      const commentId = comment.id.toString();
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: commentId,
        body: getCommentBody(inputs.buildStatus),
      });
      gitHubActionsCore.info(`Updated comment id '${commentId}'.`);
      gitHubActionsCore.setOutput('comment-id', commentId);
    } else {
      const { data: commentData } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: inputs.issueNumber,
        body: getCommentBody(inputs.buildStatus),
      });
      gitHubActionsCore.info(
        `Created comment id '${commentData.id}' on issue '${inputs.issueNumber}'.`,
      );
      gitHubActionsCore.setOutput('comment-id', commentData.id);
    }
  } catch (error) {
    gitHubActionsCore.setFailed(error.message);
  }
}

getBuildInfo();
