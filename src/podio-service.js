const axios = require('axios');
require('dotenv').config();

class PodioService {
    constructor() {
        this.baseUrl = process.env.PODIO_WEBHOOK_URL;
        this.webhookId = process.env.PODIO_WEBHOOK_ID;
        this.clientId = process.env.PODIO_CLIENT_ID;
        this.clientSecret = process.env.PODIO_CLIENT_SECRET;
        this.appToken = process.env.PODIO_APP_TOKEN;
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
            } else if (response.data === 'OK' || !response.data.data) {
                // Webhook returned OK but no data structure, use mock data
                console.log('Using mock data for testing...');
                return this.getMockPartnerData();
            } else {
                console.log('Unexpected response, using mock data');
                return this.getMockPartnerData();
            }
        } catch (error) {
            console.log('Podio API error, using mock data:', error.message);
            return this.getMockPartnerData();
        }
    }

    getMockPartnerData() {
        const today = new Date();
        const mockPartners = [
            {
                id: '12345',
                name: 'John Smith',
                email: 'john@smithenterprises.com',
                phone: '+19724691106',
                logo_url: 'https://example.com/logo1.png',
                company: 'Smith Solar Solutions',
                today_appts: 3,
                week_appts: 12,
                mtd_appts: 45,
                ytd_appts: 234,
                today_revenue: 4500,
                week_revenue: 18000,
                mtd_revenue: 67500,
                ytd_revenue: 351000,
                conversion_rate: 0.73,
                avg_deal_size: 1500,
                top_products: ['Solar Panel Package A', 'Battery Storage System'],
                performance_trend: 'up',
                last_updated: today.toISOString()
            },
            {
                id: '12346',
                name: 'Sarah Johnson',
                email: 'sarah@johnsonassociates.com',
                phone: '+19724691107',
                logo_url: 'https://example.com/logo2.png',
                company: 'Johnson Energy Associates',
                today_appts: 2,
                week_appts: 8,
                mtd_appts: 32,
                ytd_appts: 156,
                today_revenue: 3200,
                week_revenue: 12800,
                mtd_revenue: 48000,
                ytd_revenue: 234000,
                conversion_rate: 0.68,
                avg_deal_size: 1500,
                top_products: ['Solar Panel Package B', 'Smart Inverter'],
                performance_trend: 'stable',
                last_updated: today.toISOString()
            }
        ];

        // Only return partners if in test mode or if we're testing
        if (process.env.TEST_MODE === 'true') {
            return mockPartners;
        }
        
        // In production, return empty if no real data
        return [];
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