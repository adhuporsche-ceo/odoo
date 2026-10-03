let cachedApplications = [];
let currentViewingApp = null;
let detailModalInstance = null;

const escapeApplicationHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));

const showApplicationMessage = (message, type = 'danger') => {
  const element = document.getElementById('applicationMessage');
  if (!element) return;
  element.className = `alert alert-${type} shadow-sm`;
  element.textContent = message;
  element.classList.remove('d-none');
  setTimeout(() => {
    element.classList.add('d-none');
  }, 5000);
};

const renderApplicationsTable = (applications) => {
  const body = document.getElementById('applicationsTableBody');
  const countEl = document.getElementById('applicationCount');
  if (countEl) countEl.textContent = `${applications.length} application${applications.length === 1 ? '' : 's'}`;

  if (!applications.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
          No applications match the current filter or search criteria.
        </td>
      </tr>`;
    return;
  }

  body.innerHTML = applications
    .map((item) => {
      const profile = item.application || {};
      const personal = profile.personalDetails || {};
      const applicationId = item._id || item.id;
      const status = item.status || 'PENDING';
      const submittedAt = item.submittedAt ? new Date(item.submittedAt).toLocaleString() : 'Recent';

      let statusBadge = '';
      if (status === 'APPROVED') {
        statusBadge = '<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle me-1"></i>Approved</span>';
      } else if (status === 'REJECTED') {
        statusBadge = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-x-circle me-1"></i>Rejected</span>';
      } else {
        statusBadge = '<span class="badge bg-warning-subtle text-warning border border-warning-subtle text-dark"><i class="bi bi-hourglass-split me-1"></i>Pending</span>';
      }

      const isPending = status === 'PENDING';

      return `<tr>
        <td class="fw-bold text-dark font-monospace">
          ${escapeApplicationHtml(item.registerNumber)}
        </td>
        <td>
          <div class="fw-semibold text-dark">${escapeApplicationHtml(personal.name || 'Student Candidate')}</div>
          <div class="small text-muted">${escapeApplicationHtml(personal.institutionalEmail || personal.personalEmail || '')}</div>
        </td>
        <td>
          <span class="badge bg-secondary-subtle text-dark border">
            ${escapeApplicationHtml(item.department || personal.department || 'CSE')} / ${escapeApplicationHtml(item.section || personal.section || 'A')}
          </span>
        </td>
        <td class="small text-muted">
          <i class="bi bi-calendar3 me-1"></i>${escapeApplicationHtml(submittedAt)}
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary" type="button" onclick="openApplicationDetail('${escapeApplicationHtml(applicationId)}')">
            <i class="bi bi-eye me-1"></i> View details
          </button>
        </td>
        <td class="text-end text-nowrap">
          ${
            isPending
              ? `<button class="btn btn-sm btn-success me-1 px-2" data-review="APPROVED" data-id="${escapeApplicationHtml(applicationId)}" type="button" title="Approve and create profile">
                  <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger me-1 px-2" data-review="REJECTED" data-id="${escapeApplicationHtml(applicationId)}" type="button" title="Reject submission">
                  <i class="bi bi-x-lg"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary px-2" data-action="DELETE" data-id="${escapeApplicationHtml(applicationId)}" type="button" title="Remove application">
                  <i class="bi bi-trash"></i>
                </button>`
              : `${statusBadge}
                <button class="btn btn-sm btn-outline-warning ms-2 px-2" data-action="RESET" data-id="${escapeApplicationHtml(applicationId)}" type="button" title="Revert to Pending">
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger ms-1 px-2" data-action="DELETE" data-id="${escapeApplicationHtml(applicationId)}" type="button" title="Delete application">
                  <i class="bi bi-trash"></i>
                </button>`
          }
        </td>
      </tr>`;
    })
    .join('');
};

const filterApplicationsList = () => {
  const status = document.getElementById('applicationStatus')?.value || 'PENDING';
  const dept = document.getElementById('filterDept')?.value || 'ALL';
  const search = (document.getElementById('searchApplications')?.value || '').toLowerCase().trim();

  let list = [...cachedApplications];
  if (status !== 'ALL') {
    list = list.filter((a) => (a.status || 'PENDING') === status);
  }
  if (dept !== 'ALL') {
    list = list.filter((a) => (a.department || a.application?.personalDetails?.department || '').toUpperCase() === dept);
  }
  if (search) {
    list = list.filter((a) => {
      const reg = (a.registerNumber || '').toLowerCase();
      const name = (a.application?.personalDetails?.name || '').toLowerCase();
      const email = (a.application?.personalDetails?.institutionalEmail || '').toLowerCase();
      return reg.includes(search) || name.includes(search) || email.includes(search);
    });
  }
  renderApplicationsTable(list);
};

const loadApplications = async (silent = false) => {
  const body = document.getElementById('applicationsTableBody');
  if (!silent && body) {
    body.innerHTML = '<tr><td colspan="6" class="text-muted text-center py-4"><span class="spinner-border spinner-border-sm me-2"></span>Loading student applications from MongoDB Atlas...</td></tr>';
  }

  try {
    const result = await apiCall('/student-applications?status=ALL');
    cachedApplications = result.data || [];
    filterApplicationsList();
  } catch (error) {
    if (body) {
      body.innerHTML = '<tr><td colspan="6" class="text-danger text-center py-4">Could not load applications from database.</td></tr>';
    }
    showApplicationMessage(error.message);
  }
};

// ---------------------------------------------------------------------------
// Open Application Dossier Modal
// ---------------------------------------------------------------------------
window.openApplicationDetail = function (applicationId) {
  const app = cachedApplications.find((a) => (a._id || a.id) === applicationId);
  if (!app) {
    showToast('Application not found', 'warning');
    return;
  }
  currentViewingApp = app;
  const p = app.application || {};
  const pd = p.personalDetails || {};
  const fd = p.familyDetails || {};
  const sem = p.semesters || [];
  const arr = p.arrears || [];
  const tech = p.technicalProfile || {};
  const cg = p.careerGoal || {};
  const status = app.status || 'PENDING';

  document.getElementById('appModalTitle').innerHTML = `
    <i class="bi bi-person-badge me-1"></i> Application: ${escapeApplicationHtml(app.registerNumber)} - ${escapeApplicationHtml(pd.name || 'Candidate')}
    <span class="badge ${status === 'APPROVED' ? 'bg-success' : status === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark'} ms-2 fs-6">${status}</span>
  `;

  // 1. Personal Content
  document.getElementById('modalPersonalContent').innerHTML = `
    <div class="row g-3">
      <div class="col-md-4">
        <label class="small text-muted d-block">Register Number</label>
        <span class="fw-bold">${escapeApplicationHtml(pd.registerNumber || app.registerNumber)}</span>
      </div>
      <div class="col-md-5">
        <label class="small text-muted d-block">Full Name</label>
        <span class="fw-bold">${escapeApplicationHtml(pd.name || 'N/A')}</span>
      </div>
      <div class="col-md-3">
        <label class="small text-muted d-block">Date of Birth</label>
        <span>${pd.dob ? new Date(pd.dob).toLocaleDateString() : 'N/A'}</span>
      </div>
      <div class="col-md-3">
        <label class="small text-muted d-block">Department & Section</label>
        <span class="badge bg-primary">${escapeApplicationHtml(pd.department || app.department)} - ${escapeApplicationHtml(pd.section || app.section)}</span>
      </div>
      <div class="col-md-3">
        <label class="small text-muted d-block">Gender</label>
        <span>${escapeApplicationHtml(pd.gender || 'N/A')}</span>
      </div>
      <div class="col-md-3">
        <label class="small text-muted d-block">Blood Group</label>
        <span>${escapeApplicationHtml(pd.bloodGroup || 'N/A')}</span>
      </div>
      <div class="col-md-3">
        <label class="small text-muted d-block">Category</label>
        <span class="badge bg-secondary">${escapeApplicationHtml(pd.category || 'Day Scholar')}</span>
      </div>
      <div class="col-md-6">
        <label class="small text-muted d-block">Institutional Email</label>
        <span class="font-monospace">${escapeApplicationHtml(pd.institutionalEmail || 'N/A')}</span>
      </div>
      <div class="col-md-6">
        <label class="small text-muted d-block">Personal Email</label>
        <span class="font-monospace">${escapeApplicationHtml(pd.personalEmail || 'N/A')}</span>
      </div>
      <div class="col-md-4">
        <label class="small text-muted d-block">Student Mobile</label>
        <span><i class="bi bi-telephone me-1"></i>${escapeApplicationHtml(pd.mobile || 'N/A')}</span>
      </div>
      <div class="col-md-8">
        <label class="small text-muted d-block">Residential Address</label>
        <span>${escapeApplicationHtml(pd.residentialAddress || 'N/A')}</span>
      </div>
    </div>`;

  // 2. Family Content
  document.getElementById('modalFamilyContent').innerHTML = `
    <div class="row g-3">
      <div class="col-md-6 border-end">
        <h6 class="fw-bold text-primary mb-2"><i class="bi bi-person me-1"></i> Father Details</h6>
        <div class="small mb-1"><span class="text-muted">Name:</span> <strong>${escapeApplicationHtml(fd.father?.name || 'N/A')}</strong></div>
        <div class="small mb-1"><span class="text-muted">Occupation:</span> ${escapeApplicationHtml(fd.father?.occupation || 'N/A')}</div>
        <div class="small mb-1"><span class="text-muted">Annual Income:</span> ${escapeApplicationHtml(fd.father?.incomeRange || 'N/A')}</div>
        <div class="small"><span class="text-muted">Mobile:</span> ${escapeApplicationHtml(fd.father?.mobile || 'N/A')}</div>
      </div>
      <div class="col-md-6">
        <h6 class="fw-bold text-primary mb-2"><i class="bi bi-person me-1"></i> Mother Details</h6>
        <div class="small mb-1"><span class="text-muted">Name:</span> <strong>${escapeApplicationHtml(fd.mother?.name || 'N/A')}</strong></div>
        <div class="small mb-1"><span class="text-muted">Occupation:</span> ${escapeApplicationHtml(fd.mother?.occupation || 'N/A')}</div>
        <div class="small mb-1"><span class="text-muted">Annual Income:</span> ${escapeApplicationHtml(fd.mother?.incomeRange || 'N/A')}</div>
        <div class="small"><span class="text-muted">Mobile:</span> ${escapeApplicationHtml(fd.mother?.mobile || 'N/A')}</div>
      </div>
      <div class="col-12 border-top pt-2">
        <label class="small text-muted d-block">Emergency Contact</label>
        <span class="badge bg-danger-subtle text-danger border border-danger-subtle fs-6"><i class="bi bi-telephone-fill me-1"></i>${escapeApplicationHtml(fd.emergencyContact || 'N/A')}</span>
      </div>
    </div>`;

  // 3. Academic Content
  let semRows = sem.map((s) => `
    <tr>
      <td>Sem ${s.semesterNumber}</td>
      <td><strong>${s.sgpa || '0.00'}</strong></td>
      <td><strong>${s.cgpa || '0.00'}</strong></td>
      <td>${s.attendance ? `${s.attendance}%` : 'N/A'}</td>
      <td>${s.creditsEarned || 'N/A'}</td>
    </tr>`).join('');

  let arrearRows = arr.map((a) => `
    <tr>
      <td><strong>${escapeApplicationHtml(a.subjectCode)}</strong></td>
      <td>${escapeApplicationHtml(a.subjectName)}</td>
      <td>Sem ${a.semester}</td>
      <td><span class="badge ${a.status === 'Cleared' ? 'bg-success' : 'bg-danger'}">${escapeApplicationHtml(a.status)}</span></td>
      <td>${a.attempts || 1}</td>
    </tr>`).join('');

  document.getElementById('modalAcademicContent').innerHTML = `
    <h6 class="fw-bold text-primary mb-2"><i class="bi bi-mortarboard me-1"></i> Semester GPA &amp; Attendance Records</h6>
    <div class="table-responsive mb-3">
      <table class="table table-sm table-bordered align-middle text-center small mb-0">
        <thead class="table-light"><tr><th>Semester</th><th>SGPA</th><th>CGPA</th><th>Attendance</th><th>Credits</th></tr></thead>
        <tbody>${semRows || '<tr><td colspan="5" class="text-muted">No semester records submitted.</td></tr>'}</tbody>
      </table>
    </div>
    <h6 class="fw-bold text-danger mb-2"><i class="bi bi-exclamation-triangle me-1"></i> Arrear History &amp; Standing Backlogs</h6>
    <div class="table-responsive">
      <table class="table table-sm table-bordered align-middle text-center small mb-0">
        <thead class="table-light"><tr><th>Code</th><th>Subject</th><th>Sem</th><th>Status</th><th>Attempts</th></tr></thead>
        <tbody>${arrearRows || '<tr><td colspan="5" class="text-success fw-semibold">No arrears recorded. Pristine academic track!</td></tr>'}</tbody>
      </table>
    </div>`;

  // 4. Technical Content
  const skills = (tech.technicalSkills || []).map((s) => `<span class="badge bg-primary-subtle text-primary border me-1 mb-1">${escapeApplicationHtml(s)}</span>`).join('');
  const langs = (tech.programmingLanguages || []).map((l) => `<span class="badge bg-secondary-subtle text-dark border me-1 mb-1">${escapeApplicationHtml(l)}</span>`).join('');
  const projects = (tech.projects || []).map((pr) => `
    <div class="p-2 border rounded mb-2 bg-white">
      <div class="fw-bold small text-dark">${escapeApplicationHtml(pr.title)} <span class="badge bg-info-subtle text-info border">${escapeApplicationHtml(pr.projectStatus || 'Completed')}</span></div>
      <div class="small text-muted mb-1">${escapeApplicationHtml(pr.description || '')}</div>
      <div class="small text-primary">${(pr.technologies || []).join(', ')}</div>
    </div>`).join('');

  document.getElementById('modalTechnicalContent').innerHTML = `
    <div class="row g-3">
      <div class="col-12">
        <label class="small text-muted d-block mb-1">Technical Skills</label>
        <div>${skills || '<span class="text-muted small">None listed</span>'}</div>
      </div>
      <div class="col-12">
        <label class="small text-muted d-block mb-1">Programming Languages</label>
        <div>${langs || '<span class="text-muted small">None listed</span>'}</div>
      </div>
      <div class="col-12 border-top pt-2">
        <h6 class="fw-bold text-primary mb-2"><i class="bi bi-code-square me-1"></i> Highlight Projects</h6>
        ${projects || '<div class="text-muted small">No projects submitted</div>'}
      </div>
    </div>`;

  // 5. Career Goals
  document.getElementById('modalCareerContent').innerHTML = `
    <div class="card p-3 bg-light border">
      <h6 class="fw-bold text-primary mb-2"><i class="bi bi-compass me-1"></i> Primary Career Track</h6>
      <div class="fs-5 fw-bold text-dark mb-2">${escapeApplicationHtml(cg.primaryGoal || 'Placement')}</div>
      <div class="small text-muted mb-3">${escapeApplicationHtml(cg.specificInterest || 'Eager for enterprise product engineering and full-stack software development.')}</div>
      <div class="alert alert-success d-flex align-items-center gap-2 py-2 mb-0">
        <i class="bi bi-shield-check fs-5"></i>
        <span class="small">Student has acknowledged official profiling consent and verification agreement.</span>
      </div>
    </div>`;

  // Footer Buttons setup
  const approveBtn = document.getElementById('modalApproveBtn');
  const rejectBtn = document.getElementById('modalRejectBtn');
  const deleteBtn = document.getElementById('modalDeleteBtn');

  if (approveBtn) {
    approveBtn.onclick = () => performReviewAction(applicationId, 'APPROVED');
    approveBtn.style.display = status === 'APPROVED' ? 'none' : 'inline-block';
  }
  if (rejectBtn) {
    rejectBtn.onclick = () => performReviewAction(applicationId, 'REJECTED');
    rejectBtn.style.display = status === 'REJECTED' ? 'none' : 'inline-block';
  }
  if (deleteBtn) {
    deleteBtn.onclick = () => performDeleteAction(applicationId, app.registerNumber);
  }

  // Show modal
  if (!detailModalInstance) {
    detailModalInstance = new bootstrap.Modal(document.getElementById('applicationDetailModal'));
  }
  detailModalInstance.show();
};

const performReviewAction = async (applicationId, action) => {
  const confirmation = action === 'APPROVED'
    ? 'Approve this student application and create the official profile in MongoDB Atlas?'
    : 'Reject this student application?';

  if (!window.confirm(confirmation)) return;

  try {
    const res = await apiCall(`/student-applications/${encodeURIComponent(applicationId)}/status`, {
      method: 'PATCH',
      body: { status: action },
    });
    if (res.success) {
      showToast(action === 'APPROVED' ? 'Application approved & student profile saved to Atlas!' : 'Application rejected.', 'success');
      if (detailModalInstance) detailModalInstance.hide();
      await loadApplications(true);
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'danger');
  }
};

const performDeleteAction = async (applicationId, regNo) => {
  if (!window.confirm(`Permanently remove application for ${regNo} from MongoDB Atlas?`)) return;

  try {
    const res = await apiCall(`/student-applications/${encodeURIComponent(applicationId)}`, {
      method: 'DELETE',
    });
    if (res.success) {
      showToast('Application deleted successfully.', 'info');
      if (detailModalInstance) detailModalInstance.hide();
      await loadApplications(true);
    }
  } catch (err) {
    showToast(`Could not delete: ${err.message}`, 'danger');
  }
};

const performResetAction = async (applicationId) => {
  if (!window.confirm('Reset this application back to Pending status for review?')) return;

  try {
    const res = await apiCall(`/student-applications/${encodeURIComponent(applicationId)}/reset`, {
      method: 'PATCH',
    });
    if (res.success) {
      showToast('Application reset to Pending.', 'info');
      await loadApplications(true);
    }
  } catch (err) {
    showToast(`Could not reset: ${err.message}`, 'danger');
  }
};

// ---------------------------------------------------------------------------
// Real-Time Socket.IO Synchronization
// ---------------------------------------------------------------------------
function initApplicationRealtime() {
  if (typeof io !== 'function' && !window.spsSocket) return;
  try {
    const token = localStorage.getItem('sps_token');
    const socket = window.spsSocket || io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 8000,
    });
    window.spsSocket = socket;

    socket.on('application:submitted', (data) => {
      showToast(`⚡ Live Update: New application received from ${data.studentName || 'Student'} (${data.registerNumber})!`, 'info');
      loadApplications(true);
    });

    socket.on('application:reviewed', () => {
      loadApplications(true);
    });

    socket.on('application:deleted', () => {
      loadApplications(true);
    });

    socket.on('application:status_updated', () => {
      loadApplications(true);
    });
  } catch (err) {
    console.warn('Real-time init warning:', err.message);
  }
}

// ---------------------------------------------------------------------------
// Document Initialization
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;
  const role = normalizeClientRole(getCurrentUser()?.role);
  if (role === 'STUDENT') {
    window.location.replace('student-dashboard.html');
    return;
  }

  initLayout('student-applications');

  document.getElementById('applicationStatus')?.addEventListener('change', filterApplicationsList);
  document.getElementById('filterDept')?.addEventListener('change', filterApplicationsList);
  document.getElementById('searchApplications')?.addEventListener('input', filterApplicationsList);
  document.getElementById('refreshApplications')?.addEventListener('click', () => loadApplications(false));

  document.getElementById('applicationsTableBody')?.addEventListener('click', async (event) => {
    const reviewBtn = event.target.closest('[data-review]');
    if (reviewBtn) {
      event.stopPropagation();
      await performReviewAction(reviewBtn.dataset.id, reviewBtn.dataset.review);
      return;
    }

    const actionBtn = event.target.closest('[data-action]');
    if (actionBtn) {
      event.stopPropagation();
      const action = actionBtn.dataset.action;
      if (action === 'DELETE') {
        await performDeleteAction(actionBtn.dataset.id, 'Candidate');
      } else if (action === 'RESET') {
        await performResetAction(actionBtn.dataset.id);
      }
      return;
    }
  });

  await loadApplications();
  initApplicationRealtime();
});
