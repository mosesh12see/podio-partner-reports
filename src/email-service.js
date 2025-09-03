const axios = require('axios');
require('dotenv').config();

class EmailService {
    constructor() {
        this.globiflowUrl = process.env.PODIO_WEBHOOK_URL;
        this.globiflowId = process.env.PODIO_WEBHOOK_ID;
        console.log('SMS service configured via Globiflow/ClickSend');
    }

    async sendReport(partner, htmlContent) {
        try {
            // Skip email - just trigger SMS via ClickSend
            console.log(`Sending SMS notification for ${partner.name}`);
            
            const smsMessage = `Partner Report: ${partner.name}\nToday: ${partner.today_appts} appts\nRevenue: $${partner.today_revenue || 0}\nYTD: ${partner.ytd_appts} appts`;
            
            const smsData = {
                partner_id: partner.id,
                partner_name: partner.name,
                partner_phone: partner.phone,
                message: smsMessage,
                today_appts: partner.today_appts,
                ytd_appts: partner.ytd_appts,
                command: 'send_partner_sms'
            };

            const response = await axios.get(this.globiflowUrl, {
                params: {
                    a: this.globiflowId,
                    c: 'trigger_partner_sms',
                    v: JSON.stringify(smsData)
                },
                timeout: 15000
            });
            
            console.log(`SMS triggered for ${partner.phone}`);
            
            return {
                success: true,
                phone: partner.phone,
                partner: partner.name
            };
            
        } catch (error) {
            console.error('SMS sending failed:', error.message);
            // Don't throw - just log and continue
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