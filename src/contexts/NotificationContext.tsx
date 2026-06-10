import React, { createContext, useContext, useMemo, useState } from "react";

type Ctx = {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
};

const NotificationContext = createContext<Ctx>({
  unreadCount: 0,
  setUnreadCount: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const value = useMemo(() => ({ unreadCount, setUnreadCount }), [unreadCount]);
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}
