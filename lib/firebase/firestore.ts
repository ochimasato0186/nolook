// Firebase Firestore操作のヘルパー関数
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './config';

// dbをエクスポート
export { db };

// Firebase が無効な場合のエラーメッセージ
const FIREBASE_DISABLED_MESSAGE = 'Firebase is disabled. This operation is not available.';

// Firebase が利用可能かチェック
const isFirebaseAvailable = (): boolean => {
  if (typeof window === 'undefined') {
    // サーバーサイドでは常にfalseを返す
    return false;
  }
  if (!db) {
    console.warn('🔴 Firebase Firestore is not initialized');
    return false;
  }
  return true;
};

// 型定義（ユーザーテーブル構造に基づく）
export interface User {
  id?: string;
  nickname: string;
  email: string;
  password: string;
  years: string;  // 学年
  class: string;  // クラス
  created_at?: Date;
}

export interface Post {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  createdAt?: Date;
}

// 🔍 データ取得関数

// すべてのドキュメントを取得
export const getAllUsers = async (): Promise<User[]> => {
  if (!isFirebaseAvailable()) {
    console.warn(FIREBASE_DISABLED_MESSAGE);
    return [];
  }
  
  try {
    const querySnapshot = await getDocs(collection(db!, 'users'));
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });
    return users;
  } catch (error) {
    console.error('ユーザー取得エラー:', error);
    return [];
  }
};

// 特定のドキュメントを取得
export const getUserById = async (userId: string): Promise<User | null> => {
  if (!isFirebaseAvailable()) {
    console.warn(FIREBASE_DISABLED_MESSAGE);
    return null;
  }
  
  try {
    const docRef = doc(db!, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    } else {
      console.log('ユーザーが見つかりません');
      return null;
    }
  } catch (error) {
    console.error('ユーザー取得エラー:', error);
    return null;
  }
};

// 条件付き検索
export const getUsersByClass = async (className: string): Promise<User[]> => {
  if (!isFirebaseAvailable()) {
    console.warn(FIREBASE_DISABLED_MESSAGE);
    return [];
  }
  
  try {
    const q = query(
      collection(db!, 'users'), 
      where('class', '==', className),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });
    return users;
  } catch (error) {
    console.error('ユーザー検索エラー:', error);
    return [];
  }
};

// 学年で検索
export const getUsersByYear = async (year: string): Promise<User[]> => {
  if (!isFirebaseAvailable()) {
    console.warn(FIREBASE_DISABLED_MESSAGE);
    return [];
  }
  
  try {
    const q = query(
      collection(db!, 'users'), 
      where('years', '==', year),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });
    return users;
  } catch (error) {
    console.error('ユーザー検索エラー:', error);
    return [];
  }
};

// 📝 データ追加関数

// 新しいユーザーを追加
export const addUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<string | null> => {
  if (!isFirebaseAvailable()) {
    console.warn(FIREBASE_DISABLED_MESSAGE);
    return null;
  }
  
  try {
    const docRef = await addDoc(collection(db!, 'users'), {
      ...userData,
      createdAt: new Date()
    });
    console.log('ユーザー追加成功:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('ユーザー追加エラー:', error);
    return null;
  }
};

// ✏️ データ更新関数

// ユーザー情報を更新
export const updateUser = async (userId: string, updateData: Partial<User>): Promise<boolean> => {
  if (!isFirebaseAvailable()) {
    console.warn(FIREBASE_DISABLED_MESSAGE);
    return false;
  }
  
  try {
    const docRef = doc(db!, 'users', userId);
    await updateDoc(docRef, updateData);
    console.log('ユーザー更新成功');
    return true;
  } catch (error) {
    console.error('ユーザー更新エラー:', error);
    return false;
  }
};

// 🗑️ データ削除関数

// ユーザーを削除
export const deleteUser = async (userId: string): Promise<boolean> => {
  if (!isFirebaseAvailable()) {
    console.warn(FIREBASE_DISABLED_MESSAGE);
    return false;
  }
  
  try {
    await deleteDoc(doc(db!, 'users', userId));
    console.log('ユーザー削除成功');
    return true;
  } catch (error) {
    console.error('ユーザー削除エラー:', error);
    return false;
  }
};

// 📊 リアルタイム監視（オプション）
import { onSnapshot } from 'firebase/firestore';

// リアルタイムでユーザー一覧を監視
export const subscribeToUsers = (callback: (users: User[]) => void) => {
  if (!isFirebaseAvailable()) {
    console.warn(FIREBASE_DISABLED_MESSAGE);
    callback([]);
    return () => {}; // 空のunsubscribe関数を返す
  }
  
  const unsubscribe = onSnapshot(collection(db!, 'users'), (querySnapshot) => {
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });
    callback(users);
  });
  
  return unsubscribe; // コンポーネントのクリーンアップで呼び出す
};