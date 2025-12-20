import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { apiService } from '../services/api';
import { 
  Calendar, Download, FileText, BarChart3, PieChart, 
  Users, CheckCircle, XCircle, Clock, Loader2,
  ChevronLeft, ChevronRight
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

const Reports = () => {
  const { user } = useSelector((state: RootState) => state.data);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  // Weekly state
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    return monday;
  });

  // Monthly state
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    loadReport();
  }, [reportType, currentWeekStart, currentMonth, currentYear]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let data: ReportData;
      if (reportType === 'weekly') {
        const weekStartStr = currentWeekStart.toISOString().split('T')[0];
        data = await apiService.reports.getWeeklyReport(weekStartStr);
      } else {
        data = await apiService.reports.getMonthlyReport(currentYear, currentMonth);
      }
      setReportData(data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getWeekEnd = (startDate: Date) => {
    const end = new Date(startDate);
    end.setDate(startDate.getDate() + 6);
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

    const headers = ['Date', 'Patient Name', 'Gender', 'Email', 'Mobile Number', 'Status', 'Appointment Type', 'Diagnosis', 'Prescription'];
    const rows = reportData.detailedData.map(item => [
      item.date,
      item.patientName,
      item.gender,
      item.email,
      item.mobileNumber,
      item.status,
      item.appointmentType,
      item.diagnosis || '',
      item.prescription || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `appointment-report-${reportType}-${reportData.startDate}-${reportData.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (!reportData) return;

    const element = document.getElementById('report-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Appointment Reports</h1>
          <p className="text-gray-600">View and export appointment statistics</p>
        </div>

        {/* Report Type Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setReportType('weekly')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  reportType === 'weekly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setReportType('monthly')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  reportType === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-4">
              {reportType === 'weekly' ? (
                <>
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-sm font-medium text-gray-700">
                    {formatDate(currentWeekStart.toISOString())} - {formatDate(getWeekEnd(currentWeekStart).toISOString())}
                  </div>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-sm font-medium text-gray-700">
                    {new Date(currentYear, currentMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                disabled={!reportData || loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              <button
                onClick={exportToPDF}
                disabled={!reportData || loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : reportData ? (
          <div id="report-content" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.totalAppointments}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.completedAppointments}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Cancelled</p>
                    <p className="text-2xl font-bold text-red-600">{reportData.cancelledAppointments}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Date Range</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(reportData.startDate)} - {formatDate(reportData.endDate)}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gender Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Gender Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={genderChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genderChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">{reportData.genderWise.Male}</p>
                    <p className="text-gray-600">Male</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-pink-600">{reportData.genderWise.Female}</p>
                    <p className="text-gray-600">Female</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-purple-600">{reportData.genderWise.Other}</p>
                    <p className="text-gray-600">Other</p>
                  </div>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-600" />
                  Status Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBarData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <p className="font-semibold text-yellow-600">{reportData.statusWise.Pending}</p>
                    <p className="text-gray-600">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-blue-600">{reportData.statusWise.Confirmed}</p>
                    <p className="text-gray-600">Confirmed</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-green-600">{reportData.statusWise.Completed}</p>
                    <p className="text-gray-600">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-red-600">{reportData.statusWise.Cancelled}</p>
                    <p className="text-gray-600">Cancelled</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Appointment List</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Gender</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.detailedData.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{formatDate(item.date)}</td>
                        <td className="py-3 px-4 font-medium">{item.patientName}</td>
                        <td className="py-3 px-4">{item.gender}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                            item.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            item.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">{item.appointmentType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No report data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

