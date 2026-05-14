import { Repository } from 'typeorm';
import { User } from './user.entity';
export interface CreateUserInput {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    googleId?: string | null;
}
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: Repository<User>);
    findByEmail(email: string): Promise<User | null>;
    findAuthByEmail(email: string): Promise<User | null>;
    findByGoogleId(googleId: string): Promise<User | null>;
    create(input: CreateUserInput): Promise<User>;
}
