const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

class HTMLReportGenerator {
    generateReport(partners, date = new Date()) {
        const reportDate = moment(date).tz('America/New_York').format('MMMM D, YYYY');
        const reportTime = moment().tz('America/New_York').format('h:mm A');
        
        // Calculate totals
        const totals = this.calculateTotals(partners);
        const topPerformers = partners.sort((a, b) => b.ytd_revenue - a.ytd_revenue).slice(0, 10);
        const activeToday = partners.filter(p => p.today_appts > 0);
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Partner Performance Report - ${reportDate}</title>
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
            max-width: 1200px;
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
        
        .header .subtitle {
            color: #666;
            font-size: 1.2em;
        }
        
        .header .timestamp {
            color: #999;
            font-size: 0.9em;
            margin-top: 10px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
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
        
        .section {
            background: white;
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #666;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .table td {
            padding: 12px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .table tr:hover {
            background: #f8f9fa;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
        }
        
        .badge.up {
            background: #d4f4dd;
            color: #2e7d32;
        }
        
        .badge.down {
            background: #ffd4d4;
            color: #c62828;
        }
        
        .badge.stable {
            background: #fff3cd;
            color: #856404;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: white;
            opacity: 0.9;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }
            
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            .table {
                font-size: 0.9em;
            }
            
            .table th, .table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Partner Performance Dashboard</h1>
            <div class="subtitle">${partners.length} Partners</div>
            <div class="timestamp">Generated: ${reportDate} at ${reportTime} EST</div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card primary">
                <h3>Today's Performance</h3>
                <div class="value">${totals.todayAppts}</div>
                <div class="label">Appointments</div>
                <div class="label">$${totals.todayRevenue.toLocaleString()} Revenue</div>
            </div>
            
            <div class="metric-card success">
                <h3>This Week</h3>
                <div class="value">${totals.weekAppts}</div>
                <div class="label">Appointments</div>
                <div class="label">$${totals.weekRevenue.toLocaleString()} Revenue</div>
            </div>
            
            <div class="metric-card warning">
                <h3>Month to Date</h3>
                <div class="value">${totals.mtdAppts}</div>
                <div class="label">Appointments</div>
                <div class="label">$${totals.mtdRevenue.toLocaleString()} Revenue</div>
            </div>
            
            <div class="metric-card">
                <h3>Year to Date</h3>
                <div class="value">${totals.ytdAppts}</div>
                <div class="label">Appointments</div>
                <div class="label">$${totals.ytdRevenue.toLocaleString()} Revenue</div>
            </div>
        </div>
        
        ${activeToday.length > 0 ? `
        <div class="section">
            <h2>🔥 Active Partners Today (${activeToday.length})</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Partner</th>
                        <th>Phone</th>
                        <th>Today</th>
                        <th>Revenue</th>
                        <th>Trend</th>
                    </tr>
                </thead>
                <tbody>
                    ${activeToday.map(p => `
                    <tr>
                        <td><strong>${p.name}</strong></td>
                        <td>${this.formatPhone(p.phone)}</td>
                        <td>${p.today_appts} appts</td>
                        <td>$${(p.today_revenue || 0).toLocaleString()}</td>
                        <td><span class="badge ${p.performance_trend}">${p.performance_trend}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <div class="section">
            <h2>🏆 Top 10 Performers (YTD)</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Partner</th>
                        <th>YTD Appointments</th>
                        <th>YTD Revenue</th>
                        <th>Conversion Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${topPerformers.map((p, idx) => `
                    <tr>
                        <td><strong>#${idx + 1}</strong></td>
                        <td><strong>${p.name}</strong></td>
                        <td>${p.ytd_appts}</td>
                        <td>$${(p.ytd_revenue || 0).toLocaleString()}</td>
                        <td>${((p.conversion_rate || 0) * 100).toFixed(1)}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>© 2025 SEE Solar Partner Reports | Powered by Podio & Claude AI</p>
            <p>Report ID: ${this.generateReportId()}</p>
        </div>
    </div>
</body>
</html>`;
        
        return html;
    }
    
    calculateTotals(partners) {
        return {
            todayAppts: partners.reduce((sum, p) => sum + p.today_appts, 0),
            todayRevenue: partners.reduce((sum, p) => sum + (p.today_revenue || 0), 0),
            weekAppts: partners.reduce((sum, p) => sum + p.week_appts, 0),
            weekRevenue: partners.reduce((sum, p) => sum + (p.week_revenue || 0), 0),
            mtdAppts: partners.reduce((sum, p) => sum + p.mtd_appts, 0),
            mtdRevenue: partners.reduce((sum, p) => sum + (p.mtd_revenue || 0), 0),
            ytdAppts: partners.reduce((sum, p) => sum + p.ytd_appts, 0),
            ytdRevenue: partners.reduce((sum, p) => sum + (p.ytd_revenue || 0), 0)
        };
    }
    
    formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
        }
        return phone;
    }
    
    generateReportId() {
        return `RPT-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    
    async saveReport(html, filename) {
        const reportsDir = path.join(__dirname, '..', 'reports');
        await fs.mkdir(reportsDir, { recursive: true });
        const filepath = path.join(reportsDir, filename);
        await fs.writeFile(filepath, html);
        return filepath;
    }
}

module.exports = HTMLReportGenerator;