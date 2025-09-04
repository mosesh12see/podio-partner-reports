const axios = require('axios');
require('dotenv').config();

class PodioService {
    constructor() {
        this.baseUrl = process.env.PODIO_WEBHOOK_URL;
        this.webhookId = process.env.PODIO_WEBHOOK_ID;
        this.clientId = process.env.PODIO_CLIENT_ID;
        this.clientSecret = process.env.PODIO_CLIENT_SECRET;
        
        // PARTNERS APP - For partner info ONLY
        this.appToken = process.env.PODIO_PARTNERS_APP_TOKEN || 'bd7f2807e2d520b8d5a354ef57713e2d';
        this.appId = process.env.PODIO_PARTNERS_APP_ID || '30399321';
        
        // CLOSER APP - For REAL appointment data - NO FAKE DATA!!!
        this.closerAppToken = '117d3fca26a11d72e48dc62e07d2e793'; // REAL Closer app token
        this.closerAppId = '29175634'; // REAL Closer app ID
        
        this.fieldMapping = require('../config/field-mapping.json');
        this.podioApiUrl = 'https://api.podio.com';
        this.accessToken = null;
        this.closerAccessToken = null;
    }

    async getPartnersWithAppointments(date) {
        try {
            const params = {
                a: this.webhookId,
                c: 'get_partners_with_appointments',
                v: JSON.stringify({ 
                    date,
                    app_token: this.appToken
                })
            };

            console.log('Calling Podio webhook:', this.baseUrl);
            const response = await axios.get(this.baseUrl, { 
                params,
                timeout: 30000 
            });
            
            if (response.data && response.data.status === 'success') {
                return response.data.data;
            } else {
                // No data from webhook, try direct Podio API
                console.log('No webhook data, trying direct Podio API call...');
                return await this.getPartnersDirectFromPodio(date);
            }
        } catch (error) {
            console.log('Webhook error, using direct Podio API:', error.message);
            return await this.getPartnersDirectFromPodio(date);
        }
    }

    async authenticate() {
        try {
            const authUrl = `${this.podioApiUrl}/oauth/token`;
            const authData = new URLSearchParams({
                grant_type: 'app',
                app_id: this.appId,
                app_token: this.appToken,
                client_id: this.clientId,
                client_secret: this.clientSecret
            });

            const response = await axios.post(authUrl, authData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            this.accessToken = response.data.access_token;
            return this.accessToken;
        } catch (error) {
            console.error('Podio authentication failed:', error.message);
            if (error.response) {
                console.error('Auth error details:', error.response.data);
            }
            throw error;
        }
    }

    async authenticateCloserApp() {
        try {
            // AUTHENTICATE WITH REAL CLOSER APP - NO FAKE DATA!!!
            const authUrl = `${this.podioApiUrl}/oauth/token`;
            const authData = new URLSearchParams({
                grant_type: 'app',
                app_id: this.closerAppId,
                app_token: this.closerAppToken,
                client_id: this.clientId,
                client_secret: this.clientSecret
            });

            console.log('Authenticating with REAL Closer app ID:', this.closerAppId);
            const response = await axios.post(authUrl, authData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            this.closerAccessToken = response.data.access_token;
            console.log('Successfully connected to REAL Closer app!');
            return this.closerAccessToken;
        } catch (error) {
            console.error('CLOSER app authentication failed:', error.message);
            if (error.response) {
                console.error('Auth error details:', error.response.data);
            }
            throw error;
        }
    }

    async getPartnersDirectFromPodio(date) {
        try {
            // NEVER USE FAKE DATA - CONNECT TO REAL CLOSER APP
            console.log('CONNECTING TO REAL PODIO CLOSER APP - NO FAKE DATA!!!');
            
            // Authenticate with CLOSER app to get REAL appointment data
            if (!this.closerAccessToken) {
                await this.authenticateCloserApp();
            }

            // Get REAL appointments from Closer app
            const closerUrl = `${this.podioApiUrl}/item/app/${this.closerAppId}/filter`;
            const closerHeaders = {
                'Authorization': `OAuth2 ${this.closerAccessToken}`,
                'Content-Type': 'application/json'
            };

            // Get LAST 7 DAYS of appointments for sit/close rates
            const today = new Date(date);
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const startOfWeek = new Date(sevenDaysAgo.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const closerResponse = await axios.post(closerUrl, {
                limit: 500,
                offset: 0,
                filters: {
                    // Get appointments for LAST 7 DAYS
                    created_on: {
                        from: startOfWeek.toISOString(),
                        to: endOfDay.toISOString()
                    }
                }
            }, { headers: closerHeaders });

            // Count REAL appointments per partner WITH SIT/CLOSE RATES
            const partnerStats = {};
            console.log(`Found ${closerResponse.data.items.length} appointments in last 7 days!`);
            
            for (const appt of closerResponse.data.items) {
                // Get the partner name
                const partnerField = appt.fields.find(f => f.external_id === 'partner-assigned-from-full-org-app');
                let partnerName = partnerField?.values?.[0]?.value || 'Unknown Partner';
                
                // Check if it's internal route - combine all internal routes
                const routeField = appt.fields.find(f => f.external_id === 'appt-route');
                const routeValue = routeField?.values?.[0]?.text || '';
                const isInternal = routeValue.toLowerCase().includes('internal');
                
                // Combine all internal routes EXCEPT MFSM
                if (isInternal && partnerName.trim() !== 'MFSM') {
                    partnerName = 'Internal Routes (Combined)';
                }
                
                // Get claim status for sit/close tracking
                const claimStatusField = appt.fields.find(f => f.external_id === 'claim-status');
                const claimStatus = claimStatusField?.values?.[0]?.text || '';
                
                // Check appointment date for time periods
                const apptDateField = appt.fields.find(f => f.external_id === 'appointment-date');
                const apptDate = new Date(apptDateField?.values?.[0]?.start || appt.created_on);
                const todayStart = new Date().setHours(0,0,0,0);
                const isToday = apptDate >= todayStart;
                const weekStart = new Date();
                weekStart.setDate(weekStart.getDate() - 7);
                const isThisWeek = apptDate >= weekStart;
                const monthStart = new Date();
                monthStart.setDate(1);
                const isThisMonth = apptDate >= monthStart;
                const yearStart = new Date(new Date().getFullYear(), 0, 1);
                const isThisYear = apptDate >= yearStart;
                
                if (!partnerStats[partnerName]) {
                    partnerStats[partnerName] = {
                        today_appts: 0,
                        today_sits: 0,
                        today_closes: 0,
                        week_appts: 0,
                        week_sits: 0,
                        week_closes: 0,
                        mtd_appts: 0,
                        mtd_sits: 0,
                        mtd_closes: 0,
                        ytd_appts: 0,
                        ytd_sits: 0,
                        ytd_closes: 0,
                        has_activity_last_7_days: false
                    };
                }
                
                // Track based on time period
                if (isToday) {
                    partnerStats[partnerName].today_appts++;
                    if (claimStatus.toLowerCase().includes('sat') || claimStatus.toLowerCase().includes('sit')) {
                        partnerStats[partnerName].today_sits++;
                    }
                    if (claimStatus.toLowerCase().includes('sold') || claimStatus.toLowerCase().includes('close')) {
                        partnerStats[partnerName].today_closes++;
                    }
                }
                
                if (isThisWeek) {
                    partnerStats[partnerName].week_appts++;
                    partnerStats[partnerName].has_activity_last_7_days = true;
                    if (claimStatus.toLowerCase().includes('sat') || claimStatus.toLowerCase().includes('sit')) {
                        partnerStats[partnerName].week_sits++;
                    }
                    if (claimStatus.toLowerCase().includes('sold') || claimStatus.toLowerCase().includes('close')) {
                        partnerStats[partnerName].week_closes++;
                    }
                }
                
                if (isThisMonth) {
                    partnerStats[partnerName].mtd_appts++;
                    if (claimStatus.toLowerCase().includes('sat') || claimStatus.toLowerCase().includes('sit')) {
                        partnerStats[partnerName].mtd_sits++;
                    }
                    if (claimStatus.toLowerCase().includes('sold') || claimStatus.toLowerCase().includes('close')) {
                        partnerStats[partnerName].mtd_closes++;
                    }
                }
                
                if (isThisYear) {
                    partnerStats[partnerName].ytd_appts++;
                    if (claimStatus.toLowerCase().includes('sat') || claimStatus.toLowerCase().includes('sit')) {
                        partnerStats[partnerName].ytd_sits++;
                    }
                    if (claimStatus.toLowerCase().includes('sold') || claimStatus.toLowerCase().includes('close')) {
                        partnerStats[partnerName].ytd_closes++;
                    }
                }
                
                console.log(`Partner: ${partnerName}, Status: ${claimStatus}, Date: ${apptDate.toLocaleDateString()}`);
            }

            // Now get partners and merge with REAL stats
            if (!this.accessToken) {
                await this.authenticate();
            }

            const partnersUrl = `${this.podioApiUrl}/item/app/${this.appId}/filter`;
            const partnersHeaders = {
                'Authorization': `OAuth2 ${this.accessToken}`,
                'Content-Type': 'application/json'
            };

            const partnersResponse = await axios.post(partnersUrl, {
                limit: 500,
                offset: 0
            }, { headers: partnersHeaders });

            const partners = [];
            const fieldMapping = this.fieldMapping.partner_fields;

            // Show which partners had REAL appointments
            console.log('Partners with REAL appointments today:', Object.keys(partnerStats));
            
            for (const item of partnersResponse.data.items) {
                const partnerName = this.getFieldValue(item, fieldMapping.name) || 'Unknown Partner';
                
                // Try to match with different name formats (with/without spaces)
                const trimmedName = partnerName.trim();
                const realStats = partnerStats[trimmedName] || 
                                 partnerStats[`${trimmedName} `] || 
                                 partnerStats[` ${trimmedName}`] ||
                                 partnerStats[` ${trimmedName} `] || {};
                
                const partner = {
                    id: item.item_id,
                    name: partnerName,
                    email: this.getFieldValue(item, fieldMapping.email) || `partner${item.item_id}@sees.team`,
                    phone: this.getFieldValue(item, fieldMapping.phone_1) || 
                           this.getFieldValue(item, fieldMapping.phone_2) || 
                           this.getFieldValue(item, fieldMapping.phone_3) || 
                           '+19724691106',
                    company: this.getFieldValue(item, fieldMapping.name),
                    // REAL DATA FROM CLOSER APP - SIT/CLOSE RATES
                    today_appts: realStats.today_appts || 0,
                    today_sits: realStats.today_sits || 0,
                    today_closes: realStats.today_closes || 0,
                    today_sit_rate: realStats.today_appts ? (realStats.today_sits / realStats.today_appts * 100).toFixed(1) : 0,
                    today_close_rate: realStats.today_sits ? (realStats.today_closes / realStats.today_sits * 100).toFixed(1) : 0,
                    
                    week_appts: realStats.week_appts || 0,
                    week_sits: realStats.week_sits || 0,
                    week_closes: realStats.week_closes || 0,
                    week_sit_rate: realStats.week_appts ? (realStats.week_sits / realStats.week_appts * 100).toFixed(1) : 0,
                    week_close_rate: realStats.week_sits ? (realStats.week_closes / realStats.week_sits * 100).toFixed(1) : 0,
                    
                    mtd_appts: realStats.mtd_appts || 0,
                    mtd_sits: realStats.mtd_sits || 0,
                    mtd_closes: realStats.mtd_closes || 0,
                    mtd_sit_rate: realStats.mtd_appts ? (realStats.mtd_sits / realStats.mtd_appts * 100).toFixed(1) : 0,
                    mtd_close_rate: realStats.mtd_sits ? (realStats.mtd_closes / realStats.mtd_sits * 100).toFixed(1) : 0,
                    
                    ytd_appts: realStats.ytd_appts || 0,
                    ytd_sits: realStats.ytd_sits || 0,
                    ytd_closes: realStats.ytd_closes || 0,
                    ytd_sit_rate: realStats.ytd_appts ? (realStats.ytd_sits / realStats.ytd_appts * 100).toFixed(1) : 0,
                    ytd_close_rate: realStats.ytd_sits ? (realStats.ytd_closes / realStats.ytd_sits * 100).toFixed(1) : 0,
                    
                    has_activity_last_7_days: realStats.has_activity_last_7_days || false,
                    last_updated: new Date().toISOString()
                };

                // Only include partners with activity in last 7 days
                if (realStats.has_activity_last_7_days) {
                    partners.push(partner);
                    console.log(`Including partner ${partner.name}: Week ${partner.week_appts} appts, ${partner.week_sit_rate}% sit rate, ${partner.week_close_rate}% close rate`);
                }
            }

            console.log(`Retrieved ${partners.length} partners with REAL DATA from Podio`);
            return partners;
        } catch (error) {
            console.error('FATAL: Cannot connect to Podio Closer app:', error.message);
            if (error.response) {
                console.error('Error details:', error.response.data);
            }
            throw new Error(`Podio connection failed: ${error.message}`);
        }
    }

    getFieldValue(item, fieldExternalId) {
        const field = item.fields.find(f => f.external_id === fieldExternalId);
        if (!field) return null;

        switch (field.type) {
            case 'text':
                return field.values[0].value;
            case 'phone':
                return field.values[0].value;
            case 'email':
                return field.values[0].value;
            case 'category':
                return field.values[0].value.text;
            default:
                return field.values[0]?.value || null;
        }
    }

    getMockPartnerData() {
        // NEVER USE MOCK DATA - ALWAYS USE REAL PODIO DATA!!!
        throw new Error('FAKE DATA IS FORBIDDEN! Must use REAL Podio data only!');
    }

    async createItem(itemData) {
        try {
            const params = {
                a: this.webhookId,
                c: 'create',
                v: JSON.stringify(itemData)
            };

            const response = await axios.get(this.baseUrl, { params });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create Podio item: ${error.message}`);
        }
    }

    async getPartnerStats(partnerId, dateRange) {
        try {
            const params = {
                a: this.webhookId,
                c: 'get_partner_stats',
                v: JSON.stringify({ 
                    partner_id: partnerId,
                    date_range: dateRange,
                    app_token: this.appToken
                })
            };

            const response = await axios.get(this.baseUrl, { 
                params,
                timeout: 15000 
            });
            
            return response.data;
        } catch (error) {
            console.error('Failed to get partner stats:', error.message);
            return null;
        }
    }

    async updatePartnerReport(partnerId, reportData) {
        try {
            const params = {
                a: this.webhookId,
                c: 'update_partner_report',
                v: JSON.stringify({ 
                    partner_id: partnerId,
                    report_data: reportData,
                    app_token: this.appToken
                })
            };

            const response = await axios.get(this.baseUrl, { params });
            return response.data;
        } catch (error) {
            console.error('Failed to update partner report:', error.message);
            return null;
        }
    }
}

module.exports = PodioService;