import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let serviceMock: any;

  const mockReq = {
    user: {
      userId: 'user-uuid-1',
    },
  };

  beforeEach(async () => {
    serviceMock = {
      getForUser: jest.fn().mockResolvedValue([]),
      getUnreadCount: jest.fn().mockResolvedValue({ count: 0 }),
      markAllRead: jest.fn().mockResolvedValue({ success: true }),
      markOneRead: jest.fn().mockResolvedValue({ success: true }),
      deleteNotification: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll should call service.getForUser', async () => {
    await controller.getAll(mockReq);
    expect(serviceMock.getForUser).toHaveBeenCalledWith('user-uuid-1');
  });

  it('getUnreadCount should call service.getUnreadCount', async () => {
    await controller.getUnreadCount(mockReq);
    expect(serviceMock.getUnreadCount).toHaveBeenCalledWith('user-uuid-1');
  });

  it('markAllRead should call service.markAllRead', async () => {
    await controller.markAllRead(mockReq);
    expect(serviceMock.markAllRead).toHaveBeenCalledWith('user-uuid-1');
  });

  it('markOneRead should call service.markOneRead', async () => {
    await controller.markOneRead('notif-uuid-1');
    expect(serviceMock.markOneRead).toHaveBeenCalledWith('notif-uuid-1');
  });

  it('deleteOne should call service.deleteNotification', async () => {
    await controller.deleteOne(mockReq, 'notif-uuid-1');
    expect(serviceMock.deleteNotification).toHaveBeenCalledWith('user-uuid-1', 'notif-uuid-1');
  });
});
