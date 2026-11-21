import mqtt, { MqttClient } from 'mqtt';
import { RoundState } from '../types';

const BROKER_URLS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

const BROADCAST_CHANNEL_NAME = 'banker_app_sync_channel';

interface SyncMessage {
  type: 'ROUND_SYNC' | 'REQUEST_SYNC';
  matchCode: string;
  round?: RoundState;
  timestamp: number;
}

let mqttClient: MqttClient | null = null;
let currentMatchCode: string | null = null;
let broadcastChannel: BroadcastChannel | null = null;
let isOwnerRole = false;
let activeRoundRef: RoundState | null = null;

// Callbacks
type StatusCallback = (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
type UpdateCallback = (round: RoundState) => void;

let onStatusChange: StatusCallback | null = null;
let onRoundReceived: UpdateCallback | null = null;

/**
 * Initialize local BroadcastChannel for cross-tab sync
 */
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        const msg = event.data as SyncMessage;
        if (!msg || !msg.matchCode) return;
        if (msg.matchCode.toUpperCase() === currentMatchCode?.toUpperCase()) {
          if (msg.type === 'ROUND_SYNC' && msg.round && onRoundReceived) {
            onRoundReceived(msg.round);
          } else if (msg.type === 'REQUEST_SYNC' && isOwnerRole && activeRoundRef) {
            broadcastLocalRound(activeRoundRef);
          }
        }
      };
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

/**
 * Encode round state into a compact base64 URL safe string for immediate snapshot loading
 */
export function encodeRoundSnapshot(round: RoundState): string {
  try {
    const json = JSON.stringify(round);
    return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
  } catch (e) {
    console.error('Failed to encode snapshot:', e);
    return '';
  }
}

/**
 * Decode round state from base64 URL string
 */
export function decodeRoundSnapshot(snapshotStr: string): RoundState | null {
  try {
    if (!snapshotStr) return null;
    const json = decodeURIComponent(escape(atob(decodeURIComponent(snapshotStr))));
    const parsed = JSON.parse(json);
    if (parsed && parsed.players && parsed.holesData) {
      return parsed as RoundState;
    }
    return null;
  } catch (e) {
    console.warn('Could not decode snapshot:', e);
    return null;
  }
}

/**
 * Generate full shareable link with match code and snapshot
 */
export function generateShareableLink(round: RoundState): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const code = (round.matchCode || 'BANKER').toUpperCase();
  const snapshot = encodeRoundSnapshot(round);
  return `${origin}${pathname}?view=${code}#s=${snapshot}`;
}

/**
 * Connect to live sync room
 */
export function connectLiveRoom(
  matchCode: string,
  isOwner: boolean,
  initialRound?: RoundState,
  onUpdate?: UpdateCallback,
  onStatus?: StatusCallback
) {
  const normalizedCode = matchCode.trim().toUpperCase();
  currentMatchCode = normalizedCode;
  isOwnerRole = isOwner;
  if (initialRound) activeRoundRef = initialRound;
  if (onUpdate) onRoundReceived = onUpdate;
  if (onStatus) onStatusChange = onStatus;

  getBroadcastChannel();

  // If already connected to the same room, simply re-subscribe or sync
  if (mqttClient && mqttClient.connected) {
    const topic = `bankerapp/v1/rooms/${normalizedCode}`;
    mqttClient.subscribe(topic, { qos: 1 }, () => {
      onStatusChange?.('connected');
      if (isOwner && activeRoundRef) {
        publishRoundUpdate(activeRoundRef);
      } else {
        requestSyncFromOwner(normalizedCode);
      }
    });
    return;
  }

  // Connect to primary broker
  onStatusChange?.('connecting');

  const clientId = `banker_${isOwner ? 'owner' : 'spec'}_${Math.random().toString(16).slice(2, 8)}`;
  
  try {
    mqttClient = mqtt.connect(BROKER_URLS[0], {
      clientId,
      clean: true,
      connectTimeout: 7000,
      reconnectPeriod: 4000,
      keepalive: 30,
    });

    mqttClient.on('connect', () => {
      onStatusChange?.('connected');
      const topic = `bankerapp/v1/rooms/${normalizedCode}`;
      mqttClient?.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          if (isOwner && activeRoundRef) {
            publishRoundUpdate(activeRoundRef);
          } else {
            requestSyncFromOwner(normalizedCode);
          }
        }
      });
    });

    mqttClient.on('message', (_topic, payload) => {
      try {
        const msg: SyncMessage = JSON.parse(payload.toString());
        if (msg.matchCode?.toUpperCase() !== currentMatchCode) return;

        if (msg.type === 'ROUND_SYNC' && msg.round) {
          if (!isOwnerRole) {
            onRoundReceived?.(msg.round);
          }
        } else if (msg.type === 'REQUEST_SYNC') {
          if (isOwnerRole && activeRoundRef) {
            publishRoundUpdate(activeRoundRef);
          }
        }
      } catch (err) {
        console.warn('Error parsing incoming sync message:', err);
      }
    });

    mqttClient.on('reconnect', () => {
      onStatusChange?.('connecting');
    });

    mqttClient.on('error', () => {
      onStatusChange?.('error');
    });

    mqttClient.on('offline', () => {
      onStatusChange?.('disconnected');
    });
  } catch (e) {
    console.error('MQTT connection error:', e);
    onStatusChange?.('error');
  }
}

/**
 * Publish updated round state to all connected spectators
 */
export function publishRoundUpdate(round: RoundState) {
  activeRoundRef = round;
  const matchCode = (round.matchCode || currentMatchCode || 'BANKER').toUpperCase();
  currentMatchCode = matchCode;

  // 1. Broadcast locally
  broadcastLocalRound(round);

  // 2. Publish via MQTT
  if (mqttClient && mqttClient.connected) {
    const topic = `bankerapp/v1/rooms/${matchCode}`;
    const message: SyncMessage = {
      type: 'ROUND_SYNC',
      matchCode,
      round,
      timestamp: Date.now(),
    };
    mqttClient.publish(topic, JSON.stringify(message), { qos: 1, retain: true });
  }
}

function broadcastLocalRound(round: RoundState) {
  const ch = getBroadcastChannel();
  if (ch) {
    const matchCode = (round.matchCode || currentMatchCode || 'BANKER').toUpperCase();
    ch.postMessage({
      type: 'ROUND_SYNC',
      matchCode,
      round,
      timestamp: Date.now(),
    });
  }
}

/**
 * Request sync from owner
 */
export function requestSyncFromOwner(matchCode: string) {
  const normalized = matchCode.trim().toUpperCase();
  // Request via local channel
  const ch = getBroadcastChannel();
  if (ch) {
    ch.postMessage({
      type: 'REQUEST_SYNC',
      matchCode: normalized,
      timestamp: Date.now(),
    });
  }

  // Request via MQTT
  if (mqttClient && mqttClient.connected) {
    const topic = `bankerapp/v1/rooms/${normalized}`;
    const message: SyncMessage = {
      type: 'REQUEST_SYNC',
      matchCode: normalized,
      timestamp: Date.now(),
    };
    mqttClient.publish(topic, JSON.stringify(message), { qos: 1 });
  }
}

/**
 * Disconnect and leave live room
 */
export function disconnectLiveRoom() {
  if (mqttClient) {
    try {
      mqttClient.end(true);
    } catch {
      // ignore
    }
    mqttClient = null;
  }
  currentMatchCode = null;
  onStatusChange = null;
  onRoundReceived = null;
}
