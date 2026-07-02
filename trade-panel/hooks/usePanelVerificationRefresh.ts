'use client';

import { useEffect } from 'react';
import {
  subscribePanelVerificationRefresh,
  type PanelVerificationChangedMessage,
} from '@/lib/panel-verification-ws';

export function usePanelVerificationRefresh(
  onRefresh: (msg: PanelVerificationChangedMessage) => void,
) {
  useEffect(() => {
    return subscribePanelVerificationRefresh(onRefresh);
  }, [onRefresh]);
}
