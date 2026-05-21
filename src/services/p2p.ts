import Peer from 'peerjs';
import type { Pact, CombatData, Card } from '@/types/game';

export interface P2PHandlers {
  onHandshake: (name: string) => void;
  onGameStart: (data: any) => void;
  onStateSync: (territories: any, phase: any, reinforcements: any) => void;
  onEndTurn: () => void;
  onDiploPropose: (pact: Pact) => void;
  onDiploAccept: (pact: Pact) => void;
  onDiploReject: () => void;
  onDiploBreach: (pactId: number, sanction: string) => void;
  onDrawCard: (playerIdx: number, card: Card) => void;
  onCombatSync: (data: CombatData) => void;
}

let currentHandlers: P2PHandlers | null = null;

export function createPeer(handlers: P2PHandlers): Peer {
  currentHandlers = handlers;
  const peer = new Peer();

  peer.on('connection', (conn) => {
    setupConnection(conn);
  });

  peer.on('error', (err) => {
    console.error('PeerJS error:', err);
  });

  return peer;
}

export function connectToPeer(
  peer: Peer,
  hostId: string,
  localPlayerIndex: number,
  localName: string
): void {
  const conn = peer.connect(hostId);
  setupConnection(conn);

  conn.on('open', () => {
    conn.send({ type: 'HANDSHAKE', name: localName });
  });
}

function setupConnection(conn: any) {
  const handlers = currentHandlers;
  if (!handlers) return;

  conn.on('data', (data: any) => {
    switch (data.type) {
      case 'HANDSHAKE':
        handlers.onHandshake(data.name);
        break;
      case 'START_GAME':
        handlers.onGameStart(data);
        break;
      case 'SYNC_STATE':
        handlers.onStateSync(data.territories, data.phase, data.reinforcements);
        break;
      case 'END_TURN':
        handlers.onEndTurn();
        break;
      case 'DIPLO_PROPOSE':
        handlers.onDiploPropose(data.pact);
        break;
      case 'DIPLO_ACCEPT':
        handlers.onDiploAccept(data.pact);
        break;
      case 'DIPLO_REJECT':
        handlers.onDiploReject();
        break;
      case 'DIPLO_BREACH':
        handlers.onDiploBreach(data.pactId, data.sanction);
        break;
      case 'DRAW_CARD':
        handlers.onDrawCard(data.playerIdx, data.card);
        break;
      case 'SYNC_COMBAT':
        handlers.onCombatSync(data);
        break;
    }
  });

  conn.on('close', () => {
    console.log('Connection closed');
  });
}

export function broadcast(connection: any, data: any): void {
  if (connection) {
    connection.send(data);
  }
}

export function startMultiplayer(handlers: P2PHandlers): Peer {
  return createPeer(handlers);
}
