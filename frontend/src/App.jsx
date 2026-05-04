import React, { useState, useEffect } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { LayoutDashboard, Users, BookOpen, Sparkles, AlertTriangle, CheckCircle2, Upload, Download, Settings, LogOut, User, Clock, GraduationCap, Plus, X, Trash2, Edit2, Sun, Moon, Eye, EyeOff, Archive, RotateCcw, Bell, History, Search } from 'lucide-react'
import { AssignmentProvider, useAssignment } from './context/AssignmentContext'
import './index.css'

const formatTime = (time) => {
  if (!time) return '';
  // Handle military time strings like "13:00:00" or "13:00"
  const parts = time.split(':');
  let h = parseInt(parts[0]);
  const m = parts[1] || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
};

function AuthPage() {
  const { login, loading } = useAssignment()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (showPassword) {
      const timer = setTimeout(() => setShowPassword(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showPassword])

  const handleSubmit = (e) => {
    e.preventDefault()
    login(formData.email, formData.password)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card animate-fade-in" style={{ width: 400, padding: '2.5rem' }}>
        <div className="logo" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <Sparkles size={32} />
          <span style={{ fontSize: '2rem' }}>ATLAS</span>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Welcome to ATLAS</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem' }}>Login to access your academic dashboard</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <input
            placeholder="Email" type="email" value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <div style={{ position: 'relative' }}>
            <input
              placeholder="Password" 
              type={showPassword ? "text" : "password"} 
              value={formData.password}
              style={{ width: '100%' }}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
            />
            <button 
              type="button"
              className="btn-clear modern-toggle"
              style={{ 
                position: 'absolute', 
                right: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-secondary)',
                transition: 'all 0.2s ease',
                background: 'rgba(255,255,255,0.03)'
              }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', opacity: 0.6 }}>
          Controlled Access Only • Program Chair Management
        </p>
      </div>
    </div>
  )
}

function TeacherDashboard() {
  const { 
    user, teachers, subjects, result, loading, logout, fetchData, 
    notifications, markNotificationRead, clearAllNotificationsNow, 
    updateTeacherProfile, updateCredentials 
  } = useAssignment()
  const [activeTab, setActiveTab] = useState('profile')
  const [credData, setCredData] = useState({ email: '', password: '' })
  const unreadCount = notifications.filter(n => !n.is_read).length
  const assignments = user?.teacher?.enriched_assignments || user?.teacher?.assignments || []
  const [expertise, setExpertise] = useState([])
  const [availability, setAvailability] = useState([])
  const [newTag, setNewTag] = useState('')

  const [newAvail, setNewAvail] = useState({ day: 'Monday', start: '08:00', end: '12:00' })

  // Sync state when user is loaded
  useEffect(() => {
    if (user) {
      setCredData({ email: user.email, password: '' })
      if (user.teacher) {
        setExpertise(user.teacher.expertise || [])
        setAvailability(user.teacher.available_times || [])
      }
    }
  }, [user])

  const handleUpdate = () => {
    updateTeacherProfile({
      expertise: expertise,
      available_times: availability
    })
  }

  const addAvailability = () => {
    const timeStr = `${newAvail.day} ${newAvail.start} - ${newAvail.end}`
    if (availability.includes(timeStr)) {
      toast.error('This schedule already exists in your availability.')
      return
    }
    setAvailability([...availability, timeStr])
  }

  const removeAvailability = (entry) => {
    setAvailability(availability.filter(a => a !== entry))
  }

  const addTag = (e) => {
    if ((!e || e.key === 'Enter') && newTag.trim()) {
      if (!expertise.includes(newTag.trim())) {
        setExpertise([...expertise, newTag.trim()])
      }
      setNewTag('')
    }
  }

  const removeTag = (tag) => {
    setExpertise(expertise.filter(t => t !== tag))
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']


  const exportSchedule = () => {
    if (!assignments.length) {
      toast.error('No classes assigned yet!')
      return
    }

    const headers = ['Subject', 'Units', 'Schedule', 'Room', 'Status']
    const rows = assignments.map(a => [
      a.subject?.name || a.subject,
      a.subject?.units || a.units,
      `${a.subject?.days || a.days} ${(a.subject?.start_time || a.start_time)}-${(a.subject?.end_time || a.end_time)}`,
      a.subject?.room || 'TBA',
      a.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `My_Schedule_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Schedule exported!')
  }

  return (
    <div className="app-container">
      <aside className="sidebar animate-fade-in">
        <div className="logo"><Sparkles size={24} /><span>ATLAS</span></div>
        <nav className="nav-links">
          <button className={`nav-link btn-clear ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><User size={20} />My Profile</button>
          <button className={`nav-link btn-clear ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}><Clock size={20} />View My Load</button>
          <button className={`nav-link btn-clear ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <div className="badge-container">
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>
            Notifications
          </button>
          <button className={`nav-link btn-clear ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}><Settings size={20} />Security Settings</button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button className="nav-link btn-clear" onClick={logout}><LogOut size={20} />Logout</button>
        </div>
      </aside>

      <main className="main-content animate-fade-in">
        <header className="header">
          <div className="title-group">
            <h1>Teacher Portal</h1>
            <p>
              {activeTab === 'profile' && 'Updating availability & expertise'}
              {activeTab === 'schedule' && 'Viewing assigned academic load'}
              {activeTab === 'notifications' && 'System alerts and updates'}
              {activeTab === 'security' && 'Manage your login credentials'}
              for <strong>{user?.name}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {activeTab === 'schedule' && assignments.length > 0 && (
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={exportSchedule}>
                <Download size={18} /> Export Schedule
              </button>
            )}
            {activeTab === 'profile' && (
              <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
                {loading ? 'Saving...' : 'Update Profile'}
              </button>
            )}
          </div>
        </header>

        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <GraduationCap size={24} color="var(--accent-blue)" />
                <h2 style={{ margin: 0 }}>Expertise Areas</h2>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {expertise.map(tag => (
                  <span key={tag} className="badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-blue)', color: 'white', padding: '0.4rem 0.75rem' }}>
                    {tag} <X size={14} style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)} />
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="card" style={{ flex: 1, padding: '0.75rem' }}
                  value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={addTag}
                  list="expertise-suggestions"
                  placeholder="Type expertise (e.g. History)..."
                />
                <button className="btn btn-primary" onClick={() => addTag()}><Plus size={18} /></button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Press Enter or click the <strong>+</strong> button to add.</p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Clock size={24} color="var(--accent-amber)" />
                <h2 style={{ margin: 0 }}>My Availability</h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Specify the days and times you are free to be assigned classes.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="card" style={{ padding: '0.5rem', flex: 1 }} value={newAvail.day} onChange={e => setNewAvail({ ...newAvail, day: e.target.value })}>
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input type="time" className="card" style={{ padding: '0.5rem' }} value={newAvail.start} onChange={e => setNewAvail({ ...newAvail, start: e.target.value })} />
                  <input type="time" className="card" style={{ padding: '0.5rem' }} value={newAvail.end} onChange={e => setNewAvail({ ...newAvail, end: e.target.value })} />
                  <button className="btn btn-primary" onClick={addAvailability}><Plus size={16} /></button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availability.map(item => (
                  <div key={item} className="stat-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '500' }}>{item}</span>
                    <X size={18} style={{ cursor: 'pointer', color: 'var(--accent-rose)', opacity: 0.8 }} onClick={() => removeAvailability(item)} />
                  </div>
                ))}
                {availability.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>No availability set.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="card">
            <h2>My Assigned Academic Load</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Section</th>
                    <th>Units</th>
                    <th>Schedule</th>
                    <th>Remarks / Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.subject?.name || a.subject}</strong></td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          {a.subject?.section || a.section || 'N/A'}
                        </span>
                      </td>
                      <td>{a.subject?.units || a.units} Units</td>
                      <td>{a.subject?.days || a.days} {formatTime(a.subject?.start_time || a.start_time)} - {formatTime(a.subject?.end_time || a.end_time)}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {a.assignment_reason || 'No remarks provided'}
                          </span>
                          <span className={`badge ${a.status === 'ASSIGNED' || a.status === 'MANUALLY_ASSIGNED' ? 'badge-success' : 'badge-danger'}`} style={{ width: 'fit-content' }}>
                            {a.status}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {assignments.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No subjects assigned to you yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Notifications</h2>
              {notifications.some(n => !n.is_read) && (
                <button className="btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={clearAllNotificationsNow}>
                  <CheckCircle2 size={16} /> Mark All as Read
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              {notifications.map((n, i) => (
                <div key={i} className={`stat-card ${n.is_read ? '' : 'animate-fade-in'}`} style={{ 
                  padding: '1.5rem', 
                  borderLeft: n.is_read ? 'none' : '4px solid var(--accent-blue)',
                  background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(59, 130, 246, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{n.title}</h3>
                      <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>{n.message}</p>
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    {!n.is_read && (
                      <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => markNotificationRead(n.id)}>Mark Read</button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>No notifications yet.</p>}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card" style={{ maxWidth: 500, margin: '2rem auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <Settings size={24} color="var(--accent-rose)" />
              <h2 style={{ margin: 0 }}>Login Credentials</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Email Address</label>
                <input value={credData.email} onChange={e => setCredData({ ...credData, email: e.target.value })} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>New Password (leave blank to keep current)</label>
                <input type="password" value={credData.password} onChange={e => setCredData({ ...credData, password: e.target.value })} placeholder="••••••••" />
              </div>
              <button className="btn btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }} onClick={() => updateCredentials(credData)} disabled={loading}>
                {loading ? 'Saving...' : 'Update Credentials'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function AdminDashboard() {
  const { 
    teachers, subjects, result, loading, runAssignment, 
    addTeacher, updateTeacher, addSubject, updateSubject, 
    deleteTeacher, deleteSubject, overrideAssignment, 
    user, importTeachers, importSubjects, logout, fetchData, 
    updateRationale, clearDistribution, fetchArchives, 
    restoreArchive, deleteArchive, archives, 
    notifications, markNotificationRead, clearAllNotificationsNow, logs 
  } = useAssignment()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [archiveSubTab, setArchiveSubTab] = useState('loads')
  const unreadCount = notifications.filter(n => !n.is_read).length
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setSearchTerm('')
  }, [activeTab])


  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '', expertise: '', max_units: 12 })
  const [newSubject, setNewSubject] = useState({ name: '', section: '', units: 3, required_expertise: '', days: '', start_time: '', end_time: '' })
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [editingSubject, setEditingSubject] = useState(null)
  const [editingTeacher, setEditingTeacher] = useState(null)
  const [showNewTeacherPassword, setShowNewTeacherPassword] = useState(false)

  useEffect(() => {
    if (showNewTeacherPassword) {
      const timer = setTimeout(() => setShowNewTeacherPassword(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showNewTeacherPassword])

  const stats = result?.summary || {
    total_teachers: teachers?.length || 0,
    active_teachers: 0,
    idle_teachers: teachers?.length || 0,
    total_subjects: subjects?.length || 0,
    assigned_subjects: 0,
    unassigned_subjects: subjects?.length || 0
  }

  const exportToCSV = () => {
    if (!result || !result.assignments.length) {
      toast.error('No load plan to export!')
      return
    }

    const headers = ['Subject', 'Teacher', 'Units', 'Schedule', 'Status']
    const rows = result.assignments.map(a => [
      a.subject,
      a.teacher_name,
      a.units,
      `${a.days} ${a.start_time}-${a.end_time}`,
      a.status
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `ATLAS_Load_Report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Report downloaded!')
  }

  return (
    <div className="app-container">
      <aside className="sidebar animate-fade-in">
        <div className="logo"><Sparkles size={24} color="var(--accent-blue)" /><span>ATLAS</span></div>
        <nav className="nav-links">
          <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><LayoutDashboard size={20} />Overview</button>
          <button className={`nav-link ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => setActiveTab('teachers')}><Users size={20} />Faculty</button>
          <button className={`nav-link ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}><BookOpen size={20} />Curriculum</button>
          <button className={`nav-link ${activeTab === 'archives' ? 'active' : ''}`} onClick={() => { setActiveTab('archives'); fetchArchives(); }}><Archive size={20} />Archives</button>
          <button className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}><History size={20} />Audit History</button>
          <button className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <div className="badge-container">
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>
            Notifications
          </button>
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <button className="nav-link" style={{ border: 'none', background: 'none' }} onClick={logout}><LogOut size={20} />Sign Out</button>
        </div>
      </aside>

      <main className="main-content animate-fade-in">
        <header className="header">
          <div className="title-group">
            <h1>
              {activeTab === 'dashboard' && 'Academic Overview'}
              {activeTab === 'teachers' && 'Faculty Registry'}
              {activeTab === 'subjects' && 'Curriculum Catalog'}
              {activeTab === 'archives' && 'Archived Sessions'}
              {activeTab === 'history' && 'System Audit History'}
              {activeTab === 'notifications' && 'System Notifications'}
            </h1>
            <p>Managing academic load for <strong>{user?.name}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {activeTab === 'dashboard' && (
              <>
                {result?.assignments?.length > 0 && (
                  <button className="btn" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={exportToCSV}>
                    <Download size={18} /> Export Report
                  </button>
                )}
                {result?.assignments?.length > 0 && (
                  <button className="btn" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)' }} onClick={clearDistribution} disabled={loading}>
                    <Trash2 size={18} /> Clear Current
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => {
                  if (result?.assignments?.length > 0 && !window.confirm('This will replace your current load plan and archive it. Continue?')) return;
                  runAssignment();
                }} disabled={loading}>
                  {loading ? 'Optimizing...' : 'Generate Load Plan'}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="grid-stats">
          <div className="card stat-card">
            <span className="stat-label">Faculty Utilization</span>
            <span className="stat-value">{Math.round((stats.active_teachers / (stats.total_teachers || 1)) * 100)}%</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label">Unassigned Load</span>
            <span className="stat-value" style={{ color: stats.unassigned_subjects > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>{stats.unassigned_subjects} Subjects</span>
          </div>
          <div className="card stat-card">
            <span className="stat-label">Total Faculty</span>
            <span className="stat-value">{stats.total_teachers}</span>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* AI Risk Briefing */}
            {result?.assignments?.some(a => Object.values(a.ai_review || {}).some(r => r.level === 'High')) && (
              <div className="card" style={{ border: '1px solid rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--accent-rose)' }}>
                  <AlertTriangle size={24} />
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--accent-rose)' }}>AI Risk Briefing</h2>
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyle: 'none' }}>
                  {result?.assignments?.map((a, i) => {
                    const criticalRisks = Object.entries(a.ai_review || {})
                      .filter(([_, r]) => r.level === 'High')
                      .map(([type, r]) => ({ type, msg: r.message }));

                    if (criticalRisks.length === 0) return null;

                    return (
                      <li key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ minWidth: '150px' }}><strong>{a.subject}</strong></div>
                        <div style={{ color: 'var(--text-secondary)' }}>&rarr;</div>
                        <div style={{ flex: 1 }}>
                          {criticalRisks.map((r, ri) => (
                            <div key={ri} style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              • <span style={{ color: 'var(--accent-rose)', fontWeight: '600', marginRight: '0.5rem' }}>{r.type.toUpperCase()}:</span> {r.msg}
                            </div>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>Active Load Distribution</h2>
                <div style={{ position: 'relative', width: 250 }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  <input 
                    placeholder="Search load plan..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} 
                  />
                </div>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Subject</th><th>Faculty</th><th>Units</th><th>Schedule</th><th>Section</th><th>Status</th><th style={{ width: 50 }}></th></tr></thead>
                  <tbody>
                    {(result?.assignments || []).filter(a => 
                      a.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      a.subject.toLowerCase().includes(searchTerm.toLowerCase())
                    ).map((a, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <strong>{a.subject}</strong>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 500 }}>{a.teacher_name || 'Unassigned'}</span>
                            {a.status === 'MANUALLY_ASSIGNED' && <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>(Manual)</span>}
                          </div>
                        </td>
                      <td>{a.units}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem' }}>{a.days}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatTime(a.start_time)} - {formatTime(a.end_time)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(59, 130, 246, 0.2)', width: 'fit-content' }}>
                          {a.section || 'N/A'}
                        </span>
                      </td>
                        <td><span className={`badge ${a.status === 'ASSIGNED' || a.status === 'MANUALLY_ASSIGNED' ? 'badge-success' : 'badge-danger'}`}>{a.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            <Edit2 
                              size={16} 
                              style={{ cursor: 'pointer', color: 'var(--accent-blue)', opacity: 0.7 }} 
                              onClick={() => setEditingAssignment(a)}
                              title="Edit Assignment"
                            />
                            {a.teacher_id && (
                              <Trash2 
                                size={16} 
                                style={{ cursor: 'pointer', color: 'var(--accent-rose)', opacity: 0.7 }} 
                                onClick={() => overrideAssignment(a.subject_id, null)} 
                                title="Unassign Faculty"
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!result || result.assignments.length === 0) && (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>No active load plan. Click 'Generate Load Plan' to begin.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 style={{ marginBottom: '1.5rem' }}>Faculty Workload Summary</h2>
              <div className="table-container">
                <table>
                  <thead><tr><th>Faculty Member</th><th>Current Load</th><th>Max Capacity</th><th>Status</th></tr></thead>
                  <tbody>
                    {[...teachers].sort((a, b) => a.name.localeCompare(b.name)).map((t, i) => {
                      const loadData = result?.teacher_loads?.[t.id]
                      const currentLoad = loadData?.total_units || 0
                      return (
                        <tr key={i}>
                          <td><strong>{t.name}</strong></td>
                          <td><strong>{currentLoad} Units</strong></td>
                          <td>{t.max_units} Units</td>
                          <td>
                            {currentLoad === 0 ? <span className="badge badge-warning">Idle</span> : <span className="badge badge-success">Active</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>Faculty Registry</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 220 }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                    <input 
                      placeholder="Search faculty..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} 
                    />
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => setShowAddTeacher(true)}><Plus size={18} /> New Member</button>
                  <label className="btn" style={{ background: 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: '0.5rem 1rem' }}>
                    <Upload size={18} /> Batch Import
                    <input type="file" hidden onChange={(e) => importTeachers(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div className="table-container">
              <table>
                <thead><tr><th>Name</th><th>Expertise Areas</th><th>Availability</th><th>Max Load</th><th style={{ width: 50 }}></th></tr></thead>
                <tbody>
                  {teachers.filter(t => 
                    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    (t.expertise || []).some(e => e.toLowerCase().includes(searchTerm.toLowerCase()))
                  ).sort((a, b) => a.name.localeCompare(b.name)).map((t, i) => (
                    <tr key={i}>
                      <td><strong>{t.name}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {t.expertise?.map(e => <span key={e} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{e}</span>)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {t.available_times?.map(time => (
                            <span key={time} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                              {time}
                            </span>
                          ))}
                          {(!t.available_times || t.available_times.length === 0) && <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Not set</span>}
                        </div>
                      </td>
                      <td>{t.max_units} Units</td>
                      <td style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <Edit2 size={18} style={{ cursor: 'pointer', color: 'var(--accent-blue)', opacity: 0.7 }} onClick={() => { setEditingTeacher(t); setNewTeacher({ name: t.name || '', email: t.user?.email || '', expertise: (t.expertise || []).join('; '), max_units: t.max_units || 12, password: '' }); setShowAddTeacher(true); }} />
                        <Trash2 size={18} style={{ cursor: 'pointer', color: 'var(--accent-rose)', opacity: 0.7 }} onClick={() => deleteTeacher(t.id)} />
                      </td>
                    </tr>
                  ))}
                  {teachers.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem' }}>No faculty records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'subjects' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0 }}>Curriculum Catalog</h2>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 220 }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                    <input 
                      placeholder="Search subjects..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.9rem', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }} 
                    />
                  </div>
                  <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={() => setShowAddSubject(true)}><Plus size={18} /> New Subject</button>
                  <label className="btn" style={{ background: 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: '0.5rem 1rem' }}>
                    <Upload size={18} /> Batch Import
                    <input type="file" hidden onChange={(e) => importSubjects(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <div className="table-container">
              <table>
                <thead><tr><th>Subject Name</th><th>Section</th><th>Units</th><th>Expertise</th><th>Schedule</th><th style={{ width: 50 }}></th></tr></thead>
                <tbody>
                  {subjects.filter(s => 
                    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (s.required_expertise || '').toLowerCase().includes(searchTerm.toLowerCase())
                  ).sort((a, b) => a.name.localeCompare(b.name)).map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.section ? <span style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>{s.section}</span> : <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>—</span>}</td>
                      <td>{s.units} Units</td>
                      <td>{s.required_expertise}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.days} {formatTime(s.start_time)} - {formatTime(s.end_time)}</td>
                      <td><Trash2 size={18} style={{ cursor: 'pointer', color: 'var(--accent-rose)', opacity: 0.7 }} onClick={() => deleteSubject(s.id)} /></td>
                      <td><Edit2 size={18} style={{ cursor: 'pointer', color: 'var(--accent-blue)', opacity: 0.7 }} onClick={() => { setEditingSubject(s); setShowAddSubject(true); }} /></td>
                    </tr>
                  ))}
                  {subjects.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '4rem' }}>No subject records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'archives' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2>Load Distribution Archives</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Restore previous academic load configurations.</p>
              </div>
              <button className="btn" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={fetchArchives}>
                <RotateCcw size={18} /> Refresh List
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '12px', width: 'fit-content' }}>
              <button className={`btn ${archiveSubTab === 'loads' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setArchiveSubTab('loads')}>Load Plans</button>
              <button className={`btn ${archiveSubTab === 'faculty' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setArchiveSubTab('faculty')}>Faculty</button>
              <button className={`btn ${archiveSubTab === 'curriculum' ? 'btn-primary' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setArchiveSubTab('curriculum')}>Curriculum</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {archiveSubTab === 'loads' && (archives.loads || []).map((archive, idx) => (
                <div key={idx} className="stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Archive size={20} color="var(--accent-blue)" />
                      <h3 style={{ margin: 0 }}>Session: {new Date(archive.deleted_at).toLocaleString()}</h3>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Contains <strong>{archive.count}</strong> assignments.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={() => restoreArchive(archive.deleted_at, 'LOAD')} disabled={loading}>
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button className="btn" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)' }} onClick={() => deleteArchive(archive.deleted_at, 'LOAD')} disabled={loading}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {archiveSubTab === 'faculty' && (archives.faculty || []).map((archive, idx) => (
                <div key={idx} className="stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Users size={20} color="var(--accent-blue)" />
                      <h3 style={{ margin: 0 }}>{archive.name}</h3>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Archived on: {new Date(archive.deleted_at).toLocaleString()} | {archive.details}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={() => restoreArchive(archive.deleted_at, 'FACULTY', archive.id)} disabled={loading}>
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button className="btn" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)' }} onClick={() => deleteArchive(archive.deleted_at, 'FACULTY', archive.id)} disabled={loading}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {archiveSubTab === 'curriculum' && (archives.curriculum || []).map((archive, idx) => (
                <div key={idx} className="stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <BookOpen size={20} color="var(--accent-blue)" />
                      <h3 style={{ margin: 0 }}>{archive.name}</h3>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Archived on: {new Date(archive.deleted_at).toLocaleString()} | {archive.details}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-primary" onClick={() => restoreArchive(archive.deleted_at, 'CURRICULUM', archive.id)} disabled={loading}>
                      <RotateCcw size={16} /> Restore
                    </button>
                    <button className="btn" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)' }} onClick={() => deleteArchive(archive.deleted_at, 'CURRICULUM', archive.id)} disabled={loading}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              {((archiveSubTab === 'loads' && (!archives.loads || archives.loads.length === 0)) || 
                (archiveSubTab === 'faculty' && (!archives.faculty || archives.faculty.length === 0)) || 
                (archiveSubTab === 'curriculum' && (!archives.curriculum || archives.curriculum.length === 0))) && (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <Archive size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>No archived {archiveSubTab} found.</p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="card">
            <h2>Audit History</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Track all system changes and assignments.</p>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Category</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={i}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td>{log.user?.name || 'System'}</td>
                      <td><span className="badge badge-warning">{log.action}</span></td>
                      <td>{log.type}</td>
                      <td>{log.description}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: '4rem' }}>No history records found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>Notifications</h2>
              {notifications.some(n => !n.is_read) && (
                <button className="btn" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)', padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={clearAllNotificationsNow}>
                  <CheckCircle2 size={16} /> Mark All as Read
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              {notifications.map((n, i) => (
                <div key={i} className={`stat-card ${n.is_read ? '' : 'animate-fade-in'}`} style={{ 
                  padding: '1.5rem', 
                  borderLeft: n.is_read ? 'none' : '4px solid var(--accent-blue)',
                  background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(59, 130, 246, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{n.title}</h3>
                      <p style={{ margin: '0.5rem 0', color: 'var(--text-secondary)' }}>{n.message}</p>
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    {!n.is_read && (
                      <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => markNotificationRead(n.id)}>Mark Read</button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>No notifications yet.</p>}
            </div>
          </div>
        )}
      </main>

      {showAddTeacher && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)' }}>
          <div className="card animate-fade-in" style={{ width: 450, padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => { setShowAddTeacher(false); setEditingTeacher(null); setNewTeacher({ name: '', email: '', password: '', expertise: '', max_units: 12 }); }} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingTeacher ? 'Edit Faculty Member' : 'Add New Teacher'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input placeholder="Full Name" value={newTeacher.name} onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })} />
              <input placeholder="Email (for login)" value={newTeacher.email} onChange={e => setNewTeacher({ ...newTeacher, email: e.target.value })} />
              <div style={{ position: 'relative' }}>
                <input 
                  placeholder={editingTeacher ? "New Password (leave blank for Teacher123)" : "Password (default: Teacher123)"} 
                  type={showNewTeacherPassword ? "text" : "password"} 
                  style={{ width: '100%' }}
                  value={newTeacher.password}
                  onChange={e => setNewTeacher({ ...newTeacher, password: e.target.value })} 
                />
                <button 
                  type="button"
                  className="btn-clear modern-toggle"
                  style={{ 
                    position: 'absolute', 
                    right: '0.75rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    padding: '0.4rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    color: 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                    background: 'rgba(255,255,255,0.03)'
                  }}
                  onClick={() => setShowNewTeacherPassword(!showNewTeacherPassword)}
                >
                  {showNewTeacherPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <input 
                placeholder="Expertise (semicolon separated)" 
                list="expertise-suggestions"
                value={newTeacher.expertise}
                onChange={e => setNewTeacher({ ...newTeacher, expertise: e.target.value })} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Academic Units</label>
                <input 
                  type="number" 
                  value={newTeacher.max_units} 
                  onChange={e => setNewTeacher({ ...newTeacher, max_units: e.target.value })} 
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { 
                  if (editingTeacher) {
                    updateTeacher(editingTeacher.id, newTeacher);
                  } else {
                    addTeacher(newTeacher);
                  }
                  setShowAddTeacher(false);
                  setEditingTeacher(null);
                  setNewTeacher({ name: '', email: '', password: '', expertise: '', max_units: 12 });
                }}>{editingTeacher ? 'Update Record' : 'Add Teacher'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddSubject && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)', overflowY: 'auto' }}>
          <div className="card animate-fade-in" style={{ width: 450, padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => { setShowAddSubject(false); setEditingSubject(null); setNewSubject({ name: '', units: 3, required_expertise: '', days: '', start_time: '', end_time: '' }); }} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input 
                placeholder="Subject Name" 
                list="subject-name-suggestions"
                value={editingSubject ? editingSubject.name : newSubject.name}
                onChange={e => editingSubject ? setEditingSubject({...editingSubject, name: e.target.value}) : setNewSubject({ ...newSubject, name: e.target.value })} 
              />
              <input 
                placeholder="Section (e.g. BSIT-1A, BSCS-2B)" 
                value={editingSubject ? (editingSubject.section || '') : newSubject.section}
                onChange={e => editingSubject ? setEditingSubject({...editingSubject, section: e.target.value}) : setNewSubject({ ...newSubject, section: e.target.value })} 
              />
              <input 
                placeholder="Units (number)" type="number" 
                value={editingSubject ? editingSubject.units : newSubject.units}
                onChange={e => editingSubject ? setEditingSubject({...editingSubject, units: e.target.value}) : setNewSubject({ ...newSubject, units: e.target.value })} 
              />
              <input 
                placeholder="Required Expertise" 
                list="expertise-suggestions"
                value={editingSubject ? editingSubject.required_expertise : newSubject.required_expertise}
                onChange={e => editingSubject ? setEditingSubject({...editingSubject, required_expertise: e.target.value}) : setNewSubject({ ...newSubject, required_expertise: e.target.value })} 
              />

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['M', 'T', 'W', 'Th', 'F', 'S'].map(d => {
                  const currentDays = (editingSubject ? editingSubject.days : newSubject.days) || '';
                  const dayArray = [...new Set(currentDays.split(',').map(s => s.trim()).filter(Boolean))];
                  const isActive = dayArray.includes(d);
                  return (
                    <button key={d} className={`btn ${isActive ? 'btn-primary' : ''}`} style={{ padding: '0.5rem', minWidth: '40px', background: isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)' }} onClick={() => {
                      const nextArray = isActive 
                        ? dayArray.filter(day => day !== d)
                        : [...dayArray, d];
                      const nextDays = nextArray.join(',');
                      editingSubject ? setEditingSubject({...editingSubject, days: nextDays}) : setNewSubject({ ...newSubject, days: nextDays });
                    }}>{d}</button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start Time</label>
                  <input type="time" style={{ width: '100%' }} 
                    value={editingSubject ? editingSubject.start_time : newSubject.start_time}
                    onChange={e => editingSubject ? setEditingSubject({...editingSubject, start_time: e.target.value}) : setNewSubject({ ...newSubject, start_time: e.target.value })} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>End Time</label>
                  <input type="time" style={{ width: '100%' }} 
                    value={editingSubject ? editingSubject.end_time : newSubject.end_time}
                    onChange={e => editingSubject ? setEditingSubject({...editingSubject, end_time: e.target.value}) : setNewSubject({ ...newSubject, end_time: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { 
                  if (editingSubject) {
                    updateSubject(editingSubject.id, editingSubject);
                  } else {
                    addSubject(newSubject);
                  }
                  setShowAddSubject(false);
                  setEditingSubject(null);
                }}>{editingSubject ? 'Save Changes' : 'Add Subject'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
        {editingAssignment && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(8px)' }}>
          <div className="card animate-fade-in" style={{ width: 500, padding: '2.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setEditingAssignment(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ marginBottom: '0.5rem' }}>Edit Assignment</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Subject: <strong>{editingAssignment.subject?.name || editingAssignment.subject}</strong>
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assign Faculty</label>
                <select 
                  className="card" 
                  style={{ width: '100%', padding: '0.75rem' }}
                  value={editingAssignment.teacher_id || ''}
                  onChange={(e) => {
                    const tid = e.target.value || null
                    overrideAssignment(editingAssignment.subject_id, tid, { days: editingAssignment.days, start_time: editingAssignment.start_time, end_time: editingAssignment.end_time })
                    setEditingAssignment({...editingAssignment, teacher_id: tid})
                  }}
                >
                  <option value="">-- Unassigned --</option>
                  <optgroup label="Applicable Faculty (Expertise Match)">
                    {teachers.filter(t => {
                      const sub = subjects.find(s => s.id === editingAssignment.subject_id || s.name === editingAssignment.subject);
                      return t.expertise?.includes(sub?.required_expertise);
                    }).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Faculty">
                    {teachers.filter(t => {
                      const sub = subjects.find(s => s.id === editingAssignment.subject_id || s.name === editingAssignment.subject);
                      return !t.expertise?.includes(sub?.required_expertise);
                    }).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Update Schedule</label>
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                  {['M', 'T', 'W', 'Th', 'F', 'S'].map(d => {
                    const currentDays = editingAssignment.days || '';
                    const dayArray = [...new Set(currentDays.split(',').map(s => s.trim()).filter(Boolean))];
                    const isActive = dayArray.includes(d);
                    return (
                      <button key={d} className={`btn ${isActive ? 'btn-primary' : ''}`} 
                        style={{ padding: '0.4rem', minWidth: '35px', fontSize: '0.8rem', background: isActive ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)' }} 
                        onClick={() => {
                          const nextArray = isActive 
                            ? dayArray.filter(day => day !== d)
                            : [...dayArray, d];
                          const nextDays = nextArray.join(',');
                          const next = {...editingAssignment, days: nextDays}
                          setEditingAssignment(next)
                          overrideAssignment(editingAssignment.subject_id, editingAssignment.teacher_id, { days: nextDays, start_time: editingAssignment.start_time, end_time: editingAssignment.end_time })
                        }}>{d}</button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input type="time" style={{ flex: 1, padding: '0.5rem' }} value={editingAssignment.start_time || ''} onChange={e => {
                    const next = {...editingAssignment, start_time: e.target.value}
                    setEditingAssignment(next)
                    overrideAssignment(editingAssignment.subject_id, editingAssignment.teacher_id, { days: editingAssignment.days, start_time: e.target.value, end_time: editingAssignment.end_time })
                  }} />
                  <input type="time" style={{ flex: 1, padding: '0.5rem' }} value={editingAssignment.end_time || ''} onChange={e => {
                    const next = {...editingAssignment, end_time: e.target.value}
                    setEditingAssignment(next)
                    overrideAssignment(editingAssignment.subject_id, editingAssignment.teacher_id, { days: editingAssignment.days, start_time: editingAssignment.start_time, end_time: e.target.value })
                  }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Admin Remarks</label>
                <textarea 
                  placeholder="Add notes or reasons for this assignment..."
                  value={editingAssignment.assignment_reason || ''}
                  onChange={(e) => setEditingAssignment({...editingAssignment, assignment_reason: e.target.value})}
                  onBlur={(e) => updateRationale(editingAssignment.subject_id, e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', resize: 'none' }}
                />
              </div>

              <button className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => setEditingAssignment(null)}>
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MainContent() {
  const { token, user, teachers, subjects, initializing, dataInitialized } = useAssignment()
  
  // Extract unique expertise areas for auto-suggest
  const allExpertise = Array.from(new Set([
    ...teachers.flatMap(t => t.expertise || []),
    ...subjects.map(s => s.required_expertise).filter(Boolean)
  ])).sort()

  // Extract unique subject names for auto-suggest
  const allSubjectNames = Array.from(new Set([
    ...subjects.map(s => s.name).filter(Boolean)
  ])).sort()

  // Show splash screen while initializing auth OR while fetching initial dashboard data
  if (initializing || (token && !dataInitialized)) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
        <Sparkles size={64} color="var(--accent-blue)" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontWeight: 900, fontSize: '2.5rem', letterSpacing: '0.2em', marginLeft: '0.2em' }}>ATLAS</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '-0.5rem' }}>Assignment Engine</span>
        </div>
      </div>
    </div>
  )

  if (!token || !user) return <AuthPage />
  
  return (
    <>
      <datalist id="expertise-suggestions">
        {allExpertise.map(exp => <option key={exp} value={exp} />)}
      </datalist>
      <datalist id="subject-name-suggestions">
        {allSubjectNames.map(name => <option key={name} value={name} />)}
      </datalist>
      {user.role === 'ADMIN' ? <AdminDashboard /> : <TeacherDashboard />}
    </>
  )
}

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  return { theme, toggleTheme }
}

export default function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <AssignmentProvider>
      <Toaster position="top-right" />
      <MainContent />
      <button
        onClick={toggleTheme}
        className="btn card"
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem',
          borderRadius: '50%', padding: '1rem', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </button>
    </AssignmentProvider>
  )
}
