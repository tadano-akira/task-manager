import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { sendNotificationToUsers } from './messagingUtils';

const DUE_SOON_THRESHOLD_DAYS = 3; // ダッシュボードの期限接近アラートと同じ閾値(仕様書2.3)

// 担当者アサイン時・ステータス変更時にPUSH通知する（仕様書3章）。
// tokenizeIssue(searchTokens等の書き戻し)とは別トリガーだが、
// 同じドキュメントへの書き込みで再度呼ばれてもassigneeIds/statusIdが
// 変化していなければ何もしないため、無限ループやループ通知にはならない。
export const onIssueWrittenNotify = onDocumentWritten('issues/{issueId}', async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after) return; // 削除時は何もしない

  const beforeAssignees: string[] = before?.assigneeIds ?? [];
  const afterAssignees: string[] = after.assigneeIds ?? [];
  const newlyAssigned = afterAssignees.filter((id) => !beforeAssignees.includes(id));

  if (newlyAssigned.length > 0) {
    await sendNotificationToUsers(newlyAssigned, {
      title: '新しい課題が割り当てられました',
      body: after.title ?? '',
    });
  }

  if (before && before.statusId !== after.statusId) {
    await sendNotificationToUsers(afterAssignees, {
      title: 'ステータスが変更されました',
      body: after.title ?? '',
    });
  }

  // 期限が変更されたら、期限接近バッチの「通知済みフラグ」をリセットする
  // (変更前の期限で既に通知済みでも、新しい期限に対しては再度通知の余地を残す)。
  const beforeDueMs = before?.dueDate?.toMillis?.() ?? null;
  const afterDueMs = after.dueDate?.toMillis?.() ?? null;
  if (before && beforeDueMs !== afterDueMs && after.dueDateAlertSentAt) {
    await event.data!.after.ref.update({ dueDateAlertSentAt: null });
  }
});

// 期限接近の課題を1日1回まとめて通知する（仕様書3章、バッチ判定）。
export const notifyDueDateApproaching = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'Asia/Tokyo' },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const soonBoundary = new Date(now.getTime() + DUE_SOON_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

    const statusSnap = await db.collection('statuses').get();
    const completedStatusIds = new Set(
      statusSnap.docs.filter((d) => (d.data().progressPercent ?? 0) >= 100).map((d) => d.id)
    );

    const issuesSnap = await db
      .collection('issues')
      .where('dueDate', '>=', Timestamp.fromDate(now))
      .where('dueDate', '<=', Timestamp.fromDate(soonBoundary))
      .get();

    for (const doc of issuesSnap.docs) {
      const issue = doc.data();
      if (completedStatusIds.has(issue.statusId)) continue; // 完了済みは通知しない
      if (issue.dueDateAlertSentAt) continue; // 既に通知済み(期限変更時のみリセットされる)
      const assigneeIds: string[] = issue.assigneeIds ?? [];
      if (assigneeIds.length === 0) continue;

      await sendNotificationToUsers(assigneeIds, {
        title: '期限が近づいています',
        body: issue.title ?? '',
      });
      await doc.ref.update({ dueDateAlertSentAt: Timestamp.now() });
    }
  }
);
