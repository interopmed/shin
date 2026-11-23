// Mock data for ward and assigned unit patients

export const WARD_PATIENTS = [
  { id: 1, name: 'John Doe', room: '201', status: 'pending_vitals', lastVitals: '08:00 AM', alerts: 1 },
  { id: 2, name: 'Jane Smith', room: '203', status: 'stable', lastVitals: '10:00 AM', alerts: 0 },
  { id: 3, name: 'Robert Johnson', room: '204', status: 'discharge_ready', lastVitals: '07:30 AM', alerts: 0 },
  { id: 4, name: 'Emily Davis', room: '205', status: 'abnormal_vitals', lastVitals: '11:15 AM', alerts: 2 },
  { id: 5, name: 'Michael Brown', room: '206', status: 'stable', lastVitals: '10:30 AM', alerts: 0 },
  { id: 6, name: 'Sarah Wilson', room: '207', status: 'pending_vitals', lastVitals: '07:45 AM', alerts: 1 },
  { id: 7, name: 'David Lee', room: '208', status: 'stable', lastVitals: '09:15 AM', alerts: 0 },
  { id: 8, name: 'Laura Garcia', room: '209', status: 'abnormal_vitals', lastVitals: '11:00 AM', alerts: 1 },
  { id: 9, name: 'James Martinez', room: '210', status: 'discharge_ready', lastVitals: '08:30 AM', alerts: 0 },
  { id: 10, name: 'Linda Taylor', room: '211', status: 'stable', lastVitals: '10:45 AM', alerts: 0 },
  { id: 11, name: 'William Thomas', room: '212', status: 'pending_vitals', lastVitals: '07:15 AM', alerts: 0 },
  { id: 12, name: 'Elizabeth Moore', room: '213', status: 'stable', lastVitals: '09:00 AM', alerts: 0 },
];

export const ASSIGNED_PATIENTS = [
  { id: 1, name: 'John Doe', type: 'Ward', location: 'Ward 201', status: 'pending_vitals', lastSeen: '08:00 AM', alerts: 1, priority: 'Normal' },
  { id: 2, name: 'Jane Smith', type: 'Ward', location: 'Ward 203', status: 'stable', lastSeen: '10:00 AM', alerts: 0, priority: 'Normal' },
  { id: 3, name: 'Alex Johnson', type: 'Clinic', location: 'Outpatient Clinic A', status: 'pending_vitals', lastSeen: '09:00 AM', alerts: 0, priority: 'Normal' },
  { id: 4, name: 'Emily Davis', type: 'Ward', location: 'Ward 205', status: 'abnormal_vitals', lastSeen: '11:15 AM', alerts: 2, priority: 'High' },
  { id: 5, name: 'Michael Brown', type: 'Ward', location: 'Ward 206', status: 'stable', lastSeen: '10:30 AM', alerts: 0, priority: 'Normal' },
  { id: 6, name: 'Sarah Wilson', type: 'Ward', location: 'Ward 207', status: 'pending_vitals', lastSeen: '07:45 AM', alerts: 1, priority: 'Normal' },
  { id: 7, name: 'David Lee', type: 'Ward', location: 'Ward 208', status: 'stable', lastSeen: '09:15 AM', alerts: 0, priority: 'Low' },
  { id: 8, name: 'Laura Garcia', type: 'Ward', location: 'Ward 209', status: 'abnormal_vitals', lastSeen: '11:00 AM', alerts: 1, priority: 'High' },
  { id: 9, name: 'James Martinez', type: 'Ward', location: 'Ward 210', status: 'discharge_ready', lastSeen: '08:30 AM', alerts: 0, priority: 'Low' },
  { id: 10, name: 'Linda Taylor', type: 'Ward', location: 'Ward 211', status: 'stable', lastSeen: '10:45 AM', alerts: 0, priority: 'Normal' },
  { id: 11, name: 'William Thomas', type: 'Ward', location: 'Ward 212', status: 'pending_vitals', lastSeen: '07:15 AM', alerts: 0, priority: 'Normal' },
  { id: 12, name: 'Elizabeth Moore', type: 'Ward', location: 'Ward 213', status: 'stable', lastSeen: '09:00 AM', alerts: 0, priority: 'Low' },
  { id: 13, name: 'Robert Johnson', type: 'Ward', location: 'Ward 204', status: 'discharge_ready', lastSeen: '07:30 AM', alerts: 0, priority: 'Low' },
  { id: 14, name: 'Mary Williams', type: 'Clinic', location: 'Cardiology Clinic', status: 'stable', lastSeen: '08:45 AM', alerts: 0, priority: 'Low' },
  { id: 15, name: 'Patricia Taylor', type: 'Clinic', location: 'Outpatient Clinic B', status: 'stable', lastSeen: '10:45 AM', alerts: 0, priority: 'Normal' },
];
