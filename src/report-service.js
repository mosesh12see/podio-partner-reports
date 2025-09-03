const SMSService = require('./sms-service');
require('dotenv').config();

class EmailService {
    constructor() {
        this.smsService = new SMSService();
        console.log('Report service configured with Twilio SMS');
    }

    async sendReport(partner, htmlContent) {
        try {
            // Skip email - just send SMS via Twilio
            console.log(`Sending SMS notification for ${partner.name}`);
            
            const smsMessage = `Partner Report: ${partner.name}
Today: ${partner.today_appts} appts
Revenue: $${partner.today_revenue || 0}
YTD: ${partner.ytd_appts} appts`;
            
            // Send SMS via Twilio
            const result = await this.smsService.sendSMS(partner.phone, smsMessage);
            
            if (result.success) {
                console.log(`SMS sent to ${partner.phone} for ${partner.name}`);
            } else {
                console.log(`SMS failed for ${partner.name}: ${result.error}`);
            }
            
            return result;
            
        } catch (error) {
            console.error('SMS sending failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async sendBulkReports(partners, generateReportFunc) {
        const results = [];
        for (const partner of partners) {
            try {
                const htmlReport = await generateReportFunc(partner);
                const result = await this.sendReport(partner, htmlReport);
                results.push(result);
            } catch (error) {
                console.error(`Failed to process ${partner.name}:`, error.message);
                results.push({
                    success: false,
                    partner: partner.name,
                    error: error.message
                });
            }
        }
        return results;
    }
}

module.exports = EmailService;