'use strict';

/** Tarmoqqa chiqmaydigan (faqat havoladan ID ajratadigan) adapterlar. */
module.exports = [
  { id: 'slack', host: 'slack.com', input: 'https://acme.slack.com/archives/C0123ABCD/p1700000000123456', expect: { channel_id: 'C0123ABCD', message_ts: '1700000000.123456' } },
  { id: 'slack', host: 'slack.com', input: 'https://app.slack.com/client/T0ABCDEF1/C0123ABCD', expect: { workspace_id: 'T0ABCDEF1', channel_id: 'C0123ABCD' } },
  { id: 'x', host: 'x.com', input: 'https://x.com/someone/status/1234567890123456789', expect: { post_id: '1234567890123456789' } },
  { id: 'x', host: 'twitter.com', input: 'https://twitter.com/someone/status/1234567890', expect: { post_id: '1234567890' } },
  { id: 'tiktok', host: 'tiktok.com', input: 'https://www.tiktok.com/@user/video/7234567890123456789', expect: { video_id: '7234567890123456789' } },
  { id: 'pinterest', host: 'pinterest.com', input: 'https://www.pinterest.com/pin/123456789012/', expect: { pin_id: '123456789012' } },
  { id: 'facebook', host: 'facebook.com', input: 'https://www.facebook.com/profile.php?id=100012345678901', expect: { profile_id: '100012345678901' } },
  { id: 'facebook', host: 'facebook.com', input: 'https://www.facebook.com/groups/1234567890', expect: { group_id: '1234567890' } },
  { id: 'vimeo', host: 'vimeo.com', input: 'https://vimeo.com/76979871', expect: { video_id: '76979871' } },
  { id: 'googledrive', host: 'drive.google.com', input: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUv/view', expect: { file_id: '1AbCdEfGhIjKlMnOpQrStUv' } },
  { id: 'googledrive', host: 'docs.google.com', input: 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUv/edit', expect: { document_id: '1AbCdEfGhIjKlMnOpQrStUv' } },
  { id: 'googledrive', host: 'drive.google.com', input: 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv', expect: { folder_id: '1AbCdEfGhIjKlMnOpQrStUv' } },
  { id: 'figma', host: 'figma.com', input: 'https://www.figma.com/design/AbCdEfGhIjKlMnOpQrSt/My-File', expect: { file_key: 'AbCdEfGhIjKlMnOpQrSt' } },
  { id: 'notion', host: 'notion.so', input: 'https://www.notion.so/My-Page-0123456789abcdef0123456789abcdef', expect: { page_or_database_id: '01234567-89ab-cdef-0123-456789abcdef' } }
];
