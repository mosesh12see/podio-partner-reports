# Podio Partner Reports - Deployment Instructions

## System Overview
This automated system generates and sends daily partner performance reports using:
- **Podio**: Data source via Globiflow webhooks
- **Claude AI**: Professional HTML report generation
- **SendGrid**: Email delivery
- **Globiflow/ClickSend**: SMS notifications
- **Render**: Cron job hosting (9pm daily)

## Prerequisites
- GitHub account (gosunlite@gmail.com)
- Render account (gosunlite@gmail.com / rendmy4life!)
- SendGrid API key (if not using mock mode)

## Deployment Steps

### 1. Push to GitHub
```bash
cd ~/Desktop/claude\ ai\ projects/Podio/Globi/

# Create GitHub repository
gh repo create podio-partner-reports --private --source=. --remote=origin --push

# Or manually:
# 1. Create repo at github.com
# 2. git remote add origin https://github.com/gosunlite/podio-partner-reports.git
# 3. git push -u origin main
```

### 2. Deploy to Render

1. **Login to Render**
   - Go to https://dashboard.render.com
   - Login with: gosunlite@gmail.com / rendmy4life!

2. **Create New Cron Job**
   - Click "New +" → "Cron Job"
   - Connect GitHub repository: `podio-partner-reports`
   - Name: `podio-partner-reports`
   - Environment: `Node`
   - Build Command: `npm install`
   - Command: `node src/report-generator.js`
   - Schedule: `0 1 * * *` (1 AM UTC = 9 PM EST)
   - Click "Create Cron Job"

3. **Add SendGrid API Key** (Optional)
   - In Render dashboard → Environment
   - Add: `SENDGRID_API_KEY` = Your SendGrid API key
   - If not added, system will run in mock mode

### 3. Configure Globiflow (Podio)

The system integrates with your existing Globiflow automation:
- Webhook URL: `https://workflow-automation.podio.com/podioajax.php?a=a1716tp4233f3l`
- Commands used:
  - `get_partners_with_appointments`: Retrieve daily partner data
  - `trigger_sms`: Send SMS via ClickSend

### 4. Test the System

**Local Test (Mock Mode):**
```bash
cd ~/Desktop/claude\ ai\ projects/Podio/Globi/
TEST_MODE=true npm start
```

**Production Test (After Deployment):**
- In Render dashboard → "Run Now" button
- Check logs for execution status

### 5. Monitor & Logs

**Render Dashboard:**
- View execution history
- Check logs for each run
- Monitor success/failure rates

**Local Logs:**
- `logs/error.log`: Error details
- `logs/combined.log`: All activity

## Environment Variables

All configured in `render.yaml` except:
- `SENDGRID_API_KEY`: Add manually in Render dashboard

## API Keys & Credentials

From MASTER SECRETS file:
- ✅ Podio Client ID: gpt-operator
- ✅ Podio Client Secret: Configured
- ✅ Podio App ID: 29175634
- ✅ Podio App Token: Configured
- ✅ Anthropic API Key: Configured
- ✅ Globiflow Webhook: Configured
- ⚠️ SendGrid API Key: Add in Render dashboard

## Daily Operation

The system runs automatically at 9 PM EST daily:
1. Queries Podio for partners with appointments
2. Generates HTML reports using Claude AI
3. Sends email reports via SendGrid
4. Triggers SMS notifications via Globiflow/ClickSend
5. Logs all activity for monitoring

## Troubleshooting

**No partners found:**
- Check Podio webhook configuration
- Verify date filtering in Globiflow
- Enable TEST_MODE for mock data

**Email not sending:**
- Verify SendGrid API key in Render
- Check FROM_EMAIL domain verification
- Review logs for specific errors

**Claude API errors:**
- Verify Anthropic API key
- Check API rate limits
- System falls back to mock HTML automatically

## Support

- Render Support: https://render.com/docs
- Podio/Globiflow: Check webhook at Podio dashboard
- Logs: Available in Render dashboard and local `logs/` directory

## Quick Commands

```bash
# Test locally
TEST_MODE=true npm start

# Deploy updates
git add -A && git commit -m "Update" && git push

# View logs (after deployment)
# Go to Render dashboard → Logs
```

---
Generated: September 2, 2025
Location: ~/Desktop/claude ai projects/Podio/Globi/