#!/usr/bin/env node

const PodioService = require('./src/podio-service');
const SMSService = require('./src/sms-service');

async function sendIndividualPartnerReports() {
    const podio = new PodioService();
    const sms = new SMSService();
    
    console.log('📊 Fetching partners with activity in last 7 days...\n');
    
    try {
        // Get partners with REAL data from last 7 days
        const today = new Date().toISOString().split('T')[0];
        const partners = await podio.getPartnersWithAppointments(today);
        
        console.log(`Found ${partners.length} partners with activity\n`);
        
        // Send to Moehoe (you) for each partner
        const moehoePhone = '+19724691106';
        
        for (const partner of partners) {
            // Skip if no activity
            if (!partner.has_activity_last_7_days) continue;
            
            // Create individual message for each partner
            const message = `📊 ${partner.name}\n` +
                          `━━━━━━━━━━━━━\n` +
                          `TODAY: ${partner.today_appts} appts\n` +
                          `Sit Rate: ${partner.today_sit_rate}%\n` +
                          `Close Rate: ${partner.today_close_rate}%\n\n` +
                          
                          `WEEK: ${partner.week_appts} appts\n` +
                          `Sit Rate: ${partner.week_sit_rate}%\n` +
                          `Close Rate: ${partner.week_close_rate}%\n\n` +
                          
                          `MTD: ${partner.mtd_appts} appts\n` +
                          `Sit Rate: ${partner.mtd_sit_rate}%\n` +
                          `Close Rate: ${partner.mtd_close_rate}%\n\n` +
                          
                          `YTD: ${partner.ytd_appts} appts\n` +
                          `Sit Rate: ${partner.ytd_sit_rate}%\n` +
                          `Close Rate: ${partner.ytd_close_rate}%`;
            
            // Send SMS for this partner
            const result = await sms.sendSMS(moehoePhone, message);
            
            if (result.success) {
                console.log(`✅ Sent report for ${partner.name}`);
            } else {
                console.log(`❌ Failed to send for ${partner.name}`);
            }
            
            // Small delay between messages
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n✅ All individual reports sent!');
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run it
sendIndividualPartnerReports();