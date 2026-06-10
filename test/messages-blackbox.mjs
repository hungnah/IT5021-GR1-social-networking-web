/**
 * Kiểm thử hộp đen chức năng Tin nhắn — gọi API thật, không phụ thuộc implementation nội bộ.
 * Chạy: node test/messages-blackbox.mjs
 */
const BASE = process.env.API_BASE || 'http://localhost:3000';
const PASSWORD = 'Test@1234';

const results = [];

function record(id, name, pass, detail = '') {
  results.push({ id, name, pass, detail });
  const icon = pass ? '✓' : '✗';
  console.log(`${icon} ${id}: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function signUp(suffix) {
  const email = `bb_msg_${suffix}_${Date.now()}@test.local`;
  const res = await req('POST', '/auth/signup', {
    body: {
      firstName: 'BB',
      lastName: suffix,
      email,
      password: PASSWORD,
      confirmPassword: PASSWORD,
    },
  });
  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Signup failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return { token: res.data.accessToken, user: res.data.user };
}

async function run() {
  console.log(`\n=== Kiểm thử hộp đen Tin nhắn @ ${BASE} ===\n`);

  // TC-MSG-01
  {
    const r1 = await req('GET', '/messages/conversations');
    const r2 = await req('POST', '/messages', { body: { receiverId: 'x', content: 'hi' } });
    record(
      'TC-MSG-01',
      'Yêu cầu đăng nhập (401 khi không có token)',
      r1.status === 401 && r2.status === 401,
      `conversations=${r1.status}, send=${r2.status}`,
    );
  }

  let alice, bob;
  try {
    alice = await signUp('alice');
    bob = await signUp('bob');
  } catch (e) {
    console.error('Không tạo được tài khoản test:', e.message);
    process.exit(1);
  }

  // TC-MSG-02
  {
    const content = `Hello ${Date.now()}`;
    const sent = await req('POST', '/messages', {
      token: alice.token,
      body: { receiverId: bob.user.id, content },
    });
    const thread = await req('GET', `/messages/with/${bob.user.id}`, { token: alice.token });
    const ok =
      sent.status === 201 &&
      sent.data?.content === content &&
      sent.data?.isMine === true &&
      Array.isArray(thread.data) &&
      thread.data.some((m) => m.content === content);
    record('TC-MSG-02', 'Gửi tin nhắn hợp lệ', ok, `status=${sent.status}`);
  }

  // TC-MSG-03
  {
    const content = `Unread ${Date.now()}`;
    await req('POST', '/messages', {
      token: alice.token,
      body: { receiverId: bob.user.id, content },
    });
    const unread = await req('GET', '/messages/unread-count', { token: bob.token });
    const convs = await req('GET', '/messages/conversations', { token: bob.token });
    const conv = Array.isArray(convs.data)
      ? convs.data.find((c) => c.partner?.id === alice.user.id)
      : null;
    const ok =
      unread.data?.count >= 1 &&
      conv &&
      conv.lastMessage?.content === content &&
      conv.unreadCount >= 1;
    record('TC-MSG-03', 'Người nhận thấy tin & đếm chưa đọc', ok, `unread=${unread.data?.count}`);
  }

  // TC-MSG-04
  {
    const before = await req('GET', '/messages/unread-count', { token: bob.token });
    await req('PATCH', `/messages/with/${alice.user.id}/read`, { token: bob.token, body: {} });
    const after = await req('GET', '/messages/unread-count', { token: bob.token });
    record(
      'TC-MSG-04',
      'Đánh dấu đã đọc giảm unread-count',
      after.data?.count < before.data?.count,
      `${before.data?.count} → ${after.data?.count}`,
    );
  }

  // TC-MSG-05
  {
    const partner = await req('GET', `/messages/partner/${bob.user.id}`, { token: alice.token });
    record(
      'TC-MSG-05',
      'Lấy thông tin đối tác chat',
      partner.status === 200 && partner.data?.id === bob.user.id,
      `status=${partner.status}`,
    );
  }

  // TC-MSG-06
  {
    const res = await req('POST', '/messages', {
      token: alice.token,
      body: { receiverId: alice.user.id, content: 'self' },
    });
    const msg = Array.isArray(res.data?.message) ? res.data.message.join(' ') : res.data?.message;
    record(
      'TC-MSG-06',
      'Không gửi tin cho chính mình (400)',
      res.status === 400 && /chính mình/i.test(String(msg)),
      `status=${res.status}`,
    );
  }

  // TC-MSG-07
  {
    const res = await req('POST', '/messages', {
      token: alice.token,
      body: { receiverId: bob.user.id, content: '   ' },
    });
    record('TC-MSG-07', 'Từ chối nội dung rỗng (400)', res.status === 400, `status=${res.status}`);
  }

  // TC-MSG-08
  {
    const res = await req('POST', '/messages', {
      token: alice.token,
      body: {
        receiverId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        content: 'ghost',
      },
    });
    record('TC-MSG-08', 'Người nhận không tồn tại (404)', res.status === 404, `status=${res.status}`);
  }

  // TC-MSG-09
  {
    const res = await req('GET', '/messages/with/00000000-0000-0000-0000-000000000099', {
      token: alice.token,
    });
    record('TC-MSG-09', 'Thread với user không tồn tại (404)', res.status === 404, `status=${res.status}`);
  }

  // TC-MSG-10
  {
    const ts = Date.now();
    for (const i of [1, 2, 3]) {
      await req('POST', '/messages', {
        token: alice.token,
        body: { receiverId: bob.user.id, content: `Order${i}_${ts}` },
      });
    }
    const thread = await req('GET', `/messages/with/${bob.user.id}`, { token: alice.token });
    const contents = Array.isArray(thread.data) ? thread.data.map((m) => m.content) : [];
    const expected = [`Order1_${ts}`, `Order2_${ts}`, `Order3_${ts}`];
    const slice = contents.slice(-3);
    record(
      'TC-MSG-10',
      'Tin nhắn sắp xếp cũ → mới',
      JSON.stringify(slice) === JSON.stringify(expected),
      slice.join(' | '),
    );
  }

  // TC-MSG-11
  {
    const charlie = await signUp('charlie');
    const marker = `Latest ${Date.now()}`;
    await req('POST', '/messages', { token: alice.token, body: { receiverId: bob.user.id, content: 'older' } });
    await req('POST', '/messages', {
      token: alice.token,
      body: { receiverId: charlie.user.id, content: marker },
    });
    const convs = await req('GET', '/messages/conversations', { token: alice.token });
    const first = Array.isArray(convs.data) ? convs.data[0] : null;
    record(
      'TC-MSG-11',
      'Hội thoại mới nhất lên đầu danh sách',
      first?.partner?.id === charlie.user.id && first?.lastMessage?.content === marker,
      first?.lastMessage?.content,
    );
  }

  // TC-MSG-12
  {
    const dave = await signUp('dave');
    for (let i = 0; i < 5; i++) {
      await req('POST', '/messages', {
        token: alice.token,
        body: { receiverId: dave.user.id, content: `Bulk${i}` },
      });
    }
    const limited = await req('GET', `/messages/with/${dave.user.id}?limit=2`, { token: alice.token });
    const ok =
      Array.isArray(limited.data) &&
      limited.data.length === 2 &&
      limited.data[0]?.content === 'Bulk3' &&
      limited.data[1]?.content === 'Bulk4';
    record('TC-MSG-12', 'Phân trang thread (limit=2)', ok, limited.data?.map((m) => m.content).join(', '));
  }

  // TC-MSG-13
  {
    const eve = await signUp('eve');
    const content = `Notif ${Date.now()}`;
    await req('POST', '/messages', {
      token: alice.token,
      body: { receiverId: eve.user.id, content },
    });
    const notifs = await req('GET', '/notifications?limit=20', { token: eve.token });
    const found = Array.isArray(notifs.data)
      ? notifs.data.some((n) => n.type === 'MESSAGE' && n.actor?.id === alice.user.id)
      : false;
    record('TC-MSG-13', 'Tạo thông báo MESSAGE cho người nhận', found);
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n=== Kết quả: ${passed}/${results.length} PASS, ${failed} FAIL ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
