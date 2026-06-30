import { sendDailyAttendanceReport, sendEmailWithAttachments } from '../services/emailService.js';
import fs from 'fs';
import path from 'path';

export async function sendDailyReportsManual(req, res) {
  try {
    const { institutionId } = req.params;
    const { models, institution } = req.institutionDb;

    if (!institution.organizationEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Organization email not configured for this institution' 
      });
    }

    const reportFiles = {
      attendanceExcel: null,
      lateExcel: null,
      absentExcel: null
    };

    const reportsDir = path.join(process.cwd(), 'public', 'reports');
    const datePattern = new Date().toISOString().split('T')[0];

    const files = fs.readdirSync(reportsDir).filter(f => f.includes(institutionId) && f.includes(datePattern));

    for (const file of files) {
      const filePath = path.join(reportsDir, file);
      if (file.includes('attendance_') && file.endsWith('.xlsx')) {
        reportFiles.attendanceExcel = filePath;
      } else if (file.includes('late_') && file.endsWith('.xlsx')) {
        reportFiles.lateExcel = filePath;
      } else if (file.includes('absent_') && file.endsWith('.xlsx')) {
        reportFiles.absentExcel = filePath;
      }
    }

    await sendDailyAttendanceReport(
      institution.organizationEmail,
      institution.name,
      reportFiles
    );

    res.json({
      success: true,
      message: `Daily reports sent to ${institution.organizationEmail}`,
      recipientEmail: institution.organizationEmail
    });

  } catch (error) {
    console.error('Error sending daily reports:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}

export async function sendCustomEmail(req, res) {
  try {
    const { institutionId } = req.params;
    const { recipientEmail, subject, htmlContent, attachmentPaths } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'recipientEmail is required' 
      });
    }

    const attachments = [];
    if (attachmentPaths && Array.isArray(attachmentPaths)) {
      for (const filePath of attachmentPaths) {
        if (fs.existsSync(filePath)) {
          attachments.push({
            filename: path.basename(filePath),
            path: filePath
          });
        }
      }
    }

    await sendEmailWithAttachments(
      recipientEmail,
      subject || 'Attendance Report',
      htmlContent || '<p>Please see attached reports.</p>',
      attachments
    );

    res.json({
      success: true,
      message: `Email sent to ${recipientEmail}`,
      attachmentsCount: attachments.length
    });

  } catch (error) {
    console.error('Error sending custom email:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
}

export default {
  sendDailyReportsManual,
  sendCustomEmail
};
