const axios = require('axios');
require('dotenv').config();

class SMSService {
    constructor() {
        // Twilio credentials from MASTER SECRETS
        this.accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC52926a1358b76dee0e35cc86ae0aa98c';
        this.authToken = process.env.TWILIO_AUTH_TOKEN || '1ffc3205c0a8b3dba9035a5fa1c43ee1';
        this.messagingSid = process.env.TWILIO_MESSAGING_SID || 'MG6c4c44f927c488f0501a0a4bee6b066e';
        this.fromPhone = process.env.TWILIO_FROM_PHONE || '+18333823431'; // Your Twilio number
        
        this.twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
        console.log('SMS Service initialized with Twilio');
    }

    async sendSMS(to, message) {
        try {
            // Format phone number
            const toPhone = to.replace(/\D/g, '');
            const formattedTo = toPhone.startsWith('+') ? toPhone : `+${toPhone.startsWith('1') ? toPhone : '1' + toPhone}`;
            
            console.log(`Sending SMS to ${formattedTo}: ${message.substring(0, 50)}...`);
            
            const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
            
            const params = new URLSearchParams({
                To: formattedTo,
                From: this.fromPhone,
                Body: message,
                MessagingServiceSid: this.messagingSid
            });

            const response = await axios.post(this.twilioUrl, params.toString(), {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            console.log(`SMS sent successfully to ${formattedTo}, SID: ${response.data.sid}`);
            return {
                success: true,
                sid: response.data.sid,
                to: formattedTo
            };
        } catch (error) {
            console.error('SMS failed:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    async sendBulkSMS(recipients, message) {
        const results = [];
        for (const recipient of recipients) {
            const result = await this.sendSMS(recipient, message);
            results.push(result);
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        return results;
    }
}

module.exports = SMSService;