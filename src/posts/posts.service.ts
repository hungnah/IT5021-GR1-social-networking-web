import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { Post, PrivacyLevel } from './post.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {}

  async create(userId: string, dto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create({
      userId,
      content: dto.content,
      privacyStatus: dto.privacyStatus ?? PrivacyLevel.PUBLIC,
    });
    return this.postsRepository.save(post);
  }

  async findById(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    return post;
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    const post = await this.postsRepository.findOne({ where: { id } });
    if (!post) throw new NotFoundException('Bài viết không tồn tại');
    if (post.userId !== userId)
      throw new ForbiddenException('Không có quyền xóa bài viết này');
    await this.postsRepository.remove(post);
    return { message: 'Đã xóa bài viết thành công' };
  }

  async findByUserId(userId: string, includePrivate: boolean): Promise<Post[]> {
    const qb = this.postsRepository
      .createQueryBuilder('post')
      .where('post.user_id = :userId', { userId })
      .orderBy('post.created_at', 'DESC')
      .take(50);

    if (!includePrivate) {
      qb.andWhere('post.privacy_status = :pub', { pub: PrivacyLevel.PUBLIC });
    }

    return qb.getMany();
  }
}
