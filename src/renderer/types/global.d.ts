// Global type declarations for window.api (Electron IPC bridge)
export {}

declare global {
  interface Window {
    api: {
      auth: {
        login: (data: { username: string; password: string }) => Promise<{ success: boolean; user?: any; message?: string; requirePasswordChange?: boolean }>
        logout: () => Promise<{ success: boolean }>
        getActiveUsers: () => Promise<any[]>
        getUsers: () => Promise<any[]>
        createUser: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>
        updateUser: (data: any) => Promise<{ success: boolean; message?: string }>
        deleteUser: (id: number) => Promise<{ success: boolean }>
        changePassword: (data: { userId: number; oldPassword: string; newPassword: string }) => Promise<{ success: boolean; message?: string; user?: any }>
      }
      products: {
        getAll: (filters?: any) => Promise<any[]>
        getById: (id: number) => Promise<any>
        search: (query: string) => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>
        update: (data: any) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
        getLowStock: () => Promise<any[]>
        getImeis: (productId: number) => Promise<any[]>
        addImeis: (data: any) => Promise<{ success: boolean; count?: number; message?: string }>
        deleteImei: (id: number) => Promise<{ success: boolean; message?: string }>
        getDeleted: () => Promise<any[]>
        restore: (id: number) => Promise<{ success: boolean; message?: string }>
        hardDelete: (id: number) => Promise<{ success: boolean; message?: string }>
      }
      categories: {
        getAll: () => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>
        update: (data: any) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      }
      customers: {
        getAll: (filters?: any) => Promise<any[]>
        getById: (id: number) => Promise<any>
        search: (query: string) => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>
        update: (data: any) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
        payDebt: (data: { id: number; amount: number; note?: string }) => Promise<{ success: boolean; message?: string }>
      }
      suppliers: {
        getAll: () => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>
        update: (data: any) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      }
      orders: {
        create: (data: any) => Promise<{ success: boolean; orderId?: number; orderNumber?: string; message?: string }>
        getAll: (filters?: any) => Promise<any[]>
        getById: (id: number) => Promise<any>
        cancel: (id: number) => Promise<{ success: boolean; message?: string }>
        getTodaySummary: () => Promise<any>
      }
            po: {
        getAll: (filters?: any) => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>
      }
      inventory: {
        addStock: (data: any) => Promise<{ success: boolean; new_quantity?: number; message?: string }>
        getMovements: (filters?: any) => Promise<any[]>
        getLowStock: () => Promise<any[]>
      }
      reports: {
        getSummary: () => Promise<any>
        getDailySales: (date?: string) => Promise<any[]>
        getMonthlySales: (data?: { year?: number; month?: number }) => Promise<any[]>
        getTopProducts: (limit?: number) => Promise<any[]>
        getRevenueByChannel: (filters?: any) => Promise<any>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        getAll: () => Promise<Record<string, string>>
        set: (key: string, value: string) => Promise<{ success: boolean }>
        setMultiple: (data: Record<string, string>) => Promise<{ success: boolean }>
        getDatabasePath: () => Promise<string>
        openDatabaseFolder: () => Promise<{ success: boolean; message?: string }>
        backupDatabase: () => Promise<{ success: boolean; path?: string; cancelled?: boolean; message?: string }>
      }
      print: {
        invoice: (orderId: number) => Promise<{ success: boolean; message?: string }>
        testPrint: (config: any) => Promise<{ success: boolean; message?: string }>
        getAvailablePrinters: () => Promise<any>
        repairTicket: (ticketId: number) => Promise<{ success: boolean; message?: string }>
      }
      warranties: {
        check: (query: string) => Promise<any>
        getAll: (filters?: any) => Promise<any[]>
      }
      repair: {
        getAll: (filters?: any) => Promise<any[]>
        getById: (id: number) => Promise<any>
        create: (data: any) => Promise<{ success: boolean; id?: number; ticketNumber?: string; message?: string }>
        update: (data: any) => Promise<{ success: boolean; message?: string }>
        updateStatus: (data: { id: number; status: string }) => Promise<{ success: boolean; message?: string }>
        addLine: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>
        updateLine: (data: any) => Promise<{ success: boolean; message?: string }>
        deleteLine: (id: number) => Promise<{ success: boolean; message?: string }>
        delete: (id: number) => Promise<{ success: boolean; message?: string }>
      }
      cash: {
        getAll: (filters?: any) => Promise<any[]>
        create: (data: any) => Promise<{ success: boolean; id?: number; message?: string }>
        getTodaySummary: () => Promise<{ total_in: number; total_out: number; balance: number }>
      }
      audit: {
        getAll: (filters?: any) => Promise<any[]>
        log: (data: any) => Promise<{ success: boolean }>
      }
    }
  }
}
