import { EmailService } from '../src/email/email.service';
import { ConfigService } from '@nestjs/config';

async function testEmail() {
  const config = new ConfigService();
  const emailService = new EmailService(config);
  
  try {
    console.log('Testing email service...');
    await emailService.sendTestEmail('rezaazhar.p@gmail.com');
    console.log('✅ Email sent successfully!');
  } catch (error: any) {
    console.error('❌ Email failed:', error.message);
  }
}

testEmail();
