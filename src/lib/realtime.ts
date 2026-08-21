import { isSupabaseConfigured } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let ws: WebSocket | null = null;
let heartbeatInterval: any = null;
let reconnectTimeout: any = null;
let ref = 0;
let isIntentionalClose = false;

export type SyncStatus = 'online' | 'syncing' | 'offline';

export const initRealtime = (
  familyId: string,
  token: string,
  onUpdate: (payload: any) => void,
  onStatusChange: (status: SyncStatus) => void,
  onReconnect: () => void
) => {
  if (!isSupabaseConfigured || !SUPABASE_URL || !ANON_KEY) return () => {};

  isIntentionalClose = false;
  const wsUrl = SUPABASE_URL.replace('http', 'ws') + `/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0`;

  const connect = (isReconnect = false) => {
    if (isIntentionalClose) return;
    
    onStatusChange('syncing');
    
    if (isReconnect) {
      onReconnect(); // Trigger re-fetch of all states to catch up on missed events
    }

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      onStatusChange('online');
      ref++;
      
      // Join realtime channel for all public tables
      const joinPayload = [
        ref.toString(),
        ref.toString(),
        "realtime:public",
        "phx_join",
        {
          config: {
            postgres_changes: [{ event: "*", schema: "public" }]
          },
          access_token: token
        }
      ];
      
      ws?.send(JSON.stringify(joinPayload));

      // Heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ref++;
          ws.send(JSON.stringify([null, ref.toString(), "phoenix", "heartbeat", {}]));
        }
      }, 30000);
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        const [join_ref, msg_ref, topic, event, payload] = data;

        if (event === "postgres_changes") {
          const record = payload.data.record || payload.data.old_record;
          
          // STRICT FAMILY ISOLATION FILTER (Frontend Protection)
          // Note: Some tables like budget_categories do not have family_id, 
          // we rely on DB RLS which filters broadcasts via access_token.
          if (record && (record.family_id === familyId || record.family_id === undefined)) {
            onUpdate({
              table: payload.data.table,
              type: payload.data.type, // INSERT, UPDATE, DELETE
              record: payload.data.record,
              old_record: payload.data.old_record
            });
          }
        }
      } catch (e) {
        console.error("Realtime message parse error:", e);
      }
    };

    ws.onclose = () => {
      onStatusChange('offline');
      clearInterval(heartbeatInterval);
      
      if (!isIntentionalClose) {
        // Exponential backoff or static 3s reconnect
        reconnectTimeout = setTimeout(() => connect(true), 3000);
      }
    };
    
    ws.onerror = () => {
      // Handled by onclose
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  };

  connect();

  return () => {
    isIntentionalClose = true;
    if (ws) {
      ws.close();
      ws = null;
    }
    clearInterval(heartbeatInterval);
    clearTimeout(reconnectTimeout);
  };
};
