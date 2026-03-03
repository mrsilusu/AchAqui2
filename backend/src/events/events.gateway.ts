import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface SocketJwtPayload {
  sub: string;
  email: string;
  role: string;
}

@WebSocketGateway({
  namespace: 'events',
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        this.extractTokenFromHeader(client.handshake.headers.authorization);

      if (!token) {
        throw new UnauthorizedException('Token não fornecido.');
      }

      const payload = await this.jwtService.verifyAsync<SocketJwtPayload>(token, {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      });

      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      client.join(this.getUserRoom(payload.sub));
    } catch (error) {
      this.logger.warn(`Socket rejeitado: ${String(error)}`);
      client.disconnect(true);
    }
  }

  @SubscribeMessage('joinRoom')
  joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { userId: string },
  ) {
    if (!client.data.user || client.data.user.userId !== body.userId) {
      throw new UnauthorizedException('Não autorizado para entrar nesta sala.');
    }

    client.join(this.getUserRoom(body.userId));
    return { joined: true, room: this.getUserRoom(body.userId) };
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(this.getUserRoom(userId)).emit(event, payload);
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private extractTokenFromHeader(authorization?: string) {
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer') {
      return undefined;
    }

    return token;
  }
}
