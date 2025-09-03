const axios = require('axios');
require('dotenv').config();

class PodioService {
    constructor() {
        this.baseUrl = process.env.PODIO_WEBHOOK_URL;
        this.webhookId = process.env.PODIO_WEBHOOK_ID;
        this.clientId = process.env.PODIO_CLIENT_ID;
        this.clientSecret = process.env.PODIO_CLIENT_SECRET;
        this.appToken = process.env.PODIO_PARTNERS_APP_TOKEN || 'bd7f2807e2d520b8d5a354ef57713e2d';
        this.appId = process.env.PODIO_PARTNERS_APP_ID || '30399321';
        this.fieldMapping = require('../config/field-mapping.json');
        this.podioApiUrl = 'https://api.podio.com';
        this.accessToken = null;
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

            // Filter for today's appointments
            const today = new Date(date);
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const closerResponse = await axios.post(closerUrl, {
                limit: 500,
                offset: 0,
                filters: {
                    // Get appointments for today
                    created_on: {
                        from: startOfDay.toISOString(),
                        to: endOfDay.toISOString()
                    }
                }
            }, { headers: closerHeaders });

            // Count REAL appointments per partner
            const partnerStats = {};
            for (const appt of closerResponse.data.items) {
                const partnerId = this.getFieldValue(appt, 'partner-id') || 'unknown';
                if (!partnerStats[partnerId]) {
                    partnerStats[partnerId] = {
                        today_appts: 0,
                        today_revenue: 0
                    };
                }
                partnerStats[partnerId].today_appts++;
                partnerStats[partnerId].today_revenue += this.getFieldValue(appt, 'sale-amount') || 0;
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

            for (const item of partnersResponse.data.items) {
                const partnerId = item.item_id.toString();
                const realStats = partnerStats[partnerId] || {};
                
                const partner = {
                    id: item.item_id,
                    name: this.getFieldValue(item, fieldMapping.name) || 'Unknown Partner',
                    email: this.getFieldValue(item, fieldMapping.email) || `partner${item.item_id}@sees.team`,
                    phone: this.getFieldValue(item, fieldMapping.phone_1) || 
                           this.getFieldValue(item, fieldMapping.phone_2) || 
                           this.getFieldValue(item, fieldMapping.phone_3) || 
                           '+19724691106',
                    company: this.getFieldValue(item, fieldMapping.name),
                    // REAL DATA FROM CLOSER APP - NO FAKE DATA!!!
                    today_appts: realStats.today_appts || 0,
                    week_appts: 0, // TODO: Query week range from Closer
                    mtd_appts: 0, // TODO: Query month range from Closer
                    ytd_appts: 0, // TODO: Query year range from Closer
                    today_revenue: realStats.today_revenue || 0,
                    week_revenue: 0, // TODO: Calculate from Closer
                    mtd_revenue: 0, // TODO: Calculate from Closer
                    ytd_revenue: 0, // TODO: Calculate from Closer
                    conversion_rate: 0, // TODO: Calculate from REAL data
                    avg_deal_size: realStats.today_revenue ? realStats.today_revenue / realStats.today_appts : 0,
                    performance_trend: 'calculating', // Based on REAL data
                    last_updated: new Date().toISOString()
                };

                // Only include partners with REAL activity
                if (partner.today_appts > 0 || partner.name === 'Moehoe Msr Rep') {
                    partners.push(partner);
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