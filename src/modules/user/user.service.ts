import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });

    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    return this.prisma.user.create({ data: dto });
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new NotFoundException(`User "${username}" not found`);
    return user;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User not found`);
    return user;
  }
}
