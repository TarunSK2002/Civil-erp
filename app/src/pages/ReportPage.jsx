import React, { useState, useEffect } from 'react';
import { BarChart3, Building2, HardHat, Loader2 } from 'lucide-react';
import api from '../api/axios';
import SiteReportView from './SiteReportView';
import LabourReportView from './LabourReportView';
import './ReportPage.css';

const ReportPage = () => {
  const [reportType, setReportType] = useState('site'); // site | labour
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const res = await api.get('/sites');
      setSites(res.data);
    } catch (err) {
      console.error('Failed to fetch sites', err);
    } finally {
      setLoadingSites(false);
    }
  };

  if (loadingSites) {
    return (
      <div className="report-page">
        <div className="report-loading"><Loader2 size={32} className="report-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* Header */}
      <div className="report-header">
        <div>
          <h1>Reports</h1>
          <p>Financial reports, labour analysis, and site-wise breakdowns.</p>
        </div>
        <div className="report-type-selector">
          <button
            className={`report-type-btn ${reportType === 'site' ? 'active' : ''}`}
            onClick={() => setReportType('site')}
          >
            <Building2 size={18} /> Site Report
          </button>
          <button
            className={`report-type-btn ${reportType === 'labour' ? 'active' : ''}`}
            onClick={() => setReportType('labour')}
          >
            <HardHat size={18} /> Labour Report
          </button>
        </div>
      </div>

      {/* Content */}
      {reportType === 'site' && <SiteReportView sites={sites} />}
      {reportType === 'labour' && <LabourReportView sites={sites} />}
    </div>
  );
};

export default ReportPage;
