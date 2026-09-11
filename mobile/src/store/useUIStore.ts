import { create } from 'zustand';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline';
export type BackendStatus = 'online' | 'offline' | 'connecting';

interface UIStore {
  isSidebarOpen: boolean;
  syncStatus: SyncStatus;
  backendStatus: BackendStatus;
  pendingSyncCount: number;

  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setSyncStatus: (status: SyncStatus) => void;
  setBackendStatus: (status: BackendStatus) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: false,
  syncStatus: 'synced',
  backendStatus: 'online',
  pendingSyncCount: 0,

  openSidebar: () => set({ isSidebarOpen: true }),
  closeSidebar: () => set({ isSidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setBackendStatus: (status) => set({ backendStatus: status }),
}));
