const crypto = require('node:crypto');
const localStore = require('../../config/local-store');

const checkIns = localStore.collection('matchCheckIns', []);
const reports = localStore.collection('matchReports', []);
const disputes = localStore.collection('matchDisputes', []);

function persist() {
  localStore.saveCollection('matchCheckIns', checkIns);
  localStore.saveCollection('matchReports', reports);
  localStore.saveCollection('matchDisputes', disputes);
}

function getWorkflow(matchId) {
  return {
    matchId,
    checkIns: checkIns.filter((entry) => entry.matchId === matchId).map((entry) => ({ ...entry })),
    reports: reports.filter((entry) => entry.matchId === matchId).map((entry) => ({ ...entry })),
    disputes: disputes.filter((entry) => entry.matchId === matchId).map((entry) => ({ ...entry })),
  };
}

function checkIn(matchId, teamId, captainUserId) {
  const previous = checkIns.find((entry) => entry.matchId === matchId && entry.teamId === teamId);
  if (previous) return { checkIn: { ...previous }, reused: true };
  const entry = { id: crypto.randomUUID(), matchId, teamId, captainUserId, status: 'CONFIRMED', checkedInAt: new Date().toISOString() };
  checkIns.push(entry); persist();
  return { checkIn: { ...entry }, reused: false };
}

function createReport(matchId, input) {
  if (reports.some((entry) => entry.matchId === matchId && entry.submittedForTeamId === input.submittedForTeamId && entry.status === 'PENDING_REVIEW')) {
    return { error: 'El equipo ya tiene un reporte pendiente', status: 409 };
  }
  const now = new Date().toISOString();
  const report = { id: crypto.randomUUID(), matchId, ...input, status: 'PENDING_REVIEW', reviewNote: null, reviewedBy: null, reviewedAt: null, createdAt: now, updatedAt: now };
  reports.push(report); persist();
  return { report: { ...report } };
}

function decideReport(matchId, reportId, { decision, reviewNote, reviewedBy }) {
  const report = reports.find((entry) => entry.id === reportId && entry.matchId === matchId);
  if (!report) return { error: 'Reporte no encontrado', status: 404 };
  if (report.status !== 'PENDING_REVIEW') return { error: 'El reporte ya fue revisado', status: 409 };
  const now = new Date().toISOString();
  report.status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  report.reviewNote = reviewNote || null;
  report.reviewedBy = reviewedBy;
  report.reviewedAt = now;
  report.updatedAt = now;
  if (report.status === 'APPROVED') {
    for (const dispute of disputes.filter((entry) => entry.matchId === matchId && entry.status === 'OPEN')) {
      dispute.status = 'RESOLVED'; dispute.resolution = reviewNote || 'Resuelta al aprobar el resultado oficial'; dispute.resolvedBy = reviewedBy; dispute.resolvedAt = now;
    }
  }
  persist();
  return { report: { ...report } };
}

function createDispute(matchId, input) {
  if (disputes.some((entry) => entry.matchId === matchId && entry.openedBy === input.openedBy && entry.status === 'OPEN')) return { error: 'Ya existe una disputa abierta por esta cuenta', status: 409 };
  const dispute = { id: crypto.randomUUID(), matchId, ...input, status: 'OPEN', createdAt: new Date().toISOString(), resolution: null, resolvedBy: null, resolvedAt: null };
  disputes.push(dispute); persist();
  return { dispute: { ...dispute } };
}

module.exports = { getWorkflow, checkIn, createReport, decideReport, createDispute };
