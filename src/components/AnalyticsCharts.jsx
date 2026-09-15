import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { PieChart as PieIcon, BarChart3, TrendingUp, Users } from 'lucide-react';
import { getCategoryBadgeStyle } from '../utils/helpers';

export default function AnalyticsCharts({ metrics, trendData, selectedWeek }) {
  const { total, reported, notReported, categoryChartData, lecturerChartData } = metrics;
  const [activeTab, setActiveTab] = useState('stages'); // 'stages' | 'lecturers'

  const pieData = [
    { name: 'Sudah Melapor', value: reported, color: '#10b981' },
    { name: 'Belum Melapor', value: notReported, color: '#f43f5e' }
  ];

  const getCatColor = (catName) => {
    return getCategoryBadgeStyle(catName).hex;
  };

  const topLecturers = (lecturerChartData || []).slice(0, 7);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Donut Chart - Kepatuhan Melapor */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <PieIcon className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Kepatuhan Pelaporan
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-medium">Pekan Ini</span>
        </div>

        <div className="h-52 w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  `${value} Mahasiswa (${Math.round((value / (total || 1)) * 100)}%)`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Centered label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-slate-900">
              {metrics.percentage}%
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Tingkat Lapor
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs mt-1 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 font-medium">Sudah ({reported})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <span className="text-slate-600 font-medium">Belum ({notReported})</span>
          </div>
        </div>
      </div>

      {/* 2. Bar Chart - Distribusi Tahapan / Sebaran Dosen */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              {activeTab === 'stages' ? 'Distribusi Tahapan TA' : 'Sebaran Dosen Pembimbing'}
            </h4>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-[10px]">
            <button
              onClick={() => setActiveTab('stages')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                activeTab === 'stages'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tahapan
            </button>
            <button
              onClick={() => setActiveTab('lecturers')}
              className={`px-2 py-0.5 rounded font-medium transition-colors ${
                activeTab === 'lecturers'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Dosen
            </button>
          </div>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'stages' ? (
              <BarChart
                data={categoryChartData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10, fill: '#475569' }}
                />
                <Tooltip formatter={(val) => [`${val} Mahasiswa`, 'Jumlah']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={getCatColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                data={topLecturers}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 9, fill: '#475569' }}
                  tickFormatter={(val) => val.split(',')[0]}
                />
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val} Mahasiswa (${item.payload.reported} Sudah Lapor)`,
                    'Total Bimbingan'
                  ]}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} fill="#4f46e5" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-3">
          {activeTab === 'stages'
            ? 'Memetakan fokus mahasiswa mulai dari Proposal, Coding, hingga Bab 4'
            : 'Distribusi bimbingan mahasiswa per dosen pembimbing utama di Prodi'}
        </p>
      </div>

      {/* 3. Trend Chart - Perkembangan Kepatuhan Antar Pekan */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Tren Pelaporan Mingguan
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-medium">Lintas Pekan</span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <YAxis
                domain={[0, total]}
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <Tooltip
                formatter={(val, name) => [
                  `${val} Mahasiswa`,
                  name === 'reported' ? 'Sudah Melapor' : name
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.weekName;
                  }
                  return label;
                }}
              />
              <Line
                type="monotone"
                dataKey="reported"
                name="Sudah Melapor"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-3">
          Perbandingan jumlah mahasiswa yang aktif berkonsultasi per pekan
        </p>
      </div>
    </div>
  );
}
