import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AssignmentContext = createContext()

const API = 'http://127.0.0.1:8000/api'

export function AssignmentProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [teachers, setTeachers] = useState([])
  const [subjects, setSubjects] = useState([])
  const [result, setResult] = useState(null)
  const [archives, setArchives] = useState({ loads: [], faculty: [], curriculum: [] })
  const [notifications, setNotifications] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(!!token)
  const [dataInitialized, setDataInitialized] = useState(false)

  // Configure axios defaults
  axios.defaults.headers.common['Accept'] = 'application/json'

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem('token', token)
    } else {
      delete axios.defaults.headers.common['Authorization']
      localStorage.removeItem('token')
    }
  }, [token])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/login`, { email, password })
      console.log('Login Success Data:', data)
      setUser(data.user)
      setToken(data.token)
      toast.success('Welcome back!')
    } catch (err) {
      console.error('Full Login Error Object:', err)
      console.error('Login Error Response Data:', err.response?.data)
      const message = err.response?.data?.message || 'Invalid credentials'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const register = async (formData) => {
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/register`, formData)
      setUser(data.user)
      setToken(data.token)
      toast.success('Account created!')
    } catch (err) {
      toast.error('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await axios.post(`${API}/logout`)
    } finally {
      setUser(null)
      setToken(null)
      toast.success('Logged out')
    }
  }

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setInitializing(false)
      return
    }
    try {
      const { data } = await axios.get(`${API}/user`)
      setUser(data)
    } catch (err) {
      setToken(null)
    } finally {
      setInitializing(false)
    }
  }, [token])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const fetchData = useCallback(async () => {
    if (!user) return
    try {
      const fetchList = []
      
      if (user.role === 'ADMIN') {
        fetchList.push(axios.get(`${API}/teachers`))
        fetchList.push(axios.get(`${API}/subjects`))
        fetchList.push(axios.get(`${API}/generate-assignment`))
        fetchList.push(axios.get(`${API}/activity-logs`))
      }
      
      fetchList.push(axios.get(`${API}/notifications`))

      const results = await Promise.all(fetchList)
      
      if (user.role === 'ADMIN') {
        setTeachers(Array.isArray(results[0].data) ? results[0].data : [])
        setSubjects(Array.isArray(results[1].data) ? results[1].data : [])
        setResult(results[2].data)
        setLogs(results[3].data.data || [])
        setNotifications(results[4].data)
      } else {
        setNotifications(results[0].data)
      }
    } catch (err) {
      console.error("Data fetch error:", err)
    } finally {
      setDataInitialized(true)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const runAssignment = async () => {
    setLoading(true)
    try {
      const { data } = await axios.post(`${API}/generate-assignment`)
      setResult(data)
      
      // AI Risk Notification Summary
      const highRisks = data.assignments.filter(a => 
        Object.values(a.ai_review || {}).some(r => r.level === 'High')
      )
      
      if (highRisks.length > 0) {
        toast.error(`Detected ${highRisks.length} High Risk assignments! Check the distribution table for details.`, { duration: 5000 })
      } else {
        toast.success('Assignment complete! Optimal load plan generated.')
      }
    } catch (err) {
      toast.error('Assignment failed.')
    } finally {
      setLoading(false)
    }
  }

  const overrideAssignment = async (subjectId, teacherId, schedule = null) => {
    setLoading(true)
    try {
      const payload = { subject_id: subjectId, teacher_id: teacherId }
      if (schedule) {
        payload.days = schedule.days
        payload.start_time = schedule.start_time
        payload.end_time = schedule.end_time
      }
      const { data } = await axios.post(`${API}/assignment/override`, payload)
      setResult(data)
      toast.success('Assignment updated!')
    } catch (err) {
      toast.error('Failed to override assignment')
    } finally {
      setLoading(false)
    }
  }

  const updateRationale = async (subject_id, rationale) => {
    try {
      const { data } = await axios.post(`${API}/assignment/rationale`, { subject_id, rationale })
      setResult(data)
      toast.success('Rationale updated!')
    } catch (err) {
      toast.error('Failed to update rationale.')
    }
  }

  const updateTeacherProfile = async (data) => {
    setLoading(true)
    try {
      await axios.post(`${API}/teachers/profile-update`, data)
      const res = await axios.get(`${API}/user`)
      setUser(res.data)
      toast.success('Profile updated!')
      fetchData()
    } catch (err) {
      toast.error('Update failed')
    } finally {
      setLoading(false)
    }
  }

  const importTeachers = async (file) => {
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await axios.post(`${API}/teachers/import`, formData)
      toast.success('Teachers imported!')
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Import failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const importSubjects = async (file) => {
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await axios.post(`${API}/subjects/import`, formData)
      toast.success('Subjects imported!')
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Import failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const addTeacher = async (data) => {
    setLoading(true)
    try {
      await axios.post(`${API}/teachers`, data)
      toast.success('Teacher added!')
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add teacher'
      const errors = err.response?.data?.errors
      if (errors) {
        toast.error(Object.values(errors)[0][0])
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const addSubject = async (data) => {
    setLoading(true)
    try {
      await axios.post(`${API}/subjects`, data)
      toast.success('Subject added!')
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add subject'
      const errors = err.response?.data?.errors
      if (errors) {
        toast.error(Object.values(errors)[0][0])
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const updateSubject = async (id, data) => {
    setLoading(true)
    try {
      await axios.put(`${API}/subjects/${id}`, data)
      toast.success('Subject updated!')
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update subject'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const updateCredentials = async (data) => {
    setLoading(true)
    try {
      await axios.post(`${API}/user/update-credentials`, data)
      toast.success('Security settings updated!')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const updateTeacher = async (id, data) => {
    setLoading(true)
    try {
      await axios.put(`${API}/teachers/${id}`, data)
      toast.success('Faculty record updated!')
      fetchData()
    } catch (err) {
      toast.error('Failed to update faculty record')
    } finally {
      setLoading(false)
    }
  }

  const deleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return
    setLoading(true)
    try {
      await axios.delete(`${API}/teachers/${id}`)
      toast.success('Teacher removed')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete teacher')
    } finally {
      setLoading(false)
    }
  }

  const deleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return
    setLoading(true)
    try {
      await axios.delete(`${API}/subjects/${id}`)
      toast.success('Subject removed')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete subject')
    } finally {
      setLoading(false)
    }
  }

  const markNotificationRead = async (id) => {
    try {
      await axios.post(`${API}/notifications/${id}/read`)
      fetchData()
    } catch (err) {
      console.error('Failed to mark notification as read', err)
    }
  }

  const clearAllNotificationsNow = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`)
      fetchData()
      toast.success('All marked as read')
    } catch (err) {
      console.error('Failed to mark all as read', err)
    }
  }

  const clearDistribution = async () => {
    if (!window.confirm('Are you sure you want to delete and archive the current load distribution?')) return
    setLoading(true)
    try {
      await axios.post(`${API}/assignment/clear`)
      setResult(null)
      toast.success('Distribution archived!')
      fetchData()
    } catch (err) {
      toast.error('Failed to archive distribution')
    } finally {
      setLoading(false)
    }
  }

  const fetchArchives = async () => {
    try {
      const { data } = await axios.get(`${API}/assignment/archived`)
      setArchives(data)
    } catch (err) {
      console.error('Failed to fetch archives', err)
    }
  }

  const restoreArchive = async (deletedAt, type = 'LOAD', id = null) => {
    if (!window.confirm(`Restore this ${type.toLowerCase()}?`)) return
    setLoading(true)
    try {
      await axios.post(`${API}/assignment/restore`, { deleted_at: deletedAt, type, id })
      toast.success('Successfully restored!')
      fetchData()
      fetchArchives()
    } catch (err) {
      toast.error('Failed to restore')
    } finally {
      setLoading(false)
    }
  }

  const deleteArchive = async (deletedAt, type = 'LOAD', id = null) => {
    if (!window.confirm('PERMANENTLY delete this from archives? This cannot be undone.')) return
    setLoading(true)
    try {
      await axios.delete(`${API}/assignment/archive`, { data: { deleted_at: deletedAt, type, id } })
      toast.success('Deleted permanently')
      fetchArchives()
    } catch (err) {
      toast.error('Failed to delete archive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AssignmentContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      updateCredentials,
      teachers,
      subjects,
      result,
      loading,
      initializing,
      dataInitialized,
      runAssignment,
      updateTeacherProfile,
      importTeachers,
      importSubjects,
      addTeacher,
      updateTeacher,
      addSubject,
      updateSubject,
      deleteTeacher,
      deleteSubject,
      markNotificationRead,
      clearAllNotificationsNow,
      notifications,
      logs,
      overrideAssignment,
      updateRationale,
      clearDistribution,
      fetchArchives,
      restoreArchive,
      deleteArchive,
      archives,
      fetchData
    }}>
      {children}
    </AssignmentContext.Provider>
  )
}

export function useAssignment() {
  const context = useContext(AssignmentContext)
  if (!context) {
    throw new Error('useAssignment must be used within an AssignmentProvider')
  }
  return context
}
