import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(to: string, otp: string): Promise<void> {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      // Dev mode: print OTP to console instead of sending email
      this.logger.warn('─────────────────────────────────────────');
      this.logger.warn(`[DEV MODE] OTP for ${to}: ${otp}`);
      this.logger.warn('SMTP chưa cấu hình → xem OTP trong log này');
      this.logger.warn('─────────────────────────────────────────');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"FeedMe ⚡" <${smtpUser}>`,
      to,
      subject: 'Mã OTP đặt lại mật khẩu FeedMe',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto;
                    background: #0f0f0f; color: white; border-radius: 16px; padding: 40px;">
          <h1 style="color: white; font-size: 24px; margin-bottom: 8px;">⚡ FeedMe</h1>
          <h2 style="color: #e2e8f0; font-size: 18px; margin-bottom: 24px;">
            Đặt lại mật khẩu
          </h2>
          <p style="color: #94a3b8; margin-bottom: 24px; line-height: 1.6;">
            Bạn vừa yêu cầu đặt lại mật khẩu. Nhập mã OTP dưới đây vào trang web.
            Mã có hiệu lực trong <strong style="color: white;">10 phút</strong>.
          </p>
          <div style="background: #1a1a1a; border-radius: 12px; padding: 24px;
                      text-align: center; margin-bottom: 24px;">
            <p style="color: #8e8e8e; font-size: 13px; margin-bottom: 8px;">Mã OTP của bạn</p>
            <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px;
                         color: #2563eb;">${otp}</span>
          </div>
          <p style="color: #555; font-size: 12px; line-height: 1.5;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
            Tài khoản của bạn vẫn an toàn.
          </p>
        </div>
      `,
    });

    this.logger.log(`OTP email sent to ${to}`);
  }
}
