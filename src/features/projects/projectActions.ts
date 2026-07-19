import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { projectConverter } from '../../lib/firestoreConverters';

const projectsCollection = collection(db, 'projects').withConverter(projectConverter);

export async function createProject(input: { name: string; code: string; color: string }) {
  await addDoc(projectsCollection, {
    id: '',
    name: input.name,
    code: input.code,
    color: input.color,
    archived: false,
    issueCounter: 0,
  });
}

export async function updateProject(id: string, patch: { name: string; code: string; color: string }) {
  await updateDoc(doc(db, 'projects', id), patch);
}

export async function setProjectArchived(id: string, archived: boolean) {
  await updateDoc(doc(db, 'projects', id), { archived });
}
