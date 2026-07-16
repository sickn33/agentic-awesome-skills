const assert = require('node:assert');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const {
  selectLatestTrustedReviewComment,
} = require(path.join(repoRoot, 'tools', 'scripts', 'apply_skill_optimization.cjs'));

const trustedMaintainerComment = {
  body: '## Tessl Skill Review\ntrusted maintainer content',
  author_association: 'MEMBER',
  user: { login: 'maintainer-user', type: 'User' },
};

const spoofedUserComment = {
  body: '## Tessl Skill Review\nspoofed content',
  author_association: 'NONE',
  user: { login: 'random-user', type: 'User' },
};

const trustedBotComment = {
  body: '## Tessl Skill Review\nbot content',
  author_association: 'NONE',
  user: { login: 'github-actions[bot]', type: 'Bot' },
};

assert.strictEqual(
  selectLatestTrustedReviewComment([trustedMaintainerComment, spoofedUserComment]),
  trustedMaintainerComment,
  'the apply script must ignore later untrusted review comments',
);

assert.strictEqual(
  selectLatestTrustedReviewComment([spoofedUserComment, trustedBotComment]),
  trustedBotComment,
  'the apply script should accept review comments from the configured trusted bot',
);

assert.strictEqual(
  selectLatestTrustedReviewComment([spoofedUserComment]),
  null,
  'the apply script must reject untrusted review comments entirely',
);
