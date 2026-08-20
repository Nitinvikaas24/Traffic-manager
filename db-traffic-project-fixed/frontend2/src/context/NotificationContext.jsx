import React, { createContext, useCallback, useContext, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const NotificationContext = createContext(() => {});

export const useNotify = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const [toast, setToast] = useState(null); // { message, severity, key }

  const notify = useCallback((message, severity = 'success') => {
    setToast({ message, severity, key: Date.now() });
  }, []);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setToast(null);
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert onClose={handleClose} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotificationContext.Provider>
  );
}
