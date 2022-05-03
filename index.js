const gitHubActions = require('@actions/github');
const gitHubActionsCore = require('@actions/core');

console.log(gitHubActions.context);
const getCommentBody = (isBuildSuccessful) => {
  const buildStatus = isBuildSuccessful ? '✅ Ready' : '❌ Failed';
  const buildCommit = gitHubActions.context.payload.after || gitHubActions.context.sha;

  const commentBody = [
    '**The latest updates on your project.**',
    '|App Name|Build Status|Build Version|Build Commit|',
    '|---|---|---|---|',
    `|${process.env.APP_NAME}|${buildStatus}|${process.env.VERSION}|${buildCommit}|`,
  ];

  return commentBody.join('\n');
};

function findCommentPredicate(inputs, comment) {
  return (
    (inputs.commentAuthor && comment.user ? comment.user.login === inputs.commentAuthor : true) &&
    (inputs.bodyIncludes && comment.body
      ? comment.body.includes(inputs.bodyIncludes) && comment.body.includes(process.env.APP_NAME)
      : true)
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
    const requiredComment = comments.find((comment) => findCommentPredicate(inputs, comment));
    if (requiredComment) return requiredComment;
  }
  return undefined;
}

async function getBuildInfo() {
  try {
    const inputs = {
      token: process.env.TOKEN,
      buildStatus: process.env.BUILD_STATUS === 'true',
      issueNumber: process.env.ISSUE_NUMBER || gitHubActions.context.payload.number,
      bodyIncludes: 'The latest updates on your project',
    };

    if (typeof inputs.token === 'undefined' || typeof inputs.buildStatus === 'undefined') {
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

if (gitHubActions.context.eventName === "pull_request") {
  getBuildInfo();
}

