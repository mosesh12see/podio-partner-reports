#!/usr/bin/env node

const { PartnerReportGenerator } = require('./src/report-generator');

console.log('🚀 Testing Podio Partner Reports...');
console.log('⏰ This will generate reports for all partners with today\'s data');
console.log('📊 Reports will be sent to management phones');
console.log('');

const generator = new PartnerReportGenerator();

generator.generateDailyReports()
    .then((result) => {
        console.log('✅ Report generation completed!');
        console.log(`📊 Partners processed: ${result.results.length}`);
        console.log(`✅ Successful: ${result.results.filter(r => r.status === 'success').length}`);
        console.log(`❌ Errors: ${result.results.filter(r => r.status === 'error').length}`);
        console.log(`⏱️  Duration: ${result.duration} seconds`);
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Report generation failed:', error.message);
        process.exit(1);
    });