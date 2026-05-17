import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /api/users/:username
   * Public — used to look up any user's profile page
   */
  @Public()
  @Get(':username')
  findByUsername(@Param('username') username: string) {
    return this.userService.findByUsername(username);
  }

  /**
   * GET /api/users/resumes
   * Protected — returns all resumes belonging to the logged-in user
   */
  @Get('resumes')
  getMyResumes(@CurrentUser() user: AuthenticatedUser) {
    return this.userService.findResumesByUserId(user.id);
  }
}
