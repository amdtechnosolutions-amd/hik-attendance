import { getCompOffStats, getUserCompOffDetailsForMonth } from '../services/compOffReportService.js';
import PDFDocument from "pdfkit";
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';


export const getMonthlyCompOffReport = async (req, res) => {
  try {
    const { institutionId, userId } = req.params;
    const { month, year } = req.query;
    const { models } = req.institutionDb;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: month, year'
      });
    }

    const User = models.User;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const stats = await getCompOffStats(models, institutionId, userId, parseInt(month), parseInt(year));
    const details = await getUserCompOffDetailsForMonth(models, institutionId, userId, parseInt(month), parseInt(year));

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          employeeNo: user.employeeNo,
          name: user.name
        },
        stats,
        details
      }
    });
  } catch (error) {
    console.error('Error fetching monthly CompOff report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CompOff report',
      error: error.message
    });
  }
};

export const getInstitutionCompOffSummary = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { month, year } = req.query;
    const { models } = req.institutionDb;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: month, year'
      });
    }

    const CompOff = models.CompOff;
    const User = models.User;
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    const users = await User.find({ institutionId });
    const summary = [];

    for (const user of users) {
      const earned = await CompOff.countDocuments({
        institutionId,
        userId: user._id,
        earnedDate: {
          $gte: startDate,
          $lte: endDate
        }
      });

      const used = await CompOff.countDocuments({
        institutionId,
        userId: user._id,
        usedDate: {
          $gte: startDate,
          $lte: endDate
        },
        status: 'used'
      });

      const available = await CompOff.countDocuments({
        institutionId,
        userId: user._id,
        status: 'available'
      });

      if (earned > 0 || used > 0 || available > 0) {
        summary.push({
          userId: user._id,
          employeeNo: user.employeeNo,
          name: user.name,
          earned,
          used,
          available,
          balance: available
        });
      }
    }

    const monthName = startDate.toLocaleString('default', { month: 'long' });

    // reports directory
    const reportsDir = path.join(process.cwd(), "public", "reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const timestamp = Date.now();
    const pdfFileName = `compoff_report_${institutionId}_${timestamp}.pdf`;
    const excelFileName = `compoff_report_${institutionId}_${timestamp}.xlsx`;
    const pdfFilePath = path.join(reportsDir, pdfFileName);
    const excelFilePath = path.join(reportsDir, excelFileName);

    // --- PDF Generation ---
    const generatePDF = () => new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const stream = fs.createWriteStream(pdfFilePath);
        doc.pipe(stream);

        // Header
        let y = 20;
        const logoPath = path.join(process.cwd(), "public", "logo.png");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, (doc.page.width - 50) / 2, y, { width: 50, height: 50 });
          y += 60; // 50 height + spacing
        } else {
          y += 20;
        }

        const instName = req.institutionDb.institution?.name || "Institution";
        doc.fontSize(14).font("Helvetica-Bold").text(instName, 0, y, { align: "center", width: doc.page.width });
        y += 20;
        doc.fontSize(12).font("Helvetica").text(`CompOff Report - ${monthName} ${year}`, 0, y, { align: "center", width: doc.page.width });
        doc.moveDown(2);

        // Table configuration
        const startX = 50;
        let currentY = doc.y + 10;
        const rowHeight = 25;
        const colWidths = [80, 150, 80, 80, 80]; // EmpNo, Name, Earned, Used, Balance
        const headers = ["Employee No", "Name", "Earned", "Used", "Balance"];

        // Draw Table Header
        const drawTableHeader = (y) => {
          let x = startX;
          doc.fontSize(10).font("Helvetica-Bold");

          headers.forEach((header, i) => {
            doc.rect(x, y, colWidths[i], rowHeight).fill("#4F81BD").stroke();
            doc.fillColor("white").text(header, x + 5, y + 8, { width: colWidths[i] - 10, align: "center" });
            x += colWidths[i];
          });
          doc.fillColor("black");
        };

        drawTableHeader(currentY);
        currentY += rowHeight;

        summary.forEach((row, index) => {
          // Check for page break
          if (currentY + rowHeight > doc.page.height - 50) {
            doc.addPage();
            currentY = 50;
            drawTableHeader(currentY);
            currentY += rowHeight;
          }

          let x = startX;
          doc.fontSize(10).font("Helvetica");

          // Alternating row background
          if (index % 2 === 1) {
            doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill("#F2F2F2");
          }

          doc.fillColor("black");

          // Draw cells
          const cellValues = [row.employeeNo, row.name.toUpperCase(), row.earned, row.used, row.balance];
          cellValues.forEach((val, i) => {
            doc.rect(x, currentY, colWidths[i], rowHeight).stroke();
            doc.text(val.toString(), x + 5, currentY + 8, { width: colWidths[i] - 10, align: i === 1 ? "left" : "center" });
            x += colWidths[i];
          });

          currentY += rowHeight;
        });

        doc.end();
        stream.on("finish", resolve);
        stream.on("error", reject);
      } catch (err) {
        reject(err);
      }
    });

    // --- Excel Generation ---
    const generateExcel = async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('CompOff Report');

      // Headers
      worksheet.columns = [
        { header: 'Employee No', key: 'employeeNo', width: 15 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Earned', key: 'earned', width: 15 },
        { header: 'Used', key: 'used', width: 15 },
        { header: 'Balance', key: 'balance', width: 15 }
      ];

      // Style Header
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };

      // Add Data
      summary.forEach(row => {
        worksheet.addRow({
          employeeNo: row.employeeNo,
          name: row.name.toUpperCase(),
          earned: row.earned,
          used: row.used,
          balance: row.balance
        });
      });

      await workbook.xlsx.writeFile(excelFilePath);
    };

    // Execute generations
    await Promise.all([generatePDF(), generateExcel()]);

    res.status(200).json({
      success: true,
      month: parseInt(month),
      year: parseInt(year),
      totalUsers: summary.length,
      data: summary,
      pdfDownloadUrl: `/reports/${pdfFileName}`,
      excelDownloadUrl: `/reports/${excelFileName}`
    });
  } catch (error) {
    console.error('Error fetching institution CompOff summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CompOff summary',
      error: error.message
    });
  }
};

export const getCompOffHistoryForUser = async (req, res) => {
  try {
    const { institutionId, userId } = req.params;
    const { models } = req.institutionDb;
    const { status } = req.query;

    const CompOff = models.CompOff;

    let query = { institutionId, userId };
    if (status) query.status = status;

    const history = await CompOff.find(query)
      .populate('userId', 'name employeeNo')
      .populate('createdBy', 'name employeeNo')
      .sort({ earnedDate: -1 });

    const summary = {
      total: history.length,
      available: history.filter(c => c.status === 'available').length,
      used: history.filter(c => c.status === 'used').length,
      cancelled: history.filter(c => c.status === 'cancelled').length
    };

    res.status(200).json({
      success: true,
      summary,
      data: history
    });
  } catch (error) {
    console.error('Error fetching CompOff history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CompOff history',
      error: error.message
    });
  }
};



export default {
  getMonthlyCompOffReport,
  getInstitutionCompOffSummary,
  getCompOffHistoryForUser
};

