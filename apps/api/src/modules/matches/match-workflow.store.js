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
  const report = { id: crypto.randomUUID(), matchId, ...input, status: 'PENDING_REVIEW', comparisonStatus: 'WAITING_OPPONENT', reviewNote: null, reviewedBy: null, reviewedAt: null, createdAt: now, updatedAt: now };
  reports.push(report);
  const pending = reports.filter((entry) => entry.matchId === matchId && entry.status === 'PENDING_REVIEW');
  const opponent = pending.find((entry) => entry.id !== report.id && entry.submittedForTeamId !== report.submittedForTeamId);
  let comparison = 'WAITING_OPPONENT';
  if (opponent) {
    comparison = opponent.team1Score === report.team1Score && opponent.team2Score === report.team2Score ? 'MATCHED' : 'CONFLICT';
    report.comparisonStatus = comparison;
    opponent.comparisonStatus = comparison;
    opponent.updatedAt = now;
    if (comparison === 'CONFLICT' && !disputes.some((entry) => entry.matchId === matchId && entry.status === 'OPEN' && entry.systemGenerated)) {
      disputes.push({
        id: crypto.randomUUID(), matchId, openedBy: 'system', teamId: null, systemGenerated: true,
        reason: `Los capitanes reportaron marcadores distintos: ${opponent.team1Score}-${opponent.team2Score} y ${report.team1Score}-${report.team2Score}`,
        evidenceUrl: null, status: 'OPEN', createdAt: now, resolution: null, resolvedBy: null, resolvedAt: null,
      });
    }
  }
  persist();
  return { report: { ...report }, comparison };
}

function decideReport(matchId, reportId, { decision, reviewNote, reviewedBy }) {
  const report = reports.find((entry) => entry.id === reportId && entry.matchId === matchId);
  if (!report) return { error: 'Reporte no encontrado', status: 404 };
  if (report.status !== 'PENDING_REVIEW') return { error: 'El reporte ya fue revisado', status: 409 };
  if (decision === 'approve' && disputes.some((entry) => entry.matchId === matchId && entry.status === 'OPEN')) {
    return { error: 'Resuelve las disputas abiertas antes de aprobar el resultado', status: 409 };
  }
  const now = new Date().toISOString();
  report.status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
  report.reviewNote = reviewNote || null;
  report.reviewedBy = reviewedBy;
  report.reviewedAt = now;
  report.updatedAt = now;
  persist();
  return { report: { ...report } };
}

function createDispute(matchId, input) {
  if (disputes.some((entry) => entry.matchId === matchId && entry.openedBy === input.openedBy && entry.status === 'OPEN')) return { error: 'Ya existe una disputa abierta por esta cuenta', status: 409 };
  const dispute = { id: crypto.randomUUID(), matchId, ...input, status: 'OPEN', createdAt: new Date().toISOString(), resolution: null, resolvedBy: null, resolvedAt: null };
  disputes.push(dispute); persist();
  return { dispute: { ...dispute } };
}

function decideDispute(matchId, disputeId, { decision, resolution, resolvedBy }) {
  const dispute = disputes.find((entry) => entry.id === disputeId && entry.matchId === matchId);
  if (!dispute) return { error: 'Disputa no encontrada', status: 404 };
  if (dispute.status !== 'OPEN') return { error: 'La disputa ya fue resuelta', status: 409 };
  const now = new Date().toISOString();
  dispute.status = 'RESOLVED';
  dispute.decision = decision;
  dispute.resolution = resolution;
  dispute.resolvedBy = resolvedBy;
  dispute.resolvedAt = now;
  persist();
  return { dispute: { ...dispute } };
}

module.exports = { getWorkflow, checkIn, createReport, decideReport, createDispute, decideDispute };
