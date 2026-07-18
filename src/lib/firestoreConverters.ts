import { Timestamp, type FirestoreDataConverter } from 'firebase/firestore';
import type { Issue, IssueLink, Priority, Project, Status, User, WorkflowType } from '../features/issues/types';

function toDateOrNull(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function toDateOrNow(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}

export const projectConverter: FirestoreDataConverter<Project> = {
  toFirestore: (project) => ({
    name: project.name,
    color: project.color,
    archived: project.archived,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      color: data.color,
      archived: data.archived ?? false,
    };
  },
};

export const workflowTypeConverter: FirestoreDataConverter<WorkflowType> = {
  toFirestore: (workflowType) => ({
    name: workflowType.name,
    color: workflowType.color,
    order: workflowType.order,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      color: data.color,
      order: data.order ?? 0,
    };
  },
};

export const statusConverter: FirestoreDataConverter<Status> = {
  toFirestore: (status) => ({
    workflowTypeId: status.workflowTypeId,
    label: status.label,
    progressPercent: status.progressPercent,
    order: status.order,
    color: status.color,
    isDefault: status.isDefault,
    archived: status.archived,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();
    return {
      id: snap.id,
      workflowTypeId: data.workflowTypeId,
      label: data.label,
      progressPercent: data.progressPercent ?? 0,
      order: data.order ?? 0,
      color: data.color,
      isDefault: data.isDefault ?? false,
      archived: data.archived ?? false,
    };
  },
};

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore: (user) => ({
    name: user.name,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    fcmTokens: user.fcmTokens ?? [],
  }),
  fromFirestore: (snap) => {
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      avatarUrl: data.avatarUrl ?? undefined,
      role: data.role ?? 'member',
      fcmTokens: (data.fcmTokens as string[] | undefined) ?? undefined,
    };
  },
};

export const issueConverter: FirestoreDataConverter<Issue> = {
  toFirestore: (issue) => ({
    projectId: issue.projectId,
    workflowTypeId: issue.workflowTypeId,
    title: issue.title,
    memo: issue.memo,
    memoFormat: issue.memoFormat,
    parentId: issue.parentId,
    statusId: issue.statusId,
    assigneeIds: issue.assigneeIds,
    priority: issue.priority,
    dueDate: issue.dueDate instanceof Date ? Timestamp.fromDate(issue.dueDate) : (issue.dueDate ?? null),
    links: issue.links,
    createdAt: issue.createdAt instanceof Date ? Timestamp.fromDate(issue.createdAt) : issue.createdAt,
    updatedAt: issue.updatedAt instanceof Date ? Timestamp.fromDate(issue.updatedAt) : issue.updatedAt,
  }),
  fromFirestore: (snap) => {
    const data = snap.data();
    return {
      id: snap.id,
      projectId: data.projectId,
      workflowTypeId: data.workflowTypeId,
      title: data.title,
      memo: data.memo ?? '',
      memoFormat: (data.memoFormat as Issue['memoFormat']) ?? 'text',
      parentId: data.parentId ?? null,
      statusId: data.statusId,
      assigneeIds: (data.assigneeIds as string[]) ?? [],
      priority: (data.priority as Priority) ?? 'medium',
      dueDate: toDateOrNull(data.dueDate),
      links: (data.links as IssueLink[]) ?? [],
      createdAt: toDateOrNow(data.createdAt),
      updatedAt: toDateOrNow(data.updatedAt),
      searchTokens: data.searchTokens as string[] | undefined,
      searchReading: data.searchReading as string | undefined,
    };
  },
};
