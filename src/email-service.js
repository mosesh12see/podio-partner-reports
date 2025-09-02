const sgMail = require('@sendgrid/mail');
require('dotenv').config();

class EmailService {
    constructor() {
        this.fromEmail = process.env.FROM_EMAIL || 'reports@sees.team';
        this.fromName = process.env.FROM_NAME || 'Partner Performance Reports';
        
        // Initialize SendGrid if API key is provided
        if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('YOUR_')) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.sendGridEnabled = true;
        } else {
            this.sendGridEnabled = false;
            console.log('SendGrid not configured - emails will be logged only');
        }
    }

    async sendReport(partner, htmlContent) {
        try {
            const subject = `Your Daily Performance Report - ${new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            })}`;

            if (!this.sendGridEnabled) {
                console.log(`[EMAIL MOCK] Would send email to ${partner.email}`);
                console.log(`[EMAIL MOCK] Subject: ${subject}`);
                console.log(`[EMAIL MOCK] Content length: ${htmlContent.length} characters`);
                return { 
                    success: true, 
                    mock: true, 
                    to: partner.email,
                    subject 
                };
            }

            const msg = {
                to: partner.email,
                from: {
                    email: this.fromEmail,
                    name: this.fromName
                },
                subject: subject,
                html: htmlContent,
                trackingSettings: {
                    clickTracking: {
                        enable: true,
                        enableText: true
                    },
                    openTracking: {
                        enable: true
                    }
                },
                categories: ['partner-reports', 'daily-performance']
            };

            // Add partner name to personalization if available
            if (partner.name) {
                msg.personalizations = [{
                    to: [{ email: partner.email, name: partner.name }],
                    subject: subject
                }];
            }

            const response = await sgMail.send(msg);
            console.log(`Email sent successfully to ${partner.email}`);
            
            return {
                success: true,
                messageId: response[0].headers['x-message-id'],
                to: partner.email,
                subject
            };
            
        } catch (error) {
            console.error('Email sending failed:', error);
            
            // Extract useful error information
            if (error.response) {
                console.error('SendGrid Error Response:', error.response.body);
            }
            
            throw new Error(`Email sending failed: ${error.message}`);
        }
    }

    async sendBulkReports(partners, generateReportFunc) {
        const results = [];
        const batchSize = 10; // Send in batches to avoid rate limits
        
        for (let i = 0; i < partners.length; i += batchSize) {
            const batch = partners.slice(i, i + batchSize);
            
            const batchPromises = batch.map(async (partner) => {
                try {
                    const htmlContent = await generateReportFunc(partner);
                    const result = await this.sendReport(partner, htmlContent);
                    return { ...result, partner: partner.name };
                } catch (error) {
                    return {
                        success: false,
                        partner: partner.name,
                        error: error.message
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Add delay between batches
            if (i + batchSize < partners.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }

    async sendTestEmail(testEmail) {
        const testPartner = {
            name: 'Test Partner',
            email: testEmail || 'test@example.com',
            company: 'Test Company'
        };

        const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Email</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background: #f5f5f5; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Test Email - Partner Reports System</h1>
            </div>
            <div class="content">
                <h2>System Configuration Test</h2>
                <p>This is a test email from the Partner Reports system.</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <p><strong>SendGrid Status:</strong> ${this.sendGridEnabled ? 'Configured' : 'Not Configured'}</p>
            </div>
        </body>
        </html>`;

        return await this.sendReport(testPartner, testHtml);
    }

    async validateEmailConfig() {
        const issues = [];
        
        if (!process.env.SENDGRID_API_KEY) {
            issues.push('SENDGRID_API_KEY not set');
        } else if (process.env.SENDGRID_API_KEY.includes('YOUR_')) {
            issues.push('SENDGRID_API_KEY needs to be updated with actual key');
        }
        
        if (!process.env.FROM_EMAIL) {
            issues.push('FROM_EMAIL not set');
        }
        
        if (!process.env.FROM_NAME) {
            issues.push('FROM_NAME not set');
        }
        
        return {
            valid: issues.length === 0,
            issues,
            config: {
                sendGridEnabled: this.sendGridEnabled,
                fromEmail: this.fromEmail,
                fromName: this.fromName
            }
        };
    }
}

module.exports = EmailService;