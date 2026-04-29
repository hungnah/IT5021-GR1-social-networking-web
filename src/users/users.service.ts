import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  googleId?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findAuthByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async create(input: CreateUserInput): Promise<User> {
    const displayName = `${input.firstName} ${input.lastName}`.trim();

    const user = this.usersRepository.create({
      displayName,
      email: input.email,
      password: input.password,
      googleId: input.googleId ?? null,
    });

    return this.usersRepository.save(user);
  }
}
