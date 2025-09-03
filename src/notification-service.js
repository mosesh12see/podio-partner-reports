const SMSService = require('./sms-service');
const moment = require('moment-timezone');

class NotificationService {
    constructor() {
        this.smsService = new SMSService();
        
        // Management team - ALWAYS notified
        this.managementTeam = {
            moehoe: '+19724691106',
            abraham: '+14355134853',
            robert: null,  // Will be pulled from Podio
            wyatt: null    // Will be pulled from Podio
        };
        
        // Internal rep routes
        this.internalReps = {
            robert: { name: 'Robert Soderholm', phone: null },
            wyatt: { name: 'Wyatt Stettler', phone: null }
        };
    }
    
    async loadInternalRepPhones(podioService) {
        try {
            // Get partners to find Robert and Wyatt's phone numbers
            const partners = await podioService.getPartnersDirectFromPodio(new Date());
            
            // Look for Robert Soderholm
            const robert = partners.find(p => 
                p.name && p.name.toLowerCase().includes('robert') && 
                p.name.toLowerCase().includes('soderholm')
            );
            if (robert && robert.phone) {
                this.managementTeam.robert = robert.phone;
                this.internalReps.robert.phone = robert.phone;
                console.log(`Found Robert Soderholm: ${robert.phone}`);
            }
            
            // Look for Wyatt Stettler
            const wyatt = partners.find(p => 
                p.name && p.name.toLowerCase().includes('wyatt') && 
                p.name.toLowerCase().includes('stettler')
            );
            if (wyatt && wyatt.phone) {
                this.managementTeam.wyatt = wyatt.phone;
                this.internalReps.wyatt.phone = wyatt.phone;
                console.log(`Found Wyatt Stettler: ${wyatt.phone}`);
            }
        } catch (error) {
            console.error('Error loading internal rep phones:', error);
        }
    }
    
    async sendPartnerNotification(partner, secureUrl) {
        const notifications = [];
        
        // 1. Send to partner their individual secure link
        const partnerMessage = `Hi ${partner.name.split(' ')[0]}! Your daily performance report is ready.\n\n` +
                             `View your report: ${secureUrl}\n\n` +
                             `Today: ${partner.today_appts_assigned || 0} assigned, ${partner.today_appts_sat || 0} sat\n` +
                             `SIT Rate: ${this.calculateSitRate(partner)}%\n` +
                             `CLOSE Rate: ${this.calculateCloseRate(partner)}%\n\n` +
                             `This link is secure and shows only your data.`;
        
        notifications.push({
            type: 'partner',
            to: partner.phone,
            message: partnerMessage
        });
        
        // 2. Check if partner has internal "Appt Route"
        if (partner.appt_route) {
            const route = partner.appt_route.toLowerCase();
            
            // Notify Robert if it's his route
            if (route.includes('robert') && this.internalReps.robert.phone) {
                const repMessage = `🔔 Partner Update - Your Route\n\n` +
                                 `Partner: ${partner.name}\n` +
                                 `Today: ${partner.today_appts_assigned || 0} assigned, ${partner.today_appts_sat || 0} sat\n` +
                                 `SIT Rate: ${this.calculateSitRate(partner)}%\n` +
                                 `CLOSE Rate: ${this.calculateCloseRate(partner)}%\n\n` +
                                 `Partner's report: ${secureUrl}`;
                
                notifications.push({
                    type: 'internal_rep',
                    to: this.internalReps.robert.phone,
                    message: repMessage
                });
            }
            
            // Notify Wyatt if it's his route
            if (route.includes('wyatt') && this.internalReps.wyatt.phone) {
                const repMessage = `🔔 Partner Update - Your Route\n\n` +
                                 `Partner: ${partner.name}\n` +
                                 `Today: ${partner.today_appts_assigned || 0} assigned, ${partner.today_appts_sat || 0} sat\n` +
                                 `SIT Rate: ${this.calculateSitRate(partner)}%\n` +
                                 `CLOSE Rate: ${this.calculateCloseRate(partner)}%\n\n` +
                                 `Partner's report: ${secureUrl}`;
                
                notifications.push({
                    type: 'internal_rep',
                    to: this.internalReps.wyatt.phone,
                    message: repMessage
                });
            }
        }
        
        // 3. ALWAYS notify ALL management about every partner
        const mgmtMessage = `📊 Partner Report Sent\n\n` +
                          `Partner: ${partner.name}\n` +
                          `Phone: ${partner.phone}\n` +
                          `Route: ${partner.appt_route || 'None'}\n` +
                          `Today: ${partner.today_appts_assigned || 0} assigned, ${partner.today_appts_sat || 0} sat\n` +
                          `SIT: ${this.calculateSitRate(partner)}%\n` +
                          `CLOSE: ${this.calculateCloseRate(partner)}%`;
        
        // Send to all management team members
        for (const [role, phone] of Object.entries(this.managementTeam)) {
            if (phone) {
                notifications.push({
                    type: 'management',
                    to: phone,
                    role: role,
                    message: mgmtMessage
                });
            }
        }
        
        // Execute all notifications
        const results = [];
        for (const notification of notifications) {
            try {
                const result = await this.smsService.sendSMS(notification.to, notification.message);
                results.push({
                    ...notification,
                    success: result.success,
                    sid: result.sid
                });
                console.log(`${notification.type} notification sent to ${notification.to}`);
            } catch (error) {
                results.push({
                    ...notification,
                    success: false,
                    error: error.message
                });
                console.error(`Failed to send ${notification.type} notification:`, error.message);
            }
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return results;
    }
    
    async sendManagementDashboard(dashboardUrl, summary) {
        const message = `📊 Management Dashboard Ready!\n\n` +
                       `View Full Dashboard: ${dashboardUrl}\n\n` +
                       `Today's Summary:\n` +
                       `${summary.totalPartners} total partners\n` +
                       `${summary.activeToday} active today\n` +
                       `${summary.totalAssigned} appts assigned\n` +
                       `${summary.totalSat} appts sat\n` +
                       `${summary.totalClosed} deals closed\n` +
                       `Overall SIT: ${summary.overallSitRate}%\n` +
                       `Overall CLOSE: ${summary.overallCloseRate}%`;
        
        const results = [];
        
        // Send to all management team
        for (const [role, phone] of Object.entries(this.managementTeam)) {
            if (phone) {
                try {
                    const result = await this.smsService.sendSMS(phone, message);
                    results.push({
                        role,
                        phone,
                        success: result.success
                    });
                    console.log(`Management dashboard sent to ${role}: ${phone}`);
                } catch (error) {
                    results.push({
                        role,
                        phone,
                        success: false,
                        error: error.message
                    });
                }
            }
        }
        
        return results;
    }
    
    calculateSitRate(partner) {
        if (!partner.today_appts_assigned || partner.today_appts_assigned === 0) {
            return 0;
        }
        return ((partner.today_appts_sat / partner.today_appts_assigned) * 100).toFixed(1);
    }
    
    calculateCloseRate(partner) {
        if (!partner.today_appts_sat || partner.today_appts_sat === 0) {
            return 0;
        }
        return ((partner.today_deals_closed / partner.today_appts_sat) * 100).toFixed(1);
    }
}

module.exports = NotificationService;