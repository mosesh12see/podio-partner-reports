const moment = require('moment-timezone');
const crypto = require('crypto');

class SecureReportGenerator {
    generatePartnerReport(partner, date = new Date()) {
        const reportDate = moment(date).tz('America/New_York').format('MMMM D, YYYY');
        const reportTime = moment().tz('America/New_York').format('h:mm A');
        
        // Calculate performance metrics with CORRECT fields
        const sitRate = partner.appts_assigned > 0 
            ? ((partner.appts_sat / partner.appts_assigned) * 100).toFixed(1)
            : 0;
        
        const closeRate = partner.appts_sat > 0
            ? ((partner.deals_closed / partner.appts_sat) * 100).toFixed(1)  
            : 0;
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${partner.name} - Performance Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #333;
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        .header .partner-name {
            color: #667eea;
            font-size: 1.5em;
            font-weight: bold;
        }
        
        .header .timestamp {
            color: #999;
            font-size: 0.9em;
            margin-top: 10px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .metric-card.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .metric-card.success {
            background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
            color: #333;
        }
        
        .metric-card.warning {
            background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            color: #333;
        }
        
        .metric-card h3 {
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            opacity: 0.8;
        }
        
        .metric-card .value {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .metric-card .label {
            font-size: 0.9em;
            opacity: 0.7;
        }
        
        .performance-section {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        
        .performance-section h2 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .rate-display {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
        }
        
        .rate-item {
            text-align: center;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            flex: 1;
            margin: 0 10px;
        }
        
        .rate-item .rate-value {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
        }
        
        .rate-item .rate-label {
            color: #666;
            margin-top: 10px;
            font-size: 1.1em;
        }
        
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .summary-table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #666;
        }
        
        .summary-table td {
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: white;
            opacity: 0.9;
        }
        
        @media (max-width: 768px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            .rate-display {
                flex-direction: column;
            }
            
            .rate-item {
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Performance Report</h1>
            <div class="partner-name">${partner.name}</div>
            <div class="timestamp">Generated: ${reportDate} at ${reportTime} EST</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card primary">
                <h3>Today</h3>
                <div class="value">${partner.today_appts_assigned || 0}</div>
                <div class="label">Appts Assigned</div>
                <div class="label">${partner.today_appts_sat || 0} Sat</div>
            </div>
            
            <div class="metric-card success">
                <h3>This Week</h3>
                <div class="value">${partner.week_appts_assigned || 0}</div>
                <div class="label">Appts Assigned</div>
                <div class="label">${partner.week_deals_closed || 0} Closed</div>
            </div>
            
            <div class="metric-card warning">
                <h3>Month to Date</h3>
                <div class="value">${partner.mtd_appts_assigned || 0}</div>
                <div class="label">Appts Assigned</div>
                <div class="label">${partner.mtd_deals_closed || 0} Closed</div>
            </div>
        </div>
        
        <div class="performance-section">
            <h2>📊 Performance Metrics</h2>
            
            <div class="rate-display">
                <div class="rate-item">
                    <div class="rate-value">${sitRate}%</div>
                    <div class="rate-label">SIT Rate</div>
                </div>
                <div class="rate-item">
                    <div class="rate-value">${closeRate}%</div>
                    <div class="rate-label">CLOSE Rate</div>
                </div>
            </div>
            
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Today</th>
                        <th>Week</th>
                        <th>MTD</th>
                        <th>YTD</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Appts Assigned</strong></td>
                        <td>${partner.today_appts_assigned || 0}</td>
                        <td>${partner.week_appts_assigned || 0}</td>
                        <td>${partner.mtd_appts_assigned || 0}</td>
                        <td>${partner.ytd_appts_assigned || 0}</td>
                    </tr>
                    <tr>
                        <td><strong>Appts Sat</strong></td>
                        <td>${partner.today_appts_sat || 0}</td>
                        <td>${partner.week_appts_sat || 0}</td>
                        <td>${partner.mtd_appts_sat || 0}</td>
                        <td>${partner.ytd_appts_sat || 0}</td>
                    </tr>
                    <tr>
                        <td><strong>Deals Closed</strong></td>
                        <td>${partner.today_deals_closed || 0}</td>
                        <td>${partner.week_deals_closed || 0}</td>
                        <td>${partner.mtd_deals_closed || 0}</td>
                        <td>${partner.ytd_deals_closed || 0}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>© 2025 SEE Solar Partner Reports</p>
            <p>This report is confidential and for ${partner.name} only</p>
        </div>
    </div>
</body>
</html>`;
        
        return html;
    }
    
    generateManagementDashboard(partners, date = new Date()) {
        const reportDate = moment(date).tz('America/New_York').format('MMMM D, YYYY');
        const reportTime = moment().tz('America/New_York').format('h:mm A');
        
        // Calculate overall metrics
        const totals = {
            appts_assigned: partners.reduce((sum, p) => sum + (p.today_appts_assigned || 0), 0),
            appts_sat: partners.reduce((sum, p) => sum + (p.today_appts_sat || 0), 0),
            deals_closed: partners.reduce((sum, p) => sum + (p.today_deals_closed || 0), 0)
        };
        
        const overallSitRate = totals.appts_assigned > 0
            ? ((totals.appts_sat / totals.appts_assigned) * 100).toFixed(1)
            : 0;
            
        const overallCloseRate = totals.appts_sat > 0
            ? ((totals.deals_closed / totals.appts_sat) * 100).toFixed(1)
            : 0;
        
        // Sort partners by performance
        const sortedPartners = partners.sort((a, b) => {
            const aScore = (a.ytd_deals_closed || 0) * 100 + (a.ytd_appts_sat || 0);
            const bScore = (b.ytd_deals_closed || 0) * 100 + (b.ytd_appts_sat || 0);
            return bScore - aScore;
        });
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Management Dashboard - ${reportDate}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            color: #333;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .overview-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .overview-card.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .overview-card h3 {
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
            opacity: 0.8;
        }
        
        .overview-card .value {
            font-size: 2.5em;
            font-weight: bold;
        }
        
        .partners-table {
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        
        .partners-table h2 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #666;
            position: sticky;
            top: 0;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .performance-good {
            color: #2e7d32;
            font-weight: bold;
        }
        
        .performance-warning {
            color: #f57c00;
            font-weight: bold;
        }
        
        .performance-bad {
            color: #c62828;
            font-weight: bold;
        }
        
        @media (max-width: 768px) {
            .overview-grid {
                grid-template-columns: 1fr;
            }
            
            table {
                font-size: 0.85em;
            }
            
            th, td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Management Dashboard</h1>
            <div style="color: #666;">All Partners Performance - ${reportDate} at ${reportTime} EST</div>
        </div>
        
        <div class="overview-grid">
            <div class="overview-card primary">
                <h3>Total Partners</h3>
                <div class="value">${partners.length}</div>
            </div>
            <div class="overview-card">
                <h3>Today's Assigned</h3>
                <div class="value">${totals.appts_assigned}</div>
            </div>
            <div class="overview-card">
                <h3>Today's Sat</h3>
                <div class="value">${totals.appts_sat}</div>
            </div>
            <div class="overview-card">
                <h3>Today's Closed</h3>
                <div class="value">${totals.deals_closed}</div>
            </div>
            <div class="overview-card">
                <h3>Overall SIT Rate</h3>
                <div class="value">${overallSitRate}%</div>
            </div>
            <div class="overview-card">
                <h3>Overall CLOSE Rate</h3>
                <div class="value">${overallCloseRate}%</div>
            </div>
        </div>
        
        <div class="partners-table">
            <h2>📊 All Partners Performance</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Partner</th>
                        <th>Today Assigned</th>
                        <th>Today Sat</th>
                        <th>Today Closed</th>
                        <th>SIT Rate</th>
                        <th>CLOSE Rate</th>
                        <th>YTD Closed</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedPartners.map((p, idx) => {
                        const sitRate = p.today_appts_assigned > 0 
                            ? ((p.today_appts_sat / p.today_appts_assigned) * 100).toFixed(1)
                            : '-';
                        const closeRate = p.today_appts_sat > 0
                            ? ((p.today_deals_closed / p.today_appts_sat) * 100).toFixed(1)
                            : '-';
                        
                        const sitClass = sitRate >= 70 ? 'performance-good' : sitRate >= 50 ? 'performance-warning' : 'performance-bad';
                        const closeClass = closeRate >= 30 ? 'performance-good' : closeRate >= 20 ? 'performance-warning' : 'performance-bad';
                        
                        return `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><strong>${p.name}</strong></td>
                            <td>${p.today_appts_assigned || 0}</td>
                            <td>${p.today_appts_sat || 0}</td>
                            <td>${p.today_deals_closed || 0}</td>
                            <td class="${sitClass}">${sitRate}%</td>
                            <td class="${closeClass}">${closeRate}%</td>
                            <td>${p.ytd_deals_closed || 0}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
        
        return html;
    }
    
    generateSecureToken(partnerId) {
        return crypto.createHash('sha256')
            .update(`${partnerId}-${Date.now()}-${Math.random()}`)
            .digest('hex')
            .substring(0, 16);
    }
}

module.exports = SecureReportGenerator;