import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export async function createEmailTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || process.env.MASTER_EMAIL,
      pass: process.env.GMAIL_PASSWORD || process.env.MASTER_PASSWORD
    }
  });
}

export async function sendDailyAttendanceReport(institutionEmail, institutionName, reportFiles) {
  try {
    const transporter = await createEmailTransport();
    
    const attachments = [];
    
    if (reportFiles.attendancePDF && fs.existsSync(reportFiles.attendancePDF)) {
      attachments.push({
        filename: path.basename(reportFiles.attendancePDF),
        path: reportFiles.attendancePDF
      });
    }
    
    if (reportFiles.latePDF && fs.existsSync(reportFiles.latePDF)) {
      attachments.push({
        filename: path.basename(reportFiles.latePDF),
        path: reportFiles.latePDF
      });
    }
    
    if (reportFiles.absentPDF && fs.existsSync(reportFiles.absentPDF)) {
      attachments.push({
        filename: path.basename(reportFiles.absentPDF),
        path: reportFiles.absentPDF
      });
    }

    const mailOptions = {
      from: process.env.GMAIL_USER || process.env.MASTER_EMAIL,
      to: institutionEmail,
      subject: `Daily Attendance Report - ${institutionName} - ${new Date().toLocaleDateString('en-IN')}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2c3e50;">Daily Attendance Report</h2>
          <p><strong>Institution:</strong> ${institutionName}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleTimeString('en-IN')}</p>
          <hr>
          <p>Please find the daily attendance reports attached (PDF format):</p>
          <ul>
            <li>Attendance Report</li>
            <li>Late Employees Report - if applicable</li>
            <li>Absent Employees Report - if applicable</li>
          </ul>
          <hr>
          <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply to this email.</p>
        </div>
      `,
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${institutionEmail}. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`Error sending email to ${institutionEmail}:`, error.message);
    throw error;
  }
}

export async function sendEmailWithAttachments(recipientEmail, subject, htmlContent, attachments = []) {
  try {
    const transporter = await createEmailTransport();
    
    const validAttachments = attachments.filter(att => !att.path || fs.existsSync(att.path));

    const mailOptions = {
      from: process.env.GMAIL_USER || process.env.MASTER_EMAIL,
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      attachments: validAttachments
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${recipientEmail}. MessageId: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`Error sending email:`, error.message);
    throw error;
  }
}
