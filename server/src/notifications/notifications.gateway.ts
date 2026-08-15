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
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET') || 'fallback-secret';
      const payload = this.jwtService.verify(token, { secret });

      if (payload && payload.sub) {
        const userRoom = `user:${payload.sub}`;
        await client.join(userRoom);
        console.log(`🔌 WebSocket client ${client.id} joined room: ${userRoom}`);
      } else {
        client.disconnect();
      }
    } catch (err) {
      console.log(`❌ WebSocket auth failed for client ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 WebSocket client disconnected: ${client.id}`);
  }

  emitNotification(userPublicId: string, notification: any) {
    const room = `user:${userPublicId}`;
    this.server.to(room).emit('notification', notification);
    console.log(`📡 Emitted real-time notification to room: ${room}`);
  }
}
