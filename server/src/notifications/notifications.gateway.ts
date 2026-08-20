import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as Record<string, string> | undefined)?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const secret =
        this.configService.get<string>('JWT_SECRET') || 'fallback-secret';

      // verify() returns the typed payload; only sub is needed for the room
      const payload = this.jwtService.verify<{ sub?: string }>(token, {
        secret,
      });
      const userSub: string | undefined = payload.sub;

      if (userSub) {
        const userRoom = `user:${userSub}`;
        await client.join(userRoom);
        console.log(
          `🔌 WebSocket client ${client.id} joined room: ${userRoom}`,
        );
      } else {
        client.disconnect();
      }
    } catch {
      console.log(`❌ WebSocket auth failed for client ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 WebSocket client disconnected: ${client.id}`);
  }

  emitNotification(userPublicId: string, notification: object) {
    const room = `user:${userPublicId}`;
    this.server.to(room).emit('notification', notification);
    console.log(`📡 Emitted real-time notification to room: ${room}`);
  }
}
