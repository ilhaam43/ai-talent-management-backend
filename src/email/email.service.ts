import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { google } from 'googleapis';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Create Gmail transporter
   * Uses App Password if GMAIL_APP_PASSWORD is set, otherwise OAuth2
   */
  private async createTransporter() {
    const appPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');
    const fromEmail = this.configService.get<string>('GMAIL_FROM_EMAIL');

    // Use App Password method (simpler, more reliable)
    if (appPassword) {
      this.logger.log('Using Gmail App Password authentication');
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: fromEmail,
          pass: appPassword,
        },
      });

      return transporter;
    }

    // Fallback to OAuth2 method
    this.logger.log('Using Gmail OAuth2 authentication');
    
    const OAuth2 = google.auth.OAuth2;

    const oauth2Client = new OAuth2(
      this.configService.get<string>('GMAIL_CLIENT_ID'),
      this.configService.get<string>('GMAIL_CLIENT_SECRET'),
      'https://developers.google.com/oauthplayground',
    );

    oauth2Client.setCredentials({
      refresh_token: this.configService.get<string>('GMAIL_REFRESH_TOKEN'),
    });

    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: fromEmail,
        clientId: this.configService.get<string>('GMAIL_CLIENT_ID'),
        clientSecret: this.configService.get<string>('GMAIL_CLIENT_SECRET'),
        refreshToken: this.configService.get<string>('GMAIL_REFRESH_TOKEN'),
        accessToken: accessToken.token || '',
      },
    } as any);

    return transporter;
  }

  /**
   * Send password setup email to talent pool candidate
   */
  async sendPasswordSetupEmail(
    toEmail: string,
    candidateName: string,
    resetToken: string,
  ): Promise<void> {
    try {
      const transporter = await this.createTransporter();
      
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const resetLink = `${frontendUrl}/set-password?token=${resetToken}`;

      const fromEmail = this.configService.get<string>('GMAIL_FROM_EMAIL');
      const fromName = this.configService.get<string>('GMAIL_FROM_NAME') || 'AI Talent Management';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: 'Set Your Password - AI Talent Management',
        html: this.getPasswordSetupTemplate(candidateName, resetLink),
      };

      const result = await transporter.sendMail(mailOptions);
      
      this.logger.log(`Password setup email sent to ${toEmail} (Message ID: ${result.messageId})`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${toEmail}: ${error.message}`);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Password setup email template
   */
  private getPasswordSetupTemplate(candidateName: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Set Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Welcome to AI Talent Management</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Hello ${candidateName},</h2>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                We're excited to inform you that you've been selected to proceed in our recruitment process! 🎉
              </p>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                To get started, please set up your password by clicking the button below. This will allow you to access your candidate dashboard where you can:
              </p>
              
              <ul style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.8;">
                <li>View your job applications</li>
                <li>Complete your profile</li>
                <li>Upload required documents</li>
                <li>Track your recruitment progress</li>
              </ul>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                      Set Your Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Important:</strong> This link will expire in 24 hours. Please set your password soon.
                </p>
              </div>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                If you didn't expect this email or have any questions, please contact our HR team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #999999; font-size: 14px;">
                © 2026 AI Talent Management. All rights reserved.
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated email. Please do not reply to this message.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Test email sending (for development)
   */
  async sendTestEmail(toEmail: string): Promise<void> {
    await this.sendPasswordSetupEmail(toEmail, 'Test User', 'test-token-123');
  }

  /**
   * Send pipeline update email to candidate (qualified/moving to next stage)
   */
  async sendPipelineUpdateEmail(
    toEmail: string,
    candidateName: string,
    jobTitle: string,
    newStage: string,
    stageLink?: string,
    scheduledDate?: Date,
    notes?: string,
  ): Promise<void> {
    try {
      const transporter = await this.createTransporter();
      
      const fromEmail = this.configService.get<string>('GMAIL_FROM_EMAIL');
      const fromName = this.configService.get<string>('GMAIL_FROM_NAME') || 'AI Talent Management';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: `🎉 Great News! You're moving to ${newStage} - ${jobTitle}`,
        html: this.getPipelineUpdateTemplate(candidateName, jobTitle, newStage, stageLink, scheduledDate, notes),
      };

      const result = await transporter.sendMail(mailOptions);
      
      this.logger.log(`Pipeline update email sent to ${toEmail} (Message ID: ${result.messageId})`);
    } catch (error: any) {
      this.logger.error(`Failed to send pipeline update email to ${toEmail}: ${error.message}`);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Pipeline update email template
   */
  private getPipelineUpdateTemplate(
    candidateName: string, 
    jobTitle: string, 
    newStage: string,
    stageLink?: string,
    scheduledDate?: Date,
    notes?: string,
  ): string {
    const scheduleSection = scheduledDate ? `
      <div style="margin: 20px 0; padding: 20px; background-color: #e8f4fd; border-left: 4px solid #2196f3; border-radius: 4px;">
        <p style="margin: 0; color: #1565c0; font-size: 14px; line-height: 1.6;">
          <strong>📅 Scheduled:</strong> ${scheduledDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    ` : '';

    const notesSection = notes ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
        <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
          <strong>Notes:</strong> ${notes}
        </p>
      </div>
    ` : '';

    const linkButton = stageLink ? `
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <a href="${stageLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
              Join ${newStage}
            </a>
          </td>
        </tr>
      </table>
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Congratulations!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Hello ${candidateName},</h2>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Great news! Your application for <strong>${jobTitle}</strong> has progressed to the next stage:
              </p>
              
              <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">
                  ${newStage}
                </p>
              </div>
              
              ${scheduleSection}
              ${notesSection}
              ${linkButton}
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                Please prepare accordingly and reach out to our HR team if you have any questions.
              </p>
              
              <p style="margin: 20px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Best of luck! 🍀
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #999999; font-size: 14px;">
                © 2026 AI Talent Management. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send rejection email to candidate
   */
  async sendRejectionEmail(
    toEmail: string,
    candidateName: string,
    jobTitle: string,
    feedback?: string,
  ): Promise<void> {
    try {
      const transporter = await this.createTransporter();
      
      const fromEmail = this.configService.get<string>('GMAIL_FROM_EMAIL');
      const fromName = this.configService.get<string>('GMAIL_FROM_NAME') || 'AI Talent Management';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: `Application Update - ${jobTitle}`,
        html: this.getRejectionTemplate(candidateName, jobTitle, feedback),
      };

      const result = await transporter.sendMail(mailOptions);
      
      this.logger.log(`Rejection email sent to ${toEmail} (Message ID: ${result.messageId})`);
    } catch (error: any) {
      this.logger.error(`Failed to send rejection email to ${toEmail}: ${error.message}`);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Rejection email template
   */
  private getRejectionTemplate(candidateName: string, jobTitle: string, feedback?: string): string {
    const feedbackSection = feedback ? `
      <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
        <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
          <strong>Feedback:</strong> ${feedback}
        </p>
      </div>
    ` : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Application Update</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Dear ${candidateName},</h2>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in the <strong>${jobTitle}</strong> position and for taking the time to apply.
              </p>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                After careful consideration, we regret to inform you that we will not be moving forward with your application at this time. This decision was not easy, as we received many qualified applications.
              </p>
              
              ${feedbackSection}
              
              <p style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.6;">
                We encourage you to keep an eye on our career page for future opportunities that may be a better fit for your skills and experience.
              </p>
              
              <p style="margin: 20px 0 0; color: #666666; font-size: 16px; line-height: 1.6;">
                We wish you all the best in your job search and future endeavors.
              </p>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Best regards,<br>
                <strong>HR Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #999999; font-size: 14px;">
                © 2026 AI Talent Management. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send talent pool welcome email with profile completion reminder
   */
  async sendTalentPoolWelcomeEmail(
    toEmail: string,
    candidateName: string,
    resetToken: string,
    targetStage: string,
    jobTitle?: string,
  ): Promise<void> {
    try {
      const transporter = await this.createTransporter();
      
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const resetLink = `${frontendUrl}/set-password?token=${resetToken}`;

      const fromEmail = this.configService.get<string>('GMAIL_FROM_EMAIL');
      const fromName = this.configService.get<string>('GMAIL_FROM_NAME') || 'AI Talent Management';

      const mailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject: `Welcome! Complete Your Profile - AI Talent Management`,
        html: this.getTalentPoolWelcomeTemplate(candidateName, resetLink, targetStage, jobTitle),
      };

      const result = await transporter.sendMail(mailOptions);
      
      this.logger.log(`Talent pool welcome email sent to ${toEmail} (Message ID: ${result.messageId})`);
    } catch (error: any) {
      this.logger.error(`Failed to send talent pool welcome email to ${toEmail}: ${error.message}`);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  /**
   * Talent pool welcome email template
   */
  private getTalentPoolWelcomeTemplate(
    candidateName: string, 
    resetLink: string,
    targetStage: string,
    jobTitle?: string,
  ): string {
    const jobInfo = jobTitle ? `for the <strong>${jobTitle}</strong> position` : 'in our recruitment process';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome!</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 Welcome to AI Talent Management!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Hello ${candidateName},</h2>
              
              <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                Congratulations! Based on your CV, you've been selected to proceed ${jobInfo}. You're moving to:
              </p>
              
              <div style="margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">
                  ${targetStage}
                </p>
              </div>

              <div style="margin: 30px 0; padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #856404; font-size: 16px; font-weight: bold;">
                  ⚠️ Action Required
                </p>
                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                  Before your ${targetStage}, please:
                </p>
                <ol style="margin: 10px 0 0; color: #856404; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                  <li>Set your password (click button below)</li>
                  <li>Login to your candidate dashboard</li>
                  <li><strong>Complete your profile</strong> with all required information</li>
                  <li><strong>Upload required documents</strong> (ID, certificates, etc.)</li>
                </ol>
              </div>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.25);">
                      Set Your Password & Get Started
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0; color: #999999; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${resetLink}" style="color: #667eea; word-break: break-all;">${resetLink}</a>
              </p>
              
              <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                This link expires in 24 hours. If you have questions, contact our HR team.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 14px;">
                © 2026 AI Talent Management. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
