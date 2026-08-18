import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from '../entities/notification.entity';
import { Profile } from '../entities/profile.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepoMock: any;
  let profileRepoMock: any;
  let gatewayMock: any;

  const mockProfile = {
    id: 1,
    public_id: 'user-uuid-1',
    username: 'johndoe',
  };

  const mockNotification = {
    id: 10,
    public_id: 'notif-uuid-1',
    user_id: 1,
    type: 'clap',
    message: 'Someone clapped for your article',
    is_read: false,
    read_at: null,
    article_id: 100,
    article: {
      public_id: 'article-uuid-1',
      title: 'Test Article Title',
    },
    created_at: new Date(),
  };

  beforeEach(async () => {
    notificationRepoMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      }),
    };

    profileRepoMock = {
      findOne: jest.fn(),
    };

    gatewayMock = {
      emitNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepoMock,
        },
        {
          provide: getRepositoryToken(Profile),
          useValue: profileRepoMock,
        },
        {
          provide: NotificationsGateway,
          useValue: gatewayMock,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getForUser', () => {
    it('should throw NotFoundException if user profile is not found', async () => {
      profileRepoMock.findOne.mockResolvedValue(null);
      await expect(service.getForUser('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return public notifications for user', async () => {
      profileRepoMock.findOne.mockResolvedValue(mockProfile);
      notificationRepoMock.find.mockResolvedValue([mockNotification]);

      const result = await service.getForUser('user-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'notif-uuid-1',
        type: 'clap',
        message: 'Someone clapped for your article',
        is_read: false,
        read_at: null,
        article_id: 'article-uuid-1',
        created_at: mockNotification.created_at,
        article: {
          id: 'article-uuid-1',
          title: 'Test Article Title',
        },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      profileRepoMock.findOne.mockResolvedValue(mockProfile);
      notificationRepoMock.count.mockResolvedValue(3);

      const result = await service.getUnreadCount('user-uuid-1');
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('markAllRead', () => {
    it('should update all unread notifications to read for user', async () => {
      profileRepoMock.findOne.mockResolvedValue(mockProfile);
      notificationRepoMock.update.mockResolvedValue({ affected: 2 });

      const result = await service.markAllRead('user-uuid-1');
      expect(result).toEqual({ success: true });
      expect(notificationRepoMock.update).toHaveBeenCalledWith(
        { user_id: mockProfile.id, is_read: false },
        expect.objectContaining({ is_read: true }),
      );
    });
  });

  describe('markOneRead', () => {
    it('should throw NotFoundException if notification not found', async () => {
      notificationRepoMock.findOne.mockResolvedValue(null);
      await expect(service.markOneRead('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should mark single notification read and set read_at', async () => {
      notificationRepoMock.findOne.mockResolvedValue({ ...mockNotification });
      notificationRepoMock.save.mockImplementation((n) => Promise.resolve(n));

      const result = await service.markOneRead('notif-uuid-1');
      expect(result).toEqual({ success: true });
      expect(notificationRepoMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          is_read: true,
          read_at: expect.any(Date),
        }),
      );
    });
  });

  describe('deleteNotification', () => {
    it('should remove a notification for user', async () => {
      profileRepoMock.findOne.mockResolvedValue(mockProfile);
      notificationRepoMock.findOne.mockResolvedValue(mockNotification);
      notificationRepoMock.remove.mockResolvedValue(mockNotification);

      const result = await service.deleteNotification(
        'user-uuid-1',
        'notif-uuid-1',
      );
      expect(result).toEqual({ success: true });
      expect(notificationRepoMock.remove).toHaveBeenCalledWith(
        mockNotification,
      );
    });
  });

  describe('create', () => {
    it('should create notification and emit real-time event', async () => {
      notificationRepoMock.create.mockReturnValue(mockNotification);
      notificationRepoMock.save.mockResolvedValue(mockNotification);
      profileRepoMock.findOne.mockResolvedValue(mockProfile);

      await service.create(1, 'clap', 'Someone clapped', 100);

      expect(notificationRepoMock.create).toHaveBeenCalledWith({
        user_id: 1,
        type: 'clap',
        message: 'Someone clapped',
        article_id: 100,
      });
      expect(gatewayMock.emitNotification).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ id: 'notif-uuid-1' }),
      );
    });
  });
});
