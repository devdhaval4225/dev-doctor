import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const PWAUpdatePrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (needRefresh || offlineReady) {
      setShowPrompt(true);
    }
  }, [needRefresh, offlineReady]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowPrompt(false);
  };

  const update = () => {
    updateServiceWorker(true);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">
              {offlineReady ? 'App Ready' : 'Update Available'}
            </h3>
          </div>
          <button
            onClick={close}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          {offlineReady
            ? 'App is ready to work offline!'
            : 'A new version is available. Click update to refresh the app.'}
        </p>

        <div className="flex gap-2">
          {needRefresh && (
            <button
              onClick={update}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Update
            </button>
          )}
          <button
            onClick={close}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            {offlineReady ? 'Close' : 'Later'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;

