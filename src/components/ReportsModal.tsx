import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, addNotification } from '../redux/store';
import { apiService } from '../services/api';
import { 
  Calendar, Download, FileText, BarChart3, PieChart, 
  Users, CheckCircle, XCircle, X, Loader2, TrendingUp,
  ChevronLeft, ChevronRight, Clock, UserCheck
} from 'lucide-react';
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportData {
  totalAppointments: number;
  genderWise: { Male: number; Female: number; Other: number };
  statusWise: { Pending: number; Confirmed: number; Completed: number; Cancelled: number };
  cancelledAppointments: number;
  completedAppointments: number;
  detailedData: Array<{
    date: string;
    patientName: string;
    gender: string;
    email: string;
    mobileNumber: string;
    status: string;
    appointmentType: string;
    diagnosis: string;
    prescription: string;
  }>;
  startDate: string;
  endDate: string;
}

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useSelector((state: RootState) => state.data);
  const dispatch = useDispatch();
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  // Weekly state - start of current week (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to subtract to get Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0); // Ensure start of day
    return monday;
  });

  // Monthly state
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen, reportType, currentWeekStart, currentMonth, currentYear]);

  const loadReport = async () => {
    setLoading(true);
    setReportData(null); // Clear previous data
    try {
      let data: ReportData;
      if (reportType === 'weekly') {
        // Ensure date is at start of day (no time component)
        const weekStart = new Date(currentWeekStart);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        console.log('[ReportsModal] Loading weekly report for:', weekStartStr);
        data = await apiService.reports.getWeeklyReport(weekStartStr);
      } else {
        console.log('[ReportsModal] Loading monthly report for:', currentYear, currentMonth);
        data = await apiService.reports.getMonthlyReport(currentYear, currentMonth);
      }
      
      console.log('[ReportsModal] Report data received:', {
        totalAppointments: data?.totalAppointments,
        detailedDataCount: data?.detailedData?.length,
        genderWise: data?.genderWise,
        statusWise: data?.statusWise,
      });
      
      // Ensure data is valid
      if (data && typeof data.totalAppointments === 'number') {
        // Validate and ensure all required fields exist
        const validatedData: ReportData = {
          totalAppointments: data.totalAppointments || 0,
          genderWise: {
            Male: data.genderWise?.Male || 0,
            Female: data.genderWise?.Female || 0,
            Other: data.genderWise?.Other || 0,
          },
          statusWise: {
            Pending: data.statusWise?.Pending || 0,
            Confirmed: data.statusWise?.Confirmed || 0,
            Completed: data.statusWise?.Completed || 0,
            Cancelled: data.statusWise?.Cancelled || 0,
          },
          cancelledAppointments: data.cancelledAppointments || data.statusWise?.Cancelled || 0,
          completedAppointments: data.completedAppointments || data.statusWise?.Completed || 0,
          detailedData: data.detailedData || [],
          startDate: data.startDate || (reportType === 'weekly' 
            ? currentWeekStart.toISOString().split('T')[0]
            : `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`),
          endDate: data.endDate || (reportType === 'weekly'
            ? getWeekEnd(currentWeekStart).toISOString().split('T')[0]
            : new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]),
        };
        setReportData(validatedData);
      } else {
        console.error('Invalid report data received:', data);
        setReportData({
          totalAppointments: 0,
          genderWise: { Male: 0, Female: 0, Other: 0 },
          statusWise: { Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 },
          cancelledAppointments: 0,
          completedAppointments: 0,
          detailedData: [],
          startDate: reportType === 'weekly' 
            ? currentWeekStart.toISOString().split('T')[0]
            : `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
          endDate: reportType === 'weekly'
            ? getWeekEnd(currentWeekStart).toISOString().split('T')[0]
            : new Date(currentYear, currentMonth, 0).toISOString().split('T')[0],
        });
      }
    } catch (error: any) {
      console.error('Failed to load report:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Set empty data on error
      setReportData({
        totalAppointments: 0,
        genderWise: { Male: 0, Female: 0, Other: 0 },
        statusWise: { Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 },
        cancelledAppointments: 0,
        completedAppointments: 0,
        detailedData: [],
        startDate: reportType === 'weekly' 
          ? currentWeekStart.toISOString().split('T')[0]
          : `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`,
        endDate: reportType === 'weekly'
          ? getWeekEnd(currentWeekStart).toISOString().split('T')[0]
          : new Date(currentYear, currentMonth, 0).toISOString().split('T')[0],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    // Handle both ISO strings and date-only strings
    let date: Date;
    if (dateStr.includes('T')) {
      date = new Date(dateStr);
    } else {
      // If it's a date-only string (YYYY-MM-DD), add time to ensure proper parsing
      date = new Date(dateStr + 'T00:00:00');
    }
    // Ensure we're working with date only (no time component for display)
    date.setHours(0, 0, 0, 0);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getWeekEnd = (startDate: Date) => {
    const end = new Date(startDate);
    end.setDate(startDate.getDate() + 6);
    end.setHours(23, 59, 59, 999); // End of day
    return end;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    // CSV with analytics data only
    const reportPeriod = reportType === 'weekly' 
      ? `Week: ${formatDate(reportData.startDate)} - ${formatDate(reportData.endDate)}`
      : `Month: ${new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    const csvRows = [
      ['Appointment Analytics Report'],
      [reportPeriod],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['SUMMARY STATISTICS'],
      ['Total Appointments', reportData.totalAppointments],
      ['Completed', reportData.completedAppointments],
      ['Cancelled', reportData.cancelledAppointments],
      ['Pending', reportData.statusWise.Pending],
      ['Confirmed', reportData.statusWise.Confirmed],
      [],
      ['GENDER DISTRIBUTION'],
      ['Male', reportData.genderWise.Male],
      ['Female', reportData.genderWise.Female],
      ['Other', reportData.genderWise.Other],
      [],
      ['STATUS DISTRIBUTION'],
      ['Pending', reportData.statusWise.Pending],
      ['Confirmed', reportData.statusWise.Confirmed],
      ['Completed', reportData.statusWise.Completed],
      ['Cancelled', reportData.statusWise.Cancelled],
    ];

    const csvContent = csvRows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `appointment-analytics-${reportType}-${reportData.startDate}-${reportData.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    try {
      // Capture charts as images
      const genderChartElement = document.getElementById('gender-chart-container');
      const statusChartElement = document.getElementById('status-chart-container');
      
      let genderChartImg: string | null = null;
      let statusChartImg: string | null = null;

      if (genderChartElement) {
        const canvas = await html2canvas(genderChartElement, {
          scale: 1.5, // Reduced scale to prevent stretching
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: genderChartElement.offsetWidth,
          height: genderChartElement.offsetHeight,
        });
        genderChartImg = canvas.toDataURL('image/png');
      }

      if (statusChartElement) {
        const canvas = await html2canvas(statusChartElement, {
          scale: 1.5, // Reduced scale to prevent stretching
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: statusChartElement.offsetWidth,
          height: statusChartElement.offsetHeight,
        });
        statusChartImg = canvas.toDataURL('image/png');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
      const margin = 12;
      const contentWidth = pageWidth - (margin * 2); // 186mm
      const footerHeight = 6;
      let yPosition = margin;

      // Fixed heights for consistent layout
      const headerHeight = 20;
      const reportPeriodHeight = 10;
      const sectionTitleHeight = 4;
      const statsHeight = 16;
      const genderHeight = 14;
      const statusHeight = 14;
      const sectionSpacing = 3;

      // Header Section
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, headerHeight, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Appointment Report', margin, 9);
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      const headerSubtext = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report | ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      pdf.text(headerSubtext, margin, 15);

      yPosition = headerHeight + sectionSpacing;

      // Report Period
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, yPosition, contentWidth, reportPeriodHeight, 2, 2, 'F');
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Period:', margin + 3, yPosition + 7);
      pdf.setFont('helvetica', 'normal');
      const periodText = `${formatDate(reportData.startDate)} - ${formatDate(reportData.endDate)}`;
      pdf.text(periodText, margin + 20, yPosition + 7);
      yPosition += reportPeriodHeight + sectionSpacing;

      // Summary Statistics
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Summary Statistics', margin, yPosition);
      yPosition += sectionTitleHeight;

      const stats = [
        { label: 'Total', value: reportData.totalAppointments, color: [37, 99, 235] },
        { label: 'Completed', value: reportData.completedAppointments, color: [16, 185, 129] },
        { label: 'Cancelled', value: reportData.cancelledAppointments, color: [239, 68, 68] },
      ];

      const boxGap = 3;
      const boxWidth = (contentWidth - (boxGap * 2)) / 3;
      stats.forEach((stat, index) => {
        const xPos = margin + (index * (boxWidth + boxGap));
        pdf.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.roundedRect(xPos, yPosition, boxWidth, statsHeight, 2, 2, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.text(stat.label, xPos + 2, yPosition + 5.5);
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(stat.value.toString(), xPos + 2, yPosition + 12);
      });
      yPosition += statsHeight + sectionSpacing;

      // Gender Distribution
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Gender Distribution', margin, yPosition);
      yPosition += sectionTitleHeight;

      const genderData = [
        { label: 'Male', value: reportData.genderWise.Male, color: [59, 130, 246] },
        { label: 'Female', value: reportData.genderWise.Female, color: [236, 72, 153] },
        { label: 'Other', value: reportData.genderWise.Other, color: [139, 92, 246] },
      ];

      genderData.forEach((item, index) => {
        const xPos = margin + (index * (boxWidth + boxGap));
        pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
        pdf.roundedRect(xPos, yPosition, boxWidth, genderHeight, 2, 2, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.label, xPos + 2, yPosition + 5.5);
        
        pdf.setFontSize(10);
        pdf.text(item.value.toString(), xPos + 2, yPosition + 11);
      });
      yPosition += genderHeight + sectionSpacing;

      // Status Distribution
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Status Distribution', margin, yPosition);
      yPosition += sectionTitleHeight;

      const statusData = [
        { label: 'Pending', value: reportData.statusWise.Pending, color: [245, 158, 11] },
        { label: 'Confirmed', value: reportData.statusWise.Confirmed, color: [59, 130, 246] },
        { label: 'Completed', value: reportData.statusWise.Completed, color: [16, 185, 129] },
        { label: 'Cancelled', value: reportData.statusWise.Cancelled, color: [239, 68, 68] },
      ];

      const statusGap = 2.5;
      const statusBoxWidth = (contentWidth - (statusGap * 3)) / 4;
      statusData.forEach((item, index) => {
        const xPos = margin + (index * (statusBoxWidth + statusGap));
        pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
        pdf.roundedRect(xPos, yPosition, statusBoxWidth, statusHeight, 2, 2, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'bold');
        pdf.text(item.label, xPos + 1.5, yPosition + 5.5);
        
        pdf.setFontSize(9.5);
        pdf.text(item.value.toString(), xPos + 1.5, yPosition + 11);
      });
      yPosition += statusHeight + sectionSpacing;

      // Calculate remaining space for charts
      const usedHeight = yPosition - margin;
      const remainingHeight = pageHeight - yPosition - footerHeight - margin;
      const maxChartHeight = Math.min(35, remainingHeight - 10); // Ensure space for footer

      // Helper function to get image dimensions
      const getImageDimensions = (imgData: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.onerror = () => resolve({ width: 0, height: 0 });
          img.src = imgData;
        });
      };

      // Add Charts - Side by side with proper aspect ratio (no stretching)
      if (genderChartImg && statusChartImg) {
        const chartsY = yPosition;
        const chartTitleHeight = 3;
        const chartSpacing = 3;
        const chartWidth = (contentWidth - chartSpacing) / 2;
        
        // Gender Chart - Maintain aspect ratio
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Gender Chart', margin, chartsY);
        
        const genderDims = await getImageDimensions(genderChartImg);
        let maxChartHeightUsed = 0;
        if (genderDims.width > 0 && genderDims.height > 0) {
          const aspectRatio = genderDims.width / genderDims.height;
          const finalChartHeight = Math.min(maxChartHeight, chartWidth / aspectRatio);
          pdf.addImage(genderChartImg, 'PNG', margin, chartsY + chartTitleHeight, chartWidth, finalChartHeight, undefined, 'FAST');
          maxChartHeightUsed = Math.max(maxChartHeightUsed, finalChartHeight);
        }
        
        // Status Chart - Maintain aspect ratio
        pdf.text('Status Chart', margin + chartWidth + chartSpacing, chartsY);
        
        const statusDims = await getImageDimensions(statusChartImg);
        if (statusDims.width > 0 && statusDims.height > 0) {
          const aspectRatio = statusDims.width / statusDims.height;
          const finalChartHeight = Math.min(maxChartHeight, chartWidth / aspectRatio);
          pdf.addImage(statusChartImg, 'PNG', margin + chartWidth + chartSpacing, chartsY + chartTitleHeight, chartWidth, finalChartHeight, undefined, 'FAST');
          maxChartHeightUsed = Math.max(maxChartHeightUsed, finalChartHeight);
        }
        
        yPosition = chartsY + chartTitleHeight + maxChartHeightUsed + sectionSpacing;
      } else if (genderChartImg) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Gender Chart', margin, yPosition);
        yPosition += chartTitleHeight;
        
        const genderDims = await getImageDimensions(genderChartImg);
        if (genderDims.width > 0 && genderDims.height > 0) {
          const aspectRatio = genderDims.width / genderDims.height;
          const finalChartHeight = Math.min(maxChartHeight * 1.5, contentWidth / aspectRatio);
          pdf.addImage(genderChartImg, 'PNG', margin, yPosition, contentWidth, finalChartHeight, undefined, 'FAST');
          yPosition += finalChartHeight + sectionSpacing;
        }
      } else if (statusChartImg) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Status Chart', margin, yPosition);
        yPosition += chartTitleHeight;
        
        const statusDims = await getImageDimensions(statusChartImg);
        if (statusDims.width > 0 && statusDims.height > 0) {
          const aspectRatio = statusDims.width / statusDims.height;
          const finalChartHeight = Math.min(maxChartHeight * 1.5, contentWidth / aspectRatio);
          pdf.addImage(statusChartImg, 'PNG', margin, yPosition, contentWidth, finalChartHeight, undefined, 'FAST');
          yPosition += finalChartHeight + sectionSpacing;
        }
      }

      // Footer
      pdf.setFontSize(6.5);
      pdf.setTextColor(120, 120, 120);
      pdf.setFont('helvetica', 'normal');
      const footerText = `MediNexus Appointment Report | Generated: ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
      const footerWidth = pdf.getTextWidth(footerText);
      pdf.text(footerText, (pageWidth - footerWidth) / 2, pageHeight - 3);

      // Save PDF
      pdf.save(`appointment-report-${reportType}-${reportData.startDate}-${reportData.endDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  // Prepare chart data
  const genderChartData = reportData ? [
    { name: 'Male', value: reportData.genderWise.Male, color: '#3b82f6' },
    { name: 'Female', value: reportData.genderWise.Female, color: '#ec4899' },
    { name: 'Other', value: reportData.genderWise.Other, color: '#8b5cf6' },
  ] : [];

  const statusChartData = reportData ? [
    { name: 'Pending', value: reportData.statusWise.Pending, color: '#f59e0b' },
    { name: 'Confirmed', value: reportData.statusWise.Confirmed, color: '#3b82f6' },
    { name: 'Completed', value: reportData.statusWise.Completed, color: '#10b981' },
    { name: 'Cancelled', value: reportData.statusWise.Cancelled, color: '#ef4444' },
  ] : [];

  const statusBarData = reportData ? Object.entries(reportData.statusWise).map(([name, value]) => ({
    name,
    value,
  })) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enhanced Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <BarChart3 className="w-8 h-8" />
                Appointment Reports
              </h2>
              <p className="text-blue-100 text-sm">Comprehensive analytics and insights</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-110"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Enhanced Controls Bar */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-200 p-5">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Report Type Selector */}
            <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm">
              <button
                onClick={() => setReportType('weekly')}
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  reportType === 'weekly'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Weekly
              </button>
              <button
                onClick={() => setReportType('monthly')}
                className={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  reportType === 'monthly'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Monthly
              </button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl shadow-sm">
              <button
                onClick={() => reportType === 'weekly' ? navigateWeek('prev') : navigateMonth('prev')}
                className="p-2 rounded-lg transition-all duration-200 hover:bg-gray-100 hover:scale-110"
                title="Previous period"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="text-sm font-semibold text-gray-700 min-w-[200px] text-center">
                {reportType === 'weekly' ? (
                  <>
                    {(() => {
                      const weekStart = new Date(currentWeekStart);
                      weekStart.setHours(0, 0, 0, 0);
                      const weekEnd = getWeekEnd(currentWeekStart);
                      weekEnd.setHours(23, 59, 59, 999);
                      return `${formatDate(weekStart.toISOString())} - ${formatDate(weekEnd.toISOString())}`;
                    })()}
                  </>
                ) : (
                  <>
                    {(() => {
                      const monthStart = new Date(currentYear, currentMonth - 1, 1);
                      monthStart.setHours(0, 0, 0, 0);
                      const monthEnd = new Date(currentYear, currentMonth, 0);
                      monthEnd.setHours(23, 59, 59, 999);
                      return `${formatDate(monthStart.toISOString())} - ${formatDate(monthEnd.toISOString())}`;
                    })()}
                  </>
                )}
              </div>
              <button
                onClick={() => reportType === 'weekly' ? navigateWeek('next') : navigateMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                disabled={!reportData || loading}
                className="flex items-center gap-2.5 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-300 shadow-lg shadow-green-500/40 hover:shadow-xl hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transform hover:scale-105 active:scale-95"
                title={`Export ${reportType === 'weekly' ? 'Weekly' : 'Monthly'} Analytics to CSV`}
              >
                <FileText className="w-5 h-5" />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                disabled={!reportData || loading}
                className="flex items-center gap-2.5 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-500/40 hover:shadow-xl hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transform hover:scale-105 active:scale-95"
                title={`Export ${reportType === 'weekly' ? 'Weekly' : 'Monthly'} Analytics with Charts to PDF`}
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
              <p className="text-gray-600 font-medium">Loading report data...</p>
            </div>
          ) : reportData ? (
            <div id="report-content-modal" className="space-y-6">
              {/* Enhanced Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg border border-blue-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-blue-700 mb-1">Total Appointments</p>
                  <p className="text-3xl font-bold text-blue-900">{reportData.totalAppointments}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg border border-green-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-green-600 p-3 rounded-xl shadow-lg">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-green-700 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-900">{reportData.completedAppointments}</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-lg border border-red-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-red-600 p-3 rounded-xl shadow-lg">
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                    <Clock className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-sm font-semibold text-red-700 mb-1">Cancelled</p>
                  <p className="text-3xl font-bold text-red-900">{reportData.cancelledAppointments}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg border border-purple-200 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-purple-600 p-3 rounded-xl shadow-lg">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <Calendar className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-sm font-semibold text-purple-700 mb-1">Date Range</p>
                  <p className="text-xs font-medium text-purple-900 leading-tight">
                    {formatDate(reportData.startDate)}<br />
                    to {formatDate(reportData.endDate)}
                  </p>
                </div>
              </div>

              {/* Enhanced Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                    <div className="bg-blue-100 p-2 rounded-xl">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Gender Distribution</h3>
                      <p className="text-sm text-gray-500">Patient demographics</p>
                    </div>
                  </div>
                  <div id="gender-chart-container" className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={genderChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(1)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {genderChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.75rem',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <p className="text-2xl font-bold text-blue-600">{reportData.genderWise.Male}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Male</p>
                    </div>
                    <div className="text-center p-3 bg-pink-50 rounded-xl">
                      <p className="text-2xl font-bold text-pink-600">{reportData.genderWise.Female}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Female</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-xl">
                      <p className="text-2xl font-bold text-purple-600">{reportData.genderWise.Other}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Other</p>
                    </div>
                  </div>
                </div>

                {/* Status Distribution */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                    <div className="bg-purple-100 p-2 rounded-xl">
                      <PieChart className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Status Distribution</h3>
                      <p className="text-sm text-gray-500">Appointment status breakdown</p>
                    </div>
                  </div>
                  <div id="status-chart-container" className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.75rem',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          radius={[8, 8, 0, 0]}
                          fill="url(#colorGradient)"
                        >
                          {statusBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={statusChartData[index]?.color || '#3b82f6'} />
                          ))}
                        </Bar>
                        <defs>
                          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7}/>
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 grid grid-cols-4 gap-2 pt-4 border-t border-gray-200">
                    <div className="text-center p-2 bg-yellow-50 rounded-lg">
                      <p className="text-lg font-bold text-yellow-600">{reportData.statusWise.Pending}</p>
                      <p className="text-xs font-semibold text-gray-600">Pending</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{reportData.statusWise.Confirmed}</p>
                      <p className="text-xs font-semibold text-gray-600">Confirmed</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{reportData.statusWise.Completed}</p>
                      <p className="text-xs font-semibold text-gray-600">Completed</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <p className="text-lg font-bold text-red-600">{reportData.statusWise.Cancelled}</p>
                      <p className="text-xs font-semibold text-gray-600">Cancelled</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Detailed Table */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Detailed Appointment List
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{reportData.detailedData.length} appointments found</p>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="text-left py-4 px-6 font-bold text-gray-700 text-xs uppercase tracking-wider">Date</th>
                          <th className="text-left py-4 px-6 font-bold text-gray-700 text-xs uppercase tracking-wider">Patient</th>
                          <th className="text-left py-4 px-6 font-bold text-gray-700 text-xs uppercase tracking-wider">Gender</th>
                          <th className="text-left py-4 px-6 font-bold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                          <th className="text-left py-4 px-6 font-bold text-gray-700 text-xs uppercase tracking-wider">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {reportData.detailedData.map((item, index) => (
                          <tr key={index} className="hover:bg-blue-50/50 transition-colors duration-150">
                            <td className="py-4 px-6 font-medium text-gray-900">{formatDate(item.date)}</td>
                            <td className="py-4 px-6">
                              <div className="font-semibold text-gray-900">{item.patientName}</div>
                              <div className="text-xs text-gray-500">{item.email}</div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {item.gender}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                                item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                item.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                item.status === 'Confirmed' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {item.appointmentType}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-16 text-center">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Report Data Available</h3>
              <p className="text-gray-600">There are no appointments for the selected period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;
