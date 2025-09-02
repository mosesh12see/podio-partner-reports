const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class ClaudeService {
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        this.templatePath = path.join(__dirname, '../templates/email-template-prompt.txt');
    }

    async generateReport(partnerData) {
        try {
            // Load template
            const template = await this.loadTemplate();
            
            // Replace template variables
            const prompt = this.replaceTemplateVariables(template, partnerData);
            
            // Call Claude API
            const message = await this.anthropic.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                temperature: 0.7,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            // Extract HTML content from response
            const htmlContent = message.content[0].text;
            
            // Ensure it's valid HTML
            if (!htmlContent.includes('<html') && !htmlContent.includes('<!DOCTYPE')) {
                return this.wrapInHtmlTemplate(htmlContent, partnerData);
            }

            return htmlContent;
        } catch (error) {
            console.error('Claude API error:', error.message);
            // Fallback to enhanced mock HTML
            return this.getEnhancedMockReportHtml(partnerData);
        }
    }

    async loadTemplate() {
        try {
            return await fs.readFile(this.templatePath, 'utf8');
        } catch (error) {
            // Return enhanced default template if file doesn't exist
            return this.getDefaultTemplate();
        }
    }

    getDefaultTemplate() {
        return `Create a professional, modern HTML email report for a solar energy partner with the following data:

PARTNER INFORMATION:
Name: {{partner_name}}
Company: {{partner_company}}
Logo URL: {{partner_logo_url}}
Report Date: {{current_date}}

PERFORMANCE METRICS:
Today's Performance:
- Appointments: {{today_appts}}
- Revenue: ${{today_revenue}}

This Week:
- Appointments: {{week_appts}}
- Revenue: ${{week_revenue}}

Month-to-Date:
- Appointments: {{mtd_appts}}
- Revenue: ${{mtd_revenue}}

Year-to-Date:
- Appointments: {{ytd_appts}}
- Revenue: ${{ytd_revenue}}

Additional Metrics:
- Conversion Rate: {{conversion_rate}}%
- Average Deal Size: ${{avg_deal_size}}
- Performance Trend: {{performance_trend}}

DESIGN REQUIREMENTS:
1. Create a visually stunning, mobile-responsive HTML email
2. Use a modern gradient header with the partner's logo
3. Display metrics in card-style components with icons
4. Use green for positive metrics, blue for informational
5. Include charts or visual representations where appropriate
6. Add motivational messaging based on performance
7. Include a professional footer with contact information
8. Use modern CSS with flexbox/grid layouts
9. Ensure compatibility with major email clients
10. Add subtle animations and hover effects

The HTML should be complete, production-ready, and render beautifully in all email clients. Include all CSS inline for maximum compatibility.`;
    }

    replaceTemplateVariables(template, data) {
        const replacements = {
            '{{partner_name}}': data.name || 'Partner',
            '{{partner_company}}': data.company || data.name || 'Company',
            '{{partner_logo_url}}': data.logo_url || '',
            '{{current_date}}': new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            }),
            '{{today_appts}}': data.today_appts || 0,
            '{{today_revenue}}': (data.today_revenue || 0).toLocaleString(),
            '{{week_appts}}': data.week_appts || 0,
            '{{week_revenue}}': (data.week_revenue || 0).toLocaleString(),
            '{{mtd_appts}}': data.mtd_appts || 0,
            '{{mtd_revenue}}': (data.mtd_revenue || 0).toLocaleString(),
            '{{ytd_appts}}': data.ytd_appts || 0,
            '{{ytd_revenue}}': (data.ytd_revenue || 0).toLocaleString(),
            '{{conversion_rate}}': Math.round((data.conversion_rate || 0.7) * 100),
            '{{avg_deal_size}}': (data.avg_deal_size || 1500).toLocaleString(),
            '{{performance_trend}}': data.performance_trend || 'stable'
        };

        let result = template;
        for (const [key, value] of Object.entries(replacements)) {
            result = result.replace(new RegExp(key, 'g'), value);
        }
        return result;
    }

    wrapInHtmlTemplate(content, partnerData) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Performance Report - ${partnerData.name}</title>
</head>
<body>
    ${content}
</body>
</html>`;
    }

    getEnhancedMockReportHtml(partnerData) {
        const date = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Performance Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
            background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        .header h2 {
            font-size: 20px;
            opacity: 0.95;
            font-weight: 500;
        }
        .header .date {
            margin-top: 10px;
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            padding: 30px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .metric-card {
            background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .metric-card.highlight {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border: 2px solid #3b82f6;
        }
        .metric-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        .metric-value {
            font-size: 32px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 5px;
        }
        .metric-revenue {
            font-size: 18px;
            color: #16a34a;
            font-weight: 600;
        }
        .performance-summary {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            padding: 25px;
            border-radius: 15px;
            margin-top: 30px;
            text-align: center;
        }
        .performance-summary h3 {
            color: #92400e;
            margin-bottom: 10px;
            font-size: 20px;
        }
        .performance-summary p {
            color: #78350f;
            font-size: 16px;
            line-height: 1.6;
        }
        .footer {
            background: #f9fafb;
            padding: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .footer a {
            color: #3b82f6;
            text-decoration: none;
        }
        .trend-indicator {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 10px;
        }
        .trend-up {
            background: #dcfce7;
            color: #16a34a;
        }
        .trend-stable {
            background: #dbeafe;
            color: #3b82f6;
        }
        @media (max-width: 480px) {
            .metrics-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Daily Performance Report</h1>
            <h2>${partnerData.name}</h2>
            <div class="date">${date}</div>
        </div>
        
        <div class="content">
            <div class="metrics-grid">
                <div class="metric-card highlight">
                    <div class="metric-label">Today</div>
                    <div class="metric-value">${partnerData.today_appts}</div>
                    <div class="metric-revenue">$${(partnerData.today_revenue || 0).toLocaleString()}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">This Week</div>
                    <div class="metric-value">${partnerData.week_appts}</div>
                    <div class="metric-revenue">$${(partnerData.week_revenue || 0).toLocaleString()}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Month-to-Date</div>
                    <div class="metric-value">${partnerData.mtd_appts}</div>
                    <div class="metric-revenue">$${(partnerData.mtd_revenue || 0).toLocaleString()}</div>
                </div>
                
                <div class="metric-card">
                    <div class="metric-label">Year-to-Date</div>
                    <div class="metric-value">${partnerData.ytd_appts}</div>
                    <div class="metric-revenue">$${(partnerData.ytd_revenue || 0).toLocaleString()}</div>
                </div>
            </div>
            
            <div class="performance-summary">
                <h3>Outstanding Performance!</h3>
                <p>
                    ${partnerData.today_appts > 0 ? 
                        `Great work today with ${partnerData.today_appts} appointment${partnerData.today_appts > 1 ? 's' : ''}! ` : 
                        'Keep pushing forward! '}
                    Your year-to-date performance of ${partnerData.ytd_appts} appointments 
                    generating $${(partnerData.ytd_revenue || 0).toLocaleString()} in revenue 
                    shows your dedication to excellence.
                </p>
                <span class="trend-indicator ${partnerData.performance_trend === 'up' ? 'trend-up' : 'trend-stable'}">
                    ${partnerData.performance_trend === 'up' ? '📈 Trending Up' : '📊 Stable Performance'}
                </span>
            </div>
        </div>
        
        <div class="footer">
            <p>
                This report was automatically generated for ${partnerData.company || partnerData.name}<br>
                For questions or support, contact <a href="mailto:support@sees.team">support@sees.team</a><br>
                <br>
                © 2025 SEE Solar - Partner Performance Reports
            </p>
        </div>
    </div>
</body>
</html>`;
    }
}

module.exports = ClaudeService;