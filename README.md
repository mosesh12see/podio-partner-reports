# Podio Partner Reports Automation

Automated daily partner performance reporting system integrating Podio, Claude AI, and email/SMS notifications.

## Features

- 📊 **Daily Performance Reports**: Automatically generated at 9 PM EST
- 🤖 **AI-Powered**: Professional HTML reports created with Claude AI
- 📧 **Email Delivery**: SendGrid integration for reliable email delivery
- 📱 **SMS Notifications**: Globiflow/ClickSend integration for SMS alerts
- 🔄 **Automated Workflow**: Render cron job for scheduled execution
- 📈 **Performance Metrics**: Today/Week/Month/YTD tracking

## Architecture

```
Podio (Data Source)
    ↓
Globiflow Webhook
    ↓
Node.js Application
    ├── Query partner data
    ├── Generate reports (Claude AI)
    ├── Send emails (SendGrid)
    └── Trigger SMS (Globiflow)
```

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Test with mock data
TEST_MODE=true npm start

# Run with live data
npm start
```

### Production Deployment
See [DEPLOYMENT_INSTRUCTIONS.md](./DEPLOYMENT_INSTRUCTIONS.md) for detailed deployment steps.

## Configuration

Environment variables are configured in `.env` (local) and `render.yaml` (production):

- `PODIO_*`: Podio API credentials
- `ANTHROPIC_API_KEY`: Claude AI access
- `SENDGRID_API_KEY`: Email service
- `TIMEZONE`: Report generation timezone
- `TEST_MODE`: Enable mock data for testing

## Project Structure

```
podio-partner-reports/
├── src/
│   ├── report-generator.js    # Main application logic
│   ├── podio-service.js       # Podio/Globiflow integration
│   ├── claude-service.js      # Claude AI report generation
│   └── email-service.js       # SendGrid email delivery
├── logs/                       # Application logs
├── templates/                  # Report templates
├── render.yaml                 # Render deployment config
└── package.json               # Node.js dependencies
```

## Daily Workflow

1. **9:00 PM EST**: Cron job triggers
2. **Data Retrieval**: Fetch partners with daily appointments from Podio
3. **Report Generation**: Create personalized HTML reports using Claude AI
4. **Email Delivery**: Send reports via SendGrid
5. **SMS Notification**: Trigger SMS via Globiflow/ClickSend
6. **Logging**: Record all activity for monitoring

## Monitoring

- **Render Dashboard**: View execution history and logs
- **Local Logs**: Check `logs/` directory for detailed information
- **Test Mode**: Use `TEST_MODE=true` for safe testing

## Technologies

- **Node.js 18+**: Runtime environment
- **Podio/Globiflow**: Data source and workflow automation
- **Claude AI (Anthropic)**: AI-powered report generation
- **SendGrid**: Email delivery service
- **Render**: Cloud hosting and cron jobs
- **Winston**: Logging framework

## License

MIT - SEE Solar

## Support

For issues or questions, check:
- Deployment logs in Render dashboard
- Local logs in `logs/` directory
- Podio webhook configuration
- API key validity