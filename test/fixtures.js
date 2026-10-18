'use strict';

/**
 * Har bir tarmoq adapteri uchun mock fixture:
 *   input   — foydalanuvchi yuboradigan matn (asosiy "to'g'ri ommaviy URL" holati)
 *   routes  — mock javoblar
 *   expect  — kutilgan ID'lar { type: value }
 *   text    — (ixtiyoriy) username/platforma-matn orqali qidirish holati
 *   env     — (ixtiyoriy) kerakli muhit o'zgaruvchilari
 *   host    — "noto'g'ri yo'l" testi uchun host
 */
const J = 200;
module.exports = [
  { id: 'github', host: 'github.com', input: 'https://github.com/octo/hello',
    routes: [[/api\.github\.com\/repos\/octo\/hello$/, J, { id: 111, node_id: 'R_kg', full_name: 'octo/hello', html_url: 'https://github.com/octo/hello', owner: { id: 7, login: 'octo', type: 'User' } }]],
    expect: { repository_id: '111', user_id: '7', node_id: 'R_kg' },
    text: { input: 'github octocat', routes: [[/api\.github\.com\/users\/octocat$/, J, { id: 1, node_id: 'U_k', login: 'octocat', type: 'User' }]], expect: { user_id: '1' } },
    extra: [
      { name: 'organization', input: 'https://github.com/acme', routes: [[/\/users\/acme$/, J, { id: 55, node_id: 'O_k', login: 'acme', type: 'Organization' }]], expect: { organization_id: '55' } },
      { name: 'issue', input: 'https://github.com/octo/hello/issues/3', routes: [[/\/issues\/3$/, J, { id: 9001, number: 3, title: 'bug', html_url: 'https://github.com/octo/hello/issues/3' }]], expect: { issue_id: '9001', number: '3' } },
      { name: 'pull request', input: 'https://github.com/octo/hello/pull/4', routes: [[/\/pulls\/4$/, J, { id: 9002, number: 4, title: 'pr', html_url: 'https://github.com/octo/hello/pull/4' }]], expect: { pull_request_id: '9002' } }
    ] },
  { id: 'gitlab', host: 'gitlab.com', input: 'https://gitlab.com/grp/proj',
    routes: [[/\/projects\/grp%2Fproj$/, J, { id: 42, path_with_namespace: 'grp/proj', namespace: { id: 9, full_path: 'grp' }, web_url: 'https://gitlab.com/grp/proj' }]],
    expect: { project_id: '42', namespace_id: '9' },
    text: { input: 'gitlab alice', routes: [[/\/users\?username=alice$/, J, [{ id: 5, username: 'alice', name: 'Alice', web_url: 'https://gitlab.com/alice' }]]], expect: { user_id: '5' } },
    extra: [
      { name: 'subgroup (project 404 → group)', input: 'https://gitlab.com/grp/sub', routes: [[/\/projects\//, 404, {}], [/\/groups\/grp%2Fsub$/, J, { id: 12, name: 'sub', full_path: 'grp/sub', web_url: 'https://gitlab.com/groups/grp/sub' }]], expect: { group_id: '12' } },
      { name: 'issue', input: 'https://gitlab.com/grp/proj/-/issues/8', routes: [[/\/issues\/8$/, J, { id: 800, iid: 8, project_id: 42, title: 't', web_url: 'https://gitlab.com/grp/proj/-/issues/8' }]], expect: { issue_id: '800', issue_iid: '8', project_id: '42' } }
    ] },
  { id: 'gitea', host: 'codeberg.org', input: 'https://codeberg.org/u/r',
    routes: [[/codeberg\.org\/api\/v1\/repos\/u\/r$/, J, { id: 77, full_name: 'u/r', html_url: 'https://codeberg.org/u/r', owner: { id: 3, login: 'u' } }]],
    expect: { repository_id: '77', user_id: '3' },
    text: { input: 'codeberg someone', routes: [[/\/users\/someone$/, J, { id: 31, login: 'someone', html_url: 'https://codeberg.org/someone' }]], expect: { user_id: '31' } } },
  { id: 'bitbucket', host: 'bitbucket.org', input: 'https://bitbucket.org/ws/repo',
    routes: [[/repositories\/ws\/repo$/, J, { uuid: '{r-uuid}', full_name: 'ws/repo', workspace: { uuid: '{w-uuid}' }, links: { html: { href: 'https://bitbucket.org/ws/repo' } } }]],
    expect: { repository_id: '{r-uuid}', workspace_id: '{w-uuid}' },
    text: { input: 'bitbucket ws', routes: [[/workspaces\/ws$/, J, { uuid: '{w-uuid}', slug: 'ws', name: 'WS' }]], expect: { workspace_id: '{w-uuid}' } } },
  { id: 'npm', host: 'npmjs.com', input: 'https://www.npmjs.com/package/express', status: 'partial',
    routes: [[/registry\.npmjs\.org\/express$/, J, { name: 'express' }]], expect: { package_name: 'express' },
    text: { input: 'npm @scope/pkg', routes: [[/registry\.npmjs\.org\/@scope%2Fpkg$/, J, { name: '@scope/pkg' }]], expect: { package_name: '@scope/pkg' } } },
  { id: 'pypi', host: 'pypi.org', input: 'https://pypi.org/project/Requests_Lib/', status: 'partial',
    routes: [[/pypi\.org\/pypi\/Requests_Lib\/json$/, J, { info: { name: 'Requests_Lib' } }]], expect: { package_name: 'requests-lib' } },
  { id: 'dockerhub', host: 'hub.docker.com', input: 'https://hub.docker.com/r/acme/app', status: 'partial',
    routes: [[/repositories\/acme\/app\/$/, J, { name: 'app' }], [/\/users\/acme\/$/, J, { id: 'abc123', username: 'acme' }]],
    expect: { user_id: 'abc123' },
    extra: [{ name: 'organization namespace', input: 'https://hub.docker.com/orgs/acmeorg', routes: [[/\/users\/acmeorg\/$/, 404, {}], [/\/orgs\/acmeorg\/$/, J, { id: 'org789' }]], expect: { organization_id: 'org789' } }] },
  { id: 'huggingface', host: 'huggingface.co', input: 'https://huggingface.co/acme/model',
    routes: [[/api\/models\/acme\/model$/, J, { id: 'acme/model', _id: '65aa', author: 'acme' }]], expect: { model_id: 'acme/model', internal_id: '65aa' },
    extra: [{ name: 'dataset', input: 'https://huggingface.co/datasets/acme/data', routes: [[/api\/datasets\/acme\/data$/, J, { id: 'acme/data', _id: '66bb' }]], expect: { dataset_id: 'acme/data' } }] },
  { id: 'hackernews', host: 'news.ycombinator.com', input: 'https://news.ycombinator.com/item?id=8863',
    routes: [[/item\/8863\.json$/, J, { id: 8863, type: 'story', title: 'My YC app', by: 'dhouston' }]], expect: { item_id: '8863' },
    extra: [{ name: 'user', input: 'https://news.ycombinator.com/user?id=jl', routes: [[/user\/jl\.json$/, J, { id: 'jl', created: 1 }]], expect: { user_id: 'jl' }, status: 'partial' }] },
  { id: 'stackoverflow', host: 'stackoverflow.com', input: 'https://stackoverflow.com/questions/123/foo',
    routes: [[/questions\/123\?site=stackoverflow$/, J, { items: [{ question_id: 123, title: 'foo', link: 'https://stackoverflow.com/q/123', owner: { user_id: 5, display_name: 'bob' } }] }]],
    expect: { question_id: '123', user_id: '5' },
    extra: [{ name: 'user', input: 'https://stackoverflow.com/users/22656/jon-skeet', routes: [[/users\/22656\?/, J, { items: [{ user_id: 22656, account_id: 11683, display_name: 'Jon Skeet', link: 'https://stackoverflow.com/users/22656' }] }]], expect: { user_id: '22656', account_id: '11683' } }] },
  { id: 'stackexchange', host: 'math.stackexchange.com', input: 'https://math.stackexchange.com/users/5/bob',
    routes: [[/users\/5\?site=math$/, J, { items: [{ user_id: 5, display_name: 'bob', link: 'https://math.stackexchange.com/users/5' }] }]], expect: { user_id: '5' } },
  { id: 'devto', host: 'dev.to', input: 'https://dev.to/alice',
    routes: [[/by_username\?url=alice$/, J, { id: 99, username: 'alice', name: 'Alice' }]], expect: { user_id: '99' },
    text: { input: 'devto alice', routes: [[/by_username\?url=alice$/, J, { id: 99, username: 'alice', name: 'Alice' }]], expect: { user_id: '99' } },
    extra: [{ name: 'article', input: 'https://dev.to/alice/my-post-1abc', routes: [[/api\/articles\/alice\/my-post-1abc$/, J, { id: 4242, title: 'T', url: 'https://dev.to/alice/my-post-1abc', user: { username: 'alice', user_id: 99 } }]], expect: { article_id: '4242', user_id: '99' } }] },
  { id: 'hashnode', host: 'hashnode.com', input: 'https://hashnode.com/@alice',
    routes: [[/gql\.hashnode\.com/, J, { data: { user: { id: 'u1', username: 'alice', name: 'Alice' } } }]], expect: { user_id: 'u1' },
    extra: [{ name: 'publication', input: 'https://blog.hashnode.dev', routes: [[/gql\.hashnode\.com/, J, { data: { publication: { id: 'p1', title: 'Blog' } } }]], expect: { publication_id: 'p1' } }] },
  { id: 'dailymotion', host: 'dailymotion.com', input: 'https://www.dailymotion.com/video/x8abc', status: 'ok',
    routes: [[/api\.dailymotion\.com\/video\/x8abc/, J, { id: 'x8abc', title: 'T', owner: 'x1own' }]], expect: { video_id: 'x8abc', user_id: 'x1own' } },
  { id: 'bluesky', host: 'bsky.app', input: 'https://bsky.app/profile/alice.bsky.social',
    routes: [[/getProfile\?actor=alice\.bsky\.social$/, J, { did: 'did:plc:abc123', handle: 'alice.bsky.social', displayName: 'Alice' }]], expect: { did: 'did:plc:abc123' },
    text: { input: 'bsky @alice.bsky.social', routes: [[/getProfile/, J, { did: 'did:plc:abc123', handle: 'alice.bsky.social' }]], expect: { did: 'did:plc:abc123' } },
    extra: [{ name: 'post', input: 'https://bsky.app/profile/alice.bsky.social/post/3kabcdefghij2',
      routes: [[/getProfile/, J, { did: 'did:plc:abc123', handle: 'alice.bsky.social' }], [/getPosts/, J, { posts: [{ uri: 'at://did:plc:abc123/app.bsky.feed.post/3kabcdefghij2', cid: 'bafyxyz' }] }]],
      expect: { post_uri: 'at://did:plc:abc123/app.bsky.feed.post/3kabcdefghij2', post_cid: 'bafyxyz' } }] },
  { id: 'mastodon', host: 'mastodon.social', input: 'https://mastodon.social/@alice', status: 'partial',
    routes: [[/mastodon\.social\/api\/v1\/accounts\/lookup\?acct=alice$/, J, { id: '1234', acct: 'alice', username: 'alice', url: 'https://mastodon.social/@alice' }]], expect: { account_id: '1234' } },
  { id: 'reddit', host: 'reddit.com', input: 'https://www.reddit.com/r/test',
    routes: [[/www\.reddit\.com\/r\/test\/about\.json$/, J, { data: { id: '2qh23', name: 't5_2qh23', display_name: 'test', display_name_prefixed: 'r/test' } }]], expect: { subreddit_id: '2qh23', fullname: 't5_2qh23' },
    status: 'ok',
    extra: [{ name: 'user', input: 'https://www.reddit.com/user/spez', routes: [[/user\/spez\/about\.json$/, J, { data: { id: '1w72', name: 'spez' } }]], expect: { user_id: '1w72' } }] },
  { id: 'youtube', host: 'youtube.com', env: { YOUTUBE_API_KEY: 'test-key' }, input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    routes: [[/googleapis\.com\/youtube\/v3\/videos\?/, J, { items: [{ id: 'dQw4w9WgXcQ', snippet: { title: 'T', channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw', channelTitle: 'Chan' } }] }]],
    expect: { video_id: 'dQw4w9WgXcQ', channel_id: 'UCuAXFkgsw1L7xaCfnd5JJOw' },
    extra: [{ name: 'handle', input: 'https://www.youtube.com/@somehandle', routes: [[/channels\?.*forHandle=%40somehandle/, J, { items: [{ id: 'UCuAXFkgsw1L7xaCfnd5JJOw', snippet: { title: 'S', customUrl: '@somehandle' } }] }]], expect: { channel_id: 'UCuAXFkgsw1L7xaCfnd5JJOw' } }] },
  { id: 'discord', host: 'discord.com', input: 'https://discord.gg/abcDEF', status: 'ok',
    routes: [[/discord\.com\/api\/v10\/invites\/abcDEF\?/, J, { code: 'abcDEF', guild: { id: '111111111111111111', name: 'G' }, channel: { id: '222222222222222222' }, approximate_member_count: 10 }]],
    expect: { server_id: '111111111111111111', channel_id: '222222222222222222' } },
  { id: 'twitch', host: 'twitch.tv', env: { TWITCH_CLIENT_ID: 'cid', TWITCH_CLIENT_SECRET: 'csecret' }, input: 'https://www.twitch.tv/TwitchDev', status: 'ok',
    routes: [[/id\.twitch\.tv\/oauth2\/token/, J, { access_token: 'tok', expires_in: 3600 }], [/helix\/users\?login=twitchdev$/, J, { data: [{ id: '141981764', login: 'twitchdev', display_name: 'TwitchDev' }] }]],
    expect: { user_id: '141981764' } },
  { id: 'matrix', host: 'matrix.to', input: 'https://matrix.to/#/%23room:matrix.org', status: 'ok',
    routes: [[/matrix\.org\/_matrix\/client\/v3\/directory\/room\/%23room%3Amatrix\.org$/, J, { room_id: '!abc:matrix.org', servers: ['matrix.org'] }]],
    expect: { room_id: '!abc:matrix.org' },
    text: { input: '#room:matrix.org', routes: [[/directory\/room/, J, { room_id: '!abc:matrix.org' }]], expect: { room_id: '!abc:matrix.org' } } }
];
