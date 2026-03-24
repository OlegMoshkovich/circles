import React, { createContext, useContext, useState } from "react";

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
  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}
