const SMSService = require('./sms-service');
const moment = require('moment-timezone');

class DetailedReportService {
    constructor() {
        this.smsService = new SMSService();
    }

    async sendDetailedReport(partners) {
        const now = moment().tz('America/New_York');
        const reportDate = now.format('MMM D, YYYY');
        
        // Group partners by performance
        const withAppointments = partners.filter(p => p.today_appts > 0);
        const topPerformers = partners.sort((a, b) => b.ytd_revenue - a.ytd_revenue).slice(0, 10);
        
        // Calculate totals
        const totals = {
            todayAppts: partners.reduce((sum, p) => sum + p.today_appts, 0),
            todayRevenue: partners.reduce((sum, p) => sum + (p.today_revenue || 0), 0),
            weekAppts: partners.reduce((sum, p) => sum + p.week_appts, 0),
            weekRevenue: partners.reduce((sum, p) => sum + (p.week_revenue || 0), 0),
            mtdAppts: partners.reduce((sum, p) => sum + p.mtd_appts, 0),
            mtdRevenue: partners.reduce((sum, p) => sum + (p.mtd_revenue || 0), 0),
            ytdAppts: partners.reduce((sum, p) => sum + p.ytd_appts, 0),
            ytdRevenue: partners.reduce((sum, p) => sum + (p.ytd_revenue || 0), 0)
        };

        // Build comprehensive report
        let report = `PARTNER REPORT ${reportDate}\n`;
        report += `${'='.repeat(30)}\n\n`;
        
        report += `SUMMARY (${partners.length} Partners)\n`;
        report += `Today: ${totals.todayAppts} appts / $${totals.todayRevenue.toLocaleString()}\n`;
        report += `Week: ${totals.weekAppts} appts / $${totals.weekRevenue.toLocaleString()}\n`;
        report += `MTD: ${totals.mtdAppts} appts / $${totals.mtdRevenue.toLocaleString()}\n`;
        report += `YTD: ${totals.ytdAppts} appts / $${totals.ytdRevenue.toLocaleString()}\n\n`;
        
        if (withAppointments.length > 0) {
            report += `TODAY'S APPOINTMENTS\n`;
            report += `${'-'.repeat(30)}\n`;
            withAppointments.forEach(p => {
                report += `${p.name}: ${p.today_appts} appts`;
                if (p.phone) report += ` (${p.phone})`;
                report += `\n`;
            });
            report += `\n`;
        }
        
        report += `TOP PERFORMERS (YTD)\n`;
        report += `${'-'.repeat(30)}\n`;
        topPerformers.forEach((p, idx) => {
            report += `${idx + 1}. ${p.name}\n`;
            report += `   Appts: ${p.ytd_appts} | Rev: $${(p.ytd_revenue || 0).toLocaleString()}\n`;
        });

        return report;
    }

    async sendManagementReport(partners, managementConfig) {
        const detailedReport = await this.sendDetailedReport(partners);
        
        // Split report into SMS chunks if too long (SMS limit ~1600 chars)
        const chunks = this.splitIntoChunks(detailedReport, 1500);
        
        // Send to Moehoe
        console.log(`Sending ${chunks.length} SMS messages to Moehoe with full report`);
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const header = chunks.length > 1 ? `[Part ${i + 1}/${chunks.length}]\n` : '';
            await this.smsService.sendSMS(managementConfig.moehoe_phone, header + chunk);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between messages
        }
        
        // Send summary to Abraham
        const summary = this.createSummary(partners);
        await this.smsService.sendSMS(managementConfig.abraham_herrera_phone, summary);
        
        return { success: true, messagesSent: chunks.length + 1 };
    }

    splitIntoChunks(text, maxLength) {
        const chunks = [];
        let currentChunk = '';
        const lines = text.split('\n');
        
        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > maxLength) {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = line;
            } else {
                currentChunk += (currentChunk ? '\n' : '') + line;
            }
        }
        
        if (currentChunk) chunks.push(currentChunk);
        return chunks;
    }

    createSummary(partners) {
        const todayCount = partners.filter(p => p.today_appts > 0).length;
        const totalAppts = partners.reduce((sum, p) => sum + p.today_appts, 0);
        const totalRevenue = partners.reduce((sum, p) => sum + (p.ytd_revenue || 0), 0);
        
        return `Daily Summary: ${partners.length} partners\n` +
               `Active Today: ${todayCount}\n` +
               `Total Appts: ${totalAppts}\n` +
               `YTD Revenue: $${totalRevenue.toLocaleString()}`;
    }

    async sendPartnerReport(partner) {
        const report = `${partner.name} Report\n` +
                      `${'='.repeat(20)}\n` +
                      `Today: ${partner.today_appts} appts\n` +
                      `Week: ${partner.week_appts} appts\n` +
                      `MTD: ${partner.mtd_appts} appts\n` +
                      `YTD: ${partner.ytd_appts} appts\n` +
                      `Revenue: $${(partner.ytd_revenue || 0).toLocaleString()}\n` +
                      `Conversion: ${((partner.conversion_rate || 0) * 100).toFixed(1)}%`;
        
        return await this.smsService.sendSMS(partner.phone, report);
    }
}

module.exports = DetailedReportService;