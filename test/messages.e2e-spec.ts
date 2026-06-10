import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

const PASSWORD = 'Test@1234';

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string };
}

async function signUp(
  app: INestApplication<App>,
  suffix: string,
): Promise<AuthResponse> {
  const email = `msg_bb_${suffix}_${Date.now()}@test.local`;
  const res = await request(app.getHttpServer())
    .post('/auth/signup')
    .send({
      firstName: 'Msg',
      lastName: suffix,
      email,
      password: PASSWORD,
      confirmPassword: PASSWORD,
    })
    .expect(201);
  return res.body as AuthResponse;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

describe('Messages — kiểm thử hộp đen (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('TC-MSG-01: Bảo vệ xác thực', () => {
    it('trả 401 khi chưa đăng nhập', async () => {
      await request(app.getHttpServer()).get('/messages/conversations').expect(401);
      await request(app.getHttpServer()).get('/messages/unread-count').expect(401);
      await request(app.getHttpServer())
        .get('/messages/with/00000000-0000-0000-0000-000000000001')
        .expect(401);
      await request(app.getHttpServer()).post('/messages').send({}).expect(401);
    });
  });

  describe('TC-MSG-02: Gửi tin nhắn hợp lệ', () => {
    it('người gửi nhận được tin vừa gửi trong luồng hội thoại', async () => {
      const alice = await signUp(app, 'alice');
      const bob = await signUp(app, 'bob');
      const content = `Xin chào Bob ${Date.now()}`;

      const sent = await request(app.getHttpServer())
        .post('/messages')
        .set(auth(alice.accessToken))
        .send({ receiverId: bob.user.id, content })
        .expect(201);

      expect(sent.body).toMatchObject({
        content,
        isMine: true,
        isRead: false,
        sender: { id: alice.user.id },
      });
      expect(sent.body.id).toBeDefined();
      expect(sent.body.createdAt).toBeDefined();

      const thread = await request(app.getHttpServer())
        .get(`/messages/with/${bob.user.id}`)
        .set(auth(alice.accessToken))
        .expect(200);

      expect(thread.body).toHaveLength(1);
      expect(thread.body[0]).toMatchObject({ content, isMine: true });
    });
  });

  describe('TC-MSG-03: Người nhận thấy tin và đếm chưa đọc', () => {
    it('tăng unread-count và hiển thị trong danh sách hội thoại', async () => {
      const sender = await signUp(app, 'sender');
      const receiver = await signUp(app, 'receiver');
      const content = `Tin chưa đọc ${Date.now()}`;

      await request(app.getHttpServer())
        .post('/messages')
        .set(auth(sender.accessToken))
        .send({ receiverId: receiver.user.id, content })
        .expect(201);

      const unread = await request(app.getHttpServer())
        .get('/messages/unread-count')
        .set(auth(receiver.accessToken))
        .expect(200);
      expect(unread.body.count).toBeGreaterThanOrEqual(1);

      const convs = await request(app.getHttpServer())
        .get('/messages/conversations')
        .set(auth(receiver.accessToken))
        .expect(200);
      const conv = (convs.body as Array<{ partner: { id: string }; lastMessage: { content: string }; unreadCount: number }>).find(
        (c) => c.partner.id === sender.user.id,
      );
      expect(conv).toBeDefined();
      expect(conv!.lastMessage.content).toBe(content);
      expect(conv!.unreadCount).toBeGreaterThanOrEqual(1);

      const thread = await request(app.getHttpServer())
        .get(`/messages/with/${sender.user.id}`)
        .set(auth(receiver.accessToken))
        .expect(200);
      expect(thread.body.some((m: { content: string; isMine: boolean }) => m.content === content && !m.isMine)).toBe(true);
    });
  });

  describe('TC-MSG-04: Đánh dấu đã đọc', () => {
    it('giảm unread-count sau khi mở hội thoại', async () => {
      const a = await signUp(app, 'read_a');
      const b = await signUp(app, 'read_b');

      await request(app.getHttpServer())
        .post('/messages')
        .set(auth(a.accessToken))
        .send({ receiverId: b.user.id, content: `Đọc tôi ${Date.now()}` })
        .expect(201);

      const before = await request(app.getHttpServer())
        .get('/messages/unread-count')
        .set(auth(b.accessToken))
        .expect(200);
      expect(before.body.count).toBeGreaterThanOrEqual(1);

      await request(app.getHttpServer())
        .get(`/messages/with/${a.user.id}`)
        .set(auth(b.accessToken))
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/messages/with/${a.user.id}/read`)
        .set(auth(b.accessToken))
        .send({})
        .expect(200);

      const after = await request(app.getHttpServer())
        .get('/messages/unread-count')
        .set(auth(b.accessToken))
        .expect(200);
      expect(after.body.count).toBeLessThan(before.body.count);
    });
  });

  describe('TC-MSG-05: Lấy thông tin đối tác', () => {
    it('trả profile đối tác hợp lệ', async () => {
      const u1 = await signUp(app, 'p1');
      const u2 = await signUp(app, 'p2');

      const partner = await request(app.getHttpServer())
        .get(`/messages/partner/${u2.user.id}`)
        .set(auth(u1.accessToken))
        .expect(200);

      expect(partner.body).toMatchObject({
        id: u2.user.id,
        email: u2.user.email,
      });
    });
  });

  describe('TC-MSG-06: Ràng buộc nghiệp vụ — gửi cho chính mình', () => {
    it('trả 400 khi receiverId trùng người gửi', async () => {
      const user = await signUp(app, 'self');

      const res = await request(app.getHttpServer())
        .post('/messages')
        .set(auth(user.accessToken))
        .send({ receiverId: user.user.id, content: 'Tự nhắn' })
        .expect(400);

      expect(res.body.message).toMatch(/chính mình/i);
    });
  });

  describe('TC-MSG-07: Ràng buộc nghiệp vụ — nội dung rỗng', () => {
    it('trả 400 khi content trống hoặc chỉ khoảng trắng', async () => {
      const a = await signUp(app, 'empty_a');
      const b = await signUp(app, 'empty_b');

      await request(app.getHttpServer())
        .post('/messages')
        .set(auth(a.accessToken))
        .send({ receiverId: b.user.id, content: '   ' })
        .expect(400);
    });
  });

  describe('TC-MSG-08: Người nhận không tồn tại', () => {
    it('trả 404 khi receiverId không có trong hệ thống', async () => {
      const user = await signUp(app, 'ghost');

      await request(app.getHttpServer())
        .post('/messages')
        .set(auth(user.accessToken))
        .send({
          receiverId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          content: 'Ai đó?',
        })
        .expect(404);
    });
  });

  describe('TC-MSG-09: Đối tác không tồn tại', () => {
    it('trả 404 khi mở thread với userId không hợp lệ', async () => {
      const user = await signUp(app, 'nothread');

      await request(app.getHttpServer())
        .get('/messages/with/00000000-0000-0000-0000-000000000099')
        .set(auth(user.accessToken))
        .expect(404);
    });
  });

  describe('TC-MSG-10: Thứ tự tin nhắn theo thời gian', () => {
    it('thread trả về tin theo thứ tự cũ → mới', async () => {
      const a = await signUp(app, 'order_a');
      const b = await signUp(app, 'order_b');
      const ts = Date.now();

      for (const i of [1, 2, 3]) {
        await request(app.getHttpServer())
          .post('/messages')
          .set(auth(a.accessToken))
          .send({ receiverId: b.user.id, content: `Tin ${i} ${ts}` })
          .expect(201);
      }

      const thread = await request(app.getHttpServer())
        .get(`/messages/with/${b.user.id}`)
        .set(auth(a.accessToken))
        .expect(200);

      const contents = (thread.body as Array<{ content: string }>).map((m) => m.content);
      expect(contents).toEqual([
        `Tin 1 ${ts}`,
        `Tin 2 ${ts}`,
        `Tin 3 ${ts}`,
      ]);
    });
  });

  describe('TC-MSG-11: Danh sách hội thoại — tin mới nhất lên đầu', () => {
    it('cuộc trò chuyện vừa nhắn xuất hiện đầu danh sách', async () => {
      const a = await signUp(app, 'conv_a');
      const b = await signUp(app, 'conv_b');
      const c = await signUp(app, 'conv_c');
      const marker = `Mới nhất ${Date.now()}`;

      await request(app.getHttpServer())
        .post('/messages')
        .set(auth(a.accessToken))
        .send({ receiverId: b.user.id, content: 'Cũ hơn' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/messages')
        .set(auth(a.accessToken))
        .send({ receiverId: c.user.id, content: marker })
        .expect(201);

      const convs = await request(app.getHttpServer())
        .get('/messages/conversations')
        .set(auth(a.accessToken))
        .expect(200);

      expect(convs.body[0].partner.id).toBe(c.user.id);
      expect(convs.body[0].lastMessage.content).toBe(marker);
    });
  });

  describe('TC-MSG-12: Phân trang thread (limit)', () => {
    it('chỉ trả tối đa số lượng tin theo limit', async () => {
      const a = await signUp(app, 'limit_a');
      const b = await signUp(app, 'limit_b');

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/messages')
          .set(auth(a.accessToken))
          .send({ receiverId: b.user.id, content: `Bulk ${i}` })
          .expect(201);
      }

      const limited = await request(app.getHttpServer())
        .get(`/messages/with/${b.user.id}?limit=2`)
        .set(auth(a.accessToken))
        .expect(200);

      expect(limited.body).toHaveLength(2);
      expect(limited.body[0].content).toBe('Bulk 3');
      expect(limited.body[1].content).toBe('Bulk 4');
    });
  });

  describe('TC-MSG-13: Thông báo MESSAGE khi nhận tin', () => {
    it('tạo notification loại MESSAGE cho người nhận', async () => {
      const a = await signUp(app, 'notif_a');
      const b = await signUp(app, 'notif_b');
      const content = `Kèm thông báo ${Date.now()}`;

      await request(app.getHttpServer())
        .post('/messages')
        .set(auth(a.accessToken))
        .send({ receiverId: b.user.id, content })
        .expect(201);

      const notifs = await request(app.getHttpServer())
        .get('/notifications?limit=10')
        .set(auth(b.accessToken))
        .expect(200);

      const msgNotif = (notifs.body as Array<{ type: string; actor: { id: string } }>).find(
        (n) => n.type === 'MESSAGE' && n.actor.id === a.user.id,
      );
      expect(msgNotif).toBeDefined();
    });
  });
});
