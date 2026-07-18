import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { tokenizeIssue } from './tokenizeIssue';
export { onUserCreate } from './onUserCreate';
export { claimFirstAdmin } from './claimFirstAdmin';
export { onIssueWrittenNotify, notifyDueDateApproaching } from './notifications';
