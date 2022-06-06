const gitHubActions = require('@actions/github');
const gitHubActionsCore = require('@actions/core');

const commitSHA = gitHubActions.context.payload.after || gitHubActions.context.sha;

const getCommentBody = (inputs) => {
  const buildStatus = inputs.buildStatus === 'success' ? '✅ Ready' : '❌ Failed';

  const commentBody = [
    `**Build info for your latest commit ${commitSHA}:**`,
    inputs.buildStatus === 'success'
      ? 'Use the build version from below to deploy your code on Spinnaker CD pipeline.'
      : '',
    '|App Name|Build Status|Build Version (Use for Deployment)|Commit|',
    '|---|---|---|---|',
    `|${process.env.APP_NAME}|${buildStatus}|\`${process.env.VERSION}\`|${commitSHA}|`,
    '<!-- BUILD_INFO_COMMENT -->',
  ];

  return commentBody.join('\n');
};

async function getComment(inputs) {
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
    const requiredComment = comments.find(
      (comment) =>
        comment.body.includes('BUILD_INFO_COMMENT') && comment.body.includes(process.env.APP_NAME),
    );
    if (requiredComment) return requiredComment;
  }
  return undefined;
}

async function getBuildInfo() {
  try {
    const inputs = {
      token: process.env.GITHUB_ACCESS_TOKEN,
      buildStatus: process.env.BUILD_STATUS,
    };

    if (typeof inputs.token === 'undefined' || typeof inputs.buildStatus === 'undefined') {
      gitHubActionsCore.setFailed(
        "[universe-pack] Missing either 'GITHUB_ACCESS_TOKEN' or 'BUILD_STATUS'. Make sure to pass them via env.",
      );
      return;
    }

    const octokit = gitHubActions.getOctokit(inputs.token);
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const pulls = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
      owner,
      repo,
      commit_sha: commitSHA,
    });
    if (pulls.data.length === 0) {
      gitHubActionsCore.info(`[universe-pack] No pull requests are associated with this commit.`);
      return;
    } else {
      inputs.issueNumber = pulls.data[pulls.data.length - 1].number;
    }

    const comment = await getComment(inputs);
    if (comment) {
      const commentId = comment.id.toString();
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: commentId,
        body: getCommentBody(inputs),
      });
      gitHubActionsCore.info(`[universe-pack] Updated comment id '${commentId}'.`);
      gitHubActionsCore.setOutput('comment-id', commentId);
    } else {
      const { data: commentData } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: inputs.issueNumber,
        body: getCommentBody(inputs),
      });
      gitHubActionsCore.info(
        `[universe-pack] Created comment id '${commentData.id}' on PR '${inputs.issueNumber}'.`,
      );
      gitHubActionsCore.setOutput('comment-id', commentData.id);
    }
  } catch (error) {
    gitHubActionsCore.setFailed(`[universe-pack] ${error.message}`);
  }
}

getBuildInfo();
