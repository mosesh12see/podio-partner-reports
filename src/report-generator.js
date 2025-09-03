const axios = require('axios');
const moment = require('moment-timezone');
const winston = require('winston');
const cron = require('node-cron');
require('dotenv').config();

const PodioService = require('./podio-service');
const ClaudeService = require('./claude-service');
const ReportService = require('./report-service');
const SMSService = require('./sms-service');

// Configure logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: './logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

class PartnerReportGenerator {
    constructor() {
        this.podioService = new PodioService();
        this.claudeService = new ClaudeService();
        this.reportService = new ReportService();
        this.smsService = new SMSService();
        this.testMode = process.env.TEST_MODE === 'true';
    }

    async generateDailyReports() {
        const startTime = new Date();
        logger.info('Starting daily partner report generation...', { 
            testMode: this.testMode,
            timestamp: startTime.toISOString()
        });

        try {
            // Get partners who had appointments today
            const todayDate = moment().tz(process.env.TIMEZONE || 'America/New_York').format('YYYY-MM-DD');
            logger.info(`Fetching partners with appointments for ${todayDate}...`);
            
            const partnersData = await this.podioService.getPartnersWithAppointments(todayDate);
            logger.info(`Found ${partnersData.length} partners with appointments today`);

            if (partnersData.length === 0) {
                logger.info('No partners with appointments today. Exiting gracefully.');
                return { success: true, message: 'No partners to process' };
            }

            // Process each partner
            const results = [];
            for (const partner of partnersData) {
                try {
                    logger.info(`Processing report for ${partner.name}...`);
                    
                    // Generate HTML report with Claude
                    const reportHtml = await this.claudeService.generateReport(partner);
                    
                    if (!this.testMode) {
                        // Send SMS report
                        await this.reportService.sendReport(partner, reportHtml);
                        logger.info(`SMS sent to ${partner.phone}`);
                        
                        // Trigger SMS via Globiflow webhook
                        await this.triggerSMSNotification(partner);
                        logger.info(`SMS notification triggered for ${partner.phone}`);
                        
                        // Send management oversight notifications
                        await this.sendManagementNotifications(partner);
                        logger.info(`Management notifications sent for ${partner.name}`);
                    } else {
                        logger.info(`TEST MODE: Would send email to ${partner.email}`);
                        logger.info(`   - Today's appointments: ${partner.today_appts}`);
                        logger.info(`   - YTD appointments: ${partner.ytd_appts}`);
                    }
                    
                    results.push({
                        partner: partner.name,
                        status: 'success',
                        email: partner.email
                    });
                    
                } catch (error) {
                    logger.error(`Error processing ${partner.name}:`, error);
                    results.push({
                        partner: partner.name,
                        status: 'error',
                        error: error.message
                    });
                }
                
                // Small delay between partners
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const endTime = new Date();
            const duration = Math.round((endTime - startTime) / 1000);
            
            logger.info('Daily report generation completed!', {
                totalPartners: partnersData.length,
                successful: results.filter(r => r.status === 'success').length,
                errors: results.filter(r => r.status === 'error').length,
                duration: `${duration} seconds`,
                results
            });

            return {
                success: true,
                results,
                duration
            };

        } catch (error) {
            logger.error('Fatal error in report generation:', error);
            throw error;
        }
    }

    async triggerSMSNotification(partner) {
        try {
            // Using Twilio now, handled by email-service.js
            console.log(`SMS handled by Twilio for ${partner.name}`);
        } catch (error) {
            logger.error('Failed to trigger SMS:', error.message);
        }
    }

    async sendManagementNotifications(partner) {
        try {
            const managementConfig = require('../config/credentials.json').management;
            
            if (!managementConfig.enable_oversight) {
                return;
            }

            const managementMessage = `Report: ${partner.name}\nToday: ${partner.today_appts} appts\nYTD: ${partner.ytd_appts}\nRevenue: $${(partner.ytd_revenue || 0).toLocaleString()}`;

            // Send to Abraham via Twilio
            const abrahamResult = await this.smsService.sendSMS(
                managementConfig.abraham_herrera_phone,
                `[ABRAHAM] ${managementMessage}`
            );
            
            // Send to Moehoe via Twilio
            const moehoeResult = await this.smsService.sendSMS(
                managementConfig.moehoe_phone,
                `[MOEHOE] ${managementMessage}`
            );

            logger.info('Management SMS sent via Twilio', {
                partner: partner.name,
                abraham: abrahamResult.success ? 'sent' : 'failed',
                moehoe: moehoeResult.success ? 'sent' : 'failed'
            });

        } catch (error) {
            logger.error('Failed to send management notifications:', error.message);
        }
    }

    startCronJob() {
        const cronTime = '0 21 * * *'; // 9 PM daily
        
        logger.info(`Setting up cron job for ${cronTime}`);
        
        cron.schedule(cronTime, async () => {
            logger.info('Cron job triggered');
            try {
                await this.generateDailyReports();
            } catch (error) {
                logger.error('Cron job failed:', error);
            }
        }, {
            scheduled: true,
            timezone: process.env.TIMEZONE || 'America/New_York'
        });

        logger.info('Cron job scheduled successfully');
    }
}

// Export for Render deployment
async function handler(req, res) {
    const generator = new PartnerReportGenerator();
    
    try {
        const result = await generator.generateDailyReports();
        
        if (res) {
            res.status(200).json({
                success: true,
                message: 'Reports generated successfully',
                ...result
            });
        }
        
        return result;
    } catch (error) {
        logger.error('Handler error:', error);
        
        if (res) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
        
        throw error;
    }
}

// Run the report generator
if (require.main === module) {
    const generator = new PartnerReportGenerator();
    
    // Check for command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--cron')) {
        // Start cron job for scheduled execution
        generator.startCronJob();
        logger.info('Partner report scheduler started. Running daily at 9 PM.');
        
        // Keep process alive
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            process.exit(0);
        });
    } else {
        // Run once immediately
        generator.generateDailyReports()
            .then(() => {
                logger.info('Process completed successfully');
                process.exit(0);
            })
            .catch((error) => {
                logger.error('Process failed:', error);
                process.exit(1);
            });
    }
}

module.exports = { PartnerReportGenerator, handler };