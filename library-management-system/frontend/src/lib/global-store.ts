import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// UI状態の型定義
interface UIState {
  // サイドバーの状態
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  
  // モーダルの状態
  modals: {
    bookDetail: { isOpen: boolean; bookId?: number };
    createBook: { isOpen: boolean };
    editBook: { isOpen: boolean; bookId?: number };
    createPurchaseRequest: { isOpen: boolean };
    userProfile: { isOpen: boolean };
  };
  openModal: (modalName: keyof UIState['modals'], data?: any) => void;
  closeModal: (modalName: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  
  // 通知の状態
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
  }>;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // 検索・フィルターの状態
  searchFilters: {
    books: {
      title: string;
      author: string;
      category: string;
      availableOnly: boolean;
    };
    users: {
      role: string;
      department: string;
      active: boolean;
    };
  };
  updateSearchFilter: (section: keyof UIState['searchFilters'], filters: Partial<any>) => void;
  clearSearchFilters: (section: keyof UIState['searchFilters']) => void;
  
  // ページネーションの状態
  pagination: {
    books: { page: number; limit: number };
    users: { page: number; limit: number };
    loans: { page: number; limit: number };
    purchaseRequests: { page: number; limit: number };
  };
  updatePagination: (section: keyof UIState['pagination'], data: Partial<{ page: number; limit: number }>) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // サイドバーの初期状態
      sidebarOpen: false,
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      
      // モーダルの初期状態
      modals: {
        bookDetail: { isOpen: false },
        createBook: { isOpen: false },
        editBook: { isOpen: false },
        createPurchaseRequest: { isOpen: false },
        userProfile: { isOpen: false },
      },
      openModal: (modalName, data) => set((state) => ({
        modals: {
          ...state.modals,
          [modalName]: { isOpen: true, ...data },
        },
      })),
      closeModal: (modalName) => set((state) => ({
        modals: {
          ...state.modals,
          [modalName]: { isOpen: false },
        },
      })),
      closeAllModals: () => set((state) => ({
        modals: Object.keys(state.modals).reduce((acc, key) => ({
          ...acc,
          [key]: { isOpen: false },
        }), {} as UIState['modals']),
      })),
      
      // 通知の初期状態
      notifications: [],
      addNotification: (notification) => {
        const id = Date.now().toString();
        const newNotification = { ...notification, id };
        
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));
        
        // 自動削除（デフォルト5秒）
        const duration = notification.duration || 5000;
        setTimeout(() => {
          get().removeNotification(id);
        }, duration);
      },
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id),
      })),
      clearNotifications: () => set({ notifications: [] }),
      
      // 検索・フィルターの初期状態
      searchFilters: {
        books: {
          title: '',
          author: '',
          category: '',
          availableOnly: false,
        },
        users: {
          role: '',
          department: '',
          active: true,
        },
      },
      updateSearchFilter: (section, filters) => set((state) => ({
        searchFilters: {
          ...state.searchFilters,
          [section]: {
            ...state.searchFilters[section],
            ...filters,
          },
        },
      })),
      clearSearchFilters: (section) => set((state) => ({
        searchFilters: {
          ...state.searchFilters,
          [section]: section === 'books' ? {
            title: '',
            author: '',
            category: '',
            availableOnly: false,
          } : {
            role: '',
            department: '',
            active: true,
          },
        },
      })),
      
      // ページネーションの初期状態
      pagination: {
        books: { page: 1, limit: 20 },
        users: { page: 1, limit: 20 },
        loans: { page: 1, limit: 20 },
        purchaseRequests: { page: 1, limit: 20 },
      },
      updatePagination: (section, data) => set((state) => ({
        pagination: {
          ...state.pagination,
          [section]: {
            ...state.pagination[section],
            ...data,
          },
        },
      })),
    }),
    {
      name: 'ui-storage',
      // 通知は永続化しない
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        searchFilters: state.searchFilters,
        pagination: state.pagination,
      }),
    }
  )
); 