const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

const execPromise = util.promisify(exec);

class GitHubPagesUploader {
    constructor() {
        this.repoUrl = 'https://github.com/mosesh12see/podio-partner-reports.git';
        this.ghPagesUrl = 'https://mosesh12see.github.io/podio-partner-reports';
        this.token = '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';
    }
    
    async uploadReport(htmlContent) {
        try {
            const reportDate = moment().tz('America/New_York');
            const filename = `report-${reportDate.format('YYYY-MM-DD-HHmmss')}.html`;
            const latestFilename = 'index.html';
            
            // Save to local reports directory
            const reportsDir = path.join(__dirname, '..', 'reports');
            await fs.mkdir(reportsDir, { recursive: true });
            
            // Save both dated and latest versions
            const reportPath = path.join(reportsDir, filename);
            const latestPath = path.join(reportsDir, latestFilename);
            
            await fs.writeFile(reportPath, htmlContent);
            await fs.writeFile(latestPath, htmlContent);
            
            console.log(`Report saved: ${filename}`);
            
            // Push to GitHub Pages
            const projectDir = path.join(__dirname, '..');
            
            try {
                // Add, commit and push
                await execPromise(`cd "${projectDir}" && git add reports/*.html`);
                await execPromise(`cd "${projectDir}" && git commit -m "Update partner report ${reportDate.format('MMM D, YYYY h:mm A')}"`);
                await execPromise(`cd "${projectDir}" && git push https://${this.token}@github.com/mosesh12see/podio-partner-reports.git main`);
                
                console.log('Report pushed to GitHub');
                
                // Return the public URL
                const publicUrl = `${this.ghPagesUrl}/reports/${filename}`;
                const latestUrl = `${this.ghPagesUrl}/reports/`;
                
                return {
                    success: true,
                    url: latestUrl,
                    directUrl: publicUrl,
                    filename: filename
                };
            } catch (gitError) {
                console.error('Git push failed:', gitError.message);
                // Even if git fails, return local success
                return {
                    success: true,
                    url: `Local report saved: ${filename}`,
                    filename: filename,
                    error: 'GitHub upload failed, report saved locally'
                };
            }
        } catch (error) {
            console.error('Failed to upload report:', error);
            throw error;
        }
    }
    
    async setupGitHubPages() {
        try {
            const projectDir = path.join(__dirname, '..');
            
            // Create gh-pages branch if it doesn't exist
            try {
                await execPromise(`cd "${projectDir}" && git checkout -b gh-pages`);
            } catch (e) {
                // Branch might already exist
                await execPromise(`cd "${projectDir}" && git checkout gh-pages`);
            }
            
            // Create index.html for GitHub Pages
            const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Partner Reports</title>
    <meta http-equiv="refresh" content="0; url=reports/index.html">
</head>
<body>
    <p>Redirecting to latest report...</p>
</body>
</html>`;
            
            await fs.writeFile(path.join(projectDir, 'index.html'), indexHtml);
            
            // Push gh-pages branch
            await execPromise(`cd "${projectDir}" && git add .`);
            await execPromise(`cd "${projectDir}" && git commit -m "Setup GitHub Pages"`);
            await execPromise(`cd "${projectDir}" && git push https://${this.token}@github.com/mosesh12see/podio-partner-reports.git gh-pages`);
            
            // Switch back to main
            await execPromise(`cd "${projectDir}" && git checkout main`);
            
            console.log('GitHub Pages setup complete');
            return true;
        } catch (error) {
            console.error('GitHub Pages setup failed:', error);
            return false;
        }
    }
}

module.exports = GitHubPagesUploader;