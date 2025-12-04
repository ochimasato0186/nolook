"use client"

import React, { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../../../lib/firebase/firestore'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import EducationBoardFrame from '../../../components/frame/EducationBoardFrame'
import {
  getSchoolData,
  saveSchoolData,
  updateAttendanceRate,
  updateEmotionData,
  addDailyEmotionData,
  updateGradeAverages,
  SchoolDataInput
} from '../../../lib/dataService'

interface School {
  id: string
  name: string
  address: string
  principalName: string
  studentCount: number
  teacherCount: number
  establishedYear: number
  schoolType: 'elementary' | 'middle' | 'high'
}

interface NotificationData {
  id: number
  schoolId: string
  target: string
  title: string
  content: string
  styling: {
    fontSize: number
    fontColor: string
    isBold: boolean
    isItalic: boolean
  }
  timestamp: string
  status: 'sent' | 'cancelled'
  sentTo?: string[]
}

interface ReportData {
  school: School
  attendanceRate: number
  gradeAverages: { grade: string; average: number }[]
  monthlyStats: { month: string; attendance: number; tests: number; events: number }[]
  teacherDistribution: { subject: string; count: number }[]
  emotionStats: { emotion: string; percentage: number; trend: 'up' | 'down' | 'stable' }[]
  dailyEmotionData: { date: string; joy: number; sadness: number; anger: number; anxiety: number; fatigue: number; concentration: number; confusion: number }[]
  notifications: NotificationData[]
}

export default function SchoolReportPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState('current')
  const [showDataInput, setShowDataInput] = useState(false)
  const [inputAttendanceRate, setInputAttendanceRate] = useState('')
  const [selectedNotification, setSelectedNotification] = useState<NotificationData | null>(null)
  const [showNotificationDetail, setShowNotificationDetail] = useState(false)

  const getNotificationsBySchool = (schoolId: string): NotificationData[] => {
    const allNotifications = JSON.parse(localStorage.getItem('sent_notifications') || '[]')
    return allNotifications.filter((n: NotificationData) => n.schoolId === schoolId)
  }

  const deleteNotification = (notificationId: number) => {
    if (!confirm('この通知を削除しますか？\n受信者には「送信取り消し」通知が送られます。')) {
      return
    }

    const allNotifications = JSON.parse(localStorage.getItem('sent_notifications') || '[]')
    const updatedNotifications = allNotifications.map((n: NotificationData) => {
      if (n.id === notificationId) {
        return { ...n, status: 'cancelled' }
      }
      return n
    })
    
    localStorage.setItem('sent_notifications', JSON.stringify(updatedNotifications))
    
    // 送信取り消し通知を作成
    const cancelNotification = {
      id: Date.now(),
      schoolId: selectedSchool?.id || '',
      target: 'all',
      title: '通知送信取り消し',
      content: '先ほど送信された通知は管理者により取り消されました。',
      styling: {
        fontSize: 16,
        fontColor: '#ef4444',
        isBold: true,
        isItalic: false
      },
      timestamp: new Date().toISOString(),
      status: 'sent' as const
    }
    
    const cancelNotifications = JSON.parse(localStorage.getItem('cancel_notifications') || '[]')
    cancelNotifications.unshift(cancelNotification)
    localStorage.setItem('cancel_notifications', JSON.stringify(cancelNotifications.slice(0, 50)))
    
    // レポートデータを再生成
    if (selectedSchool) {
      generateReportData(selectedSchool)
    }
  }

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'students': return '生徒'
      case 'teachers': return '教師'
      case 'all': return '全員'
      default: return target
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadSchools()
    }
  }, [])

  const loadSchools = async () => {
    try {
      if (!db) {
        console.warn('🔴 Firebase is not available, using sample data')
        setSchools([
          {
            id: '1',
            name: '第一小学校',
            address: '〒100-0001 東京都千代田区1-1-1',
            principalName: '田中太郎',
            studentCount: 450,
            teacherCount: 25,
            establishedYear: 1950,
            schoolType: 'elementary'
          },
          {
            id: '2',
            name: '第二小学校',
            address: '〒100-0002 東京都千代田区2-2-2',
            principalName: '佐藤花子',
            studentCount: 380,
            teacherCount: 30,
            establishedYear: 1955,
            schoolType: 'middle'
          },
          {
            id: '3',
            name: '第三小学校',
            address: '〒100-0003 東京都千代田区3-3-3',
            principalName: '鈴木一郎',
            studentCount: 720,
            teacherCount: 45,
            establishedYear: 1960,
            schoolType: 'high'
          }
        ])
        return
      }

      const schoolsRef = collection(db, 'schools')
      const snapshot = await getDocs(schoolsRef)
      const schoolsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as School))
      setSchools(schoolsData)
    } catch (error) {
      console.error('学校データの読み込みエラー:', error)
      setSchools([
        {
          id: '1',
          name: '第一小学校',
          address: '〒100-0001 東京都千代田区1-1-1',
          principalName: '田中太郎',
          studentCount: 450,
          teacherCount: 25,
          establishedYear: 1950,
          schoolType: 'elementary'
        },
        {
          id: '2',
          name: '第二小学校',
          address: '〒100-0002 東京都千代田区2-2-2',
          principalName: '佐藤花子',
          studentCount: 380,
          teacherCount: 30,
          establishedYear: 1955,
          schoolType: 'middle'
        },
        {
          id: '3',
          name: '第三小学校',
          address: '〒100-0003 東京都千代田区3-3-3',
          principalName: '鈴木一郎',
          studentCount: 720,
          teacherCount: 45,
          establishedYear: 1960,
          schoolType: 'high'
        }
      ])
    }
  }

  const generateReportData = async (school: School) => {
    setLoading(true)
    try {
      // 保存されたデータを取得
      const savedData = getSchoolData(school.id)
      
      const reportData: ReportData = {
        school,
        attendanceRate: savedData.attendanceRate || (94.5 + Math.random() * 4),
        gradeAverages: savedData.gradeAverages?.length ? savedData.gradeAverages : [
          { grade: '1年生', average: 78.5 + Math.random() * 10 },
          { grade: '2年生', average: 82.3 + Math.random() * 10 },
          { grade: '3年生', average: 85.1 + Math.random() * 10 },
          { grade: '4年生', average: 79.8 + Math.random() * 10 },
          { grade: '5年生', average: 83.2 + Math.random() * 10 },
          { grade: '6年生', average: 87.4 + Math.random() * 10 }
        ],
        monthlyStats: savedData.monthlyStats?.length ? savedData.monthlyStats : Array.from({ length: 12 }, (_, i) => ({
          month: `${i + 1}月`,
          attendance: 90 + Math.random() * 8,
          tests: 5 + Math.floor(Math.random() * 5),
          events: Math.floor(Math.random() * 3)
        })),
        teacherDistribution: savedData.teacherDistribution?.length ? savedData.teacherDistribution : [
          { subject: '国語', count: Math.floor(school.teacherCount * 0.2) },
          { subject: '算数・数学', count: Math.floor(school.teacherCount * 0.2) },
          { subject: '理科', count: Math.floor(school.teacherCount * 0.15) },
          { subject: '社会', count: Math.floor(school.teacherCount * 0.15) },
          { subject: '英語', count: Math.floor(school.teacherCount * 0.15) },
          { subject: 'その他', count: Math.floor(school.teacherCount * 0.15) }
        ],
        emotionStats: savedData.emotionStats?.length ? savedData.emotionStats : [
          { emotion: '喜び', percentage: 35 + Math.random() * 15, trend: 'up' },
          { emotion: '悲しみ', percentage: 8 + Math.random() * 5, trend: 'down' },
          { emotion: '怒り', percentage: 12 + Math.random() * 6, trend: 'stable' },
          { emotion: '不安', percentage: 22 + Math.random() * 8, trend: 'down' },
          { emotion: '疲労', percentage: 15 + Math.random() * 10, trend: 'down' },
          { emotion: '集中', percentage: 25 + Math.random() * 12, trend: 'up' },
          { emotion: '困惑', percentage: 10 + Math.random() * 5, trend: 'stable' }
        ],
        dailyEmotionData: savedData.dailyEmotionData?.length ? savedData.dailyEmotionData : Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (6 - i))
          return {
            date: `${date.getMonth() + 1}/${date.getDate()}`,
            joy: 25 + Math.random() * 20,
            sadness: 5 + Math.random() * 8,
            anger: 8 + Math.random() * 10,
            anxiety: 18 + Math.random() * 12,
            fatigue: 12 + Math.random() * 15,
            concentration: 20 + Math.random() * 18,
            confusion: 8 + Math.random() * 8
          }
        }),
        notifications: getNotificationsBySchool(school.id)
      }
      setReportData(reportData)
    } catch (error) {
      console.error('レポートデータ生成エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSchoolSelect = async (school: School) => {
    setSelectedSchool(school)
    await generateReportData(school)
  }

  const exportToPDF = async () => {
    if (!reportData) return
    
    try {
      const element = document.getElementById('report-content')
      if (!element) return

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${reportData.school.name}_詳細レポート_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (error) {
      console.error('PDF出力エラー:', error)
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return '#10b981'
      case 'stable': return '#3b82f6'
      case 'down': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️'
      case 'stable': return '➡️'
      case 'down': return '↘️'
      default: return '➡️'
    }
  }

  const handleAttendanceRateUpdate = () => {
    if (!selectedSchool || !inputAttendanceRate) return
    const rate = parseFloat(inputAttendanceRate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert('有効な出席率を入力してください（0-100）')
      return
    }
    updateAttendanceRate(selectedSchool.id, rate)
    setInputAttendanceRate('')
    // データを再生成
    generateReportData(selectedSchool)
  }

  const handleDataInputToggle = () => {
    setShowDataInput(!showDataInput)
  }

  return (
    <EducationBoardFrame>
      <style>{`
        .spinner {
          display: inline-block;
          width: 32px;
          height: 32px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={{ padding: '20px', backgroundColor: '#f3f4f6', minHeight: '100%' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>学校詳細レポート</h1>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 12px', fontSize: '14px' }}
                >
                  <option value="current">現在年度</option>
                  <option value="previous">前年度</option>
                  <option value="comparison">年度比較</option>
                </select>
                {reportData && (
                  <button
                    onClick={exportToPDF}
                    style={{
                      background: '#3b82f6',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      marginRight: '8px'
                    }}
                  >
                    PDF出力
                  </button>
                )}
                {selectedSchool && (
                  <button
                    onClick={handleDataInputToggle}
                    style={{
                      background: showDataInput ? '#ef4444' : '#10b981',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {showDataInput ? 'データ入力を閉じる' : 'データ入力'}
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>学校を選択</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {schools.map((school) => (
                  <div
                    key={school.id}
                    onClick={() => handleSchoolSelect(school)}
                    style={{
                      padding: '16px',
                      border: `2px solid ${selectedSchool?.id === school.id ? '#3b82f6' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedSchool?.id === school.id ? '#eff6ff' : '#fff'
                    }}
                  >
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#1f2937' }}>{school.name}</h3>
                    <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>{school.address}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>生徒数: {school.studentCount}名</span>
                      <span>教員数: {school.teacherCount}名</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showDataInput && selectedSchool && (
              <div style={{ 
                backgroundColor: '#fff', 
                borderRadius: '12px', 
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', color: '#1f2937' }}>
                  データ入力 - {selectedSchool.name}
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  {/* 出席率入力 */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>出席率更新</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        value={inputAttendanceRate}
                        onChange={(e) => setInputAttendanceRate(e.target.value)}
                        placeholder="出席率 (%)"
                        min="0"
                        max="100"
                        step="0.1"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        onClick={handleAttendanceRateUpdate}
                        style={{
                          background: '#3b82f6',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        更新
                      </button>
                    </div>
                    {reportData && (
                      <p style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                        現在の出席率: {reportData.attendanceRate.toFixed(1)}%
                      </p>
                    )}
                  </div>

                  {/* データエクスポート/インポート */}
                  <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>データ管理</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const data = getSchoolData(selectedSchool.id);
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${selectedSchool.name}_data.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        style={{
                          background: '#6b7280',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        データをエクスポート
                      </button>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const data = JSON.parse(event.target?.result as string);
                                saveSchoolData(selectedSchool.id, data);
                                generateReportData(selectedSchool);
                                alert('データをインポートしました');
                              } catch (error) {
                                alert('JSONファイルの読み込みに失敗しました');
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '8px', color: '#6b7280' }}>レポートデータを生成中...</p>
              </div>
            )}

            {reportData && !loading && (
              <div id="report-content" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#1f2937' }}>{reportData.school.name} 詳細レポート</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '2px' }}>校長名</p>
                      <p style={{ fontWeight: '600', color: '#1f2937' }}>{reportData.school.principalName}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '2px' }}>設立年</p>
                      <p style={{ fontWeight: '600', color: '#1f2937' }}>{reportData.school.establishedYear}年</p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '2px' }}>学校種別</p>
                      <p style={{ fontWeight: '600', color: '#1f2937' }}>
                        {reportData.school.schoolType === 'elementary' ? '小学校' :
                         reportData.school.schoolType === 'middle' ? '中学校' : '高等学校'}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>出席率</h3>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>
                        {reportData.attendanceRate.toFixed(1)}%
                      </div>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>年間平均出席率</p>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>学年別成績</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {reportData.gradeAverages.slice(0, 3).map((grade, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: '#374151' }}>{grade.grade}</span>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: '#1f2937' }}>{grade.average.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>月別活動統計（抜粋）</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '6px', color: '#374151' }}>月</th>
                          <th style={{ textAlign: 'left', padding: '6px', color: '#374151' }}>出席率</th>
                          <th style={{ textAlign: 'left', padding: '6px', color: '#374151' }}>テスト数</th>
                          <th style={{ textAlign: 'left', padding: '6px', color: '#374151' }}>行事数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.monthlyStats.slice(0, 6).map((stat, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '6px', color: '#1f2937' }}>{stat.month}</td>
                            <td style={{ padding: '6px', color: '#1f2937' }}>{stat.attendance.toFixed(1)}%</td>
                            <td style={{ padding: '6px', color: '#1f2937' }}>{stat.tests}回</td>
                            <td style={{ padding: '6px', color: '#1f2937' }}>{stat.events}件</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>教員配置</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {reportData.teacherDistribution.map((subject, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#374151', fontSize: '13px' }}>{subject.subject}</span>
                          <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '13px' }}>{subject.count}名</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>感情統計データ</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {reportData.emotionStats?.map((emotion, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#374151', fontSize: '13px' }}>{emotion.emotion}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '13px' }}>
                              {emotion.percentage.toFixed(1)}%
                            </span>
                            <span style={{ color: getTrendColor(emotion.trend), fontSize: '12px' }}>
                              {getTrendIcon(emotion.trend)}
                            </span>
                          </div>
                        </div>
                      )) || (
                        <div style={{ textAlign: 'center', color: '#6b7280', padding: '16px' }}>
                          感情データを読み込み中...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>過去の通知履歴カレンダー</h3>
                  <div style={{ overflowX: 'auto' }}>
                    {reportData.notifications && reportData.notifications.length > 0 ? (
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {reportData.notifications.map((notification) => (
                          <div
                            key={notification.id}
                            style={{
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              padding: '12px',
                              backgroundColor: notification.status === 'cancelled' ? '#fef2f2' : '#fff',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = notification.status === 'cancelled' ? '#fee2e2' : '#f9fafb'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = notification.status === 'cancelled' ? '#fef2f2' : '#fff'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: notification.status === 'cancelled' ? '#dc2626' : '#1f2937' }}>
                                    {notification.title}
                                    {notification.status === 'cancelled' && <span style={{ color: '#dc2626', fontSize: '12px', marginLeft: '8px' }}>[送信取り消し済み]</span>}
                                  </h4>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                                  <span>対象: {getTargetLabel(notification.target)}</span>
                                  <span>送信日時: {new Date(notification.timestamp).toLocaleString('ja-JP')}</span>
                                </div>
                                <p style={{
                                  margin: 0,
                                  fontSize: '13px',
                                  color: '#374151',
                                  lineHeight: '1.4',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}>
                                  {notification.content}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedNotification(notification)
                                    setShowNotificationDetail(true)
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  詳細
                                </button>
                                {notification.status !== 'cancelled' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteNotification(notification.id)
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: '#ef4444',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    削除
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px' }}>
                        まだ送信された通知はありません
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>数日の感情統計データ</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                          <th style={{ textAlign: 'left', padding: '8px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>日付</th>
                          <th style={{ textAlign: 'center', padding: '8px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>喜び</th>
                          <th style={{ textAlign: 'center', padding: '8px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>悲しみ</th>
                          <th style={{ textAlign: 'center', padding: '8px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>怒り</th>
                          <th style={{ textAlign: 'center', padding: '8px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>不安</th>
                          <th style={{ textAlign: 'center', padding: '8px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>疲労</th>
                          <th style={{ textAlign: 'center', padding: '8px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>集中</th>
                          <th style={{ textAlign: 'center', padding: '8px', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>困惑</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.dailyEmotionData?.map((day, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px', color: '#1f2937', fontWeight: '500' }}>{day?.date || '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#22c55e', fontWeight: '600' }}>{day?.joy?.toFixed(1) || '0.0'}%</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#3b82f6', fontWeight: '600' }}>{day?.sadness?.toFixed(1) || '0.0'}%</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#ef4444', fontWeight: '600' }}>{day?.anger?.toFixed(1) || '0.0'}%</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#f59e0b', fontWeight: '600' }}>{day?.anxiety?.toFixed(1) || '0.0'}%</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#8b5cf6', fontWeight: '600' }}>{day?.fatigue?.toFixed(1) || '0.0'}%</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#06b6d4', fontWeight: '600' }}>{day?.concentration?.toFixed(1) || '0.0'}%</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#6b7280', fontWeight: '600' }}>{day?.confusion?.toFixed(1) || '0.0'}%</td>
                          </tr>
                        ))}
                        {!reportData.dailyEmotionData && (
                          <tr>
                            <td colSpan={8} style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                              感情データを読み込み中...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
                    ※ 過去7日間の感情データを表示しています
                  </div>
                </div>

                <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                  レポート生成日時: {new Date().toLocaleString('ja-JP')}
                </div>
              </div>
            )}

            {/* 通知詳細モーダル */}
            {showNotificationDetail && selectedNotification && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  padding: '24px',
                  maxWidth: '600px',
                  width: '90%',
                  maxHeight: '80%',
                  overflow: 'auto'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>通知詳細</h3>
                    <button
                      onClick={() => setShowNotificationDetail(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: '#6b7280'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{
                      margin: '0 0 8px 0',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: selectedNotification.status === 'cancelled' ? '#dc2626' : '#1f2937'
                    }}>
                      {selectedNotification.title}
                      {selectedNotification.status === 'cancelled' && (
                        <span style={{ color: '#dc2626', fontSize: '14px', marginLeft: '8px' }}>[送信取り消し済み]</span>
                      )}
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '14px' }}>
                      <div>
                        <span style={{ color: '#6b7280' }}>対象者: </span>
                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{getTargetLabel(selectedNotification.target)}</span>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>送信日時: </span>
                        <span style={{ color: '#1f2937', fontWeight: '500' }}>{new Date(selectedNotification.timestamp).toLocaleString('ja-JP')}</span>
                      </div>
                      <div>
                        <span style={{ color: '#6b7280' }}>ステータス: </span>
                        <span style={{ 
                          color: selectedNotification.status === 'cancelled' ? '#dc2626' : '#10b981', 
                          fontWeight: '500' 
                        }}>
                          {selectedNotification.status === 'cancelled' ? '送信取り消し' : '送信済み'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>内容:</h5>
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: `${selectedNotification.styling.fontSize}px`,
                      color: selectedNotification.styling.fontColor,
                      fontWeight: selectedNotification.styling.isBold ? 'bold' : 'normal',
                      fontStyle: selectedNotification.styling.isItalic ? 'italic' : 'normal',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {selectedNotification.content}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => setShowNotificationDetail(false)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#6b7280',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      閉じる
                    </button>
                    {selectedNotification.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          deleteNotification(selectedNotification.id)
                          setShowNotificationDetail(false)
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          cursor: 'pointer'
                        }}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </EducationBoardFrame>
  )
}